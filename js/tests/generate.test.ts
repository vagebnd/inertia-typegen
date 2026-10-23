import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import type { OpenAPI3 } from 'openapi-typescript'

import { generate, type GenerateOptions, writeOutput } from '../src/generate.ts'

const fixture = JSON.parse(await readFile(new URL('./fixtures/document.json', import.meta.url), 'utf-8')) as OpenAPI3

const document = () => structuredClone(fixture)

const options = (overrides: Partial<GenerateOptions> = {}): GenerateOptions => ({
  document: 'app',
  fileName: 'inertia.d.ts',
  format: false,
  routes: {},
  ...overrides,
})

describe('types', () => {
  it('renders pages, requests, shared data and schemas', async () => {
    const { types } = await generate(document(), options())

    assert.equal(types.pages, 3)
    assert.equal(types.requests, 1)
    assert.match(types.content, /export namespace Inertia \{/)
    assert.match(types.content, /export type Dashboard = Inertia\.Shared\.App & \{/)
    assert.match(types.content, /export namespace Shared \{\nexport type App = \{/)
    assert.match(types.content, /export namespace Schemas \{/)
    assert.match(types.content, /export type Post = \{/)
  })

  it('keeps a request property with a default optional', async () => {
    const { types } = await generate(document(), options())

    assert.match(types.content, /published\?: boolean/)
    assert.match(types.content, /title: string/)
  })

  it('renders an empty page as an empty object', async () => {
    const { types } = await generate(document(), options())

    assert.match(types.content, /export type Login = Inertia\.Shared\.App & \{\}/)
  })

  it('imports the configured component types', async () => {
    const { types } = await generate(
      document(),
      options({ typeImports: { TableResource: { type: 'TableResource', from: '@/components/table' } } }),
    )

    assert.match(types.content, /import type \{ TableResource \} from '@\/components\/table'/)
    assert.match(types.content, /posts: TableResource/)
    assert.doesNotMatch(types.content, /export type TableResource/)
  })

  it('uses the configured namespace', async () => {
    const { types } = await generate(document(), options({ namespace: 'App' }))

    assert.match(types.content, /export namespace App \{/)
    assert.match(types.content, /App\.Shared\.App &/)
  })

  it('leaves out operations of other documents', async () => {
    const { types } = await generate(document(), options({ document: 'admin' }))

    assert.equal(types.pages, 0)
    assert.equal(types.requests, 0)
  })

  it('passes the output through a custom formatter', async () => {
    const { types } = await generate(
      document(),
      options({ format: (code, fileName) => `// ${fileName}\n${code}` }),
    )

    assert.ok(types.content.startsWith('// inertia.d.ts\n'))
  })
})

describe('routes', () => {
  it('writes one module for each route-name prefix and copies the runtime', async () => {
    const { routes } = await generate(document(), options())

    assert.ok(routes)
    assert.equal(routes.count, 6)
    assert.deepEqual([...routes.files.keys()].sort(), ['_runtime.ts', 'app/index.ts', 'app/posts/index.ts', 'index.ts'])
    assert.equal(
      routes.files.get('_runtime.ts'),
      await readFile(new URL('../runtime/route.ts', import.meta.url), 'utf-8'),
    )
  })

  it('imports the runtime with a path relative to each module', async () => {
    const { routes } = await generate(document(), options())

    assert.match(routes!.files.get('index.ts')!, /from '\.\/_runtime'/)
    assert.match(routes!.files.get('app/index.ts')!, /from '\.\.\/_runtime'/)
    assert.match(routes!.files.get('app/posts/index.ts')!, /from '\.\.\/\.\.\/_runtime'/)
  })

  it('imports a configured runtime and does not copy one', async () => {
    const { routes } = await generate(document(), options({ routes: { runtime: '@/lib/route' } }))

    assert.equal(routes!.files.has('_runtime.ts'), false)
    assert.match(routes!.files.get('app/posts/index.ts')!, /from '@\/lib\/route'/)
  })

  it('renders route keys, optional parameters, reserved words and sources', async () => {
    const { routes } = await generate(document(), options())
    const posts = routes!.files.get('app/posts/index.ts')!
    const app = routes!.files.get('app/index.ts')!

    assert.ok(
      posts.includes(
        "export const show = /* @__PURE__ */ route<'get', RouteArg<'slug'> | { post: RouteArg<'slug'> } | [post: RouteArg<'slug'>]>('get', '/posts/{post}', ['post:slug'])",
      ),
    )
    assert.match(posts, /export const deleteMethod = /)
    assert.match(posts, /export default \{ store, show, deleteMethod \}/)
    assert.match(app, /\['query\?'\]\)/)
    assert.match(app, /\| void>/)
    assert.match(app, / \* @see \\App\\Http\\Controllers\\DashboardController::index\n \* @see app\/Http\/Controllers\/DashboardController\.php:12\n/)
  })

  it('renders no routes when routes are off', async () => {
    const { routes } = await generate(document(), options({ routes: false }))

    assert.equal(routes, null)
  })
})

describe('plugins', () => {
  it('transforms the document before the render', async () => {
    const { types, routes } = await generate(
      document(),
      options({
        plugins: [
          {
            name: 'drop-search',
            transformDocument(source) {
              delete source.paths!['/search/{query}']
            },
          },
        ],
      }),
    )

    assert.equal(routes!.count, 5)
    assert.equal(types.pages, 3)
  })

  it('filters routes and renames exports', async () => {
    const { routes } = await generate(
      document(),
      options({
        plugins: [
          { name: 'no-login', filterRoute: (route) => route.name !== 'login' },
          { name: 'rename', routeExportName: (route, name) => (route.name === 'app.posts.delete' ? 'destroy' : name) },
        ],
      }),
    )

    assert.equal(routes!.files.has('index.ts'), false)
    assert.match(routes!.files.get('app/posts/index.ts')!, /export default \{ store, show, destroy \}/)
  })

  it('transforms each output file', async () => {
    const seen: string[] = []
    const { types, routes } = await generate(
      document(),
      options({
        plugins: [
          {
            name: 'banner',
            transformOutput(file) {
              seen.push(`${file.kind}:${file.path}`)

              return `// generated\n${file.code}`
            },
          },
        ],
      }),
    )

    assert.ok(types.content.startsWith('// generated\n'))
    assert.ok([...routes!.files.values()].every((code) => code.startsWith('// generated\n')))
    assert.deepEqual(seen.sort(), [
      'routes:_runtime.ts',
      'routes:app/index.ts',
      'routes:app/posts/index.ts',
      'routes:index.ts',
      'types:inertia.d.ts',
    ])
  })
})

describe('writeOutput', () => {
  it('writes changed files only and removes stale route modules', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'inertia-typegen-test-'))

    try {
      const output = await generate(document(), options())
      const typesPath = join(directory, 'types', 'inertia.d.ts')
      const routesDir = join(directory, 'routes')

      await writeOutput(output, typesPath, routesDir)
      await writeFile(join(routesDir, 'stale.ts'), 'export {}')

      assert.deepEqual(await writeOutput(output, typesPath, routesDir), { typesChanged: false, routesChanged: 1 })
      assert.deepEqual((await readdir(routesDir, { recursive: true })).filter((file) => file.endsWith('.ts')).sort(), [
        '_runtime.ts',
        'app/index.ts',
        'app/posts/index.ts',
        'index.ts',
      ])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})

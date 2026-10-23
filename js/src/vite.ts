import { mkdir, readdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises'
import { get as httpGet, type IncomingMessage } from 'node:http'
import { get as httpsGet } from 'node:https'
import { basename, dirname, join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'

import openapiTS, {
  astToString,
  type OpenAPI3,
  type ReferenceObject,
  type RequestBodyObject,
  type ResponseObject,
  type SchemaObject,
} from 'openapi-typescript'
import ts from 'typescript'
import type { Logger, Plugin } from 'vite'
import { loadEnv } from 'vite'
import { format, type FormatConfig } from 'vite-plus/fmt'

type TypeImport = { type: string; from: string }

type TypeGeneratorOptions = {
  outputPath: string
  routesPath?: string
  formatOptions?: FormatConfig
  apiName?: string
  typeImports?: Record<string, TypeImport>
}

type Group = 'Pages' | 'Requests' | 'Shared' | 'Schemas'

type Entry = { group: Group; path: string; schema: SchemaObject | ReferenceObject }

const SHARED_PREFIX = 'InertiaShared'
const SCHEMA_REF_PREFIX = '#/components/schemas/'
const ENTRY_PREFIX = '__inertia_'
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const
const RESERVED_WORDS = new Set(
  'break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with yield'.split(
    ' ',
  ),
)

export function typeGenerator(options: TypeGeneratorOptions): Plugin {
  const apiName = options.apiName || 'api'
  const typesDir = dirname(options.outputPath)
  const fileName = basename(options.outputPath)

  const writeTypes = async (document: OpenAPI3, outputDir: string, routesDir: string | undefined, logger: Logger) => {
    const { content, pages, requests } = await renderInertiaTypes(
      document,
      fileName,
      apiName,
      options.typeImports ?? {},
      options.formatOptions ?? {},
    )
    const changed = await writeIfChanged(resolve(outputDir, fileName), content)

    logger.info(
      `[type-generator] Inertia: ${pages} pages, ${requests} requests (${changed ? 'updated' : 'unchanged'})`,
      { timestamp: true },
    )

    if (routesDir) {
      const { files, routes } = renderRoutes(document)
      const changedFiles = await writeRoutes(files, routesDir)

      logger.info(
        `[type-generator] Routes: ${routes} routes in ${files.size} modules (${changedFiles} files changed)`,
        { timestamp: true },
      )
    }
  }

  return {
    name: 'type-generator',
    api: {
      apiName,
      generate(document: OpenAPI3, logger: Logger, outputDir?: string) {
        return writeTypes(
          document,
          outputDir ?? typesDir,
          outputDir ? join(outputDir, 'routes') : options.routesPath,
          logger,
        )
      },
    },
    async configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd())
      const appUrl = env.VITE_APP_URL
      if (!appUrl) return

      const logger = server.config.logger
      let lastDocument: string | null = null

      const regenerate = async () => {
        const started = performance.now()

        try {
          const source = await fetchDocument(`${appUrl}/docs/${apiName}.json`)
          const changed = source !== lastDocument

          if (changed) {
            await writeTypes(JSON.parse(source) as OpenAPI3, typesDir, options.routesPath, logger)
            lastDocument = source
          }

          logger.info(
            `[type-generator] Document ${changed ? 'changed' : 'unchanged'} in ${Math.round(
              performance.now() - started,
            )} ms`,
            { timestamp: true },
          )
        } catch (error) {
          logger.error(`[type-generator] Type generation failed: ${(error as Error).message}`, { timestamp: true })
        }
      }

      let running: Promise<void> | null = null
      let queued = false

      const refresh = (): Promise<void> => {
        if (running) {
          queued = true

          return running
        }

        running = (async () => {
          do {
            queued = false
            await regenerate()
          } while (queued)
        })().finally(() => {
          running = null
        })

        return running
      }

      await refresh()

      // Re-fetch the document when PHP files change
      let debounceTimer: ReturnType<typeof setTimeout>
      server.watcher.add(resolve(process.cwd(), 'app'))
      server.watcher.on('change', (changedPath) => {
        if (!changedPath.endsWith('.php')) return

        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => void refresh(), 1000)
      })
    },
  }
}

function fetchDocument(url: string): Promise<string> {
  return new Promise((resolveDocument, reject) => {
    const onResponse = (response: IncomingMessage) => {
      if (response.statusCode !== 200) {
        response.resume()
        reject(new Error(`${url} responded with status ${response.statusCode}`))

        return
      }

      const chunks: Buffer[] = []

      response.on('data', (chunk: Buffer) => chunks.push(chunk))
      response.on('error', reject)
      response.on('end', () => resolveDocument(Buffer.concat(chunks).toString('utf-8')))
    }

    const request = url.startsWith('https:')
      ? httpsGet(url, { rejectUnauthorized: false }, onResponse)
      : httpGet(url, onResponse)

    request.on('error', reject)
  })
}

async function writeIfChanged(path: string, content: string): Promise<boolean> {
  const current = await readFile(path, 'utf-8').catch(() => null)

  if (current === content) return false

  await writeFile(path, content)

  return true
}

async function renderInertiaTypes(
  document: OpenAPI3,
  fileName: string,
  apiName: string,
  typeImports: Record<string, TypeImport>,
  formatOptions: FormatConfig,
): Promise<{ content: string; pages: number; requests: number }> {
  const schemas = document.components?.schemas ?? {}
  const entries = collectEntries(document, apiName, typeImports)
  const keys = entries.map((_, index) => `${ENTRY_PREFIX}${index}`)
  const inlined = entries.map((entry) => inlineRefs(entry.schema, schemas, typeImports, new Set()) as SchemaObject)

  // Requests render as request bodies, so openapi-typescript keeps properties with a default optional
  const nodes = await openapiTS(
    {
      openapi: document.openapi,
      info: document.info,
      paths: {},
      components: {
        schemas: {
          ...schemas,
          ...Object.fromEntries(
            entries.flatMap((entry, index) => (entry.group === 'Requests' ? [] : [[keys[index], inlined[index]]])),
          ),
        },
        requestBodies: Object.fromEntries(
          entries.flatMap((entry, index) =>
            entry.group === 'Requests'
              ? [[keys[index], { content: { 'application/json': { schema: inlined[index] } } }]]
              : [],
          ),
        ),
      },
    },
    { silent: true },
  )

  const rendered = renderComponents(nodes)
  const usedImports = new Set<string>()
  const groups: Record<Group, Map<string, string>> = {
    Pages: new Map(),
    Requests: new Map(),
    Shared: new Map(),
    Schemas: new Map(),
  }

  entries.forEach((entry, index) => {
    const type = resolveRefs(stripComments(rendered.get(keys[index]) ?? 'unknown').trim(), typeImports, usedImports)

    groups[entry.group].set(entry.path, normalizeEmptyObjects(type))
  })

  const { code, errors } = await format(fileName, buildOutput(groups, typeImports, usedImports), formatOptions)

  if (errors.length > 0) {
    throw new Error(`Formatting ${fileName} failed: ${errors.map((error) => error.message).join('; ')}`)
  }

  return {
    content: code,
    pages: groups.Pages.size,
    requests: groups.Requests.size,
  }
}

// --- Routes ---

type RouteEntry = {
  name: string
  method: string
  uri: string
  keys: Record<string, string>
  action?: string
  source?: string
}

function collectRoutes(document: OpenAPI3): RouteEntry[] {
  const routes = new Map<string, RouteEntry>()

  for (const pathItem of Object.values(document.paths ?? {})) {
    if ('$ref' in pathItem) continue

    for (const method of METHODS) {
      const operation = pathItem[method] as Record<string, unknown> | undefined
      const name = operation?.['x-route-name']
      const uri = operation?.['x-route-uri']
      if (typeof name !== 'string' || typeof uri !== 'string' || routes.has(name)) continue

      routes.set(name, {
        name,
        method,
        uri,
        keys: (operation?.['x-route-keys'] as Record<string, string> | undefined) ?? {},
        action: operation?.['x-action'] as string | undefined,
        source: operation?.['x-source'] as string | undefined,
      })
    }
  }

  return [...routes.values()]
}

function renderRoutes(document: OpenAPI3): { files: Map<string, string>; routes: number } {
  const modules = new Map<string, RouteEntry[]>()
  const routes = collectRoutes(document)

  for (const route of routes) {
    const module = route.name.split('.').slice(0, -1).join('/')
    if (!modules.has(module)) modules.set(module, [])
    modules.get(module)!.push(route)
  }

  const files = new Map<string, string>()

  for (const [module, entries] of modules) {
    const declarations = entries.map(renderRoute)
    const usesArgs = declarations.some((declaration) => declaration.includes('RouteArg'))
    const names = entries.map((entry) => routeExportName(entry.name))

    files.set(
      module ? `${module}/index.ts` : 'index.ts',
      [
        `import { route${usesArgs ? ', type RouteArg' : ''} } from '@shared/lib/route'`,
        '',
        declarations.join('\n\n'),
        '',
        `export default { ${names.join(', ')} }`,
        '',
      ].join('\n'),
    )
  }

  return { files, routes: routes.length }
}

function renderRoute(route: RouteEntry): string {
  const name = routeExportName(route.name)
  const parameters = [...route.uri.matchAll(/\{(\w+)(\?)?\}/g)].map(([, parameter, optional]) => ({
    name: parameter,
    optional: optional === '?',
    key: route.keys[parameter],
  }))
  const docblock = [
    '/**',
    ...(route.action ? [` * @see ${route.action}`] : []),
    ...(route.source ? [` * @see ${route.source}`] : []),
    ` * @route '${route.uri}'`,
    ' */',
  ].join('\n')

  if (parameters.length === 0) {
    return `${docblock}\nexport const ${name} = /* @__PURE__ */ route('${route.method}', '${route.uri}')`
  }

  const arg = (key?: string) => (key ? `RouteArg<'${key}'>` : 'RouteArg')
  const record = `{ ${parameters.map((p) => `${p.name}${p.optional ? '?' : ''}: ${arg(p.key)}`).join('; ')} }`
  const tuple = `[${parameters.map((p) => `${p.name}${p.optional ? '?' : ''}: ${arg(p.key)}`).join(', ')}]`
  const args = [
    ...(parameters.length === 1 ? [arg(parameters[0].key)] : []),
    record,
    tuple,
    ...(parameters.every((p) => p.optional) ? ['void'] : []),
  ].join(' | ')
  const specs = parameters.map((p) => `'${p.name}${p.optional ? '?' : ''}${p.key ? `:${p.key}` : ''}'`).join(', ')

  return `${docblock}\nexport const ${name} = /* @__PURE__ */ route<'${route.method}', ${args}>('${route.method}', '${route.uri}', [${specs}])`
}

function routeExportName(routeName: string): string {
  const name = toCamelCase(routeName.split('.').pop()!)

  return RESERVED_WORDS.has(name) ? `${name}Method` : name
}

async function writeRoutes(files: Map<string, string>, outputDir: string): Promise<number> {
  const existing = (await readdir(outputDir, { recursive: true }).catch(() => [] as string[])).filter((file) =>
    file.endsWith('.ts'),
  )
  let changed = 0

  for (const [file, content] of files) {
    await mkdir(dirname(join(outputDir, file)), { recursive: true })
    if (await writeIfChanged(join(outputDir, file), content)) changed++
  }

  for (const file of existing) {
    if (files.has(file)) continue

    await rm(join(outputDir, file))
    changed++
  }

  await removeEmptyDirectories(outputDir)

  return changed
}

async function removeEmptyDirectories(directory: string): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])

  for (const entry of entries) {
    if (entry.isDirectory()) await removeEmptyDirectories(join(directory, entry.name))
  }

  if ((await readdir(directory).catch(() => ['keep'])).length === 0) await rmdir(directory)
}

// --- Document ---

function collectEntries(document: OpenAPI3, apiName: string, typeImports: Record<string, TypeImport>): Entry[] {
  const prefix = apiName + '.'
  const entries: Entry[] = []

  for (const pathItem of Object.values(document.paths ?? {})) {
    if ('$ref' in pathItem) continue

    for (const method of METHODS) {
      const operation = pathItem[method]
      if (!operation || '$ref' in operation || !operation.operationId?.startsWith(prefix)) continue

      const path = toNamespacePath(operation.operationId.slice(prefix.length))
      if (!path) continue

      const response = resolveComponent<ResponseObject>(document, operation.responses?.['200'], 'responses')
      const page = objectBranch(contentSchema(response?.content, 'application/json'))
      if (page) entries.push({ group: 'Pages', path, schema: page })

      const body = resolveComponent<RequestBodyObject>(document, operation.requestBody, 'requestBodies')
      const request =
        contentSchema(body?.content, 'application/json') ?? contentSchema(body?.content, 'multipart/form-data')
      if (request) entries.push({ group: 'Requests', path, schema: objectBranch(request) ?? request })
    }
  }

  // Shared-data shapes exported by Inertia middleware as `InertiaShared{Name}`
  // component schemas land under the `Inertia.Shared.{Name}` namespace.
  for (const [name, schema] of Object.entries(document.components?.schemas ?? {})) {
    if (name.startsWith(SHARED_PREFIX) && name.length > SHARED_PREFIX.length) {
      entries.push({ group: 'Shared', path: name.slice(SHARED_PREFIX.length), schema })
    }
  }

  for (const [name, schema] of Object.entries(document.components?.schemas ?? {})) {
    if (!name.startsWith(SHARED_PREFIX) && !typeImports[name]) {
      entries.push({ group: 'Schemas', path: name, schema })
    }
  }

  return entries
}

function resolveComponent<T>(
  document: OpenAPI3,
  value: T | ReferenceObject | undefined,
  kind: 'responses' | 'requestBodies',
): T | undefined {
  if (value && typeof value === 'object' && '$ref' in value) {
    return document.components?.[kind]?.[value.$ref.split('/').pop() ?? ''] as T | undefined
  }

  return value
}

function contentSchema(
  content: ResponseObject['content'] | RequestBodyObject['content'] | undefined,
  mediaType: string,
): SchemaObject | ReferenceObject | undefined {
  const media = content?.[mediaType]

  return media && !('$ref' in media) ? media.schema : undefined
}

// A page is the object part of a response: the shared-data intersection, an object,
// or the first member of a union when that member is an object.
function objectBranch(schema: SchemaObject | ReferenceObject | undefined): SchemaObject | null {
  if (!schema || '$ref' in schema) return null
  if ('allOf' in schema && schema.allOf) return schema

  const type = 'type' in schema ? schema.type : undefined
  if (type === 'object') return schema
  if (Array.isArray(type) && type.includes('object')) return { ...schema, type: 'object' } as SchemaObject

  const first =
    ('anyOf' in schema ? schema.anyOf : undefined)?.[0] ?? ('oneOf' in schema ? schema.oneOf : undefined)?.[0]

  return first && !('$ref' in first) && 'type' in first && first.type === 'object' ? first : null
}

// Inline component references so each type stands on its own. Shared data and
// imported component types stay references, and so does a reference back into
// a schema that is being inlined.
function inlineRefs(
  node: unknown,
  schemas: Record<string, SchemaObject | ReferenceObject>,
  typeImports: Record<string, TypeImport>,
  ancestors: Set<string>,
): unknown {
  if (Array.isArray(node)) return node.map((item) => inlineRefs(item, schemas, typeImports, ancestors))
  if (!node || typeof node !== 'object') return node

  const ref = (node as { $ref?: unknown }).$ref
  if (typeof ref === 'string' && ref.startsWith(SCHEMA_REF_PREFIX)) {
    const name = ref.slice(SCHEMA_REF_PREFIX.length)

    if (typeImports[name] || name.startsWith(SHARED_PREFIX) || ancestors.has(name) || !schemas[name]) return node

    return inlineRefs(schemas[name], schemas, typeImports, new Set([...ancestors, name]))
  }

  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [key, inlineRefs(value, schemas, typeImports, ancestors)]),
  )
}

function renderComponents(nodes: ts.Node[]): Map<string, string> {
  const rendered = new Map<string, string>()
  const components = nodes.find(
    (node): node is ts.InterfaceDeclaration => ts.isInterfaceDeclaration(node) && node.name.text === 'components',
  )
  if (!components) return rendered

  for (const member of typeLiteralMembers(memberType(components.members, 'schemas'))) {
    const name = propertyName(member)
    if (name?.startsWith(ENTRY_PREFIX) && member.type) rendered.set(name, astToString(member.type))
  }

  for (const member of typeLiteralMembers(memberType(components.members, 'requestBodies'))) {
    const name = propertyName(member)
    const content = memberType(typeLiteralMembers(member.type), 'content')
    const type = memberType(typeLiteralMembers(content), 'application/json')
    if (name && type) rendered.set(name, astToString(type))
  }

  return rendered
}

function typeLiteralMembers(node: ts.Node | undefined): ts.PropertySignature[] {
  return node && ts.isTypeLiteralNode(node) ? node.members.filter(ts.isPropertySignature) : []
}

function memberType(members: readonly ts.TypeElement[], name: string): ts.TypeNode | undefined {
  return members.find((member): member is ts.PropertySignature => {
    return ts.isPropertySignature(member) && propertyName(member) === name
  })?.type
}

function propertyName(member: ts.PropertySignature): string | undefined {
  return ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) ? member.name.text : undefined
}

function resolveRefs(type: string, typeImports: Record<string, TypeImport>, usedImports: Set<string>): string {
  return type.replace(/components\["schemas"\]\["(\w+)"\]/g, (_, name: string) => {
    if (name.startsWith(SHARED_PREFIX) && name.length > SHARED_PREFIX.length) {
      return `Inertia.Shared.${name.slice(SHARED_PREFIX.length)}`
    }

    if (typeImports[name]) {
      usedImports.add(name)

      return typeImports[name].type
    }

    return 'Record<string, unknown>'
  })
}

// --- Helpers ---

function stripComments(type: string): string {
  return type.replace(/\/\*\*[^]*?\*\/\s*/g, '')
}

// openapi-typescript renders an empty object schema as `Record<string, never>`.
// Vue's `defineProps<T>()` macro can't resolve the `Record` utility type, so a
// closure-opaque page (e.g. Fortify's login view) would break the SFC compiler.
// `{}` is the equivalent empty shape the macro can resolve.
function normalizeEmptyObjects(type: string): string {
  return type.replace(/Record<string, never>/g, '{}')
}

function toNamespacePath(path: string): string | null {
  const cleaned = path.replace(/_\d+$/, '')
  const segments = cleaned.split('.')
  if (segments.some((s) => !s)) return null
  return segments.map((s) => toPascalCase(s)).join('.')
}

function toCamelCase(str: string): string {
  return str.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase())
}

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

// --- Output ---

type NamespaceNode = {
  types: Map<string, string>
  children: Map<string, NamespaceNode>
}

function buildTree(entries: Map<string, string>): NamespaceNode {
  const root: NamespaceNode = { types: new Map(), children: new Map() }

  for (const [path, typeBody] of entries) {
    const segments = path.split('.')
    const typeName = segments.pop()!
    let current = root
    for (const seg of segments) {
      if (!current.children.has(seg)) {
        current.children.set(seg, { types: new Map(), children: new Map() })
      }
      current = current.children.get(seg)!
    }
    current.types.set(typeName, typeBody)
  }

  return root
}

function renderTree(node: NamespaceNode, indent: string): string {
  let out = ''

  for (const [name, body] of node.types) {
    out += `${indent}export type ${name} = ${body}\n`
  }

  for (const [name, child] of node.children) {
    out += `${indent}export namespace ${name} {\n`
    out += renderTree(child, indent + '  ')
    out += `${indent}}\n`
  }

  return out
}

function buildOutput(
  groups: Record<Group, Map<string, string>>,
  typeImports: Record<string, TypeImport>,
  usedImports: Set<string>,
): string {
  let out = `/**
 * Inertia page and request types.
 * Auto-generated by type-generator plugin from Scramble's OpenAPI schema.
 */\n`

  const grouped = new Map<string, string[]>()
  for (const name of usedImports) {
    const imp = typeImports[name]
    if (!grouped.has(imp.from)) grouped.set(imp.from, [])
    grouped.get(imp.from)!.push(imp.type)
  }
  for (const [from, types] of grouped) {
    out += `import type { ${types.join(', ')} } from '${from}'\n`
  }

  out += `
export namespace Inertia {
export namespace Pages {
${renderTree(buildTree(groups.Pages), '')}
}
`

  for (const group of ['Requests', 'Shared', 'Schemas'] as const) {
    if (groups[group].size > 0) {
      out += `export namespace ${group} {
${renderTree(buildTree(groups[group]), '')}
}
`
    }
  }

  out += `}\n`

  return out
}

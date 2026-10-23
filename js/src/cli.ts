#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import type { OpenAPI3 } from 'openapi-typescript'
import { createLogger, loadConfigFromFile, type Plugin } from 'vite'

import type { TypegenApi } from './vite.ts'

const root = process.cwd()

const { values } = parseArgs({
  options: {
    config: { type: 'string', multiple: true },
    'out-dir': { type: 'string' },
    check: { type: 'boolean', default: false },
    php: { type: 'string' },
  },
})

const apis: TypegenApi[] = []

for (const configFile of values.config ?? [undefined]) {
  const loaded = await loadConfigFromFile(
    { command: 'serve', mode: 'development' },
    configFile ? resolve(root, configFile) : undefined,
    root,
    'silent',
  )
  const plugins = ((loaded?.config.plugins ?? []) as unknown[]).flat(Infinity) as (Plugin | null | false | undefined)[]

  for (const plugin of plugins) {
    if (plugin && plugin.name === 'inertia-typegen' && plugin.api) apis.push(plugin.api as TypegenApi)
  }
}

if (apis.length === 0) {
  throw new Error('No Vite config has the inertia-typegen plugin. Pass the config file with --config.')
}

const php = values.php?.split(/\s+/) ?? (/\/herd\//i.test(process.env.PATH ?? '') ? ['herd', 'php'] : ['php'])
const documents = new Map<string, OpenAPI3>()

function exportDocument(name: string): OpenAPI3 {
  const cached = documents.get(name)
  if (cached) return cached

  const directory = mkdtempSync(join(tmpdir(), 'inertia-typegen-'))
  const path = join(directory, `${name}.json`)

  try {
    execFileSync(php[0], [...php.slice(1), 'artisan', 'scramble:export', `--api=${name}`, `--path=${path}`], {
      cwd: root,
      stdio: ['ignore', 'ignore', 'inherit'],
    })

    const document = JSON.parse(readFileSync(path, 'utf-8')) as OpenAPI3
    documents.set(name, document)

    return document
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

function files(directory: string | undefined): Map<string, string> {
  if (!directory || !existsSync(directory)) return new Map()

  return new Map(
    readdirSync(directory, { recursive: true, encoding: 'utf-8' })
      .filter((file) => file.endsWith('.ts'))
      .map((file) => [file, readFileSync(join(directory, file), 'utf-8')]),
  )
}

function compare(api: TypegenApi, outputDir: string): string[] {
  const problems: string[] = []
  const fresh = readFileSync(join(outputDir, basename(api.typesPath)), 'utf-8')

  if (!existsSync(api.typesPath) || readFileSync(api.typesPath, 'utf-8') !== fresh) {
    problems.push(`changed: ${relative(root, api.typesPath)}`)
  }

  if (api.routesPath) {
    const current = files(api.routesPath)
    const expected = files(join(outputDir, 'routes'))

    for (const [file, content] of expected) {
      if (!current.has(file)) problems.push(`missing: ${relative(root, join(api.routesPath, file))}`)
      else if (current.get(file) !== content) problems.push(`changed: ${relative(root, join(api.routesPath, file))}`)
    }

    for (const file of current.keys()) {
      if (!expected.has(file)) problems.push(`extra: ${relative(root, join(api.routesPath, file))}`)
    }
  }

  return problems
}

if (values.check) {
  const problems: string[] = []

  for (const api of apis) {
    const outputDir = mkdtempSync(join(tmpdir(), 'inertia-typegen-'))

    try {
      await api.generate(exportDocument(api.document), createLogger('silent'), outputDir)
      problems.push(...compare(api, outputDir))
    } finally {
      rmSync(outputDir, { recursive: true, force: true })
    }
  }

  if (problems.length > 0) {
    process.stderr.write(
      `The generated types or route helpers are stale. Run inertia-typegen to update them.\n${problems.map((problem) => `  ${problem}`).join('\n')}\n`,
    )
    process.exit(1)
  }
} else {
  const outDir = values['out-dir'] ? resolve(root, values['out-dir']) : undefined

  for (const api of apis) {
    await api.generate(
      exportDocument(api.document),
      createLogger('info', { prefix: '' }),
      outDir && apis.length > 1 ? join(outDir, api.document) : outDir,
    )
  }
}

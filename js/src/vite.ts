import { get as httpGet, type IncomingMessage } from 'node:http'
import { get as httpsGet } from 'node:https'
import { basename, join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'

import type { OpenAPI3 } from 'openapi-typescript'
import type { Logger, Plugin } from 'vite'

import { exportDocument, resolvePhpCommand } from './export.ts'
import type { Formatter } from './format.ts'
import { generate, type TypegenPlugin, type TypeImport, writeOutput } from './generate.ts'

export type { Formatter } from './format.ts'
export type { OutputFile, RouteEntry, TypegenPlugin, TypeImport } from './generate.ts'

export type TypegenOptions = {
  document?: string
  types: string
  routes?: string | { path: string; runtime?: string }
  typeImports?: Record<string, TypeImport>
  namespace?: string
  format?: Formatter
  formatOptions?: Record<string, unknown>
  documentUrl?: string
  php?: string | string[]
  watch?: string[]
  debounce?: number
  plugins?: TypegenPlugin[]
}

export type TypegenApi = {
  document: string
  typesPath: string
  routesPath: string | undefined
  php: string | string[] | undefined
  generate(document: OpenAPI3, logger: Logger, outputDir?: string): Promise<void>
}

export function typegen(options: TypegenOptions): Plugin<TypegenApi> {
  const root = process.cwd()
  const document = options.document ?? 'app'
  const typesPath = resolve(root, options.types)
  const routes = typeof options.routes === 'string' ? { path: options.routes } : options.routes
  const routesPath = routes ? resolve(root, routes.path) : undefined
  const fileName = basename(typesPath)

  const writeTypes = async (source: OpenAPI3, outputPath: string, routesDir: string | undefined, logger: Logger) => {
    const output = await generate(source, {
      document,
      fileName,
      namespace: options.namespace,
      typeImports: options.typeImports,
      routes: routesDir ? { runtime: routes?.runtime } : false,
      format: options.format,
      formatOptions: options.formatOptions,
      plugins: options.plugins,
    })
    const { typesChanged, routesChanged } = await writeOutput(output, outputPath, routesDir)

    logger.info(
      `[inertia-typegen] Inertia: ${output.types.pages} pages, ${output.types.requests} requests (${typesChanged ? 'updated' : 'unchanged'})`,
      { timestamp: true },
    )

    if (output.routes) {
      logger.info(
        `[inertia-typegen] Routes: ${output.routes.count} routes in ${output.routes.files.size} files (${routesChanged} files changed)`,
        { timestamp: true },
      )
    }
  }

  return {
    name: 'inertia-typegen',
    api: {
      document,
      typesPath,
      routesPath,
      php: options.php,
      generate(source, logger, outputDir) {
        return writeTypes(
          source,
          outputDir ? join(outputDir, fileName) : typesPath,
          outputDir && routesPath ? join(outputDir, 'routes') : routesPath,
          logger,
        )
      },
    },
    async configureServer(server) {
      const { documentUrl } = options
      const readDocument = async () =>
        documentUrl
          ? fetchDocument(documentUrl)
          : exportDocument(document, root, await resolvePhpCommand(options.php, root))
      const logger = server.config.logger
      let lastDocument: string | null = null

      const regenerate = async () => {
        const started = performance.now()

        try {
          const source = await readDocument()
          const changed = source !== lastDocument

          if (changed) {
            await writeTypes(JSON.parse(source) as OpenAPI3, typesPath, routesPath, logger)
            lastDocument = source
          }

          logger.info(
            `[inertia-typegen] Document ${changed ? 'changed' : 'unchanged'} in ${Math.round(
              performance.now() - started,
            )} ms`,
            { timestamp: true },
          )
        } catch (error) {
          logger.error(`[inertia-typegen] Type generation failed: ${(error as Error).message}`, { timestamp: true })
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
      for (const directory of options.watch ?? ['app']) server.watcher.add(resolve(root, directory))
      server.watcher.on('change', (changedPath) => {
        if (!changedPath.endsWith('.php')) return

        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => void refresh(), options.debounce ?? 300)
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

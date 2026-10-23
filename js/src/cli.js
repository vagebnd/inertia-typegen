import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { createLogger, loadConfigFromFile } from 'vite'

const root = resolve(import.meta.dirname, '../..')

const { values } = parseArgs({
  options: {
    'out-dir': { type: 'string' },
  },
})

const loaded = await loadConfigFromFile(
  { command: 'serve', mode: 'development' },
  resolve(root, 'resources/config/vite.config.admin.ts'),
  root,
  'silent',
)

const plugin = loaded?.config.plugins?.flat(Infinity).find((candidate) => candidate?.name === 'type-generator')

if (!plugin) {
  throw new Error('The admin Vite config has no type-generator plugin.')
}

function exportDocument(apiName) {
  const directory = mkdtempSync(join(tmpdir(), 'typegen-'))
  const path = join(directory, `${apiName}.json`)
  const php = /\/herd\//i.test(process.env.PATH ?? '') ? ['herd', 'php'] : ['php']

  try {
    execFileSync(php[0], [...php.slice(1), 'artisan', 'scramble:export', `--api=${apiName}`, `--path=${path}`], {
      cwd: root,
      stdio: ['ignore', 'ignore', 'inherit'],
    })

    return JSON.parse(readFileSync(path, 'utf-8'))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

const document = exportDocument(plugin.api.apiName)

await plugin.api.generate(
  document,
  createLogger('info', { prefix: '' }),
  values['out-dir'] ? resolve(values['out-dir']) : undefined,
)

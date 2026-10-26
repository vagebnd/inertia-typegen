import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

export function phpCommand(php?: string | string[]): string[] {
  if (Array.isArray(php)) return php
  if (php) return php.split(/\s+/)

  return /\/herd\//i.test(process.env.PATH ?? '') ? ['herd', 'php'] : ['php']
}

export async function exportDocument(name: string, cwd: string, php: string[]): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'inertia-typegen-'))
  const path = join(directory, `${name}.json`)

  try {
    await run(php[0], [...php.slice(1), 'artisan', 'scramble:export', `--api=${name}`, `--path=${path}`], { cwd })

    return await readFile(path, 'utf-8')
  } catch (error) {
    const { stderr, stdout, message } = error as { stderr?: string; stdout?: string; message: string }
    const clean = (text?: string) => text?.replace(/\x1b\[[0-9;]*m/g, '').trim()
    const output = clean(stderr) || clean(stdout) || message

    throw new Error(`php artisan scramble:export --api=${name} failed: ${output}`)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

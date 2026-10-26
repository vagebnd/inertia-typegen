import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { exportDocument, resolvePhpCommand } from '../src/export.ts'

const fakePhp = ['node', fileURLToPath(new URL('./fixtures/fake-php.mjs', import.meta.url))]

describe('resolvePhpCommand', () => {
  const withFakeHerd = async (script: string, test: (cwd: string) => Promise<void>) => {
    const root = await mkdtemp(join(tmpdir(), 'inertia-typegen-herd-'))
    const bin = join(root, 'herd', 'bin')
    const path = process.env.PATH

    await mkdir(bin, { recursive: true })
    await writeFile(join(bin, 'herd'), `#!/bin/sh\n${script}\n`, { mode: 0o755 })

    try {
      process.env.PATH = `${bin}:${path}`
      await test(root)
    } finally {
      process.env.PATH = path
      await rm(root, { recursive: true, force: true })
    }
  }

  it('uses the given command', async () => {
    assert.deepEqual(await resolvePhpCommand('herd php', process.cwd()), ['herd', 'php'])
    assert.deepEqual(await resolvePhpCommand(['/usr/bin/php8.4'], process.cwd()), ['/usr/bin/php8.4'])
  })

  it('uses php when Herd is not in PATH', async () => {
    const path = process.env.PATH

    try {
      process.env.PATH = '/usr/local/bin:/usr/bin'
      assert.deepEqual(await resolvePhpCommand(undefined, process.cwd()), ['php'])
    } finally {
      process.env.PATH = path
    }
  })

  it('calls the binary that herd which-php returns', async () => {
    await withFakeHerd('echo /bin/sh', async (cwd) => {
      assert.deepEqual(await resolvePhpCommand(undefined, cwd), ['/bin/sh'])
    })
  })

  it('falls back to herd php when herd which-php fails', async () => {
    await withFakeHerd('exit 1', async (cwd) => {
      assert.deepEqual(await resolvePhpCommand(undefined, cwd), ['herd', 'php'])
    })
  })
})

describe('exportDocument', () => {
  it('returns the document that scramble:export writes', async () => {
    const source = await exportDocument('admin', process.cwd(), fakePhp)

    assert.deepEqual(JSON.parse(source), { openapi: '3.1.0', info: { title: 'admin' } })
  })

  it('reports the error output of a failed export', async () => {
    await assert.rejects(
      exportDocument('broken', process.cwd(), fakePhp),
      /scramble:export --api=broken failed: API \[broken\] is not registered\./,
    )
  })

  it('reports the standard output when the error output is empty', async () => {
    await assert.rejects(exportDocument('crashing', process.cwd(), fakePhp), /failed: ItemNotFoundException$/)
  })
})

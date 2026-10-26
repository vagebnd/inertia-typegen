import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { exportDocument, phpCommand } from '../src/export.ts'

const fakePhp = ['node', fileURLToPath(new URL('./fixtures/fake-php.mjs', import.meta.url))]

describe('phpCommand', () => {
  it('uses the given command', () => {
    assert.deepEqual(phpCommand('herd php'), ['herd', 'php'])
    assert.deepEqual(phpCommand(['/usr/bin/php8.4']), ['/usr/bin/php8.4'])
  })

  it('uses herd php when Herd is in PATH', () => {
    const path = process.env.PATH

    try {
      process.env.PATH = '/Users/me/Library/Application Support/Herd/bin:/usr/bin'
      assert.deepEqual(phpCommand(), ['herd', 'php'])
      process.env.PATH = '/usr/local/bin:/usr/bin'
      assert.deepEqual(phpCommand(), ['php'])
    } finally {
      process.env.PATH = path
    }
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

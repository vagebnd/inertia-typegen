import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { formatCode } from '../src/format.ts'

const code = 'export type A = {a:string}\n'

describe('formatCode', () => {
  it('returns the code unchanged when formatting is off', async () => {
    assert.equal(await formatCode(code, 'a.d.ts', false, {}), code)
  })

  it('calls a custom formatter with the code and the file name', async () => {
    assert.equal(await formatCode(code, 'a.d.ts', (source, fileName) => `${fileName}:${source}`, {}), `a.d.ts:${code}`)
  })

  it('formats with vite-plus', async () => {
    assert.equal(await formatCode(code, 'a.d.ts', 'vite-plus', { semi: false }), 'export type A = { a: string }\n')
  })

  it('formats with prettier', async () => {
    assert.equal(await formatCode(code, 'a.d.ts', 'prettier', { semi: false }), 'export type A = { a: string }\n')
  })
})

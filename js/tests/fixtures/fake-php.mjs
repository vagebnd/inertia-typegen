import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const api = args.find((arg) => arg.startsWith('--api='))?.slice(6)
const path = args.find((arg) => arg.startsWith('--path='))?.slice(7)

if (args[0] !== 'artisan' || args[1] !== 'scramble:export' || api === 'broken') {
  process.stderr.write(`API [${api}] is not registered.\n`)
  process.exit(1)
}

writeFileSync(path, JSON.stringify({ openapi: '3.1.0', info: { title: api } }))

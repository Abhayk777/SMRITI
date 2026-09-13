#!/usr/bin/env node

import { createReadStream, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { gzipSync } from 'node:zlib'
import { basename, join, resolve } from 'node:path'

const [sourceArg, outputArg] = process.argv.slice(2)
if (!sourceArg || !outputArg) {
  console.error('usage: node scripts/build-medicine-index.mjs <dataset.csv> <output-directory>')
  process.exit(2)
}

const source = resolve(sourceArg)
const output = resolve(outputArg)
const EXPECTED_HEADER = [
  'id',
  'name',
  'price(₹)',
  'Is_discontinued',
  'manufacturer_name',
  'type',
  'pack_size_label',
  'short_composition1',
  'short_composition2',
]
const SOURCE_COMMIT = '7c06a889dc949d3b6a9be28c448f4aa1e7a2848f'

function parseCsvLine(line) {
  const values = []
  let value = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"'
        i += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      values.push(value)
      value = ''
    } else {
      value += char
    }
  }
  values.push(value)
  return values
}

export function normalizeMedicineName(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\btab\.?\b/g, 'tablet')
    .replace(/\bcap\.?\b/g, 'capsule')
    .replace(/\bsyp\.?\b/g, 'syrup')
    .replace(/\binj\.?\b/g, 'injection')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function shardFor(normalized) {
  const letters = normalized.replace(/[^a-z0-9]/g, '').slice(0, 2)
  return letters.padEnd(2, '_') || '__'
}

const input = createInterface({ input: createReadStream(source), crlfDelay: Infinity })
const shards = new Map()
const seen = new Set()
let header
let rows = 0

for await (const line of input) {
  if (!header) {
    header = parseCsvLine(line)
    if (header.join('\u0000') !== EXPECTED_HEADER.join('\u0000')) {
      throw new Error(`unexpected dataset header in ${basename(source)}`)
    }
    continue
  }

  if (!line.trim()) continue
  const fields = parseCsvLine(line)
  if (fields.length !== header.length) throw new Error(`malformed CSV row ${rows + 2}`)

  const name = fields[1].trim()
  const normalized = normalizeMedicineName(name)
  const discontinued = fields[3].trim().toUpperCase() === 'TRUE'
  if (!normalized || discontinued) continue

  const dedupeKey = normalized
  if (seen.has(dedupeKey)) continue
  seen.add(dedupeKey)

  const shard = shardFor(normalized)
  const entries = shards.get(shard) ?? []
  entries.push(name)
  shards.set(shard, entries)
  rows += 1
}

rmSync(output, { recursive: true, force: true })
mkdirSync(output, { recursive: true })

for (const [shard, entries] of shards) {
  entries.sort((a, b) => a.localeCompare(b))
  writeFileSync(join(output, `${shard}.json.gz`), gzipSync(JSON.stringify(entries), { level: 9 }))
}

writeFileSync(
  join(output, 'manifest.json'),
  `${JSON.stringify({ source_commit: SOURCE_COMMIT, entries: rows, shards: shards.size }, null, 2)}\n`,
)
writeFileSync(
  join(output, 'LICENSE'),
  `MIT License\n\nCopyright (c) 2024 JuniorAlive\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\n` +
    `of this software and associated documentation files (the "Software"), to deal\n` +
    `in the Software without restriction, including without limitation the rights\n` +
    `to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n` +
    `copies of the Software, and to permit persons to whom the Software is\n` +
    `furnished to do so, subject to the following conditions:\n\n` +
    `The above copyright notice and this permission notice shall be included in all\n` +
    `copies or substantial portions of the Software.\n\n` +
    `THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n` +
    `IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n` +
    `FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n` +
    `AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n` +
    `LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n` +
    `OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\n` +
    `SOFTWARE.\n`,
)

console.log(`wrote ${rows} medicine entries across ${shards.size} shards to ${output}`)

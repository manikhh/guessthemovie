/**
 * Checks every youtubeId in src/data/clips.json for existence + embeddability.
 * Usage: node scripts/validate-clips.mjs
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const clips = JSON.parse(
  readFileSync(resolve(__dirname, '../src/data/clips.json'), 'utf8'),
)

async function check(id) {
  const oembed = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
  try {
    const res = await fetch(oembed)
    if (!res.ok) return { ok: false, reason: `oembed ${res.status}` }
    const data = await res.json()
    return { ok: true, title: data.title }
  } catch (err) {
    return { ok: false, reason: err.message }
  }
}

const results = []
for (const clip of clips) {
  const r = await check(clip.youtubeId)
  results.push({ clip, r })
  console.log(
    `${r.ok ? 'OK  ' : 'DEAD'} ${clip.youtubeId}  ${clip.title}  ${r.ok ? `→ ${r.title}` : `(${r.reason})`}`,
  )
}

const dead = results.filter((x) => !x.r.ok)
console.log(`\n${dead.length}/${clips.length} dead`)

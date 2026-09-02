/**
 * Verifies every clip in src/data/clips.json is still playable AND embeddable,
 * and that its clip window fits inside the trailer.
 *
 * Usage: npm run validate-clips
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLIPS_PATH = resolve(__dirname, '../src/data/clips.json')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const CONCURRENCY = 4
const LONGEST_CLIP = 5

interface Clip {
  id: string
  title: string
  difficulty: string
  youtubeId: string
  startSec: number
  durationSec: number
}

const clips: Clip[] = JSON.parse(readFileSync(CLIPS_PATH, 'utf8'))

async function check(clip: Clip): Promise<string | null> {
  let html: string
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${clip.youtubeId}`, {
      headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
    })
    if (!res.ok) return `HTTP ${res.status}`
    html = await res.text()
  } catch (err) {
    return String(err)
  }

  const status = html.match(/"playabilityStatus":\{"status":"(\w+)"/)?.[1]
  if (status !== 'OK') return `unplayable (${status ?? 'unknown'})`
  if (!/"playableInEmbed":true/.test(html)) return 'embedding blocked'

  const seconds = Number(html.match(/"lengthSeconds":"(\d+)"/)?.[1] ?? 0)
  if (seconds && clip.startSec + LONGEST_CLIP > seconds) {
    return `clip window past end (start ${clip.startSec}s of ${seconds}s)`
  }

  return null
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const out = new Array<R>(items.length)
  let cursor = 0
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (cursor < items.length) {
        const i = cursor++
        out[i] = await fn(items[i]!)
      }
    }),
  )
  return out
}

console.log(`Checking ${clips.length} clips...\n`)

let done = 0
const problems = await mapLimit(clips, CONCURRENCY, async (clip) => {
  const problem = await check(clip)
  done++
  if (problem) console.log(`[${done}/${clips.length}] BAD  ${clip.title} — ${problem}`)
  return problem ? { clip, problem } : null
})

const bad = problems.filter((p): p is { clip: Clip; problem: string } => p !== null)

console.log(`\n${clips.length - bad.length}/${clips.length} clips OK`)

if (bad.length > 0) {
  console.log(`\n${bad.length} need replacing:`)
  for (const { clip, problem } of bad) {
    console.log(`  ${clip.title} (${clip.youtubeId}) — ${problem}`)
  }
  console.log('\nDelete these entries from clips.json and re-run: npm run fetch-clips')
  process.exit(1)
}

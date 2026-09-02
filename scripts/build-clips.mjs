/**
 * Builds src/data/clips.json from a curated movie list.
 *
 * For each movie it searches YouTube for an official trailer, picks the best
 * match, verifies the video is embeddable, and derives a spoiler-safe start
 * offset from the trailer duration. No API key required.
 *
 * Usage: node scripts/build-clips.mjs
 */

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MOVIES } from './movies.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = resolve(__dirname, '../src/data/clips.json')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const SLEEP_MS = 350
const CONCURRENCY = 4

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function slugify(title, year) {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${base}-${year}`
}

function normalize(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseDuration(text) {
  if (!text) return null
  const parts = text.split(':').map(Number)
  if (parts.some(Number.isNaN)) return null
  return parts.reduce((acc, p) => acc * 60 + p, 0)
}

/** Pull { videoId, title, lengthSec } entries out of a YouTube results page. */
function parseSearchResults(html) {
  const out = []
  const re =
    /"videoRenderer":\{"videoId":"([\w-]{11})".*?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"\}\].*?(?:"lengthText":\{"accessibility".*?"simpleText":"([\d:]+)"\})?/g

  let m
  while ((m = re.exec(html)) !== null) {
    let title
    try {
      title = JSON.parse(`"${m[2]}"`)
    } catch {
      title = m[2]
    }
    out.push({ videoId: m[1], title, lengthSec: parseDuration(m[3]) })
  }
  return out
}

async function searchYouTube(query) {
  const res = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' } },
  )
  if (!res.ok) throw new Error(`search ${res.status}`)
  return parseSearchResults(await res.text())
}

const BAD_WORDS = [
  'reaction',
  'review',
  'explained',
  'breakdown',
  'ranking',
  'fan made',
  'fanmade',
  'concept',
  'parody',
  'recut',
  'honest trailer',
  'everything wrong',
  'behind the scenes',
  'making of',
  'interview',
  'scene',
  'clip',
  'ending',
  'edit',
]

function scoreCandidate(cand, movie) {
  const t = normalize(cand.title)
  const wanted = normalize(movie.title)

  if (BAD_WORDS.some((w) => t.includes(w))) return -1
  if (!t.includes('trailer')) return -1
  // Require the movie title to appear (allows extra words around it).
  if (!t.includes(wanted)) return -1
  // Trailers are typically 1–4 minutes.
  if (cand.lengthSec !== null && (cand.lengthSec < 45 || cand.lengthSec > 300)) return -1

  let score = 0
  if (t.includes('official')) score += 3
  if (t.includes(String(movie.year))) score += 2
  if (t.includes('hd') || t.includes('4k')) score += 1
  if (t.includes('teaser')) score -= 1
  if (cand.lengthSec !== null && cand.lengthSec >= 90 && cand.lengthSec <= 180) score += 2
  return score
}

/** Confirms the video exists and is allowed to play in an embed. */
async function verifyEmbeddable(videoId) {
  const oembed = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
  )
  if (!oembed.ok) return { ok: false, reason: `oembed ${oembed.status}` }

  const page = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
  })
  if (!page.ok) return { ok: false, reason: `watch ${page.status}` }
  const html = await page.text()

  if (/"playableInEmbed":false/.test(html)) {
    return { ok: false, reason: 'embed blocked' }
  }
  if (/"status":"(ERROR|UNPLAYABLE|LOGIN_REQUIRED)"/.test(html)) {
    return { ok: false, reason: 'unplayable' }
  }

  const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/)
  return {
    ok: true,
    lengthSec: lengthMatch ? Number(lengthMatch[1]) : null,
  }
}

function buildAliases(title) {
  const aliases = new Set()
  const lower = title.toLowerCase()

  if (lower.startsWith('the ')) aliases.add(lower.slice(4))
  if (lower.includes(':')) {
    const [main, sub] = lower.split(':').map((s) => s.trim())
    if (main) aliases.add(main)
    if (sub) aliases.add(sub)
  }

  const romanToNum = { ii: '2', iii: '3', iv: '4', v: '5' }
  for (const [roman, num] of Object.entries(romanToNum)) {
    if (new RegExp(`\\b${roman}\\b`).test(lower)) {
      aliases.add(lower.replace(new RegExp(`\\b${roman}\\b`), num))
    }
  }

  aliases.delete(lower)
  return [...aliases].filter((a) => a.length > 2)
}

/**
 * Start far enough in to skip studio logos, but not so far that we hit the
 * title card / credits block at the end of the trailer.
 */
function pickStartSec(lengthSec) {
  if (!lengthSec) return 35
  const start = Math.round(lengthSec * 0.35)
  return Math.max(15, Math.min(start, lengthSec - 25))
}

async function processMovie(movie) {
  const query = `${movie.title} ${movie.year} official trailer`
  try {
    const candidates = await searchYouTube(query)
    const ranked = candidates
      .map((c) => ({ ...c, score: scoreCandidate(c, movie) }))
      .filter((c) => c.score >= 0)
      .sort((a, b) => b.score - a.score)

    for (const cand of ranked.slice(0, 4)) {
      const verdict = await verifyEmbeddable(cand.videoId)
      if (!verdict.ok) {
        await sleep(SLEEP_MS)
        continue
      }

      const lengthSec = verdict.lengthSec ?? cand.lengthSec
      return {
        id: slugify(movie.title, movie.year),
        title: movie.title,
        year: movie.year,
        difficulty: movie.difficulty,
        aliases: buildAliases(movie.title),
        youtubeId: cand.videoId,
        startSec: pickStartSec(lengthSec),
        durationSec: lengthSec ?? 0,
        sourceTitle: cand.title,
      }
    }
    return { failed: movie, reason: ranked.length ? 'none embeddable' : 'no match' }
  } catch (err) {
    return { failed: movie, reason: err.message }
  }
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length)
  let cursor = 0

  async function next() {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await worker(items[i], i)
      await sleep(SLEEP_MS)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, next))
  return results
}

console.log(`Resolving trailers for ${MOVIES.length} movies…\n`)

let done = 0
const raw = await runPool(
  MOVIES,
  async (movie) => {
    const result = await processMovie(movie)
    done++
    const label = `[${String(done).padStart(3)}/${MOVIES.length}]`
    if (result.failed) {
      console.log(`${label} MISS ${movie.title} (${result.reason})`)
    } else {
      console.log(`${label} ok   ${movie.title} → ${result.youtubeId} @${result.startSec}s`)
    }
    return result
  },
  CONCURRENCY,
)

const clips = raw.filter((r) => r && !r.failed)
const failures = raw.filter((r) => r && r.failed)

// Keep tiers ordered and stable so the daily hash spreads across the pool.
const order = { easy: 0, medium: 1, hard: 2 }
clips.sort((a, b) => order[a.difficulty] - order[b.difficulty] || a.title.localeCompare(b.title))

const clean = clips.map(({ sourceTitle, ...rest }) => rest)
writeFileSync(OUT_PATH, JSON.stringify(clean, null, 2) + '\n')

const byTier = clean.reduce((acc, c) => {
  acc[c.difficulty] = (acc[c.difficulty] ?? 0) + 1
  return acc
}, {})

console.log(`\nWrote ${clean.length} clips to src/data/clips.json`)
console.log(`  easy: ${byTier.easy ?? 0}  medium: ${byTier.medium ?? 0}  hard: ${byTier.hard ?? 0}`)
if (failures.length) {
  console.log(`\n${failures.length} unresolved:`)
  for (const f of failures) console.log(`  - ${f.failed.title} (${f.reason})`)
}

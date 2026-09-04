/**
 * Builds src/data/duel-clips.json (+ duel-titles.json) from duel-candidates.json.
 * Disjoint from solo clips.json. Resume-safe.
 *
 * Usage:
 *   node scripts/build-duel-clips.mjs
 *   node scripts/build-duel-clips.mjs --force
 *   node scripts/build-duel-clips.mjs --limit=50
 *
 * Requires TMDB_ACCESS_TOKEN or TMDB_API_KEY in .env
 * Run candidates first: npm run fetch-duel-candidates
 */
import 'dotenv/config'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmdbFetchSync, youtubeEmbedSync } from './tmdb-ps.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CANDIDATES_PATH = resolve(__dirname, 'duel-candidates.json')
const SOLO_CLIPS = resolve(__dirname, '../src/data/clips.json')
const OUT_PATH = resolve(__dirname, '../src/data/duel-clips.json')
const TITLES_PATH = resolve(__dirname, '../src/data/duel-titles.json')
const MISSING_PATH = resolve(__dirname, '../duel-clips-missing.txt')

const FORCE = process.argv.includes('--force')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : null

const SLEEP_MS = 250
const DEFAULT_TRAILER_SEC = 120
const MAX_VIDEO_TRIES = 5
/** Soft cap so we stop once the duel pool is in the 300–500 band. */
const TARGET_CLIPS = 450

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function slugify(title, year) {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${base || 'film'}-${year}`
}

function scoreVideo(video) {
  let score = 0
  if (video.type === 'Trailer') score += 10
  else if (video.type === 'Teaser') score += 6
  else return -1

  if (video.site !== 'YouTube') return -1
  if (video.official) score += 5
  if (video.iso_639_1 === 'en') score += 2
  if (/official/i.test(video.name ?? '')) score += 1
  return score
}

function rankVideos(videos) {
  return [...videos]
    .map((video) => ({ video, score: scoreVideo(video) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.video)
}

function verifyEmbeddable(videoId) {
  const { status, body } = youtubeEmbedSync(videoId)
  if (status < 200 || status >= 300) return { ok: false, reason: `embed ${status}` }

  if (/playback on other websites has been disabled by the video owner/i.test(body)) {
    return { ok: false, reason: 'embed disabled' }
  }

  let lengthSec = Number(body.match(/"lengthSeconds":"(\d+)"/)?.[1] ?? 0)
  if (!lengthSec || lengthSec < 20) lengthSec = DEFAULT_TRAILER_SEC

  if (lengthSec > 600) {
    return { ok: false, reason: `too long (${lengthSec}s)` }
  }

  return { ok: true, lengthSec }
}

function loadSoloBlocked() {
  const ids = new Set()
  const youtube = new Set()
  if (!existsSync(SOLO_CLIPS)) return { ids, youtube }
  for (const clip of JSON.parse(readFileSync(SOLO_CLIPS, 'utf8'))) {
    ids.add(clip.id)
    if (clip.youtubeId) youtube.add(clip.youtubeId)
  }
  return { ids, youtube }
}

function writeOutputs(byId) {
  const clips = [...byId.values()].sort((a, b) => a.title.localeCompare(b.title))
  writeFileSync(OUT_PATH, `${JSON.stringify(clips, null, 2)}\n`)
  const titles = [...new Set(clips.map((c) => c.title))].sort((a, b) => a.localeCompare(b))
  writeFileSync(TITLES_PATH, `${JSON.stringify(titles, null, 2)}\n`)
  return clips.length
}

async function processCandidate(movie, soloBlocked) {
  try {
    const id = movie.id || slugify(movie.title, movie.year)
    if (soloBlocked.ids.has(id)) {
      return { failed: movie, reason: 'overlaps solo pool' }
    }

    const { results = [] } = tmdbFetchSync(`/movie/${movie.tmdbId}/videos`)
    await sleep(SLEEP_MS)
    const ranked = rankVideos(results)
    if (!ranked.length) return { failed: movie, reason: `no trailer on TMDB #${movie.tmdbId}` }

    let lastReason = 'verify failed'
    for (const video of ranked.slice(0, MAX_VIDEO_TRIES)) {
      if (soloBlocked.youtube.has(video.key)) {
        lastReason = 'youtube id used in solo'
        continue
      }

      const verdict = verifyEmbeddable(video.key)
      await sleep(SLEEP_MS)
      if (!verdict.ok) {
        lastReason = verdict.reason ?? 'verify failed'
        continue
      }

      const aliases = []
      if (movie.originalTitle && movie.originalTitle !== movie.title) {
        aliases.push(movie.originalTitle)
      }

      return {
        id,
        title: movie.title,
        year: movie.year,
        difficulty: 'duel',
        aliases,
        youtubeId: video.key,
        startSec: 0,
        durationSec: verdict.lengthSec,
        channel: video.name ?? '',
        tmdbId: movie.tmdbId,
      }
    }

    return { failed: movie, reason: `none embeddable (last: ${lastReason})` }
  } catch (err) {
    return { failed: movie, reason: err.message }
  }
}

if (!existsSync(CANDIDATES_PATH)) {
  console.error('Missing duel-candidates.json — run: npm run fetch-duel-candidates')
  process.exit(1)
}

const candidates = JSON.parse(readFileSync(CANDIDATES_PATH, 'utf8'))
const soloBlocked = loadSoloBlocked()

const byId = new Map()
if (!FORCE && existsSync(OUT_PATH)) {
  for (const clip of JSON.parse(readFileSync(OUT_PATH, 'utf8'))) {
    if (clip.difficulty === 'duel' && !soloBlocked.ids.has(clip.id)) {
      byId.set(clip.id, clip)
    }
  }
}

const candidateIds = new Set(candidates.map((m) => m.id || slugify(m.title, m.year)))
for (const id of [...byId.keys()]) {
  if (!candidateIds.has(id) || soloBlocked.ids.has(id)) byId.delete(id)
}

let todo = candidates.filter((m) => {
  const id = m.id || slugify(m.title, m.year)
  return FORCE || !byId.has(id)
})

if (LIMIT != null && Number.isFinite(LIMIT)) {
  todo = todo.slice(0, LIMIT)
}

console.log(
  FORCE
    ? `Force rebuild — fetching up to ${todo.length} duel films via TMDB.\n`
    : `${byId.size} duel clips already resolved, ${todo.length} to fetch (target ${TARGET_CLIPS}).\n`,
)

const failures = []
let done = 0
const total = todo.length

for (const movie of todo) {
  if (!FORCE && byId.size >= TARGET_CLIPS) {
    console.log(`\nHit target ${TARGET_CLIPS} clips — stopping early.`)
    break
  }

  const result = await processCandidate(movie, soloBlocked)
  done++
  const label = `[${String(done).padStart(3)}/${total}]`

  if (result.failed) {
    failures.push({ movie: result.failed, reason: result.reason })
    console.log(`${label} MISS ${movie.title} (${result.reason})`)
  } else {
    byId.set(result.id, result)
    console.log(`${label} ok   ${movie.title} → ${result.youtubeId} (${result.durationSec}s)`)
  }

  writeOutputs(byId)
}

if (failures.length) {
  const lines = failures.map(
    ({ movie, reason }) => `${movie.title} (${movie.year}) — ${reason}`,
  )
  writeFileSync(MISSING_PATH, `${lines.join('\n')}\n`, 'utf8')
}

const count = writeOutputs(byId)
console.log(`\nWrote ${count} duel clips → ${OUT_PATH}`)
console.log(`Titles → ${TITLES_PATH}`)
console.log(`Missed this run: ${failures.length}`)
if (failures.length) console.log(`See ${MISSING_PATH}`)

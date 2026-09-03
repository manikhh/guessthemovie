/**
 * Builds src/data/clips.json using TMDB trailer metadata (YouTube keys).
 *
 * Usage:
 *   node scripts/build-clips-tmdb.mjs          # resume — only missing films
 *   node scripts/build-clips-tmdb.mjs --force  # refetch everything
 *
 * Requires TMDB_ACCESS_TOKEN or TMDB_API_KEY in .env
 */

import 'dotenv/config'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MOVIES } from './movies.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = resolve(__dirname, '../src/data/clips.json')
const MISSING_PATH = resolve(__dirname, '../clips-missing.txt')
const FORCE = process.argv.includes('--force')

const TMDB_TOKEN = process.env.TMDB_ACCESS_TOKEN
const TMDB_API_KEY = process.env.TMDB_API_KEY
const SLEEP_MS = 300
const EMBED_SLEEP_MS = 800
const DEFAULT_TRAILER_SEC = 120
const MAX_VIDEO_TRIES = 5

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

function hasPersian(text) {
  return /[\u0600-\u06ff]/.test(text)
}

async function tmdbFetch(path, params = {}) {
  if (!TMDB_TOKEN && !TMDB_API_KEY) {
    throw new Error('Set TMDB_ACCESS_TOKEN or TMDB_API_KEY in .env')
  }

  const url = new URL(`https://api.themoviedb.org/3${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }
  if (!TMDB_TOKEN && TMDB_API_KEY) url.searchParams.set('api_key', TMDB_API_KEY)

  const headers = { accept: 'application/json' }
  if (TMDB_TOKEN) headers.Authorization = `Bearer ${TMDB_TOKEN}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`TMDB ${path} ${res.status}: ${body.slice(0, 120)}`)
  }
  await sleep(SLEEP_MS)
  return res.json()
}

function releaseYear(releaseDate) {
  if (!releaseDate) return null
  const year = Number(releaseDate.slice(0, 4))
  return Number.isFinite(year) ? year : null
}

function yearMatches(movieYear, releaseDate) {
  const y = releaseYear(releaseDate)
  if (!y) return true
  return Math.abs(y - movieYear) <= 1
}

async function searchTmdbMovie(movie) {
  const queries = [movie.title]
  const persian = movie.aliases?.find(hasPersian)
  if (persian) queries.push(persian)

  let best = null

  for (const query of queries) {
    const data = await tmdbFetch('/search/movie', {
      query,
      year: movie.year,
      include_adult: false,
    })

    for (const result of data.results ?? []) {
      if (!yearMatches(movie.year, result.release_date)) continue
      if (!best || result.popularity > best.popularity) best = result
    }

    if (best) break
  }

  return best
}

function scoreVideo(video) {
  let score = 0
  if (video.type === 'Trailer') score += 10
  else if (video.type === 'Teaser') score += 6
  else return -1

  if (video.site !== 'YouTube') return -1
  if (video.official) score += 5
  if (video.iso_639_1 === 'fa') score += 3
  if (video.iso_639_1 === 'en') score += 2
  if (/official|رسمی|تیزر|تریلر/i.test(video.name ?? '')) score += 1
  return score
}

function rankVideos(videos) {
  return [...videos]
    .map((video) => ({ video, score: scoreVideo(video) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.video)
}

async function verifyEmbeddable(videoId) {
  const embedRes = await fetch(`https://www.youtube.com/embed/${videoId}`, {
    headers: { 'user-agent': 'Mozilla/5.0' },
  })
  if (!embedRes.ok) return { ok: false, reason: `embed ${embedRes.status}` }

  const embedHtml = await embedRes.text()
  if (/playback on other websites has been disabled by the video owner/i.test(embedHtml)) {
    return { ok: false, reason: 'embed disabled' }
  }

  let lengthSec = Number(embedHtml.match(/"lengthSeconds":"(\d+)"/)?.[1] ?? 0)
  if (!lengthSec || lengthSec < 20) lengthSec = DEFAULT_TRAILER_SEC

  if (lengthSec > 600) {
    return { ok: false, reason: `too long (${lengthSec}s)` }
  }

  await sleep(EMBED_SLEEP_MS)
  return { ok: true, lengthSec }
}

async function processMovie(movie) {
  try {
    const match = await searchTmdbMovie(movie)
    if (!match) return { failed: movie, reason: 'no TMDB match' }

    const { results = [] } = await tmdbFetch(`/movie/${match.id}/videos`)
    const ranked = rankVideos(results)
    if (!ranked.length) return { failed: movie, reason: `no trailer on TMDB #${match.id}` }

    let lastReason = 'verify failed'
    for (const video of ranked.slice(0, MAX_VIDEO_TRIES)) {
      const verdict = await verifyEmbeddable(video.key)
      if (!verdict.ok) {
        lastReason = verdict.reason ?? 'verify failed'
        continue
      }

      return {
        id: slugify(movie.title, movie.year),
        title: movie.title,
        year: movie.year,
        difficulty: movie.difficulty,
        aliases: movie.aliases ?? [],
        youtubeId: video.key,
        startSec: 0,
        durationSec: verdict.lengthSec,
        channel: video.name ?? '',
        tmdbId: match.id,
      }
    }

    return { failed: movie, reason: `none embeddable (last: ${lastReason})` }
  } catch (err) {
    return { failed: movie, reason: err.message }
  }
}

const byId = new Map()
if (!FORCE && existsSync(OUT_PATH)) {
  for (const clip of JSON.parse(readFileSync(OUT_PATH, 'utf8'))) {
    byId.set(clip.id, clip)
  }
}

const movieIds = new Set(MOVIES.map((m) => slugify(m.title, m.year)))
for (const id of [...byId.keys()]) {
  if (!movieIds.has(id)) byId.delete(id)
}

const todo = MOVIES.filter((m) => !byId.has(slugify(m.title, m.year)))
console.log(
  FORCE
    ? `Force rebuild — fetching all ${MOVIES.length} films via TMDB.\n`
    : `${byId.size} clips already resolved, ${todo.length} to fetch.\n`,
)

const failures = []
let done = 0
const total = FORCE ? MOVIES.length : todo.length
const queue = FORCE ? MOVIES : todo

for (const movie of queue) {
  const result = await processMovie(movie)
  done++
  const label = `[${String(done).padStart(3)}/${total}]`

  if (result.failed) {
    failures.push({ movie: result.failed, reason: result.reason })
    console.log(`${label} MISS ${movie.title} (${result.reason})`)
  } else {
    byId.set(result.id, result)
    console.log(`${label} ok   ${movie.title} → ${result.youtubeId} (${result.durationSec}s)`)
  }

  const order = { easy: 0, medium: 1, hard: 2 }
  const clips = [...byId.values()].sort(
    (a, b) => order[a.difficulty] - order[b.difficulty] || a.title.localeCompare(b.title),
  )
  writeFileSync(OUT_PATH, JSON.stringify(clips, null, 2) + '\n')
}

if (failures.length) {
  const lines = failures.map(
    ({ movie, reason }) => `${movie.title} (${movie.year}) [${movie.difficulty}] — ${reason}`,
  )
  writeFileSync(MISSING_PATH, `${lines.join('\n')}\n`, 'utf8')
}

const clips = [...byId.values()]
const byTier = clips.reduce((acc, c) => {
  acc[c.difficulty] = (acc[c.difficulty] ?? 0) + 1
  return acc
}, {})

console.log(`\nWrote ${clips.length} clips to src/data/clips.json`)
console.log(`  easy: ${byTier.easy ?? 0}  medium: ${byTier.medium ?? 0}  hard: ${byTier.hard ?? 0}`)
console.log(`  missed: ${failures.length}`)
if (failures.length) console.log(`  see ${MISSING_PATH}`)

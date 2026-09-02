/**
 * Builds src/data/clips.json from the curated list in scripts/movies.ts.
 *
 * Every candidate trailer is verified as playable AND embeddable before being
 * accepted, so the game never ships a "Video unavailable" clip. No API key
 * needed, but YouTube rate-limits aggressively: requests are serialised with a
 * delay, retried with backoff, and progress is saved after every movie so an
 * interrupted run can resume.
 *
 * Usage: npm run fetch-clips
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MOVIES, type MovieSeed } from './movies'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = resolve(__dirname, '../src/data/clips.json')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const MIN_DURATION = 45
const MAX_DURATION = 330
const CANDIDATES_PER_MOVIE = 4
const REQUEST_DELAY_MS = 900
const MAX_RETRIES = 4

interface Clip {
  id: string
  title: string
  year: number
  difficulty: 'easy' | 'medium' | 'hard'
  aliases: string[]
  youtubeId: string
  startSec: number
  durationSec: number
  channel: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function decodeJsonString(s: string): string {
  try {
    return JSON.parse(`"${s}"`)
  } catch {
    return s
  }
}

function normalizeLatin(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasPersian(text: string): boolean {
  return /[\u0600-\u06ff]/.test(text)
}

function normalizePersian(text: string): string {
  return text
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/\u200c/g, ' ')
    .replace(/[؟،؛!.:«»()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(title: string, year: number): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${base || 'film'}-${year}`
}

/** Single serialised fetch point so we never burst requests at YouTube. */
async function politeFetch(url: string): Promise<string | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'user-agent': UA,
          'accept-language': 'en-US,en;q=0.9',
          accept: 'text/html,application/xhtml+xml',
        },
      })

      if (res.status === 429 || res.status === 503) {
        const backoff = 4000 * 2 ** attempt
        console.log(`    rate limited (${res.status}), waiting ${backoff / 1000}s`)
        await sleep(backoff)
        continue
      }
      if (!res.ok) return null

      const html = await res.text()
      // YouTube serves a consent/captcha interstitial when it throttles us.
      if (html.includes('captcha') && html.length < 60_000) {
        const backoff = 6000 * 2 ** attempt
        console.log(`    captcha wall, waiting ${backoff / 1000}s`)
        await sleep(backoff)
        continue
      }
      await sleep(REQUEST_DELAY_MS)
      return html
    } catch {
      await sleep(2000 * 2 ** attempt)
    }
  }
  return null
}

async function searchCandidates(query: string): Promise<{ id: string; title: string }[]> {
  const html = await politeFetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`,
  )
  if (!html) return []

  const out: { id: string; title: string }[] = []
  const seen = new Set<string>()

  for (const chunk of html.split('"videoRenderer":{').slice(1)) {
    const id = chunk.match(/^"videoId":"([\w-]{11})"/)?.[1]
    const title = chunk.match(/"title":\{"runs":\[\{"text":"(.*?)"\}\]/)?.[1]
    if (!id || !title || seen.has(id)) continue
    seen.add(id)
    out.push({ id, title: decodeJsonString(title) })
  }
  return out
}

interface VideoInfo {
  ok: boolean
  embeddable: boolean
  title: string
  channel: string
  duration: number
}

async function inspectVideo(videoId: string): Promise<VideoInfo | null> {
  const html = await politeFetch(`https://www.youtube.com/watch?v=${videoId}`)
  if (!html) return null

  return {
    ok: html.match(/"playabilityStatus":\{"status":"(\w+)"/)?.[1] === 'OK',
    embeddable: /"playableInEmbed":true/.test(html),
    title: decodeJsonString(html.match(/"videoDetails":\{.*?"title":"(.*?)"/)?.[1] ?? ''),
    channel: decodeJsonString(html.match(/"ownerChannelName":"(.*?)"/)?.[1] ?? ''),
    duration: Number(html.match(/"lengthSeconds":"(\d+)"/)?.[1] ?? 0),
  }
}

function isTrailerTitle(title: string): boolean {
  if (/\b(trailer|teaser)\b/i.test(title)) return true
  return /تریلر|تیزر/.test(title)
}

/** The video title must name the film and look like an actual trailer. */
function titleMatches(movie: MovieSeed, videoTitle: string): boolean {
  if (!isTrailerTitle(videoTitle)) return false

  const vLatin = normalizeLatin(videoTitle)
  const vPersian = normalizePersian(videoTitle)

  const banned = ['reaction', 'review', 'breakdown', 'explained', 'behind the scenes', 'making of']
  if (banned.some((b) => vLatin.includes(b))) return false

  const names = [movie.title, ...(movie.aliases ?? [])]
  return names.some((name) => {
    if (hasPersian(name)) {
      const n = normalizePersian(name)
      return n.length >= 2 && vPersian.includes(n)
    }
    const n = normalizeLatin(name)
    return n.length >= 3 && vLatin.includes(n)
  })
}

function searchQueries(movie: MovieSeed): string[] {
  const queries = [`${movie.title} ${movie.year} official trailer`]
  const persian = movie.aliases?.find(hasPersian)
  if (persian) {
    queries.push(`${persian} تریلر`)
    queries.push(`${persian} ${movie.year} تریلر رسمی`)
  }
  return queries
}

async function resolveMovie(movie: MovieSeed): Promise<Clip | null> {
  const seen = new Set<string>()

  for (const query of searchQueries(movie)) {
    const candidates = await searchCandidates(query)

    for (const cand of candidates) {
      if (seen.has(cand.id)) continue
      seen.add(cand.id)
      if (!titleMatches(movie, cand.title)) continue

      const info = await inspectVideo(cand.id)
      if (!info || !info.ok || !info.embeddable) continue
      if (info.duration < MIN_DURATION || info.duration > MAX_DURATION) continue
      if (!titleMatches(movie, info.title)) continue

      const startSec = Math.max(12, Math.min(Math.round(info.duration * 0.35), info.duration - 25))

      return {
        id: slugify(movie.title, movie.year),
        title: movie.title,
        year: movie.year,
        difficulty: movie.difficulty,
        aliases: movie.aliases ?? [],
        youtubeId: cand.id,
        startSec,
        durationSec: info.duration,
        channel: info.channel,
      }
    }
  }
  return null
}

// Fresh run for the Iranian pool — drop any leftover Hollywood clips.
const movieIds = new Set(MOVIES.map((m) => slugify(m.title, m.year)))
const existing: Clip[] = existsSync(OUT_PATH)
  ? (JSON.parse(readFileSync(OUT_PATH, 'utf8')) as Clip[]).filter((c) => movieIds.has(c.id))
  : []
const byId = new Map(existing.map((c) => [c.id, c]))

const todo = MOVIES.filter((m) => !byId.has(slugify(m.title, m.year)))

console.log(`${byId.size} clips already resolved, ${todo.length} to fetch.\n`)

let index = 0
for (const movie of todo) {
  index++
  const clip = await resolveMovie(movie)
  if (clip) byId.set(clip.id, clip)

  const clips = [...byId.values()]
  writeFileSync(OUT_PATH, `${JSON.stringify(clips, null, 2)}\n`)

  console.log(
    `[${String(index).padStart(3)}/${todo.length}] ${clip ? 'ok  ' : 'MISS'} ${movie.title}`,
  )
}

const clips = [...byId.values()]
const counts = {
  easy: clips.filter((c) => c.difficulty === 'easy').length,
  medium: clips.filter((c) => c.difficulty === 'medium').length,
  hard: clips.filter((c) => c.difficulty === 'hard').length,
}

console.log(`\nWrote ${clips.length} clips`)
console.log(`  easy   ${counts.easy}`)
console.log(`  medium ${counts.medium}`)
console.log(`  hard   ${counts.hard}`)

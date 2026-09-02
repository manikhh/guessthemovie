/**
 * Builds src/data/clips.json from the curated movie list.
 *
 * For each movie it searches YouTube (English + Persian queries), picks the best
 * trailer match, verifies embeddability, and saves progress after every film.
 *
 * Usage: node scripts/build-clips.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MOVIES } from './movies.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = resolve(__dirname, '../src/data/clips.json')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const SLEEP_MS = 1200
const MAX_SEARCH_RETRIES = 2
const MAX_CANDIDATE_TRIES = 4
const RATE_LIMIT_PAUSE_MS = 30_000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function politeFetch(url, label = 'request', { retries = 0 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, 'accept-language': 'fa,en-US,en;q=0.9' },
      })
      if (res.status === 429 || res.status === 503) {
        if (attempt >= retries) return res
        const wait = RATE_LIMIT_PAUSE_MS * (attempt + 1)
        console.log(`    rate limited on ${label}, waiting ${wait / 1000}s`)
        await sleep(wait)
        continue
      }
      if (!res.ok) return res
      await sleep(SLEEP_MS)
      return res
    } catch (err) {
      if (attempt >= retries) throw err
      const wait = 3000 * (attempt + 1)
      console.log(`    ${label} failed, retry in ${wait / 1000}s`)
      await sleep(wait)
    }
  }
  throw new Error(`${label} exhausted retries`)
}

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

function normalizeLatin(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePersian(s) {
  return s
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/\u200c/g, '')
    .replace(/[؟،؛!.:«»()]/g, '')
    .replace(/\s+/g, '')
    .trim()
}

function persianVariants(text) {
  const variants = new Set([text])
  const noZwnj = text.replace(/\u200c/g, '')
  variants.add(noZwnj)
  variants.add(noZwnj.replace(/\s+/g, ''))
  return [...variants]
}

function parseDuration(text) {
  if (!text) return null
  const parts = text.split(':').map(Number)
  if (parts.some(Number.isNaN)) return null
  return parts.reduce((acc, p) => acc * 60 + p, 0)
}

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
  const res = await politeFetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    `search "${query.slice(0, 40)}"`,
    { retries: MAX_SEARCH_RETRIES },
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

function nameMatches(movie, videoTitle) {
  const tLatin = normalizeLatin(videoTitle)
  const tPersian = normalizePersian(videoTitle)
  const names = [movie.title, ...(movie.aliases ?? [])]

  return names.some((name) => {
    if (hasPersian(name)) {
      return persianVariants(name).some((variant) => {
        const n = normalizePersian(variant)
        return n.length >= 2 && tPersian.includes(n)
      })
    }
    const wanted = normalizeLatin(name)
    if (wanted.length < 3) return false
    const bare = wanted.replace(/^the /, '')
    return tLatin.includes(wanted) || (bare !== wanted && tLatin.includes(bare))
  })
}

function isTrailerTitle(title) {
  if (/\b(trailer|teaser|promo)\b/i.test(title)) return true
  if (/تریلر|تیزر|پیشنمایش|آنونس/.test(title)) return true
  // Persian uploads often omit the word trailer.
  return hasPersian(title) && /فیلم|سینمایی|سریال/.test(title)
}

function scoreCandidate(cand, movie) {
  if (BAD_WORDS.some((w) => normalizeLatin(cand.title).includes(w))) return -1
  if (!isTrailerTitle(cand.title)) return -1
  if (!nameMatches(movie, cand.title)) return -1
  if (cand.lengthSec !== null && (cand.lengthSec < 45 || cand.lengthSec > 330)) return -1

  const t = normalizeLatin(cand.title)
  let score = 0
  if (t.includes('official') || /رسمی/.test(cand.title)) score += 3
  if (t.includes(String(movie.year))) score += 2
  if (t.includes('hd') || t.includes('4k')) score += 1
  if (t.includes('teaser') || /تیزر/.test(cand.title)) score -= 1
  if (cand.lengthSec !== null && cand.lengthSec >= 90 && cand.lengthSec <= 180) score += 2
  return score
}

async function verifyEmbeddable(videoId, fallbackLengthSec = null) {
  const embedRes = await politeFetch(`https://www.youtube.com/embed/${videoId}`, `embed ${videoId}`, {
    retries: 1,
  })
  if (!embedRes.ok) return { ok: false, reason: `embed ${embedRes.status}` }
  const embedHtml = await embedRes.text()
  if (/playback on other websites has been disabled by the video owner/i.test(embedHtml)) {
    return { ok: false, reason: 'embed disabled by owner' }
  }

  let lengthSec = fallbackLengthSec

  const pageRes = await politeFetch(`https://www.youtube.com/watch?v=${videoId}`, `watch ${videoId}`, {
    retries: 1,
  })
  if (pageRes.ok) {
    const html = await pageRes.text()
    if (/"playableInEmbed":false/.test(html)) {
      return { ok: false, reason: 'embed blocked' }
    }
    const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/)
    if (lengthMatch) lengthSec = Number(lengthMatch[1])
  }

  if (!lengthSec || lengthSec < 30) {
    return { ok: false, reason: 'no duration' }
  }

  return { ok: true, lengthSec }
}

function searchQueries(movie) {
  const queries = [
    `${movie.title} ${movie.year} official trailer`,
    `${movie.title} trailer`,
  ]
  const persian = movie.aliases?.find(hasPersian)
  if (persian) {
    queries.push(`${persian} تریلر`)
    queries.push(`${persian} ${movie.year} تریلر رسمی`)
    queries.push(`${persian} آنونس`)
  }
  return [...new Set(queries)]
}

function pickStartSec(lengthSec) {
  if (!lengthSec) return 35
  const start = Math.round(lengthSec * 0.35)
  return Math.max(15, Math.min(start, lengthSec - 25))
}

async function processMovie(movie) {
  try {
    const seen = new Set()
    const allCandidates = []

    for (const query of searchQueries(movie)) {
      const candidates = await searchYouTube(query)
      for (const c of candidates) {
        if (!seen.has(c.videoId)) {
          seen.add(c.videoId)
          allCandidates.push(c)
        }
      }
      await sleep(SLEEP_MS)
    }

    const ranked = allCandidates
      .map((c) => ({ ...c, score: scoreCandidate(c, movie) }))
      .filter((c) => c.score >= 0)
      .sort((a, b) => b.score - a.score)

    let lastReason = 'no match'
    for (const cand of ranked.slice(0, MAX_CANDIDATE_TRIES)) {
      const verdict = await verifyEmbeddable(cand.videoId, cand.lengthSec)
      if (!verdict.ok) {
        lastReason = verdict.reason ?? 'verify failed'
        continue
      }

      const lengthSec = verdict.lengthSec ?? cand.lengthSec
      return {
        id: slugify(movie.title, movie.year),
        title: movie.title,
        year: movie.year,
        difficulty: movie.difficulty,
        aliases: movie.aliases ?? [],
        youtubeId: cand.videoId,
        startSec: pickStartSec(lengthSec),
        durationSec: lengthSec ?? 0,
        channel: '',
      }
    }
    return { failed: movie, reason: ranked.length ? `none embeddable (last: ${lastReason})` : 'no match' }
  } catch (err) {
    return { failed: movie, reason: err.message }
  }
}

// Resume support
const byId = new Map()
if (existsSync(OUT_PATH)) {
  for (const clip of JSON.parse(readFileSync(OUT_PATH, 'utf8'))) {
    byId.set(clip.id, clip)
  }
}

const movieIds = new Set(MOVIES.map((m) => slugify(m.title, m.year)))
for (const id of [...byId.keys()]) {
  if (!movieIds.has(id)) byId.delete(id)
}

const todo = MOVIES.filter((m) => !byId.has(slugify(m.title, m.year)))
console.log(`${byId.size} clips already resolved, ${todo.length} to fetch.\n`)

let done = 0
for (const movie of todo) {
  const result = await processMovie(movie)
  done++
  const label = `[${String(done).padStart(3)}/${todo.length}]`

  if (result.failed) {
    console.log(`${label} MISS ${movie.title} (${result.reason})`)
  } else {
    byId.set(result.id, result)
    console.log(`${label} ok   ${movie.title} → ${result.youtubeId} @${result.startSec}s`)
  }

  const order = { easy: 0, medium: 1, hard: 2 }
  const clips = [...byId.values()].sort(
    (a, b) => order[a.difficulty] - order[b.difficulty] || a.title.localeCompare(b.title),
  )
  writeFileSync(OUT_PATH, JSON.stringify(clips, null, 2) + '\n')
  await sleep(SLEEP_MS)
}

const clips = [...byId.values()]
const byTier = clips.reduce((acc, c) => {
  acc[c.difficulty] = (acc[c.difficulty] ?? 0) + 1
  return acc
}, {})

console.log(`\nWrote ${clips.length} clips to src/data/clips.json`)
console.log(`  easy: ${byTier.easy ?? 0}  medium: ${byTier.medium ?? 0}  hard: ${byTier.hard ?? 0}`)
console.log(`  missed: ${todo.length - (byId.size - (MOVIES.length - todo.length))}`)

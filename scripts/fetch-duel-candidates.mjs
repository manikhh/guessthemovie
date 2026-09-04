/**
 * Builds scripts/duel-candidates.json from TMDB popular / top-rated / discover.
 * Excludes titles already in src/data/clips.json (solo easy/med/hard).
 *
 * Usage: node scripts/fetch-duel-candidates.mjs
 * Requires TMDB_ACCESS_TOKEN or TMDB_API_KEY in .env
 *
 * Target: ~600 candidates so build-duel-clips can land ~300–500 validated.
 */
import 'dotenv/config'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmdbFetchSync } from './tmdb-ps.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOLO_CLIPS = resolve(__dirname, '../src/data/clips.json')
const OUT_PATH = resolve(__dirname, 'duel-candidates.json')

const TARGET = 600
const SLEEP_MS = 200
const MIN_VOTE_COUNT = 800
const MIN_VOTE_AVG = 6.2

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

function releaseYear(releaseDate) {
  if (!releaseDate) return null
  const year = Number(releaseDate.slice(0, 4))
  return Number.isFinite(year) ? year : null
}

function loadSoloExclusions() {
  const blockedIds = new Set()
  const blockedTitles = new Set()
  if (!existsSync(SOLO_CLIPS)) return { blockedIds, blockedTitles }

  for (const clip of JSON.parse(readFileSync(SOLO_CLIPS, 'utf8'))) {
    blockedIds.add(clip.id)
    blockedTitles.add(`${clip.title.toLowerCase()}|${clip.year}`)
    if (clip.tmdbId) blockedIds.add(`tmdb:${clip.tmdbId}`)
  }
  return { blockedIds, blockedTitles }
}

function acceptMovie(movie, blockedIds, blockedTitles) {
  const year = releaseYear(movie.release_date)
  if (!year || year < 1970 || year > 2025) return null
  if (movie.adult) return null
  if ((movie.vote_count ?? 0) < MIN_VOTE_COUNT) return null
  if ((movie.vote_average ?? 0) < MIN_VOTE_AVG) return null
  if (!movie.title?.trim()) return null

  const id = slugify(movie.title, year)
  if (blockedIds.has(id)) return null
  if (blockedIds.has(`tmdb:${movie.id}`)) return null
  if (blockedTitles.has(`${movie.title.toLowerCase()}|${year}`)) return null

  return {
    id,
    tmdbId: movie.id,
    title: movie.title,
    year,
    originalTitle: movie.original_title !== movie.title ? movie.original_title : undefined,
    popularity: movie.popularity ?? 0,
    voteAverage: movie.vote_average ?? 0,
    voteCount: movie.vote_count ?? 0,
  }
}

async function collectPages(path, params, maxPages, into, blockedIds, blockedTitles) {
  for (let page = 1; page <= maxPages && into.size < TARGET * 2; page++) {
    const data = tmdbFetchSync(path, { ...params, page })
    for (const movie of data.results ?? []) {
      const entry = acceptMovie(movie, blockedIds, blockedTitles)
      if (entry) into.set(entry.tmdbId, entry)
    }
    process.stdout.write(`  ${path} p${page} → pool ${into.size}\r`)
    await sleep(SLEEP_MS)
    if (page >= (data.total_pages ?? 1)) break
  }
  process.stdout.write('\n')
}

const { blockedIds, blockedTitles } = loadSoloExclusions()
const byTmdb = new Map()

console.log(`Solo exclusions: ${blockedIds.size} keys. Fetching TMDB lists…`)

await collectPages('/movie/popular', { include_adult: false }, 25, byTmdb, blockedIds, blockedTitles)
await collectPages('/movie/top_rated', { include_adult: false }, 25, byTmdb, blockedIds, blockedTitles)

for (const [gte, lte] of [
  ['1970-01-01', '1979-12-31'],
  ['1980-01-01', '1989-12-31'],
  ['1990-01-01', '1999-12-31'],
  ['2000-01-01', '2009-12-31'],
  ['2010-01-01', '2019-12-31'],
  ['2020-01-01', '2025-12-31'],
]) {
  await collectPages(
    '/discover/movie',
    {
      include_adult: false,
      sort_by: 'vote_count.desc',
      'vote_count.gte': MIN_VOTE_COUNT,
      'vote_average.gte': MIN_VOTE_AVG,
      'primary_release_date.gte': gte,
      'primary_release_date.lte': lte,
      with_original_language: 'en',
    },
    8,
    byTmdb,
    blockedIds,
    blockedTitles,
  )
}

const ranked = [...byTmdb.values()].sort(
  (a, b) => b.voteCount - a.voteCount || b.popularity - a.popularity,
)

const selected = ranked.slice(0, TARGET)
writeFileSync(OUT_PATH, `${JSON.stringify(selected, null, 2)}\n`)

const years = selected.reduce((acc, m) => {
  const decade = `${Math.floor(m.year / 10) * 10}s`
  acc[decade] = (acc[decade] ?? 0) + 1
  return acc
}, {})

console.log(`\nWrote ${selected.length} candidates → ${OUT_PATH}`)
console.log('By decade:', years)
console.log(`Pool leftover unused: ${Math.max(0, ranked.length - TARGET)}`)

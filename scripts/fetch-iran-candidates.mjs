/**
 * Fetches Iranian film candidates from Wikidata (no API key).
 * Writes scripts/movie-candidates.ts for manual difficulty ranking.
 *
 * Usage: node scripts/fetch-iran-candidates.mjs
 */

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = resolve(__dirname, 'movie-candidates.ts')

/** Famous domestic hits that Wikidata sitelinks ranking may under-represent. */
const MANUAL_SUPPLEMENTS = [
  { title: 'The Lizard', year: 2004, aliases: ['مارمولک', 'Marmoulak'] },
  { title: 'Sperm Whale', year: 2015, aliases: ['نهنگ عنبر'] },
  { title: 'World, Hold on to Me', year: 2016, aliases: ['جهان با من برقص'] },
  { title: 'The Warden', year: 2019, aliases: ['سرخپوست'] },
  { title: 'Lottery', year: 2006, aliases: ['لاتاری'] },
  { title: 'The Tenants', year: 1986, aliases: ['مستأجران'] },
  { title: 'The Cow', year: 1969, aliases: ['گاو'] },
  { title: 'The Runner', year: 1984, aliases: ['داورده'] },
  { title: 'Hamoun', year: 1990, aliases: ['همون'] },
  { title: 'The Paternal House', year: 2012, aliases: ['خانه پدری'] },
  { title: 'No Date, No Signature', year: 2017, aliases: ['بدون تاریخ بدون امضا'] },
  { title: 'Hit the Road', year: 2021, aliases: ['زیر نور ماه'] },
  { title: 'Just 6.5', year: 2019, aliases: ['متری شیش و نیم'] },
  { title: 'The Yards', year: 2020, aliases: ['چهارراه کامرانیه'] },
  { title: 'Sperm Whale 2', year: 2017, aliases: ['نهنگ عنبر ۲'] },
  { title: 'The Oath', year: 2023, aliases: ['قسم'] },
  { title: 'Leily Is with Me', year: 1996, aliases: ['لیلی با من است'] },
  { title: 'The Loneliest Star', year: 2014, aliases: ['تنها می‌ترسم'] },
]

const SPARQL = `
SELECT ?film ?titleEn ?titleFa ?year ?imdb ?sitelinks WHERE {
  ?film wdt:P31 wd:Q11424.
  ?film wdt:P495 wd:Q794.
  OPTIONAL { ?film wdt:P577 ?inception. BIND(YEAR(?inception) AS ?year) }
  OPTIONAL { ?film wdt:P345 ?imdb. }
  ?film wikibase:sitelinks ?sitelinks.
  OPTIONAL { ?film rdfs:label ?titleEn. FILTER(LANG(?titleEn) = "en") }
  OPTIONAL { ?film rdfs:label ?titleFa. FILTER(LANG(?titleFa) = "fa") }
  FILTER(BOUND(?year) && ?year >= 1960 && ?year <= 2026)
  FILTER(BOUND(?titleEn) || BOUND(?titleFa))
}
ORDER BY DESC(?sitelinks)
LIMIT 350
`.trim()

const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(SPARQL)}`

const res = await fetch(url, {
  headers: {
    Accept: 'application/sparql-results+json',
    'User-Agent': 'guessthemovie-candidate-fetch/1.0 (educational project)',
  },
})

if (!res.ok) {
  console.error(`Wikidata error: ${res.status}`)
  process.exit(1)
}

const data = await res.json()
const rows = data.results.bindings

function normTitle(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** @type {Map<string, { titleEn?: string, titleFa?: string, year: number, imdb?: string, sitelinks: number }>} */
const byKey = new Map()

for (const row of rows) {
  const titleEn = row.titleEn?.value
  const titleFa = row.titleFa?.value
  const year = Number(row.year?.value)
  const imdb = row.imdb?.value
  const sitelinks = Number(row.sitelinks?.value ?? 0)

  const primary = titleEn ?? titleFa
  if (!primary || !year) continue

  // One row per film: prefer imdb id, else normalized English/Persian title.
  const key = imdb ?? normTitle(titleEn ?? titleFa)
  const existing = byKey.get(key)
  if (existing) {
    if (titleFa && !existing.titleFa) existing.titleFa = titleFa
    if (titleEn && !existing.titleEn) existing.titleEn = titleEn
    if (imdb && !existing.imdb) existing.imdb = imdb
    existing.sitelinks = Math.max(existing.sitelinks, sitelinks)
    // Keep earliest release year as the canonical one.
    existing.year = Math.min(existing.year, year)
    continue
  }

  byKey.set(key, { titleEn, titleFa, year, imdb, sitelinks })
}

const candidates = [...byKey.values()]
  .map((c) => {
    const title = c.titleEn ?? c.titleFa
    const aliases = []
    if (c.titleFa && c.titleFa !== title) aliases.push(c.titleFa)
    if (c.titleEn && c.titleEn !== title) aliases.push(c.titleEn)
    return {
      title,
      year: c.year,
      aliases: aliases.length ? aliases : undefined,
      imdb: c.imdb,
      sitelinks: c.sitelinks,
    }
  })
  .sort((a, b) => b.sitelinks - a.sitelinks || a.title.localeCompare(b.title))

// Merge manual supplements (deduped by imdb or normalized title).
const seen = new Set()
for (const c of candidates) {
  if (c.imdb) seen.add(c.imdb)
  seen.add(normTitle(c.title))
}
for (const s of MANUAL_SUPPLEMENTS) {
  const key = normTitle(s.title)
  if (seen.has(key)) continue
  seen.add(key)
  candidates.push({ ...s, sitelinks: 0, imdb: undefined })
}
candidates.sort((a, b) => b.sitelinks - a.sitelinks || a.title.localeCompare(b.title))

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

const lines = candidates.map((c, i) => {
  const aliasPart = c.aliases?.length
    ? `, aliases: [${c.aliases.map((a) => `'${esc(a)}'`).join(', ')}]`
    : ''
  const meta = `  // #${i + 1} sitelinks=${c.sitelinks}${c.imdb ? ` imdb=${c.imdb}` : ''}`
  return `${meta}\n  { title: '${esc(c.title)}', year: ${c.year}${aliasPart} },`
})

const content = `/**
 * How to rank:
 *   1. Add difficulty ('easy' | 'medium' | 'hard') to each entry you want in the game.
 *   2. Delete entries you don't want.
 *   3. Copy the ranked entries into scripts/movies.ts (difficulty required there).
 *
 * Sorted by Wikidata sitelinks (# comments) — rough notability only, not game difficulty.
 *
 * Regenerate: node scripts/fetch-iran-candidates.mjs
 */

export interface MovieCandidate {
  title: string
  year: number
  difficulty?: 'easy' | 'medium' | 'hard'
  aliases?: string[]
}

export const MOVIE_CANDIDATES: MovieCandidate[] = [
${lines.join('\n')}
]
`

writeFileSync(OUT_PATH, content)
console.log(`Wrote ${candidates.length} candidates to ${OUT_PATH}`)

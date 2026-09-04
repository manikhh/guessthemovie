/**
 * Streamer nudity filter aligned to Kick/Twitch:
 * ban only when the EMBEDDED trailer shows uncovered nipples / genitals / intimate areas.
 *
 * Prefer swapping red-band → green-band when a clean official trailer exists.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const backup = JSON.parse(
  readFileSync(resolve(root, 'scripts/hollywood-clips-backup.json'), 'utf8'),
)
const byId = new Map(backup.map((c) => [c.id, c]))

/** Embedded trailer has full nudity (nipples/genitals) — no safe cut kept */
const BAN = new Set([
  'under-the-skin-2013', // official trailer: stripping / nude void ritual
  'climax-2018', // orgy-like nude imagery
  'the-handmaiden-2016', // erotic nude frames in trailer
  'anora-2024', // strip-club breast/nipple nudity in trailers
])

/** Prefer green-band official trailer instead of removing */
const SWAP_YOUTUBE = {
  'the-grand-budapest-hotel-2014': 'hgGXL5lJ-6g', // was Official Red Band (zru-1DbbcsA)
}

let clips = JSON.parse(readFileSync(resolve(root, 'src/data/clips.json'), 'utf8'))
const have = new Set(clips.map((c) => c.id))

// Ensure full backup pool minus BAN, with swaps applied
const next = []
for (const clip of backup) {
  if (BAN.has(clip.id)) continue
  const youtubeId = SWAP_YOUTUBE[clip.id] ?? clip.youtubeId
  next.push({ ...clip, youtubeId })
}

const order = { easy: 0, medium: 1, hard: 2 }
next.sort(
  (a, b) =>
    (order[a.difficulty] ?? 9) - (order[b.difficulty] ?? 9) ||
    a.title.localeCompare(b.title),
)

writeFileSync(resolve(root, 'src/data/clips.json'), `${JSON.stringify(next, null, 2)}\n`)

const titles = { easy: [], medium: [], hard: [] }
for (const clip of next) {
  const bucket = titles[clip.difficulty]
  if (bucket && !bucket.includes(clip.title)) bucket.push(clip.title)
}
for (const key of Object.keys(titles)) titles[key].sort((a, b) => a.localeCompare(b))
writeFileSync(resolve(root, 'src/data/titles.json'), `${JSON.stringify(titles, null, 2)}\n`)

console.log(
  `solo ${clips.length} → ${next.length} | easy ${titles.easy.length} med ${titles.medium.length} hard ${titles.hard.length}`,
)
console.log('banned:', [...BAN].join(', '))
console.log(
  'swapped:',
  Object.entries(SWAP_YOUTUBE)
    .map(([id, yt]) => `${id}→${yt}`)
    .join(', '),
)
void have

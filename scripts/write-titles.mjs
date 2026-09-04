import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const clipsPath = resolve(root, 'src/data/clips.json')
const titlesPath = resolve(root, 'src/data/titles.json')

const clips = JSON.parse(readFileSync(clipsPath, 'utf8'))
const titles = { easy: [], medium: [], hard: [] }

for (const clip of clips) {
  const bucket = titles[clip.difficulty]
  if (bucket && !bucket.includes(clip.title)) bucket.push(clip.title)
}

for (const key of Object.keys(titles)) {
  titles[key].sort((a, b) => a.localeCompare(b))
}

writeFileSync(titlesPath, `${JSON.stringify(titles, null, 2)}\n`)

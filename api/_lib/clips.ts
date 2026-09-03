import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Difficulty, MovieClip } from '../../src/types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const clipsPath = resolve(__dirname, '../../src/data/clips.json')

export const CLIPS = JSON.parse(readFileSync(clipsPath, 'utf8')) as MovieClip[]

export function findClip(movieId: string, difficulty: Difficulty): MovieClip | null {
  const clip = CLIPS.find((item) => item.id === movieId)
  if (!clip || clip.difficulty !== difficulty) return null
  return clip
}

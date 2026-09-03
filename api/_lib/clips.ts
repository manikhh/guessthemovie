import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CLIP_DURATIONS } from '../../src/lib/game.js'
import type { Difficulty, MovieClip } from '../../src/types.js'

const HEAD_SEC = 10
const TAIL_SEC = 10
const LONGEST_CLIP = CLIP_DURATIONS[CLIP_DURATIONS.length - 1] ?? 5

/** Pick a start inside the trailer, skipping the first/last 10s and leaving room for the longest clip. */
export function randomStartSec(trailerDuration: number): number {
  const min = HEAD_SEC
  const max = trailerDuration - TAIL_SEC - LONGEST_CLIP
  if (!(max > min)) {
    return Math.max(0, (trailerDuration - LONGEST_CLIP) / 2)
  }
  return min + Math.random() * (max - min)
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const clipsPath = resolve(__dirname, '../../src/data/clips.json')

export const CLIPS = JSON.parse(readFileSync(clipsPath, 'utf8')) as MovieClip[]

export function findClip(movieId: string, difficulty: Difficulty): MovieClip | null {
  const clip = CLIPS.find((item) => item.id === movieId)
  if (!clip || clip.difficulty !== difficulty) return null
  return clip
}

export function getClipsForDifficulty(difficulty: Difficulty): MovieClip[] {
  return CLIPS.filter((clip) => clip.difficulty === difficulty)
}

export function toPublicClip(clip: MovieClip, startSec = clip.startSec) {
  return {
    id: clip.id,
    difficulty: clip.difficulty,
    youtubeId: clip.youtubeId,
    startSec,
    durationSec: clip.durationSec,
  }
}

export function toClipReveal(clip: MovieClip) {
  return {
    title: clip.title,
    year: clip.year,
  }
}

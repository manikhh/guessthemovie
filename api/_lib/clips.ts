import type { Difficulty, MovieClip } from '../../src/types'
import clipsData from '../../src/data/clips.json'

export const CLIPS = clipsData as MovieClip[]

export function findClip(movieId: string, difficulty: Difficulty): MovieClip | null {
  const clip = CLIPS.find((item) => item.id === movieId)
  if (!clip || clip.difficulty !== difficulty) return null
  return clip
}

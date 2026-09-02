import type { Difficulty, MovieClip } from '../types'
import clipsData from '../data/clips.json'

export const CLIPS = clipsData as MovieClip[]

export function getClipsForDifficulty(difficulty: Difficulty): MovieClip[] {
  return CLIPS.filter((clip) => clip.difficulty === difficulty)
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  easy: 'Blockbusters every Iranian has seen',
  medium: 'Well-known films and modern classics',
  hard: 'Arthouse, festival and deep cuts',
}

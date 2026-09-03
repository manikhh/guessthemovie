import type { Difficulty } from '../types'
import titlesData from '../data/titles.json'

export const TITLE_POOL = titlesData as Record<Difficulty, string[]>

export function getTitlesForDifficulty(difficulty: Difficulty): string[] {
  return TITLE_POOL[difficulty] ?? []
}

export function getPoolSize(difficulty: Difficulty): number {
  return getTitlesForDifficulty(difficulty).length
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  easy: 'Blockbusters everyone has seen',
  medium: 'Modern classics and cult hits',
  hard: 'Arthouse, festival and deep cuts',
}

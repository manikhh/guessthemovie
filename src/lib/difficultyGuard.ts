import type { Difficulty } from '../types'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export function isDifficulty(value: string | undefined): value is Difficulty {
  return !!value && (DIFFICULTIES as string[]).includes(value)
}

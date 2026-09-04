import { BASE_POINTS, ROUND_GUESS_SEC, SPEED_BONUS_PER_SEC } from './types'

export function scoreAnswer(correct: boolean, submittedAt: number, guessingStartedAt: number): number {
  if (!correct) return 0
  const elapsed = Math.max(0, (submittedAt - guessingStartedAt) / 1000)
  const remaining = Math.max(0, ROUND_GUESS_SEC - elapsed)
  return BASE_POINTS + Math.round(remaining * SPEED_BONUS_PER_SEC)
}

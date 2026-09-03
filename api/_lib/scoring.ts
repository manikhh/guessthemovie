import type { RoundAction, RoundState } from '../../src/types'

export const MAX_LEVELS = 6
const MAX_GUESS_LEN = 120

export function scoreForLevel(level: number): number {
  return MAX_LEVELS - level
}

/** Net points for a finished round: +level bonus on win, -1 per wrong guess. */
export function scoreRound(round: RoundState): number {
  if (round.won) {
    const wrongGuesses = round.guesses.length - 1
    return scoreForLevel(round.wonAtLevel ?? 0) - wrongGuesses
  }

  const skipPenalty = round.guesses.length < MAX_LEVELS ? 1 : 0
  return -round.guesses.length - skipPenalty
}

function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 0 && level < MAX_LEVELS
}

export function validateRoundActions(actions: RoundAction[]): boolean {
  let level = 0
  let guessCount = 0
  let unlockCount = 0
  let finished = false

  for (const action of actions) {
    if (finished) return false

    if (action.type === 'unlock') {
      if (level >= MAX_LEVELS - 1) return false
      unlockCount += 1
      if (unlockCount > MAX_LEVELS - 1) return false
      level += 1
      continue
    }

    if (action.type === 'giveup') {
      if (!isValidLevel(action.level) || action.level !== level) return false
      // Match the UI: give up only after the longest clip is unlocked.
      if (level !== MAX_LEVELS - 1) return false
      finished = true
      continue
    }

    if (action.type !== 'guess') return false
    if (!isValidLevel(action.level) || action.level !== level) return false
    if (action.text.trim().length === 0 || action.text.length > MAX_GUESS_LEN) return false

    guessCount += 1
    if (guessCount > MAX_LEVELS) return false
  }

  return true
}

export function computePointsFromActions(
  actions: RoundAction[],
  movie: { title: string; aliases: string[] },
  check: (guess: string, clip: { title: string; aliases: string[] }) => boolean,
): number | null {
  if (!validateRoundActions(actions)) return null

  let level = 0
  let total = 0
  let guessCount = 0

  for (const action of actions) {
    if (action.type === 'unlock') {
      if (level >= MAX_LEVELS - 1) return null
      level += 1
      continue
    }

    if (action.type === 'giveup') {
      if (action.level !== level) return null
      return total - 1
    }

    if (action.type !== 'guess') return null
    if (action.level !== level) return null

    guessCount += 1
    if (guessCount > MAX_LEVELS) return null

    const correct = check(action.text, movie)
    if (correct) {
      total += scoreForLevel(level)
      return total
    }

    total -= 1
  }

  if (guessCount >= MAX_LEVELS) return total
  return null
}

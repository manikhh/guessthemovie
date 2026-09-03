import type { Difficulty, PublicClip, RoundAction, RoundState, SessionStats } from '../types'

export const MAX_LEVELS = 6

/** Clip length per level. Guess early on the shortest clip for the most points. */
export const CLIP_DURATIONS = [0.2, 0.5, 1, 2, 3, 5]

export function clipDurationForLevel(level: number): number {
  return CLIP_DURATIONS[Math.min(level, CLIP_DURATIONS.length - 1)] ?? 5
}

/** Shorter clip = more points. Level 0 is worth 6, level 5 is worth 1. */
export function scoreForLevel(level: number): number {
  return MAX_LEVELS - level
}

export function formatDuration(sec: number): string {
  return `${sec}s`
}

export function createRound(movie: Pick<PublicClip, 'id' | 'difficulty'>): RoundState {
  return {
    movieId: movie.id,
    difficulty: movie.difficulty,
    unlockedLevel: 0,
    guesses: [],
    finished: false,
    won: false,
    wonAtLevel: null,
  }
}

export function hydrateRound(
  movie: Pick<PublicClip, 'id' | 'difficulty'>,
  actions: RoundAction[],
  outcome: Pick<RoundState, 'unlockedLevel' | 'finished' | 'won' | 'wonAtLevel'>,
): RoundState {
  const guesses = actions
    .filter((action): action is Extract<RoundAction, { type: 'guess' }> => action.type === 'guess')
    .map((action) => action.text)

  return {
    movieId: movie.id,
    difficulty: movie.difficulty,
    unlockedLevel: outcome.unlockedLevel,
    guesses,
    finished: outcome.finished,
    won: outcome.won,
    wonAtLevel: outcome.wonAtLevel,
  }
}

export function applyGuess(round: RoundState, guess: string, correct: boolean): RoundState {
  if (round.finished) return round

  const guesses = [...round.guesses, guess]

  if (correct) {
    return { ...round, guesses, finished: true, won: true, wonAtLevel: round.unlockedLevel }
  }

  // A wrong guess costs the attempt but never lengthens the clip on its own.
  const outOfGuesses = guesses.length >= MAX_LEVELS
  return { ...round, guesses, finished: outOfGuesses, won: false }
}

export function unlockNextLevel(round: RoundState): RoundState {
  if (round.finished || round.unlockedLevel >= MAX_LEVELS - 1) return round
  return { ...round, unlockedLevel: round.unlockedLevel + 1 }
}

export function giveUp(round: RoundState): RoundState {
  return { ...round, finished: true, won: false }
}

export const EMPTY_STATS: SessionStats = {
  score: 0,
  streak: 0,
  bestStreak: 0,
  rounds: 0,
  solved: 0,
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

export function applyRoundToStats(stats: SessionStats, round: RoundState): SessionStats {
  if (!round.finished) return stats

  const gained = scoreRound(round)
  const streak = round.won ? stats.streak + 1 : 0

  return {
    score: stats.score + gained,
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    rounds: stats.rounds + 1,
    solved: stats.solved + (round.won ? 1 : 0),
  }
}

const BEST_KEY = 'gtm:best'

export function loadBest(difficulty: Difficulty): number {
  try {
    return Number(localStorage.getItem(`${BEST_KEY}:${difficulty}`) ?? 0)
  } catch {
    return 0
  }
}

export function saveBest(difficulty: Difficulty, score: number): void {
  try {
    if (score > loadBest(difficulty)) {
      localStorage.setItem(`${BEST_KEY}:${difficulty}`, String(score))
    }
  } catch {
    /* storage unavailable */
  }
}

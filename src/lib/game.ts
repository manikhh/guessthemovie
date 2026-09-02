import type { Difficulty, MovieClip, RoundState, SessionStats } from '../types'

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

export function createRound(movie: MovieClip): RoundState {
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

export function applyRoundToStats(stats: SessionStats, round: RoundState): SessionStats {
  if (!round.finished) return stats

  const gained = round.won ? scoreForLevel(round.wonAtLevel ?? 0) : 0
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

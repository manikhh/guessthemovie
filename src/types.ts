export type Difficulty = 'easy' | 'medium' | 'hard'

/** Clip fields the client may see while a round is still active. */
export type PublicClip = {
  id: string
  difficulty: Difficulty
  youtubeId: string
  startSec: number
  durationSec: number
}

export type ClipReveal = {
  title: string
  year: number
}

export interface MovieClip {
  id: string
  title: string
  year: number
  difficulty: Difficulty
  aliases: string[]
  youtubeId: string
  /** Fallback clip start; live rounds pick a random start on the server. */
  startSec: number
  /** Full trailer length, used to keep clips inside the video. */
  durationSec: number
  channel?: string
}

export type GuessResult = 'correct' | 'wrong' | 'skip'

export type RoundAction =
  | { type: 'guess'; text: string; level: number }
  | { type: 'unlock' }
  | { type: 'giveup'; level: number }

export interface RoundState {
  movieId: string
  difficulty: Difficulty
  /** Longest clip level unlocked so far (0-based index into CLIP_DURATIONS). */
  unlockedLevel: number
  guesses: string[]
  finished: boolean
  won: boolean
  /** Clip level the player was on when they guessed correctly. */
  wonAtLevel: number | null
}

export interface SessionStats {
  score: number
  streak: number
  bestStreak: number
  rounds: number
  solved: number
}

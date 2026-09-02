export type Difficulty = 'easy' | 'medium' | 'hard'

export interface MovieClip {
  id: string
  title: string
  year: number
  difficulty: Difficulty
  aliases: string[]
  youtubeId: string
  /** Where in the trailer the clip starts. */
  startSec: number
  /** Full trailer length, used to keep clips inside the video. */
  durationSec: number
  channel?: string
}

export type GuessResult = 'correct' | 'wrong' | 'skip'

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

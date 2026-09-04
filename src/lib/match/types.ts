export type MatchPhase =
  | 'waiting'
  | 'countdown'
  | 'playing'
  | 'waiting_answers'
  | 'round_result'
  | 'next_movie'
  | 'final_result'

export interface MatchPlayer {
  id: string
  name: string
  avatar: string
  score: number
  ready: boolean
  isBot?: boolean
}

export interface RoundAnswer {
  text: string
  submittedAt: number
  correct: boolean
  points: number
}

export interface RoundResult {
  movieId: string
  title: string
  year: number
  answers: Record<string, RoundAnswer | null>
}

export interface MatchState {
  id: string
  code: string
  phase: MatchPhase
  hostId: string
  players: MatchPlayer[]
  movieIds: string[]
  roundIndex: number
  /** Epoch ms when current phase timer ends. */
  phaseEndsAt: number | null
  /** Epoch ms when guessing opened. */
  guessingStartedAt: number | null
  answers: Record<string, { text: string; submittedAt: number } | null>
  lastResult: RoundResult | null
  winnerId: string | null
  isDraw: boolean
  version: number
  updatedAt: number
}

/** Safe payload for clients — never includes the answer before reveal. */
export interface PublicMatchView {
  id: string
  code: string
  phase: MatchPhase
  hostId: string
  players: MatchPlayer[]
  roundIndex: number
  movieCount: number
  movieLabel: string
  phaseEndsAt: number | null
  guessingStartedAt: number | null
  preview: {
    youtubeId: string
    startSec: number
    previewSec: number
  } | null
  mySubmitted: boolean
  submissions: Record<string, boolean>
  lastResult: RoundResult | null
  winnerId: string | null
  isDraw: boolean
  version: number
  updatedAt: number
}

export const MOVIES_PER_MATCH = 10
export const MATCH_COUNTDOWN_SEC = 3
export const ROUND_GUESS_SEC = 15
export const ROUND_RESULT_SEC = 4
export const NEXT_MOVIE_SEC = 3
/** Shared trailer peek for both players each round. */
export const MATCH_PREVIEW_SEC = 3
export const BASE_POINTS = 100
export const SPEED_BONUS_PER_SEC = 6

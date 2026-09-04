import { checkGuess } from '../guess'
import { scoreAnswer } from './scoring'
import { getMovieById, matchPreviewSec, pickMatchMovies } from './movies'
import {
  MATCH_COUNTDOWN_SEC,
  MOVIES_PER_MATCH,
  NEXT_MOVIE_SEC,
  ROUND_GUESS_SEC,
  ROUND_RESULT_SEC,
  type MatchPlayer,
  type MatchState,
  type PublicMatchView,
  type RoundAnswer,
  type RoundResult,
} from './types'

function nowMs() {
  return Date.now()
}

function bump(state: MatchState): MatchState {
  return { ...state, version: state.version + 1, updatedAt: nowMs() }
}

function emptyAnswers(players: MatchPlayer[]): MatchState['answers'] {
  return Object.fromEntries(players.map((p) => [p.id, null]))
}

function roomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 5; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

export function createMatch(host: MatchPlayer): MatchState {
  return {
    id: `m-${Math.random().toString(36).slice(2, 10)}`,
    code: roomCode(),
    phase: 'waiting',
    hostId: host.id,
    players: [{ ...host, score: 0, ready: false }],
    movieIds: pickMatchMovies(MOVIES_PER_MATCH),
    roundIndex: 0,
    phaseEndsAt: null,
    guessingStartedAt: null,
    answers: { [host.id]: null },
    lastResult: null,
    winnerId: null,
    isDraw: false,
    version: 1,
    updatedAt: nowMs(),
  }
}

export function joinMatch(state: MatchState, guest: MatchPlayer): MatchState | { error: string } {
  if (state.phase !== 'waiting') return { error: 'Match already started' }
  if (state.players.length >= 2) return { error: 'Match is full' }
  if (state.players.some((p) => p.id === guest.id)) return state
  const players = [...state.players, { ...guest, score: 0, ready: false }]
  return bump({
    ...state,
    players,
    answers: emptyAnswers(players),
  })
}

export function setReady(state: MatchState, playerId: string, ready = true): MatchState | { error: string } {
  if (state.phase !== 'waiting') return { error: 'Match already started' }
  const players = state.players.map((p) => (p.id === playerId ? { ...p, ready } : p))
  let next: MatchState = bump({ ...state, players })

  if (players.length === 2 && players.every((p) => p.ready)) {
    next = bump({
      ...next,
      phase: 'countdown',
      roundIndex: 0,
      phaseEndsAt: nowMs() + MATCH_COUNTDOWN_SEC * 1000,
      guessingStartedAt: null,
      answers: emptyAnswers(players),
      lastResult: null,
      winnerId: null,
      isDraw: false,
    })
  }
  return next
}

export function submitAnswer(
  state: MatchState,
  playerId: string,
  text: string,
  at = nowMs(),
): MatchState | { error: string } {
  if (state.phase !== 'playing' && state.phase !== 'waiting_answers') {
    return { error: 'Round is closed' }
  }
  if (!state.players.some((p) => p.id === playerId)) return { error: 'Unknown player' }
  if (state.answers[playerId]) return { error: 'Answer already submitted' }

  const trimmed = text.trim().slice(0, 80)
  if (!trimmed) return { error: 'Empty answer' }

  const answers = {
    ...state.answers,
    [playerId]: { text: trimmed, submittedAt: at },
  }

  let next: MatchState = bump({
    ...state,
    phase: 'waiting_answers',
    answers,
  })

  const allIn = state.players.every((p) => answers[p.id])
  if (allIn) next = resolveRound(next, at)
  return next
}

function resolveRound(state: MatchState, at = nowMs()): MatchState {
  const movieId = state.movieIds[state.roundIndex]
  if (!movieId) return state
  const movie = getMovieById(movieId)
  if (!movie) return state

  const started = state.guessingStartedAt ?? at
  const graded: Record<string, RoundAnswer | null> = {}
  const players = state.players.map((player) => {
    const raw = state.answers[player.id]
    if (!raw) {
      graded[player.id] = null
      return player
    }
    const correct = checkGuess(raw.text, movie)
    const points = scoreAnswer(correct, raw.submittedAt, started)
    graded[player.id] = {
      text: raw.text,
      submittedAt: raw.submittedAt,
      correct,
      points,
    }
    return { ...player, score: player.score + points }
  })

  const lastResult: RoundResult = {
    movieId: movie.id,
    title: movie.title,
    year: movie.year,
    answers: graded,
  }

  return bump({
    ...state,
    players,
    phase: 'round_result',
    phaseEndsAt: at + ROUND_RESULT_SEC * 1000,
    guessingStartedAt: null,
    lastResult,
  })
}

function startRound(state: MatchState, roundIndex: number, at = nowMs()): MatchState {
  return bump({
    ...state,
    phase: 'playing',
    roundIndex,
    phaseEndsAt: at + ROUND_GUESS_SEC * 1000,
    guessingStartedAt: at,
    answers: emptyAnswers(state.players),
    lastResult: null,
  })
}

function finishMatch(state: MatchState, at = nowMs()): MatchState {
  const [a, b] = state.players
  let winnerId: string | null = null
  let isDraw = false
  if (a && b) {
    if (a.score === b.score) isDraw = true
    else winnerId = a.score > b.score ? a.id : b.id
  } else if (a) {
    winnerId = a.id
  }

  return bump({
    ...state,
    phase: 'final_result',
    phaseEndsAt: null,
    guessingStartedAt: null,
    winnerId,
    isDraw,
    updatedAt: at,
  })
}

/** Drive timers / phase transitions. Host should call ~4–10×/sec. */
export function tickMatch(state: MatchState, at = nowMs()): MatchState {
  if (!state.phaseEndsAt || at < state.phaseEndsAt) {
    if (state.phase === 'waiting_answers') {
      const allIn = state.players.every((p) => state.answers[p.id])
      if (allIn) return resolveRound(state, at)
    }
    return state
  }

  switch (state.phase) {
    case 'countdown':
      return startRound(state, 0, at)
    case 'playing':
    case 'waiting_answers':
      return resolveRound(state, at)
    case 'round_result': {
      const nextIndex = state.roundIndex + 1
      if (nextIndex >= MOVIES_PER_MATCH || nextIndex >= state.movieIds.length) {
        return finishMatch(state, at)
      }
      return bump({
        ...state,
        phase: 'next_movie',
        phaseEndsAt: at + NEXT_MOVIE_SEC * 1000,
        roundIndex: nextIndex,
      })
    }
    case 'next_movie':
      return startRound(state, state.roundIndex, at)
    default:
      return state
  }
}

export function rematch(state: MatchState, hostId: string): MatchState {
  const host = state.players.find((p) => p.id === hostId) ?? state.players[0]
  if (!host) return state
  const players = state.players.map((p) => ({ ...p, score: 0, ready: false }))
  return bump({
    ...createMatch({ ...host, score: 0, ready: false }),
    id: state.id,
    code: state.code,
    hostId: host.id,
    players,
    answers: emptyAnswers(players),
  })
}

export function toPublicView(state: MatchState, viewerId: string): PublicMatchView {
  const reveal =
    state.phase === 'round_result' ||
    state.phase === 'next_movie' ||
    state.phase === 'final_result'

  const movieId = state.movieIds[state.roundIndex]
  const movie = movieId ? getMovieById(movieId) : undefined

  const preview =
    (state.phase === 'playing' || state.phase === 'waiting_answers') && movie
      ? {
          youtubeId: movie.youtubeId,
          startSec: movie.startSec,
          previewSec: matchPreviewSec(movie),
        }
      : null

  return {
    id: state.id,
    code: state.code,
    phase: state.phase,
    hostId: state.hostId,
    players: state.players,
    roundIndex: state.roundIndex,
    movieCount: Math.min(MOVIES_PER_MATCH, state.movieIds.length),
    movieLabel: `Movie ${Math.min(state.roundIndex + 1, MOVIES_PER_MATCH)} of ${MOVIES_PER_MATCH}`,
    phaseEndsAt: state.phaseEndsAt,
    guessingStartedAt: state.guessingStartedAt,
    preview,
    mySubmitted: Boolean(state.answers[viewerId]),
    submissions: Object.fromEntries(
      state.players.map((p) => [p.id, Boolean(state.answers[p.id])]),
    ),
    lastResult: reveal ? state.lastResult : null,
    winnerId: state.winnerId,
    isDraw: state.isDraw,
    version: state.version,
    updatedAt: state.updatedAt,
  }
}

export function maybeBotAnswer(state: MatchState, at = nowMs()): MatchState {
  if (state.phase !== 'playing' && state.phase !== 'waiting_answers') return state
  const bot = state.players.find((p) => p.isBot)
  if (!bot || state.answers[bot.id]) return state
  if (!state.guessingStartedAt) return state

  const elapsed = at - state.guessingStartedAt
  const thinkMs = 2500 + (bot.id.charCodeAt(bot.id.length - 1) % 7) * 900
  if (elapsed < thinkMs) return state

  const movieId = state.movieIds[state.roundIndex]
  const movie = movieId ? getMovieById(movieId) : undefined
  if (!movie) return state

  const roll = (at + bot.id.length) % 10
  const text = roll < 7 ? movie.title : roll < 9 ? `${movie.title} ${movie.year}` : 'Unknown Film'
  const result = submitAnswer(state, bot.id, text, at)
  return 'error' in result ? state : result
}

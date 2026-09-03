import type { ClipReveal, Difficulty, PublicClip, RoundAction } from '../types'

export type AuthUser = {
  id: string
  username: string
  points: number
}

export type LeaderboardPlayer = {
  rank: number
  username: string
  points: number
}

type AuthResponse = {
  user?: AuthUser
  error?: string
}

type ScoreResponse = {
  delta?: number
  points?: number
  reveal?: ClipReveal | null
  error?: string
}

type LeaderboardResponse = {
  players?: LeaderboardPlayer[]
  error?: string
}

export type PlayView = {
  clip: PublicClip
  roundKey: string
  watched: number
  poolSize: number
  cycle: number
  actions: RoundAction[]
  unlockedLevel: number
  finished: boolean
  won: boolean
  wonAtLevel: number | null
  reveal: ClipReveal | null
}

export type ModeProgress = {
  difficulty: Difficulty
  watched: number
  poolSize: number
  completed: boolean
}

export class ModeCompleteError extends Error {
  constructor(message = 'Mode cleared') {
    super(message)
    this.name = 'ModeCompleteError'
  }
}

type NextClipResponse = PlayView & {
  error?: string
}

async function parseJsonResponse<T extends { error?: string }>(res: Response): Promise<T> {
  const text = await res.text()
  let data: T
  try {
    data = JSON.parse(text) as T
  } catch {
    throw new Error(text.trim() || 'Server error')
  }
  if (!res.ok) {
    throw new Error(data.error ?? 'Request failed')
  }
  return data
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (res.status === 401) return null
  const data = await parseJsonResponse<AuthResponse>(res)
  return data.user ?? null
}

export async function signup(input: {
  username: string
  password: string
  repeatPassword: string
  turnstileToken: string
}): Promise<AuthUser> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJsonResponse<AuthResponse>(res)
  if (!data.user) throw new Error('Signup failed')
  return data.user
}

export async function login(input: {
  username: string
  password: string
  turnstileToken: string
}): Promise<AuthUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJsonResponse<AuthResponse>(res)
  if (!data.user) throw new Error('Login failed')
  return data.user
}

export async function logout(): Promise<void> {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await parseJsonResponse<AuthResponse>(res)
    throw new Error(data.error ?? 'Logout failed')
  }
}

export async function submitRoundScore(input: {
  roundKey: string
  movieId: string
  difficulty: Difficulty
}): Promise<{ delta: number; points: number; reveal: ClipReveal | null }> {
  const res = await fetch('/api/score/round', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const data = await parseJsonResponse<ScoreResponse>(res)

  return {
    delta: data.delta ?? 0,
    points: data.points ?? 0,
    reveal: data.reveal ?? null,
  }
}

export async function fetchNextClip(difficulty: Difficulty, advance = false): Promise<PlayView> {
  const res = await fetch('/api/play/next', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ difficulty, advance }),
  })

  if (res.status === 404 && !advance) {
    return fetchNextClip(difficulty, true)
  }

  if (res.status === 410) {
    throw new ModeCompleteError()
  }

  const data = await parseJsonResponse<NextClipResponse>(res)
  if (!data.clip || !data.roundKey) {
    throw new Error('Could not load the next clip')
  }

  return {
    clip: data.clip,
    roundKey: data.roundKey,
    watched: data.watched ?? 0,
    poolSize: data.poolSize ?? 0,
    cycle: data.cycle ?? 1,
    actions: data.actions ?? [],
    unlockedLevel: data.unlockedLevel ?? 0,
    finished: data.finished === true,
    won: data.won === true,
    wonAtLevel: data.wonAtLevel ?? null,
    reveal: data.reveal ?? null,
  }
}

export async function fetchModesProgress(): Promise<ModeProgress[]> {
  const res = await fetch('/api/play/progress', { credentials: 'include' })
  if (res.status === 401) return []
  const data = await parseJsonResponse<{ modes?: ModeProgress[]; error?: string }>(res)
  return data.modes ?? []
}

export async function submitPlayAction(input: {
  difficulty: Difficulty
  roundKey: string
  action: RoundAction
}): Promise<PlayView> {
  const res = await fetch('/api/play/action', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJsonResponse<NextClipResponse>(res)
  if (!data.clip || !data.roundKey) {
    throw new Error('Could not update the round')
  }
  return {
    clip: data.clip,
    roundKey: data.roundKey,
    watched: data.watched ?? 0,
    poolSize: data.poolSize ?? 0,
    cycle: data.cycle ?? 1,
    actions: data.actions ?? [],
    unlockedLevel: data.unlockedLevel ?? 0,
    finished: data.finished === true,
    won: data.won === true,
    wonAtLevel: data.wonAtLevel ?? null,
    reveal: data.reveal ?? null,
  }
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardPlayer[]> {
  const res = await fetch(`/api/leaderboard?limit=${limit}`, { credentials: 'include' })
  const data = await parseJsonResponse<LeaderboardResponse>(res)
  return data.players ?? []
}

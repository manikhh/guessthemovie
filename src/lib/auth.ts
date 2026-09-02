import type { Difficulty, RoundAction } from '../types'

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
  error?: string
}

type LeaderboardResponse = {
  players?: LeaderboardPlayer[]
  error?: string
}

async function parseAuthResponse(res: Response): Promise<AuthResponse> {
  const data = (await res.json()) as AuthResponse
  if (!res.ok) {
    throw new Error(data.error ?? 'Request failed')
  }
  return data
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (res.status === 401) return null
  const data = await parseAuthResponse(res)
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
  const data = await parseAuthResponse(res)
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
  const data = await parseAuthResponse(res)
  if (!data.user) throw new Error('Login failed')
  return data.user
}

export async function logout(): Promise<void> {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) {
    const data = (await res.json()) as AuthResponse
    throw new Error(data.error ?? 'Logout failed')
  }
}

export async function submitRoundScore(input: {
  roundKey: string
  movieId: string
  difficulty: Difficulty
  actions: RoundAction[]
}): Promise<{ delta: number; points: number }> {
  const res = await fetch('/api/score/round', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const data = (await res.json()) as ScoreResponse
  if (!res.ok) {
    throw new Error(data.error ?? 'Could not save score')
  }

  return {
    delta: data.delta ?? 0,
    points: data.points ?? 0,
  }
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardPlayer[]> {
  const res = await fetch(`/api/leaderboard?limit=${limit}`, { credentials: 'include' })
  const data = (await res.json()) as LeaderboardResponse
  if (!res.ok) {
    throw new Error(data.error ?? 'Could not load leaderboard')
  }
  return data.players ?? []
}

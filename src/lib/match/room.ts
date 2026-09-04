import type { MatchState } from './types'

const PREFIX = 'gtm:match-room:'
const INDEX_KEY = 'gtm:match-index'

function readIndex(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function writeIndex(index: Record<string, string>) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index))
}

export function saveMatch(state: MatchState): void {
  localStorage.setItem(`${PREFIX}${state.id}`, JSON.stringify(state))
  const index = readIndex()
  index[state.code] = state.id
  writeIndex(index)
  try {
    window.dispatchEvent(new CustomEvent('gtm-match', { detail: state.id }))
  } catch {
    /* ignore */
  }
}

export function loadMatch(id: string): MatchState | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${id}`)
    return raw ? (JSON.parse(raw) as MatchState) : null
  } catch {
    return null
  }
}

export function findMatchByCode(code: string): MatchState | null {
  const id = readIndex()[code.trim().toUpperCase()]
  return id ? loadMatch(id) : null
}

export function identityKey(): string {
  const KEY = 'gtm:player-id'
  try {
    const existing = localStorage.getItem(KEY)
    if (existing) return existing
    const id = `p-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(KEY, id)
    return id
  } catch {
    return `p-${Math.random().toString(36).slice(2, 10)}`
  }
}

export function displayNameKey(): string {
  const KEY = 'gtm:player-name'
  try {
    return localStorage.getItem(KEY) ?? 'Player'
  } catch {
    return 'Player'
  }
}

export function setDisplayNameKey(name: string) {
  try {
    localStorage.setItem('gtm:player-name', name.trim().slice(0, 18) || 'Player')
  } catch {
    /* ignore */
  }
}

export const AVATARS = ['🎬', '🎥', '🍿', '🎞️', '📽️', '🏆']

export function avatarFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % AVATARS.length
  return AVATARS[h]!
}

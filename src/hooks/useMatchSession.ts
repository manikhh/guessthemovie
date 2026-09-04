import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createMatch,
  joinMatch,
  maybeBotAnswer,
  rematch as rematchMatch,
  setReady,
  submitAnswer,
  tickMatch,
  toPublicView,
} from '../lib/match/engine'
import {
  avatarFor,
  displayNameKey,
  findMatchByCode,
  identityKey,
  loadMatch,
  saveMatch,
  setDisplayNameKey,
} from '../lib/match/room'
import type { MatchPlayer, MatchState, PublicMatchView } from '../lib/match/types'

function makePlayer(name?: string, bot = false): MatchPlayer {
  const id = bot ? `bot-${Math.random().toString(36).slice(2, 7)}` : identityKey()
  return {
    id,
    name: bot ? 'Rival Bot' : (name?.trim() || displayNameKey()),
    avatar: bot ? '🤖' : avatarFor(id),
    score: 0,
    ready: bot,
    isBot: bot,
  }
}

export function useMatchSession() {
  const [matchId, setMatchId] = useState<string | null>(null)
  const [viewerId, setViewerId] = useState(() => identityKey())
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const hostRef = useRef(false)

  const state = useMemo(() => (matchId ? loadMatch(matchId) : null), [matchId, tick])

  const view: PublicMatchView | null = useMemo(() => {
    if (!state) return null
    return toPublicView(state, viewerId)
  }, [state, viewerId])

  const persist = useCallback((next: MatchState) => {
    saveMatch(next)
    setMatchId(next.id)
    setTick((n) => n + 1)
  }, [])

  const apply = useCallback(
    (fn: (s: MatchState) => MatchState | { error: string }) => {
      const current = matchId ? loadMatch(matchId) : null
      if (!current) {
        setError('Match not found')
        return
      }
      const result = fn(current)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setError(null)
      persist(result)
    },
    [matchId, persist],
  )

  // Host clock + bot brain
  useEffect(() => {
    if (!matchId || !hostRef.current) return
    const id = window.setInterval(() => {
      const current = loadMatch(matchId)
      if (!current) return
      let next = tickMatch(current)
      next = maybeBotAnswer(next)
      if (next.version !== current.version || next.phase !== current.phase || next.phaseEndsAt !== current.phaseEndsAt) {
        persist(next)
      } else {
        setTick((n) => n + 1)
      }
    }, 200)
    return () => window.clearInterval(id)
  }, [matchId, persist])

  // Guest / multi-tab sync
  useEffect(() => {
    function refresh() {
      setTick((n) => n + 1)
    }
    function onStorage(e: StorageEvent) {
      if (e.key?.startsWith('gtm:match-room:')) refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('gtm-match', refresh as EventListener)
    const poll = window.setInterval(refresh, 500)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('gtm-match', refresh as EventListener)
      window.clearInterval(poll)
    }
  }, [])

  // Reconnect to last match if still active
  useEffect(() => {
    try {
      const last = localStorage.getItem('gtm:last-match')
      if (!last) return
      const existing = loadMatch(last)
      if (existing && existing.phase !== 'final_result') {
        setMatchId(existing.id)
        hostRef.current = existing.hostId === identityKey()
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (matchId) {
      try {
        localStorage.setItem('gtm:last-match', matchId)
      } catch {
        /* ignore */
      }
    }
  }, [matchId])

  function createRoom(name: string) {
    setDisplayNameKey(name)
    const host = makePlayer(name)
    setViewerId(host.id)
    hostRef.current = true
    const match = createMatch(host)
    persist(match)
    setError(null)
  }

  function createVsBot(name: string) {
    setDisplayNameKey(name)
    const host = makePlayer(name)
    setViewerId(host.id)
    hostRef.current = true
    let match = createMatch(host)
    const joined = joinMatch(match, makePlayer(undefined, true))
    if ('error' in joined) {
      setError(joined.error)
      return
    }
    match = joined
    const started = setReady(match, host.id, true)
    if ('error' in started) {
      setError(started.error)
      return
    }
    persist(started)
    setError(null)
  }

  function joinRoom(code: string, name: string) {
    setDisplayNameKey(name)
    const guest = makePlayer(name)
    setViewerId(guest.id)
    hostRef.current = false
    const existing = findMatchByCode(code)
    if (!existing) {
      setError('No room with that code')
      return
    }
    const result = joinMatch(existing, guest)
    if ('error' in result) {
      setError(result.error)
      return
    }
    persist(result)
    setError(null)
  }

  function readyUp() {
    apply((s) => setReady(s, viewerId, true))
  }

  function guess(text: string) {
    apply((s) => submitAnswer(s, viewerId, text))
  }

  function playAgain() {
    apply((s) => {
      hostRef.current = s.hostId === viewerId
      let next = rematchMatch(s, s.hostId)
      const hasBot = next.players.some((p) => p.isBot)
      if (hasBot && hostRef.current) {
        next = {
          ...next,
          players: next.players.map((p) =>
            p.isBot || p.id === viewerId ? { ...p, ready: true } : p,
          ),
        }
        const started = setReady(next, viewerId, true)
        return 'error' in started ? next : started
      }
      return next
    })
  }

  function leave() {
    setMatchId(null)
    hostRef.current = false
    try {
      localStorage.removeItem('gtm:last-match')
    } catch {
      /* ignore */
    }
  }

  return {
    view,
    viewerId,
    error,
    createRoom,
    createVsBot,
    joinRoom,
    readyUp,
    guess,
    playAgain,
    leave,
    setError,
  }
}

import { useEffect, useMemo, useState } from 'react'
import type { PublicMatchView } from '../../lib/match/types'
import { MatchScoreboard } from './MatchScoreboard'
import { MatchSongPlayer } from './MatchSongPlayer'

interface MatchArenaProps {
  view: PublicMatchView
  viewerId: string
  error: string | null
  onReady: () => void
  onGuess: (text: string) => void
  onRematch: () => void
  onLeave: () => void
}

export function MatchArena({
  view,
  viewerId,
  error,
  onReady,
  onGuess,
  onRematch,
  onLeave,
}: MatchArenaProps) {
  const [guess, setGuess] = useState('')
  const remaining = useCountdown(view.phaseEndsAt)

  useEffect(() => {
    setGuess('')
  }, [view.roundIndex, view.phase])

  const me = view.players.find((p) => p.id === viewerId)
  const canGuess =
    (view.phase === 'playing' || view.phase === 'waiting_answers') && !view.mySubmitted

  return (
    <div className="match-arena">
      <div className="board-top">
        <button type="button" className="btn btn-quiet" onClick={onLeave}>
          ← Lobby
        </button>
        <span className="chip">{view.code}</span>
      </div>

      <MatchScoreboard view={view} viewerId={viewerId} />

      <div className="match-progress">
        <strong>{view.movieLabel}</strong>
        <span className="match-phase-tag">{phaseLabel(view.phase)}</span>
      </div>

      {view.phase === 'waiting' && (
        <section className="match-panel">
          <h2>Waiting room</h2>
          <p className="menu-intro">
            Share code <strong>{view.code}</strong>. Both players ready to start the 3–2–1
            countdown.
          </p>
          <ul className="match-ready-list">
            {view.players.map((p) => (
              <li key={p.id}>
                {p.avatar} {p.name} — {p.ready ? 'Ready' : 'Not ready'}
              </li>
            ))}
          </ul>
          {!me?.ready ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={onReady}>
              Ready
            </button>
          ) : (
            <p className="rank-board-note">Waiting for opponent…</p>
          )}
        </section>
      )}

      {view.phase === 'countdown' && (
        <section className="match-panel match-countdown">
          <p className="match-countdown-num">{Math.max(1, remaining)}</p>
          <p>Get ready — Movie 1 starts next</p>
        </section>
      )}

      {(view.phase === 'playing' || view.phase === 'waiting_answers') && view.preview && (
        <section className="match-panel match-playing">
          <div className="match-timer" data-urgent={remaining <= 5}>
            {remaining}s
          </div>
          <MatchSongPlayer
            youtubeId={view.preview.youtubeId}
            startSec={view.preview.startSec}
            previewSec={view.preview.previewSec}
            active={view.phase === 'playing' || view.phase === 'waiting_answers'}
          />
          <p className="match-hidden-hint">Title hidden — name the movie</p>

          {canGuess ? (
            <form
              className="guess-form match-guess"
              onSubmit={(e) => {
                e.preventDefault()
                if (!guess.trim()) return
                onGuess(guess)
              }}
            >
              <input
                className="guess-input"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Name the movie…"
                autoComplete="off"
                autoFocus
                maxLength={80}
              />
              <button type="submit" className="btn btn-primary" disabled={!guess.trim()}>
                Lock in
              </button>
            </form>
          ) : (
            <p className="match-submitted">Answer submitted — waiting for opponent / timer</p>
          )}
        </section>
      )}

      {view.phase === 'round_result' && view.lastResult && (
        <section className="match-panel match-reveal">
          <p className="result-verdict">Reveal</p>
          <h2 className="result-title">{view.lastResult.title}</h2>
          <p className="result-year">{view.lastResult.year}</p>
          <div className="match-answer-grid">
            {view.players.map((p) => {
              const ans = view.lastResult!.answers[p.id]
              return (
                <div
                  key={p.id}
                  className={`match-answer-card ${ans?.correct ? 'is-correct' : 'is-wrong'}`}
                >
                  <strong>
                    {p.avatar} {p.name}
                  </strong>
                  <em>{ans ? ans.text : 'No answer'}</em>
                  <span>
                    {ans ? (ans.correct ? `Correct · +${ans.points}` : 'Wrong') : 'Missed'}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="rank-board-note">Next movie in {remaining}s</p>
        </section>
      )}

      {view.phase === 'next_movie' && (
        <section className="match-panel match-countdown">
          <p className="match-countdown-num">{Math.max(1, remaining)}</p>
          <p>Next: {view.movieLabel}</p>
        </section>
      )}

      {view.phase === 'final_result' && (
        <FinalResult view={view} viewerId={viewerId} onRematch={onRematch} onLeave={onLeave} />
      )}

      {error && (
        <p className="feedback is-shown" role="status">
          {error}
        </p>
      )}
    </div>
  )
}

function FinalResult({
  view,
  viewerId,
  onRematch,
  onLeave,
}: {
  view: PublicMatchView
  viewerId: string
  onRematch: () => void
  onLeave: () => void
}) {
  const [a, b] = view.players
  const headline = view.isDraw
    ? 'Draw'
    : view.winnerId === viewerId
      ? 'You win'
      : 'You lose'

  return (
    <section className="match-panel match-final">
      <p className="result-verdict">Final</p>
      <h2 className="result-title">{headline}</h2>
      <div className="match-final-scores">
        {view.players.map((p) => (
          <div key={p.id} className={p.id === view.winnerId ? 'is-winner' : ''}>
            <span>
              {p.avatar} {p.name}
            </span>
            <strong>{p.score}</strong>
          </div>
        ))}
      </div>
      {a && b && (
        <p className="rank-board-note">
          {a.score} — {b.score}
        </p>
      )}
      <div className="result-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={onRematch}>
          Rematch
        </button>
        <button type="button" className="btn btn-ghost btn-lg" onClick={onLeave}>
          Return to lobby
        </button>
      </div>
    </section>
  )
}

function phaseLabel(phase: PublicMatchView['phase']): string {
  switch (phase) {
    case 'waiting':
      return 'Waiting'
    case 'countdown':
      return 'Countdown'
    case 'playing':
      return 'Playing Clip'
    case 'waiting_answers':
      return 'Waiting for Answers'
    case 'round_result':
      return 'Round Result'
    case 'next_movie':
      return 'Next Movie'
    case 'final_result':
      return 'Final Result'
  }
}

function useCountdown(endsAt: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [])
  return useMemo(() => {
    if (!endsAt) return 0
    return Math.max(0, Math.ceil((endsAt - now) / 1000))
  }, [endsAt, now])
}

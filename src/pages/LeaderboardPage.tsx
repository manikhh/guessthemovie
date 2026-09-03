import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { FactoryMark } from '../components/FactoryMark'
import { RankOneCrown } from '../components/icons'
import { fetchLeaderboard, type LeaderboardPlayer } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'

export function LeaderboardPage() {
  const { user, refresh } = useAuth()
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void Promise.all([fetchLeaderboard(50), refresh()])
      .then(([rows]) => {
        if (!cancelled) setPlayers(rows)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load leaderboard')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refresh])

  const youFromBoard = user
    ? players.find((player) => player.username.toLowerCase() === user.username.toLowerCase())
    : null
  const youPoints = youFromBoard?.points ?? user?.points

  return (
    <div className="app is-lobby auth-page">
      <header className="masthead">
        <div className="brand">
          <FactoryMark className="brand-mark" />
          <div className="brand-lockup">
            <h1 className="brand-name">Leaderboard</h1>
            <p className="masthead-sub">Top players by total points.</p>
          </div>
        </div>
      </header>

      <main className="main">
        {user && youPoints != null && (
          <p className="leaderboard-you">
            You · <strong>{youPoints}</strong> pts
            {youFromBoard && <span> · rank {youFromBoard.rank}</span>}
          </p>
        )}

        {loading && <p className="auth-bar-muted">Loading ranks…</p>}
        {error && <p className="auth-error">{error}</p>}

        {!loading && !error && players.length === 0 && (
          <p className="auth-note">No scores yet. Sign in and play to claim the top spot.</p>
        )}

        {!loading && !error && players.length > 0 && (
          <ol className="leaderboard-list">
            {players.map((player) => {
              const isYou = user?.username.toLowerCase() === player.username.toLowerCase()
              const isFirst = player.rank === 1
              return (
                <li
                  key={`${player.rank}-${player.username}`}
                  className={`leaderboard-row ${isYou ? 'is-you' : ''} ${isFirst ? 'is-first' : ''}`}
                >
                  <span className="leaderboard-rank">
                    {isFirst ? <RankOneCrown className="leaderboard-crown" /> : player.rank}
                  </span>
                  <span className="leaderboard-name">@{player.username}</span>
                  <span className="leaderboard-points">{player.points} pts</span>
                </li>
              )
            })}
          </ol>
        )}

        <p className="auth-switch">
          <Link to="/">← Back to game</Link>
        </p>
      </main>
    </div>
  )
}

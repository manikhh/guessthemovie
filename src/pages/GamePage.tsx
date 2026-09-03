import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { GameBoard } from '../components/GameBoard'
import { useAuth } from '../hooks/useAuth'
import { isDifficulty } from '../lib/difficultyGuard'

export function GamePage() {
  const { difficulty } = useParams<{ difficulty: string }>()
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  if (!isDifficulty(difficulty)) {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return (
      <div className="app is-theater">
        <main className="main loading">
          <p>Loading…</p>
        </main>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={`/login?next=/play/${difficulty}`} replace />
  }

  return (
    <div className="app is-theater">
      <main className="main">
        <GameBoard
          key={difficulty}
          difficulty={difficulty}
          onExit={() => navigate('/')}
        />
      </main>
    </div>
  )
}

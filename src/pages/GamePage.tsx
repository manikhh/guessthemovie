import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { GameBoard } from '../components/GameBoard'
import { isDifficulty } from '../lib/difficultyGuard'

export function GamePage() {
  const { difficulty } = useParams<{ difficulty: string }>()
  const navigate = useNavigate()

  if (!isDifficulty(difficulty)) {
    return <Navigate to="/" replace />
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

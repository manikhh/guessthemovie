import { useNavigate } from 'react-router-dom'
import { MatchArena } from './MatchArena'
import { MatchLobby } from './MatchLobby'
import { useMatchSession } from '../../hooks/useMatchSession'

export function MovieMatch() {
  const navigate = useNavigate()
  const session = useMatchSession()

  if (!session.view) {
    return (
      <MatchLobby
        error={session.error}
        onCreate={session.createRoom}
        onJoin={session.joinRoom}
        onVsBot={session.createVsBot}
        onBack={() => navigate('/')}
      />
    )
  }

  return (
    <MatchArena
      view={session.view}
      viewerId={session.viewerId}
      error={session.error}
      onReady={session.readyUp}
      onGuess={session.guess}
      onRematch={session.playAgain}
      onLeave={() => {
        session.leave()
      }}
    />
  )
}

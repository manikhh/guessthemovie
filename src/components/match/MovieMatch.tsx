import { MatchArena } from './MatchArena'
import { MatchLobby } from './MatchLobby'
import { useMatchSession } from '../../hooks/useMatchSession'

interface MovieMatchProps {
  onExit: () => void
}

export function MovieMatch({ onExit }: MovieMatchProps) {
  const session = useMatchSession()

  if (!session.view) {
    return (
      <MatchLobby
        error={session.error}
        onCreate={session.createRoom}
        onJoin={session.joinRoom}
        onVsBot={session.createVsBot}
        onBack={onExit}
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

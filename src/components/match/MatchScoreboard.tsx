import type { MatchPlayer, PublicMatchView } from '../../lib/match/types'

interface MatchScoreboardProps {
  view: PublicMatchView
  viewerId: string
}

export function MatchScoreboard({ view, viewerId }: MatchScoreboardProps) {
  return (
    <div className="match-scoreboard">
      {view.players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          isYou={player.id === viewerId}
          submitted={view.submissions[player.id]}
          phase={view.phase}
        />
      ))}
    </div>
  )
}

function PlayerCard({
  player,
  isYou,
  submitted,
  phase,
}: {
  player: MatchPlayer
  isYou: boolean
  submitted?: boolean
  phase: PublicMatchView['phase']
}) {
  const guessing = phase === 'playing' || phase === 'waiting_answers'
  return (
    <div className={`match-player-card ${isYou ? 'is-you' : ''}`}>
      <span className="match-player-avatar" aria-hidden>
        {player.avatar}
      </span>
      <div className="match-player-meta">
        <strong>
          {player.name}
          {isYou ? ' · you' : ''}
        </strong>
        <em>
          {guessing ? (submitted ? 'Answer submitted' : 'Listening…') : `Round score live`}
        </em>
      </div>
      <span className="match-player-score">{player.score}</span>
    </div>
  )
}

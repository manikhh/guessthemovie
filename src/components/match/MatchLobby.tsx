import { useState } from 'react'
import { displayNameKey } from '../../lib/match/room'

interface MatchLobbyProps {
  error: string | null
  onCreate: (name: string) => void
  onJoin: (code: string, name: string) => void
  onVsBot: (name: string) => void
  onBack: () => void
}

export function MatchLobby({ error, onCreate, onJoin, onVsBot, onBack }: MatchLobbyProps) {
  const [name, setName] = useState(() => displayNameKey())
  const [code, setCode] = useState('')

  return (
    <div className="match-lobby">
      <div className="board-top">
        <button type="button" className="btn btn-quiet" onClick={onBack}>
          ← Modes
        </button>
        <span className="chip">1v1 Movies</span>
      </div>

      <p className="menu-intro">
        Ten trailer clips. Same round for both players. Name the film before the timer hits zero.
      </p>

      <label className="match-field">
        <span>Display name</span>
        <input
          className="guess-input"
          value={name}
          maxLength={18}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </label>

      <button
        type="button"
        className="ranked-play"
        onClick={() => onCreate(name.trim() || 'Player')}
      >
        <span className="ranked-play-kicker">Host match</span>
        <span className="ranked-play-title">Create Room</span>
        <span className="ranked-play-hint">Get a code · wait for a challenger</span>
      </button>

      <form
        className="clan-form"
        onSubmit={(e) => {
          e.preventDefault()
          onJoin(code.trim().toUpperCase(), name.trim() || 'Player')
        }}
      >
        <input
          className="guess-input"
          placeholder="ROOM CODE"
          value={code}
          maxLength={6}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button type="submit" className="btn btn-outline">
          Join
        </button>
      </form>

      <button
        type="button"
        className="btn btn-ghost btn-lg"
        onClick={() => onVsBot(name.trim() || 'Player')}
      >
        Practice vs Bot
      </button>

      {error && (
        <p className="feedback is-shown" role="status">
          {error}
        </p>
      )}
    </div>
  )
}

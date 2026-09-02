import type { MovieClip, RoundState } from '../types'
import { CLIP_DURATIONS, formatDuration, scoreForLevel } from '../lib/game'

interface RoundResultProps {
  round: RoundState
  movie: MovieClip
  onNext: () => void
  /** Win celebration just played — slide result in gently. */
  animateIn?: boolean
}

export function RoundResult({ round, movie, onNext, animateIn = false }: RoundResultProps) {
  const won = round.won
  const level = round.wonAtLevel ?? 0
  const points = scoreForLevel(level)

  if (won) {
    return (
      <section className={`result is-won ${animateIn ? 'result-enter' : ''}`}>
        <div className="result-prize-card">
          <span className="result-prize-badge">+{points} pts</span>
          <h2 className="result-title">{movie.title}</h2>
          <p className="result-year">{movie.year}</p>
          <p className="result-detail">
            Nailed it from a {formatDuration(CLIP_DURATIONS[level]!)} clip
          </p>
        </div>

        <div className="result-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={onNext} autoFocus>
            Next movie
          </button>
          <a
            className="btn btn-ghost btn-lg"
            href={`https://www.youtube.com/watch?v=${movie.youtubeId}`}
            target="_blank"
            rel="noreferrer"
          >
            Watch trailer
          </a>
        </div>
      </section>
    )
  }

  return (
    <section className="result is-lost">
      <p className="result-verdict">Out of guesses</p>
      <h2 className="result-title">{movie.title}</h2>
      <p className="result-year">{movie.year}</p>
      <p className="result-detail">No points this round</p>

      <div className="result-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={onNext} autoFocus>
          Next movie
        </button>
        <a
          className="btn btn-ghost btn-lg"
          href={`https://www.youtube.com/watch?v=${movie.youtubeId}`}
          target="_blank"
          rel="noreferrer"
        >
          Watch trailer
        </a>
      </div>
    </section>
  )
}

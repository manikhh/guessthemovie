import type { MovieClip, RoundState } from '../types'
import { CLIP_DURATIONS, formatDuration, scoreForLevel } from '../lib/game'

interface RoundResultProps {
  round: RoundState
  movie: MovieClip
  onNext: () => void
}

export function RoundResult({ round, movie, onNext }: RoundResultProps) {
  const won = round.won
  const level = round.wonAtLevel ?? 0

  return (
    <section className={`result ${won ? 'is-won' : 'is-lost'}`}>
      <p className="result-verdict">{won ? 'Correct' : 'Out of guesses'}</p>

      <h2 className="result-title">{movie.title}</h2>
      <p className="result-year">{movie.year}</p>

      {won ? (
        <p className="result-detail">
          Guessed from {formatDuration(CLIP_DURATIONS[level]!)} ·{' '}
          <strong>+{scoreForLevel(level)} pts</strong>
        </p>
      ) : (
        <p className="result-detail">No points this round</p>
      )}

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

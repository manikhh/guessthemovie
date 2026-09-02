import type { MovieClip, RoundState } from '../types'
import { CLIP_DURATIONS, formatDuration, scoreForLevel } from '../lib/game'
import { ExternalLink, SkipForward } from './icons'

interface RoundResultProps {
  round: RoundState
  movie: MovieClip
  onNext: () => void
  onPrefetchNext?: () => void
}

export function RoundResult({ round, movie, onNext, onPrefetchNext }: RoundResultProps) {
  const won = round.won
  const level = round.wonAtLevel ?? 0
  const points = scoreForLevel(level)

  return (
    <section className={`result ${won ? 'is-won' : 'is-lost'}`}>
      <p className="result-verdict">{won ? '[CORRECT]' : '[OUT OF GUESSES]'}</p>
      {won && <p className="result-prize">+{points}</p>}
      <h2 className="result-title">{movie.title}</h2>
      <p className="result-year">{movie.year}</p>
      <p className="result-detail">
        {won
          ? `From a ${formatDuration(CLIP_DURATIONS[level]!)} clip`
          : 'No points this round'}
      </p>

      <div className="result-actions">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onNext}
          onMouseEnter={onPrefetchNext}
          onFocus={onPrefetchNext}
          autoFocus
        >
          Next
          <SkipForward size={16} strokeWidth={1.5} absoluteStrokeWidth aria-hidden />
        </button>
        <a
          className="btn btn-outline btn-lg"
          href={`https://www.youtube.com/watch?v=${movie.youtubeId}`}
          target="_blank"
          rel="noreferrer"
        >
          Trailer
          <ExternalLink size={16} strokeWidth={1.5} absoluteStrokeWidth aria-hidden />
        </a>
      </div>
    </section>
  )
}

import type { MovieClip, RoundState } from '../types'
import { CLIP_DURATIONS, formatDuration, scoreRound } from '../lib/game'
import { ExternalLink, SkipForward } from './icons'

interface RoundResultProps {
  round: RoundState
  movie: MovieClip
  onNext: () => void
  onPrefetchNext?: () => void
}

function formatPoints(delta: number): string {
  if (delta > 0) return `+${delta}`
  return String(delta)
}

export function RoundResult({ round, movie, onNext, onPrefetchNext }: RoundResultProps) {
  const won = round.won
  const level = round.wonAtLevel ?? 0
  const netPoints = scoreRound(round)

  return (
    <section className={`result ${won ? 'is-won' : 'is-lost'}`}>
      <p className="result-verdict">{won ? '[CORRECT]' : '[OUT OF GUESSES]'}</p>
      <p className={`result-prize ${netPoints < 0 ? 'is-negative' : ''}`}>{formatPoints(netPoints)}</p>
      <h2 className="result-title">{movie.title}</h2>
      <p className="result-year">{movie.year}</p>
      <p className="result-detail">
        {won
          ? `From a ${formatDuration(CLIP_DURATIONS[level]!)} clip · -1 per wrong guess`
          : `${round.guesses.length} wrong guess${round.guesses.length === 1 ? '' : 'es'} · -1 each`}
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

import type { ClipReveal, PublicClip, RoundState } from '../types'
import { CLIP_DURATIONS, formatDuration, MAX_LEVELS, scoreRound } from '../lib/game'
import { ExternalLink, SkipForward } from './icons'

interface RoundResultProps {
  round: RoundState
  movie: PublicClip & Partial<ClipReveal>
  onNext: () => void
  onPrefetchNext?: () => void
  loadingNext?: boolean
  scorePending?: boolean
  scoreError?: string | null
  onRetryScore?: () => void
}

function formatPoints(delta: number): string {
  if (delta > 0) return `+${delta}`
  return String(delta)
}

export function RoundResult({
  round,
  movie,
  onNext,
  onPrefetchNext,
  loadingNext,
  scorePending,
  scoreError,
  onRetryScore,
}: RoundResultProps) {
  const won = round.won
  const level = round.wonAtLevel ?? 0
  const netPoints = scoreRound(round)
  const gaveUp = !won && round.guesses.length < MAX_LEVELS

  return (
    <section className={`result ${won ? 'is-won' : 'is-lost'}`}>
      <p className="result-verdict">
        {won ? '[CORRECT]' : gaveUp ? '[GAVE UP]' : '[OUT OF GUESSES]'}
      </p>
      <p className={`result-prize ${netPoints < 0 ? 'is-negative' : ''}`}>{formatPoints(netPoints)}</p>
      <h2 className="result-title">{movie.title ?? '…'}</h2>
      <p className="result-year">{movie.year ?? ''}</p>
      <p className="result-detail">
        {won
          ? `From a ${formatDuration(CLIP_DURATIONS[level]!)} clip · -1 per wrong guess`
          : gaveUp
            ? `Skip −1${round.guesses.length ? ` · ${round.guesses.length} wrong · -1 each` : ''}`
            : `${round.guesses.length} wrong guess${round.guesses.length === 1 ? '' : 'es'} · -1 each`}
      </p>

      <div className="result-actions">
        {scoreError ? (
          <button type="button" className="btn btn-primary btn-lg" onClick={onRetryScore} autoFocus>
            Retry save
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={onNext}
            onMouseEnter={onPrefetchNext}
            onFocus={onPrefetchNext}
            disabled={loadingNext}
            autoFocus
          >
            {loadingNext ? 'Loading…' : scorePending ? 'Saving…' : 'Next'}
            <SkipForward size={16} strokeWidth={1.5} absoluteStrokeWidth aria-hidden />
          </button>
        )}
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

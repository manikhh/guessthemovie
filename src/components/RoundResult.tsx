import type { ClipReveal, PublicClip, RoundState } from '../types'
import {
  CLIP_DURATIONS,
  formatDuration,
  MAX_LEVELS,
  SKIP_PENALTY,
  WRONG_GUESS_PENALTY,
  scoreRound,
} from '../lib/game'
import { ExternalLink, SkipForward } from './icons'

interface RoundResultProps {
  round: RoundState
  movie: PublicClip & Partial<ClipReveal>
  modeComplete?: boolean
  onNext: () => void
  onDone?: () => void
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
  modeComplete,
  onNext,
  onDone,
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
          ? `From a ${formatDuration(CLIP_DURATIONS[level]!)} clip · −${WRONG_GUESS_PENALTY} per wrong guess`
          : gaveUp
            ? `Skip −${SKIP_PENALTY}${round.guesses.length ? ` · ${round.guesses.length} wrong · −${WRONG_GUESS_PENALTY} each` : ''}`
            : `${round.guesses.length} wrong guess${round.guesses.length === 1 ? '' : 'es'} · −${WRONG_GUESS_PENALTY} each`}
      </p>
      {modeComplete ? <p className="result-detail">Mode cleared — locked</p> : null}

      <div className="result-actions">
        {scoreError ? (
          <button type="button" className="btn btn-primary btn-lg" onClick={onRetryScore} autoFocus>
            Retry save
          </button>
        ) : modeComplete ? (
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={onDone}
            disabled={scorePending}
            autoFocus
          >
            {scorePending ? 'Saving…' : 'Back to modes'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={onNext}
            onMouseEnter={onPrefetchNext}
            onFocus={onPrefetchNext}
            disabled={loadingNext || scorePending}
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

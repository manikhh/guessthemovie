import type { SessionStats } from '../types'

interface StatsBarProps {
  stats: SessionStats
  best: number
  watched: number
  poolSize: number
  totalPoints?: number | null
}

export function StatsBar({ stats, best, watched, poolSize, totalPoints }: StatsBarProps) {
  const watchedLabel = `${watched} of ${poolSize} watched`

  return (
    <dl className="stat-inline">
      <dt>Run</dt>
      <dd>{stats.score}</dd>
      <dt>Best</dt>
      <dd>{Math.max(best, stats.score)}</dd>
      <dt>Seen</dt>
      <dd title={watchedLabel} aria-label={watchedLabel}>
        {watched}/{poolSize}
      </dd>
      {totalPoints != null && (
        <>
          <dt>Total</dt>
          <dd>{totalPoints}</dd>
        </>
      )}
    </dl>
  )
}

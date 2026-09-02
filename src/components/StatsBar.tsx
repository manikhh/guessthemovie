import type { SessionStats } from '../types'

interface StatsBarProps {
  stats: SessionStats
  best: number
  totalPoints?: number | null
}

export function StatsBar({ stats, best, totalPoints }: StatsBarProps) {
  return (
    <dl className="stat-inline">
      <dt>Run</dt>
      <dd>{stats.score}</dd>
      <dt>Best</dt>
      <dd>{Math.max(best, stats.score)}</dd>
      {totalPoints != null && (
        <>
          <dt>Total</dt>
          <dd>{totalPoints}</dd>
        </>
      )}
    </dl>
  )
}

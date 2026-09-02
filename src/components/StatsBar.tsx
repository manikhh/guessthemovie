import type { SessionStats } from '../types'

interface StatsBarProps {
  stats: SessionStats
  best: number
}

export function StatsBar({ stats, best }: StatsBarProps) {
  return (
    <dl className="stat-inline">
      <dt>Score</dt>
      <dd>{stats.score}</dd>
      <dt>Best</dt>
      <dd>{Math.max(best, stats.score)}</dd>
    </dl>
  )
}

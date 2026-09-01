import type { SessionStats } from '../types'

interface StatsBarProps {
  stats: SessionStats
  best: number
}

export function StatsBar({ stats, best }: StatsBarProps) {
  return (
    <dl className="stats">
      <div className="stat">
        <dt>Score</dt>
        <dd>{stats.score}</dd>
      </div>
      <div className="stat">
        <dt>Streak</dt>
        <dd>{stats.streak}</dd>
      </div>
      <div className="stat">
        <dt>Solved</dt>
        <dd>
          {stats.solved}
          <span className="stat-sub">/{stats.rounds}</span>
        </dd>
      </div>
      <div className="stat">
        <dt>Best</dt>
        <dd>{Math.max(best, stats.score)}</dd>
      </div>
    </dl>
  )
}

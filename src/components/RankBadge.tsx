import type { RankSnapshot } from '../lib/rank'

interface RankBadgeProps {
  rank: RankSnapshot
  size?: 'sm' | 'md' | 'lg'
}

export function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
  return (
    <div className={`r6-badge r6-${rank.family} r6-${size}`} aria-hidden>
      <span className="r6-badge-mark">{rank.division ?? (rank.family === 'champion' ? '★' : '?')}</span>
    </div>
  )
}

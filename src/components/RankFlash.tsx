import { useEffect } from 'react'
import { rankChangeLabel, type RankChange } from '../lib/rank'
import { RankBadge } from './RankBadge'

interface RankFlashProps {
  change: RankChange
  onDone?: () => void
}

export function RankFlash({ change, onDone }: RankFlashProps) {
  useEffect(() => {
    const t = window.setTimeout(() => onDone?.(), 2400)
    return () => window.clearTimeout(t)
  }, [onDone])

  const signed =
    change.kind === 'placement' || change.kind === 'placed'
      ? null
      : `${change.delta > 0 ? '+' : ''}${change.delta} RP`

  return (
    <div className={`rank-flash rank-flash-${change.kind}`} role="status" aria-live="polite">
      <p className="rank-flash-kicker">{rankChangeLabel(change.kind)}</p>
      <div className="rank-flash-row">
        <RankBadge rank={change.after} size="lg" />
      </div>
      <p className="rank-flash-name">{change.after.name}</p>
      {change.before.name !== change.after.name && change.kind !== 'placement' && (
        <p className="rank-flash-from">{change.before.name}</p>
      )}
      {signed && <p className="rank-flash-rp">{signed}</p>}
      {change.kind === 'placement' && (
        <p className="rank-flash-rp">{5 - change.placementsLeft}/5 placements</p>
      )}
    </div>
  )
}

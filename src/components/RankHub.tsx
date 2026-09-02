import { useMemo, useState } from 'react'
import {
  clanBoard,
  clanMembers,
  createClan,
  findClan,
  joinClan,
  leaveClan,
  loadProfile,
  nextRankName,
  playerBoard,
  rankOf,
  setDisplayName,
  weekLabel,
  type BoardRow,
  type Clan,
  type Player,
} from '../lib/rank'
import { RankBadge } from './RankBadge'

type BoardTab = 'ranked' | 'weekly' | 'clans'

interface RankHubProps {
  onBack: () => void
}

export function RankHub({ onBack }: RankHubProps) {
  const [tab, setTab] = useState<BoardTab>('ranked')
  const [tick, setTick] = useState(0)
  const [nameDraft, setNameDraft] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [clanName, setClanName] = useState('')
  const [clanTag, setClanTag] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [clanError, setClanError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const you = useMemo(() => loadProfile(), [tick])
  const clan = useMemo(() => findClan(you.clanId), [you.clanId, tick])
  const rank = rankOf(you)
  const upcoming = nextRankName(rank)

  const players = useMemo(
    () => playerBoard(tab === 'weekly' ? 'weekly' : 'ranked'),
    [tab, tick],
  )
  const clans = useMemo(() => clanBoard('weekly'), [tick])
  const roster = useMemo(() => (clan ? clanMembers(clan.id) : []), [clan, tick])

  function refresh() {
    setTick((n) => n + 1)
  }

  function saveName() {
    setDisplayName(nameDraft || you.name)
    setEditingName(false)
    refresh()
  }

  function handleCreate() {
    const result = createClan(clanName, clanTag)
    if (result.error) {
      setClanError(result.error)
      return
    }
    setClanError(null)
    setClanName('')
    setClanTag('')
    refresh()
  }

  function handleJoin() {
    const result = joinClan(joinCode)
    if (result.error) {
      setClanError(result.error)
      return
    }
    setClanError(null)
    setJoinCode('')
    refresh()
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setClanError('Could not copy the code')
    }
  }

  return (
    <div className="rank-hub">
      <div className="board-top">
        <button type="button" className="btn btn-quiet" onClick={onBack}>
          ← Modes
        </button>
        <span className={`chip rank-chip rank-${rank.family}`}>{rank.name}</span>
      </div>

      <section className="rank-card r6-card">
        <div className="r6-card-top">
          <RankBadge rank={rank} size="lg" />
          <div className="r6-card-copy">
            {editingName ? (
              <form
                className="rank-name-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  saveName()
                }}
              >
                <input
                  className="guess-input"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={18}
                  autoFocus
                  aria-label="Display name"
                  placeholder="Your name"
                />
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="rank-name-btn"
                onClick={() => {
                  setNameDraft(you.name)
                  setEditingName(true)
                }}
              >
                {you.name}
                <span>Edit</span>
              </button>
            )}
            <h2 className="r6-rank-title">{rank.name}</h2>
            <p className="rank-card-meta">
              {you.placementsLeft > 0
                ? `${5 - you.placementsLeft}/5 placements · ${you.placementWins} wins`
                : clan
                  ? `[${clan.tag}] ${clan.name}`
                  : `${you.rp} RP`}
            </p>
          </div>
        </div>

        {you.placementsLeft === 0 && (
          <>
            <div className="rank-progress">
              <div className="rank-progress-bar" style={{ width: `${Math.round(rank.progress * 100)}%` }} />
            </div>
            <p className="rank-progress-label">
              {you.protect ? 'Rank protection armed · ' : ''}
              {upcoming
                ? `${rank.nextRp! - rank.rp} RP to ${upcoming}`
                : `${rank.rp} Champion RP`}
            </p>
          </>
        )}
      </section>

      <div className="rank-tabs" role="tablist">
        <TabButton id="ranked" current={tab} onSelect={setTab}>
          Ranked
        </TabButton>
        <TabButton id="weekly" current={tab} onSelect={setTab}>
          Weekly
        </TabButton>
        <TabButton id="clans" current={tab} onSelect={setTab}>
          Clans
        </TabButton>
      </div>

      {tab !== 'clans' && (
        <>
          <p className="rank-board-note">
            {tab === 'ranked'
              ? 'Win to rank up. Lose and you can drop.'
              : `${weekLabel()} · session points`}
          </p>
          <LeaderList rows={players} ranked={tab === 'ranked'} />
        </>
      )}

      {tab === 'clans' && (
        <div className="clan-panel">
          {clan ? (
            <YourClan
              you={you}
              clan={clan}
              roster={roster}
              copied={copied}
              onCopy={() => copyCode(clan.code)}
              onLeave={() => {
                leaveClan()
                refresh()
              }}
            />
          ) : (
            <div className="clan-forms">
              <p className="menu-intro">Create a clan or join with an invite code.</p>
              <form
                className="clan-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleCreate()
                }}
              >
                <input
                  className="guess-input"
                  placeholder="Clan name"
                  value={clanName}
                  onChange={(e) => setClanName(e.target.value)}
                  maxLength={22}
                />
                <input
                  className="guess-input clan-tag-input"
                  placeholder="TAG"
                  value={clanTag}
                  onChange={(e) => setClanTag(e.target.value.toUpperCase())}
                  maxLength={4}
                />
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </form>
              <form
                className="clan-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleJoin()
                }}
              >
                <input
                  className="guess-input"
                  placeholder="Invite code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={8}
                />
                <button type="submit" className="btn btn-outline">
                  Join
                </button>
              </form>
              {clanError && (
                <p className="feedback is-shown" role="status">
                  {clanError}
                </p>
              )}
            </div>
          )}

          <p className="rank-board-note">Clan standings · {weekLabel()}</p>
          <ol className="board-list">
            {clans.map((row, index) => (
              <li
                key={row.clan.id}
                className={`board-row ${row.isYours ? 'is-you' : ''}`}
              >
                <span className="board-place">{index + 1}</span>
                <span className="board-who">
                  <strong>
                    [{row.clan.tag}] {row.clan.name}
                  </strong>
                  <em>
                    {row.members} member{row.members === 1 ? '' : 's'}
                    {row.isYours ? ' · you' : ''}
                  </em>
                </span>
                <span className="board-score">{row.score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function TabButton({
  id,
  current,
  onSelect,
  children,
}: {
  id: BoardTab
  current: BoardTab
  onSelect: (id: BoardTab) => void
  children: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={current === id}
      className={`rank-tab ${current === id ? 'is-active' : ''}`}
      onClick={() => onSelect(id)}
    >
      {children}
    </button>
  )
}

function LeaderList({ rows, ranked }: { rows: BoardRow[]; ranked: boolean }) {
  return (
    <ol className="board-list">
      {rows.map((row, index) => (
        <li key={row.id} className={`board-row board-row-rank ${row.isYou ? 'is-you' : ''}`}>
          <span className="board-place">{index + 1}</span>
          <RankBadge rank={row.rank} size="sm" />
          <span className="board-who">
            <strong>
              {row.name}
              {row.isYou ? ' · you' : ''}
            </strong>
            <em>
              {row.rank.name}
              {row.clan ? ` · [${row.clan.tag}]` : ''}
            </em>
          </span>
          <span className="board-score">{ranked ? `${row.score} RP` : row.score}</span>
        </li>
      ))}
    </ol>
  )
}

function YourClan({
  you,
  clan,
  roster,
  copied,
  onCopy,
  onLeave,
}: {
  you: Player
  clan: Clan
  roster: BoardRow[]
  copied: boolean
  onCopy: () => void
  onLeave: () => void
}) {
  const isOwner = clan.ownerId === you.id

  return (
    <section className="your-clan">
      <div className="your-clan-head">
        <h2>
          [{clan.tag}] {clan.name}
        </h2>
        {isOwner && <span className="chip">Founder</span>}
      </div>
      <p className="your-clan-code">
        Invite <button type="button" onClick={onCopy}>{copied ? 'Copied' : clan.code}</button>
      </p>
      <ol className="board-list">
        {roster.map((row, index) => (
          <li key={row.id} className={`board-row board-row-rank ${row.isYou ? 'is-you' : ''}`}>
            <span className="board-place">{index + 1}</span>
            <RankBadge rank={row.rank} size="sm" />
            <span className="board-who">
              <strong>{row.name}</strong>
              <em>{row.rank.name}</em>
            </span>
            <span className="board-score">{row.score} RP</span>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-quiet" onClick={onLeave}>
        Leave clan
      </button>
    </section>
  )
}

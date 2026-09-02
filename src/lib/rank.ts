export type RankFamily =
  | 'unranked'
  | 'copper'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'emerald'
  | 'diamond'
  | 'champion'

export interface RankSnapshot {
  index: number
  family: RankFamily
  name: string
  division: string | null
  rp: number
  minRp: number
  nextRp: number | null
  progress: number
}

export type RankChangeKind = 'placement' | 'placed' | 'up' | 'down' | 'hold' | 'protected'

export interface RankChange {
  kind: RankChangeKind
  delta: number
  before: RankSnapshot
  after: RankSnapshot
  placementsLeft: number
  placementWins: number
}

export interface Player {
  id: string
  name: string
  allTime: number
  weekly: number
  weeklyKey: string
  clanId: string | null
  rp: number
  placementsLeft: number
  placementWins: number
  protect: boolean
}

export interface Clan {
  id: string
  name: string
  tag: string
  code: string
  ownerId: string
  createdAt: number
}

export interface BoardRow {
  id: string
  name: string
  score: number
  clan: Clan | null
  rank: RankSnapshot
  isYou: boolean
}

export interface ClanBoardRow {
  clan: Clan
  score: number
  members: number
  isYours: boolean
}

interface RankStore {
  you: Player
  clans: Clan[]
}

const STORE_KEY = 'gtm:rank-v1'
const RP_PER_DIVISION = 100
const PLACEMENTS = 5
const ROMANS = ['V', 'IV', 'III', 'II', 'I'] as const

const FAMILY_NAMES: Record<Exclude<RankFamily, 'unranked' | 'champion'>, string> = {
  copper: 'Copper',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  emerald: 'Emerald',
  diamond: 'Diamond',
}

const FAMILY_ORDER = [
  'copper',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'emerald',
  'diamond',
] as const

interface LadderTier {
  index: number
  family: RankFamily
  name: string
  division: string | null
  minRp: number
}

function buildLadder(): LadderTier[] {
  const list: LadderTier[] = []
  let rp = 0
  let index = 0
  for (const family of FAMILY_ORDER) {
    for (const division of ROMANS) {
      list.push({
        index,
        family,
        name: `${FAMILY_NAMES[family]} ${division}`,
        division,
        minRp: rp,
      })
      rp += RP_PER_DIVISION
      index += 1
    }
  }
  list.push({
    index,
    family: 'champion',
    name: 'Champion',
    division: null,
    minRp: rp,
  })
  return list
}

export const RANK_LADDER = buildLadder()
export const CHAMPION_RP = RANK_LADDER[RANK_LADDER.length - 1]!.minRp

export const UNRANKED: RankSnapshot = {
  index: -1,
  family: 'unranked',
  name: 'Unranked',
  division: null,
  rp: 0,
  minRp: 0,
  nextRp: null,
  progress: 0,
}

export const SEED_CLANS: Clan[] = [
  { id: 'clan-cocoa', name: 'Cocoa Crew', tag: 'CC', code: 'COCOA1', ownerId: 'r-nova', createdAt: 0 },
  { id: 'clan-roast', name: 'Dark Roast', tag: 'DR', code: 'ROAST2', ownerId: 'r-ash', createdAt: 0 },
  { id: 'clan-frame', name: 'Frame Gang', tag: 'FG', code: 'FRAME3', ownerId: 'r-iris', createdAt: 0 },
]

const RIVALS: Omit<Player, 'weekly' | 'weeklyKey' | 'placementsLeft' | 'placementWins' | 'protect'>[] = [
  { id: 'r-nova', name: 'Nova', allTime: 1880, rp: 2680, clanId: 'clan-cocoa' },
  { id: 'r-ash', name: 'Ash', allTime: 1640, rp: 2310, clanId: 'clan-roast' },
  { id: 'r-iris', name: 'Iris', allTime: 1520, rp: 2140, clanId: 'clan-frame' },
  { id: 'r-rex', name: 'Rex', allTime: 1210, rp: 1760, clanId: 'clan-cocoa' },
  { id: 'r-luna', name: 'Luna', allTime: 980, rp: 1420, clanId: 'clan-roast' },
  { id: 'r-kai', name: 'Kai', allTime: 860, rp: 1180, clanId: 'clan-frame' },
  { id: 'r-mia', name: 'Mia', allTime: 640, rp: 820, clanId: 'clan-cocoa' },
  { id: 'r-zed', name: 'Zed', allTime: 410, rp: 460, clanId: null },
]

export function weekKey(now = new Date()): string {
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function weekLabel(key = weekKey()): string {
  const match = key.match(/^(\d+)-W(\d+)$/)
  if (!match) return key
  return `Week ${Number(match[2])}, ${match[1]}`
}

function hash(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

function codeFrom(seed: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let n = hash(seed)
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += alphabet[n % alphabet.length]
    n = Math.floor(n / alphabet.length) + hash(seed + i)
  }
  return out
}

export function rankFromRp(rp: number): RankSnapshot {
  const clamped = Math.max(0, Math.floor(rp))
  let tier = RANK_LADDER[0]!
  for (const entry of RANK_LADDER) {
    if (clamped >= entry.minRp) tier = entry
  }
  const next = RANK_LADDER[tier.index + 1] ?? null
  const span = next ? next.minRp - tier.minRp : RP_PER_DIVISION
  const into = clamped - tier.minRp
  return {
    index: tier.index,
    family: tier.family,
    name: tier.name,
    division: tier.division,
    rp: clamped,
    minRp: tier.minRp,
    nextRp: next?.minRp ?? null,
    progress: next ? Math.min(1, into / span) : Math.min(1, (into % RP_PER_DIVISION) / RP_PER_DIVISION),
  }
}

export function rankOf(player: Player): RankSnapshot {
  if (player.placementsLeft > 0) return { ...UNRANKED, rp: player.rp }
  return rankFromRp(player.rp)
}

export function nextRankName(snapshot: RankSnapshot): string | null {
  if (snapshot.family === 'unranked') return 'complete placements'
  const next = RANK_LADDER[snapshot.index + 1]
  return next?.name ?? null
}

function defaultYou(): Player {
  return {
    id: uid('you'),
    name: 'Player',
    allTime: 0,
    weekly: 0,
    weeklyKey: weekKey(),
    clanId: null,
    rp: 0,
    placementsLeft: PLACEMENTS,
    placementWins: 0,
    protect: false,
  }
}

function migrateYou(raw: Player): Player {
  const hasLadder = Number.isFinite(raw.rp) || Number.isFinite(raw.placementsLeft)
  return {
    id: raw.id,
    name: raw.name || 'Player',
    allTime: raw.allTime ?? 0,
    weekly: raw.weekly ?? 0,
    weeklyKey: raw.weeklyKey || weekKey(),
    clanId: raw.clanId ?? null,
    rp: Number.isFinite(raw.rp) ? raw.rp : Math.min(1200, (raw.allTime ?? 0) * 2),
    placementsLeft: Number.isFinite(raw.placementsLeft)
      ? raw.placementsLeft
      : hasLadder || (raw.allTime ?? 0) > 0
        ? 0
        : 5,
    placementWins: Number.isFinite(raw.placementWins) ? raw.placementWins : 0,
    protect: Boolean(raw.protect),
  }
}

function readStore(): RankStore {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return { you: defaultYou(), clans: [] }
    const parsed = JSON.parse(raw) as RankStore
    if (!parsed?.you?.id) return { you: defaultYou(), clans: [] }
    parsed.clans = Array.isArray(parsed.clans) ? parsed.clans : []
    parsed.you = migrateYou(parsed.you)
    return parsed
  } catch {
    return { you: defaultYou(), clans: [] }
  }
}

function writeStore(store: RankStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    /* storage unavailable */
  }
}

function rollWeekly(you: Player): Player {
  const key = weekKey()
  if (you.weeklyKey === key) return you
  return { ...you, weekly: 0, weeklyKey: key }
}

function rivalsForWeek(key: string): Player[] {
  return RIVALS.map((rival) => ({
    ...rival,
    weeklyKey: key,
    weekly: 18 + (hash(`${rival.id}:${key}`) % 172),
    placementsLeft: 0,
    placementWins: PLACEMENTS,
    protect: false,
  }))
}

function allClans(store: RankStore): Clan[] {
  const extras = store.clans.filter((c) => !SEED_CLANS.some((s) => s.id === c.id || s.code === c.code))
  return [...SEED_CLANS, ...extras]
}

function allPlayers(store: RankStore): Player[] {
  const you = rollWeekly(store.you)
  return [you, ...rivalsForWeek(you.weeklyKey)]
}

export function loadProfile(): Player {
  const store = readStore()
  const you = rollWeekly(store.you)
  if (you !== store.you) writeStore({ ...store, you })
  return you
}

export function setDisplayName(name: string): Player {
  const trimmed = name.trim().slice(0, 18)
  if (!trimmed) return loadProfile()
  const store = readStore()
  const you = { ...rollWeekly(store.you), name: trimmed }
  writeStore({ ...store, you })
  return you
}

/** Casual wins feed weekly / all-time boards without touching RP. */
export function recordCasualPoints(points: number): Player {
  if (points <= 0) return loadProfile()
  const store = readStore()
  const you = rollWeekly(store.you)
  const next = {
    ...you,
    weekly: you.weekly + points,
    allTime: you.allTime + points,
  }
  writeStore({ ...store, you: next })
  return next
}

export function rankedDelta(rp: number, won: boolean, clipLevel: number): number {
  if (won) {
    const perf = (5 - Math.min(5, Math.max(0, clipLevel))) * 4
    const scale = 1 - Math.min(0.42, rp / 7500)
    return Math.max(12, Math.round((24 + perf) * scale))
  }
  const extra = Math.min(12, Math.floor(rp / 800))
  return -(18 + extra)
}

export function applyRankedMatch(input: {
  won: boolean
  clipLevel: number
  scorePoints: number
}): RankChange {
  const store = readStore()
  let you = rollWeekly(store.you)
  const before = rankOf(you)
  const points = input.won ? Math.max(0, input.scorePoints) : 0

  if (you.placementsLeft > 0) {
    const placementWins = you.placementWins + (input.won ? 1 : 0)
    const placementsLeft = you.placementsLeft - 1
    const placed = placementsLeft === 0
    const rp = placed ? 50 + placementWins * 160 : you.rp
    you = {
      ...you,
      weekly: you.weekly + points,
      allTime: you.allTime + points,
      placementWins,
      placementsLeft,
      rp,
      protect: false,
    }
    writeStore({ ...store, you })
    return {
      kind: placed ? 'placed' : 'placement',
      delta: 0,
      before,
      after: rankOf(you),
      placementsLeft,
      placementWins,
    }
  }

  const delta = rankedDelta(you.rp, input.won, input.clipLevel)
  const beforeTier = rankFromRp(you.rp)
  let nextRp = Math.max(0, you.rp + delta)
  let protect = you.protect
  let kind: RankChangeKind = 'hold'

  const wouldDrop = rankFromRp(nextRp).index < beforeTier.index
  if (wouldDrop && protect) {
    nextRp = beforeTier.minRp
    protect = false
    kind = 'protected'
  } else {
    const afterTier = rankFromRp(nextRp)
    if (afterTier.index > beforeTier.index) {
      kind = 'up'
      protect = true
    } else if (afterTier.index < beforeTier.index) {
      kind = 'down'
      protect = false
    }
  }

  you = {
    ...you,
    weekly: you.weekly + points,
    allTime: you.allTime + points,
    rp: nextRp,
    protect,
  }
  writeStore({ ...store, you })
  return {
    kind,
    delta: kind === 'protected' ? nextRp - before.rp : delta,
    before,
    after: rankOf(you),
    placementsLeft: 0,
    placementWins: you.placementWins,
  }
}

function toRow(player: Player, youId: string, clanById: Map<string, Clan>, score: number): BoardRow {
  return {
    id: player.id,
    name: player.name,
    score,
    clan: player.clanId ? clanById.get(player.clanId) ?? null : null,
    rank: rankOf(player),
    isYou: player.id === youId,
  }
}

export function playerBoard(period: 'weekly' | 'allTime' | 'ranked'): BoardRow[] {
  const store = readStore()
  const you = rollWeekly(store.you)
  if (you !== store.you) writeStore({ ...store, you })
  const clanById = new Map(allClans(store).map((c) => [c.id, c]))

  return allPlayers({ ...store, you })
    .map((player) => {
      const score =
        period === 'ranked' ? player.rp : period === 'weekly' ? player.weekly : player.allTime
      return toRow(player, you.id, clanById, score)
    })
    .sort((a, b) => {
      if (period === 'ranked') {
        const aPlace = a.rank.family === 'unranked' ? -1 : a.rank.rp
        const bPlace = b.rank.family === 'unranked' ? -1 : b.rank.rp
        return bPlace - aPlace || a.name.localeCompare(b.name)
      }
      return b.score - a.score || a.name.localeCompare(b.name)
    })
}

export function clanBoard(period: 'weekly' | 'allTime'): ClanBoardRow[] {
  const store = readStore()
  const you = rollWeekly(store.you)
  const clans = allClans(store)
  const players = allPlayers({ ...store, you })

  return clans
    .map((clan) => {
      const members = players.filter((p) => p.clanId === clan.id)
      const score = members.reduce((sum, p) => sum + (period === 'weekly' ? p.weekly : p.allTime), 0)
      return {
        clan,
        score,
        members: members.length,
        isYours: you.clanId === clan.id,
      }
    })
    .sort((a, b) => b.score - a.score || a.clan.name.localeCompare(b.clan.name))
}

export function clanMembers(clanId: string): BoardRow[] {
  const store = readStore()
  const you = rollWeekly(store.you)
  const clanById = new Map(allClans(store).map((c) => [c.id, c]))

  return allPlayers({ ...store, you })
    .filter((p) => p.clanId === clanId)
    .map((player) => toRow(player, you.id, clanById, player.rp))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

export function findClan(clanId: string | null): Clan | null {
  if (!clanId) return null
  const store = readStore()
  return allClans(store).find((c) => c.id === clanId) ?? null
}

export function createClan(name: string, tag: string): { clan: Clan; error?: undefined } | { clan?: undefined; error: string } {
  const trimmedName = name.trim().slice(0, 22)
  const cleanTag = tag
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)

  if (trimmedName.length < 3) return { error: 'Clan name needs at least 3 letters' }
  if (cleanTag.length < 2) return { error: 'Tag needs 2–4 letters' }

  const store = readStore()
  const you = rollWeekly(store.you)
  if (you.clanId) return { error: 'Leave your current clan first' }

  const clans = allClans(store)
  if (clans.some((c) => c.tag === cleanTag)) return { error: 'That tag is taken' }
  if (clans.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())) {
    return { error: 'That name is taken' }
  }

  const clan: Clan = {
    id: uid('clan'),
    name: trimmedName,
    tag: cleanTag,
    code: codeFrom(`${you.id}:${trimmedName}:${Date.now()}`),
    ownerId: you.id,
    createdAt: Date.now(),
  }

  writeStore({
    you: { ...you, clanId: clan.id },
    clans: [...store.clans, clan],
  })
  return { clan }
}

export function joinClan(code: string): { clan: Clan; error?: undefined } | { clan?: undefined; error: string } {
  const clean = code.trim().toUpperCase()
  if (!clean) return { error: 'Enter an invite code' }

  const store = readStore()
  const you = rollWeekly(store.you)
  if (you.clanId) return { error: 'Leave your current clan first' }

  const clan = allClans(store).find((c) => c.code === clean)
  if (!clan) return { error: 'No clan with that code' }

  writeStore({ ...store, you: { ...you, clanId: clan.id } })
  return { clan }
}

export function leaveClan(): Player {
  const store = readStore()
  const you = { ...rollWeekly(store.you), clanId: null }
  writeStore({ ...store, you })
  return you
}

export function yourPlace(period: 'weekly' | 'allTime' | 'ranked'): number {
  const index = playerBoard(period).findIndex((row) => row.isYou)
  return index < 0 ? 0 : index + 1
}

export function rankChangeLabel(kind: RankChangeKind): string {
  if (kind === 'up') return 'Rank up'
  if (kind === 'down') return 'Rank down'
  if (kind === 'protected') return 'Rank protection'
  if (kind === 'placed') return "You're ranked"
  if (kind === 'placement') return 'Placement'
  return 'Ranked'
}

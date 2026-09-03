import { ObjectId } from 'mongodb'
import type { Difficulty, MovieClip, PublicClip, RoundAction } from '../../src/types.js'
import { getClipsForDifficulty, toClipReveal, toPublicClip } from './clips.js'
import { getDb } from './db.js'
import { checkGuess } from './guess.js'
import { computePointsFromActions, MAX_LEVELS, validateRoundActions } from './scoring.js'

export type PlaySessionDoc = {
  _id?: ObjectId
  userId: ObjectId
  difficulty: Difficulty
  seenMovieIds: string[]
  activeMovieId: string | null
  activeRoundKey: string | null
  actions: RoundAction[]
  revision: number
  cycle: number
  updatedAt: Date
}

export type ClipReveal = {
  title: string
  year: number
}

export type NextClipResult = {
  clip: PublicClip
  roundKey: string
  watched: number
  poolSize: number
  cycle: number
  actions: RoundAction[]
  unlockedLevel: number
  finished: boolean
  won: boolean
  wonAtLevel: number | null
  reveal: ClipReveal | null
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

function pickNextMovieId(pool: MovieClip[], seen: Set<string>, avoidId?: string | null): string | null {
  let available = pool.filter((clip) => !seen.has(clip.id))
  if (available.length === 0) {
    available = pool.filter((clip) => clip.id !== avoidId)
    if (available.length === 0) available = pool
  }

  return shuffle(available)[0]?.id ?? null
}

function revisionFilter(revision: number | undefined) {
  if (typeof revision === 'number') return { revision }
  return { $or: [{ revision: { $exists: false } }, { revision: 0 }] }
}

async function hasScoredRound(userId: ObjectId, roundKey: string): Promise<boolean> {
  const db = await getDb()
  const existing = await db.collection('score_events').findOne({ userId, roundKey })
  return existing != null
}

function deriveProgress(actions: RoundAction[], movie: MovieClip) {
  let unlockedLevel = 0
  let guessCount = 0
  let finished = false
  let won = false
  let wonAtLevel: number | null = null

  for (const action of actions) {
    if (action.type === 'unlock') {
      unlockedLevel += 1
      continue
    }
    if (action.type === 'giveup') {
      finished = true
      break
    }
    if (action.type !== 'guess') continue
    guessCount += 1
    if (checkGuess(action.text, movie)) {
      finished = true
      won = true
      wonAtLevel = unlockedLevel
      break
    }
    if (guessCount >= MAX_LEVELS) finished = true
  }

  return { unlockedLevel, finished, won, wonAtLevel }
}

function toResult(
  clip: MovieClip,
  roundKey: string,
  session: PlaySessionDoc,
  poolSize: number,
): NextClipResult {
  const actions = session.actions ?? []
  const progress = deriveProgress(actions, clip)
  return {
    clip: toPublicClip(clip),
    roundKey,
    watched: session.seenMovieIds.length,
    poolSize,
    cycle: session.cycle ?? 1,
    actions,
    ...progress,
    reveal: progress.finished ? toClipReveal(clip) : null,
  }
}

export async function resolveNextClip(
  userId: string,
  difficulty: Difficulty,
  advance: boolean,
): Promise<NextClipResult | null> {
  const pool = getClipsForDifficulty(difficulty)
  if (pool.length === 0) return null

  const db = await getDb()
  const col = db.collection<PlaySessionDoc>('play_sessions')
  const userObjectId = new ObjectId(userId)
  const now = new Date()

  const existing = await col.findOne({ userId: userObjectId, difficulty })

  if (existing?.activeMovieId && existing.activeRoundKey) {
    const scored = await hasScoredRound(userObjectId, existing.activeRoundKey)
    if (!scored) {
      if (advance) {
        throw new Error('ACTIVE_ROUND')
      }

      const clip = pool.find((item) => item.id === existing.activeMovieId)
      if (clip) {
        return toResult(clip, existing.activeRoundKey, existing, pool.length)
      }

      await col.updateOne(
        { userId: userObjectId, difficulty },
        {
          $set: {
            activeMovieId: null,
            activeRoundKey: null,
            actions: [],
            updatedAt: now,
          },
        },
      )
    }
  }

  if (!advance) {
    return null
  }

  const session: PlaySessionDoc = existing ?? {
    userId: userObjectId,
    difficulty,
    seenMovieIds: [],
    activeMovieId: null,
    activeRoundKey: null,
    actions: [],
    revision: 0,
    cycle: 1,
    updatedAt: now,
  }

  const seen = new Set(session.seenMovieIds)
  let cycle = session.cycle ?? 1
  const lastId = session.activeMovieId

  let movieId = pickNextMovieId(pool, seen, lastId)
  if (!movieId) return null

  if (seen.has(movieId)) {
    seen.clear()
    cycle += 1
    movieId = pickNextMovieId(pool, seen, lastId)
    if (!movieId) return null
  }

  seen.add(movieId)
  const roundKey = crypto.randomUUID()
  const clip = pool.find((item) => item.id === movieId)
  if (!clip) return null

  const revision = (session.revision ?? 0) + 1
  const nextSession: PlaySessionDoc = {
    ...session,
    seenMovieIds: [...seen],
    activeMovieId: movieId,
    activeRoundKey: roundKey,
    actions: [],
    revision,
    cycle,
    updatedAt: now,
  }

  const filter = existing
    ? { userId: userObjectId, difficulty, ...revisionFilter(existing.revision) }
    : { userId: userObjectId, difficulty }

  try {
    const updated = await col.updateOne(filter, { $set: nextSession }, { upsert: !existing })
    if (existing && updated.matchedCount === 0) {
      throw new Error('CONCURRENT')
    }
  } catch (err) {
    const code = (err as { code?: number }).code
    if (code === 11000) throw new Error('CONCURRENT')
    throw err
  }

  return toResult(clip, roundKey, nextSession, pool.length)
}

export async function applyPlayAction(
  userId: string,
  difficulty: Difficulty,
  roundKey: string,
  action: RoundAction,
): Promise<NextClipResult | null> {
  const db = await getDb()
  const col = db.collection<PlaySessionDoc>('play_sessions')
  const userObjectId = new ObjectId(userId)
  const session = await col.findOne({
    userId: userObjectId,
    difficulty,
    activeRoundKey: roundKey,
  })
  if (!session?.activeMovieId || session.activeRoundKey !== roundKey) return null

  const pool = getClipsForDifficulty(difficulty)
  const clip = pool.find((item) => item.id === session.activeMovieId)
  if (!clip) return null

  const current = session.actions ?? []
  const progress = deriveProgress(current, clip)
  if (progress.finished) {
    return toResult(clip, roundKey, session, pool.length)
  }

  let nextAction: RoundAction
  if (action.type === 'unlock') {
    if (progress.unlockedLevel >= MAX_LEVELS - 1) {
      throw new Error('INVALID_ACTION')
    }
    nextAction = { type: 'unlock' }
  } else if (action.type === 'giveup') {
    if (progress.unlockedLevel !== MAX_LEVELS - 1) {
      throw new Error('INVALID_ACTION')
    }
    nextAction = { type: 'giveup', level: progress.unlockedLevel }
  } else if (action.type === 'guess') {
    const text = action.text.trim()
    if (!text) throw new Error('INVALID_ACTION')
    nextAction = { type: 'guess', text, level: progress.unlockedLevel }
  } else {
    throw new Error('INVALID_ACTION')
  }

  const actions = [...current, nextAction]
  if (!validateRoundActions(actions)) {
    throw new Error('INVALID_ACTION')
  }

  const updated = await col.findOneAndUpdate(
    {
      userId: userObjectId,
      difficulty,
      activeRoundKey: roundKey,
      ...revisionFilter(session.revision),
    },
    {
      $set: {
        actions,
        revision: (session.revision ?? 0) + 1,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  )

  if (!updated) throw new Error('CONCURRENT')
  return toResult(clip, roundKey, updated, pool.length)
}

export async function getActiveRound(
  userId: string,
  difficulty: Difficulty,
  movieId: string,
  roundKey: string,
): Promise<{ session: PlaySessionDoc; clip: MovieClip } | null> {
  const db = await getDb()
  const session = await db.collection<PlaySessionDoc>('play_sessions').findOne({
    userId: new ObjectId(userId),
    difficulty,
  })
  if (!session) return null
  if (session.activeMovieId !== movieId || session.activeRoundKey !== roundKey) return null

  const clip = getClipsForDifficulty(difficulty).find((item) => item.id === movieId)
  if (!clip) return null
  return { session, clip }
}

export function pointsForSession(session: PlaySessionDoc, clip: MovieClip): number | null {
  return computePointsFromActions(session.actions ?? [], clip, checkGuess)
}

export async function clearActiveRound(userId: string, difficulty: Difficulty): Promise<void> {
  const db = await getDb()
  await db.collection<PlaySessionDoc>('play_sessions').updateOne(
    { userId: new ObjectId(userId), difficulty },
    {
      $set: {
        activeMovieId: null,
        activeRoundKey: null,
        actions: [],
        updatedAt: new Date(),
      },
    },
  )
}

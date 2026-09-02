import { ObjectId } from 'mongodb'
import type { Difficulty, RoundAction } from '../../src/types'
import { ensureIndexes, getClient, getDb } from '../_lib/db'
import { findClip } from '../_lib/clips'
import { checkGuess } from '../_lib/guess'
import { getClientIp, methodNotAllowed, readJsonBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http'
import { checkRateLimit } from '../_lib/rateLimit'
import { computePointsFromActions } from '../_lib/scoring'
import { getSessionToken, verifySessionToken } from '../_lib/session'
import { findUserById } from '../_lib/users'

type ScoreRoundBody = {
  roundKey?: unknown
  movieId?: unknown
  difficulty?: unknown
  actions?: unknown
}

const DIFFICULTIES = new Set<Difficulty>(['easy', 'medium', 'hard'])

let indexesReady: Promise<void> | null = null

function ensureReady(): Promise<void> {
  if (!indexesReady) {
    indexesReady = ensureIndexes().catch(() => {})
  }
  return indexesReady
}

function isRoundAction(value: unknown): value is RoundAction {
  if (!value || typeof value !== 'object') return false
  const action = value as Record<string, unknown>

  if (action.type === 'unlock') return true

  if (action.type === 'giveup') {
    return typeof action.level === 'number'
  }

  if (action.type === 'guess') {
    return typeof action.text === 'string' && typeof action.level === 'number'
  }

  return false
}

function parseActions(raw: unknown): RoundAction[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 32) return null
  if (!raw.every(isRoundAction)) return null
  return raw
}

async function loadExistingScore(
  roundKey: string,
  userId: string,
): Promise<{ delta: number; points: number } | null> {
  const db = await getDb()
  const existing = await db.collection<{ userId: ObjectId; delta: number }>('score_events').findOne({
    roundKey,
  })
  if (!existing || existing.userId.toString() !== userId) return null

  const user = await findUserById(userId)
  if (!user) return null

  return {
    delta: existing.delta,
    points: user.points ?? 0,
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST'])
    return
  }

  let roundKey = ''

  try {
    await ensureReady()

    const token = getSessionToken(req)
    if (!token) {
      sendJson(res, 401, { error: 'Sign in to earn points.' })
      return
    }

    const session = await verifySessionToken(token)
    if (!session) {
      sendJson(res, 401, { error: 'Sign in to earn points.' })
      return
    }

    const user = await findUserById(session.sub)
    if (!user) {
      sendJson(res, 401, { error: 'Sign in to earn points.' })
      return
    }

    const ip = getClientIp(req)
    const allowed = await checkRateLimit({
      key: `score:${session.sub}:${ip}`,
      limit: 120,
      windowMs: 15 * 60 * 1000,
    })
    if (!allowed) {
      sendJson(res, 429, { error: 'Too many score updates. Slow down.' })
      return
    }

    const body = await readJsonBody<ScoreRoundBody>(req)
    if (!body) {
      sendJson(res, 400, { error: 'Invalid JSON body' })
      return
    }

    roundKey = typeof body.roundKey === 'string' ? body.roundKey.trim() : ''
    const movieId = typeof body.movieId === 'string' ? body.movieId.trim() : ''
    const difficulty = body.difficulty

    if (!roundKey || roundKey.length > 64) {
      sendJson(res, 400, { error: 'Invalid round key' })
      return
    }

    if (!movieId) {
      sendJson(res, 400, { error: 'Invalid movie id' })
      return
    }

    if (typeof difficulty !== 'string' || !DIFFICULTIES.has(difficulty as Difficulty)) {
      sendJson(res, 400, { error: 'Invalid difficulty' })
      return
    }

    const actions = parseActions(body.actions)
    if (!actions) {
      sendJson(res, 400, { error: 'Invalid round actions' })
      return
    }

    const movie = findClip(movieId, difficulty as Difficulty)
    if (!movie) {
      sendJson(res, 400, { error: 'Unknown movie for this difficulty' })
      return
    }

    const delta = computePointsFromActions(actions, movie, checkGuess)
    if (delta === null) {
      sendJson(res, 400, { error: 'Round actions could not be verified' })
      return
    }

    const replay = await loadExistingScore(roundKey, session.sub)
    if (replay) {
      sendJson(res, 200, replay)
      return
    }

    const client = await getClient()
    const dbName = process.env.MONGODB_DB ?? 'guessthemovie'
    const mongoSession = client.startSession()
    let resultDelta = delta
    let resultPoints = user.points ?? 0

    try {
      await mongoSession.withTransaction(async () => {
        const db = client.db(dbName)
        const events = db.collection('score_events')
        const users = db.collection('users')

        const existing = await events.findOne({ roundKey }, { session: mongoSession })
        if (existing) {
          if (existing.userId.toString() !== session.sub) {
            throw new Error('ROUND_TAKEN')
          }

          resultDelta = existing.delta
          const current = await users.findOne(
            { _id: new ObjectId(session.sub) },
            { session: mongoSession },
          )
          resultPoints = current?.points ?? 0
          return
        }

        await events.insertOne(
          {
            userId: new ObjectId(session.sub),
            roundKey,
            movieId,
            difficulty,
            delta,
            createdAt: new Date(),
          },
          { session: mongoSession },
        )

        const updated = await users.findOneAndUpdate(
          { _id: new ObjectId(session.sub) },
          { $inc: { points: delta } },
          { session: mongoSession, returnDocument: 'after' },
        )

        if (!updated) {
          throw new Error('USER_MISSING')
        }

        resultPoints = updated.points ?? 0
      })
    } finally {
      await mongoSession.endSession()
    }

    sendJson(res, 200, { delta: resultDelta, points: resultPoints })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    const code = (err as { code?: number }).code

    if (message === 'ROUND_TAKEN') {
      sendJson(res, 409, { error: 'Round already scored' })
      return
    }

    if (message === 'USER_MISSING') {
      sendJson(res, 401, { error: 'Sign in to earn points.' })
      return
    }

    if (code === 11000 && roundKey) {
      const session = await verifySessionToken(getSessionToken(req) ?? '')
      if (session) {
        const replay = await loadExistingScore(roundKey, session.sub)
        if (replay) {
          sendJson(res, 200, replay)
          return
        }
      }
      sendJson(res, 409, { error: 'Round already scored' })
      return
    }

    console.error('[score/round]', err)
    sendJson(res, 500, { error: 'Could not save score.' })
  }
}

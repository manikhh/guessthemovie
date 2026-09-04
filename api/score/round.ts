import { ObjectId } from 'mongodb'
import type { Difficulty } from '../../src/types'
import { ensureIndexes, getClient, getDb } from '../_lib/db.js'
import { findClip, toClipReveal } from '../_lib/clips.js'
import { getClientIp, methodNotAllowed, readJsonBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { clearActiveRound, getActiveRound, pointsForSession } from '../_lib/playSession.js'
import { checkRateLimit } from '../_lib/rateLimit.js'
import { getSessionToken, verifySessionToken } from '../_lib/session.js'
import { findUserById } from '../_lib/users.js'

type ScoreRoundBody = {
  roundKey?: unknown
  movieId?: unknown
  difficulty?: unknown
}

const DIFFICULTIES = new Set<Difficulty>(['easy', 'medium', 'hard'])

let indexesReady: Promise<void> | null = null

function ensureReady(): Promise<void> {
  if (!indexesReady) {
    indexesReady = ensureIndexes().catch(() => {})
  }
  return indexesReady
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
  let reveal: { title: string; year: number } | null = null

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

    const movie = findClip(movieId, difficulty as Difficulty)
    reveal = movie ? toClipReveal(movie) : null

    const replay = await loadExistingScore(roundKey, session.sub)
    if (replay) {
      await clearActiveRound(session.sub, difficulty as Difficulty)
      sendJson(res, 200, { ...replay, reveal })
      return
    }

    const active = await getActiveRound(session.sub, difficulty as Difficulty, movieId, roundKey)
    if (!active) {
      sendJson(res, 403, { error: 'This round is no longer active.' })
      return
    }

    const delta = pointsForSession(active.session, active.clip)
    if (delta === null) {
      sendJson(res, 400, { error: 'Finish the round before submitting a score.' })
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

    await clearActiveRound(session.sub, difficulty as Difficulty)

    sendJson(res, 200, {
      delta: resultDelta,
      points: resultPoints,
      reveal: toClipReveal(active.clip),
    })
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
          sendJson(res, 200, {
            ...replay,
            reveal,
          })
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

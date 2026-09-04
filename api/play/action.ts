import { ensureIndexes } from '../_lib/db.js'
import { applyPlayAction } from '../_lib/playSession.js'
import { getClientIp, methodNotAllowed, readJsonBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { checkRateLimit } from '../_lib/rateLimit.js'
import { getSessionToken, verifySessionToken } from '../_lib/session.js'
import type { Difficulty, RoundAction } from '../../src/types.js'

type ActionBody = {
  difficulty?: unknown
  roundKey?: unknown
  action?: unknown
}

const DIFFICULTIES = new Set<Difficulty>(['easy', 'medium', 'hard'])

let indexesReady: Promise<void> | null = null

function ensureReady(): Promise<void> {
  if (!indexesReady) {
    indexesReady = ensureIndexes().catch(() => {})
  }
  return indexesReady
}

function parseAction(raw: unknown): RoundAction | null {
  if (!raw || typeof raw !== 'object') return null
  const action = raw as Record<string, unknown>
  if (action.type === 'unlock') return { type: 'unlock' }
  if (action.type === 'giveup') return { type: 'giveup', level: 0 }
  if (action.type === 'guess' && typeof action.text === 'string') {
    return { type: 'guess', text: action.text, level: 0 }
  }
  return null
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST'])
    return
  }

  try {
    await ensureReady()

    const token = getSessionToken(req)
    if (!token) {
      sendJson(res, 401, { error: 'Sign in to play.' })
      return
    }

    const session = await verifySessionToken(token)
    if (!session) {
      sendJson(res, 401, { error: 'Sign in to play.' })
      return
    }

    const ip = getClientIp(req)
    const allowed = await checkRateLimit({
      key: `play:${session.sub}:${ip}`,
      limit: 180,
      windowMs: 15 * 60 * 1000,
    })
    if (!allowed) {
      sendJson(res, 429, { error: 'Too many requests. Slow down.' })
      return
    }

    const body = await readJsonBody<ActionBody>(req)
    const difficulty = body?.difficulty
    const roundKey = typeof body?.roundKey === 'string' ? body.roundKey.trim() : ''
    const action = parseAction(body?.action)

    if (typeof difficulty !== 'string' || !DIFFICULTIES.has(difficulty as Difficulty)) {
      sendJson(res, 400, { error: 'Invalid difficulty' })
      return
    }

    if (!roundKey || roundKey.length > 64 || !action) {
      sendJson(res, 400, { error: 'Invalid round action' })
      return
    }

    const result = await applyPlayAction(session.sub, difficulty as Difficulty, roundKey, action)
    if (!result) {
      sendJson(res, 403, { error: 'This round is no longer active.' })
      return
    }

    sendJson(res, 200, result)
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_ACTION') {
      sendJson(res, 400, { error: 'That action is not allowed right now.' })
      return
    }
    if (err instanceof Error && err.message === 'CONCURRENT') {
      sendJson(res, 409, { error: 'Round updated elsewhere. Refresh and try again.' })
      return
    }

    console.error('[play/action]', err)
    sendJson(res, 500, { error: 'Could not apply that action.' })
  }
}

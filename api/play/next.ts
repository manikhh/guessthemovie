import { ensureIndexes } from '../_lib/db.js'
import { resolveNextClip } from '../_lib/playSession.js'
import { getClientIp, methodNotAllowed, readJsonBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { checkRateLimit } from '../_lib/rateLimit.js'
import { getSessionToken, verifySessionToken } from '../_lib/session.js'
import type { Difficulty } from '../../src/types.js'

type NextBody = {
  difficulty?: unknown
  advance?: unknown
}

const DIFFICULTIES = new Set<Difficulty>(['easy', 'medium', 'hard'])

let indexesReady: Promise<void> | null = null

function ensureReady(): Promise<void> {
  if (!indexesReady) {
    indexesReady = ensureIndexes().catch(() => {})
  }
  return indexesReady
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

    const body = await readJsonBody<NextBody>(req)
    const difficulty = body?.difficulty
    const advance = body?.advance === true

    if (typeof difficulty !== 'string' || !DIFFICULTIES.has(difficulty as Difficulty)) {
      sendJson(res, 400, { error: 'Invalid difficulty' })
      return
    }

    const result = await resolveNextClip(session.sub, difficulty as Difficulty, advance)

    if (!result) {
      sendJson(res, 404, { error: 'No active round. Request the next clip to continue.' })
      return
    }

    sendJson(res, 200, result)
  } catch (err) {
    if (err instanceof Error && err.message === 'ACTIVE_ROUND') {
      sendJson(res, 409, { error: 'Finish the current round before continuing.' })
      return
    }
    if (err instanceof Error && err.message === 'CONCURRENT') {
      sendJson(res, 409, { error: 'Round updated elsewhere. Refresh and try again.' })
      return
    }

    console.error('[play/next]', err)
    sendJson(res, 500, { error: 'Could not load the next clip.' })
  }
}

import { ensureIndexes } from '../_lib/db.js'
import { getModesProgress } from '../_lib/playSession.js'
import { getClientIp, methodNotAllowed, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { checkRateLimit } from '../_lib/rateLimit.js'
import { getSessionToken, verifySessionToken } from '../_lib/session.js'

let indexesReady: Promise<void> | null = null

function ensureReady(): Promise<void> {
  if (!indexesReady) {
    indexesReady = ensureIndexes().catch(() => {})
  }
  return indexesReady
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET'])
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
      key: `play-progress:${session.sub}:${ip}`,
      limit: 120,
      windowMs: 15 * 60 * 1000,
    })
    if (!allowed) {
      sendJson(res, 429, { error: 'Too many requests. Slow down.' })
      return
    }

    const modes = await getModesProgress(session.sub)
    sendJson(res, 200, { modes })
  } catch (err) {
    console.error('[play/progress]', err)
    sendJson(res, 500, { error: 'Could not load mode progress.' })
  }
}

import { ensureIndexes } from '../_lib/db.js'
import { getClientIp, methodNotAllowed, readJsonBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { checkRateLimit } from '../_lib/rateLimit.js'
import { createSessionToken, setSessionCookie } from '../_lib/session.js'
import { verifyTurnstile } from '../_lib/turnstile.js'
import { findUserByUsername, publicUser, verifyPassword } from '../_lib/users.js'
import { normalizeUsername, validatePassword } from '../_lib/validation.js'

type LoginBody = {
  username?: unknown
  password?: unknown
  turnstileToken?: unknown
}

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

    const ip = getClientIp(req)
    const allowed = await checkRateLimit({
      key: `login:${ip}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    })
    if (!allowed) {
      sendJson(res, 429, { error: 'Too many login attempts. Try again later.' })
      return
    }

    const body = await readJsonBody<LoginBody>(req)
    if (!body) {
      sendJson(res, 400, { error: 'Invalid JSON body' })
      return
    }

    const turnstileOk = await verifyTurnstile(body.turnstileToken, ip)
    if (!turnstileOk) {
      sendJson(res, 400, { error: 'Bot check failed. Please try again.' })
      return
    }

    const username = normalizeUsername(body.username)
    const password = validatePassword(body.password)
    if (!username || !password) {
      sendJson(res, 401, { error: 'Invalid username or password.' })
      return
    }

    const user = await findUserByUsername(username)
    if (!user || !(await verifyPassword(user, password))) {
      sendJson(res, 401, { error: 'Invalid username or password.' })
      return
    }

    const token = await createSessionToken({
      sub: user._id.toString(),
      username: user.username,
    })
    setSessionCookie(res, token)

    sendJson(res, 200, {
      user: publicUser(user),
    })
  } catch (err) {
    console.error('[login]', err)
    sendJson(res, 500, { error: 'Login failed. Please try again.' })
  }
}

import { ensureIndexes } from '../_lib/db.js'
import { getClientIp, methodNotAllowed, readJsonBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { checkRateLimit } from '../_lib/rateLimit.js'
import { createSessionToken, setSessionCookie } from '../_lib/session.js'
import { verifyTurnstile } from '../_lib/turnstile.js'
import { createUser, findUserByUsername, publicUser } from '../_lib/users.js'
import { normalizeUsername, passwordsMatch, validatePassword } from '../_lib/validation.js'

type SignupBody = {
  username?: unknown
  password?: unknown
  repeatPassword?: unknown
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
      key: `signup:${ip}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    })
    if (!allowed) {
      sendJson(res, 429, { error: 'Too many signup attempts. Try again later.' })
      return
    }

    const body = await readJsonBody<SignupBody>(req)
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
    if (!username) {
      sendJson(res, 400, {
        error: 'Username must be 3–32 characters: lowercase letters, numbers, underscore.',
      })
      return
    }

    const password = validatePassword(body.password)
    if (!password) {
      sendJson(res, 400, { error: 'Password must be at least 8 characters.' })
      return
    }

    if (!passwordsMatch(password, body.repeatPassword)) {
      sendJson(res, 400, { error: 'Passwords do not match.' })
      return
    }

    const taken = await findUserByUsername(username)
    if (taken) {
      sendJson(res, 409, { error: 'Username is already taken.' })
      return
    }

    const user = await createUser(username, password)
    const token = await createSessionToken({
      sub: user._id.toString(),
      username: user.username,
    })
    setSessionCookie(res, token)

    sendJson(res, 201, {
      user: publicUser(user),
    })
  } catch (err) {
    const code = (err as { code?: number }).code
    if (code === 11000) {
      sendJson(res, 409, { error: 'Username is already taken.' })
      return
    }

    console.error('[signup]', err)
    sendJson(res, 500, { error: 'Signup failed. Please try again.' })
  }
}

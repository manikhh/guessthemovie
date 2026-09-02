import { methodNotAllowed, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http'
import { getSessionToken, verifySessionToken } from '../_lib/session'
import { findUserById, publicUser } from '../_lib/users'

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET'])
    return
  }

  const token = getSessionToken(req)
  if (!token) {
    sendJson(res, 401, { error: 'Not authenticated' })
    return
  }

  const session = await verifySessionToken(token)
  if (!session) {
    sendJson(res, 401, { error: 'Not authenticated' })
    return
  }

  const user = await findUserById(session.sub)
  if (!user) {
    sendJson(res, 401, { error: 'Not authenticated' })
    return
  }

  sendJson(res, 200, {
    user: publicUser(user),
  })
}

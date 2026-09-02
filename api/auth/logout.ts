import { methodNotAllowed, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http'
import { clearSessionCookie } from '../_lib/session'

export default function handler(req: ApiRequest, res: ApiResponse): void {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST'])
    return
  }

  clearSessionCookie(res)
  sendJson(res, 200, { ok: true })
}

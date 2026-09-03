import { SignJWT, jwtVerify } from 'jose'
import type { ApiRequest, ApiResponse } from './http.js'

const COOKIE_NAME = 'session'
const MAX_AGE_SEC = 60 * 60 * 24 * 7

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

export type SessionPayload = {
  sub: string
  username: string
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const sub = payload.sub
    const username = payload.username
    if (typeof sub !== 'string' || typeof username !== 'string') return null
    return { sub, username }
  } catch {
    return null
  }
}

function parseCookies(req: ApiRequest): Record<string, string> {
  const header = req.headers.cookie
  if (!header) return {}

  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=')
    if (!rawKey) return acc
    acc[rawKey] = decodeURIComponent(rest.join('='))
    return acc
  }, {})
}

export function getSessionToken(req: ApiRequest): string | null {
  return parseCookies(req)[COOKIE_NAME] ?? null
}

export function setSessionCookie(res: ApiResponse, token: string): void {
  const secure = process.env.NODE_ENV === 'production'
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${MAX_AGE_SEC}`,
    'SameSite=Lax',
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearSessionCookie(res: ApiResponse): void {
  const secure = process.env.NODE_ENV === 'production'
  const parts = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax',
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

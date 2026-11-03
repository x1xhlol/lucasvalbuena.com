import { createHmac, timingSafeEqual } from 'node:crypto'
import { CONFIRM_TTL_MS } from '@/lib/newsletter/config'

const PURPOSE = 'newsletter-confirm:v1'

type Payload = { e: string; x: number }

function sign(body: string, secret: string) {
  return createHmac('sha256', secret).update(`${PURPOSE}.${body}`).digest('base64url')
}

export function createConfirmToken(email: string, secret: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ e: email, x: now + CONFIRM_TTL_MS } satisfies Payload)).toString('base64url')
  return `${body}.${sign(body, secret)}`
}

export type TokenCheck = { ok: true; email: string } | { ok: false; reason: 'invalid' | 'expired' }

export function verifyConfirmToken(token: unknown, secret: string, now = Date.now()): TokenCheck {
  if (typeof token !== 'string' || token.length > 2048) return { ok: false, reason: 'invalid' }
  const [body, signature, extra] = token.split('.')
  if (!body || !signature || extra !== undefined) return { ok: false, reason: 'invalid' }

  const expected = Buffer.from(sign(body, secret))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: 'invalid' }

  let payload: Payload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return { ok: false, reason: 'invalid' }
  }
  if (typeof payload?.e !== 'string' || typeof payload?.x !== 'number') return { ok: false, reason: 'invalid' }
  if (payload.x < now) return { ok: false, reason: 'expired' }
  return { ok: true, email: payload.e }
}

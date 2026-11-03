export const NEWSLETTER_ENABLED = process.env.NEXT_PUBLIC_NEWSLETTER_ENABLED === '1'

export const NEWSLETTER_FROM_DEFAULT = 'Lucas Valbuena <hi@lucasvalbuena.com>'

export const CONFIRM_TTL_MS = 48 * 60 * 60 * 1000

export const SEND_DELAY = 'in 10 min'

export const MAX_EMAIL_LENGTH = 254

export type NewsletterErrorCode = 'invalid_email' | 'unavailable' | 'failed'

export function newsletterEnv() {
  const apiKey = process.env.RESEND_API_KEY
  const segmentId = process.env.RESEND_NEWSLETTER_SEGMENT_ID
  const secret = process.env.NEWSLETTER_SECRET
  if (!apiKey || !segmentId || !secret) return null
  return {
    apiKey,
    segmentId,
    secret,
    from: process.env.NEWSLETTER_FROM || NEWSLETTER_FROM_DEFAULT,
    replyTo: process.env.NEWSLETTER_REPLY_TO || undefined,
    testTo: process.env.NEWSLETTER_TEST_TO || undefined,
  }
}

export type NewsletterEnv = NonNullable<ReturnType<typeof newsletterEnv>>

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null
}

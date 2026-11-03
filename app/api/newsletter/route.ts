import { newsletterEnv, normalizeEmail, type NewsletterErrorCode } from '@/lib/newsletter/config'
import { sendConfirmation } from '@/lib/newsletter/send'

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(request: Request) {
  const env = newsletterEnv()
  if (!env) return json({ error: 'unavailable' satisfies NewsletterErrorCode }, 503)

  let body: { email?: unknown; company?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_email' satisfies NewsletterErrorCode }, 400)
  }

  if (typeof body.company === 'string' && body.company.trim() !== '') return json({ ok: true })

  const email = normalizeEmail(body.email)
  if (!email) return json({ error: 'invalid_email' satisfies NewsletterErrorCode }, 400)

  const result = await sendConfirmation(env, email)
  if (!result.ok) {
    console.error('[newsletter] confirmation email failed:', result.error)
    return json({ error: 'failed' satisfies NewsletterErrorCode }, 502)
  }
  return json({ ok: true })
}

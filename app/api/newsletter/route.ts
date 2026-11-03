import { newsletterEnv, normalizeEmail, type NewsletterErrorCode } from '@/lib/newsletter/config'
import { sendConfirmation } from '@/lib/newsletter/send'

// Starts a signup by emailing a confirmation link. The answer is the same
// whether or not the address is already subscribed, so the form can't be
// used to find out who is on the list.
//
// Rate limiting happens before this runs, in the Vercel Firewall rule
// "Newsletter rate limit" (see AGENTS.md).

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

  // A field people never see. Anything that fills it in is a bot; it gets
  // the normal answer and nothing is sent.
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

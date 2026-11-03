'use server'

import { redirect } from 'next/navigation'
import { newsletterEnv } from '@/lib/newsletter/config'
import { verifyConfirmToken } from '@/lib/newsletter/token'
import { subscribe } from '@/lib/newsletter/send'

export async function confirmSubscription(formData: FormData) {
  const token = formData.get('t')
  const env = newsletterEnv()
  const back = `/newsletter/confirm?t=${encodeURIComponent(String(token ?? ''))}`
  if (!env) redirect(`${back}&error=1`)

  const check = verifyConfirmToken(token, env.secret)
  if (!check.ok) redirect(back)

  const result = await subscribe(env, check.email)
  if (!result.ok) {
    console.error('[newsletter] subscribe failed:', result.error)
    redirect(`${back}&error=1`)
  }
  redirect('/blog?subscribed=1')
}

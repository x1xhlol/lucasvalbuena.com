import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { NewsletterConfirmButton } from '@/components/newsletter-confirm-button'
import { newsletterEnv } from '@/lib/newsletter/config'
import { verifyConfirmToken } from '@/lib/newsletter/token'
import { confirmSubscription } from './actions'

export const metadata: Metadata = {
  title: 'Confirm your subscription | Lucas Valbuena',
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<{ t?: string | string[]; error?: string }> }

const LINK =
  'inline-flex min-h-11 items-center text-foreground underline underline-offset-[5px] decoration-muted-foreground/65 transition-[text-decoration-color] duration-150 hover:decoration-foreground'

export default async function ConfirmPage({ searchParams }: Props) {
  const { t, error } = await searchParams
  const token = typeof t === 'string' ? t : ''
  const env = newsletterEnv()
  const check = env ? verifyConfirmToken(token, env.secret) : null

  let title: string
  let body: React.ReactNode
  if (!check) {
    title = 'Email signup is off for now'
    body = <p>New posts are still on the <Link href="/blog" className={LINK}>blog</Link> and in the <a href="/blog/rss.xml" className={LINK}>RSS feed</a>.</p>
  } else if (!check.ok) {
    title = check.reason === 'expired' ? 'This link has expired' : "This link doesn't work"
    body = (
      <p>
        {check.reason === 'expired' ? 'Confirmation links last 48 hours.' : 'It may have been cut off when it was copied.'}{' '}
        <Link href="/blog#newsletter" className={LINK}>Sign up again</Link> and a new one will arrive.
      </p>
    )
  } else {
    title = 'Confirm your subscription'
    body = (
      <>
        <p>
          You&apos;ll get one short email at <span className="text-foreground">{check.email}</span> whenever a new post goes up,
          and every one of them has an unsubscribe link.
        </p>
        <form action={confirmSubscription} className="mt-6">
          <input type="hidden" name="t" value={token} />
          <NewsletterConfirmButton />
        </form>
        {error && (
          <p role="alert" className="mt-4 text-destructive">
            That didn&apos;t go through. Try again in a moment.
          </p>
        )}
      </>
    )
  }

  return (
    <div className="relative min-h-screen">
      <Navigation />
      <main id="main-content" tabIndex={-1} className="pt-32 pb-24">
        <div className="mx-auto max-w-2xl px-6">
          <h1 className="text-base font-medium text-foreground">{title}</h1>
          <div className="mt-1.5 text-base leading-relaxed text-muted-foreground text-pretty">{body}</div>
        </div>
      </main>
    </div>
  )
}

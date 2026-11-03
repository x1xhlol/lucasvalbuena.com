import type { Metadata } from 'next'
import { Navigation } from '@/components/navigation'
import { CONTACT_EMAIL } from '@/lib/contact'
import { ASK_ENABLED } from '@/lib/ask/protocol'
import { NEWSLETTER_ENABLED } from '@/lib/newsletter/config'

export const metadata: Metadata = {
  title: 'Privacy | Lucas Valbuena',
  description: 'What this site collects, where it goes, and how to have it deleted.',
  alternates: { canonical: '/privacy' },
}

const LINK =
  'text-foreground underline underline-offset-[5px] decoration-muted-foreground/65 transition-[text-decoration-color] duration-150 hover:decoration-foreground'

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-base font-medium text-foreground">{title}</h2>
      <div className="mt-1.5 space-y-3 text-base leading-relaxed text-muted-foreground text-pretty">{children}</div>
    </section>
  )
}

// Keep this in step with what the site actually does: lib/newsletter for
// email, app/api/ask/route.ts for Ask, and the Analytics component in the
// root layout
export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen">
      <Navigation />
      <main id="main-content" tabIndex={-1} className="pt-32 pb-24">
        <div className="mx-auto max-w-2xl px-6">
          <h1 className="text-base font-medium text-foreground">Privacy</h1>
          <p className="mt-1.5 text-base leading-relaxed text-muted-foreground text-pretty">
            This is a personal site run by Lucas Valbuena. It collects as little as it can, and nothing is sold or shared
            for advertising.
          </p>

          {NEWSLETTER_ENABLED && (
            <Block title="New posts by email">
              <p>
                If you sign up, your email address is used for one thing: a short email whenever a new post goes up. It
                isn&apos;t stored anywhere until you confirm the link sent to you, so an unconfirmed signup leaves nothing
                behind.
              </p>
              <p>
                Confirmed addresses are kept by{' '}
                <a href="https://resend.com/legal/privacy-policy" className={LINK}>Resend</a>, the service that sends the
                emails, under a data processing agreement. Resend is based in the United States and certified under the
                EU-U.S. Data Privacy Framework. Your address stays there until you unsubscribe, which every email lets you
                do in one click. Opens and clicks aren&apos;t tracked.
              </p>
            </Block>
          )}

          {ASK_ENABLED && (
            <Block title="Ask">
              <p>
                Questions asked on the Ask page, and the answers, are sent to an AI model to write the reply and saved so
                Lucas can see what people ask. No IP address or anything else that identifies you is saved with them.
                Don&apos;t put personal details in a question.
              </p>
            </Block>
          )}

          <Block title="Analytics">
            <p>
              Page views are counted with Vercel Web Analytics, which doesn&apos;t use cookies or follow you across
              other sites.
            </p>
          </Block>

          <Block title="Your data">
            <p>
              To see or delete anything held about you, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>{CONTACT_EMAIL}</a>. If you&apos;re in the EU and
              aren&apos;t happy with the answer, you can complain to your data protection authority; in Spain that&apos;s
              the AEPD.
            </p>
          </Block>
        </div>
      </main>
    </div>
  )
}

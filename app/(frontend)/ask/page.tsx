import type { Metadata } from 'next'
import { Navigation } from '@/components/navigation'
import { AskChat } from '@/components/ask-chat'
import { AskLock } from '@/components/ask-lock'
import { AskViewport } from '@/components/ask-viewport'
import { getAskCardData } from '@/lib/ask/card-data'
import { MAX_QUESTION_LENGTH } from '@/lib/ask/protocol'

export const metadata: Metadata = {
  title: 'Ask | Lucas Valbuena',
  description: 'Ask the lock on my site about my work.',
  alternates: {
    canonical: '/ask',
  },
}

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const { q } = await searchParams
  // The command palette hands its query over as ?q=
  const initialQuestion =
    typeof q === 'string' ? q.trim().slice(0, MAX_QUESTION_LENGTH) || null : null
  const available = Boolean(process.env.OPENROUTER_API_KEY)
  // Not awaited: the page renders right away and the stars, posts, and
  // photos the lock's cards show stream in behind it
  const cardData = available ? getAskCardData() : null

  // The lock lines up with the title row even when the line under it wraps.
  // The chat places it beside its "New chat" button.
  const header = (
    <header className="flex min-w-0 items-start gap-3">
      <AskLock />
      <div>
        <h1 className="text-base font-medium text-foreground">Ask</h1>
        {/* The lock does the talking on this page, so it speaks in its own
            lowercase voice */}
        {/* Hidden while a phone keyboard is up, when every line counts */}
        <p className="text-base text-muted-foreground [html[data-keyboard]_&]:hidden">
          ask me about Lucas. i know what&apos;s on this site, and not much else
        </p>
      </div>
    </header>
  )

  return (
    <>
      <Navigation />
      <AskViewport />
      {/* A fixed shell the size of the visible screen: the header and composer
          stay put and only the conversation between them scrolls. The page
          behind it can't scroll at all (see [data-ask-shell] in globals.css),
          so a swipe never drags the whole chat. The top gap shrinks on short
          screens (a phone on its side) and while a keyboard is up. */}
      <main
        id="main-content"
        tabIndex={-1}
        data-ask-shell
        className="fixed inset-x-0 top-[var(--ask-offset,0px)] mx-auto flex h-[var(--ask-height,100dvh)] max-w-2xl flex-col px-6 [container-type:size] pt-20 md:pt-[clamp(5rem,14dvh,8rem)] [html[data-keyboard]_&]:pt-[4.5rem]"
      >
        {available ? (
          <AskChat header={header} initialQuestion={initialQuestion} cardData={cardData} />
        ) : (
          <>
            <div className="shrink-0">{header}</div>
            <p className="mt-10 pb-24 text-base text-muted-foreground">
              Ask is offline right now. You can email me at{' '}
              <a
                href="mailto:lucasvalbuena@pm.me"
                className="font-medium text-foreground underline underline-offset-[5px] decoration-muted-foreground/65 hover:decoration-foreground transition-colors"
              >
                lucasvalbuena@pm.me
              </a>
              .
            </p>
          </>
        )}
      </main>
    </>
  )
}

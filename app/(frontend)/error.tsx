'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Navigation } from '@/components/navigation'

export default function PageError({ retry }: { retry: () => void }) {
  return (
    <>
      <Navigation />
      <main id="main-content" tabIndex={-1} className="flex min-h-dvh items-center px-6 py-24">
        <div className="mx-auto w-full max-w-xl space-y-4">
          <h1 className="text-xl font-medium text-foreground">This page could not be loaded.</h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Try loading it again, or head back to the portfolio.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={retry}>Try again</Button>
            <Button variant="ghost" asChild><Link href="/">Back to the portfolio</Link></Button>
          </div>
        </div>
      </main>
    </>
  )
}

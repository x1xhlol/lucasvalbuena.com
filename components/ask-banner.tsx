import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function AskBanner() {
  return (
    // Same height as the nav row, whose menu (mobile) and search (tablet)
    // buttons rest in this bar on the home page; the right padding keeps the
    // Ask pill clear of the mobile menu button
    <div className="h-14 bg-muted md:h-16">
      <div className="mx-auto flex h-full w-full max-w-[38rem] items-center justify-between gap-4 px-6 max-md:pr-[4.25rem] md:relative md:-left-2.5">
        <p className="text-sm font-medium text-foreground">Questions about my work?</p>
        <Link
          href="/ask"
          className="group touch-target relative inline-flex h-8 items-center gap-0.5 rounded-full bg-background pl-3.5 pr-2.5 text-sm font-medium text-foreground shadow-raised transition-[scale] duration-150 ease-out motion-safe:active:scale-[0.97]"
        >
          Ask
          <ChevronRight
            aria-hidden
            className="size-3.5 text-muted-foreground transition-transform duration-150 ease-out motion-safe:pointer-fine:group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </div>
  )
}

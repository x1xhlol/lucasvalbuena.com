'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { openCommandPalette } from '@/components/command-palette'
import { PixelClock } from '@/components/pixel-clock'
import { Fact } from '@/components/fact'
import { SkyPopover } from '@/components/sky-popover'

const links = [
  { href: '/blog', label: 'Writing' },
  { href: '/photos', label: 'Photos' },
]

// The home page carries no desktop nav bar, so its page links live in a quiet
// fixed rail on the right edge instead. Mobile keeps the drawer.
export function SideNav() {
  const [isMac, setIsMac] = useState(true)

  useEffect(() => {
    setIsMac(!/windows|linux/i.test(navigator.userAgent))
  }, [])

  return (
    <nav
      aria-label="Pages"
      className="fixed right-[max(1.5rem,calc((100vw_-_38rem)/2_-_7rem))] top-[6.5rem] z-40 hidden flex-col items-end border-r border-border pr-3 lg:flex"
    >
      <Fact
        label="Local time in Spain"
        className="-mr-1.5 mb-1 inline-flex size-11 items-center justify-center text-muted-foreground transition-colors duration-150 hover:text-foreground"
        detail={<SkyPopover />}
      >
        <PixelClock />
      </Fact>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex min-h-10 min-w-10 items-center justify-end text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground rounded-sm"
        >
          {link.label}
        </Link>
      ))}
      <button
        type="button"
        onClick={openCommandPalette}
        aria-label="Open command palette"
        className="group inline-flex min-h-10 min-w-10 items-center justify-end text-muted-foreground transition-colors duration-150 hover:text-foreground rounded-sm"
      >
        <kbd className="rounded border border-border/70 px-1 font-mono text-xs text-muted-foreground transition-colors duration-150 group-hover:text-foreground">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>
    </nav>
  )
}

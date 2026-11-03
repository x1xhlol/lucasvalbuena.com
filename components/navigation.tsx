'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Menu, Search } from 'lucide-react'
import { openCommandPalette } from '@/components/command-palette'
import { Drawer } from 'vaul'
import { ASK_ENABLED } from '@/lib/ask/protocol'

// Matches rounded-full on the nav links
const INDICATOR_HIDDEN_CLIP = 'inset(0 100% 0 0 round 999px)'

export function Navigation({
  isHome = false,
  hasBanner = false,
}: {
  isHome?: boolean
  // With the home page's Ask banner, the menu (mobile) and search (tablet)
  // buttons rest in the banner's row instead of on the hero title's
  hasBanner?: boolean
}) {
  const [isScrolled, setIsScrolled] = useState(false)
  // On the mobile home page the search icon rests on the hero title's row and
  // docks up into the bar as soon as the page scrolls, so it always relates to
  // something: the title at rest, the bar in motion.
  const [isDocked, setIsDocked] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  // The home page carries no desktop chrome: its section links live in the page
  // itself. Interior pages keep the bar, since it is their only way back.
  // isHome comes from the home page rather than the pathname: Vercel's ISR
  // revalidation renders / under a different pathname, which baked the pill
  // bar into the cached HTML until hydration removed it.
  const desktopRowRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const indicatorReadyRef = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
      setIsDocked(window.scrollY > 8)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const prefix = isHome ? '' : '/'
  const sectionLinks = [
    { href: `${prefix}#home`, label: 'Home' },
    { href: `${prefix}#experience`, label: 'Experience' },
    { href: `${prefix}#projects`, label: 'Projects' },
    { href: `${prefix}#contact`, label: 'Contact' },
  ]
  const pageLinks = [
    { href: '/blog', label: 'Writing' },
    { href: '/photos', label: 'Photos' },
    ...(ASK_ENABLED ? [{ href: '/ask', label: 'Ask' }] : []),
  ]
  // The pill bar stays minimal: just the pages. Section anchors remain
  // available in the mobile drawer.
  const pillLinks = [{ href: `${prefix}#home`, label: 'Home' }, ...pageLinks]

  const activeHref =
    pillLinks.find((link) => pathname.startsWith(link.href))?.href ?? null

  // Slide the clipped pill to the active link. The first placement (and any
  // resize/font reflow) snaps without animating; only active-link changes slide.
  useLayoutEffect(() => {
    const row = desktopRowRef.current
    const indicator = indicatorRef.current
    if (!row || !indicator) return

    const place = (animated: boolean) => {
      const active = row.querySelector<HTMLElement>('a[data-active="true"]')
      let clip = INDICATOR_HIDDEN_CLIP
      if (active) {
        // Accumulate layout offsets up to the row rather than reading client
        // rects: rects are distorted while the links play their entry
        // animation, which froze the pill slightly off-center on page load.
        // The inset-0 indicator shares the row's padding box, so these
        // offsets land in the indicator's own frame.
        let top = 0
        let left = 0
        for (
          let el: HTMLElement | null = active;
          el && el !== row;
          el = el.offsetParent instanceof HTMLElement ? el.offsetParent : null
        ) {
          top += el.offsetTop
          left += el.offsetLeft
        }
        const right = indicator.offsetWidth - left - active.offsetWidth
        const bottom = indicator.offsetHeight - top - active.offsetHeight
        clip = `inset(${top}px ${right}px ${bottom}px ${left}px round 999px)`
      }
      if (animated) {
        indicator.style.clipPath = clip
      } else {
        indicator.style.transition = 'none'
        indicator.style.clipPath = clip
        void indicator.offsetWidth
        indicator.style.transition = ''
      }
    }

    place(indicatorReadyRef.current)
    indicatorReadyRef.current = true

    // Re-snap when the row reflows (webfont swap, resize). Comparing widths
    // ignores the observe-time callback so it can't stomp an in-flight slide.
    let lastWidth: number | null = null
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? lastWidth
      if (width === lastWidth) return
      const isFirst = lastWidth === null
      lastWidth = width
      if (isFirst) return
      place(false)
    })
    observer.observe(row)
    return () => observer.disconnect()
  }, [activeHref])

  return (
    // The bar spans the whole width but is see-through until the page
    // scrolls, so it lets taps through to what's under it (the home page's
    // Ask pill sits right there on phones); its own links and buttons still
    // take them. Once it has a background on phones, it blocks as a bar should.
    <nav
      aria-label="Main navigation"
      className={`pointer-events-none fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ease-out [&_a]:pointer-events-auto [&_button]:pointer-events-auto ${
        isScrolled ? 'max-md:pointer-events-auto' : ''
      } ${
        isHome ? 'lg:hidden' : ''
      } ${
        isScrolled
          ? 'max-md:bg-background/70 max-md:backdrop-blur-xl max-md:border-b max-md:border-border/50 reduce-transparency:max-md:bg-background reduce-transparency:max-md:backdrop-blur-none'
          : ''
      }`}
    >
      <div className="mx-auto max-w-5xl px-6 md:px-12">
        <div className={`flex items-center justify-end h-14 md:h-16 ${isHome && hasBanner ? '' : 'md:justify-center'}`}>
          {/* Home has no desktop bar at all, so this row would only ever be
              display:none there. Not rendering it keeps the dead links out of
              the markup. */}
          {!isHome && (
          <div
            ref={desktopRowRef}
            className="relative hidden md:flex items-center gap-0.5 mt-3 h-12 rounded-full border border-border/60 bg-background/70 backdrop-blur-xl reduce-transparency:bg-background reduce-transparency:backdrop-blur-none px-1"
          >
            {pillLinks.map((link) => {
              const isActive = link.href === activeHref
              const LinkTag = link.href.includes('#') ? 'a' : Link
              return (
                <div key={link.href}>
                  <LinkTag
                    href={link.href}
                    data-active={isActive || undefined}
                    aria-current={isActive ? 'location' : undefined}
                    className={`inline-flex items-center h-10 px-3 rounded-full text-xs font-medium hover:text-foreground hover:bg-muted/60 transition-colors duration-150 ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {link.label}
                  </LinkTag>
                </div>
              )
            })}
            {/* Inverted copy of the link row, clipped to a pill over the active
                link. Sliding the clip window moves the pill between links and
                swaps the label color mid-glyph as it passes. */}
            <div
              ref={indicatorRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 flex items-center gap-0.5 px-1 bg-foreground transition-[clip-path] duration-[250ms] ease-in-out motion-reduce:transition-none"
              style={{ clipPath: INDICATOR_HIDDEN_CLIP }}
            >
              {pillLinks.map((link) => (
                <span
                  key={link.href}
                  className="inline-flex items-center h-10 px-3 text-xs font-medium text-background"
                >
                  {link.label}
                </span>
              ))}
            </div>
          </div>
          )}

          <button
            type="button"
            aria-label="Open command palette"
            onClick={openCommandPalette}
            className={`touch-target relative hidden md:inline-flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-[color,background-color,scale] duration-150 ease-out motion-safe:active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 ${
              isHome ? '' : 'md:mt-3 md:ml-1.5 md:rounded-full md:border md:border-border/60 md:bg-background/70 md:backdrop-blur-xl md:h-10 md:w-10 reduce-transparency:md:bg-background reduce-transparency:md:backdrop-blur-none'
            }`}
          >
            <Search className="h-4 w-4" />
          </button>

          <Drawer.Root open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <Drawer.Trigger asChild>
              <button
                type="button"
                aria-label="Open navigation menu"
                className={`md:hidden touch-target relative inline-flex items-center justify-center h-9 w-9 -mr-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-[color,background-color,scale] duration-150 ease-out motion-safe:active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 ${
                  isHome && !isDocked && !hasBanner ? 'max-md:translate-y-[52px]' : ''
                } max-md:transition-transform max-md:duration-300 max-md:ease-out motion-reduce:max-md:transition-none`}
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="motion-drawer-overlay md:hidden fixed inset-0 z-50 bg-scrim backdrop-blur-[12px] backdrop-saturate-[1.2] reduce-transparency:bg-black/40 reduce-transparency:backdrop-blur-none" />
              <Drawer.Content
                aria-describedby={undefined}
                className="motion-drawer md:hidden fixed inset-x-0 bottom-0 z-50 max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-t-[28px] bg-panel shadow-panel outline-none"
              >
                <Drawer.Title className="sr-only">Navigation menu</Drawer.Title>
                <div
                  aria-hidden
                  className="mx-auto mt-3 h-1 w-9 rounded-full bg-muted-foreground/25"
                />
                <div className="px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  <ul className="flex flex-col">
                    {sectionLinks.map((link) => (
                      <li key={link.href}>
                        <Drawer.Close asChild>
                          <a
                            href={link.href}
                            className="flex items-center w-full h-12 px-3 rounded-xl text-[15px] font-medium text-foreground hover:bg-muted/60 active:bg-muted transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                          >
                            {link.label}
                          </a>
                        </Drawer.Close>
                      </li>
                    ))}
                  </ul>
                  <div className="my-2 border-t border-border/70" aria-hidden />
                  <ul className="flex flex-col">
                    {pageLinks.map((link) => (
                      <li key={link.href}>
                        <Drawer.Close asChild>
                          <Link
                            href={link.href}
                            className="group flex items-center justify-between w-full h-12 px-3 rounded-xl text-[15px] font-medium text-foreground hover:bg-muted/60 active:bg-muted transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                          >
                            <span>{link.label}</span>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground/70 transition-transform duration-150 motion-safe:pointer-fine:group-hover:translate-x-0.5 motion-safe:pointer-fine:group-hover:-translate-y-0.5" />
                          </Link>
                        </Drawer.Close>
                      </li>
                    ))}
                  </ul>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </div>
      </div>
    </nav>
  )
}

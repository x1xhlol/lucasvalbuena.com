'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Menu } from 'lucide-react'
import { Drawer } from 'vaul'

// #blog is deliberately not observed: the /blog page link sits after Contact
// in the row, and highlighting it mid-scroll would slide the pill past Contact
// and back. Stack stays lit until Contact takes over.
const SECTION_IDS = ['home', 'projects', 'skills', 'stack', 'contact']

// Matches rounded-lg on the nav links (--radius + 4px)
const INDICATOR_HIDDEN_CLIP = 'inset(0 100% 0 0 round 12px)'

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const pathname = usePathname()
  const isHome = pathname === '/'
  const desktopRowRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const indicatorReadyRef = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!isHome) return

    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    )

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      // Narrow band around the viewport middle so only one section matches at a time
      { rootMargin: '-45% 0px -50% 0px' },
    )
    sections.forEach((el) => observer.observe(el))

    const handleScroll = () => {
      // The last section is too short to ever reach the middle band
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 8
      if (atBottom) setActiveSection('contact')
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [isHome])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const prefix = isHome ? '' : '/'
  const sectionLinks = [
    { href: `${prefix}#home`, label: 'Home' },
    { href: `${prefix}#projects`, label: 'Projects' },
    { href: `${prefix}#skills`, label: 'Skills' },
    { href: `${prefix}#stack`, label: 'Stack' },
    { href: `${prefix}#contact`, label: 'Contact' },
  ]
  const pageLinks = [
    { href: '/blog', label: 'Blog' },
    { href: '/photos', label: 'Photos' },
  ]
  const navLinks = [...sectionLinks, ...pageLinks]

  const activeHref = isHome
    ? `#${activeSection}`
    : (navLinks.find((link) => pathname.startsWith(link.href))?.href ?? null)

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
        const rowRect = row.getBoundingClientRect()
        const rect = active.getBoundingClientRect()
        clip = `inset(0 ${rowRect.right - rect.right}px 0 ${rect.left - rowRect.left}px round 12px)`
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
    let lastWidth = row.getBoundingClientRect().width
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? lastWidth
      if (width === lastWidth) return
      lastWidth = width
      place(false)
    })
    observer.observe(row)
    return () => observer.disconnect()
  }, [activeHref])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 animate-navbar-entry ${
        isScrolled
          ? 'bg-background/70 backdrop-blur-xl border-b border-border/50'
          : 'md:bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-5xl px-6 md:px-12">
        <div className="flex items-center justify-end md:justify-center h-14">
          <div
            ref={desktopRowRef}
            className="relative hidden md:flex items-center gap-0.5"
          >
            {navLinks.map((link, index) => {
              const isActive = link.href === activeHref
              return (
                <div
                  key={link.href}
                  className="animate-link-entry"
                  style={{ animationDelay: `${0.08 + index * 0.03}s` }}
                >
                  <a
                    href={link.href}
                    data-active={isActive || undefined}
                    aria-current={isActive ? 'location' : undefined}
                    className={`inline-flex items-center h-8 px-3 rounded-lg text-xs font-medium hover:text-foreground hover:bg-muted/60 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {link.label}
                  </a>
                </div>
              )
            })}
            {/* Inverted copy of the link row, clipped to a pill over the active
                link. Sliding the clip window moves the pill between links and
                swaps the label color mid-glyph as it passes. */}
            <div
              ref={indicatorRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 flex items-center gap-0.5 bg-foreground transition-[clip-path] duration-[350ms] ease-in-out motion-reduce:transition-none"
              style={{ clipPath: INDICATOR_HIDDEN_CLIP }}
            >
              {navLinks.map((link) => (
                <span
                  key={link.href}
                  className="inline-flex items-center h-8 px-3 text-xs font-medium text-background"
                >
                  {link.label}
                </span>
              ))}
            </div>
          </div>

          <Drawer.Root open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <Drawer.Trigger asChild>
              <button
                type="button"
                aria-label="Open navigation menu"
                className="md:hidden inline-flex items-center justify-center h-9 w-9 -mr-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="md:hidden fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" />
              <Drawer.Content
                aria-describedby={undefined}
                className="md:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-[20px] border-t border-border bg-background outline-none"
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
                          <a
                            href={link.href}
                            className="group flex items-center justify-between w-full h-12 px-3 rounded-xl text-[15px] font-medium text-foreground hover:bg-muted/60 active:bg-muted transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                          >
                            <span>{link.label}</span>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground/70 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </a>
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

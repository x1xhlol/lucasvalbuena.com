'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === '/'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
    }
  }, [isMobileMenuOpen])

  const prefix = isHome ? '' : '/'
  const navLinks = [
    { href: `${prefix}#home`, label: 'Home' },
    { href: `${prefix}#projects`, label: 'Projects' },
    { href: `${prefix}#skills`, label: 'Skills' },
    { href: `${prefix}#stack`, label: 'Stack' },
    { href: `${prefix}#contact`, label: 'Contact' },
    { href: '/blog', label: 'Blog' },
    { href: '/photos', label: 'Photos' },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 animate-navbar-entry ${
        isScrolled || isMobileMenuOpen
          ? 'bg-background/70 backdrop-blur-xl border-b border-border/50'
          : 'md:bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-5xl px-6 md:px-12">
        <div className="flex items-center justify-end md:justify-center h-14">
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link, index) => (
              <div
                key={link.href}
                className="animate-link-entry"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <a
                  href={link.href}
                  className="inline-flex items-center h-8 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                >
                  {link.label}
                </a>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-menu"
            className="md:hidden inline-flex items-center justify-center h-9 w-9 -mr-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          >
            {isMobileMenuOpen ? (
              <X className="h-[18px] w-[18px]" />
            ) : (
              <Menu className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </div>

      <div
        id="mobile-navigation-menu"
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out ${
          isMobileMenuOpen ? 'max-h-[28rem] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mx-auto max-w-5xl px-4 pt-1 pb-3">
          <ul className="flex flex-col">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center w-full h-10 px-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 active:bg-muted transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  )
}

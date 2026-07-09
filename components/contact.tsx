'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { ThemeSwitcher } from '@/components/ui/theme-switcher'
import { PixelLock } from '@/components/pixel-lock'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_OUT as ease } from '@/lib/motion'
const themes = ['light', 'dark', 'system'] as const
type ThemeName = (typeof themes)[number]

function isThemeName(theme: string | undefined): theme is ThemeName {
  return themes.includes(theme as ThemeName)
}

const swap = {
  y: { type: 'spring', stiffness: 520, damping: 32, mass: 0.7 },
  scale: { type: 'spring', stiffness: 520, damping: 32, mass: 0.7 },
  opacity: { duration: 0.16, ease },
  filter: { duration: 0.16, ease },
} as const

function CheckDraw() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden>
      <motion.path
        d="M2.75 8.75l3.5 3.5 7-8.5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { delay: 0.1, duration: 0.28, ease },
          opacity: { delay: 0.1, duration: 0.1 },
        }}
      />
    </svg>
  )
}

function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)
  const [copyCount, setCopyCount] = useState(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  const onClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      e.preventDefault()
      try {
        await navigator.clipboard.writeText(email)
        setCopied(true)
        setCopyCount((count) => count + 1)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => setCopied(false), 1200)
      } catch {
        // fall through to default mailto: behavior
      }
    }
  }

  return (
    <motion.a
      href={`mailto:${email}`}
      onClick={onClick}
      aria-label={`Copy email address ${email}`}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.1, ease }}
      className="copy-email group relative inline-flex items-baseline align-baseline text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 rounded-sm"
    >
      <span className="whitespace-nowrap underline underline-offset-[5px] decoration-muted-foreground/65 group-hover:decoration-foreground transition-colors">
        {email}
      </span>
      <span
        aria-hidden
        className="email-fill pointer-events-none absolute inset-0 flex items-baseline justify-center"
      >
        <span className="whitespace-nowrap rounded-[2px] bg-foreground px-[1px] -mx-[1px] text-background underline underline-offset-[5px] decoration-background/70">
          {email}
        </span>
      </span>
      <AnimatePresence>
        {copied && (
          <motion.span
            key={copyCount}
            aria-hidden
            style={{ x: '-50%' }}
            initial={{ opacity: 0, y: 5, scale: 0.9, filter: 'blur(2px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -4, scale: 0.96, filter: 'blur(2px)' }}
            transition={swap}
            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 flex items-center gap-1 whitespace-nowrap rounded-[4px] bg-foreground px-1.5 py-0.5 text-xs font-medium text-background"
          >
            <CheckDraw />
            Copied
          </motion.span>
        )}
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Email copied to clipboard' : ''}
      </span>
    </motion.a>
  )
}

export function Contact() {
  const { theme, setTheme } = useTheme()
  const activeTheme = isThemeName(theme) ? theme : 'system'

  return (
    <section
      id="contact"
      data-nosnippet=""
      className="relative pt-4 pb-10 md:pt-6 md:pb-12"
    >
      <div className="mx-auto max-w-5xl px-6 md:px-12 relative z-10">
        <div className="max-w-2xl mx-auto space-y-6 md:space-y-7">
          <h2 className="text-sm md:text-base font-medium text-foreground">
            Elsewhere
          </h2>

          <div className="flex flex-col">
            <p className="text-sm text-foreground/90 leading-relaxed max-w-xl">
              Email me at <CopyEmail email="lucasvalbuena@pm.me" /> or find me on{' '}
              <a
                href="https://github.com/x1xhlol"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-[5px] decoration-muted-foreground/65 hover:decoration-foreground transition-colors text-foreground"
              >
                GitHub
              </a>,{' '}
              <a
                href="https://x.com/Lucknite"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-[5px] decoration-muted-foreground/65 hover:decoration-foreground transition-colors text-foreground"
              >
                X
              </a>{' '}
              and{' '}
              <a
                href="https://linkedin.com/in/lucknite"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-[5px] decoration-muted-foreground/65 hover:decoration-foreground transition-colors text-foreground"
              >
                LinkedIn
              </a>
              .
            </p>
          </div>

          <footer className="pt-14 mt-2 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2.5 h-8 order-2 md:order-1">
              <PixelLock
                size={18}
                greet
                className="text-muted-foreground/70 hover:text-foreground"
              />
              <p className="text-xs text-muted-foreground leading-none">
                © {new Date().getFullYear()} Lucas Valbuena
              </p>
            </div>
            <div className="order-1 md:order-2">
              <ThemeSwitcher
                value={activeTheme}
                onChange={(v) => setTheme(v)}
              />
            </div>
          </footer>
        </div>
      </div>
    </section>
  )
}

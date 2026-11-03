'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { PixelLock } from '@/components/pixel-lock'
import { Section } from '@/components/section'
import { AnimatePresence, motion } from 'motion/react'
import { EASE_OUT as ease, SPRING_SWAP } from '@/lib/motion'
import { useMediaQuery } from '@/hooks/use-media-query'

const swap = {
  y: SPRING_SWAP,
  scale: SPRING_SWAP,
  opacity: { duration: 0.16, ease },
  filter: { duration: 0.16, ease },
} as const

function CheckDraw({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden>
      <motion.path
        d="M2.75 8.75l3.5 3.5 7-8.5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reducedMotion ? 1 : 0, opacity: 0 }}
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
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
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
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => setCopied(false), 1200)
      } catch {
        window.location.href = `mailto:${email}`
      }
    }
  }

  return (
    <motion.a
      href={`mailto:${email}`}
      onClick={onClick}
      aria-label={`Copy email address ${email}`}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.1, ease }}
      className="copy-email group relative inline-flex items-baseline align-baseline font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 rounded-sm"
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
            key="copied"
            aria-hidden
            style={{ x: '-50%' }}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 5, scale: reducedMotion ? 1 : 0.95, filter: reducedMotion ? 'none' : 'blur(2px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : 5, scale: reducedMotion ? 1 : 0.95, filter: reducedMotion ? 'none' : 'blur(2px)', transition: { duration: 0.1, ease } }}
            transition={swap}
            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 flex origin-bottom items-center gap-1 whitespace-nowrap rounded-[4px] bg-foreground px-1.5 py-0.5 text-xs font-medium text-background"
          >
            <CheckDraw reducedMotion={reducedMotion} />
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

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      aria-label={mounted && isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="touch-target relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-[color,background-color,transform,translate,scale] duration-150 ease-out motion-safe:active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
    >
      {mounted ? (
        <span className="relative inline-flex h-3.5 w-3.5" aria-hidden>
          <span className={`absolute inset-0 inline-flex transition-[opacity,transform,translate,scale] duration-150 ease-out motion-reduce:transition-opacity ${isDark ? 'opacity-100' : 'opacity-0 motion-safe:scale-90'}`}>
            <Sun className="h-3.5 w-3.5" />
          </span>
          <span className={`absolute inset-0 inline-flex transition-[opacity,transform,translate,scale] duration-150 ease-out motion-reduce:transition-opacity ${isDark ? 'opacity-0 motion-safe:scale-90' : 'opacity-100'}`}>
            <Moon className="h-3.5 w-3.5" />
          </span>
        </span>
      ) : (
        <span className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  )
}

export function Contact() {

  return (
    <Section id="contact" label="Elsewhere">
      <div className="flex flex-col">
        <p className="text-base text-muted-foreground leading-relaxed text-pretty max-w-xl">
          Email me at <CopyEmail email="lucasvalbuena@pm.me" />, read my{' '}
          <a
            href="/Lucas_Valbuena.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-[5px] decoration-muted-foreground/65 hover:decoration-foreground transition-colors font-medium text-foreground"
          >
            CV
          </a>
          , or find me on{' '}
          <a
            href="https://github.com/x1xhlol"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-[5px] decoration-muted-foreground/65 hover:decoration-foreground transition-colors font-medium text-foreground"
          >
            GitHub
          </a>,{' '}
          <a
            href="https://x.com/Lucknite"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-[5px] decoration-muted-foreground/65 hover:decoration-foreground transition-colors font-medium text-foreground"
          >
            X
          </a>{' '}
          and{' '}
          <a
            href="https://linkedin.com/in/lucknite"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-[5px] decoration-muted-foreground/65 hover:decoration-foreground transition-colors font-medium text-foreground"
          >
            LinkedIn
          </a>
          .
        </p>
      </div>

      <footer className="pt-12 pb-[env(safe-area-inset-bottom)] flex flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2.5 min-h-11">
          <PixelLock
            size={18}
            greet
            className="text-muted-foreground/70 hover:text-foreground"
          />
          <p className="text-xs text-muted-foreground leading-none">
            © {new Date().getFullYear()} Lucas Valbuena
          </p>
        </div>
        <div>
          <ThemeToggle />
        </div>
      </footer>
    </Section>
  )
}

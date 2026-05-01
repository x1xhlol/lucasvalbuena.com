'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { ThemeSwitcher } from '@/components/ui/theme-switcher'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'

const ease = [0.22, 1, 0.36, 1] as const
const themes = ['light', 'dark', 'system'] as const
type ThemeName = (typeof themes)[number]

function isThemeName(theme: string | undefined): theme is ThemeName {
  return themes.includes(theme as ThemeName)
}

function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)
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
        timeoutRef.current = setTimeout(() => setCopied(false), 1600)
      } catch {
        // fall through to default mailto: behavior
      }
    }
  }

  const decoration =
    'underline underline-offset-[5px] decoration-muted-foreground/30 group-hover:decoration-foreground transition-colors'

  return (
    <a
      href={`mailto:${email}`}
      onClick={onClick}
      aria-label={`Copy email address ${email}`}
      className="group relative inline-flex items-baseline align-baseline text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 rounded-sm"
    >
      <span aria-hidden className={`invisible whitespace-nowrap ${decoration}`}>
        {email}
      </span>
      <span className="absolute inset-0 flex items-baseline justify-center overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {copied ? (
            <motion.span
              key="copied"
              initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
              transition={{ duration: 0.28, ease }}
              className={`inline-flex items-center gap-1 whitespace-nowrap text-foreground ${decoration}`}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              <span>Copied</span>
            </motion.span>
          ) : (
            <motion.span
              key="email"
              initial={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
              transition={{ duration: 0.28, ease }}
              className={`whitespace-nowrap ${decoration}`}
            >
              {email}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </a>
  )
}

export function Contact() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const activeTheme = isThemeName(theme) ? theme : 'system'

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px',
      },
    )

    const elements = sectionRef.current?.querySelectorAll('.animate-on-scroll')
    elements?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="contact"
      data-nosnippet=""
      className="relative py-10 md:py-12"
      ref={sectionRef}
    >
      <div className="mx-auto max-w-5xl px-6 md:px-12 relative z-10">
        <div className="max-w-2xl mx-auto space-y-6 md:space-y-7">
          <h2 className="text-sm md:text-base font-medium text-foreground animate-on-scroll">
            Elsewhere
          </h2>

          <div className="flex flex-col animate-on-scroll">
            <p className="text-sm text-foreground/90 leading-relaxed max-w-xl">
              The best way to reach me is by email at{' '}
              <CopyEmail email="lucasvalbuena@pm.me" />. You can also find more of my code on{' '}
              <a
                href="https://github.com/x1xhlol"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-[5px] decoration-muted-foreground/30 hover:decoration-foreground transition-colors text-foreground"
              >
                GitHub
              </a>{' '}
              and more of my work on{' '}
              <a
                href="https://x.com/NotLucknite"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-[5px] decoration-muted-foreground/30 hover:decoration-foreground transition-colors text-foreground"
              >
                X
              </a>{' '}
              and{' '}
              <a
                href="https://linkedin.com/in/lucknite"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-[5px] decoration-muted-foreground/30 hover:decoration-foreground transition-colors text-foreground"
              >
                LinkedIn
              </a>
              .
            </p>
          </div>

          <footer className="pt-10 mt-2 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 animate-on-scroll">
            <div className="flex items-center h-8 order-2 md:order-1">
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

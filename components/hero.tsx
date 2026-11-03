'use client'

import type { SVGProps } from 'react'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { Section } from '@/components/section'
import { Fact } from '@/components/fact'
import { Age, ageInYears } from '@/components/age'

const GLYPHS_UPPER = '#$%&0123456789ABCDEFXZ'
const GLYPHS_LOWER = 'acenorsuvxz*+=<>'
const SCRAMBLE_RADIUS = 48
const SCRAMBLE_CYCLE_MS = 45
const SCRAMBLE_SETTLE_MIN_MS = 160
const SCRAMBLE_SETTLE_MAX_MS = 420

function randomGlyph(original: string, current: string | null) {
  const pool = original === original.toLowerCase() ? GLYPHS_LOWER : GLYPHS_UPPER
  let next = current
  while (next === current || next === original) next = pool[Math.floor(Math.random() * pool.length)]
  return next
}

function ScrambledName({ text }: { text: string }) {
  const glyphRefs = useRef<(HTMLSpanElement | null)[]>([])
  const activeUntilRef = useRef<number[]>([])
  const rafRef = useRef<number | null>(null)
  const lastCycleRef = useRef(0)

  useEffect(() => {
    const lockWidths = () => {
      const els = glyphRefs.current
      els.forEach((el, i) => {
        if (!el) return
        el.textContent = text[i]
        delete el.dataset.scrambled
        el.style.width = ''
      })
      const widths = els.map((el) => (el ? el.getBoundingClientRect().width : 0))
      els.forEach((el, i) => {
        if (el) el.style.width = `${widths[i]}px`
      })
    }
    document.fonts.ready.then(lockWidths)
    window.addEventListener('resize', lockWidths)
    return () => window.removeEventListener('resize', lockWidths)
  }, [text])

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  const loop = (time: number) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      activeUntilRef.current = []
    }
    const cycle = time - lastCycleRef.current >= SCRAMBLE_CYCLE_MS
    if (cycle) lastCycleRef.current = time
    let anyActive = false
    glyphRefs.current.forEach((el, i) => {
      const original = text[i]
      if (!el || original === ' ') return
      if ((activeUntilRef.current[i] ?? 0) > time) {
        anyActive = true
        if (cycle) {
          el.textContent = randomGlyph(original, el.textContent)
          el.dataset.scrambled = ''
        }
      } else if (el.textContent !== original) {
        el.textContent = original
        delete el.dataset.scrambled
      }
    })
    rafRef.current = anyActive ? requestAnimationFrame(loop) : null
  }

  const energize = (event: React.PointerEvent) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const now = performance.now()
    let any = false
    glyphRefs.current.forEach((el, i) => {
      if (!el || text[i] === ' ') return
      const rect = el.getBoundingClientRect()
      const distance = Math.hypot(
        event.clientX - (rect.left + rect.width / 2),
        event.clientY - (rect.top + rect.height / 2),
      )
      if (distance < SCRAMBLE_RADIUS) {
        const closeness = 1 - distance / SCRAMBLE_RADIUS
        const until = now + SCRAMBLE_SETTLE_MIN_MS + closeness * (SCRAMBLE_SETTLE_MAX_MS - SCRAMBLE_SETTLE_MIN_MS)
        activeUntilRef.current[i] = Math.max(activeUntilRef.current[i] ?? 0, until)
        any = true
      }
    })
    if (any && rafRef.current === null) rafRef.current = requestAnimationFrame(loop)
  }

  return (
    <span
      className="inline-block whitespace-nowrap select-none touch-pan-y"
      onPointerMove={energize}
      onPointerDown={energize}
    >
      {text.split('').map((char, i) =>
        char === ' ' ? (
          <span key={i}>{' '}</span>
        ) : (
          <span
            key={i}
            ref={(el) => {
              glyphRefs.current[i] = el
            }}
            className="inline-block text-center transition-colors duration-150 ease-out data-[scrambled]:text-muted-foreground data-[scrambled]:duration-0"
          >
            {char}
          </span>
        ),
      )}
    </span>
  )
}

const OpenAIIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
)

const ZeroLeaksIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className={className} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14 0C15.1046 0 16 0.895431 16 2V14C16 15.1046 15.1046 16 14 16H2C0.895431 16 0 15.1046 0 14V2C0 0.895431 0.895431 0 2 0H14ZM8 5.3125C6.51573 5.3125 5.3125 6.51573 5.3125 8C5.3125 9.48427 6.51573 10.6875 8 10.6875C9.48427 10.6875 10.6875 9.48427 10.6875 8C10.6875 6.51573 9.48427 5.3125 8 5.3125Z"
    />
  </svg>
)

const OrchidMark = () => (
  <span className="relative ml-[0.15em] mr-[0.4em] inline-block size-[0.85em] align-[-0.1em]" aria-hidden>
    <Image src="/logos/orchid-ink.svg" alt="" fill loading="eager" className="object-contain dark:hidden" />
    <Image src="/logos/orchid-paper.svg" alt="" fill loading="eager" className="hidden object-contain dark:block" />
  </span>
)

type Stats = { stars: string; forks: string }

export function Hero({ stats }: { stats: Stats }) {
  return (
    <Section id="home" className="pt-16 pb-8 md:pt-16 md:pb-10">
      <div className="space-y-7 md:space-y-8">
        <h1
          aria-label="Lucas Valbuena"
          className="font-geist-pixel text-2xl md:text-[32px] font-medium tracking-tight leading-[1.15]"
        >
          <ScrambledName text="Lucas Valbuena" />
        </h1>

        <div className="space-y-4">
          <p className="text-base text-muted-foreground leading-relaxed text-pretty max-w-xl">
            I reverse-engineer AI tools and build security products. Founder of{' '}
            <a
              href="https://zeroleaks.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap font-medium text-foreground underline-offset-[5px] decoration-muted-foreground/65 transition-colors hover:underline"
            >
              <ZeroLeaksIcon className="ml-[0.15em] mr-[0.4em] inline size-[0.8em] align-[-0.08em]" aria-hidden />ZeroLeaks
            </a>
            , previously at{' '}
            <a
              href="https://orchid.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap font-medium text-foreground underline-offset-[5px] decoration-muted-foreground/65 transition-colors hover:underline"
            >
              <OrchidMark />Orchid
            </a>{' '}
            (YC P25).{' '}
            <Fact
              label={`${ageInYears()} years old`}
              className="text-muted-foreground transition-colors duration-150 hover:text-foreground"
              detail={(open) => (
                <span className="block px-3 py-2 font-mono text-sm text-foreground">
                  <Age active={open} /> <span className="text-muted-foreground">years</span>
                </span>
              )}
            >
              {ageInYears()}
            </Fact>
            , based in Spain.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed text-pretty max-w-xl">
            I&nbsp;maintain{' '}
            <a
              href="https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block max-w-full font-medium text-foreground underline-offset-[5px] decoration-muted-foreground/65 transition-colors hover:underline"
            >
              system-prompts-and-models-of-ai-tools
            </a>
            , {stats.stars} stars.
          </p>
        </div>

        <div className="pt-1">
          <a
            href="https://x.com/Lucknite/status/2012065359717708279"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 text-base text-muted-foreground"
          >
            <OpenAIIcon className="h-4 w-4 shrink-0" />
            <span>
              <span className="font-medium text-foreground underline-offset-[5px] decoration-muted-foreground/65 transition-colors group-hover:underline">
                GPT-5 Bio Bug Bounty
              </span>
              <span className="text-muted-foreground"> ($6,000 award)</span>
            </span>
          </a>
        </div>
      </div>
    </Section>
  )
}

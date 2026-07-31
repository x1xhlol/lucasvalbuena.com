'use client'

import { FileText, Github, Linkedin } from 'lucide-react'
import type { SVGProps } from 'react'
import { useEffect, useRef } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Section } from '@/components/section'

const OpenAIIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
)

const XIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const SCRAMBLE_GLYPHS = '#$%&/<>=+*0123456789ABCDEF'
const SCRAMBLE_RADIUS = 44
const SCRAMBLE_CYCLE_MS = 40
const SCRAMBLE_SETTLE_MS = 350

// Characters glitch near the pointer while it MOVES and settle once it rests —
// each movement energizes nearby glyphs for a short window, so a stationary
// cursor can't flicker forever. Mouse: hover. Touch: tap bursts around the
// finger, horizontal drags sweep along the name (touch-pan-y keeps vertical
// scrolling native).
function ScrambledName({ text }: { text: string }) {
  const glyphRefs = useRef<(HTMLSpanElement | null)[]>([])
  const activeUntilRef = useRef<number[]>([])
  const rafRef = useRef<number | null>(null)
  const lastCycleRef = useRef(0)

  // Lock each glyph's box to its rendered width so swapped characters can't
  // nudge the rest of the line — the pixel font isn't strictly monospace
  useEffect(() => {
    const lockWidths = () => {
      const els = glyphRefs.current
      els.forEach((el, i) => {
        if (!el) return
        el.textContent = text[i]
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
    const cycle = time - lastCycleRef.current >= SCRAMBLE_CYCLE_MS
    if (cycle) lastCycleRef.current = time
    let anyActive = false
    glyphRefs.current.forEach((el, i) => {
      const original = text[i]
      if (!el || original === ' ') return
      if ((activeUntilRef.current[i] ?? 0) > time) {
        anyActive = true
        if (cycle) {
          el.textContent =
            SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)]
        }
      } else if (el.textContent !== original) {
        el.textContent = original
      }
    })
    // The pass where every window has expired restores all glyphs, then stops
    rafRef.current = anyActive ? requestAnimationFrame(loop) : null
  }

  const energize = (event: React.PointerEvent) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const until = performance.now() + SCRAMBLE_SETTLE_MS
    let any = false
    glyphRefs.current.forEach((el, i) => {
      if (!el || text[i] === ' ') return
      const rect = el.getBoundingClientRect()
      const distance = Math.hypot(
        event.clientX - (rect.left + rect.width / 2),
        event.clientY - (rect.top + rect.height / 2),
      )
      if (distance < SCRAMBLE_RADIUS) {
        activeUntilRef.current[i] = until
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
            className="inline-block"
          >
            {char}
          </span>
        ),
      )}
    </span>
  )
}

function CvLink() {
  return (
    <a
      href="/Lucas_Valbuena.pdf"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View CV (PDF)"
      className="inline-flex items-center gap-1.5 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-[color,background-color,transform] duration-150 ease-out active:scale-95"
    >
      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="text-xs font-medium leading-none">CV</span>
    </a>
  )
}

type Stats = { stars: string; forks: string }

export function Hero({
  initialStats,
  repoStats,
}: {
  initialStats: Stats
  repoStats?: Stats
}) {
  const systemPrompts = repoStats ?? initialStats

  return (
    <Section id="home" className="pt-28 pb-8 md:pt-24 md:pb-10">
      <div className="space-y-7 md:space-y-8">
          <h1
            aria-label="Lucas Valbuena"
            className="animate-rise-entry font-geist-pixel text-2xl md:text-[32px] font-medium tracking-tight leading-[1.15]"
          >
            <ScrambledName text="Lucas Valbuena" />
          </h1>

          <div
            className="animate-rise-entry space-y-4"
            style={{ '--rise-delay': '40ms' } as React.CSSProperties}
          >
            <p className="text-[15px] md:text-base text-foreground/90 leading-relaxed max-w-xl">
              I reverse-engineer AI tools and build security products. 17, based
              in Spain. I work at{' '}
              <a
                href="https://orchid.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-[5px] decoration-muted-foreground/65 hover:decoration-foreground transition-colors"
              >
                Orchid
              </a>{' '}
              (YC P25) as an AI agent and product intern.
            </p>
            <p className="text-[15px] md:text-base text-foreground/90 leading-relaxed max-w-xl">
              I founded{' '}
              <a
                href="https://zeroleaks.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-[5px] decoration-muted-foreground/65 hover:decoration-foreground transition-colors"
              >
                ZeroLeaks
              </a>
              , and created and maintain{' '}
              <a
                href="https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-[5px] decoration-muted-foreground/65 hover:decoration-foreground transition-colors"
              >
                system-prompts-and-models-of-ai-tools
              </a>{' '}
              {/* The star count is the proof; don't let it break across lines */}
              <span className="whitespace-nowrap">
                ({systemPrompts.stars} stars)
              </span>
              .
            </p>
          </div>

          <div
            className="animate-rise-entry pt-1"
            style={{ '--rise-delay': '80ms' } as React.CSSProperties}
          >
            <a
              href="https://x.com/Lucknite/status/2012065359717708279"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 text-sm text-foreground/90"
            >
              <OpenAIIcon className="h-4 w-4 shrink-0" />
              <span>
                <span className="underline underline-offset-[5px] decoration-muted-foreground/65 group-hover:decoration-foreground transition-colors">
                  GPT-5 Bio Bug Bounty
                </span>
                <span className="text-muted-foreground"> ($6,000 award)</span>
              </span>
            </a>
          </div>

          <TooltipProvider delayDuration={400} skipDelayDuration={300}>
            <div
              className="animate-rise-entry flex items-center gap-1 pt-1 -ml-2"
              style={{ '--rise-delay': '120ms' } as React.CSSProperties}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="https://github.com/x1xhlol"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-[color,background-color,transform] duration-150 ease-out active:scale-95"
                    aria-label="GitHub profile"
                  >
                    <Github className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>GitHub</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="https://x.com/Lucknite"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-[color,background-color,transform] duration-150 ease-out active:scale-95"
                    aria-label="X profile"
                  >
                    <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>X</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="https://linkedin.com/in/lucknite"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-[color,background-color,transform] duration-150 ease-out active:scale-95"
                    aria-label="LinkedIn profile"
                  >
                    <Linkedin className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>LinkedIn</TooltipContent>
              </Tooltip>
              <span className="mx-1 h-3.5 w-px bg-border" aria-hidden />
              <CvLink />
            </div>
          </TooltipProvider>
      </div>
    </Section>
  )
}

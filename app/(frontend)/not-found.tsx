'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { Navigation } from '@/components/navigation'
import { useEffect, useState } from 'react'

const DitheredObject = dynamic(
  () => import('@/components/canvasui/DitheredObject'),
  { ssr: false },
)

const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789'

function useGlitchText(target: string, duration = 500) {
  const [text, setText] = useState(target)

  useEffect(() => {
    // Rapid character flicker is exactly what reduced-motion users opt out of
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const steps = 6
    const interval = duration / steps
    let step = 0

    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const resolved = Math.floor(progress * target.length)

      const result = target
        .split('')
        .map((char, i) => {
          if (i < resolved) return char
          return glitchChars[Math.floor(Math.random() * glitchChars.length)]
        })
        .join('')

      setText(result)

      if (step >= steps) {
        clearInterval(timer)
        setText(target)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [target, duration])

  return text
}

const inlineLinkClass =
  'underline underline-offset-[5px] decoration-muted-foreground/65 hover:decoration-foreground transition-colors text-foreground cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 rounded-sm'

export default function NotFound() {
  const glitched = useGlitchText('404')
  const { resolvedTheme } = useTheme()
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  return (
    <div className="relative min-h-dvh">
      <Navigation />
      <main className="flex min-h-dvh items-center">
        <section className="mx-auto w-full max-w-5xl px-6 md:px-12 pb-14">
          <div className="max-w-2xl mx-auto space-y-7 md:space-y-8">
            <h1
              aria-label="404, page not found"
              className="animate-rise-entry font-geist-pixel text-2xl md:text-[32px] font-medium tracking-tight leading-[1.15]"
            >
              {glitched}
            </h1>

            <p
              className="animate-rise-entry text-[15px] md:text-base text-foreground/90 leading-relaxed max-w-xl"
              style={{ '--rise-delay': '40ms' } as React.CSSProperties}
            >
              This page doesn&apos;t exist or has been moved. Head{' '}
              <Link href="/" className={inlineLinkClass}>
                back home
              </Link>{' '}
              or{' '}
              <button
                type="button"
                onClick={() => window.history.back()}
                className={inlineLinkClass}
              >
                go back
              </button>
              .
            </p>

            <div
              aria-hidden
              className="animate-rise-entry"
              style={{ '--rise-delay': '80ms' } as React.CSSProperties}
            >
              <DitheredObject
                src="/404-key.svg"
                className="h-52 md:h-60 max-w-xl cursor-grab active:cursor-grabbing"
                gridSize={3}
                scale={3.2}
                invert={resolvedTheme === 'dark'}
                highlight="#a3a3a3"
                orbit
                zoom={false}
                floatIntensity={reduceMotion ? 0 : 2}
                rotationIntensity={reduceMotion ? 0 : 1}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789'

function useGlitchText(target: string, duration = 1200) {
  const [text, setText] = useState(target)

  useEffect(() => {
    const steps = 12
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

export default function NotFound() {
  const glitched = useGlitchText('404')

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 grid-pattern grid-fade pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-lg px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background/80 backdrop-blur-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-muted-foreground/40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground" />
            </span>
            <span className="font-mono text-[11px] text-muted-foreground tracking-wider uppercase">
              Page not found
            </span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-mono text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter mb-4"
        >
          {glitched}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-sm md:text-base text-muted-foreground mb-10 max-w-sm mx-auto leading-relaxed"
        >
          The page you&#39;re looking for doesn&#39;t exist or has been moved.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all"
          >
            <Home className="h-3.5 w-3.5" />
            Go home
          </Link>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.history.back()
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted/30 hover:border-foreground/20 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Go back
          </button>
        </motion.div>
      </div>
    </div>
  )
}

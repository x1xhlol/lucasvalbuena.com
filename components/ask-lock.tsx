'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAnimate, type AnimationPlaybackControls, type DOMKeyframesDefinition, type AnimationOptions } from 'motion/react'
import { LOCK_SUMMON_EVENT, PixelLockSprite, type LockFrame } from '@/components/pixel-lock'
import { useMediaQuery } from '@/hooks/use-media-query'
import { EASE_OUT } from '@/lib/motion'

const MOOD_EVENT = 'ask-lock:mood'

export type AskLockMood = 'thinking' | 'talking' | 'done' | 'wink' | 'open' | 'blink' | 'idle'

export function setAskLockMood(mood: AskLockMood) {
  window.dispatchEvent(new CustomEvent<AskLockMood>(MOOD_EVENT, { detail: mood }))
}

const ONE_SHOTS: Record<'done' | 'wink' | 'open' | 'blink' | 'idle', Array<[LockFrame, number]>> = {
  done: [['idle', 120], ['blink', 160]],
  wink: [['winkLeft', 1000]],
  open: [['open', 900], ['idle', 180], ['winkLeft', 320]],
  blink: [['blink', 150]],
  idle: [],
}

const THINKING: Array<[LockFrame, number]> = [
  ['left', 360],
  ['idle', 140],
  ['right', 360],
  ['idle', 140],
]

const MOVES: Record<AskLockMood, [DOMKeyframesDefinition, AnimationOptions]> = {
  thinking: [{ rotate: [0, -10, 0, 10, 0], y: 0 }, { duration: 1, repeat: Infinity, ease: 'easeInOut' }],
  talking: [{ y: [0, -2.5, 0], rotate: 0 }, { duration: 0.36, repeat: Infinity, ease: 'easeInOut' }],
  done: [{ y: [0, -7, 0], rotate: 0 }, { duration: 0.4, ease: EASE_OUT }],
  wink: [{ rotate: [0, -14, 12, -8, 5, 0], y: 0 }, { duration: 0.55, ease: EASE_OUT }],
  open: [{ y: [0, -6, 0], rotate: 0 }, { duration: 0.38, ease: EASE_OUT }],
  blink: [{ y: 0, rotate: 0 }, { duration: 0.2, ease: EASE_OUT }],
  idle: [{ y: 0, rotate: 0 }, { duration: 0.2, ease: EASE_OUT }],
}

const IDLE_BLINK_MS = 4800
const ESCAPE_CLICKS = 5

export function AskLock() {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [frame, setFrame] = useState<LockFrame>('idle')
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const playingRef = useRef(false)
  const clicksRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [scope, animate] = useAnimate<HTMLSpanElement>()
  const moveRef = useRef<AnimationPlaybackControls | null>(null)

  const play = useCallback((mood: AskLockMood) => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    playingRef.current = true
    if (!reducedMotion && scope.current) {
      moveRef.current?.stop()
      const [keyframes, options] = MOVES[mood]
      moveRef.current = animate(scope.current, keyframes, options)
    }
    if (mood === 'talking') {
      setFrame('happy')
      return
    }
    if (mood === 'thinking') {
      if (reducedMotion) {
        setFrame('left')
        return
      }
      const loop = () => {
        let at = 0
        for (const [step, hold] of THINKING) {
          timersRef.current.push(setTimeout(() => setFrame(step), at))
          at += hold
        }
        timersRef.current.push(setTimeout(loop, at))
      }
      loop()
      return
    }
    let at = 0
    for (const [step, hold] of ONE_SHOTS[mood]) {
      timersRef.current.push(setTimeout(() => setFrame(step), at))
      at += hold
    }
    timersRef.current.push(
      setTimeout(() => {
        setFrame('idle')
        playingRef.current = false
      }, at),
    )
  }, [reducedMotion, animate, scope])

  useEffect(() => {
    const onMood = (event: Event) => play((event as CustomEvent<AskLockMood>).detail)
    window.addEventListener(MOOD_EVENT, onMood)
    return () => {
      window.removeEventListener(MOOD_EVENT, onMood)
      timersRef.current.forEach(clearTimeout)
    }
  }, [play])

  useEffect(() => {
    if (reducedMotion) return
    const timer = setInterval(() => {
      if (!playingRef.current) play('blink')
    }, IDLE_BLINK_MS)
    return () => clearInterval(timer)
  }, [reducedMotion, play])

  const onClick = () => {
    clicksRef.current += 1
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    clickTimerRef.current = setTimeout(() => {
      clicksRef.current = 0
    }, 1400)
    if (clicksRef.current >= ESCAPE_CLICKS && !reducedMotion) {
      clicksRef.current = 0
      const rect = buttonRef.current?.getBoundingClientRect()
      window.dispatchEvent(
        new CustomEvent(LOCK_SUMMON_EVENT, {
          detail: {
            x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
            y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
            mode: window.matchMedia('(pointer: fine)').matches ? 'cursor' : 'wander',
          },
        }),
      )
      return
    }
    play('open')
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-label="The lock that answers here"
      className="-ml-2.5 -mt-2.5 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-foreground transition-[scale] duration-150 ease-out motion-safe:active:scale-[0.97]"
    >
      <span ref={scope} className="inline-flex" style={{ transformOrigin: '50% 90%' }}>
        <PixelLockSprite frame={frame} size={30} />
      </span>
    </button>
  )
}

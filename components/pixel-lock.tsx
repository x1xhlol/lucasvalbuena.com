'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { EASE_OUT } from '@/lib/motion'

export const LOCK_SUMMON_EVENT = 'pixel-lock:summon'

const IDLE = [
  '................',
  '.....######.....',
  '....##....##....',
  '....##....##....',
  '....##....##....',
  '....##....##....',
  '..############..',
  '.##############.',
  '.##############.',
  '.###..####..###.',
  '.###..####..###.',
  '.##############.',
  '.##############.',
  '.##############.',
  '..############..',
  '...##......##...',
]

const BLINK = IDLE.map((row, y) => (y === 9 ? '.##############.' : row))

const WINK_LEFT = IDLE.map((row, y) => (y === 9 ? '.#########..###.' : row))
const WINK_RIGHT = IDLE.map((row, y) => (y === 9 ? '.###..#########.' : row))

const LOOK_LEFT = IDLE.map((row, y) =>
  y === 9 || y === 10 ? '.##..####..####.' : row,
)

const LOOK_RIGHT = IDLE.map((row, y) =>
  y === 9 || y === 10 ? '.####..####..##.' : row,
)

const HAPPY = IDLE.map((row, y) => (y === 8 ? '.###..####..###.' : row))

const OPEN = IDLE.map((row, y) => {
  if (y === 4 || y === 5) return '....##..........'
  return row
})

export type LockFrame =
  | 'idle'
  | 'blink'
  | 'winkLeft'
  | 'winkRight'
  | 'left'
  | 'right'
  | 'happy'
  | 'open'

function toRects(rows: string[]): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') pts.push([x, y])
    }
  })
  return pts
}

const FRAMES: Record<LockFrame, Array<[number, number]>> = {
  idle: toRects(IDLE),
  blink: toRects(BLINK),
  winkLeft: toRects(WINK_LEFT),
  winkRight: toRects(WINK_RIGHT),
  left: toRects(LOOK_LEFT),
  right: toRects(LOOK_RIGHT),
  happy: toRects(HAPPY),
  open: toRects(OPEN),
}

export function PixelLockSprite({
  frame,
  size,
  className,
}: {
  frame: LockFrame
  size: number
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      aria-hidden
    >
      {FRAMES[frame].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  )
}

const STREAK_TITLES = [
  "it's locked.",
  "it's locked.",
  'again?',
  'what are you doing.',
  'one more and i’m out.',
]

export function PixelLock({
  size = 44,
  className,
  greet = false,
}: {
  size?: number
  className?: string
  greet?: boolean
}) {
  const [frame, setFrame] = useState<LockFrame>('idle')
  const [unlocked, setUnlocked] = useState(false)
  const [streak, setStreak] = useState(0)
  const [hopKey, setHopKey] = useState(0)
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streakTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const greetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const greeted = useRef(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    if (reducedMotion) {
      setFrame('idle')
      return
    }
    let alive = true
    let timer: ReturnType<typeof setTimeout>

    const next = (fn: () => void, ms: number) => {
      timer = setTimeout(() => {
        if (alive) fn()
      }, ms)
    }

    const rest = () => {
      next(() => {
        const roll = Math.random()
        if (roll < 0.58) {
          setFrame('blink')
          next(() => {
            setFrame('idle')
            rest()
          }, 130)
        } else if (roll < 0.74) {
          setFrame(roll < 0.66 ? 'winkLeft' : 'winkRight')
          next(() => {
            setFrame('idle')
            rest()
          }, 320)
        } else {
          setFrame(roll < 0.87 ? 'left' : 'right')
          next(() => {
            setFrame('idle')
            rest()
          }, 700)
        }
      }, 2600 + Math.random() * 3800)
    }

    rest()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [reducedMotion])

  useEffect(() => {
    if (!greet || reducedMotion) return
    const el = buttonRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || greeted.current) return
        greeted.current = true
        observer.disconnect()
        setHopKey((k) => k + 1)
        setFrame('winkLeft')
        greetTimer.current = setTimeout(() => setFrame('idle'), 360)
      },
      { threshold: 0.9 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [greet, reducedMotion])

  useEffect(
    () => () => {
      if (unlockTimer.current) clearTimeout(unlockTimer.current)
      if (streakTimer.current) clearTimeout(streakTimer.current)
      if (greetTimer.current) clearTimeout(greetTimer.current)
    },
    [],
  )

  const pop = () => {
    setUnlocked(true)
    if (unlockTimer.current) clearTimeout(unlockTimer.current)
    unlockTimer.current = setTimeout(() => {
      setUnlocked(false)
      if (reducedMotion) return
      unlockTimer.current = setTimeout(() => {
        setFrame('winkLeft')
        unlockTimer.current = setTimeout(() => setFrame('idle'), 320)
      }, 180)
    }, 900)
  }

  const onClick = () => {
    const nextStreak = streak + 1
    if (streakTimer.current) clearTimeout(streakTimer.current)
    streakTimer.current = setTimeout(() => setStreak(0), 1400)

    const canEscape = typeof window !== 'undefined' && !reducedMotion

    if (nextStreak >= 5 && canEscape) {
      setStreak(0)
      const rect = buttonRef.current?.getBoundingClientRect()
      window.dispatchEvent(
        new CustomEvent(LOCK_SUMMON_EVENT, {
          detail: {
            x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
            y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
            mode: window.matchMedia('(pointer: fine)').matches
              ? 'cursor'
              : 'wander',
          },
        }),
      )
      console.log('%cit got out.', 'color:gray;font-style:italic')
      return
    }

    setStreak(nextStreak)
    pop()
  }

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      animate={{
        rotate: !reducedMotion && streak >= 2 ? [0, -streak * 2.5, streak * 2.5, -streak * 1.5, 0] : 0,
        y: !reducedMotion && hopKey ? [0, -4, 0] : 0,
      }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      aria-label={
        unlocked
          ? 'The padlock pops open, then thinks better of it'
          : 'A small pixel padlock. It is watching you.'
      }
      title={unlocked ? '…no. locked again.' : STREAK_TITLES[Math.min(streak, 4)]}
      className={`relative inline-flex size-11 items-center justify-center cursor-pointer rounded-sm transition-[color,scale] duration-150 ease-out motion-safe:active:scale-[0.97] ${className ?? ''}`}
    >
      <PixelLockSprite frame={unlocked ? 'open' : frame} size={size} />
    </motion.button>
  )
}

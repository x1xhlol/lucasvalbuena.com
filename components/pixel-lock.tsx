'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// Fired with {x, y} (viewport coords) when the little lock is clicked enough
// times to escape; LockFamiliar listens and spawns the big one from there.
export const LOCK_SUMMON_EVENT = 'pixel-lock:summon'

// 16x16 pixel padlock creature. The eyes are gaps in the body so it reads
// correctly on any background in both themes.
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

// Closed eyes: only the lower half of each eye stays open
const BLINK = IDLE.map((row, y) => (y === 9 ? '.##############.' : row))

// One eye closed, the other wide open
const WINK_LEFT = IDLE.map((row, y) => (y === 9 ? '.#########..###.' : row))
const WINK_RIGHT = IDLE.map((row, y) => (y === 9 ? '.###..#########.' : row))

const LOOK_LEFT = IDLE.map((row, y) =>
  y === 9 || y === 10 ? '.##..####..####.' : row,
)

const LOOK_RIGHT = IDLE.map((row, y) =>
  y === 9 || y === 10 ? '.####..####..##.' : row,
)

// Wide-eyed: eyes grow a pixel taller
const HAPPY = IDLE.map((row, y) => (y === 8 ? '.###..####..###.' : row))

// Shackle pops open on the right side
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
  const reducedMotion = useReducedMotion()

  // Idle life: mostly blinking, sometimes a wink, the occasional glance
  useEffect(() => {
    if (reducedMotion) return
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
          // A wink is deliberate — hold it longer than a blink
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

  // Greet: a little hop and a wink the first time it scrolls into view
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
      // Snap shut, then wink — I let you see that
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
            // No cursor to chase on touch devices — it wanders instead
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
        rotate: streak >= 2 ? [0, -streak * 2.5, streak * 2.5, -streak * 1.5, 0] : 0,
        y: hopKey ? [0, -4, 0] : 0,
      }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      aria-label={
        unlocked
          ? 'The padlock pops open, then thinks better of it'
          : 'A small pixel padlock. It is watching you.'
      }
      title={unlocked ? '…no. locked again.' : STREAK_TITLES[Math.min(streak, 4)]}
      className={`inline-flex cursor-pointer rounded-sm outline-none transition-[color,transform] duration-150 ease-out active:scale-95 focus-visible:ring-2 focus-visible:ring-foreground/20 ${className ?? ''}`}
    >
      <PixelLockSprite frame={unlocked ? 'open' : frame} size={size} />
    </motion.button>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react'
import {
  LOCK_SUMMON_EVENT,
  PixelLockSprite,
  type LockFrame,
} from '@/components/pixel-lock'
import { EASE_IN_OUT, EASE_OUT } from '@/lib/motion'
import { useMediaQuery } from '@/hooks/use-media-query'

const SIZE = 80
const CURSOR_OFFSET_X = 34
const CURSOR_OFFSET_Y = 42
const CATCH_DISTANCE = 36
const SPAWN_GRACE_MS = 1200
const SLEEP_AFTER_MS = 6000
const WANDER_LEAVE_MS = 45000

type SummonDetail = { x: number; y: number; mode?: 'cursor' | 'wander' }

export function LockFamiliar() {
  const [active, setActive] = useState(false)
  const [caught, setCaught] = useState(false)
  const [frame, setFrame] = useState<LockFrame>('happy')
  const [asleep, setAsleep] = useState(false)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const targetX = useMotionValue(-200)
  const targetY = useMotionValue(-200)
  const x = useSpring(targetX, { stiffness: 120, damping: 15, mass: 0.9 })
  const y = useSpring(targetY, { stiffness: 120, damping: 15, mass: 0.9 })
  const vx = useVelocity(x)
  const tilt = useSpring(useTransform(vx, [-1200, 1200], [-14, 14]), {
    stiffness: 260,
    damping: 26,
  })

  const activeRef = useRef(false)
  const caughtRef = useRef(false)
  const modeRef = useRef<'cursor' | 'wander'>('cursor')
  const lastMove = useRef(0)
  const lastX = useRef(0)
  const dir = useRef<1 | -1>(1)
  const spawnedAt = useRef(0)
  const holdTicks = useRef(0)

  const dismiss = useCallback((line = 'you caught it. it respects that.') => {
    if (caughtRef.current) return
    caughtRef.current = true
    setFrame('open')
    setAsleep(false)
    setCaught(true)
    console.log(`%c${line}`, 'color:gray;font-style:italic')
  }, [])

  useEffect(() => {
    const onSummon = (e: Event) => {
      if (activeRef.current || reducedMotion) return
      const detail = (e as CustomEvent<SummonDetail>).detail
      modeRef.current = detail.mode ?? 'cursor'
      x.jump(detail.x)
      y.jump(detail.y)
      targetX.jump(detail.x)
      targetY.jump(detail.y)
      spawnedAt.current = performance.now()
      lastMove.current = performance.now()
      lastX.current = detail.x
      holdTicks.current = 6
      setFrame('happy')
      setAsleep(false)
      caughtRef.current = false
      setCaught(false)
      activeRef.current = true
      setActive(true)
    }
    window.addEventListener(LOCK_SUMMON_EVENT, onSummon)
    return () => window.removeEventListener(LOCK_SUMMON_EVENT, onSummon)
  }, [targetX, targetY, x, y, reducedMotion])

  useEffect(() => {
    if (reducedMotion) {
      x.stop()
      y.stop()
      tilt.stop()
      activeRef.current = false
      setActive(false)
      return
    }
    if (!active) return
    const wander = modeRef.current === 'wander'

    const onMove = (e: PointerEvent) => {
      if (caughtRef.current) return
      const now = performance.now()
      lastMove.current = now
      if (Math.abs(e.clientX - lastX.current) > 2) {
        dir.current = e.clientX > lastX.current ? 1 : -1
      }
      lastX.current = e.clientX
      targetX.set(e.clientX + CURSOR_OFFSET_X)
      targetY.set(e.clientY + CURSOR_OFFSET_Y)
      if (now - spawnedAt.current > SPAWN_GRACE_MS) {
        const dist = Math.hypot(e.clientX - x.get(), e.clientY - y.get())
        if (dist < CATCH_DISTANCE) dismiss()
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }

    let wanderTimer: ReturnType<typeof setTimeout> | null = null
    let leaveTimer: ReturnType<typeof setTimeout> | null = null
    const roam = () => {
      if (caughtRef.current) return
      const nx = 60 + Math.random() * Math.max(window.innerWidth - 120, 60)
      const ny = 90 + Math.random() * Math.max(window.innerHeight - 190, 60)
      dir.current = nx > x.get() ? 1 : -1
      lastMove.current = performance.now()
      targetX.set(nx)
      targetY.set(ny)
      const nap = Math.random() < 0.15
      wanderTimer = setTimeout(roam, nap ? 7500 : 1600 + Math.random() * 1800)
    }

    const onTap = (e: PointerEvent) => {
      if (caughtRef.current) return
      const tx = Math.min(Math.max(e.clientX, 50), window.innerWidth - 50)
      const ty = Math.min(Math.max(e.clientY + 56, 90), window.innerHeight - 60)
      dir.current = tx > x.get() ? 1 : -1
      lastMove.current = performance.now()
      targetX.set(tx)
      targetY.set(ty)
      if (wanderTimer) clearTimeout(wanderTimer)
      wanderTimer = setTimeout(roam, 8000)
      if (leaveTimer) clearTimeout(leaveTimer)
      leaveTimer = setTimeout(() => dismiss('it wandered off.'), WANDER_LEAVE_MS)
    }

    if (wander) {
      wanderTimer = setTimeout(roam, 900)
      leaveTimer = setTimeout(() => dismiss('it wandered off.'), WANDER_LEAVE_MS)
      window.addEventListener('pointerdown', onTap)
    } else {
      window.addEventListener('pointermove', onMove)
    }
    window.addEventListener('keydown', onKey)

    const lookWindow = wander ? 900 : 240
    const tick = setInterval(() => {
      if (caughtRef.current) return
      if (holdTicks.current > 0) {
        holdTicks.current -= 1
        return
      }
      const since = performance.now() - lastMove.current
      if (since < lookWindow) {
        setAsleep(false)
        setFrame(dir.current === 1 ? 'right' : 'left')
      } else if (since > SLEEP_AFTER_MS) {
        setFrame('blink')
        setAsleep(true)
      } else {
        setAsleep(false)
        const roll = Math.random()
        if (roll < 0.06) {
          setFrame('blink')
          holdTicks.current = 1
        } else if (roll < 0.085) {
          setFrame(roll < 0.0725 ? 'winkLeft' : 'winkRight')
          holdTicks.current = 2
        } else {
          setFrame('idle')
        }
      }
    }, 160)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onTap)
      window.removeEventListener('keydown', onKey)
      if (wanderTimer) clearTimeout(wanderTimer)
      if (leaveTimer) clearTimeout(leaveTimer)
      clearInterval(tick)
    }
  }, [active, dismiss, targetX, targetY, x, y, tilt, reducedMotion])

  if (reducedMotion) return null

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="lock-familiar"
          {...(modeRef.current === 'wander'
            ? {
                role: 'button' as const,
                'aria-label': 'Catch the pixel lock',
                onPointerDown: () => dismiss(),
              }
            : { 'aria-hidden': true })}
          className={`fixed left-0 top-0 z-[90] text-foreground ${
            modeRef.current === 'wander'
              ? 'cursor-pointer touch-none'
              : 'pointer-events-none'
          }`}
          style={{ x, y, marginLeft: -SIZE / 2, marginTop: -SIZE / 2 }}
          initial={{ scale: 0.25, opacity: 0 }}
          animate={
            caught
              ? { scale: [1, 1.2, 0], opacity: [1, 1, 0] }
              : { scale: 1, opacity: 1 }
          }
          transition={
            caught
              ? { duration: 0.55, times: [0, 0.35, 1], ease: EASE_IN_OUT }
              : { type: 'spring', duration: 0.5, bounce: 0.35 }
          }
          onAnimationComplete={() => {
            if (caughtRef.current) {
              activeRef.current = false
              setActive(false)
            }
          }}
        >
          <motion.div style={{ rotate: tilt }}>
            <PixelLockSprite frame={frame} size={SIZE} />
          </motion.div>
          {asleep && (
            <motion.span
              aria-hidden
              className="absolute -top-3 -right-1 select-none font-geist-pixel text-sm text-muted-foreground"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: [0, 1, 0], y: -12 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: EASE_OUT }}
            >
              z
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

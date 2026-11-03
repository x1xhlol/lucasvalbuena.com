'use client'

import { useEffect, useState } from 'react'

export const BORN = new Date('2000-01-01T00:00:00Z') // your birthday
const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000

// Whole years, by calendar date, so the bio rolls over on the birthday
export function ageInYears(now = new Date()) {
  let years = now.getFullYear() - BORN.getFullYear()
  const beforeBirthday =
    now.getMonth() < BORN.getMonth() || (now.getMonth() === BORN.getMonth() && now.getDate() < BORN.getDate())
  if (beforeBirthday) years -= 1
  return years
}

// Runs on animation frames while the popover is open so the last digits roll
// continuously (nine decimals move every ~30ms); reduced motion ticks once a
// second instead.
export function Age({ digits = 9, active = true }: { digits?: number; active?: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const id = setInterval(() => setNow(Date.now()), 1000)
      return () => clearInterval(id)
    }
    let frame = 0
    const tick = () => {
      setNow(Date.now())
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active])
  const [whole, frac] = ((now - BORN.getTime()) / YEAR_MS).toFixed(digits).split('.')
  return (
    <span className="tabular-nums" suppressHydrationWarning>
      {whole}
      <span className="text-muted-foreground" suppressHydrationWarning>.{frac}</span>
    </span>
  )
}

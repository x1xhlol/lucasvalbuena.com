'use client'

import { useEffect, useState } from 'react'

// Analog clock on the lock creature's 16x16 grid, drawn at the same 44px.
// Midpoint-circle rim, two Bresenham hands from the centre pixel, Spain time.
const SIZE = 16
const CENTER = 7

function line(x0: number, y0: number, x1: number, y1: number) {
  const pts: string[] = []
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  let x = x0
  let y = y0
  for (;;) {
    pts.push(`${x},${y}`)
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return pts
}

function circle(r: number) {
  const pts = new Set<string>()
  let x = r
  let y = 0
  let err = 1 - r
  while (x >= y) {
    for (const [px, py] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) {
      pts.add(`${CENTER + px},${CENTER + py}`)
    }
    y++
    if (err < 0) err += 2 * y + 1
    else {
      x--
      err += 2 * (y - x) + 1
    }
  }
  return [...pts]
}

const RIM = circle(7)

function hand(turns: number, length: number) {
  const a = turns * Math.PI * 2
  return line(CENTER, CENTER, Math.round(CENTER + Math.sin(a) * length), Math.round(CENTER - Math.cos(a) * length))
}


export function madridTime(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return { h: get('hour'), m: get('minute') }
}

export function PixelClock({ size = 44, className }: { size?: number; className?: string }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      const date = new Date()
      setNow(date)
      timer = setTimeout(schedule, 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds()))
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])
  const { h, m } = madridTime(now)
  const hands = new Set([...hand(((h % 12) + m / 60) / 12, 3.4), ...hand(m / 60, 5.4)])
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden className={className}>
      {RIM.map((t) => {
        const [x, y] = t.split(',').map(Number)
        return <rect key={t} x={x} y={y} width={1} height={1} fill="currentColor" opacity={0.3} />
      })}
      {[...hands].map((t) => {
        const [x, y] = t.split(',').map(Number)
        return <rect key={t} x={x} y={y} width={1} height={1} fill="currentColor" />
      })}
    </svg>
  )
}

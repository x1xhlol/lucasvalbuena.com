'use client'

import { useEffect, useState } from 'react'
import { type Condition, PixelSky, moonPhase, skyNow } from '@/components/pixel-sky'

type Weather = { condition: Condition; isDay: boolean }

export function SkyPopover() {
  const [now, setNow] = useState(() => new Date())
  const [weather, setWeather] = useState<Weather | null>(null)

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

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/sky')
        if (!res.ok) return
        const data = (await res.json()) as Weather
        if (!cancelled && data.condition) setWeather(data)
      } catch {}
    }
    load()
    const id = setInterval(load, 15 * 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const { isDay, time, nextLabel, next } = skyNow(now)
  return (
    <span className="flex items-center gap-2.5 py-1.5 pr-3 pl-2 text-left text-xs leading-4" suppressHydrationWarning>
      <PixelSky condition={weather?.condition ?? 'clear'} isDay={weather?.isDay ?? isDay} phase={moonPhase(now)} size={32} className="shrink-0 text-foreground" />
      <span className="tabular-nums">
        <span className="block text-foreground">{time} in Spain</span>
        <span className="block text-muted-foreground">
          {nextLabel} at {next}
        </span>
      </span>
    </span>
  )
}

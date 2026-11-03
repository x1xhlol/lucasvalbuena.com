import { NextResponse } from 'next/server'
import { conditionForCode } from '@/components/pixel-sky'

const SOURCE =
  'https://api.open-meteo.com/v1/forecast?latitude=42.5987&longitude=-5.5671&current=weather_code,is_day&timezone=Europe%2FMadrid'

export async function GET() {
  try {
    const res = await fetch(SOURCE, { next: { revalidate: 900 } })
    if (!res.ok) throw new Error(`open-meteo ${res.status}`)
    const data = (await res.json()) as { current: { weather_code: number; is_day: number } }
    return NextResponse.json(
      { condition: conditionForCode(data.current.weather_code), isDay: data.current.is_day === 1 },
      { headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600' } },
    )
  } catch {
    return NextResponse.json({ condition: null, isDay: null }, { status: 503 })
  }
}

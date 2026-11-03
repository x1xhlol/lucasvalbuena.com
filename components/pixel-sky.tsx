const LAT = 42.5987
const LON = -5.5671
const RAD = Math.PI / 180

export type Condition = 'clear' | 'partly' | 'cloud' | 'rain' | 'snow' | 'thunder'

export function conditionForCode(code: number): Condition {
  if (code <= 1) return 'clear'
  if (code === 2) return 'partly'
  if (code === 3 || code === 45 || code === 48) return 'cloud'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunder'
  return 'rain'
}

function sunTimes(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const day = Math.floor((date.getTime() - start) / 86_400_000)
  const g = ((2 * Math.PI) / 365) * (day - 1 + (date.getUTCHours() - 12) / 24)
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const ha = Math.acos(Math.cos(90.833 * RAD) / (Math.cos(LAT * RAD) * Math.cos(decl)) - Math.tan(LAT * RAD) * Math.tan(decl)) / RAD
  const noon = 720 - 4 * LON - eqTime
  return { rise: noon - ha * 4, set: noon + ha * 4 }
}

const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

function atUtcMinutes(date: Date, minutes: number) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  d.setUTCMinutes(minutes)
  return d
}

export function skyNow(now = new Date()) {
  const { rise, set } = sunTimes(now)
  const m = now.getUTCHours() * 60 + now.getUTCMinutes()
  const isDay = m >= rise && m <= set
  const next = clock.format(atUtcMinutes(now, isDay ? set : m < rise ? rise : rise + 1440))
  return { isDay, time: clock.format(now), nextLabel: isDay ? 'sun sets' : 'sun rises', next }
}

const SYNODIC_DAYS = 29.530588853
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)
export const moonPhase = (date: Date) => ((((date.getTime() - NEW_MOON) / 86_400_000 / SYNODIC_DAYS) % 1) + 1) % 1

type Px = [number, number, number?]
const key = (x: number, y: number) => `${x},${y}`
const inDisc = (x: number, y: number, cx: number, cy: number, r: number) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r

function sun(cx: number, cy: number, r: number, reach: number): Px[] {
  const px: Px[] = []
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (inDisc(x, y, cx, cy, r)) px.push([x, y])
  const d = Math.round(reach * 0.72)
  px.push([cx, cy - reach], [cx, cy + reach], [cx - reach, cy], [cx + reach, cy], [cx - d, cy - d], [cx + d, cy - d], [cx - d, cy + d], [cx + d, cy + d])
  return px
}

function moon(cx: number, cy: number, r: number, phase: number): Px[] {
  const px: Px[] = []
  const c = Math.cos(phase * Math.PI * 2)
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!inDisc(x, y, cx, cy, r)) continue
      const u = (x - cx) / r
      const v = (y - cy) / r
      const w = Math.sqrt(Math.max(0, 1 - v * v))
      const lit = phase < 0.5 ? u >= w * c - 0.05 : u <= -w * c + 0.05
      px.push([x, y, lit ? 1 : 0.18])
    }
  }
  return px
}

const CLOUD_ROWS: [number, number, number][] = [
  [0, 6, 8],
  [1, 4, 10],
  [2, 3, 12],
  [3, 2, 13],
  [4, 2, 13],
  [5, 3, 12],
]
function cloudFill(dy: number) {
  const s = new Set<string>()
  for (const [row, x0, x1] of CLOUD_ROWS) for (let x = x0; x <= x1; x++) s.add(key(x, row + 6 + dy))
  return s
}
function cloudOutline(dy: number): Px[] {
  const fill = cloudFill(dy)
  const px: Px[] = []
  for (const k of fill) {
    const [x, y] = k.split(',').map(Number)
    const edge = !fill.has(key(x - 1, y)) || !fill.has(key(x + 1, y)) || !fill.has(key(x, y - 1)) || !fill.has(key(x, y + 1))
    if (edge) px.push([x, y])
  }
  return px
}

const PRECIP: Record<'rain' | 'snow' | 'thunder', Px[]> = {
  rain: [[4, 12], [3, 13], [7, 12], [6, 13], [10, 12], [9, 13]],
  snow: [[4, 12], [7, 13], [10, 12], [5, 14], [9, 14]],
  thunder: [[8, 11], [7, 12], [8, 12], [7, 13], [6, 14]],
}

function behindCloud(body: Px[], dy: number): Px[] {
  const fill = cloudFill(dy)
  return [...body.filter(([x, y]) => !fill.has(key(x, y))), ...cloudOutline(dy)]
}

export function skyPixels(condition: Condition, isDay: boolean, phase: number): Px[] {
  const big = isDay ? sun(7, 7, 2.3, 5) : moon(7, 7, 4.9, phase)
  const small = isDay ? sun(10, 4, 1.4, 3) : moon(10, 4, 2.4, phase)
  switch (condition) {
    case 'clear':
      return big
    case 'partly':
      return behindCloud(small, 1)
    case 'cloud':
      return cloudOutline(0)
    default:
      return [...cloudOutline(-1), ...PRECIP[condition]]
  }
}

export function PixelSky({
  condition,
  isDay,
  phase,
  size = 44,
  className,
}: {
  condition: Condition
  isDay: boolean
  phase: number
  size?: number
  className?: string
}) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" aria-hidden className={className}>
      {skyPixels(condition, isDay, phase).map(([x, y, o]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" opacity={o ?? 1} />
      ))}
    </svg>
  )
}

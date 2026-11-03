import { siteConfig } from '@/lib/site'

// A photo's location is published, so it's stored as "City, Country", never
// as the coordinates its camera recorded
const COORDINATES = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/

// OpenStreetMap names parts of London as cities of their own
const LONDON = /London|^City of Westminster$/

// Nominatim's usage policy: at most one request a second, from a client
// that says who it is
const MIN_GAP_MS = 1100
let nextSlot = 0

async function placeName(lat: string, lon: string): Promise<string | undefined> {
  // Claim a slot before waiting, so calls made together still go out spaced
  const slot = Math.max(Date.now(), nextSlot)
  nextSlot = slot + MIN_GAP_MS
  if (slot > Date.now()) await new Promise((resolve) => setTimeout(resolve, slot - Date.now()))

  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.search = new URLSearchParams({
    lat,
    lon,
    format: 'jsonv2',
    zoom: '10',
    addressdetails: '1',
    'accept-language': 'en',
  }).toString()
  const response = await fetch(url, {
    headers: { 'User-Agent': `LucasValbuena-Portfolio/1.0 (+${siteConfig.url})` },
    cache: 'no-store',
  })
  if (!response.ok) return undefined
  const { address } = (await response.json()) as {
    address?: Partial<Record<'city' | 'town' | 'village' | 'municipality' | 'county' | 'country', string>>
  }
  const city = address?.city ?? address?.town ?? address?.village ?? address?.municipality ?? address?.county
  const place = city && LONDON.test(city) ? 'London' : city
  return [place, address?.country].filter(Boolean).join(', ') || undefined
}

// The location to store for a photo: a typed place name as it is, and
// coordinates as the place they fall in. Coordinates that can't be named
// come back undefined, so they're dropped instead of published.
export async function toPlaceName(location: string): Promise<string | undefined> {
  const trimmed = location.trim()
  const coordinates = trimmed.match(COORDINATES)
  if (!coordinates) return trimmed || undefined
  try {
    return await placeName(coordinates[1], coordinates[2])
  } catch {
    return undefined
  }
}

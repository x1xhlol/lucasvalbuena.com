import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
  }

  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)
  if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('lat', lat)
    url.searchParams.set('lon', lon)
    url.searchParams.set('format', 'json')
    url.searchParams.set('addressdetails', '1')

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Portfolio-Photo-Location/1.0',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 })
    }

    const data = (await res.json()) as {
      address?: {
        city?: string
        town?: string
        village?: string
        municipality?: string
        county?: string
        state?: string
        country?: string
      }
      display_name?: string
    }

    const addr = data.address
    const city =
      addr?.city ?? addr?.town ?? addr?.village ?? addr?.municipality ?? addr?.county
    const country = addr?.country

    const display =
      city && country
        ? `${city}, ${country}`
        : city ?? country ?? data.display_name ?? 'Unknown'

    return NextResponse.json({ display })
  } catch (error) {
    console.error('Geocode error:', error)
    return NextResponse.json(
      { error: 'Geocoding failed' },
      { status: 500 },
    )
  }
}

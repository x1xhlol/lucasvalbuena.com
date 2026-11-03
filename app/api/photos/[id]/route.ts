import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import {
  getManifest,
  saveManifest,
  isValidSession,
  ADMIN_COOKIE,
  type PhotoMetadata,
} from '@/lib/photos'
import { toPlaceName } from '@/lib/geocode'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = request.cookies.get(ADMIN_COOKIE)?.value
  if (!isValidSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = (await request.json()) as { metadata?: Partial<PhotoMetadata> }
    if (!body.metadata || typeof body.metadata !== 'object') {
      return NextResponse.json(
        { error: 'metadata object required' },
        { status: 400 },
      )
    }

    const manifest = await getManifest()
    const photo = manifest.photos.find((p) => p.id === id)
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    if (!photo.metadata || typeof photo.metadata !== 'object') {
      photo.metadata = {}
    }

    for (const [key, raw] of Object.entries(body.metadata)) {
      // Coordinates typed into the location field become a place name
      const value = key === 'location' && typeof raw === 'string' ? await toPlaceName(raw) : raw
      if (key === 'location' && typeof raw === 'string' && raw.trim() && !value) {
        return NextResponse.json({ error: 'No place found at those coordinates' }, { status: 422 })
      }
      if (value === null || value === undefined || value === '') {
        delete photo.metadata[key as keyof PhotoMetadata]
      } else {
        ;(photo.metadata as Record<string, unknown>)[key] = value
      }
    }
    await saveManifest(manifest)

    return NextResponse.json(photo)
  } catch (error) {
    console.error('Patch photo error:', error)
    return NextResponse.json(
      { error: 'Failed to update photo' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = request.cookies.get(ADMIN_COOKIE)?.value
  if (!isValidSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const manifest = await getManifest()
    const photo = manifest.photos.find((p) => p.id === id)

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    try {
      await del(photo.url)
    } catch {
      // already gone
    }

    manifest.photos = manifest.photos.filter((p) => p.id !== id)
    await saveManifest(manifest)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 },
    )
  }
}

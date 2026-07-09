import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import {
  getManifest,
  saveManifest,
  isValidSession,
  ADMIN_COOKIE,
  type Photo,
  type PhotoMetadata,
} from '@/lib/photos'

export async function GET() {
  try {
    const manifest = await getManifest()
    return NextResponse.json(manifest.photos)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  const session = request.cookies.get(ADMIN_COOKIE)?.value
  if (!isValidSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const items: { url: string; width: number; height: number; metadata: PhotoMetadata }[] =
      Array.isArray(body) ? body : [body]

    if (items.length === 0 || !items[0]?.url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    const manifest = await getManifest()
    const newPhotos: Photo[] = []

    for (const item of items) {
      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      const photo: Photo = {
        id,
        url: item.url,
        width: item.width || 0,
        height: item.height || 0,
        uploadedAt: new Date().toISOString(),
        metadata: item.metadata || {},
      }
      newPhotos.push(photo)
    }

    manifest.photos.unshift(...newPhotos)
    await saveManifest(manifest)

    return NextResponse.json(newPhotos, { status: 201 })
  } catch (error) {
    console.error('Register photo error:', error)
    return NextResponse.json(
      { error: 'Failed to register photos' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  const session = request.cookies.get(ADMIN_COOKIE)?.value
  if (!isValidSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const manifest = await getManifest()
    const photos = [...manifest.photos]

    if (photos.length === 0) {
      return NextResponse.json({ deleted: 0 })
    }

    await Promise.all(photos.map((photo) => del(photo.url).catch(() => {})))

    manifest.photos = []
    await saveManifest(manifest)

    return NextResponse.json({ deleted: photos.length })
  } catch (error) {
    console.error('Delete all error:', error)
    return NextResponse.json(
      { error: 'Failed to delete all photos' },
      { status: 500 },
    )
  }
}

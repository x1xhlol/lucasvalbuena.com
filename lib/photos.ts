import { list, put } from '@vercel/blob'
import { createHmac, timingSafeEqual } from 'crypto'

export interface PhotoMetadata {
  camera?: string
  lens?: string
  focalLength?: string
  aperture?: string
  shutterSpeed?: string
  iso?: number
  dateTaken?: string
  location?: string
}

export interface Photo {
  id: string
  url: string
  width: number
  height: number
  uploadedAt: string
  metadata: PhotoMetadata
}

export interface PhotoManifest {
  photos: Photo[]
}

const MANIFEST_PATH = 'photos/manifest.json'

export async function getManifest(): Promise<PhotoManifest> {
  try {
    const blobs = await list({ prefix: MANIFEST_PATH })
    const manifestBlob = blobs.blobs.find((b) => b.pathname === MANIFEST_PATH)
    if (!manifestBlob) return { photos: [] }

    const res = await fetch(manifestBlob.url, { cache: 'no-store' })
    if (!res.ok) return { photos: [] }
    return (await res.json()) as PhotoManifest
  } catch {
    return { photos: [] }
  }
}

export async function saveManifest(manifest: PhotoManifest): Promise<void> {
  await put(MANIFEST_PATH, JSON.stringify(manifest), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

const ADMIN_COOKIE = 'admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

function getSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ??
    process.env.PAYLOAD_SECRET ??
    (process.env.NODE_ENV === 'production' ? '' : 'dev-only-admin-session-secret')
  )
}

function signSession(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url')
}

export function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000
  const payload = String(expiresAt)
  return `${payload}.${signSession(payload)}`
}

export function isValidSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false

  const [payload, signature] = cookieValue.split('.')
  if (!payload || !signature || Number(payload) <= Date.now() || !getSessionSecret()) {
    return false
  }

  const expected = signSession(payload)
  if (signature.length !== expected.length) return false

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export { ADMIN_COOKIE, SESSION_TTL_SECONDS }

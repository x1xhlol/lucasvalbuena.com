import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'
import { isValidSession, ADMIN_COOKIE } from '@/lib/photos'
import { PHOTO_CONTENT_TYPES, MAX_PHOTO_SIZE } from '@/lib/photo-upload'

export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = request.cookies.get(ADMIN_COOKIE)?.value
        if (!isValidSession(session)) {
          throw new Error('Unauthorized')
        }

        return {
          allowedContentTypes: [...PHOTO_CONTENT_TYPES],
          maximumSizeInBytes: MAX_PHOTO_SIZE,
        }
      },
      onUploadCompleted: async () => {
        // Manifest updates happen in POST /api/photos
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    )
  }
}

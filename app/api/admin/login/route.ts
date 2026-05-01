import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, SESSION_TTL_SECONDS, createSessionToken } from '@/lib/photos'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (
      !process.env.ADMIN_PASSWORD ||
      (!process.env.ADMIN_SESSION_SECRET && !process.env.PAYLOAD_SECRET)
    ) {
      return NextResponse.json(
        { error: 'Admin authentication is not configured' },
        { status: 500 },
      )
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = createSessionToken()
    const response = NextResponse.json({ success: true })

    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

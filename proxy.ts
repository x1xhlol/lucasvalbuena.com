import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const CANONICAL_HOST = 'lucasvalbuena.com'

const REDIRECT_HOSTS = [
  'lucknite.dev',
  'www.lucknite.dev',
]

export function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0]

  if (host && REDIRECT_HOSTS.includes(host)) {
    const url = new URL(request.url)
    url.hostname = CANONICAL_HOST
    url.port = ''
    url.protocol = 'https:'
    return NextResponse.redirect(url, 308)
  }
}

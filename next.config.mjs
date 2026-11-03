import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Without this the dev server blocks its own /_next resources when reached
  // through a tunnel hostname, so the page renders but never hydrates.
  // Dev-only; has no effect on a production build.
  allowedDevOrigins: ['*.trycloudflare.com'],
  // Ask's entry points (nav, side rail, palette, sitemap) only appear when the
  // deployment has a key, rather than linking to an offline page
  env: {
    NEXT_PUBLIC_ASK_ENABLED: process.env.OPENROUTER_API_KEY ? '1' : '',
    // Same idea for "new posts by email": the form, the palette action, and
    // the privacy note only appear when the deployment can send
    NEXT_PUBLIC_NEWSLETTER_ENABLED:
      process.env.RESEND_API_KEY && process.env.RESEND_NEWSLETTER_SEGMENT_ID && process.env.NEWSLETTER_SECRET ? '1' : '',
  },
  // Fonts for the newsletter emails. Mail clients load them from another
  // origin, which web fonts only allow with a CORS header.
  async headers() {
    return [
      {
        source: '/email/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=31536000' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
    qualities: [75, 85, 90, 95, 100],
  },
}

export default withPayload(nextConfig)

import { withPayload } from '@payloadcms/next/withPayload'

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ['*.trycloudflare.com'],
  env: {
    NEXT_PUBLIC_ASK_ENABLED: process.env.OPENROUTER_API_KEY ? '1' : '',
    NEXT_PUBLIC_NEWSLETTER_ENABLED:
      process.env.RESEND_API_KEY && process.env.RESEND_NEWSLETTER_SEGMENT_ID && process.env.NEWSLETTER_SECRET ? '1' : '',
  },
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

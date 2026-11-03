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

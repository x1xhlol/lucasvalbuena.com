import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import '../globals.css'

import { ThemeProvider } from '@/components/theme-provider'
import { siteConfig } from '@/lib/site'

const geistSans = Geist({
  subsets: ["latin"],
  variable: '--font-geist-sans',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Lucas Valbuena',
  description:
    'Developer, Prompt Engineer & Open Source Contributor',
  keywords: [
    'Lucas Valbuena',
    'x1xhlol',
    'x1xhlol github',
    'system-prompts-and-models-of-ai-tools',
    'Prompt Engineering',
    'AI system prompts'
  ],
  authors: [{ name: 'Lucas Valbuena' }],
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Lucas Valbuena',
    description: 'Developer, Prompt Engineer & Open Source Contributor',
    siteName: 'Lucas Valbuena',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lucas Valbuena',
    description: 'Developer, Prompt Engineer & Open Source Contributor',
    creator: '@NotLucknite',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-light.svg', media: '(prefers-color-scheme: dark)', type: 'image/svg+xml' },
      { url: '/icons/favicon-dark.svg', media: '(prefers-color-scheme: light)', type: 'image/svg+xml' },
      { url: '/icons/favicon-dark.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icons/favicon-dark.svg',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Lucas Valbuena',
  alternateName: 'x1xhlol',
  url: siteConfig.url,
  sameAs: [
    'https://github.com/x1xhlol',
    'https://x.com/NotLucknite',
    'https://linkedin.com/in/lucknite'
  ],
  jobTitle: 'Developer & Prompt Engineer',
  description:
    'Developer, Prompt Engineer & Open Source Contributor',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}

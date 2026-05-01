import { GeistPixelSquare } from 'geist/font/pixel'

export default function PhotosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <link rel="preconnect" href="https://xobhe5j5syssmps0.public.blob.vercel-storage.com" />
      <div className={GeistPixelSquare.className}>
        {children}
      </div>
    </>
  )
}

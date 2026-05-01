import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// OG image palette lines up with .dark in globals.css
const bg = '#383838'
const fg = '#f2f2f2'
const border = '#454545'

// Satori won't load WOFF2; ship Geist TTFs in-repo.
async function loadFonts() {
  const dir = join(process.cwd(), 'app', '(frontend)', 'fonts')
  const sans600 = await readFile(join(dir, 'Geist-SemiBold.ttf'))
  return { sans600 }
}

export const alt = 'Lucas Valbuena'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Need node:fs to read font files below.
export const runtime = 'nodejs'

export default async function Image() {
  const { sans600 } = await loadFonts()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: bg,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(to right, ${border} 1px, transparent 1px),
              linear-gradient(to bottom, ${border} 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            opacity: 0.35,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 48,
            border: `1px solid ${border}`,
            borderRadius: 12,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            bottom: 72,
            left: 72,
            fontFamily: 'Geist',
            fontSize: 76,
            fontWeight: 600,
            letterSpacing: '-0.035em',
            lineHeight: 1.02,
            color: fg,
          }}
        >
          Lucas Valbuena
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Geist',
          data: sans600,
          style: 'normal',
          weight: 600,
        },
      ],
    },
  )
}

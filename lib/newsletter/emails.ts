import { siteConfig } from '@/lib/site'

const SITE = siteConfig.url.replace(/\/$/, '')
const HOST = new URL(SITE).host

const C = {
  bg: '#ffffff',
  fg: '#1f1f1f',
  body: '#2b2b2b',
  muted: '#696969',
  rule: '#e3e3e3',
  buttonText: '#fcfcfc',
  dBg: '#0a0a0a',
  dFg: '#e4e4e4',
  dBody: '#d4d4d4',
  dMuted: '#a1a1a1',
  dRule: '#2e2e2e',
  dButtonText: '#0a0a0a',
}

const SANS = `'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
const PIXEL = `'Geist Pixel', ${SANS}`

const WIDTH = 560
const GUTTER = 32

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ENTITIES[c])

function preheader(text: string) {
  const filler = '&#847;&zwnj;&nbsp;'.repeat(90)
  return `<div style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.bg};opacity:0;">${escapeHtml(text)}${filler}</div>`
}

function button(href: string, label: string, width: number) {
  const url = escapeHtml(href)
  const text = escapeHtml(label)
  return `<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:${width}px;" arcsize="50%" stroke="f" fillcolor="${C.fg}">
<w:anchorlock/>
<center style="color:${C.buttonText};font-family:Arial,sans-serif;font-size:15px;font-weight:600;">${text}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-- -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
  <tr>
    <td class="btn" bgcolor="${C.fg}" style="border-radius:999px;background-color:${C.fg};">
      <a class="btn-link" href="${url}" target="_blank" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-size:15px;font-weight:500;line-height:20px;color:${C.buttonText};text-decoration:none;border-radius:999px;">${text}</a>
    </td>
  </tr>
</table>
<!--<![endif]-->`
}

function fontFace() {
  return `@font-face { font-family: 'Geist'; font-style: normal; font-weight: 400; src: url('${SITE}/email/Geist-Regular.woff2') format('woff2'); }
    @font-face { font-family: 'Geist'; font-style: normal; font-weight: 500; src: url('${SITE}/email/Geist-Medium.woff2') format('woff2'); }
    @font-face { font-family: 'Geist Pixel'; font-style: normal; font-weight: 400; src: url('${SITE}/email/GeistPixel-Square.woff2') format('woff2'); }`
}

function layout({ title, preview, content, footer }: { title: string; preview: string; content: string; footer: string }) {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <style>table, td, div, p, a, h1 { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
  <style>
    ${fontFace()}
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    u + #body a { color: inherit; text-decoration: none; font-size: inherit; font-family: inherit; font-weight: inherit; line-height: inherit; }
    .link { text-decoration: underline; text-underline-offset: 3px; }
    @media only screen and (max-width: 600px) {
      .gutter { padding-left: 24px !important; padding-right: 24px !important; }
      .top { padding-top: 36px !important; }
      .title { font-size: 21px !important; line-height: 28px !important; }
    }
    @media (prefers-color-scheme: dark) {
      .bg { background-color: ${C.dBg} !important; }
      .fg { color: ${C.dFg} !important; }
      .body { color: ${C.dBody} !important; }
      .muted { color: ${C.dMuted} !important; }
      .rule { border-color: ${C.dRule} !important; }
      .btn { background-color: ${C.dFg} !important; }
      .btn-link { color: ${C.dButtonText} !important; }
      .shot { border-color: rgba(255,255,255,0.1) !important; }
    }
    [data-ogsc] .fg { color: ${C.dFg} !important; }
    [data-ogsc] .body { color: ${C.dBody} !important; }
    [data-ogsc] .muted { color: ${C.dMuted} !important; }
    [data-ogsb] .bg { background-color: ${C.dBg} !important; }
  </style>
</head>
<body id="body" class="bg" style="margin:0;padding:0;width:100%;background-color:${C.bg};-webkit-font-smoothing:antialiased;">
  ${preheader(preview)}
  <div role="article" aria-roledescription="email" aria-label="${escapeHtml(title)}" lang="en" dir="ltr">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" bgcolor="${C.bg}" style="width:100%;background-color:${C.bg};">
    <tr>
      <td align="center" style="padding:0;">
        <!--[if mso]><table role="presentation" width="${WIDTH}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${WIDTH}px;margin:0 auto;">
          <tr>
            <td class="gutter top" style="padding:48px ${GUTTER}px 0 ${GUTTER}px;">
              <a href="${SITE}" target="_blank" class="fg" style="font-family:${PIXEL};font-size:15px;line-height:20px;color:${C.fg};text-decoration:none;">Lucas Valbuena</a>
            </td>
          </tr>
          <tr>
            <td class="gutter" style="padding:36px ${GUTTER}px 0 ${GUTTER}px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td class="gutter" style="padding:40px ${GUTTER}px 48px ${GUTTER}px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="rule" style="border-top:1px dashed ${C.rule};padding-top:24px;font-family:${SANS};font-size:13px;line-height:20px;">
                    ${footer}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
  </div>
</body>
</html>`
}

function heading(text: string, href?: string) {
  const inner = href
    ? `<a href="${escapeHtml(href)}" target="_blank" class="fg" style="color:${C.fg};text-decoration:none;">${escapeHtml(text)}</a>`
    : escapeHtml(text)
  return `<h1 class="fg title" style="margin:0;font-family:${SANS};font-size:22px;line-height:30px;font-weight:500;letter-spacing:-0.01em;color:${C.fg};">${inner}</h1>`
}

function paragraph(html: string, top = 16) {
  return `<p class="body" style="margin:${top}px 0 0 0;font-family:${SANS};font-size:16px;line-height:26px;color:${C.body};">${html}</p>`
}

function mutedLink(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" target="_blank" class="muted link" style="color:${C.muted};text-decoration:underline;">${escapeHtml(label)}</a>`
}

function linkRow(links: [href: string, label: string][]) {
  const cells = links
    .map(([href, label], i) => `<td style="padding:0 ${i === links.length - 1 ? 0 : 20}px 0 0;font-family:${SANS};font-size:13px;line-height:20px;">${mutedLink(href, label)}</td>`)
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;"><tr>${cells}</tr></table>`
}

export function formatPostDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Europe/Madrid' }).format(date)
}

export type PostEmailInput = {
  title: string
  excerpt: string
  slug: string
  publishedAt?: string | null
  cover?: { url: string; alt?: string | null; width?: number | null; height?: number | null } | null
}

export type RenderedEmail = { subject: string; html: string; text: string }

export const UNSUBSCRIBE_PLACEHOLDER = '{{{RESEND_UNSUBSCRIBE_URL}}}'

export function postUrl(slug: string) {
  return `${SITE}/blog/${encodeURIComponent(slug)}`
}

export function renderPostEmail(post: PostEmailInput, unsubscribeUrl = UNSUBSCRIBE_PLACEHOLDER): RenderedEmail {
  const url = postUrl(post.slug)
  const date = formatPostDate(post.publishedAt)
  const contentWidth = WIDTH - GUTTER * 2

  const cover = post.cover?.url
    ? `<tr><td style="padding:24px 0 0 0;">
        <a href="${escapeHtml(url)}" target="_blank" style="text-decoration:none;">
          <img class="shot" src="${escapeHtml(post.cover.url)}" alt="${escapeHtml(post.cover.alt ?? '')}" width="${contentWidth}" style="display:block;width:100%;max-width:${contentWidth}px;height:auto;border:1px solid rgba(0,0,0,0.08);border-radius:10px;">
        </a>
      </td></tr>`
    : ''

  const content = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td>
      ${date ? `<p class="muted" style="margin:0 0 8px 0;font-family:${SANS};font-size:14px;line-height:20px;color:${C.muted};">${escapeHtml(date)}</p>` : ''}
      ${heading(post.title, url)}
    </td></tr>
    ${cover}
    <tr><td>
      ${paragraph(escapeHtml(post.excerpt), 16)}
    </td></tr>
    <tr><td style="padding:28px 0 0 0;">
      ${button(url, 'Read the post →', 172)}
    </td></tr>
  </table>`

  const footer = `<p class="muted" style="margin:0;color:${C.muted};">You're getting this because you subscribed at ${mutedLink(SITE, HOST)}.</p>
    ${linkRow([
      [unsubscribeUrl, 'Unsubscribe'],
      [`${SITE}/blog/rss.xml`, 'RSS'],
      [`${SITE}/privacy`, 'Privacy'],
    ])}`

  const html = layout({ title: post.title, preview: post.excerpt, content, footer })

  const text = [
    post.title,
    ...(date ? [date] : []),
    '',
    post.excerpt,
    '',
    `Read the post: ${url}`,
    '',
    '---',
    `You're getting this because you subscribed at ${HOST}.`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n')

  return { subject: post.title, html, text }
}

export function renderConfirmEmail(confirmUrl: string): RenderedEmail {
  const content = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td>
      ${heading('Confirm your subscription')}
      ${paragraph(`You asked to get new posts from ${escapeHtml(HOST)} by email. Confirm below and you'll get one short email whenever a new post goes up. The link works for 48 hours.`, 12)}
    </td></tr>
    <tr><td style="padding:28px 0 0 0;">
      ${button(confirmUrl, 'Confirm subscription', 206)}
    </td></tr>
    <tr><td style="padding:28px 0 0 0;">
      <p class="muted" style="margin:0;font-family:${SANS};font-size:14px;line-height:22px;color:${C.muted};">If the button doesn't work, open this link:</p>
      <p style="margin:4px 0 0 0;font-family:${SANS};font-size:13px;line-height:20px;word-break:break-all;">${mutedLink(confirmUrl, confirmUrl)}</p>
    </td></tr>
  </table>`

  const footer = `<p class="muted" style="margin:0;color:${C.muted};">If this wasn't you, ignore this email. Nothing happens unless you confirm.</p>`

  const html = layout({
    title: 'Confirm your subscription',
    preview: `One click and you'll get new posts from ${HOST} by email.`,
    content,
    footer,
  })

  const text = [
    'Confirm your subscription',
    '',
    `You asked to get new posts from ${HOST} by email. Open this link to confirm, and you'll get one short email whenever a new post goes up. It works for 48 hours.`,
    '',
    confirmUrl,
    '',
    '---',
    "If this wasn't you, ignore this email. Nothing happens unless you confirm.",
  ].join('\n')

  return { subject: 'Confirm your subscription', html, text }
}

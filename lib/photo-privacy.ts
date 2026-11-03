// Photos go up with their camera details but never with where they were
// taken. stripLocation removes GPS from a photo's bytes before it leaves the
// browser: the GPS directory in every EXIF block is zeroed in place and GPS
// fields in XMP are overwritten with spaces. Nothing is re-encoded, so the
// pixels, the file length, and every other tag (orientation included) stay as
// they were. Covers JPEG, HEIF/AVIF, WebP, and PNG.

type Range = [start: number, end: number]

// Tag in IFD0 that points to the GPS directory
const GPS_POINTER = 0x8825
// Bytes per value for each TIFF field type, by type number
const TYPE_SIZES = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8, 4, 0, 0, 8, 8, 8]

const ascii = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0))
const EXIF_HEADER = ascii('Exif\0\0')
const XMP_START = ascii('<x:xmpmeta')
const XMP_END = ascii('</x:xmpmeta>')
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

// Self-closing elements first, so the element pattern can't run from one of
// them to a later closing tag
const XMP_GPS = [
  /<[\w.-]+:gps[\w.-]*\b[^>]*\/>/gi,
  /<([\w.-]+:gps[\w.-]*)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
  /\s[\w.-]+:gps[\w.-]*\s*=\s*(?:"[^"]*"|'[^']*')/gi,
]

function find(bytes: Uint8Array, pattern: Uint8Array, from = 0): number {
  for (let at = bytes.indexOf(pattern[0], from); at !== -1; at = bytes.indexOf(pattern[0], at + 1)) {
    if (at + pattern.length > bytes.length) return -1
    let matched = 1
    while (matched < pattern.length && bytes[at + matched] === pattern[matched]) matched++
    if (matched === pattern.length) return at
  }
  return -1
}

function startsWith(bytes: Uint8Array, at: number, pattern: ArrayLike<number>): boolean {
  for (let i = 0; i < pattern.length; i++) if (bytes[at + i] !== pattern[i]) return false
  return true
}

const fourCC = (bytes: Uint8Array, at: number) => String.fromCharCode(...bytes.subarray(at, at + 4))

// Zeroes the GPS directory of the TIFF structure EXIF uses, starting at
// `tiff` and ending before `end`, along with every value it points to
function blankGps(bytes: Uint8Array, tiff: number, end: number, changed: Range[]) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const fits = (at: number, length: number) => at >= tiff && length >= 0 && at + length <= end
  if (!fits(tiff, 8)) return
  const order = view.getUint16(tiff)
  if (order !== 0x4949 && order !== 0x4d4d) return
  const little = order === 0x4949
  const u16 = (at: number) => view.getUint16(at, little)
  const u32 = (at: number) => view.getUint32(at, little)
  if (u16(tiff + 2) !== 42) return

  const zero = (at: number, length: number) => {
    bytes.fill(0, at, at + length)
    changed.push([at, at + length])
  }
  const blankDirectory = (at: number) => {
    if (!fits(at, 2)) return
    const count = u16(at)
    const length = 2 + count * 12 + 4
    if (!fits(at, length)) return
    for (let i = 0; i < count; i++) {
      const entry = at + 2 + i * 12
      const size = (TYPE_SIZES[u16(entry + 2)] ?? 0) * u32(entry + 4)
      // Values over four bytes live elsewhere, at the offset in the entry
      if (size > 4 && fits(tiff + u32(entry + 8), size)) zero(tiff + u32(entry + 8), size)
    }
    // An empty directory: no entries and no next directory
    zero(at, length)
  }

  // The pointer belongs in IFD0; IFD1, the thumbnail's, is checked as well
  let directory = u32(tiff + 4)
  for (let hop = 0; directory && hop < 2; hop++) {
    const at = tiff + directory
    if (!fits(at, 2)) return
    const count = u16(at)
    if (!fits(at, 2 + count * 12 + 4)) return
    for (let i = 0; i < count; i++) {
      const entry = at + 2 + i * 12
      if (u16(entry) === GPS_POINTER) blankDirectory(tiff + u32(entry + 8))
    }
    directory = u32(at + 2 + count * 12)
  }
}

// Where each EXIF block's TIFF structure starts, and where its container ends
function exifBlocks(bytes: Uint8Array): Range[] {
  const blocks: Range[] = []
  // JPEG APP1 segments and HEIF Exif items both open with "Exif\0\0"
  for (let at = find(bytes, EXIF_HEADER); at !== -1; at = find(bytes, EXIF_HEADER, at + 1)) {
    const tiff = at + EXIF_HEADER.length
    const isJpegSegment = at >= 4 && bytes[at - 4] === 0xff && bytes[at - 3] === 0xe1
    const end = isJpegSegment ? at - 2 + ((bytes[at - 2] << 8) | bytes[at - 1]) : bytes.length
    blocks.push([tiff, Math.min(end, bytes.length)])
  }
  // PNG eXIf and WebP EXIF chunks can hold the TIFF structure with no header
  for (const [type, start, end] of chunks(bytes)) {
    if ((type === 'eXIf' || type === 'EXIF') && !startsWith(bytes, start, EXIF_HEADER)) blocks.push([start, end])
  }
  return blocks
}

// PNG and WebP chunks as [type, data start, data end]
function chunks(bytes: Uint8Array): [string, number, number][] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const found: [string, number, number][] = []
  if (startsWith(bytes, 0, PNG_SIGNATURE)) {
    for (let at = 8; at + 12 <= bytes.length; ) {
      const length = view.getUint32(at)
      const end = at + 8 + length
      if (end + 4 > bytes.length) break
      found.push([fourCC(bytes, at + 4), at + 8, end])
      at = end + 4
    }
  } else if (fourCC(bytes, 0) === 'RIFF' && fourCC(bytes, 8) === 'WEBP') {
    for (let at = 12; at + 8 <= bytes.length; ) {
      const length = view.getUint32(at + 4, true)
      const end = at + 8 + length
      if (end > bytes.length) break
      found.push([fourCC(bytes, at), at + 8, end])
      at = end + (length % 2)
    }
  }
  return found
}

function blankXmpGps(bytes: Uint8Array, changed: Range[]) {
  // One character per byte, so string positions are byte positions
  const decoder = new TextDecoder('latin1')
  for (let start = find(bytes, XMP_START); start !== -1; start = find(bytes, XMP_START, start + 1)) {
    const close = find(bytes, XMP_END, start)
    if (close === -1) return
    const end = close + XMP_END.length
    const packet = decoder.decode(bytes.subarray(start, end))
    for (const pattern of XMP_GPS) {
      for (const match of packet.matchAll(pattern)) {
        const at = start + match.index
        // Spaces keep the packet valid XML and the same length
        bytes.fill(0x20, at, at + match[0].length)
        changed.push([at, at + match[0].length])
      }
    }
  }
}

let crcTable: Uint32Array | undefined
function crc32(bytes: Uint8Array): number {
  crcTable ??= Uint32Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// A copy of the photo without its location. The input is left untouched.
export function stripLocation(input: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  const bytes = input.slice()
  const changed: Range[] = []
  for (const [tiff, end] of exifBlocks(bytes)) blankGps(bytes, tiff, end, changed)
  blankXmpGps(bytes, changed)

  // PNG chunks carry a checksum over their type and data
  if (changed.length && startsWith(bytes, 0, PNG_SIGNATURE)) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    for (const [, start, end] of chunks(bytes)) {
      if (changed.some(([from, to]) => from < end && to > start)) {
        view.setUint32(end, crc32(bytes.subarray(start - 4, end)))
      }
    }
  }
  return bytes
}

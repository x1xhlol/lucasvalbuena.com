'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { upload } from '@vercel/blob/client'
import { Upload, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Photo, PhotoMetadata } from '@/lib/photos'
import { PHOTO_CONTENT_TYPES, MAX_PHOTO_SIZE } from '@/lib/photo-upload'
import { stripLocation } from '@/lib/photo-privacy'

interface PhotoUploadProps {
  onUploaded: (photo: Photo) => void
}

type UploadedPhoto = Pick<Photo, 'url' | 'metadata' | 'width' | 'height'>

interface PreviewFile {
  file: File
  preview: string
  uploaded?: UploadedPhoto
}

function dmsToDecimal(parts: number[]): number {
  const [deg = 0, min = 0, sec = 0] = parts
  return deg + min / 60 + sec / 3600
}

function normalizeCoordinate(value: unknown, ref: unknown, negativeRef: 'S' | 'W'): number | undefined {
  if (typeof value === 'number') return value

  if (Array.isArray(value) && value.every((part) => typeof part === 'number')) {
    const decimal = dmsToDecimal(value)
    if (typeof ref === 'string' && ref.toUpperCase() === negativeRef) return -decimal
    return decimal
  }

  return undefined
}

function formatLocationFromExif(exif: Record<string, unknown>): string | undefined {
  const latitude = normalizeCoordinate(
    exif.latitude ?? exif.GPSLatitude,
    exif.GPSLatitudeRef,
    'S',
  )
  const longitude = normalizeCoordinate(
    exif.longitude ?? exif.GPSLongitude,
    exif.GPSLongitudeRef,
    'W',
  )

  if (latitude === undefined || longitude === undefined) return undefined

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

async function extractMetadata(file: File): Promise<{
  metadata: PhotoMetadata
  width: number
  height: number
}> {
  let metadata: PhotoMetadata = {}
  let width = 0
  let height = 0

  try {
    const { default: exifr } = await import('exifr')
    const exif = await exifr.parse(file, {
      pick: [
        'Make', 'Model', 'LensModel', 'LensMake',
        'FocalLength', 'FNumber', 'ExposureTime',
        'ISO', 'ISOSpeedRatings', 'DateTimeOriginal',
        'latitude', 'longitude', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
        'ExifImageWidth', 'ExifImageHeight', 'ImageWidth', 'ImageHeight',
      ],
    })

    if (exif) {
      const cameraMake = exif.Make ? String(exif.Make).trim() : ''
      const cameraModel = exif.Model ? String(exif.Model).trim() : ''
      const camera = cameraModel.toLowerCase().startsWith(cameraMake.toLowerCase())
        ? cameraModel
        : [cameraMake, cameraModel].filter(Boolean).join(' ')

      const lensMake = exif.LensMake ? String(exif.LensMake).trim() : ''
      const lensModel = exif.LensModel ? String(exif.LensModel).trim() : ''
      const lens = lensModel.toLowerCase().startsWith(lensMake.toLowerCase())
        ? lensModel
        : [lensMake, lensModel].filter(Boolean).join(' ')
      const location = formatLocationFromExif(exif as Record<string, unknown>)

      metadata = {
        ...(camera && { camera }),
        ...(lens && { lens }),
        ...(exif.FocalLength && { focalLength: `${Math.round(exif.FocalLength)}mm` }),
        ...(exif.FNumber && { aperture: `f/${Math.round(exif.FNumber * 10) / 10}` }),
        ...(exif.ExposureTime && {
          shutterSpeed: exif.ExposureTime >= 1
            ? `${exif.ExposureTime}s`
            : `1/${Math.round(1 / exif.ExposureTime)}s`,
        }),
        ...((exif.ISO || exif.ISOSpeedRatings) && {
          iso: exif.ISO || exif.ISOSpeedRatings,
        }),
        ...(exif.DateTimeOriginal && {
          dateTaken: new Date(exif.DateTimeOriginal).toISOString(),
        }),
        ...(location && { location }),
      }

      width = exif.ExifImageWidth || exif.ImageWidth || 0
      height = exif.ExifImageHeight || exif.ImageHeight || 0
    }
  } catch {
  }

  if (!width || !height) {
    try {
      const dims = await getImageDimensions(file)
      width = dims.width
      height = dims.height
    } catch {
    }
  }

  return { metadata, width, height }
}

async function withoutLocation(file: File): Promise<File> {
  const bytes = stripLocation(new Uint8Array(await file.arrayBuffer()))
  const { default: exifr } = await import('exifr')
  const gps = await exifr.gps(bytes).catch(() => undefined)
  if (gps?.latitude != null) throw new Error(`GPS left in ${file.name}`)
  return new File([bytes], file.name, { type: file.type, lastModified: file.lastModified })
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

export function PhotoUpload({ onUploaded }: PhotoUploadProps) {
  const [files, setFiles] = useState<PreviewFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrlsRef = useRef(new Set<string>())

  useEffect(() => {
    const urls = previewUrlsRef.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    if (uploading) return
    const imageFiles = Array.from(newFiles).filter((file) =>
      PHOTO_CONTENT_TYPES.some((type) => type === file.type) && file.size <= MAX_PHOTO_SIZE,
    )
    if (imageFiles.length !== newFiles.length) {
      toast.error('Some files were skipped. Choose JPG, PNG, WebP, HEIF, or AVIF images up to 500 MB each.')
    }
    const previews = imageFiles.map((file) => {
      const preview = URL.createObjectURL(file)
      previewUrlsRef.current.add(preview)
      return { file, preview }
    })
    setFiles((previous) => [...previous, ...previews])
  }, [uploading])

  function releasePreview(preview: string) {
    URL.revokeObjectURL(preview)
    previewUrlsRef.current.delete(preview)
  }

  function removeFile(preview: string) {
    releasePreview(preview)
    setFiles((previous) => previous.filter((file) => file.preview !== preview))
  }

  const handleUpload = async () => {
    if (!files.length || uploading) return
    setUploading(true)

    async function uploadPhoto(preview: PreviewFile): Promise<UploadedPhoto> {
      if (preview.uploaded) return preview.uploaded
      const { file } = preview
      const { metadata, width, height } = await extractMetadata(file)
      const clean = await withoutLocation(file).catch((error: unknown) => {
        toast.error(`Could not remove the location from ${file.name}, so it was not uploaded.`)
        throw error
      })
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const blob = await upload(`photos/${crypto.randomUUID()}.${ext}`, clean, {
        access: 'public',
        handleUploadUrl: '/api/photos/upload',
      })
      return { url: blob.url, metadata, width, height }
    }

    try {
      const results: PromiseSettledResult<UploadedPhoto>[] = []
      for (let offset = 0; offset < files.length; offset += 3) {
        results.push(...await Promise.allSettled(files.slice(offset, offset + 3).map(uploadPhoto)))
      }
      const queued = files.map((file, index) => {
        const result = results[index]
        return result.status === 'fulfilled' ? { ...file, uploaded: result.value } : file
      })
      setFiles(queued)

      const uploaded = queued.flatMap((file) => file.uploaded ? [file.uploaded] : [])
      const failedCount = queued.length - uploaded.length
      if (failedCount) {
        toast.error(`${failedCount} photo${failedCount === 1 ? '' : 's'} could not upload. They are still selected so you can try again.`)
      }
      if (!uploaded.length) return

      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploaded),
      })
      if (!res.ok) throw new Error('Photos could not be saved')
      const photos: Photo[] = await res.json()
      photos.forEach(onUploaded)
      queued.filter((file) => file.uploaded).forEach((file) => releasePreview(file.preview))
      setFiles(queued.filter((file) => !file.uploaded))
      toast.success(`${photos.length} photo${photos.length === 1 ? '' : 's'} added to your gallery`)
    } catch {
      toast.error('Could not save the photos to your gallery. Your selection is still here; try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6" aria-busy={uploading}>
      <button
        type="button"
        disabled={uploading}
        aria-labelledby="photo-upload-label"
        aria-describedby="photo-upload-formats"
        onDragOver={(event) => {
          event.preventDefault()
          if (!uploading) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          addFiles(event.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 transition-[border-color,background-color] duration-150 disabled:cursor-wait sm:p-10',
          dragOver ? 'border-foreground bg-muted' : 'border-input hover:border-foreground hover:bg-muted/40',
        )}
      >
        <Upload className="size-6 text-muted-foreground" aria-hidden />
        <span id="photo-upload-label" className="text-base font-medium text-foreground">
          Choose photos or drop them here
        </span>
        <span id="photo-upload-formats" className="text-sm text-muted-foreground">
          JPG, PNG, WebP, HEIF, or AVIF. Up to 500 MB per photo.
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_CONTENT_TYPES.join(',')}
        multiple
        disabled={uploading}
        aria-label="Choose photos"
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) addFiles(event.target.files)
          event.target.value = ''
        }}
      />

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p role="status" className="text-sm text-muted-foreground tabular-nums">
              {files.length} photo{files.length === 1 ? '' : 's'} selected
            </p>
            <Button
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => {
                files.forEach((file) => releasePreview(file.preview))
                setFiles([])
              }}
            >
              Clear all
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {files.map((file) => (
              <figure key={file.preview} className="relative min-w-0">
                <img
                  src={file.preview}
                  alt=""
                  loading="lazy"
                  className="image-outline block aspect-square w-full rounded-lg bg-muted object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remove ${file.file.name}`}
                  disabled={uploading}
                  onClick={() => removeFile(file.preview)}
                  className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-full bg-black/70 text-white transition-[background-color,scale] duration-150 hover:bg-black/85 motion-safe:active:scale-[0.97] disabled:cursor-wait"
                >
                  <X className="size-4" aria-hidden />
                </button>
                <figcaption title={file.file.name} className="mt-2 truncate text-xs text-muted-foreground">
                  {file.file.name}
                </figcaption>
              </figure>
            ))}
          </div>

          <Button onClick={handleUpload} disabled={uploading} className="h-11 w-full">
            {uploading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Upload className="size-4" aria-hidden />}
            {uploading ? 'Uploading…' : `Upload ${files.length} photo${files.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      )}
    </div>
  )
}

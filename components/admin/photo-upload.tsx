'use client'

import { useState, useRef, useCallback } from 'react'
import { upload } from '@vercel/blob/client'
import exifr from 'exifr'
import { Upload, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Photo, PhotoMetadata } from '@/lib/photos'

interface PhotoUploadProps {
  onUploaded: (photo: Photo) => void
}

interface PreviewFile {
  file: File
  preview: string
}

function dmsToDecimal(parts: number[]): number {
  const [deg = 0, min = 0, sec = 0] = parts
  return deg + min / 60 + sec / 3600
}

function normalizeCoordinate(value: unknown, ref: unknown, negativeRef: 'S' | 'W'): number | undefined {
  if (typeof value === 'number') return value

  if (Array.isArray(value) && value.every((part) => typeof part === 'number')) {
    const decimal = dmsToDecimal(value as number[])
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
  } catch {}

  if (!width || !height) {
    try {
      const dims = await getImageDimensions(file)
      width = dims.width
      height = dims.height
    } catch {}
  }

  return { metadata, width, height }
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

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter((f) =>
      f.type.startsWith('image/'),
    )
    const previews: PreviewFile[] = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setFiles((prev) => [...prev, ...previews])
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const removed = prev[index]
      URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  const handleUpload = async () => {
    if (!files.length) return
    setUploading(true)

    const results = await Promise.allSettled(
      files.map(async ({ file }) => {
        const { metadata, width, height } = await extractMetadata(file)

        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const id = Math.random().toString(36).slice(2, 14)
        const blob = await upload(`photos/${id}.${ext}`, file, {
          access: 'public',
          handleUploadUrl: '/api/photos/upload',
        })

        return { url: blob.url, metadata, width, height }
      }),
    )

    const succeeded = results
      .filter((r): r is PromiseFulfilledResult<{ url: string; metadata: PhotoMetadata; width: number; height: number }> => r.status === 'fulfilled')
      .map((r) => r.value)

    const failCount = results.length - succeeded.length
    if (failCount > 0) {
      toast.error(`${failCount} photo${failCount > 1 ? 's' : ''} failed to upload`)
    }

    if (succeeded.length > 0) {
      try {
        const res = await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(succeeded),
        })

        if (!res.ok) {
          const data = await res.json()
          toast.error(`Failed to save photos: ${data.error}`)
        } else {
          const photos: Photo[] = await res.json()
          photos.forEach((p) => onUploaded(p))
          toast.success(
            `${photos.length} photo${photos.length > 1 ? 's' : ''} uploaded`,
          )
        }
      } catch {
        toast.error('Failed to save photos')
      }
    }

    files.forEach((f) => URL.revokeObjectURL(f.preview))
    setFiles([])
    setUploading(false)
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer',
          'flex flex-col items-center justify-center gap-3 p-10',
          dragOver
            ? 'border-foreground/30 bg-muted/20'
            : 'border-border hover:border-foreground/15 hover:bg-muted/10',
        )}
      >
        <div className="w-12 h-12 rounded-full border border-border bg-muted/20 flex items-center justify-center">
          <Upload className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Drop photos here or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG, WebP, HEIF - up to 500 MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-mono">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                files.forEach((f) => URL.revokeObjectURL(f.preview))
                setFiles([])
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((pf, i) => (
              <div
                key={i}
                className="relative group rounded-lg overflow-hidden border border-border bg-muted/10"
              >
                <img
                  src={pf.preview}
                  alt=""
                  className="w-full h-auto block"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(i)
                  }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5">
                  <p className="text-[10px] font-mono text-white/70 truncate">
                    {pf.file.name}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full h-11 rounded-lg font-medium"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {files.length} photo{files.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

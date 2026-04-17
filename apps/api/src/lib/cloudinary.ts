import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

export const cloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret)

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })
}

export const CLOUDINARY_SIZE_LIMIT = 1024 * 1024 // 1 MB — files above this are NOT uploaded

export interface CloudinaryUpload {
  publicId: string
  secureUrl: string
  resourceType: 'image' | 'raw' | 'video' | 'auto'
  bytes: number
  format?: string
}

function cloudinaryFolder() {
  return process.env.CLOUDINARY_FOLDER || 'taxos/documents'
}

/**
 * Upload a file buffer to Cloudinary. `resource_type: auto` lets Cloudinary
 * detect PDFs, images, CSVs, text, etc. Returns the public id + secure url.
 */
export function uploadBufferToCloudinary(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<CloudinaryUpload> {
  if (!cloudinaryConfigured) {
    return Promise.reject(new Error('Cloudinary is not configured (missing CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET env vars)'))
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: cloudinaryFolder(),
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        filename_override: fileName,
      },
      (err: Error | undefined, result: UploadApiResponse | undefined) => {
        if (err) return reject(err)
        if (!result) return reject(new Error('Cloudinary returned no result'))
        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          resourceType: (result.resource_type as CloudinaryUpload['resourceType']) ?? 'auto',
          bytes: result.bytes ?? buffer.length,
          format: result.format,
        })
      },
    )
    stream.end(buffer)
  })
}

/**
 * Generate a download URL that forces an attachment download when opened.
 * Works for all resource types via the `fl_attachment` flag.
 */
export function buildDownloadUrl(secureUrl: string, fileName?: string): string {
  if (!secureUrl) return secureUrl
  try {
    const url = new URL(secureUrl)
    const safeName = fileName?.replace(/[^a-zA-Z0-9_.-]/g, '_')
    const flag = safeName ? `fl_attachment:${safeName.replace(/\.[^.]+$/, '')}` : 'fl_attachment'
    // Insert the flag after /upload/ in the cloudinary url path.
    url.pathname = url.pathname.replace(/\/upload\//, `/upload/${flag}/`)
    return url.toString()
  } catch {
    return secureUrl
  }
}

export async function deleteFromCloudinary(
  publicId: string,
  resourceType: CloudinaryUpload['resourceType'] = 'auto',
): Promise<void> {
  if (!cloudinaryConfigured) return
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType === 'auto' ? 'raw' : resourceType,
    invalidate: true,
  })
}

/**
 * Download a previously-uploaded asset from Cloudinary back into a buffer.
 * Used to retry extraction when we no longer hold the original file in memory.
 */
export async function fetchFromCloudinary(secureUrl: string): Promise<Buffer> {
  const res = await fetch(secureUrl)
  if (!res.ok) throw new Error(`Cloudinary fetch failed: ${res.status} ${res.statusText}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

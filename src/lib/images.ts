import { IMAGE_BUCKET, supabase } from './supabase'

export function imageUrl(path: string): string {
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024

/** Shrinks the photo in the browser to about 1200px WebP, so the free 1GB lasts. */
async function shrink(file: File): Promise<Blob> {
  const { default: imageCompression } = await import('browser-image-compression')
  // Re-wrap the photo as a File from this page. The library rejects files it doesn't recognise with
  // "The file given is not an instance of Blob or File", which can happen with photos handed over
  // by in-app browsers (Messenger, Facebook) or some phone photo pickers.
  const local = new File([file], file.name || 'photo', { type: file.type || 'image/jpeg' })
  return imageCompression(local, {
    maxWidthOrHeight: 1200,
    maxSizeMB: 0.25,
    fileType: 'image/webp',
    useWebWorker: true,
  })
}

/** Uploads a shrunk copy. If shrinking fails, uploads the original when it's small enough. */
export async function uploadImage(file: File): Promise<string> {
  let body: Blob
  let ext = 'webp'
  try {
    body = await shrink(file)
  } catch (err) {
    console.warn('Photo compression failed, trying the original file', err)
    if (file.size > MAX_ORIGINAL_BYTES)
      throw new Error(`Couldn't shrink "${file.name}" and it's too big to upload as is (over 5 MB). Try a JPG or PNG, or a smaller photo.`)
    body = file
    ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
  }
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, body, { contentType: body.type || 'image/jpeg', cacheControl: '31536000' })
  if (error) throw error
  return path
}

export async function deleteImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(paths)
  if (error) throw error
}

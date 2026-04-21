import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ApiError } from './errors'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ACCEPTED_INPUT_MIMES = ['image/jpeg', 'image/png'] as const
export const ACCEPTED_OUTPUT_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type InputMime = (typeof ACCEPTED_INPUT_MIMES)[number]
export type OutputMime = (typeof ACCEPTED_OUTPUT_MIMES)[number]

const SAFE_FILENAME_RE = /^[\w.-]+$/
const SAFE_SUBDIR_RE = /^(base-interiors|generated)$/

export function assertSafeFilename(name: string): void {
  if (!SAFE_FILENAME_RE.test(name)) {
    throw new ApiError('INVALID_SOURCE_PATH', `Invalid filename: "${name}"`)
  }
}

export function assertSafeSubdir(subdir: string): void {
  if (!SAFE_SUBDIR_RE.test(subdir)) {
    throw new ApiError('INVALID_SOURCE_PATH', `Invalid subdir: "${subdir}"`)
  }
}

/**
 * Detect an image MIME from its first bytes. Extension is never trusted.
 * Supports JPEG, PNG, WebP.
 */
export function detectMimeFromBytes(buffer: Buffer): OutputMime | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 8
    && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
    && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (
    buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export function extensionForMime(mime: OutputMime): 'jpg' | 'png' | 'webp' {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  return 'webp'
}

/**
 * Parse a public URL path like "/generated/xxx.png" or "/base-interiors/studio.jpg"
 * into a safe `{ subdir, filename }` pair. Throws INVALID_SOURCE_PATH on any deviation.
 */
export function parsePublicPath(urlPath: string): { subdir: string; filename: string } {
  const match = /^\/(base-interiors|generated)\/([^/]+)$/.exec(urlPath)
  if (!match) {
    throw new ApiError('INVALID_SOURCE_PATH', `Invalid public path: "${urlPath}"`)
  }
  const [, subdir, filename] = match as [string, string, string]
  assertSafeSubdir(subdir)
  assertSafeFilename(filename)
  return { subdir, filename }
}

/**
 * Read a file from /public/{subdir}/{filename}, validate its size and MIME (magic bytes only).
 * Returns the buffer + detected MIME. Throws normalized ApiError on any failure.
 */
export async function loadSourceImage(publicPath: string, publicRoot: string): Promise<{
  buffer: Buffer
  mimeType: InputMime
}> {
  const { subdir, filename } = parsePublicPath(publicPath)
  const absolute = resolve(publicRoot, subdir, filename)
  // Defense-in-depth: ensure resolved path stays inside publicRoot/subdir.
  const expectedPrefix = resolve(publicRoot, subdir) + '/'
  if (!absolute.startsWith(expectedPrefix)) {
    throw new ApiError('INVALID_SOURCE_PATH', `Resolved path escapes root: "${publicPath}"`)
  }

  let buffer: Buffer
  try {
    buffer = await readFile(absolute)
  } catch {
    throw new ApiError('SOURCE_NOT_FOUND', `File not found: "${publicPath}"`)
  }

  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new ApiError('SOURCE_TOO_LARGE', `Image exceeds ${MAX_IMAGE_BYTES} bytes`)
  }

  const mime = detectMimeFromBytes(buffer)
  if (mime === null || !ACCEPTED_INPUT_MIMES.includes(mime as InputMime)) {
    throw new ApiError(
      'UNSUPPORTED_MIME',
      `Unsupported image format. Accepted: ${ACCEPTED_INPUT_MIMES.join(', ')}`,
    )
  }

  return { buffer, mimeType: mime as InputMime }
}

/**
 * Validate a buffer produced by the provider: must have recognizable magic bytes
 * and respect the size limit. Returns detected MIME.
 */
export function validateOutputImage(buffer: Buffer): OutputMime {
  const mime = detectMimeFromBytes(buffer)
  if (mime === null) {
    throw new ApiError('INVALID_PROVIDER_RESPONSE', 'Provider returned data that is not a valid image')
  }
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new ApiError('OUTPUT_TOO_LARGE', `Provider image exceeds ${MAX_IMAGE_BYTES} bytes`)
  }
  return mime
}

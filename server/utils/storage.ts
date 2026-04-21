import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { extensionForMime, type OutputMime, validateOutputImage } from './image'

export async function saveGeneratedImage(
  buffer: Buffer,
  publicRoot: string,
): Promise<{ url: string; mimeType: OutputMime }> {
  const mime = validateOutputImage(buffer)
  const ext = extensionForMime(mime)
  const filename = `${randomUUID()}.${ext}`
  const dir = resolve(publicRoot, 'generated')
  await mkdir(dir, { recursive: true })
  await writeFile(resolve(dir, filename), buffer)
  return { url: `/generated/${filename}`, mimeType: mime }
}

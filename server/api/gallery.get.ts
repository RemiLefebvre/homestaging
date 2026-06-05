import { readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const dir = resolve(process.cwd(), 'public/generated')
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return { images: [] }
  }
  const pngs = entries.filter(f => f.toLowerCase().endsWith('.png'))
  const withMtime = await Promise.all(
    pngs.map(async (f) => {
      const s = await stat(resolve(dir, f))
      return { f, mtime: s.mtimeMs }
    }),
  )
  withMtime.sort((a, b) => b.mtime - a.mtime)
  return { images: withMtime.map(x => `/generated/${x.f}`) }
})

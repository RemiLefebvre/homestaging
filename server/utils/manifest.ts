import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { BaseInterior } from '~~/shared/types/base-interior'
import { ApiError } from './errors'

export async function loadBaseInteriors(publicRoot: string): Promise<BaseInterior[]> {
  const manifestPath = resolve(publicRoot, 'base-interiors', 'manifest.json')
  let raw: string
  try {
    raw = await readFile(manifestPath, 'utf-8')
  } catch {
    return []
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) throw new Error('manifest is not an array')
    return parsed as BaseInterior[]
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new ApiError('SOURCE_NOT_FOUND', `Invalid base-interiors manifest: ${msg}`, 500)
  }
}

export async function findBaseInteriorById(
  publicRoot: string,
  id: string,
): Promise<BaseInterior> {
  const list = await loadBaseInteriors(publicRoot)
  const found = list.find(b => b.id === id)
  if (!found) {
    throw new ApiError('SOURCE_NOT_FOUND', `Unknown baseId: "${id}"`)
  }
  return found
}

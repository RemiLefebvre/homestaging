import { resolve } from 'node:path'
import { defineEventHandler } from 'h3'
import { withErrorHandling } from '../utils/errors'
import { loadBaseInteriors } from '../utils/manifest'

export default defineEventHandler(async () => {
  return withErrorHandling(async () => {
    const publicRoot = resolve(process.cwd(), 'public')
    const items = await loadBaseInteriors(publicRoot)
    return { items }
  })
})

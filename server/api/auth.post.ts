import { defineEventHandler, readValidatedBody, setCookie } from 'h3'
import { z } from 'zod'
import { ApiError, withErrorHandling } from '../utils/errors'
import { SITE_AUTH_COOKIE, hashSitePassword } from '../middleware/auth'

const bodySchema = z.object({
  password: z.string().min(1).max(200),
})

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

/**
 * Password gate endpoint. Validates the submitted password against
 * `sitePassword` and, on success, sets the `site-auth` cookie that the auth
 * middleware checks on every subsequent request.
 *
 * If `sitePassword` is not configured the site is in public mode — we still
 * accept the request and return success so the unlock UI (if somehow reached)
 * doesn't dead-end.
 */
export default defineEventHandler(async (event) => {
  return withErrorHandling(async () => {
    const parsed = await readValidatedBody(event, raw => bodySchema.safeParse(raw))
    if (!parsed.success) {
      throw new ApiError('CONVERSATION_ERROR', 'Body must include { password }')
    }

    const config = useRuntimeConfig(event)
    const sitePassword = config.sitePassword

    if (!sitePassword) return { success: true }

    if (parsed.data.password !== sitePassword) {
      throw new ApiError('UNAUTHORIZED', 'Wrong password')
    }

    setCookie(event, SITE_AUTH_COOKIE, hashSitePassword(sitePassword), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_SECONDS,
      path: '/',
    })

    return { success: true }
  })
})

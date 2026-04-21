import { createError } from 'h3'

export type ApiErrorCode =
  | 'MISSING_API_KEY'
  | 'SOURCE_NOT_FOUND'
  | 'INVALID_SOURCE_PATH'
  | 'UNSUPPORTED_MIME'
  | 'SOURCE_TOO_LARGE'
  | 'EMPTY_PROMPT'
  | 'PROVIDER_ERROR'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'OUTPUT_TOO_LARGE'

const DEFAULT_HTTP_STATUS: Record<ApiErrorCode, number> = {
  MISSING_API_KEY: 500,
  SOURCE_NOT_FOUND: 404,
  INVALID_SOURCE_PATH: 400,
  UNSUPPORTED_MIME: 400,
  SOURCE_TOO_LARGE: 413,
  EMPTY_PROMPT: 400,
  PROVIDER_ERROR: 502,
  INVALID_PROVIDER_RESPONSE: 502,
  OUTPUT_TOO_LARGE: 502,
}

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly httpStatus: number

  constructor(code: ApiErrorCode, message?: string, httpStatus?: number) {
    super(message ?? code)
    this.code = code
    this.httpStatus = httpStatus ?? DEFAULT_HTTP_STATUS[code]
  }
}

export async function withErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof ApiError) {
      throw createError({
        statusCode: err.httpStatus,
        statusMessage: err.code,
        data: { code: err.code, message: err.message },
      })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api] unexpected error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'PROVIDER_ERROR',
      data: { code: 'PROVIDER_ERROR' satisfies ApiErrorCode, message },
    })
  }
}

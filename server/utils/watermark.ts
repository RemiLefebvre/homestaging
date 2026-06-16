import sharp from 'sharp'

/**
 * Anchor points for the watermark. Read as `<vertical>` or `<vertical>-<horizontal>`.
 * `'top'` means top-centered, `'center'` means dead-center, etc.
 */
export type WatermarkPosition =
  | 'top-left' | 'top' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom' | 'bottom-right'

export interface WatermarkConfig {
  /** Master switch. Set false to ship images without the logo. */
  enabled: boolean
  /** Logo file, relative to `public/` (exposed as the `assets:brand` server asset). */
  logoFile: string
  /** Logo width as a fraction of the base image width (0..1). 0.25 = a quarter wide. */
  widthRatio: number
  /** Where to anchor the logo. Default `'top'` = top, horizontally centered. */
  position: WatermarkPosition
  /** Gap from the image edges, as a fraction of the base image width (0..1). */
  marginRatio: number
  /** Logo opacity, 0 (invisible) .. 1 (fully opaque). */
  opacity: number
}

/**
 * SINGLE PLACE TO TUNE THE WATERMARK.
 *
 * Examples:
 *   widthRatio: 0.4          → bigger logo (40% of image width)
 *   position: 'bottom-right' → move it to the lower-right corner
 *   marginRatio: 0.02        → tighter to the edge
 *   opacity: 0.6             → semi-transparent
 *   enabled: false           → turn the watermark off entirely
 */
export const WATERMARK_CONFIG: WatermarkConfig = {
  enabled: true,
  logoFile: 'FLAA_logo.png',
  widthRatio: 0.68,
  position: 'top',
  marginRatio: 0.07,
  opacity: 1,
}

/** Compute the top/left pixel offset of the logo inside the base image. */
function computeOffset(
  base: { width: number; height: number },
  logo: { width: number; height: number },
  position: WatermarkPosition,
  margin: number,
): { top: number; left: number } {
  const [vertical, horizontal = 'center'] = position.split('-') as [string, string?]

  let left: number
  if (horizontal === 'left') left = margin
  else if (horizontal === 'right') left = base.width - logo.width - margin
  else left = Math.round((base.width - logo.width) / 2)

  let top: number
  if (vertical === 'top') top = margin
  else if (vertical === 'bottom') top = base.height - logo.height - margin
  else top = Math.round((base.height - logo.height) / 2)

  // Clamp so the logo never spills outside the canvas (composite would error).
  left = Math.max(0, Math.min(left, base.width - logo.width))
  top = Math.max(0, Math.min(top, base.height - logo.height))
  return { top, left }
}

/**
 * Pure compositing core: paint `logoSource` onto `imageBuffer` per `config`.
 *
 * No runtime dependencies (no `useStorage`), so it is reusable both from the
 * Nitro endpoint and from the standalone CLI preview (`scripts/watermark-preview.mts`).
 *
 * Output format is preserved (sharp keeps the input encoding when no format
 * method is called), so the downstream MIME validation still passes. Throws on
 * any sharp/decode error — callers decide whether to fail loud or fall back.
 */
export async function compositeWatermark(
  imageBuffer: Buffer,
  logoSource: Buffer,
  config: WatermarkConfig = WATERMARK_CONFIG,
): Promise<Buffer> {
  const base = sharp(imageBuffer)
  const meta = await base.metadata()
  if (!meta.width || !meta.height) {
    throw new Error('base image has no dimensions')
  }

  const targetWidth = Math.max(1, Math.round(meta.width * config.widthRatio))

  // Resize the logo, then bake in opacity by multiplying its alpha channel.
  let logo = sharp(logoSource).resize({ width: targetWidth })
  if (config.opacity < 1) {
    const alpha = Math.round(Math.max(0, Math.min(1, config.opacity)) * 255)
    logo = logo.ensureAlpha().composite([{
      input: Buffer.from([255, 255, 255, alpha]),
      raw: { width: 1, height: 1, channels: 4 },
      tile: true,
      blend: 'dest-in',
    }])
  }
  const logoBuffer = await logo.png().toBuffer()
  const logoMeta = await sharp(logoBuffer).metadata()

  const margin = Math.round(meta.width * config.marginRatio)
  const { top, left } = computeOffset(
    { width: meta.width, height: meta.height },
    { width: logoMeta.width ?? targetWidth, height: logoMeta.height ?? 0 },
    config.position,
    margin,
  )

  return base.composite([{ input: logoBuffer, top, left }]).toBuffer()
}

/**
 * Composite the brand logo onto a generated image (runtime entry point).
 *
 * Loads the logo from the bundled `assets:brand` server asset, then delegates
 * to {@link compositeWatermark}.
 *
 * Failures are non-fatal: if anything goes wrong (missing asset, decode error),
 * we log and return the original buffer so the user still gets their render.
 */
export async function applyWatermark(
  imageBuffer: Buffer,
  config: WatermarkConfig = WATERMARK_CONFIG,
): Promise<Buffer> {
  if (!config.enabled) return imageBuffer

  try {
    const raw = await useStorage('assets:brand').getItemRaw(config.logoFile)
    if (!raw) {
      console.error(`[watermark] logo asset not found: ${config.logoFile}`)
      return imageBuffer
    }
    const logoSource = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer)
    return await compositeWatermark(imageBuffer, logoSource, config)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[watermark] failed, returning original image: ${msg}`)
    return imageBuffer
  }
}

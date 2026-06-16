/**
 * Preview the brand watermark on already-generated images — without running the app.
 *
 * Usage:
 *   pnpm watermark:preview <input...> [options]
 *
 * Examples:
 *   pnpm watermark:preview render.png
 *   pnpm watermark:preview a.png b.jpg --position bottom-right --width 0.4 --opacity 0.6
 *   pnpm watermark:preview "generated/*.png" --out ./previews --position center
 *   pnpm watermark:preview https://<blob-url>.png        # remote URL works too
 *
 * Options (default to WATERMARK_CONFIG):
 *   --position <p>   top-left|top|top-right|center-left|center|center-right|bottom-left|bottom|bottom-right
 *   --width <r>      logo width as fraction of image width (0..1)
 *   --margin <r>     edge margin as fraction of image width (0..1)
 *   --opacity <o>    0..1
 *   --logo <path>    logo file (default public/FLAA_logo.png)
 *   --out <dir>      output directory (default: alongside input, suffixed .wm)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import process from 'node:process'
import {
  compositeWatermark,
  WATERMARK_CONFIG,
  type WatermarkConfig,
  type WatermarkPosition,
} from '../server/utils/watermark'

function parseArgs(argv: string[]): { inputs: string[]; opts: Record<string, string> } {
  const inputs: string[] = []
  const opts: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a.startsWith('--')) {
      opts[a.slice(2)] = argv[++i] ?? ''
    } else {
      inputs.push(a)
    }
  }
  return { inputs, opts }
}

async function readImage(src: string): Promise<Buffer> {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src)
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${src}`)
    return Buffer.from(await res.arrayBuffer())
  }
  return readFile(resolve(src))
}

async function main() {
  const { inputs, opts } = parseArgs(process.argv.slice(2))
  if (inputs.length === 0) {
    console.error('Usage: pnpm watermark:preview <input...> [--position --width --margin --opacity --logo --out]')
    process.exit(1)
  }

  const config: WatermarkConfig = {
    ...WATERMARK_CONFIG,
    enabled: true,
    ...(opts.position ? { position: opts.position as WatermarkPosition } : {}),
    ...(opts.width ? { widthRatio: Number(opts.width) } : {}),
    ...(opts.margin ? { marginRatio: Number(opts.margin) } : {}),
    ...(opts.opacity ? { opacity: Number(opts.opacity) } : {}),
  }

  const logoPath = opts.logo ?? join('public', WATERMARK_CONFIG.logoFile)
  const logoSource = await readFile(resolve(logoPath))

  const outDir = opts.out ? resolve(opts.out) : null
  if (outDir) await mkdir(outDir, { recursive: true })

  console.log('config:', JSON.stringify({ ...config, logoFile: logoPath }))

  for (const input of inputs) {
    try {
      const image = await readImage(input)
      const result = await compositeWatermark(image, logoSource, config)

      const ext = extname(input).split('?')[0] || '.png'
      const stem = basename(input, extname(input)).split('?')[0]
      const outPath = outDir
        ? join(outDir, `${stem}.wm${ext}`)
        : resolve(`${stem}.wm${ext}`)

      await writeFile(outPath, result)
      console.log(`  ✓ ${input} → ${outPath} (${result.length} bytes)`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ ${input}: ${msg}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

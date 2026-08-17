/**
 * Preview the brand watermark on already-generated images — without running the app.
 *
 * Usage:
 *   pnpm watermark:preview [input...] [options]
 *
 * Without input, regenerates the poster-preview sample (DEFAULT_INPUT below).
 * Without tuning options, applies ALL layers of WATERMARK_LAYERS (the real
 * production result). Any tuning option switches to a single custom layer.
 *
 * Examples:
 *   pnpm watermark:preview                # refresh /poster-preview after a config change
 *   pnpm watermark:preview render.png
 *   pnpm watermark:preview a.png b.jpg --position bottom-right --width 0.4 --opacity 0.6
 *   pnpm watermark:preview "generated/*.png" --out ./previews --position center
 *   pnpm watermark:preview https://<blob-url>.png        # remote URL works too
 *
 * Tuning options (defaults from the first layer of WATERMARK_LAYERS):
 *   --position <p>   top-left|top|top-right|center-left|center|center-right|bottom-left|bottom|bottom-right
 *   --width <r>      logo width as fraction of image width (0..1)
 *   --margin <r>     edge margin as fraction of image width (0..1)
 *   --opacity <o>    0..1
 *   --logo <path>    logo file (default public/FLAA_logo.png)
 * Other options:
 *   --out <dir>      output directory (default: alongside input, suffixed .wm)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import process from 'node:process'
import {
  compositeWatermark,
  WATERMARK_LAYERS,
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

// Source of the sample shown by app/pages/poster-preview.vue (its DEFAULT_IMG
// is this file's .wm sibling) — keep the two in sync if the sample changes.
const DEFAULT_INPUT = 'public/generated/12b42049-f6ac-411f-892a-88badbb280f7.png'

async function main() {
  const { inputs, opts } = parseArgs(process.argv.slice(2))
  if (inputs.length === 0) {
    inputs.push(DEFAULT_INPUT)
    console.log(`no input → regenerating the poster-preview sample: ${DEFAULT_INPUT}`)
  }

  const tuning = ['position', 'width', 'margin', 'opacity', 'logo'].some(k => opts[k] !== undefined)

  // Tuning flags → one custom layer; otherwise preview the real production stack.
  let layers: Array<{ config: WatermarkConfig; logoSource: Buffer }>
  if (tuning) {
    const config: WatermarkConfig = {
      ...WATERMARK_LAYERS[0]!,
      enabled: true,
      ...(opts.position ? { position: opts.position as WatermarkPosition } : {}),
      ...(opts.width ? { widthRatio: Number(opts.width) } : {}),
      ...(opts.margin ? { marginRatio: Number(opts.margin) } : {}),
      ...(opts.opacity ? { opacity: Number(opts.opacity) } : {}),
    }
    const logoPath = opts.logo ?? join('public', config.logoFile)
    layers = [{ config, logoSource: await readFile(resolve(logoPath)) }]
    console.log('config:', JSON.stringify({ ...config, logoFile: logoPath }))
  } else {
    const enabled = WATERMARK_LAYERS.filter(l => l.enabled)
    layers = await Promise.all(enabled.map(async config => ({
      config,
      logoSource: await readFile(resolve(join('public', config.logoFile))),
    })))
    console.log('layers:', JSON.stringify(enabled))
  }

  const outDir = opts.out ? resolve(opts.out) : null
  if (outDir) await mkdir(outDir, { recursive: true })

  for (const input of inputs) {
    try {
      const image = await readImage(input)
      let result = image
      for (const { config, logoSource } of layers) {
        result = await compositeWatermark(result, logoSource, config)
      }

      const ext = extname(input).split('?')[0] || '.png'
      const stem = basename(input, extname(input)).split('?')[0]
      // Default output: next to the input file (cwd for remote URLs).
      const defaultDir = /^https?:\/\//.test(input) ? '.' : dirname(input)
      const outPath = outDir
        ? join(outDir, `${stem}.wm${ext}`)
        : resolve(defaultDir, `${stem}.wm${ext}`)

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

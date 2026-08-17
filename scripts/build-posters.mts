/**
 * Batch-render every validated lead into a print-ready A4 PDF for the print shop.
 *
 * Reads exports/leads/*.json (run `pnpm import:prod` first to populate them),
 * renders each poster with headless Chromium (Playwright), and writes
 * exports/posters/{prenom}-{nom}-{id}.pdf.
 *
 * The poster layout MUST stay visually identical to app/utils/poster.ts. That
 * function relies on browser globals (document.styleSheets, location) and can't
 * run under Node, so the HTML/CSS below is a faithful copy of `buildPosterDoc`
 * and the fit cascade of `fitPosterToPage`, with the fonts loaded from their CDNs
 * (Inter + Cabinet Grotesk) instead of the app's self-hosted copies. Keep the two
 * in sync when the poster design changes.
 *
 * Prereq (once): pnpm exec playwright install chromium
 * Usage:         pnpm build:posters
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'
import type { StoredLead } from '../shared/types/lead'

const LEADS_DIR = resolve('exports/leads')
const OUT_DIR = resolve('exports/posters')

/** Same font families as the app; requested at the weights @nuxt/fonts uses. */
const FONT_LINKS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700,800&display=swap',
]

/** Typo steps tried before cutting story moments — mirrors poster.ts. */
const TYPO_STEPS = ['100%', '92%', '85%']

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface PosterData {
  imageUrl: string
  firstName: string
  lastName: string
  concept: string
  story: { trigger: string, design: string, meaning: string }[]
}

/** A4 poster HTML — faithful copy of app/utils/poster.ts `buildPosterDoc`. */
function buildPosterHtml(p: PosterData): string {
  const fullName = [p.firstName, p.lastName].map(s => s?.trim() ?? '').filter(Boolean).join(' ')
  const signature = fullName ? `<p class="signature">${esc(fullName)}</p>` : ''

  const beats = p.story
    .map((b) => {
      const meaning = b.meaning ? `<em class="beat-meaning">${esc(b.meaning)}.</em> ` : ''
      return `<li class="beat">
        <span class="beat-trigger">${esc(b.trigger)}</span>
        <span class="beat-text">${meaning}${esc(b.design)}</span>
      </li>`
    })
    .join('')

  const storySection = p.story.length
    ? `<section class="story">
        <p class="label">Pourquoi cette maison te ressemble</p>
        <ul class="beats">${beats}</ul>
      </section>`
    : ''

  const fonts = FONT_LINKS.map(href => `<link rel="stylesheet" href="${href}">`).join('')

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title></title>
${fonts}
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4 portrait; margin: 0; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1c1c22;
    background: #fff;
  }
  .sheet {
    --pad-x: 26mm;
    --col: calc(210mm - 2 * var(--pad-x));
    width: 210mm;
    height: 297mm;
    padding: 13mm var(--pad-x) 18mm;
    background: #fff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .frame, .signature, .texts { width: var(--col); margin-left: auto; margin-right: auto; }
  .frame { display: flex; justify-content: center; margin-bottom: 4mm; }
  .signature {
    text-align: right;
    font-family: 'Cabinet Grotesk', 'Inter', sans-serif;
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #71717a;
    margin-bottom: 9mm;
  }
  .frame img {
    display: block;
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: var(--col);
    box-shadow: 0 2mm 9mm rgba(24, 24, 27, 0.14);
  }
  .texts { font-size: 12.5pt; }
  .label {
    font-size: 0.64em;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    font-weight: 700;
    color: #a1a1aa;
    margin-bottom: 3.5mm;
  }
  .concept { margin-bottom: 8mm; }
  .concept-text { font-size: 1em; line-height: 1.62; color: #27272a; text-align: justify; }
  .beats { list-style: none; display: flex; flex-direction: column; gap: 4.5mm; }
  .beat { display: flex; gap: 5mm; align-items: baseline; }
  .beat-trigger {
    font-family: 'Cabinet Grotesk', 'Inter', sans-serif;
    font-weight: 700;
    color: #18181b;
    flex: 0 0 34%;
    font-size: 0.84em;
    line-height: 1.4;
  }
  .beat-text { flex: 1; font-size: 0.84em; line-height: 1.5; color: #3f3f46; }
  .beat-meaning { color: #a1a1aa; font-style: italic; }
</style></head>
<body>
  <div class="sheet">
    <div class="frame"><img src="${esc(p.imageUrl)}" alt=""></div>
    ${signature}
    <div class="texts">
      <section class="concept">
        <p class="label">Note d'intention</p>
        <p class="concept-text">${esc(p.concept)}</p>
      </section>
      ${storySection}
    </div>
  </div>
</body></html>`
}

function slug(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sans-nom'
}

/** UUID basename of the render (generated/{uuid}.png), used to key the output file. */
function idFromImageUrl(url: string): string {
  try {
    return (new URL(url).pathname.split('/').pop() ?? '').replace(/\.[^.]+$/, '') || 'poster'
  } catch {
    return 'poster'
  }
}

async function main(): Promise<void> {
  let files: string[]
  try {
    files = (await readdir(LEADS_DIR)).filter(f => f.toLowerCase().endsWith('.json'))
  } catch {
    console.error(`Aucun dossier ${LEADS_DIR}. Lance d'abord \`pnpm import:prod\`.`)
    process.exit(1)
  }
  if (!files.length) {
    console.error(`Aucun lead dans ${LEADS_DIR}. Lance d'abord \`pnpm import:prod\`.`)
    process.exit(1)
  }

  await mkdir(OUT_DIR, { recursive: true })

  let browser
  try {
    browser = await chromium.launch()
  } catch (err) {
    console.error('Chromium introuvable. Lance `pnpm exec playwright install chromium`.')
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
  const page = await browser.newPage()

  let ok = 0
  let skippedText = 0
  for (const file of files) {
    let lead: StoredLead
    try {
      lead = JSON.parse(await readFile(join(LEADS_DIR, file), 'utf8')) as StoredLead
    } catch {
      console.warn(`  ! ${file} illisible — ignoré`)
      continue
    }

    const data: PosterData = {
      imageUrl: lead.imageUrl,
      firstName: lead.firstName ?? '',
      lastName: lead.lastName ?? '',
      concept: lead.concept ?? '',
      story: lead.story ?? [],
    }
    if (!data.concept && !data.story.length) skippedText++

    await page.setContent(buildPosterHtml(data), { waitUntil: 'networkidle' })

    // NOTE: both evaluates are passed as raw JS strings, not closures. tsx/esbuild
    // injects a `__name` helper into transpiled functions; Playwright ships the
    // function source to the page where `__name` is undefined → ReferenceError.
    // Strings are evaluated verbatim in the page, sidestepping that entirely.

    // Image + fonts settled before measuring (cap so a stuck asset never hangs).
    await page.evaluate(`(async () => {
      const img = document.querySelector('img');
      const whenImg = img && !img.complete
        ? new Promise((r) => { img.onload = img.onerror = () => r(); })
        : Promise.resolve();
      const whenFonts = Promise.race([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        new Promise((r) => setTimeout(r, 1500)),
      ]);
      await Promise.all([whenImg, whenFonts]);
    })()`)

    // Fit cascade — mirrors app/utils/poster.ts `fitPosterToPage`.
    await page.evaluate(`(() => {
      const steps = ${JSON.stringify(TYPO_STEPS)};
      const sheet = document.querySelector('.sheet');
      if (!sheet) return;
      const overflows = () => sheet.scrollHeight > sheet.clientHeight;
      const texts = document.querySelector('.texts');
      for (const size of steps) {
        if (!texts) break;
        texts.style.fontSize = size;
        if (!overflows()) return;
      }
      const story = document.querySelector('.story');
      if (!story) return;
      const beats = story.querySelector('.beats');
      while (overflows() && beats && beats.lastElementChild) beats.removeChild(beats.lastElementChild);
      if (overflows() || !(beats && beats.childElementCount)) story.remove();
    })()`)

    const out = join(OUT_DIR, `${slug(data.firstName)}-${slug(data.lastName)}-${idFromImageUrl(data.imageUrl)}.pdf`)
    await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true })
    ok++
    console.log(`  ✓ ${out.split('/').pop()}`)
  }

  await browser.close()

  console.log(`\n🖨  ${ok} poster(s) PDF → ${OUT_DIR}`)
  if (skippedText) {
    console.warn(`⚠  ${skippedText} lead(s) sans texte (concept/story) — anciens leads d'avant la persistance : image + nom seulement.`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

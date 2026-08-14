import type { StoryBeat } from '~~/shared/types/architect'

/** Everything the printed poster needs, decoupled from the architect state. */
export interface PosterPayload {
  imageUrl: string
  concept: string
  story: readonly Readonly<StoryBeat>[]
}

/** Typo steps tried by {@link fitPosterToPage} before cutting story moments. */
const TYPO_STEPS = ['100%', '92%', '85%'] as const

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Copy the @font-face rules already loaded by the app (self-hosted by
 * @nuxt/fonts) so the poster iframe gets Inter + Cabinet Grotesk without any
 * CDN dependency. cssText serialises URLs as absolute, so they stay valid
 * inside the about:blank iframe.
 */
function collectParentFontFaces(): string {
  const rules: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let cssRules: CSSRuleList
    try {
      cssRules = sheet.cssRules
    } catch {
      continue // cross-origin stylesheet — not ours
    }
    for (const rule of Array.from(cssRules)) {
      if (rule instanceof CSSFontFaceRule) rules.push(rule.cssText)
    }
  }
  return rules.join('\n')
}

/**
 * Full HTML document of the A4 poster: image on top (kept at its capped
 * format, placed high on the page), then the intent note (always) and the
 * story (as long as it fits — see {@link fitPosterToPage}).
 */
export function buildPosterDoc(payload: PosterPayload): string {
  const beats = payload.story
    .map((b) => {
      const meaning = b.meaning ? `<em class="beat-meaning">${esc(b.meaning)}.</em> ` : ''
      return `<li class="beat">
        <span class="beat-trigger">${esc(b.trigger)}</span>
        <span class="beat-text">${meaning}${esc(b.design)}</span>
      </li>`
    })
    .join('')

  const storySection = payload.story.length
    ? `<section class="story">
        <p class="label">Pourquoi cette maison te ressemble</p>
        <ul class="beats">${beats}</ul>
      </section>`
    : ''

  // Empty <title> + zero @page margin strip the browser's auto header/footer.
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title></title>
<base href="${location.origin}/">
<style>
${collectParentFontFaces()}
</style>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4 portrait; margin: 0; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1c1c22;
    background: #fff;
  }
  /* Fixed A4 sheet + overflow:hidden lets fitPosterToPage measure overflow.
     --col: single centered column — texts share the exact width of the image,
     and the column always fills the sheet minus the horizontal padding. */
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
  .frame, .texts { width: var(--col); margin-left: auto; margin-right: auto; }
  .frame { display: flex; justify-content: center; margin-bottom: 9mm; }
  /* Square corners + generous size: the render is the hero of the framed print. */
  .frame img {
    display: block;
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: var(--col);
    box-shadow: 0 2mm 9mm rgba(24, 24, 27, 0.14);
  }
  /* All text sizes are em-based on .texts so the fit cascade only touches one value. */
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
  /* FLAA art direction: black & white only — no colored text on the print. */
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
    <div class="frame"><img src="${esc(payload.imageUrl)}" alt=""></div>
    <div class="texts">
      <section class="concept">
        <p class="label">Note d'intention</p>
        <p class="concept-text">${esc(payload.concept)}</p>
      </section>
      ${storySection}
    </div>
  </div>
</body></html>`
}

/**
 * Resolve once the poster is measurable: image loaded + fonts settled
 * (capped at 1.5s so a stuck font never blocks printing).
 */
export function whenPosterReady(doc: Document): Promise<void> {
  const img = doc.querySelector('img')
  const whenImage = img && !img.complete
    ? new Promise<void>((resolve) => { img.onload = img.onerror = () => resolve() })
    : Promise.resolve()
  const whenFonts = Promise.race([
    doc.fonts?.ready ?? Promise.resolve(),
    new Promise(resolve => setTimeout(resolve, 1500)),
  ])
  return Promise.all([whenImage, whenFonts]).then(() => {})
}

/**
 * Make the poster fit ONE page. Cascade decided with the user:
 * 1. shrink note + story typography together (max 2 steps),
 * 2. then drop story moments from the end,
 * 3. then drop the story section entirely.
 * The intent note never disappears.
 */
export function fitPosterToPage(doc: Document): void {
  const sheet = doc.querySelector<HTMLElement>('.sheet')
  if (!sheet) return
  const overflows = () => sheet.scrollHeight > sheet.clientHeight

  const texts = doc.querySelector<HTMLElement>('.texts')
  for (const size of TYPO_STEPS) {
    if (!texts) break
    texts.style.fontSize = size
    if (!overflows()) return
  }

  const story = doc.querySelector('.story')
  if (!story) return
  const beats = story.querySelector('.beats')
  while (overflows() && beats?.lastElementChild) {
    beats.removeChild(beats.lastElementChild)
  }
  if (overflows() || !beats?.childElementCount) story.remove()
}

/** Print the poster from a hidden iframe, then clean it up. */
export function printPoster(payload: PosterPayload): void {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    return
  }

  doc.open()
  doc.write(buildPosterDoc(payload))
  doc.close()

  win.addEventListener('afterprint', () => setTimeout(() => iframe.remove(), 500))

  whenPosterReady(doc).then(() => {
    fitPosterToPage(doc)
    win.focus()
    win.print()
  })
}

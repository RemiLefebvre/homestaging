/**
 * Génère de nouvelles images de base d'intérieurs vides via OpenRouter
 * (Gemini 2.5 Flash Image / "Nano Banana"), en réutilisant le même appel
 * que server/utils/openrouter.ts mais inliné ici pour rester autonome
 * du runtime Nuxt.
 *
 * Usage : `pnpm generate:bases` (charge .env via tsx --env-file).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import OpenAI from 'openai'
import type { RoomType } from '../shared/types/base-interior'

const MODEL = 'google/gemini-2.5-flash-image'
const BASE_URL = 'https://openrouter.ai/api/v1'

interface ManifestEntry {
  id: string
  label: string
  filename: string
  roomType: RoomType
  description?: string
}

interface GenerationSpec {
  id: string
  label: string
  roomType: RoomType
  description: string
  sourceFilename: string
  prompt: string
}

const ROOT = resolve(import.meta.dirname, '..')
const BASE_DIR = resolve(ROOT, 'public', 'base-interiors')
const MANIFEST_PATH = resolve(BASE_DIR, 'manifest.json')

const SPECS: GenerationSpec[] = [
  {
    id: '6',
    label: 'Salon scandinave',
    roomType: 'living',
    description: 'Parquet clair, grandes fenêtres, murs blancs cassés',
    sourceFilename: '4.png',
    prompt:
      'Transform this empty room into an empty Scandinavian-style living room. Light oak parquet floor, large windows, off-white walls, soft natural daylight. No furniture, no decoration, completely empty. Wide-angle photograph, realistic.',
  },
  {
    id: '7',
    label: 'Salon avec cheminée',
    roomType: 'living',
    description: 'Cheminée moderne, parquet bois, mur en pierre',
    sourceFilename: '4.png',
    prompt:
      'Transform this empty room into an empty modern living room with a built-in fireplace on the back wall. Natural stone accent wall, dark oak parquet floor, large windows. Empty room, no furniture, no decoration. Wide-angle, photorealistic.',
  },
  {
    id: '8',
    label: 'Salon lumineux',
    roomType: 'living',
    description: 'Murs blancs, sol béton ciré, baies vitrées',
    sourceFilename: '4.png',
    prompt:
      'Transform this empty room into an empty contemporary living room. Polished concrete floor, white walls, floor-to-ceiling windows, bright daylight. Completely empty, no furniture or objects. Wide-angle photograph, realistic.',
  },
  {
    id: '9',
    label: 'Cuisine scandinave',
    roomType: 'kitchen',
    description: 'Façades blanches, plan de travail bois, faïence métro',
    sourceFilename: '4.png',
    prompt:
      'Transform this empty room into an empty Scandinavian kitchen. White matte cabinets along two walls, light oak countertop, white subway tile backsplash, light oak floor, large window. Built-in appliances only, no free-standing furniture, no decoration. Wide-angle photo, realistic.',
  },
  {
    id: '10',
    label: 'Studio loft ouvert',
    roomType: 'multipurpose',
    description: 'Plafond haut, poutres apparentes, parquet brut',
    sourceFilename: '4.png',
    prompt:
      'Transform this empty room into an empty loft studio space. High ceiling with exposed wooden beams, raw oak parquet, large industrial windows, white walls. Completely empty, no furniture or partitions. Wide-angle photo, realistic.',
  },
  {
    id: '11',
    label: 'Salon haussmannien',
    roomType: 'living',
    description: 'Moulures, cheminée en marbre, parquet point de Hongrie',
    sourceFilename: '4.png',
    prompt:
      'Transform this empty room into an empty Haussmannian Parisian living room. Tall ceilings with ornate plaster moldings and a center rosette, marble fireplace mantel on one wall, herringbone oak parquet floor, double tall French windows with white frames. Completely empty, no furniture, no decoration. Wide-angle photograph, realistic.',
  },
  {
    id: '12',
    label: 'Salon japandi',
    roomType: 'living',
    description: 'Papier peint texturé beige, parquet large lame, baie sur jardin',
    sourceFilename: '4.png',
    prompt:
      'Transform this empty room into an empty Japandi-style living room. Warm beige textured plaster walls, wide-plank light oak floor, full-height sliding glass door overlooking a quiet zen garden, soft diffused daylight. Completely empty, no furniture, no decoration, minimalist. Wide-angle photograph, realistic.',
  },
  {
    id: '13',
    label: 'Chambre mansardée',
    roomType: 'bedroom',
    description: 'Sous-pente, lucarne, parquet clair, mur pastel',
    sourceFilename: '1.png',
    prompt:
      'Transform this empty attic room into an empty cozy bedroom under sloped ceilings. Skylight dormer window, light oak parquet floor, one accent wall in soft pastel sage green, white sloped walls. Completely empty, no furniture, no bed, no decoration. Wide-angle photograph, realistic.',
  },
  {
    id: '14',
    label: 'Chambre parentale',
    roomType: 'bedroom',
    description: 'Moquette beige, dressing intégré, double porte-fenêtre',
    sourceFilename: '4.png',
    prompt:
      'Transform this empty room into an empty large master bedroom. Soft beige wool carpet, integrated white wardrobe doors along one wall (closed), double French windows with sheer curtains, taupe walls. Completely empty, no furniture, no bed, no decoration. Wide-angle photograph, realistic.',
  },
  {
    id: '15',
    label: 'Cuisine industrielle',
    roomType: 'kitchen',
    description: 'Briques apparentes, hotte inox, plan de travail béton',
    sourceFilename: '5.png',
    prompt:
      'Transform this empty kitchen into an empty industrial-style kitchen. Exposed red brick wall, matte black cabinets, raw concrete countertop, stainless steel range hood and built-in oven, dark grey concrete floor, large metal-frame window. Built-in appliances only, no free-standing furniture, no decoration. Wide-angle photograph, realistic.',
  },
  {
    id: '16',
    label: 'Cuisine campagnarde',
    roomType: 'kitchen',
    description: 'Poutres bois, évier en grès, façades vert sauge, tomettes',
    sourceFilename: '9.png',
    prompt:
      'Transform this empty kitchen into an empty French country kitchen. Exposed wooden ceiling beams, sage green shaker-style cabinets, white stone farmhouse sink, terracotta tile floor, white plaster walls, small window with wooden shutters. Built-in appliances only, no free-standing furniture, no decoration. Wide-angle photograph, realistic.',
  },
  {
    id: '17',
    label: 'Salle de bain marbre',
    roomType: 'bathroom',
    description: 'Marbre veiné, double vasque, baignoire îlot',
    sourceFilename: '3.png',
    prompt:
      'Transform this empty bathroom into an empty luxurious marble bathroom. White Calacatta marble walls and floor with grey veining, freestanding oval bathtub in the center, double floating vanity with two undermount sinks and a large mirror, brass fixtures, soft warm lighting. No towels, no products, no decoration, completely empty surfaces. Wide-angle photograph, realistic.',
  },
  {
    id: '18',
    label: 'Salle d\'eau bohème',
    roomType: 'bathroom',
    description: 'Zellige terracotta, vasque en pierre, niche murale',
    sourceFilename: '3.png',
    prompt:
      'Transform this empty bathroom into an empty bohemian-style bathroom. Terracotta zellige tile wall behind the vanity, raw stone vessel sink on a wooden countertop, walk-in shower with beige tadelakt walls, terracotta tile floor, arched wall niche, matte black fixtures. No towels, no products, no decoration, completely empty surfaces. Wide-angle photograph, realistic.',
  },
  {
    id: '19',
    label: 'Bureau atelier verrière',
    roomType: 'multipurpose',
    description: 'Verrière intérieure, parquet, mur en briques',
    sourceFilename: '1.png',
    prompt:
      'Transform this empty room into an empty home office / atelier space. Industrial steel-framed glass partition wall, exposed red brick accent wall, light oak parquet floor, white painted walls, skylight providing natural daylight. Completely empty, no desk, no chair, no furniture, no decoration. Wide-angle photograph, realistic.',
  },
  {
    id: '20',
    label: 'Atelier d\'artiste',
    roomType: 'multipurpose',
    description: 'Grande verrière nord, parquet brut, plafond cathédrale',
    sourceFilename: '10.png',
    prompt:
      'Transform this empty loft space into an empty artist\'s atelier. Cathedral ceiling with exposed white-painted wooden trusses, huge north-facing industrial steel window wall, raw wide-plank pine floor, raw concrete accent wall, abundant cool natural light. Completely empty, no easel, no furniture, no decoration. Wide-angle photograph, realistic.',
  },
  {
    id: '21',
    label: 'Salon véranda',
    roomType: 'living',
    description: 'Toit vitré, sol travertin, lumière chaude',
    sourceFilename: '4.png',
    prompt:
      'Transform this empty room into an empty conservatory-style living room. Glass roof structure with thin black steel frames, travertine stone floor, white plaster walls, large floor-to-ceiling glazed walls letting in abundant warm afternoon sunlight. Completely empty, no furniture, no plants, no decoration. Wide-angle photograph, realistic.',
  },
  {
    id: '22',
    label: 'Chambre boiserie',
    roomType: 'bedroom',
    description: 'Lambris vertical, parquet sombre, murs bleu nuit',
    sourceFilename: '4.png',
    prompt:
      'Transform this empty room into an empty elegant bedroom. Vertical wood panelling on the back wall in warm walnut tone, deep navy blue painted side walls, dark stained oak parquet floor, tall narrow window with white sheer curtains, white ceiling with discreet cornice. Completely empty, no furniture, no bed, no decoration. Wide-angle photograph, realistic.',
  },
  {
    id: '23',
    label: 'Chambre méditerranéenne',
    roomType: 'bedroom',
    description: 'Voûte en pierre, tomettes, fenêtre arquée',
    sourceFilename: '1.png',
    prompt:
      'Transform this empty room into an empty Mediterranean stone bedroom. Curved vaulted ceiling in rough natural stone, white lime-washed plaster walls, terracotta tile floor, arched window with rustic wooden shutters, soft warm sunlight. Completely empty, no furniture, no bed, no decoration. Wide-angle photograph, realistic.',
  },
  {
    id: '24',
    label: 'Cuisine luxe marbre',
    roomType: 'kitchen',
    description: 'Façades laquées, îlot marbre Calacatta, robinetterie laiton',
    sourceFilename: '5.png',
    prompt:
      'Transform this empty kitchen into an empty luxurious modern kitchen. White lacquered handleless cabinets along two walls, central island with thick Calacatta marble waterfall countertop and matching full-height backsplash, integrated stainless steel appliances, brass fixtures, light grey marble tile floor, warm pendant lighting. Built-in appliances only, no free-standing furniture, no decoration. Wide-angle photograph, realistic.',
  },
  {
    id: '25',
    label: 'Cuisine japonaise',
    roomType: 'kitchen',
    description: 'Façades bambou clair, plan inox, mur shou sugi ban',
    sourceFilename: '9.png',
    prompt:
      'Transform this empty kitchen into an empty Japanese-minimalist kitchen. Flush-mount light bamboo wood cabinets, brushed stainless steel countertop, charred-wood shou sugi ban accent wall on one side, polished concrete floor, matte black fixtures, soft diffused natural light. Built-in appliances only, no free-standing furniture, no decoration, no clutter. Wide-angle photograph, realistic.',
  },
  {
    id: '26',
    label: 'Bibliothèque maison',
    roomType: 'multipurpose',
    description: 'Étagères murales sol-plafond, parquet sombre, échelle',
    sourceFilename: '1.png',
    prompt:
      'Transform this empty space into an empty home library room. Floor-to-ceiling built-in white painted bookshelves filling one full wall with rows of classic hardcover books, dark stained oak parquet floor, white walls on the other sides, tall window letting in soft daylight, a sliding library ladder leaning against the shelves. No additional furniture, no chairs, no clutter. Wide-angle photograph, realistic.',
  },
  {
    id: '27',
    label: 'Salle de yoga',
    roomType: 'multipurpose',
    description: 'Parquet bambou, mur en pierre claire, baie sur jardin zen',
    sourceFilename: '4.png',
    prompt:
      'Transform this empty room into an empty yoga and meditation studio. Light bamboo plank floor, full wall of natural light grey limestone, large sliding glass door overlooking a calm zen garden with raked gravel and stones, soft diffused daylight, plain white ceiling. Completely empty, no mat, no furniture, no decoration. Wide-angle photograph, realistic.',
  },
]

type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp'

function detectMime(buffer: Buffer): ImageMime | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 8
    && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
    && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (
    buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

function extensionForMime(mime: ImageMime): 'jpg' | 'png' | 'webp' {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  return 'webp'
}

async function callNanoBanana(
  client: OpenAI,
  imageBuffer: Buffer,
  inputMime: 'image/png' | 'image/jpeg',
  prompt: string,
): Promise<{ buffer: Buffer; mimeType: ImageMime }> {
  const base64Url = `data:${inputMime};base64,${imageBuffer.toString('base64')}`

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: base64Url } },
          { type: 'text', text: prompt },
        ],
      },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modalities: ['image', 'text'],
  } as never)

  const choice = response.choices?.[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const images = (choice?.message as any)?.images as
    | { type: string; image_url?: { url: string } }[]
    | undefined

  const dataUri = images?.[0]?.image_url?.url
  if (!dataUri) {
    throw new Error(`OpenRouter returned no image (finish_reason: ${choice?.finish_reason ?? 'unknown'})`)
  }

  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s.exec(dataUri)
  if (!match) throw new Error('Provider returned an unrecognised data URI')

  const buffer = Buffer.from(match[2]!, 'base64')
  const outMime = detectMime(buffer)
  if (!outMime) throw new Error('Provider buffer is not a recognised image')
  return { buffer, mimeType: outMime }
}

async function loadManifest(): Promise<ManifestEntry[]> {
  const raw = await readFile(MANIFEST_PATH, 'utf-8')
  return JSON.parse(raw) as ManifestEntry[]
}

async function writeManifest(entries: ManifestEntry[]): Promise<void> {
  const sorted = [...entries].sort((a, b) => Number(a.id) - Number(b.id))
  await writeFile(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf-8')
}

async function generateOne(
  client: OpenAI,
  spec: GenerationSpec,
): Promise<ManifestEntry> {
  const sourcePath = resolve(BASE_DIR, spec.sourceFilename)
  const sourceBuffer = await readFile(sourcePath)
  const sourceMime = detectMime(sourceBuffer)
  if (sourceMime !== 'image/png' && sourceMime !== 'image/jpeg') {
    throw new Error(`Source ${spec.sourceFilename} has unsupported MIME: ${sourceMime}`)
  }

  console.log(`[${spec.id}] Generating "${spec.label}" from ${spec.sourceFilename}…`)
  const start = Date.now()
  const { buffer, mimeType } = await callNanoBanana(client, sourceBuffer, sourceMime, spec.prompt)
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)

  const ext = extensionForMime(mimeType)
  const filename = `${spec.id}.${ext}`
  await writeFile(resolve(BASE_DIR, filename), buffer)
  console.log(`[${spec.id}] ✓ ${filename} (${(buffer.byteLength / 1024).toFixed(0)} KB, ${elapsed}s)`)

  return {
    id: spec.id,
    label: spec.label,
    filename,
    roomType: spec.roomType,
    description: spec.description,
  }
}

async function main(): Promise<void> {
  const apiKey = process.env.NUXT_OPEN_ROUTER_API_KEY
  if (!apiKey) {
    console.error('Missing NUXT_OPEN_ROUTER_API_KEY (env var or .env file).')
    process.exit(1)
  }

  const client = new OpenAI({ apiKey, baseURL: BASE_URL })
  const manifest = await loadManifest()
  const newEntries: ManifestEntry[] = []
  let skipped = 0
  let failed = 0

  for (const spec of SPECS) {
    if (manifest.some(e => e.id === spec.id)) {
      console.log(`[${spec.id}] Skipping "${spec.label}" (already in manifest).`)
      skipped++
      continue
    }
    try {
      newEntries.push(await generateOne(client, spec))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[${spec.id}] ✗ Failed: ${msg}`)
      failed++
    }
  }

  if (newEntries.length > 0) {
    await writeManifest([...manifest, ...newEntries])
    console.log(`\nManifest updated with ${newEntries.length} new entries → ${MANIFEST_PATH}`)
  }

  console.log(`\nDone — generated: ${newEntries.length}, skipped: ${skipped}, failed: ${failed}`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

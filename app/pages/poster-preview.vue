<script setup lang="ts">
import type { StoryBeat } from '~~/shared/types/architect'
import type { PosterPayload } from '~/utils/poster'

// Dev-only harness: iterate on the printed poster without replaying the whole
// conversation + generation flow. Does not exist in production builds.
if (!import.meta.dev) {
  throw createError({ statusCode: 404 })
}

useHead({ title: 'Poster preview (dev)' })

const route = useRoute()

/**
 * Watermarked sample so the preview matches real renders (the FLAA logo is
 * baked into every generated image server-side). Regenerate with:
 * `pnpm watermark:preview public/generated/<file>.png --out public/generated`
 * Override with ?img=<url>.
 */
const DEFAULT_IMG = '/generated/12b42049-f6ac-411f-892a-88badbb280f7.wm.png'
const imageUrl = computed(() => {
  const q = route.query.img
  return typeof q === 'string' && q ? q : DEFAULT_IMG
})

interface Variant {
  label: string
  concept: string
  story: StoryBeat[]
}

const beat = (trigger: string, meaning: string, design: string): StoryBeat =>
  ({ trigger, meaning, design })

// Three datasets sized to exercise each stage of the fit cascade:
// courte → fits at 100%; longue → typo shrinks; extrême → moments get cut.
const VARIANTS: Record<string, Variant> = {
  courte: {
    label: 'Courte',
    concept: 'Ta maison épouse la pente douce du terrain, tournée vers la lumière dorée de fin d\'après-midi. Le bois brut ancre le volume dans le paysage.',
    story: [
      beat('Plume, ton chat roux', 'tu cherches des refuges plutôt que des vitrines', 'Un patio ensoleillé, protégé des regards.'),
      beat('L\'automne doré', 'tu aimes quand la lumière se fait basse et chaude', 'Des baies orientées plein ouest.'),
      beat('Une cabane en forêt', 'tu te ressources loin du bruit', 'Un bardage bois qui se fond dans les arbres.'),
    ],
  },
  longue: {
    label: 'Longue',
    concept: 'Ta maison épouse la pente douce du terrain, tournée vers la lumière dorée de fin d\'après-midi qui filtre entre les troncs. Le bois brut et la pierre locale ancrent le volume dans le paysage, tandis qu\'un patio protégé t\'offre un refuge à l\'abri des regards. Les grandes baies ne s\'ouvrent que là où tu choisis de laisser entrer le monde, et chaque pièce garde une part d\'ombre où se retirer. C\'est une maison qui ne cherche pas à impressionner : elle attend qu\'on la découvre.',
    story: [
      beat('Plume, ton premier chat roux un peu rêveur', 'tu cherches des refuges plutôt que des vitrines, des endroits qui n\'appartiennent qu\'à toi', 'Un patio intérieur ensoleillé, protégé des regards par un moucharabieh de bois.'),
      beat('L\'automne en fin d\'après-midi', 'tu aimes quand la lumière se fait basse, dorée et un peu mélancolique', 'De grandes baies orientées plein ouest qui capturent la lumière rasante du soir.'),
      beat('Une cabane isolée en pleine forêt', 'tu te ressources loin du bruit, dans des lieux qui demandent qu\'on fasse l\'effort de venir', 'Un bardage de bois brûlé qui se fond dans les troncs, presque invisible depuis le chemin.'),
      beat('Ton carnet de croquis et un crayon', 'tu gardes toujours un coin rien qu\'à toi, un espace où personne ne juge', 'Un atelier mansardé baigné de lumière du nord, avec une longue table face à la forêt.'),
      beat('Contemplatif, curieux et chaleureux', 'tu accueilles volontiers, mais à ton rythme et sur ton territoire', 'Une grande pièce de vie autour d\'un poêle, ouverte sur une terrasse abritée.'),
    ],
  },
  extreme: {
    label: 'Extrême',
    concept: 'Ta maison épouse la pente douce du terrain, tournée vers la lumière dorée de fin d\'après-midi qui filtre entre les troncs des grands pins. Le bois brut et la pierre locale ancrent le volume dans le paysage, tandis qu\'un patio protégé t\'offre un refuge à l\'abri des regards indiscrets. Les grandes baies ne s\'ouvrent que là où tu choisis de laisser entrer le monde, et chaque pièce garde une part d\'ombre où se retirer quand la journée a été trop pleine. C\'est une maison qui ne cherche pas à impressionner : elle attend patiemment qu\'on la découvre, comme toi elle se révèle lentement. Les matériaux vieilliront avec elle, le bois grisera, la pierre se patinera, et dans vingt ans elle semblera avoir toujours été là.',
    story: [
      beat('Plume, ton tout premier chat roux un peu rêveur qui dormait sur le rebord de la fenêtre', 'tu cherches des refuges plutôt que des vitrines, des endroits qui n\'appartiennent qu\'à toi et où le temps ralentit', 'Un patio intérieur ensoleillé, protégé des regards par un moucharabieh de bois sculpté qui dessine des ombres mouvantes sur le sol de pierre au fil de la journée.'),
      beat('L\'automne en toute fin d\'après-midi, quand la lumière devient dorée', 'tu aimes quand la lumière se fait basse, dorée et un peu mélancolique, ces moments suspendus entre le jour et le soir', 'De grandes baies orientées plein ouest qui capturent la lumière rasante du soir et la laissent glisser profondément dans la pièce de vie jusqu\'au mur de pierre du fond.'),
      beat('Une cabane isolée en pleine forêt, loin de tout, au calme absolu', 'tu te ressources loin du bruit, dans des lieux qui demandent qu\'on fasse l\'effort de venir jusqu\'à toi', 'Un bardage de bois brûlé selon la technique du shou sugi ban qui se fond dans les troncs des pins, rendant la maison presque invisible depuis le chemin forestier.'),
      beat('Ton carnet de croquis et ton crayon, tes compagnons d\'île déserte', 'tu gardes toujours un coin rien qu\'à toi, un espace de création où personne ne vient juger ce qui naît', 'Un atelier mansardé baigné de lumière du nord constante, avec une longue table de chêne massif face à la canopée et des rangements sur toute la hauteur du pignon.'),
      beat('Contemplatif, curieux et chaleureux, disent tes proches', 'tu accueilles volontiers les autres, mais à ton rythme et sur ton territoire, sans jamais te perdre dans le bruit', 'Une grande pièce de vie organisée autour d\'un poêle de masse en stéatite, ouverte sur une terrasse abritée où les soirées d\'été s\'étirent autour d\'une longue table.'),
    ],
  },
}

const initialVariant = typeof route.query.variant === 'string' && route.query.variant in VARIANTS
  ? route.query.variant
  : 'courte'
const variantKey = ref<keyof typeof VARIANTS>(initialVariant)

const payload = computed<PosterPayload>(() => ({
  imageUrl: imageUrl.value,
  concept: VARIANTS[variantKey.value]!.concept,
  story: VARIANTS[variantKey.value]!.story,
}))

const frame = ref<HTMLIFrameElement>()
/** What the fit cascade actually did on the current render — shown as a caption. */
const fitInfo = ref('')

async function render() {
  const doc = frame.value?.contentDocument
  if (!doc) return
  doc.open()
  doc.write(buildPosterDoc(payload.value))
  doc.close()
  await whenPosterReady(doc)
  fitPosterToPage(doc)

  const texts = doc.querySelector<HTMLElement>('.texts')
  const kept = doc.querySelectorAll('.beat').length
  const total = payload.value.story.length
  fitInfo.value = [
    `typo ${texts?.style.fontSize || '100%'}`,
    `moments ${kept}/${total}`,
    doc.querySelector('.story') ? '' : 'story retirée',
  ].filter(Boolean).join(' · ')
}

watch(payload, render)
onMounted(render)
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
    <div class="flex flex-wrap items-center gap-3 mb-2">
      <h1 class="font-display text-lg font-bold">Poster preview <span class="text-neutral-400 font-normal">(dev)</span></h1>
      <div class="flex gap-1.5">
        <UButton
          v-for="(v, key) in VARIANTS"
          :key="key"
          size="sm"
          :variant="variantKey === key ? 'solid' : 'soft'"
          color="primary"
          @click="variantKey = key"
        >
          {{ v.label }}
        </UButton>
      </div>
      <UButton
        size="sm"
        variant="soft"
        color="neutral"
        icon="i-lucide-printer"
        @click="printPoster(payload)"
      >
        Imprimer
      </UButton>
      <span class="text-xs text-neutral-500">{{ fitInfo }}</span>
    </div>
    <p class="text-xs text-neutral-400 mb-4">
      Image : <code>{{ imageUrl }}</code> — surcharger avec <code>?img=&lt;url&gt;</code>
    </p>

    <!-- A4 @ 96dpi = 794×1123 css px, scaled down to fit the viewport. -->
    <div class="overflow-hidden rounded-lg ring-1 ring-black/10 shadow-xl w-fit" :style="{ width: `${794 * 0.66}px`, height: `${1123 * 0.66}px` }">
      <iframe
        ref="frame"
        title="Aperçu de l'affiche"
        style="width: 794px; height: 1123px; transform: scale(0.66); transform-origin: top left; border: 0; background: #fff;"
      />
    </div>
  </div>
</template>

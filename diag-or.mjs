import { readFileSync } from 'node:fs'

const env = readFileSync('.env', 'utf8')
const apiKey = env.match(/NUXT_OPEN_ROUTER_API_KEY=(.+)/)[1].trim()

const ARCHITECT_SYSTEM_PROMPT = `Tu es un architecte. On te fournit la transcription d'une courte conversation. À partir des réponses, infère la personnalité de la personne et conçois l'EXTÉRIEUR d'une maison qui lui ressemble.

Principes de traduction personnalité → architecture :
- Extraverti / sociable → grandes ouvertures vitrées, volumes généreux, terrasses ouvertes.
- Goût du calme / introspection → matières naturelles, lignes douces, espaces protégés, patios.
- Attachement à la nature → bois, pierre, végétalisation, intégration au paysage.
- Goût de l'ordre / rigueur → géométrie nette, béton, symétrie.
- Énergie / chaleur → couleurs chaudes, lumière dorée, matières texturées.
Adapte ces principes finement aux signaux réels de la conversation ; ne plaque pas de clichés.

Tu réponds UNIQUEMENT par du JSON brut valide, sans aucune balise markdown (pas de \`\`\`), sans texte avant ou après. Schéma exact :
- profile: CHAÎNE — résumé de personnalité inféré, 3 à 5 adjectifs (FR).
- style: CHAÎNE — libellé du parti architectural (FR).
- materials: TABLEAU de chaînes — les matériaux extérieurs principaux.
- palette: CHAÎNE — palette de couleurs décrite en une phrase (FR).
- environment: CHAÎNE — cadre / environnement + lumière (FR).
- concept: CHAÎNE — note d'intention de 3-4 phrases reliant explicitement la personnalité à la maison (FR).
- story: TABLEAU d'objets { trigger, design } — 3 à 5 moments.
- imagePrompt: CHAÎNE — prompt détaillé EN ANGLAIS pour un modèle de génération d'image.

IMPORTANT : "materials" et "story" sont des tableaux ; tous les autres champs sont des chaînes de caractères simples.`

const briefJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['profile', 'style', 'materials', 'palette', 'environment', 'concept', 'story', 'imagePrompt'],
  properties: {
    profile: { type: 'string' },
    style: { type: 'string' },
    materials: { type: 'array', items: { type: 'string' } },
    palette: { type: 'string' },
    environment: { type: 'string' },
    concept: { type: 'string' },
    story: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['trigger', 'design'],
        properties: { trigger: { type: 'string' }, design: { type: 'string' } },
      },
    },
    imagePrompt: { type: 'string' },
  },
}

const messages = [
  { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
  { role: 'assistant', content: 'Salut !' },
  { role: 'user', content: 'Champion chien' },
  { role: 'assistant', content: 'Ah Champion !' },
  { role: 'user', content: 'coucher de soleil' },
  { role: 'assistant', content: 'Les couchers de soleil...' },
  { role: 'user', content: 'village bien vivant' },
  { role: 'assistant', content: 'Un village bien vivant !' },
  { role: 'user', content: 'macbook panneau solaire' },
  { role: 'assistant', content: 'Haha, tu triches !' },
  { role: 'user', content: 'macbook' },
]

for (let i = 0; i < 6; i++) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'house_brief', strict: true, schema: briefJsonSchema },
      },
    }),
  })
  const json = await res.json()
  const msg = json.choices?.[0]?.message
  const content = typeof msg?.content === 'string' ? msg.content : ''
  const toolArgs = msg?.tool_calls?.[0]?.function?.arguments
  console.log(
    `#${i} status=${res.status} provider=${json.provider} finish=${json.choices?.[0]?.finish_reason}`,
    `contentLen=${content.length} hasToolCalls=${!!msg?.tool_calls} toolArgsLen=${toolArgs?.length ?? 0}`,
    content.trim() ? '' : '<<EMPTY CONTENT>>',
  )
}

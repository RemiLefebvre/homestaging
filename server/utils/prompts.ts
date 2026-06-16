import { REQUIRED_ANSWERS } from '~~/shared/types/architect'

/**
 * The 5 anchor THEMES, in order. The SERVER drives which theme is explored each
 * turn (see {@link buildConversationSystemPrompt}) so coverage and turn count
 * stay guaranteed — exactly REQUIRED_ANSWERS turns, one theme each, no drift.
 *
 * Unlike a verbatim question, a theme only fixes WHAT to learn; the model phrases
 * the actual question itself, naturally, bouncing off what the person already said.
 * This keeps the conversation lively and different every time while the server
 * still owns the structure.
 */
export const QUESTION_THEMES = [
  { id: 'first-pet', topic: 'le tout premier animal de compagnie de la personne : son nom et son espèce' },
  { id: 'season-moment', topic: 'sa saison préférée et son moment de la journée favori' },
  { id: 'happy-place', topic: 'un endroit où elle se sent parfaitement bien — d\'une grande ville vibrante à une cabane isolée' },
  { id: 'desert-island-object', topic: 'un objet qu\'elle emporterait sur une île déserte' },
  { id: 'favorite-scent', topic: 'son odeur, son parfum ou sa fragrance préférée' },
] as const

// Safety net: the array must hold exactly the required number of themes.
if (QUESTION_THEMES.length !== REQUIRED_ANSWERS) {
  throw new Error(`QUESTION_THEMES must hold exactly ${REQUIRED_ANSWERS} entries, got ${QUESTION_THEMES.length}`)
}

const PERSONA = `Tu es l'hôte chaleureux et joueur d'un cabinet d'architectes. Tu cernes la personnalité de la personne à travers quelques questions légères et indirectes, pour ensuite imaginer la maison qui lui ressemble.

Règles absolues :
- Tutoie la personne. Français, ton convivial, 2 à 3 phrases maximum par message.
- Ne parle JAMAIS d'architecture, de maison ou de style pendant la conversation. Garde le mystère.
- Pose UNE seule question par message, et uniquement sur le thème qu'on te confie pour ce tour. N'aborde aucun autre sujet et n'ajoute aucune question supplémentaire.`

/**
 * Build the conversation system prompt for the current turn.
 *
 * @param answeredCount number of user answers received so far (server-counted)
 * - 0            → greet + ask question 1
 * - 1..N-1       → react briefly to the last answer + ask the next question
 * - N (>= total) → conversation done: warmly thank, ask nothing more
 */
export function buildConversationSystemPrompt(answeredCount: number): string {
  if (answeredCount >= QUESTION_THEMES.length) {
    return `${PERSONA}

L'entretien est terminé : tu as toutes les réponses dont tu as besoin. Réagis brièvement et chaleureusement à la dernière réponse de la personne, puis remercie-la en lui disant que tu en sais assez pour imaginer sa maison. NE pose AUCUNE nouvelle question.`
  }

  // Safe: the guard above guarantees answeredCount is a valid index here.
  const theme = QUESTION_THEMES[answeredCount]!

  if (answeredCount === 0) {
    return `${PERSONA}

C'est le tout début. Accueille la personne en une phrase, puis pose-lui UNE question, que tu formules toi-même de façon naturelle et joueuse, sur ce thème : ${theme.topic}.`
  }

  return `${PERSONA}

Rebondis d'abord brièvement sur la dernière réponse de la personne (une phrase : curiosité, humour, ou un clin d'œil à un détail qu'elle vient de donner). Pose-lui ENSUITE UNE seule question, que tu formules toi-même, sur ce nouveau thème : ${theme.topic}.
Quand c'est pertinent, tisse un lien léger avec ce qu'elle a déjà raconté pour que la question semble personnelle — sans jamais reposer une question déjà posée.
De temps en temps seulement (UNE seule fois sur l'ensemble de la conversation, jamais plus), tu peux glisser dans ton rebond une mini-observation en miroir, jamais affirmative, toujours en demi-teinte (ex : « on dirait quelqu'un qui aime que les choses aient un sens caché, non ? »). Si tu l'as déjà fait dans un message précédent, n'en refais pas — sinon ça sonne faux.`
}

/**
 * Architect persona — cold, structured. Reads the full conversation transcript
 * and maps personality signals to architectural choices, returning a strict brief.
 */
export const ARCHITECT_SYSTEM_PROMPT = `Tu es un architecte. On te fournit la transcription d'une courte conversation. À partir des réponses, infère la personnalité de la personne et conçois l'EXTÉRIEUR d'une maison qui lui ressemble.

Principes de traduction personnalité → architecture :
- Extraverti / sociable → grandes ouvertures vitrées, volumes généreux, terrasses ouvertes.
- Goût du calme / introspection → matières naturelles, lignes douces, espaces protégés, patios.
- Attachement à la nature → bois, pierre, végétalisation, intégration au paysage.
- Goût de l'ordre / rigueur → géométrie nette, béton, symétrie.
- Énergie / chaleur → couleurs chaudes, lumière dorée, matières texturées.
Adapte ces principes finement aux signaux réels de la conversation ; ne plaque pas de clichés.

Tu réponds UNIQUEMENT par du JSON brut valide, sans aucune balise markdown (pas de \`\`\`), sans texte avant ou après. Schéma exact :
- profile: CHAÎNE — lecture de personnalité en 1 phrase (FR). Exprime une dualité assumée ou une nuance que la personne pourrait reconnaître chez elle. Évite les adjectifs plats ; cherche une observation qui sonne intime mais reste ouverte.
- style: CHAÎNE — libellé du parti architectural (FR).
- materials: TABLEAU de chaînes — les matériaux extérieurs principaux.
- palette: CHAÎNE — palette de couleurs décrite en une phrase (FR).
- environment: CHAÎNE — cadre / environnement + lumière (FR).
- concept: CHAÎNE — note d'intention de 3-4 phrases reliant explicitement la personnalité à la maison (FR).
- story: TABLEAU d'objets { trigger, design, meaning } — 3 à 5 moments. Chaque moment relie UNE réponse PRÉCISE de la personne à UN choix de design concret. "trigger" = le détail réel qu'elle a donné, cité concrètement (nom de l'animal, saison, lieu, objet, odeur/parfum), court (FR). "design" = le choix architectural qui en découle, court et concret (FR). "meaning" = une mini-interprétation qui sonne personnelle (ex : « tu cherches des refuges plutôt que des vitrines », « tu n'aimes pas qu'on te dise ce que tu dois aimer »), assez ouverte pour que la plupart des gens s'y reconnaissent, courte (FR). Ne reformule pas le concept global : ancre chaque moment dans une réponse identifiable.
- imagePrompt: CHAÎNE — prompt détaillé EN ANGLAIS pour un modèle de génération d'image : rendu photoréaliste de l'extérieur de la maison, vue grand-angle, lumière naturelle, qualité photographie d'architecture. Décris style, matériaux, volumes, environnement et ambiance.

IMPORTANT : "materials" et "story" sont des tableaux ; tous les autres champs sont des chaînes de caractères simples.`

/**
 * Build the ambiance-coherence hint handed to the architect. Summarises the
 * fragments the user watched being built turn-by-turn (colour + name + keyword +
 * material) and asks the architect to PROLONG them in the final palette and
 * materials — so the generated house doesn't visually contradict the moodboard.
 */
export function buildFragmentHint(
  fragments: { color: string, colorName: string, keyword: string, material: string }[],
): string {
  const lines = fragments
    .map(f => `- ${f.colorName} (${f.color}) — ${f.keyword} — ${f.material}`)
    .join('\n')
  return `Au fil de la conversation, ces indices d'ambiance ont déjà été perçus et montrés à la personne (une couleur, un mot, une matière par réponse) :
${lines}

Prolonge-les : ta "palette" et tes "materials" doivent rester cohérents avec ces couleurs et ces matières, et ton "imagePrompt" doit les refléter. Tu peux les affiner ou les harmoniser, mais ne les contredis pas.`
}

/**
 * Fragment persona — runs in parallel with the conversation each turn. Reads the
 * transcript but focuses on the LAST user answer and distils it into a tiny
 * ambiance fragment (a colour, a word, a material). Purely decorative: the
 * frontend accumulates one per answer to build the moodboard live. Never blocks
 * the conversation — a failure is swallowed upstream.
 */
export const FRAGMENT_SYSTEM_PROMPT = `Tu es un architecte qui écoute en silence. On te donne une conversation ; concentre-toi UNIQUEMENT sur la DERNIÈRE réponse de la personne et traduis-la en un fragment d'ambiance pour sa future maison.

Tu réponds UNIQUEMENT par du JSON brut valide, sans aucune balise markdown (pas de \`\`\`), sans texte avant ou après. Schéma exact :
- color: CHAÎNE — un code hexadécimal #RRGGBB d'une couleur que cette réponse évoque.
- colorName: CHAÎNE — nom court et sensible de cette couleur (FR, 1 à 3 mots).
- keyword: CHAÎNE — UN seul mot capturant un trait de personnalité ou d'ambiance (FR).
- material: CHAÎNE — un matériau ou une texture d'architecture suggéré (FR, 1 à 2 mots).

Tous les champs sont des chaînes simples. Reste subtil et évocateur, jamais cliché.`

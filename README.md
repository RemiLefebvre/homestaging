# tamaison — *Dis-moi qui tu es, je construis ta maison*

Un POC web qui transforme une courte conversation en une maison sur-mesure : 5 questions, une analyse de personnalité, puis une image de l'extérieur de la maison qui ressemble à la personne.

> Le repo s'appelle `homestaging`, le produit s'appelle **tamaison**.

## Comment ça marche

1. L'utilisateur répond à 5 questions ouvertes (`POST /api/conversation`).
2. Chaque réponse est distillée en parallèle sur un modèle léger (Haiku) en un *fragment* d'ambiance (couleur, matériau, mot) qui alimente un **moodboard** en direct — best-effort, n'interrompt jamais la conversation.
3. Une fois les 5 réponses données, un *architect prompt* infère un profil de personnalité et un brief architectural (`POST /api/house/brief`).
4. Le brief sert de prompt à un modèle d'image (`POST /api/house/image`). Le rendu reçoit un **filigrane** (logo de marque) puis est stocké sur Vercel Blob.
5. La page d'accueil affiche en fond une **galerie** des maisons générées les plus récentes (`GET /api/gallery`).

## Stack

- [Nuxt 4](https://nuxt.com/) (SSR off, mode SPA)
- [Nuxt UI 3](https://ui.nuxt.com/) + Tailwind CSS 4
- [motion-v](https://motion.dev/) pour les animations
- [OpenRouter](https://openrouter.ai/) pour les appels LLM et la génération d'images (texte : `anthropic/claude-sonnet-4` ; moodboard : `anthropic/claude-haiku-4.5`)
- [sharp](https://sharp.pixelplumbing.com/) pour le filigrane et les vignettes de galerie
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) pour stocker les rendus
- TypeScript strict, [Zod](https://zod.dev/) pour la validation

## Lancer en local

Prérequis : Node 20+ et [pnpm](https://pnpm.io/).

```bash
pnpm install
cp .env.example .env   # puis renseigne ta clé OpenRouter
pnpm dev
```

L'app tourne sur http://localhost:3000.

### Scripts

| Commande | Rôle |
|---|---|
| `pnpm dev` | Serveur de dev |
| `pnpm build` | Build Nuxt, puis copie des binaires libvips pour Vercel (`scripts/copy-libvips.mjs`) |
| `pnpm typecheck` | Vérification des types (`vue-tsc`) |
| `pnpm watermark:preview` | Aperçu CLI du filigrane sans passer par l'app (`scripts/watermark-preview.mts`) |
| `pnpm import:prod` | Télécharge le store Blob (rendus + coordonnées + `leads.csv`) dans `exports/`. `--prune` (avec `--keep=N`, défaut 25) archive d'abord les rendus les plus anciens dans `exports/images/` (vérification de taille), puis les supprime côté serveur — annulation totale si une copie locale manque ; les leads sont conservés (`scripts/import-prod.mts`) |

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `NUXT_OPEN_ROUTER_API_KEY` | oui | Clé API [OpenRouter](https://openrouter.ai/keys) |
| `BLOB_READ_WRITE_TOKEN` | oui | Token d'écriture pour [Vercel Blob](https://vercel.com/docs/storage/vercel-blob). Récupéré automatiquement en prod si un store Blob est lié au projet ; en local : `vercel env pull` ou copie depuis le dashboard |
| `NUXT_OPEN_ROUTER_TEXT_MODEL` | non | Modèle texte de l'architecte (défaut : `anthropic/claude-sonnet-4`) |
| `NUXT_OPEN_ROUTER_FRAGMENT_MODEL` | non | Modèle des fragments de moodboard (défaut : `anthropic/claude-haiku-4.5`) |
| `MAX_STORED_IMAGES` | non | Plafond par défaut de l'élagage **manuel** `pnpm import:prod --prune` (défaut : `25`). Il n'y a plus d'élagage automatique à chaque sauvegarde |
| `NUXT_SITE_PASSWORD` | non | Si défini, l'app est protégée par un mot de passe (`POST /api/auth`). Vide ou absent : accès public |

Les maisons sont stockées sur Vercel Blob — pas dans le repo. Un rendu passe d'abord par `pending/` (temporaire, nettoyé après 1 h s'il n'est pas validé) ; à la validation du formulaire il est promu en `generated/` (pleine résolution) + `gallery/` (vignette WebP), et les coordonnées sont écrites en `leads/{id}-{suffixe}.json` — le store est public, mais le suffixe aléatoire rend l'URL non devinable et elle n'est jamais renvoyée au client (PII).

## Structure

```
app/         # pages, composants, composables Vue
server/      # endpoints Nitro + utils (openrouter, brief, image, storage, watermark)
shared/      # types partagés app ↔ server
scripts/     # copy-libvips (build Vercel), watermark-preview + import-prod (CLI)
public/      # assets statiques (logo de marque, intérieurs de base)
```

## Déploiement (Vercel)

`sharp` s'appuie sur libvips, qui n'est pas présent par défaut dans le runtime serverless. Le script `scripts/copy-libvips.mjs` (lancé automatiquement en fin de `pnpm build`) copie les `.so` requis dans le bundle. Ne pas déplacer ce hook dans `nuxt.config` : cela casse la détection du build output par Vercel.

## Licence

[MIT](./LICENSE)

# Homestaging — *Dis-moi qui tu es, je construis ta maison*

Un POC web qui transforme une courte conversation en une maison sur-mesure : 5 questions, une analyse de personnalité, puis une image de l'extérieur de la maison qui ressemble à la personne.

## Comment ça marche

1. L'utilisateur répond à 5 questions ouvertes (`POST /api/conversation`).
2. Un *architect prompt* infère un profil de personnalité et un brief architectural (`POST /api/house/brief`).
3. Le brief sert de prompt à un modèle d'image (`POST /api/house/image`).
4. Pendant la conversation, un *moodboard* se construit en direct (couleurs, matériaux, ambiance) à partir de chaque réponse.

## Stack

- [Nuxt 4](https://nuxt.com/) (SSR off, mode SPA)
- [Nuxt UI 3](https://ui.nuxt.com/) + Tailwind CSS 4
- [motion-v](https://motion.dev/) pour les animations
- [OpenRouter](https://openrouter.ai/) pour les appels LLM et la génération d'images (texte : `anthropic/claude-sonnet-4` par défaut)
- TypeScript strict, [Zod](https://zod.dev/) pour la validation

## Lancer en local

Prérequis : Node 20+ et [pnpm](https://pnpm.io/).

```bash
pnpm install
cp .env.example .env   # puis renseigne ta clé OpenRouter
pnpm dev
```

L'app tourne sur http://localhost:3000.

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `NUXT_OPEN_ROUTER_API_KEY` | oui | Clé API [OpenRouter](https://openrouter.ai/keys) |
| `BLOB_READ_WRITE_TOKEN` | oui | Token d'écriture pour [Vercel Blob](https://vercel.com/docs/storage/vercel-blob). Récupéré automatiquement en prod si un store Blob est lié au projet ; en local : `vercel env pull` ou copie depuis le dashboard |
| `NUXT_OPEN_ROUTER_TEXT_MODEL` | non | Modèle texte (défaut : `anthropic/claude-sonnet-4`) |

Les maisons générées sont stockées sur Vercel Blob (préfixe `generated/`) — pas dans le repo.

## Structure

```
app/         # pages, composants, composables Vue
server/      # endpoints Nitro + utils (openrouter, brief, image, storage)
shared/      # types partagés app ↔ server
public/      # assets statiques + dossier des images générées
```

## Licence

[MIT](./LICENSE)

# Homestaging — *Tell me who you are, I'll build your house*

A web POC that turns a short conversation into a bespoke house: 5 questions, a personality reading, and an image of the exterior of the house that resembles the person.

## How it works

1. The user answers 5 open questions (`POST /api/conversation`).
2. An *architect prompt* infers a personality profile and an architectural brief (`POST /api/house/brief`).
3. The brief is used as a prompt for an image model (`POST /api/house/image`).
4. During the conversation, a *moodboard* is built in real time (colours, materials, atmosphere) from each answer.

## Stack

- [Nuxt 4](https://nuxt.com/) (SSR off, SPA mode)
- [Nuxt UI 3](https://ui.nuxt.com/) + Tailwind CSS 4
- [motion-v](https://motion.dev/) for animations
- [OpenRouter](https://openrouter.ai/) for LLM calls and image generation (text model: `anthropic/claude-sonnet-4` by default)
- TypeScript strict, [Zod](https://zod.dev/) for validation

## Run locally

Requirements: Node 20+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
cp .env.example .env   # then fill in your OpenRouter key
pnpm dev
```

The app runs on http://localhost:3000.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NUXT_OPEN_ROUTER_API_KEY` | yes | [OpenRouter](https://openrouter.ai/keys) API key |
| `NUXT_OPEN_ROUTER_TEXT_MODEL` | no | Text model (default: `anthropic/claude-sonnet-4`) |

Generated images are stored in `public/generated/` (git-ignored).

## Structure

```
app/         # Vue pages, components, composables
server/      # Nitro endpoints + utils (openrouter, brief, image, storage)
shared/      # types shared between app and server
public/      # static assets + folder for generated images
```

## License

[MIT](./LICENSE)

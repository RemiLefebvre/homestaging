import type { ApiErrorCode } from '~~/server/utils/errors'

interface ErrorMessage {
  title: string
  hint: string
}

const MESSAGES: Record<ApiErrorCode, ErrorMessage> = {
  MISSING_API_KEY: {
    title: 'Configuration manquante',
    hint: 'La clé OpenRouter n’est pas configurée côté serveur. Ajoute NUXT_OPEN_ROUTER_API_KEY dans ton fichier .env puis relance le serveur.',
  },
  SOURCE_NOT_FOUND: {
    title: 'Image introuvable',
    hint: 'L’image source n’a pas été trouvée. Choisis un autre intérieur de base ou recommence.',
  },
  INVALID_SOURCE_PATH: {
    title: 'Chemin invalide',
    hint: 'Le chemin de l’image est invalide. Recommence en choisissant un intérieur de la liste.',
  },
  UNSUPPORTED_MIME: {
    title: 'Format non supporté',
    hint: 'Seuls les JPEG et PNG sont acceptés. Vérifie le format du fichier source.',
  },
  SOURCE_TOO_LARGE: {
    title: 'Image trop lourde',
    hint: 'La limite est de 5 Mo par image. Réduis la taille et réessaie.',
  },
  EMPTY_PROMPT: {
    title: 'Description vide',
    hint: 'Décris comment tu veux agencer la pièce avant de lancer la génération.',
  },
  PROVIDER_ERROR: {
    title: 'Le générateur est indisponible',
    hint: 'Le service IA n’a pas répondu. Réessaie dans un instant.',
  },
  INVALID_PROVIDER_RESPONSE: {
    title: 'Réponse invalide du générateur',
    hint: 'L’IA n’a pas renvoyé d’image exploitable. Réessaie avec une description légèrement différente.',
  },
  OUTPUT_TOO_LARGE: {
    title: 'Image générée trop lourde',
    hint: 'L’image renvoyée dépasse 5 Mo. Réessaie avec une description plus simple.',
  },
}

const FALLBACK: ErrorMessage = {
  title: 'Erreur inattendue',
  hint: 'Quelque chose s’est mal passé. Réessaie.',
}

export function useGenerationError() {
  function messageFor(code: string | null | undefined): ErrorMessage {
    if (!code) return FALLBACK
    return MESSAGES[code as ApiErrorCode] ?? FALLBACK
  }

  function extractCode(err: unknown): string | null {
    if (err && typeof err === 'object') {
      const anyErr = err as { data?: { code?: string }; statusMessage?: string }
      return anyErr.data?.code ?? anyErr.statusMessage ?? null
    }
    return null
  }

  return { messageFor, extractCode }
}

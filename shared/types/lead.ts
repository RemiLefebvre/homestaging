import { z } from 'zod'

/**
 * Contact form filled when a user validates ("Valider") their generated house.
 * Shared between the client modal and the server so validation lives in one place.
 */
export const leadFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Prénom requis').max(80),
  lastName: z.string().trim().min(1, 'Nom requis').max(80),
  email: z.string().trim().email('Email invalide').max(160),
})

export type LeadForm = z.infer<typeof leadFormSchema>

/**
 * Poster text captured at validation time. The printed A4 (note d'intention +
 * story) can only be rebuilt offline for the print shop if we persist it with
 * the lead — the brief otherwise lives only in client state and is lost on save.
 * Tolerant defaults so a save never fails on a thin or partial brief.
 */
export const posterContentSchema = z.object({
  concept: z.string().max(4000).default(''),
  story: z
    .array(z.object({
      trigger: z.string().max(400).default(''),
      design: z.string().max(1000).default(''),
      meaning: z.string().max(1000).default(''),
    }))
    .max(6)
    .default([]),
})

export type PosterContent = z.infer<typeof posterContentSchema>

/** What we persist per validated house (private `leads/{id}.json` sidecar). */
export interface StoredLead extends LeadForm, PosterContent {
  imageUrl: string
  createdAt: string
}

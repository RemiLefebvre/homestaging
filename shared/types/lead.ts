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

/** What we persist per validated house (private `leads/{id}.json` sidecar). */
export interface StoredLead extends LeadForm {
  imageUrl: string
  createdAt: string
}

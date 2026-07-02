import {
  fetchAcademicTerms,
  fetchPostedCurrentAcademicTerm,
  type AcademicTerm,
} from '../../lib/api'
import { findPortalDefaultAcademicTerm } from '../../lib/adminPortalDefaultTerm'

/**
 * Prefer the registrar portal-default term; otherwise the visible term
 * with the highest `sequence_no`.
 */
export async function resolveDocumentsAcademicTerm(
  options?: { signal?: AbortSignal },
): Promise<AcademicTerm> {
  const signal = options?.signal
  const posted = await fetchPostedCurrentAcademicTerm({ signal })
  if (posted) return posted

  const all = await fetchAcademicTerms({ signal })
  const fromFlag = findPortalDefaultAcademicTerm(all)
  if (fromFlag) return fromFlag

  const visible = all.filter((t) => t.is_visible)
  if (visible.length === 0) {
    throw new Error(
      'No academic term is available for documents. Check back later or contact the registrar.',
    )
  }
  visible.sort((a, b) => b.sequence_no - a.sequence_no)
  return visible[0]!
}

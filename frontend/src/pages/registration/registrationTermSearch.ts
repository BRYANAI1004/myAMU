import { useSearchParams } from 'react-router-dom'
import {
  readRegistrationTermIdFromSearch,
  type AcademicTerm,
} from '../../lib/api'

export { readRegistrationTermIdFromSearch, REGISTRATION_TERM_QUERY_KEY } from '../../lib/api'

/** Academic term id from `?term=` in the registration module (URL is source of truth). */
export function useRegistrationTermSearchParam(): string | null {
  const [searchParams] = useSearchParams()
  return readRegistrationTermIdFromSearch(searchParams)
}

/** Merge recent-visible terms with any extra rows (e.g. posted dashboard + registration-open current). */
export function mergeTermOptions(
  recent: AcademicTerm[],
  ...extras: (AcademicTerm | null | undefined)[]
): AcademicTerm[] {
  const byId = new Map<string, AcademicTerm>()
  for (const t of recent) {
    byId.set(t.id, t)
  }
  for (const ex of extras) {
    if (ex != null && !byId.has(ex.id)) {
      byId.set(ex.id, ex)
    }
  }
  return Array.from(byId.values()).sort((a, b) => b.sequence_no - a.sequence_no)
}

/**
 * URL term wins if it exists in options; else the registrar portal-default term
 * (`is_posted_to_dashboard` / current-posted API); else the first option.
 */
export function resolveSelectedRegistrationTermId(
  urlTerm: string | null,
  options: AcademicTerm[],
  postedCurrent: AcademicTerm | null,
  _registrationOpenCurrent?: AcademicTerm | null,
): string {
  const url = urlTerm?.trim() ?? ''
  if (url !== '' && options.some((t) => t.id === url)) {
    return url
  }
  if (postedCurrent != null && options.some((t) => t.id === postedCurrent.id)) {
    return postedCurrent.id
  }
  return options[0]?.id ?? ''
}

/** Default term on the registration home picker (no URL yet). */
export function pickDefaultRegistrationTermId(
  options: AcademicTerm[],
  postedCurrent: AcademicTerm | null,
  registrationOpenCurrent: AcademicTerm | null,
): string {
  return resolveSelectedRegistrationTermId(null, options, postedCurrent, registrationOpenCurrent)
}

/** Sentinel for translated copy via `t('registrationTermsLoadError')` in the registration UI. */
export const REGISTRATION_TERMS_LOAD_ERROR = '__REGISTRATION_TERMS_LOAD_ERROR__'

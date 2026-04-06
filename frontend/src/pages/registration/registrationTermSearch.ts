import { useSearchParams } from 'react-router-dom'
import { readRegistrationTermIdFromSearch } from '../../lib/api'

/** Academic term id from `?term=` in the registration module (URL is source of truth). */
export function useRegistrationTermSearchParam(): string | null {
  const [searchParams] = useSearchParams()
  return readRegistrationTermIdFromSearch(searchParams)
}

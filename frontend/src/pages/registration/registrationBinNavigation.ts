import type { NavigateFunction } from 'react-router-dom'

export function registrationBinPath(termId: string | null | undefined): string {
  const tid = termId?.trim() ?? ''
  const search = tid !== '' ? `?term=${encodeURIComponent(tid)}` : ''
  return `/registration/bin${search}`
}

export function navigateToRegistrationBin(
  navigate: NavigateFunction,
  termId: string | null | undefined,
): void {
  const tid = termId?.trim() ?? ''
  navigate({
    pathname: '/registration/bin',
    search: tid !== '' ? `?term=${encodeURIComponent(tid)}` : '',
  })
}

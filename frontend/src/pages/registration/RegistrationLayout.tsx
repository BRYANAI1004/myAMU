import { useEffect, useMemo, useState } from 'react'
import { Outlet, useSearchParams } from 'react-router-dom'
import { BackToDashboardLink } from '../../components/BackToDashboardLink'
import {
  fetchCurrentAcademicTerm,
  fetchRecentAcademicTerms,
  readRegistrationTermIdFromSearch,
  type AcademicTerm,
} from '../../lib/api'
import { CourseBinProvider } from './CourseBinContext'
import { RegistrationNav } from './RegistrationNav'

function mergeTermOptions(
  recent: AcademicTerm[],
  current: AcademicTerm | null,
): AcademicTerm[] {
  const byId = new Map<string, AcademicTerm>()
  for (const t of recent) {
    byId.set(t.id, t)
  }
  if (current && !byId.has(current.id)) {
    byId.set(current.id, current)
  }
  return Array.from(byId.values()).sort((a, b) => b.sequence_no - a.sequence_no)
}

function resolveSelectedTermId(
  urlTerm: string | null,
  options: AcademicTerm[],
  current: AcademicTerm | null,
): string {
  const url = urlTerm?.trim() ?? ''
  if (url !== '' && options.some((t) => t.id === url)) {
    return url
  }
  if (current != null && options.some((t) => t.id === current.id)) {
    return current.id
  }
  return options[0]?.id ?? ''
}

export function RegistrationLayout() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [recentTerms, setRecentTerms] = useState<AcademicTerm[]>([])
  const [currentTerm, setCurrentTerm] = useState<AcademicTerm | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)

  const options = useMemo(
    () => mergeTermOptions(recentTerms, currentTerm),
    [recentTerms, currentTerm],
  )

  useEffect(() => {
    const ac = new AbortController()
    setLoadState('loading')
    setLoadError(null)
    ;(async () => {
      try {
        const [recent, current] = await Promise.all([
          fetchRecentAcademicTerms(3, { signal: ac.signal }),
          fetchCurrentAcademicTerm({ signal: ac.signal }),
        ])
        if (ac.signal.aborted) return
        setRecentTerms(recent)
        setCurrentTerm(current)
        setLoadState('ready')
      } catch (e) {
        if (ac.signal.aborted) return
        setLoadState('error')
        setLoadError(e instanceof Error ? e.message : 'Could not load terms.')
      }
    })()
    return () => ac.abort()
  }, [])

  useEffect(() => {
    if (loadState !== 'ready') return
    const urlTerm = readRegistrationTermIdFromSearch(searchParams)
    const resolvedId = resolveSelectedTermId(urlTerm, options, currentTerm)

    if (options.length === 0) {
      if (searchParams.has('term')) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.delete('term')
            return next
          },
          { replace: true },
        )
      }
      return
    }

    if (resolvedId === '') return

    const urlTrim = urlTerm?.trim() ?? ''
    const urlValid = urlTrim !== '' && options.some((t) => t.id === urlTrim)
    if (!urlValid || urlTrim !== resolvedId) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('term', resolvedId)
          return next
        },
        { replace: true },
      )
    }
  }, [loadState, options, currentTerm, searchParams, setSearchParams])

  const urlTerm = readRegistrationTermIdFromSearch(searchParams)
  const selectedTermId = resolveSelectedTermId(urlTerm, options, currentTerm)

  const termLinkSearch =
    selectedTermId.trim() !== '' ? `?term=${encodeURIComponent(selectedTermId.trim())}` : ''

  return (
    <CourseBinProvider>
      <div className="portal-registration-module">
        <header className="portal-module-header">
          <BackToDashboardLink />
          <h1 className="portal-page-title">Registration</h1>
        </header>

        <div
          className="portal-registration-layout-term"
          aria-labelledby="registration-layout-term-label"
        >
          <div className="portal-registration-layout-term__row">
            <span id="registration-layout-term-label" className="portal-registration-layout-term__title">
              Select Term
            </span>
            {loadState === 'loading' ? (
              <p className="portal-text-muted portal-registration-layout-term__status" role="status">
                Loading terms…
              </p>
            ) : null}
            {loadState === 'error' ? (
              <p className="portal-text-muted portal-registration-layout-term__status" role="alert">
                {loadError ?? 'Could not load terms.'}
              </p>
            ) : null}
            {loadState === 'ready' && options.length === 0 ? (
              <p className="portal-text-muted portal-registration-layout-term__status" role="status">
                No registration terms are currently available.
              </p>
            ) : null}
            {loadState === 'ready' && options.length > 0 ? (
              <select
                id="registration-layout-term-select"
                className="portal-account-ledger__select portal-registration-layout-term__select"
                aria-labelledby="registration-layout-term-label"
                value={options.some((t) => t.id === selectedTermId) ? selectedTermId : ''}
                onChange={(e) => {
                  const next = e.target.value.trim()
                  if (next === '') return
                  setSearchParams(
                    (prev) => {
                      const p = new URLSearchParams(prev)
                      p.set('term', next)
                      return p
                    },
                    { replace: false },
                  )
                }}
              >
                {options.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.term_label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          {loadState === 'ready' && options.length > 0 ? (
            <p className="portal-text-muted portal-registration-layout-term__hint">
              Recent terms shown here are published by the registrar.
            </p>
          ) : null}
        </div>

        <RegistrationNav termLinkSearch={termLinkSearch} />
        <div className="portal-registration-outlet">
          <Outlet />
        </div>
      </div>
    </CourseBinProvider>
  )
}

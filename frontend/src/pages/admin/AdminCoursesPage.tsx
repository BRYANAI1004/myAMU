import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchAcademicTerms,
  fetchAdminCourseCatalog,
  fetchAdminCourseCatalogSummary,
  fetchAdminCoursesOpenForRegistration,
  fetchCurrentAcademicTerm,
  type AcademicTerm,
  type CourseCatalogItem,
  type CourseCatalogPrefixCounts,
  type OpenRegistrationCourseRow,
} from '../../lib/api'
import { AllCoursesTable } from './courses/AllCoursesTable'
import { catalogGroupById } from './courses/catalogPrefixGroups'
import { CoursesTabBar, type AdminCoursesTabId } from './courses/CoursesTabBar'
import { OpenRegistrationCoursesTable } from './courses/OpenRegistrationCoursesTable'

const CATALOG_PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300
const DEFAULT_CATALOG_GROUP_ID = 'bs'

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export function AdminCoursesPage() {
  const [tab, setTab] = useState<AdminCoursesTabId>('catalog')

  const [catalogRows, setCatalogRows] = useState<CourseCatalogItem[]>([])
  const [catalogTotal, setCatalogTotal] = useState(0)
  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogSearch, setCatalogSearch] = useState('')
  const debouncedCatalogSearch = useDebouncedValue(catalogSearch, SEARCH_DEBOUNCE_MS)
  const [catalogReloadKey, setCatalogReloadKey] = useState(0)
  const [catalogGroupId, setCatalogGroupId] = useState(DEFAULT_CATALOG_GROUP_ID)
  const [prefixCounts, setPrefixCounts] = useState<CourseCatalogPrefixCounts | null>(
    null,
  )

  const [terms, setTerms] = useState<AcademicTerm[] | null>(null)
  const [termsLoading, setTermsLoading] = useState(true)
  const [termsError, setTermsError] = useState<string | null>(null)

  const [openTermId, setOpenTermId] = useState('')
  const openTermAutoDone = useRef(false)

  const [openSearch, setOpenSearch] = useState('')
  const [openRowsRaw, setOpenRowsRaw] = useState<OpenRegistrationCourseRow[] | null>(
    null,
  )
  const [openLoading, setOpenLoading] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)

  const searchActive = debouncedCatalogSearch.trim() !== ''

  const catalogPrefixes = useMemo(() => {
    if (searchActive) return undefined
    return catalogGroupById(catalogGroupId)?.prefixes
  }, [searchActive, catalogGroupId])

  useEffect(() => {
    const ac = new AbortController()
    setTermsLoading(true)
    setTermsError(null)
    ;(async () => {
      try {
        const t = await fetchAcademicTerms({ signal: ac.signal })
        if (ac.signal.aborted) return
        setTerms(t)
      } catch (e) {
        if (ac.signal.aborted) return
        setTerms([])
        setTermsError(
          e instanceof Error ? e.message : 'Could not load academic terms.',
        )
      } finally {
        if (!ac.signal.aborted) setTermsLoading(false)
      }
    })()
    return () => ac.abort()
  }, [])

  useEffect(() => {
    if (tab !== 'catalog') return
    const ac = new AbortController()
    void (async () => {
      try {
        const summary = await fetchAdminCourseCatalogSummary({ signal: ac.signal })
        if (ac.signal.aborted) return
        setPrefixCounts(summary)
      } catch {
        if (!ac.signal.aborted) setPrefixCounts(null)
      }
    })()
    return () => ac.abort()
  }, [tab, catalogReloadKey])

  useEffect(() => {
    if (tab !== 'catalog') return
    const ac = new AbortController()
    setCatalogLoading(true)
    setCatalogError(null)
    ;(async () => {
      try {
        const result = await fetchAdminCourseCatalog({
          q: debouncedCatalogSearch,
          prefixes: catalogPrefixes,
          page: catalogPage,
          limit: CATALOG_PAGE_SIZE,
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        setCatalogRows(result.rows)
        setCatalogTotal(result.total)
      } catch (e) {
        if (ac.signal.aborted) return
        setCatalogRows([])
        setCatalogTotal(0)
        setCatalogError(
          e instanceof Error ? e.message : 'Could not load course catalog.',
        )
      } finally {
        if (!ac.signal.aborted) setCatalogLoading(false)
      }
    })()
    return () => ac.abort()
  }, [
    tab,
    debouncedCatalogSearch,
    catalogPage,
    catalogReloadKey,
    catalogPrefixes,
  ])

  useEffect(() => {
    setCatalogPage(1)
  }, [debouncedCatalogSearch, catalogGroupId])

  useEffect(() => {
    if (!terms?.length || openTermAutoDone.current) return
    const ac = new AbortController()
    ;(async () => {
      try {
        const cur = await fetchCurrentAcademicTerm({ signal: ac.signal })
        if (ac.signal.aborted) return
        if (cur && terms.some((x) => x.id === cur.id)) {
          setOpenTermId(cur.id)
        } else {
          setOpenTermId(terms[0].id)
        }
      } catch {
        if (!ac.signal.aborted) setOpenTermId(terms[0].id)
      } finally {
        if (!ac.signal.aborted) openTermAutoDone.current = true
      }
    })()
    return () => ac.abort()
  }, [terms])

  useEffect(() => {
    if (tab !== 'open' || !openTermId) return
    const ac = new AbortController()
    setOpenLoading(true)
    setOpenError(null)
    ;(async () => {
      try {
        const rows = await fetchAdminCoursesOpenForRegistration({
          termId: openTermId,
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        setOpenRowsRaw(rows)
      } catch (e) {
        if (ac.signal.aborted) return
        setOpenRowsRaw(null)
        setOpenError(
          e instanceof Error
            ? e.message
            : 'Could not load open-registration courses.',
        )
      } finally {
        if (!ac.signal.aborted) setOpenLoading(false)
      }
    })()
    return () => ac.abort()
  }, [tab, openTermId])

  const reloadCatalogPage = useCallback(() => {
    setCatalogReloadKey((k) => k + 1)
  }, [])

  const filteredOpen = useMemo(() => {
    const list = openRowsRaw ?? []
    const s = openSearch.trim().toLowerCase()
    if (!s) return list
    return list.filter(
      (r) =>
        r.courseCode.toLowerCase().includes(s) ||
        r.courseTitle.toLowerCase().includes(s),
    )
  }, [openRowsRaw, openSearch])

  const openTabBlocking =
    tab === 'open' &&
    (termsLoading || (terms !== null && terms.length > 0 && openTermId === ''))

  return (
    <main className="admin-page admin-courses-page">
      <div className="admin-courses-page__header">
        <div className="admin-courses-page__heading">
          <h1 className="admin-page__title admin-page__title--inline">Courses</h1>
          <p className="admin-courses-page__lede">
            {tab === 'catalog'
              ? 'Browse the master catalog by course-code family (BS, OM, AC…), or search across all courses.'
              : 'See which catalog courses have open sections and active registrations for a term.'}
          </p>
        </div>
      </div>

      <CoursesTabBar
        active={tab}
        onChange={(next) => {
          setTab(next)
          if (next === 'open') setOpenSearch('')
          if (next === 'catalog') setCatalogSearch('')
        }}
      />

      {tab === 'catalog' ? (
        <AllCoursesTable
          rows={catalogRows}
          total={catalogTotal}
          page={catalogPage}
          pageSize={CATALOG_PAGE_SIZE}
          loading={catalogLoading}
          error={catalogError}
          search={catalogSearch}
          onSearchChange={setCatalogSearch}
          onPageChange={setCatalogPage}
          catalogGroupId={catalogGroupId}
          onCatalogGroupChange={setCatalogGroupId}
          prefixCounts={prefixCounts}
          onCourseSaved={reloadCatalogPage}
        />
      ) : (
        <OpenRegistrationCoursesTable
          terms={terms}
          termId={openTermId}
          onTermIdChange={setOpenTermId}
          termsLoading={termsLoading}
          termsError={termsError}
          search={openSearch}
          onSearchChange={setOpenSearch}
          rows={filteredOpen}
          unfilteredCount={openRowsRaw?.length ?? 0}
          loading={openLoading || openTabBlocking}
          error={openError}
        />
      )}
    </main>
  )
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import {
  adminTermScopeFromPath,
  findFinanceQuarterIndexForAcademicTerm,
  findPortalDefaultAcademicTerm,
  resolveAdminAcademicTermId,
} from '../lib/adminPortalDefaultTerm'
import {
  fetchAcademicTerms,
  fetchPostedCurrentAcademicTerm,
  type AcademicTerm,
  type AdminFinanceGlobalQuarter,
} from '../lib/api'

type AdminPortalTermContextValue = {
  terms: AcademicTerm[]
  portalDefaultTerm: AcademicTerm | null
  /** Portal-default academic term id (master switch). */
  defaultTermId: string
  /** Active term for the current admin module; resets to portal default when switching tabs. */
  activeTermId: string
  setActiveTermId: (termId: string) => void
  loading: boolean
  refreshPortalDefault: () => void
  resolveTermId: (urlTermId?: string | null) => string
  resolveFinanceQuarterIndex: (quarters: AdminFinanceGlobalQuarter[]) => number
}

const AdminPortalTermContext = createContext<AdminPortalTermContextValue | null>(
  null,
)

export function AdminPortalTermProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [portalDefaultTerm, setPortalDefaultTerm] =
    useState<AcademicTerm | null>(null)
  const [activeTermId, setActiveTermIdState] = useState('')
  const [loading, setLoading] = useState(true)
  const [reloadNonce, setReloadNonce] = useState(0)
  const prevScopeRef = useRef(adminTermScopeFromPath(location.pathname))

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    ;(async () => {
      try {
        const [list, posted] = await Promise.all([
          fetchAcademicTerms({ signal: ac.signal }),
          fetchPostedCurrentAcademicTerm({ signal: ac.signal }),
        ])
        if (ac.signal.aborted) return
        const resolved = posted ?? findPortalDefaultAcademicTerm(list)
        setTerms(list)
        setPortalDefaultTerm(resolved)
        const nextDefaultId = resolveAdminAcademicTermId(list, {
          portalDefaultTerm: resolved,
        })
        setActiveTermIdState(nextDefaultId)
      } catch {
        if (!ac.signal.aborted) {
          setTerms([])
          setPortalDefaultTerm(null)
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    })()
    return () => ac.abort()
  }, [reloadNonce])

  const refreshPortalDefault = useCallback(() => {
    setReloadNonce((n) => n + 1)
  }, [])

  const defaultTermId = useMemo(
    () =>
      resolveAdminAcademicTermId(terms, {
        portalDefaultTerm,
      }),
    [terms, portalDefaultTerm],
  )

  useEffect(() => {
    if (loading) return
    setActiveTermIdState((prev) => {
      if (prev !== '' && terms.some((t) => t.id === prev)) return prev
      return defaultTermId
    })
  }, [loading, defaultTermId, terms, reloadNonce])

  useEffect(() => {
    if (loading) return
    const scope = adminTermScopeFromPath(location.pathname)
    if (scope !== prevScopeRef.current) {
      prevScopeRef.current = scope
      setActiveTermIdState(defaultTermId)
    }
  }, [location.pathname, loading, defaultTermId])

  const setActiveTermId = useCallback((termId: string) => {
    setActiveTermIdState(termId.trim())
  }, [])

  const resolveTermId = useCallback(
    (urlTermId?: string | null) =>
      resolveAdminAcademicTermId(terms, {
        urlTermId,
        portalDefaultTerm,
      }),
    [terms, portalDefaultTerm],
  )

  const resolveFinanceQuarterIndex = useCallback(
    (quarters: AdminFinanceGlobalQuarter[]) =>
      findFinanceQuarterIndexForAcademicTerm(quarters, portalDefaultTerm),
    [portalDefaultTerm],
  )

  const value = useMemo(
    (): AdminPortalTermContextValue => ({
      terms,
      portalDefaultTerm,
      defaultTermId,
      activeTermId,
      setActiveTermId,
      loading,
      refreshPortalDefault,
      resolveTermId,
      resolveFinanceQuarterIndex,
    }),
    [
      terms,
      portalDefaultTerm,
      defaultTermId,
      activeTermId,
      setActiveTermId,
      loading,
      refreshPortalDefault,
      resolveTermId,
      resolveFinanceQuarterIndex,
    ],
  )

  return (
    <AdminPortalTermContext.Provider value={value}>
      {children}
    </AdminPortalTermContext.Provider>
  )
}

export function useAdminPortalTerm(): AdminPortalTermContextValue {
  const ctx = useContext(AdminPortalTermContext)
  if (ctx == null) {
    throw new Error('useAdminPortalTerm must be used within AdminPortalTermProvider')
  }
  return ctx
}

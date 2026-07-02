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
import { findPortalDefaultAcademicTerm } from '../lib/adminPortalDefaultTerm'
import {
  resolveDefaultAccountingQuarter,
  resolveStudentAcademicTermId,
  studentModuleScopeFromPath,
} from '../lib/studentPortalDefaultTerm'
import {
  fetchAcademicTerms,
  fetchPostedCurrentAcademicTerm,
  type AcademicTerm,
  type AccountingQuarterOption,
} from '../lib/api'

type StudentPortalTermContextValue = {
  terms: AcademicTerm[]
  portalDefaultTerm: AcademicTerm | null
  defaultTermId: string
  activeTermId: string
  activeTerm: AcademicTerm | null
  setActiveTermId: (termId: string) => void
  loading: boolean
  resolveTermId: (urlTermId?: string | null) => string
  resolveAccountingQuarter: (
    quarters: AccountingQuarterOption[],
  ) => AccountingQuarterOption | null
}

const StudentPortalTermContext =
  createContext<StudentPortalTermContextValue | null>(null)

export function StudentPortalTermProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [portalDefaultTerm, setPortalDefaultTerm] =
    useState<AcademicTerm | null>(null)
  const [activeTermId, setActiveTermIdState] = useState('')
  const [loading, setLoading] = useState(true)
  const prevScopeRef = useRef(studentModuleScopeFromPath(location.pathname))

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
        const nextDefaultId = resolveStudentAcademicTermId(list, {
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
  }, [])

  const defaultTermId = useMemo(
    () =>
      resolveStudentAcademicTermId(terms, {
        portalDefaultTerm,
      }),
    [terms, portalDefaultTerm],
  )

  const activeTerm = useMemo(() => {
    if (activeTermId !== '') {
      const match = terms.find((t) => t.id === activeTermId)
      if (match) return match
    }
    return portalDefaultTerm
  }, [terms, activeTermId, portalDefaultTerm])

  useEffect(() => {
    if (loading) return
    const scope = studentModuleScopeFromPath(location.pathname)
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
      resolveStudentAcademicTermId(terms, {
        urlTermId,
        portalDefaultTerm,
      }),
    [terms, portalDefaultTerm],
  )

  const resolveAccountingQuarter = useCallback(
    (quarters: AccountingQuarterOption[]) =>
      resolveDefaultAccountingQuarter(quarters, activeTerm ?? portalDefaultTerm),
    [activeTerm, portalDefaultTerm],
  )

  const value = useMemo(
    (): StudentPortalTermContextValue => ({
      terms,
      portalDefaultTerm,
      defaultTermId,
      activeTermId,
      activeTerm,
      setActiveTermId,
      loading,
      resolveTermId,
      resolveAccountingQuarter,
    }),
    [
      terms,
      portalDefaultTerm,
      defaultTermId,
      activeTermId,
      activeTerm,
      setActiveTermId,
      loading,
      resolveTermId,
      resolveAccountingQuarter,
    ],
  )

  return (
    <StudentPortalTermContext.Provider value={value}>
      {children}
    </StudentPortalTermContext.Provider>
  )
}

export function useStudentPortalTerm(): StudentPortalTermContextValue {
  const ctx = useContext(StudentPortalTermContext)
  if (ctx == null) {
    throw new Error(
      'useStudentPortalTerm must be used within StudentPortalTermProvider',
    )
  }
  return ctx
}

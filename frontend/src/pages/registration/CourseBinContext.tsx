import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY_PREFIX = 'portal.registration.courseBin:v1:'

export type CourseBinItem = {
  course_code: string
  eng_name: string
  chi_name: string
  units: string
  section: string
  session: string
  type: string
  registered: string
  time: string
  days: string
  instructor: string
  location: string
  /** From registrar row when added via Offered Timetable; improves My Timetable placement. */
  schedule_weekday?: string | null
  schedule_start_time?: string | null
  schedule_end_time?: string | null
}

type CourseBinContextValue = {
  items: CourseBinItem[]
  addToCourseBin: (item: CourseBinItem) => void
  removeFromCourseBin: (courseCode: string, section: string) => void
  clearCourseBin: () => void
}

const CourseBinContext = createContext<CourseBinContextValue | null>(null)

export function courseBinSectionKey(courseCode: string, section: string): string {
  return `${courseCode.trim().toLowerCase()}|${section.trim().toLowerCase()}`
}

function storageKeyForTerm(registrationTermId: string): string | null {
  const tid = registrationTermId.trim()
  return tid === '' ? null : `${STORAGE_KEY_PREFIX}${tid}`
}

function isCourseBinItemRecord(v: unknown): v is CourseBinItem {
  if (v == null || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.course_code === 'string' &&
    typeof o.eng_name === 'string' &&
    typeof o.chi_name === 'string' &&
    typeof o.units === 'string' &&
    typeof o.section === 'string' &&
    typeof o.session === 'string' &&
    typeof o.type === 'string' &&
    typeof o.registered === 'string' &&
    typeof o.time === 'string' &&
    typeof o.days === 'string' &&
    typeof o.instructor === 'string' &&
    typeof o.location === 'string'
  )
}

function loadItemsFromStorage(registrationTermId: string): CourseBinItem[] {
  const key = storageKeyForTerm(registrationTermId)
  if (key == null) return []
  try {
    const raw = localStorage.getItem(key)
    if (raw == null || raw.trim() === '') return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCourseBinItemRecord)
  } catch {
    return []
  }
}

function saveItemsToStorage(registrationTermId: string, items: CourseBinItem[]): void {
  const key = storageKeyForTerm(registrationTermId)
  if (key == null) return
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {
    /* ignore quota / private mode */
  }
}

type CourseBinProviderProps = {
  children: ReactNode
  /** Active registration term id from `?term=`; empty when none selected. */
  registrationTermId: string
}

export function CourseBinProvider({ children, registrationTermId }: CourseBinProviderProps) {
  const term = registrationTermId.trim()
  const [items, setItems] = useState<CourseBinItem[]>(() => loadItemsFromStorage(term))

  useEffect(() => {
    setItems(loadItemsFromStorage(term))
  }, [term])

  useEffect(() => {
    if (term === '') return
    saveItemsToStorage(term, items)
  }, [term, items])

  const addToCourseBin = useCallback((item: CourseBinItem) => {
    const code = item.course_code.trim()
    if (code === '') return

    setItems((prev) => {
      const key = courseBinSectionKey(item.course_code, item.section)
      if (prev.some((x) => courseBinSectionKey(x.course_code, x.section) === key)) {
        return prev
      }
      return [...prev, item]
    })
  }, [])

  const removeFromCourseBin = useCallback((courseCode: string, section: string) => {
    const key = courseBinSectionKey(courseCode, section)
    setItems((prev) => prev.filter((x) => courseBinSectionKey(x.course_code, x.section) !== key))
  }, [])

  const clearCourseBin = useCallback(() => {
    setItems([])
  }, [])

  const value = useMemo(
    () => ({
      items,
      addToCourseBin,
      removeFromCourseBin,
      clearCourseBin,
    }),
    [items, addToCourseBin, removeFromCourseBin, clearCourseBin],
  )

  return <CourseBinContext.Provider value={value}>{children}</CourseBinContext.Provider>
}

export function useCourseBin(): CourseBinContextValue {
  const ctx = useContext(CourseBinContext)
  if (!ctx) {
    throw new Error('useCourseBin must be used within a CourseBinProvider')
  }
  return ctx
}

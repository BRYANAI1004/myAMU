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
  /**
   * Legacy cached Course Bin rows may predate prerequisite support and omit these fields.
   * We keep them optional at the type level for backward compatibility, then normalize
   * loaded items to explicit `null` values inside the provider.
   */
  prerequisite_course_id?: string | null
  prerequisite_course_code?: string | null
  prerequisite_course_title?: string | null
  units: string
  section: string
  /** Disambiguates same section code on EN vs CN offered timetables; omitted/legacy = EN. */
  schedule_track?: 'EN' | 'CN'
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
  removeFromCourseBin: (
    courseCode: string,
    section: string,
    scheduleTrack?: 'EN' | 'CN',
  ) => void
  clearCourseBin: () => void
}

const CourseBinContext = createContext<CourseBinContextValue | null>(null)

function normalizeBinTrack(track: 'EN' | 'CN' | undefined): 'EN' | 'CN' {
  return track === 'CN' ? 'CN' : 'EN'
}

export function courseBinSectionKey(
  courseCode: string,
  section: string,
  scheduleTrack?: 'EN' | 'CN',
): string {
  const tr = normalizeBinTrack(scheduleTrack)
  return `${courseCode.trim().toLowerCase()}|${section.trim().toLowerCase()}|${tr}`
}

/** Same key shape as {@link courseBinSectionKey} for offered / enrolled API sections (`section_code`). */
export function courseBinKeyFromSectionFields(args: {
  course_code: string
  section_code: string
  schedule_track?: 'EN' | 'CN' | string | null
}): string {
  const raw = args.schedule_track
  const tr: 'EN' | 'CN' | undefined =
    raw === 'CN' || (typeof raw === 'string' && raw.trim().toUpperCase() === 'CN')
      ? 'CN'
      : undefined
  return courseBinSectionKey(args.course_code, args.section_code, tr)
}

export function isCourseBinKeyInItemList(
  key: string,
  items: CourseBinItem[],
): boolean {
  return items.some(
    (it) => courseBinSectionKey(it.course_code, it.section, it.schedule_track) === key,
  )
}

function storageKeyForTerm(registrationTermId: string): string | null {
  const tid = registrationTermId.trim()
  return tid === '' ? null : `${STORAGE_KEY_PREFIX}${tid}`
}

function isCourseBinItemRecord(v: unknown): v is CourseBinItem {
  if (v == null || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  const isOptionalNullableString = (value: unknown): boolean =>
    value === undefined || value === null || typeof value === 'string'
  if (
    o.schedule_track !== undefined &&
    o.schedule_track !== 'EN' &&
    o.schedule_track !== 'CN'
  ) {
    return false
  }
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
    typeof o.location === 'string' &&
    isOptionalNullableString(o.prerequisite_course_id) &&
    isOptionalNullableString(o.prerequisite_course_code) &&
    isOptionalNullableString(o.prerequisite_course_title)
  )
}

function normalizeCourseBinItem(item: CourseBinItem): CourseBinItem {
  return {
    ...item,
    prerequisite_course_id: item.prerequisite_course_id ?? null,
    prerequisite_course_code: item.prerequisite_course_code ?? null,
    prerequisite_course_title: item.prerequisite_course_title ?? null,
    schedule_track: normalizeBinTrack(item.schedule_track),
    schedule_weekday: item.schedule_weekday ?? null,
    schedule_start_time: item.schedule_start_time ?? null,
    schedule_end_time: item.schedule_end_time ?? null,
  }
}

function loadItemsFromStorage(registrationTermId: string): CourseBinItem[] {
  const key = storageKeyForTerm(registrationTermId)
  if (key == null) return []
  try {
    const raw = localStorage.getItem(key)
    if (raw == null || raw.trim() === '') return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Lightweight in-place migration: older cached items may be missing
    // prerequisite metadata entirely, so normalize them to explicit nulls.
    return parsed.filter(isCourseBinItemRecord).map(normalizeCourseBinItem)
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
    const normalizedItem = normalizeCourseBinItem(item)
    const code = normalizedItem.course_code.trim()
    if (code === '') return

    setItems((prev) => {
      const key = courseBinSectionKey(
        normalizedItem.course_code,
        normalizedItem.section,
        normalizedItem.schedule_track,
      )
      if (
        prev.some(
          (x) =>
            courseBinSectionKey(x.course_code, x.section, x.schedule_track) ===
            key,
        )
      ) {
        return prev
      }
      return [...prev, normalizedItem]
    })
  }, [])

  const removeFromCourseBin = useCallback(
    (courseCode: string, section: string, scheduleTrack?: 'EN' | 'CN') => {
      const key = courseBinSectionKey(courseCode, section, scheduleTrack)
      setItems((prev) =>
        prev.filter(
          (x) => courseBinSectionKey(x.course_code, x.section, x.schedule_track) !== key,
        ),
      )
    },
    [],
  )

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

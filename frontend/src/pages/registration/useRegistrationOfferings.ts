import { useEffect, useMemo, useState } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import {
  fetchApiJson,
  fetchStudentEnrolledSections,
  fetchStudentRegistrationSections,
  type AdminCourseSection,
} from '../../lib/api'
import { useAccount } from '../../context/AccountContext'
import { PORTAL_STUDENT_ENROLLMENT_CHANGED } from '../../lib/portalStudentEnrollmentEvents'
import { courseBinKeyFromSectionFields } from './CourseBinContext'
import { useRegistrationTermSearchParam } from './registrationTermSearch'
import type { CatalogCourseLite } from './sectionToCourseBinItem'

function cellText(value: string | number | null | undefined): string {
  if (value == null) return ''
  return String(value).trim()
}

export function useRegistrationOfferings() {
  const t = useStudentPortalT()
  const registrationTermId = useRegistrationTermSearchParam()
  const { currentStudentId, isAuthenticated } = useAccount()
  const [sections, setSections] = useState<AdminCourseSection[] | null>(null)
  const [catalog, setCatalog] = useState<CatalogCourseLite[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enrolledRefreshKey, setEnrolledRefreshKey] = useState(0)
  const [enrolledSections, setEnrolledSections] = useState<AdminCourseSection[]>([])

  const termKey = registrationTermId?.trim() ?? ''
  const studentKey = currentStudentId?.trim() ?? ''
  const termMissing = termKey === ''

  useEffect(() => {
    const onEnrollmentChanged = () => setEnrolledRefreshKey((k) => k + 1)
    window.addEventListener(PORTAL_STUDENT_ENROLLMENT_CHANGED, onEnrollmentChanged)
    return () => {
      window.removeEventListener(PORTAL_STUDENT_ENROLLMENT_CHANGED, onEnrollmentChanged)
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    void (async () => {
      try {
        const data: unknown = await fetchApiJson('/api/courses', { signal: ac.signal })
        if (!Array.isArray(data)) throw new Error(t('unexpectedCatalogOffered'))
        if (!ac.signal.aborted) setCatalog(data as CatalogCourseLite[])
      } catch {
        if (!ac.signal.aborted) setCatalog([])
      }
    })()
    return () => ac.abort()
  }, [t])

  useEffect(() => {
    if (!isAuthenticated || studentKey === '' || termKey === '') {
      setEnrolledSections([])
      return
    }
    const ac = new AbortController()
    void (async () => {
      try {
        const { sections: rows } = await fetchStudentEnrolledSections(studentKey, termKey, {
          signal: ac.signal,
        })
        if (!ac.signal.aborted) setEnrolledSections(rows)
      } catch {
        if (!ac.signal.aborted) setEnrolledSections([])
      }
    })()
    return () => ac.abort()
  }, [isAuthenticated, studentKey, termKey, enrolledRefreshKey])

  useEffect(() => {
    if (termMissing) {
      setSections([])
      setLoading(false)
      setError(null)
      return
    }
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const rows = await fetchStudentRegistrationSections(termKey, { signal: ac.signal })
        if (ac.signal.aborted) return
        setSections(rows)
      } catch (e) {
        if (ac.signal.aborted) return
        setSections(null)
        setError(e instanceof Error ? e.message : t('couldNotLoadOfferedTimetable'))
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    })()
    return () => ac.abort()
  }, [termKey, termMissing, t])

  const catalogByCode = useMemo(() => {
    const m = new Map<string, CatalogCourseLite>()
    for (const c of catalog) {
      const code = cellText(c.code)
      if (code !== '') m.set(code.toUpperCase(), c)
    }
    return m
  }, [catalog])

  const sectionsByCourseCode = useMemo(() => {
    const m = new Map<string, AdminCourseSection[]>()
    for (const sec of sections ?? []) {
      const code = cellText(sec.course_code).toUpperCase()
      if (code === '') continue
      const list = m.get(code)
      if (list) list.push(sec)
      else m.set(code, [sec])
    }
    return m
  }, [sections])

  const offeredCourses = useMemo(() => {
    const out: CatalogCourseLite[] = []
    for (const [code, secRows] of sectionsByCourseCode) {
      if (secRows.length === 0) continue
      const cat = catalogByCode.get(code)
      if (cat) out.push(cat)
      else {
        out.push({
          code,
          eng_name: secRows[0]?.course_title ?? code,
          chi_name: null,
          units: secRows[0]?.units ?? null,
        })
      }
    }
    out.sort((a, b) =>
      cellText(a.code).localeCompare(cellText(b.code), undefined, { numeric: true }),
    )
    return out
  }, [catalogByCode, sectionsByCourseCode])

  const enrolledKeys = useMemo(() => {
    const s = new Set<string>()
    for (const row of enrolledSections) {
      s.add(
        courseBinKeyFromSectionFields({
          course_code: row.course_code,
          section_code: row.section_code,
          schedule_track: row.schedule_track,
        }),
      )
    }
    return s
  }, [enrolledSections])

  return {
    registrationTermId,
    termMissing,
    sections,
    catalogByCode,
    sectionsByCourseCode,
    offeredCourses,
    enrolledKeys,
    loading,
    error,
  }
}

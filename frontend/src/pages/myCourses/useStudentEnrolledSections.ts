import { useEffect, useState } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import { useAccount } from '../../context/AccountContext'
import { fetchStudentEnrolledSections, type AdminCourseSection } from '../../lib/api'
import { PORTAL_STUDENT_ENROLLMENT_CHANGED } from '../../lib/portalStudentEnrollmentEvents'

export function useStudentEnrolledSections(academicTermId: string | null | undefined) {
  const t = useStudentPortalT()
  const { currentStudentId, isAuthenticated } = useAccount()
  const [sections, setSections] = useState<AdminCourseSection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const termKey = academicTermId?.trim() ?? ''
  const studentKey = currentStudentId?.trim() ?? ''

  useEffect(() => {
    const onEnrollmentChanged = () => {
      setRefreshKey((k) => k + 1)
    }
    window.addEventListener(PORTAL_STUDENT_ENROLLMENT_CHANGED, onEnrollmentChanged)
    return () => {
      window.removeEventListener(PORTAL_STUDENT_ENROLLMENT_CHANGED, onEnrollmentChanged)
    }
  }, [])

  useEffect(() => {
    if (termKey === '' || !isAuthenticated || studentKey === '') {
      setSections([])
      setError(null)
      setLoading(false)
      return
    }

    const ac = new AbortController()
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const { sections: rows } = await fetchStudentEnrolledSections(studentKey, termKey, {
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        setSections(rows)
        setError(null)
      } catch (e) {
        if (ac.signal.aborted) return
        setSections([])
        setError(e instanceof Error ? e.message : t('couldNotLoadEnrolledSections'))
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    })()

    return () => ac.abort()
  }, [termKey, studentKey, isAuthenticated, t, refreshKey])

  return { sections, loading, error, termMissing: termKey === '' }
}

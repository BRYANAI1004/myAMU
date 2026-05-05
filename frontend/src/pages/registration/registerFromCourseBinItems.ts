import type { StudentPortalKey } from '@/lib/i18n'
import { fetchStudentEnrolledSections, postStudentEnroll } from '../../lib/api'
import {
  courseBinKeyFromSectionFields,
  courseBinSectionKey,
  type CourseBinItem,
} from './CourseBinContext'

export type RegisterFromCourseBinItemsResult =
  | { ok: true; insertedCount: number }
  | { ok: false; message: string }

/**
 * Same enrollment POST as the CourseBin checkout ("Register") page: writes
 * `portal_enrollments` for the term from planned CourseBin sections.
 */
export async function registerFromCourseBinItems(args: {
  studentId: string
  academicTermId: string
  items: CourseBinItem[]
  t: (key: StudentPortalKey) => string
}): Promise<RegisterFromCourseBinItemsResult> {
  const { studentId, academicTermId, items, t } = args
  const tid = academicTermId.trim()
  const sid = studentId.trim()
  if (tid === '') {
    return { ok: false, message: t('checkoutErrorSelectTerm') }
  }
  if (sid === '') {
    return { ok: false, message: t('checkoutErrorSignIn') }
  }

  const fromBin = items
    .map((i) => {
      const schedule_track: 'EN' | 'CN' = i.schedule_track === 'CN' ? 'CN' : 'EN'
      return {
        course_code: i.course_code.trim(),
        section_code: i.section.trim(),
        schedule_track,
      }
    })
    .filter(
      (s) =>
        s.course_code !== '' &&
        s.section_code !== '' &&
        s.section_code !== '—',
    )

  if (fromBin.length === 0) {
    return { ok: false, message: t('checkoutErrorAddSections') }
  }

  let sections = fromBin
  try {
    const { sections: enrolledRows } = await fetchStudentEnrolledSections(sid, tid)
    const enrolledKeys = new Set(
      enrolledRows.map((r) =>
        courseBinKeyFromSectionFields({
          course_code: r.course_code,
          section_code: r.section_code,
          schedule_track: r.schedule_track,
        }),
      ),
    )
    sections = fromBin.filter((s) => {
      const k = courseBinSectionKey(s.course_code, s.section_code, s.schedule_track)
      return !enrolledKeys.has(k)
    })
  } catch {
    sections = fromBin
  }

  if (sections.length === 0) {
    return { ok: false, message: t('checkoutErrorAllAlreadyEnrolled') }
  }

  try {
    const res = await postStudentEnroll({
      studentId: sid,
      academic_term_id: tid,
      sections,
    })
    return { ok: true, insertedCount: res.insertedCount }
  } catch (e) {
    const msg = e instanceof Error ? e.message.trim() : ''
    return { ok: false, message: msg !== '' ? msg : t('registrationFailedGeneric') }
  }
}

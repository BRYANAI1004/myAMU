import { useStudentPortalT } from '@/LanguageContext'
import type { RegistrationClinicRow } from '../../../lib/registrationFormAdapter'

type Props = {
  rows: RegistrationClinicRow[]
  totalHours: number
}

export function RegistrationClinicTable({ rows, totalHours }: Props) {
  const t = useStudentPortalT()
  const displayRows = rows.length > 0 ? rows : []
  const padRows = 4
  const emptySlots = Math.max(0, padRows - displayRows.length)

  return (
    <div className="portal-registration-form-table-wrap">
      <table className="portal-registration-form-table">
        <thead>
          <tr>
            <th scope="col">{t('documentsRegFormColCourseNo')}</th>
            <th scope="col">{t('documentsRegFormColClinicCourseTitle')}</th>
            <th scope="col">{t('documentsRegFormColHours')}</th>
            <th scope="col">{t('documentsRegFormColDay')}</th>
            <th scope="col">{t('documentsRegFormColTime')}</th>
            <th scope="col">{t('documentsRegFormColSupervisorName')}</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((r, i) => (
            <tr key={`${r.courseNo}-clinic-${i}`}>
              <td>{r.courseNo}</td>
              <td>{r.clinicCourseTitle}</td>
              <td>{r.hours}</td>
              <td>{r.day}</td>
              <td>{r.time}</td>
              <td>{r.supervisorName}</td>
            </tr>
          ))}
          {Array.from({ length: emptySlots }, (_, i) => (
            <tr key={`c-empty-${i}`} className="portal-registration-form-table__empty">
              <td aria-hidden="true">&nbsp;</td>
              <td aria-hidden="true">&nbsp;</td>
              <td aria-hidden="true">&nbsp;</td>
              <td aria-hidden="true">&nbsp;</td>
              <td aria-hidden="true">&nbsp;</td>
              <td aria-hidden="true">&nbsp;</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2}>
              {t('documentsRegFormTotalHours')}
            </th>
            <td colSpan={4}>{totalHours}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

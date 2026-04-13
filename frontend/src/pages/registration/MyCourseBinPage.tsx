import { useLocation, useNavigate } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import { getPreferredCourseTitle } from '../../lib/courseDisplayName'
import { formatPrerequisiteCourseDisplay } from '../../lib/prerequisiteCourse'
import {
  courseBinSectionKey,
  useCourseBin,
  type CourseBinItem,
} from './CourseBinContext'
import { useRegistrationTermSearchParam } from './registrationTermSearch'

function binRowKey(item: CourseBinItem): string {
  return courseBinSectionKey(item.course_code, item.section, item.schedule_track)
}

function prerequisiteText(item: CourseBinItem, label: string): string | null {
  const display = formatPrerequisiteCourseDisplay({
    courseCode: item.prerequisite_course_code,
    courseTitle: item.prerequisite_course_title,
  })
  return display ? `${label}: ${display}` : null
}

export function MyCourseBinPage() {
  const t = useStudentPortalT()
  const registrationTermId = useRegistrationTermSearchParam()
  const navigate = useNavigate()
  const location = useLocation()
  const { items, removeFromCourseBin } = useCourseBin()
  const hasItems = items.length > 0

  const handleCheckout = () => {
    navigate({
      pathname: '/registration/checkout',
      search: location.search,
    })
  }

  return (
    <main
      className="portal-page portal-course-bin-page"
      data-registration-term={registrationTermId ?? undefined}
    >
      <section className="portal-card portal-stack" aria-labelledby="course-bin-heading">
        <div className="portal-course-bin-card-header">
          <div className="portal-course-bin-card-header-text">
            <h2 id="course-bin-heading" className="portal-section-heading">
              {t('myCourseBin')}
            </h2>
            <p className="portal-page-lede portal-course-bin-lede">{t('myCourseBinLede')}</p>
          </div>
          <div className="portal-course-bin-card-header-actions">
            <button
              type="button"
              className="portal-btn portal-btn--primary portal-btn--compact"
              disabled={!hasItems}
              onClick={handleCheckout}
            >
              {t('checkoutButton')}
            </button>
          </div>
        </div>

        <div className="portal-course-search-sections-table-wrap portal-course-search-sections-table-wrap--schedule">
          <div className="portal-course-search-sections-table-scroll">
            <table className="portal-table portal-table--course-sections portal-table--course-section-schedule portal-table--course-bin">
              <caption className="visually-hidden">{t('courseBinTableCaption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('courseColCourse')}</th>
                  <th scope="col">{t('sectionColSection')}</th>
                  <th scope="col">{t('sectionColSession')}</th>
                  <th scope="col">{t('sectionColType')}</th>
                  <th scope="col">{t('sectionColUnits')}</th>
                  <th scope="col">{t('sectionColRegistered')}</th>
                  <th scope="col">{t('sectionColTime')}</th>
                  <th scope="col">{t('sectionColDays')}</th>
                  <th scope="col">{t('sectionColInstructor')}</th>
                  <th scope="col">{t('sectionColLocation')}</th>
                  <th scope="col" className="portal-course-section-schedule-col-action">
                    {t('tableColAction')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const prerequisite = prerequisiteText(item, t('prerequisiteLabel'))
                  return (
                    <tr key={binRowKey(item)}>
                      <td>
                        <div className="portal-course-bin-course-cell">
                          <span className="portal-course-bin-course-code">{item.course_code.trim() || '—'}</span>
                          <span className="portal-course-bin-course-title">
                            {getPreferredCourseTitle(
                              {
                                code: item.course_code,
                                eng_name: item.eng_name,
                                chi_name: item.chi_name,
                              },
                              item.schedule_track,
                            )}
                          </span>
                          {prerequisite ? (
                            <span className="portal-text-muted">{prerequisite}</span>
                          ) : null}
                        </div>
                      </td>
                      <td>{item.section}</td>
                      <td>{item.session}</td>
                      <td>{item.type}</td>
                      <td>{item.units}</td>
                      <td>{item.registered}</td>
                      <td>{item.time}</td>
                      <td>{item.days}</td>
                      <td>{item.instructor}</td>
                      <td>{item.location}</td>
                      <td className="portal-course-section-schedule-col-action">
                        <button
                          type="button"
                          className="portal-btn portal-btn--course-search-bin"
                          onClick={() =>
                            removeFromCourseBin(
                              item.course_code,
                              item.section,
                              item.schedule_track,
                            )
                          }
                        >
                          {t('removedFromCourseBin')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  )
}

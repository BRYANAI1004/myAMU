import { useState } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import { portalPillTabClass } from '@/lib/portalPillTabClass'
import { useStudentPortalTerm } from '../../context/StudentPortalTermContext'
import { MyCoursesRegisteredPanel } from './MyCoursesRegisteredPanel'
import { MyCoursesTimetablePanel } from './MyCoursesTimetablePanel'
import { useStudentEnrolledSections } from './useStudentEnrolledSections'

type MyCoursesTabId = 'registered' | 'timetable'

export function MyCoursesPage() {
  const t = useStudentPortalT()
  const { defaultTermId, loading: portalTermLoading } = useStudentPortalTerm()
  const [tab, setTab] = useState<MyCoursesTabId>('registered')
  const { sections, loading, error, termMissing } = useStudentEnrolledSections(
    portalTermLoading ? null : defaultTermId,
  )

  return (
    <main className="portal-page portal-my-courses-page">
      <div
        className="portal-academics-print-hide"
        role="tablist"
        aria-label={t('myCoursesTabsAria')}
      >
        <div className="portal-tab-group portal-my-courses-tabs">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'registered'}
            className={portalPillTabClass(tab === 'registered')}
            onClick={() => setTab('registered')}
          >
            {t('myCoursesTabRegistered')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'timetable'}
            className={portalPillTabClass(tab === 'timetable')}
            onClick={() => setTab('timetable')}
          >
            {t('myCoursesTabTimetable')}
          </button>
        </div>
      </div>

      <section className="portal-card portal-stack portal-my-courses-panel">
        {tab === 'registered' ? (
          <MyCoursesRegisteredPanel
            sections={sections}
            loading={loading || portalTermLoading}
            error={error}
            termMissing={termMissing || portalTermLoading}
          />
        ) : (
          <MyCoursesTimetablePanel
            sections={sections}
            loading={loading || portalTermLoading}
            error={error}
            termMissing={termMissing || portalTermLoading}
          />
        )}
      </section>
    </main>
  )
}

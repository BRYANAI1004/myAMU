import { NavLink } from 'react-router-dom'
import { useStudentPortalT } from '../../LanguageContext'
import { portalPillTabClass } from '../../lib/portalPillTabClass'

export function ClinicalNav() {
  const t = useStudentPortalT()
  const ITEMS = [
    { to: 'schedule', labelKey: 'clinicSchedule' as const },
    { to: 'my-schedule', labelKey: 'clinicalMyScheduleNav' as const },
    { to: 'progress', labelKey: 'clinicalProgressNav' as const },
    { to: 'exam-registration', labelKey: 'clinicalExamRegistrationNav' as const },
  ]

  return (
    <nav className="portal-clinical-nav" aria-label={t('clinicalNavAria')}>
      <ul className="portal-tab-group">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              end
              to={item.to}
              className={({ isActive }) => portalPillTabClass(isActive)}
            >
              {t(item.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export type AdminCoursesTabId = 'all' | 'open'

type CoursesTabBarProps = {
  active: AdminCoursesTabId
  onChange: (tab: AdminCoursesTabId) => void
}

export function CoursesTabBar({ active, onChange }: CoursesTabBarProps) {
  return (
    <div
      className="portal-tab-group admin-courses-tablist"
      role="tablist"
      aria-label="Courses views"
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === 'all'}
        className={['portal-tab', active === 'all' ? 'portal-tab--active' : '']
          .filter(Boolean)
          .join(' ')}
        onClick={() => onChange('all')}
      >
        All Courses
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'open'}
        className={['portal-tab', active === 'open' ? 'portal-tab--active' : '']
          .filter(Boolean)
          .join(' ')}
        onClick={() => onChange('open')}
      >
        Open for Registration
      </button>
    </div>
  )
}

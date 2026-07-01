export type AdminCoursesTabId = 'catalog' | 'open'

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
        aria-selected={active === 'catalog'}
        className={[
          'portal-tab',
          active === 'catalog' ? 'portal-tab--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => onChange('catalog')}
      >
        Course catalog
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'open'}
        className={[
          'portal-tab',
          active === 'open' ? 'portal-tab--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => onChange('open')}
      >
        Open for registration
      </button>
    </div>
  )
}

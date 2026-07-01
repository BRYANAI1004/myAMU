import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CourseCatalogItem, CourseCatalogPrefixCounts } from '../../../lib/api'
import { adminSchedulingQueryString } from '../../../lib/adminSchedulingSearchParams'
import {
  CATALOG_PREFIX_GROUPS,
  catalogGroupById,
  countForCatalogGroup,
  type CatalogPrefixGroup,
} from './catalogPrefixGroups'
import {
  catalogCategory,
  courseCatalogTitle,
  formatCatalogCredits,
} from './courseCatalogDisplay'
import { EditCatalogCourseModal } from './EditCatalogCourseModal'

type CourseCatalogPanelProps = {
  rows: CourseCatalogItem[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null
  search: string
  onSearchChange: (q: string) => void
  onPageChange: (page: number) => void
  catalogGroupId: string
  onCatalogGroupChange: (id: string) => void
  prefixCounts: CourseCatalogPrefixCounts | null
  onCourseSaved?: () => void
}

function pageRangeLabel(
  page: number,
  pageSize: number,
  total: number,
  rowCount: number,
): string {
  if (total === 0) return 'No courses'
  const start = (page - 1) * pageSize + 1
  const end = (page - 1) * pageSize + rowCount
  return `${start}–${end} of ${total}`
}

function CatalogCourseCard({
  row,
  onEdit,
}: {
  row: CourseCatalogItem
  onEdit: (row: CourseCatalogItem) => void
}) {
  const title = courseCatalogTitle(row)
  const chi = row.chi_name?.trim()
  const sectionsHref = `/admin/course-sections?${adminSchedulingQueryString({
    course: row.code,
  })}`

  return (
    <article className="admin-course-catalog-card admin-course-catalog-card--compact">
      <div className="admin-course-catalog-card__main">
        <span className="admin-course-catalog-card__code">{row.code}</span>
        <div className="admin-course-catalog-card__text">
          <h3 className="admin-course-catalog-card__title">{title}</h3>
          {chi && chi !== title ? (
            <p className="admin-course-catalog-card__subtitle">{chi}</p>
          ) : null}
        </div>
        <span className="admin-course-catalog-card__credits">
          {formatCatalogCredits(row.units)} cr
        </span>
        <span className="admin-course-catalog-card__category">
          {catalogCategory(row)}
        </span>
      </div>
      <div className="admin-course-catalog-card__footer">
        <button
          type="button"
          className="admin-course-catalog-card__action"
          onClick={() => onEdit(row)}
        >
          Edit
        </button>
        <Link to={sectionsHref} className="admin-course-catalog-card__action">
          Sections
        </Link>
      </div>
    </article>
  )
}

function CatalogGroupNav({
  activeId,
  prefixCounts,
  onSelect,
}: {
  activeId: string
  prefixCounts: CourseCatalogPrefixCounts | null
  onSelect: (id: string) => void
}) {
  return (
    <nav className="admin-course-catalog-nav" aria-label="Course code groups">
      <ul className="admin-course-catalog-nav__list">
        {CATALOG_PREFIX_GROUPS.map((group) => {
          const count = prefixCounts
            ? countForCatalogGroup(group, prefixCounts.byPrefix)
            : null
          return (
            <li key={group.id}>
              <button
                type="button"
                className={`admin-course-catalog-nav__item${activeId === group.id ? ' admin-course-catalog-nav__item--active' : ''}`}
                aria-current={activeId === group.id ? 'true' : undefined}
                onClick={() => onSelect(group.id)}
              >
                <span className="admin-course-catalog-nav__code">
                  {group.codeLabel}
                </span>
                <span className="admin-course-catalog-nav__label">{group.title}</span>
                {count != null ? (
                  <span className="admin-course-catalog-nav__count">{count}</span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function groupHeading(group: CatalogPrefixGroup, total: number): string {
  const codes =
    group.prefixes.length > 1 ? group.prefixes.join(', ') : group.codeLabel
  return `${codes} · ${group.title} · ${total} ${total === 1 ? 'course' : 'courses'}`
}

export function AllCoursesTable({
  rows,
  total,
  page,
  pageSize,
  loading,
  error,
  search,
  onSearchChange,
  onPageChange,
  catalogGroupId,
  onCatalogGroupChange,
  prefixCounts,
  onCourseSaved,
}: CourseCatalogPanelProps) {
  const [editing, setEditing] = useState<CourseCatalogItem | null>(null)
  const searchActive = search.trim() !== ''
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages
  const activeGroup = catalogGroupById(catalogGroupId) ?? CATALOG_PREFIX_GROUPS[0]

  return (
    <>
      {editing != null ? (
        <EditCatalogCourseModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            onCourseSaved?.()
          }}
        />
      ) : null}

      <section className="admin-course-catalog-panel" aria-label="Course catalog">
        <div className="admin-course-catalog-panel__search-row">
          <label className="admin-course-catalog-panel__search">
            <span className="admin-course-catalog-panel__search-label">
              Search all courses
            </span>
            <input
              type="search"
              className="admin-input admin-input--search admin-course-catalog-panel__search-input"
              placeholder="Code or title across the full catalog…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search course catalog"
            />
          </label>
          {prefixCounts ? (
            <p className="admin-course-catalog-panel__total">
              {prefixCounts.total} courses in catalog
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="admin-course-catalog-panel__alert" role="alert">
            {error}
          </p>
        ) : null}

        {searchActive ? (
          <div className="admin-course-catalog-panel__search-results">
            <header className="admin-course-catalog-panel__section-head">
              <h2 className="admin-course-catalog-panel__section-title">
                Search results
              </h2>
              <p className="admin-course-catalog-panel__range" aria-live="polite">
                {loading && rows.length === 0
                  ? 'Searching…'
                  : pageRangeLabel(page, pageSize, total, rows.length)}
              </p>
            </header>

            {!error && !loading && rows.length === 0 ? (
              <p className="admin-course-catalog-panel__empty-inline">
                No courses match this search.
              </p>
            ) : null}

            {!error && rows.length > 0 ? (
              <div className="admin-course-catalog-panel__list">
                {rows.map((r) => (
                  <CatalogCourseCard
                    key={`${r.sequence_number ?? 'x'}-${r.code}`}
                    row={r}
                    onEdit={setEditing}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="admin-course-catalog-layout">
            <CatalogGroupNav
              activeId={catalogGroupId}
              prefixCounts={prefixCounts}
              onSelect={onCatalogGroupChange}
            />
            <div className="admin-course-catalog-main">
              <header className="admin-course-catalog-panel__section-head">
                <h2 className="admin-course-catalog-panel__section-title">
                  {groupHeading(activeGroup, total)}
                </h2>
                <p className="admin-course-catalog-panel__range" aria-live="polite">
                  {loading && rows.length === 0
                    ? 'Loading…'
                    : pageRangeLabel(page, pageSize, total, rows.length)}
                </p>
              </header>

              {!error && !loading && rows.length === 0 ? (
                <p className="admin-course-catalog-panel__empty-inline">
                  No courses in this code group.
                </p>
              ) : null}

              {!error && rows.length > 0 ? (
                <div className="admin-course-catalog-panel__list">
                  {rows.map((r) => (
                    <CatalogCourseCard
                      key={`${r.sequence_number ?? 'x'}-${r.code}`}
                      row={r}
                      onEdit={setEditing}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {!error && total > pageSize ? (
          <nav
            className="admin-course-catalog-panel__pagination"
            aria-label="Course catalog pages"
          >
            <button
              type="button"
              className="admin-course-catalog-panel__page-btn"
              disabled={loading || !canPrev}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </button>
            <span className="admin-course-catalog-panel__page-status">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="admin-course-catalog-panel__page-btn"
              disabled={loading || !canNext}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </button>
          </nav>
        ) : null}
      </section>
    </>
  )
}

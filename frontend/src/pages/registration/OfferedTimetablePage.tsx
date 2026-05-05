import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'
import { TimetableWeekGrid } from '../../components/timetable/TimetableWeekGrid'
import {
  fetchAdminCourseSections,
  fetchApiJson,
  fetchStudentEnrolledSections,
  type AdminCourseSection,
} from '../../lib/api'
import { useAccount } from '../../context/AccountContext'
import { PORTAL_STUDENT_ENROLLMENT_CHANGED } from '../../lib/portalStudentEnrollmentEvents'
import { formatDeliveryModeForDisplay } from '../../lib/deliveryMode'
import { formatTimeHmsForDisplay, formatTimeRangeHmsForDisplay } from '../../lib/formatScheduleTime'
import { formatPrerequisiteCourseDisplay } from '../../lib/prerequisiteCourse'
import {
  buildTimetablePlacedBlocksByDay,
  resolveOfferedTimetableGridOptions,
  timetableBodyHeightPx,
} from '../../lib/timetableBlockLayout'
import { formatWeekdaysLongFromStored, type WeekdayFull } from '../../lib/weekdaySchedule'
import {
  getPreferredCourseTitle,
  getSecondaryCourseTitle,
} from '../../lib/courseDisplayName'
import {
  normalizeScheduleTrackValue,
  scheduleTrackDetailLabel,
} from '../../lib/scheduleTrack'
import {
  courseBinKeyFromSectionFields,
  courseBinSectionKey,
  useCourseBin,
  type CourseBinItem,
} from './CourseBinContext'
import {
  adminSectionToCourseBinItem,
  type CatalogCourseLite,
} from './sectionToCourseBinItem'
import { ClassPlanPanel } from './ClassPlanPanel'
import { RegistrationPlanCatalogSearch } from './RegistrationPlanCatalogSearch'
import { useRegistrationTermSearchParam } from './registrationTermSearch'

type TimetableLangTab = 'en' | 'cn'

const WEEKDAY_FULL_TO_LABEL: Record<WeekdayFull, StudentPortalKey> = {
  Monday: 'weekdayMonday',
  Tuesday: 'weekdayTuesday',
  Wednesday: 'weekdayWednesday',
  Thursday: 'weekdayThursday',
  Friday: 'weekdayFriday',
  Saturday: 'weekdaySaturday',
  Sunday: 'weekdaySunday',
}

function weekdayColumnLabel(full: WeekdayFull, t: (key: StudentPortalKey) => string): string {
  return t(WEEKDAY_FULL_TO_LABEL[full])
}

function cellText(value: string | number | null | undefined): string {
  if (value == null) return ''
  return String(value).trim()
}

function sectionKey(sec: AdminCourseSection): string {
  return courseBinKeyFromSectionFields({
    course_code: sec.course_code,
    section_code: sec.section_code,
    schedule_track: sec.schedule_track,
  })
}

function isSectionInBin(items: CourseBinItem[], sec: AdminCourseSection): boolean {
  const k = sectionKey(sec)
  return items.some(
    (x) => courseBinSectionKey(x.course_code, x.section, x.schedule_track) === k,
  )
}

function isSectionEnrolledForTerm(enrolledKeys: Set<string>, sec: AdminCourseSection): boolean {
  return enrolledKeys.has(sectionKey(sec))
}

/** Weekly grid: planned = in class planner; enrolled = on official schedule; available = neither. */
function matchesWeeklyScheduleFilters(
  sec: AdminCourseSection,
  binItems: CourseBinItem[],
  enrolledKeys: Set<string>,
  showPlanned: boolean,
  showAvailable: boolean,
  showEnrolled: boolean,
): boolean {
  if (!showPlanned && !showAvailable && !showEnrolled) return true
  const inBin = isSectionInBin(binItems, sec)
  const enrolled = isSectionEnrolledForTerm(enrolledKeys, sec)
  const available = !inBin && !enrolled
  return (
    (showPlanned && inBin) || (showEnrolled && enrolled) || (showAvailable && available)
  )
}

type OfferedWeekGridProps = {
  placedWeekdays: ReturnType<typeof buildTimetablePlacedBlocksByDay>
  hourRows: number[]
  bodyHeightPx: number
  catalogByCode: Map<string, CatalogCourseLite>
  binItems: CourseBinItem[]
  enrolledKeys: Set<string>
  onSelectSection: (sec: AdminCourseSection) => void
  t: (key: StudentPortalKey) => string
}

function OfferedTimetableWeekGrid({
  placedWeekdays,
  hourRows,
  bodyHeightPx,
  catalogByCode,
  binItems,
  enrolledKeys,
  onSelectSection,
  t,
}: OfferedWeekGridProps) {
  return (
    <div className="admin-timetable-wrap">
      <TimetableWeekGrid
        placedWeekdays={placedWeekdays}
        hourRows={hourRows}
        bodyHeightPx={bodyHeightPx}
        weekdayLabel={(d) => weekdayColumnLabel(d, t)}
        hourLabel={(h) => formatTimeHmsForDisplay(`${h}:00:00`)}
        renderBlock={(b, d) => {
          const sec = b.source
          const colW = 100 / b.colCount
          const insetPx = 3
          const inBin = isSectionInBin(binItems, sec)
          const enrolledOnly = !inBin && isSectionEnrolledForTerm(enrolledKeys, sec)
          const reserved = inBin || enrolledOnly
          const cat = catalogByCode.get(cellText(sec.course_code).toUpperCase())
          const preferredTitle = getPreferredCourseTitle(
            cat ?? {
              code: sec.course_code,
              eng_name: null,
              chi_name: null,
            },
            sec.schedule_track,
          )
          const labelCore = `${sec.course_code} ${sec.section_code}. ${preferredTitle}`
          const ariaInBin = t('offeredInCourseBinOpenDetails').replace('{label}', labelCore)
          const ariaEnrolled = t('offeredRegisteredOpenDetails').replace('{label}', labelCore)
          const ariaDefault = t('offeredViewDetailsFor').replace('{label}', labelCore)
          return (
            <button
              key={`${sec.id}-${d}-${b.startMin}-${b.colIndex}`}
              type="button"
              className={[
                'admin-timetable-v2__block',
                'portal-offered-timetable__block',
                reserved ? 'portal-offered-timetable__block--in-bin' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                top: b.topPx,
                height: b.heightPx,
                left: `calc(${colW * b.colIndex}% + ${insetPx}px)`,
                width: `calc(${colW}% - ${insetPx * 2}px)`,
              }}
              onClick={() => onSelectSection(sec)}
              aria-label={inBin ? ariaInBin : enrolledOnly ? ariaEnrolled : ariaDefault}
            >
              <span className="admin-timetable-v2__block-title">
                {sec.course_code} {sec.section_code}
                {inBin ? (
                  <span className="portal-offered-timetable__badge">{t('offeredAddedBadge')}</span>
                ) : null}
                {enrolledOnly ? (
                  <span className="portal-offered-timetable__badge">
                    {t('offeredRegisteredBadge')}
                  </span>
                ) : null}
              </span>
              <span className="admin-timetable-v2__block-subtitle">{preferredTitle}</span>
              <span className="admin-timetable-v2__block-meta">
                {formatTimeHmsForDisplay(sec.start_time)} – {formatTimeHmsForDisplay(sec.end_time)}
              </span>
              <span className="admin-timetable-v2__block-meta">
                {formatDeliveryModeForDisplay(sec.delivery_mode)}
              </span>
            </button>
          )
        }}
      />
    </div>
  )
}

export function OfferedTimetablePage() {
  const t = useStudentPortalT()
  const location = useLocation()
  const registrationTermId = useRegistrationTermSearchParam()
  const { currentStudentId, isAuthenticated } = useAccount()
  const { items: binItems, addToCourseBin, removeFromCourseBin } = useCourseBin()
  const [detailSection, setDetailSection] = useState<AdminCourseSection | null>(null)
  const [sections, setSections] = useState<AdminCourseSection[] | null>(null)
  const [catalog, setCatalog] = useState<CatalogCourseLite[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [langTab, setLangTab] = useState<TimetableLangTab>('en')
  const [weeklyFilterPlanned, setWeeklyFilterPlanned] = useState(true)
  const [weeklyFilterAvailable, setWeeklyFilterAvailable] = useState(false)
  const [weeklyFilterEnrolled, setWeeklyFilterEnrolled] = useState(false)
  const [enrolledRefreshKey, setEnrolledRefreshKey] = useState(0)
  const [enrolledSections, setEnrolledSections] = useState<AdminCourseSection[]>([])
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 2800)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const onEnrollmentChanged = () => {
      setEnrolledRefreshKey((k) => k + 1)
    }
    window.addEventListener(PORTAL_STUDENT_ENROLLMENT_CHANGED, onEnrollmentChanged)
    return () => {
      window.removeEventListener(PORTAL_STUDENT_ENROLLMENT_CHANGED, onEnrollmentChanged)
    }
  }, [])

  useEffect(() => {
    if (location.hash !== '#registration-class-plan') return
    const el = document.getElementById('registration-class-plan')
    if (el == null) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash, location.key])

  const studentKey = currentStudentId?.trim() ?? ''
  const termKey = registrationTermId?.trim() ?? ''

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

  useEffect(() => {
    const ac = new AbortController()
    void (async () => {
      try {
        const data: unknown = await fetchApiJson('/api/courses', { signal: ac.signal })
        if (!Array.isArray(data)) {
          throw new Error(t('unexpectedCatalogOffered'))
        }
        if (!ac.signal.aborted) {
          setCatalog(data as CatalogCourseLite[])
        }
      } catch (e) {
        if (ac.signal.aborted) return
        console.error('[offered-timetable] catalog load failed', e)
        setCatalog([])
      }
    })()
    return () => ac.abort()
  }, [t])

  const catalogByCode = useMemo(() => {
    const m = new Map<string, CatalogCourseLite>()
    for (const c of catalog) {
      const code = cellText(c.code)
      if (code !== '') m.set(code.toUpperCase(), c)
    }
    return m
  }, [catalog])

  useEffect(() => {
    const tid = registrationTermId?.trim() ?? ''
    if (tid === '') {
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
        const rows = await fetchAdminCourseSections({
          academicTermId: tid,
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        setSections(rows)
      } catch (e) {
        if (ac.signal.aborted) return
        setSections(null)
        setError(
          e instanceof Error ? e.message : t('couldNotLoadOfferedTimetable'),
        )
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    })()
    return () => ac.abort()
  }, [registrationTermId, t])

  const offeredGridOpts = useMemo(
    () => resolveOfferedTimetableGridOptions(sections),
    [sections],
  )

  const hourRows = useMemo(() => {
    const sh = offeredGridOpts.startHour ?? 8
    const eh = offeredGridOpts.endHour ?? 12
    return Array.from({ length: eh - sh + 1 }, (_, i) => sh + i)
  }, [offeredGridOpts])

  const englishSections = useMemo(
    () =>
      (sections ?? []).filter(
        (s) => normalizeScheduleTrackValue(s.schedule_track) !== 'CN',
      ),
    [sections],
  )
  const chineseSections = useMemo(
    () =>
      (sections ?? []).filter(
        (s) => normalizeScheduleTrackValue(s.schedule_track) === 'CN',
      ),
    [sections],
  )

  const englishSectionsForGrid = useMemo(
    () =>
      englishSections.filter((s) =>
        matchesWeeklyScheduleFilters(
          s,
          binItems,
          enrolledKeys,
          weeklyFilterPlanned,
          weeklyFilterAvailable,
          weeklyFilterEnrolled,
        ),
      ),
    [
      englishSections,
      binItems,
      enrolledKeys,
      weeklyFilterPlanned,
      weeklyFilterAvailable,
      weeklyFilterEnrolled,
    ],
  )
  const chineseSectionsForGrid = useMemo(
    () =>
      chineseSections.filter((s) =>
        matchesWeeklyScheduleFilters(
          s,
          binItems,
          enrolledKeys,
          weeklyFilterPlanned,
          weeklyFilterAvailable,
          weeklyFilterEnrolled,
        ),
      ),
    [
      chineseSections,
      binItems,
      enrolledKeys,
      weeklyFilterPlanned,
      weeklyFilterAvailable,
      weeklyFilterEnrolled,
    ],
  )

  const placedEn = useMemo(
    () => buildTimetablePlacedBlocksByDay(englishSectionsForGrid, offeredGridOpts),
    [englishSectionsForGrid, offeredGridOpts],
  )
  const placedCn = useMemo(
    () => buildTimetablePlacedBlocksByDay(chineseSectionsForGrid, offeredGridOpts),
    [chineseSectionsForGrid, offeredGridOpts],
  )

  const bodyHeightPx = timetableBodyHeightPx(offeredGridOpts)

  const handleConfirmAddFromModal = useCallback(() => {
    if (detailSection == null) return
    if (isSectionInBin(binItems, detailSection)) return
    if (isSectionEnrolledForTerm(enrolledKeys, detailSection)) {
      showToast(t('offeredAlreadyEnrolledToast'))
      setDetailSection(null)
      return
    }
    const cat = catalogByCode.get(cellText(detailSection.course_code).toUpperCase())
    addToCourseBin(adminSectionToCourseBinItem(detailSection, cat))
    showToast(t('toastAddedToCourseBin'))
    setDetailSection(null)
  }, [addToCourseBin, binItems, catalogByCode, detailSection, enrolledKeys, showToast, t])

  const handleConfirmRemoveFromModal = useCallback(() => {
    if (detailSection == null) return
    removeFromCourseBin(
      detailSection.course_code,
      detailSection.section_code,
      detailSection.schedule_track,
    )
    showToast(t('toastRemovedFromCourseBin'))
    setDetailSection(null)
  }, [detailSection, removeFromCourseBin, showToast, t])

  useEffect(() => {
    if (detailSection == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailSection(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailSection])

  const termMissing = registrationTermId == null || registrationTermId.trim() === ''

  const detailCatalog = detailSection
    ? catalogByCode.get(cellText(detailSection.course_code).toUpperCase())
    : undefined
  const detailTitleFields = {
    code: detailSection?.course_code,
    eng_name: detailCatalog ? cellText(detailCatalog.eng_name) : null,
    chi_name: detailCatalog ? cellText(detailCatalog.chi_name) : null,
  }
  const detailPrimaryTitle =
    detailSection != null
      ? getPreferredCourseTitle(detailTitleFields, detailSection.schedule_track)
      : ''
  const detailAlternateTitle =
    detailSection != null
      ? getSecondaryCourseTitle(detailTitleFields, detailSection.schedule_track)
      : ''
  const detailInBin =
    detailSection != null && isSectionInBin(binItems, detailSection)
  const detailEnrolled =
    detailSection != null && isSectionEnrolledForTerm(enrolledKeys, detailSection)
  const detailPrerequisiteDisplay = formatPrerequisiteCourseDisplay({
    courseCode: detailSection?.prerequisite_course_code,
    courseTitle: detailSection?.prerequisite_course_title,
  })

  const showTimetableTabs =
    !termMissing &&
    !loading &&
    sections != null &&
    error == null

  return (
    <main
      className="portal-page portal-offered-timetable portal-registration-plan-page"
      data-registration-term={registrationTermId ?? undefined}
    >
      {toast != null && (
        <div className="portal-offered-timetable__toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      <div className="portal-registration-plan-stack">
        <details open className="portal-registration-plan-details">
          <summary className="portal-registration-plan-details__summary">
            {t('registrationPlanWeeklyHeading')}
          </summary>
          <div className="portal-registration-plan-details__body portal-stack">
        <div className="portal-offered-timetable__title-row">
          <h2 id="offered-timetable-heading" className="portal-section-heading portal-registration-plan-panel-title">
            {t('offeredTimetableHeading')}
          </h2>
          {showTimetableTabs ? (
            <div
              className="portal-timetable-lang-tabs"
              role="tablist"
              aria-label={t('offeredTimetableLanguageAria')}
            >
              <button
                type="button"
                role="tab"
                id="offered-tt-tab-en"
                className="portal-timetable-lang-tab"
                aria-selected={langTab === 'en'}
                aria-controls="offered-tt-panel-en"
                onClick={() => setLangTab('en')}
              >
                {t('offeredTimetableTabEnglish')}
              </button>
              <button
                type="button"
                role="tab"
                id="offered-tt-tab-cn"
                className="portal-timetable-lang-tab"
                aria-selected={langTab === 'cn'}
                aria-controls="offered-tt-panel-cn"
                onClick={() => setLangTab('cn')}
              >
                {t('offeredTimetableTabChinese')}
              </button>
            </div>
          ) : null}
        </div>

        {termMissing && (
          <p className="portal-text-muted" role="status">
            {t('offeredSelectTermForOfferings')}
          </p>
        )}

        {error != null && (
          <p className="portal-text-muted" role="alert">
            {error}
          </p>
        )}

        {!termMissing && loading && (
          <p className="portal-text-muted" role="status">
            {t('offeredLoadingTimetable')}
          </p>
        )}

        {showTimetableTabs ? (
          <fieldset className="portal-offered-timetable__schedule-filters">
            <legend className="visually-hidden">{t('offeredTimetableFilterAria')}</legend>
            <span className="portal-offered-timetable__schedule-filters-label">
              {t('offeredTimetableFilterLabel')}:
            </span>
            <div className="portal-offered-timetable__schedule-filter-options">
              <label className="portal-offered-timetable__schedule-filter-item">
                <input
                  type="checkbox"
                  checked={weeklyFilterPlanned}
                  onChange={(e) => setWeeklyFilterPlanned(e.target.checked)}
                />
                {t('offeredTimetableFilterPlanned')}
              </label>
              <label className="portal-offered-timetable__schedule-filter-item">
                <input
                  type="checkbox"
                  checked={weeklyFilterAvailable}
                  onChange={(e) => setWeeklyFilterAvailable(e.target.checked)}
                />
                {t('offeredTimetableFilterAvailable')}
              </label>
              <label className="portal-offered-timetable__schedule-filter-item">
                <input
                  type="checkbox"
                  checked={weeklyFilterEnrolled}
                  onChange={(e) => setWeeklyFilterEnrolled(e.target.checked)}
                />
                {t('offeredTimetableFilterEnrolled')}
              </label>
            </div>
          </fieldset>
        ) : null}

        {showTimetableTabs && langTab === 'en' ? (
          <div
            role="tabpanel"
            id="offered-tt-panel-en"
            aria-labelledby="offered-tt-tab-en"
          >
            {sections!.length === 0 || englishSections.length === 0 ? (
              <p className="portal-text-muted" role="status">
                {t('offeredNoEnglishSections')}
              </p>
            ) : englishSectionsForGrid.length === 0 ? (
              <p className="portal-text-muted" role="status">
                {t('offeredTimetableNoSectionsMatchFilter')}
              </p>
            ) : (
              <OfferedTimetableWeekGrid
                placedWeekdays={placedEn}
                hourRows={hourRows}
                bodyHeightPx={bodyHeightPx}
                catalogByCode={catalogByCode}
                binItems={binItems}
                enrolledKeys={enrolledKeys}
                onSelectSection={setDetailSection}
                t={t}
              />
            )}
          </div>
        ) : null}

        {showTimetableTabs && langTab === 'cn' ? (
          <div
            role="tabpanel"
            id="offered-tt-panel-cn"
            aria-labelledby="offered-tt-tab-cn"
          >
            {sections!.length === 0 || chineseSections.length === 0 ? (
              <p className="portal-text-muted" role="status">
                {t('offeredNoChineseSections')}
              </p>
            ) : chineseSectionsForGrid.length === 0 ? (
              <p className="portal-text-muted" role="status">
                {t('offeredTimetableNoSectionsMatchFilter')}
              </p>
            ) : (
              <OfferedTimetableWeekGrid
                placedWeekdays={placedCn}
                hourRows={hourRows}
                bodyHeightPx={bodyHeightPx}
                catalogByCode={catalogByCode}
                binItems={binItems}
                enrolledKeys={enrolledKeys}
                onSelectSection={setDetailSection}
                t={t}
              />
            )}
          </div>
        ) : null}
          </div>
        </details>

        <details open className="portal-registration-plan-details">
          <summary className="portal-registration-plan-details__summary">
            {t('registrationPlanSearchHeading')}
          </summary>
          <div className="portal-registration-plan-details__body portal-stack">
            <p className="portal-text-muted" style={{ marginTop: 0 }}>
              {t('registrationPlanSearchLede')}
            </p>
            <div role="search" aria-label={t('registrationPlanSearchHeading')}>
              <RegistrationPlanCatalogSearch
                termSections={sections ?? []}
                catalogByCode={catalogByCode}
                termMissing={termMissing}
                binItems={binItems}
                enrolledKeys={enrolledKeys}
                addToCourseBin={addToCourseBin}
                showToast={showToast}
              />
            </div>
          </div>
        </details>

        <details open className="portal-registration-plan-details" id="registration-class-plan">
          <summary className="portal-registration-plan-details__summary">
            {t('registrationPlanClassPlanHeading')}
          </summary>
          <div className="portal-registration-plan-details__body">
            <ClassPlanPanel
              items={binItems}
              enrolledKeys={enrolledKeys}
              removeFromCourseBin={removeFromCourseBin}
              showToast={showToast}
            />
          </div>
        </details>
      </div>

      {detailSection != null && (
        <div
          className="portal-offered-section-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetailSection(null)
          }}
        >
          <div
            className="portal-offered-section-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="offered-section-detail-title"
          >
            <h2 id="offered-section-detail-title" className="portal-offered-section-modal__title">
              {detailSection.course_code} · {detailSection.section_code}
            </h2>
            <dl className="portal-offered-section-modal__dl">
              <div>
                <dt>{t('offeredModalDtCourseCode')}</dt>
                <dd>{detailSection.course_code}</dd>
              </div>
              {detailPrimaryTitle !== '' && detailPrimaryTitle !== '—' ? (
                <div>
                  <dt>{t('offeredModalDtCourseTitle')}</dt>
                  <dd>{detailPrimaryTitle}</dd>
                </div>
              ) : null}
              {detailAlternateTitle !== '' ? (
                <div>
                  <dt>{t('offeredModalDtAlternateTitle')}</dt>
                  <dd>{detailAlternateTitle}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t('prerequisiteLabel')}</dt>
                <dd>{detailPrerequisiteDisplay ?? '—'}</dd>
              </div>
              <div>
                <dt>{t('offeredModalDtTimetableTrack')}</dt>
                <dd>{scheduleTrackDetailLabel(detailSection.schedule_track)}</dd>
              </div>
              <div>
                <dt>{t('offeredModalDtSection')}</dt>
                <dd>{detailSection.section_code}</dd>
              </div>
              <div>
                <dt>{t('offeredModalDtWeekdays')}</dt>
                <dd>{formatWeekdaysLongFromStored(detailSection.weekday)}</dd>
              </div>
              <div>
                <dt>{t('offeredModalDtTime')}</dt>
                <dd>
                  {formatTimeRangeHmsForDisplay(detailSection.start_time, detailSection.end_time)}
                </dd>
              </div>
              <div>
                <dt>{t('offeredModalDtDeliveryMode')}</dt>
                <dd>{formatDeliveryModeForDisplay(detailSection.delivery_mode)}</dd>
              </div>
              <div>
                <dt>{t('offeredModalDtRoom')}</dt>
                <dd>{detailSection.room?.trim() ? detailSection.room : '—'}</dd>
              </div>
              <div>
                <dt>{t('offeredModalDtInstructor')}</dt>
                <dd>{detailSection.instructor?.trim() ? detailSection.instructor : '—'}</dd>
              </div>
              <div>
                <dt>{t('offeredModalDtNotes')}</dt>
                <dd>{detailSection.notes?.trim() ? detailSection.notes : '—'}</dd>
              </div>
            </dl>
            <div className="portal-offered-section-modal__actions">
              {detailEnrolled ? (
                <>
                  <p className="portal-text-muted" style={{ margin: 0, flex: '1 1 auto' }}>
                    {t('offeredModalAlreadyEnrolledNote')}
                  </p>
                  {detailInBin ? (
                    <button
                      type="button"
                      className="portal-btn portal-btn--secondary portal-btn--compact"
                      onClick={handleConfirmRemoveFromModal}
                    >
                      {t('removeFromCourseBin')}
                    </button>
                  ) : null}
                </>
              ) : detailInBin ? (
                <button
                  type="button"
                  className="portal-btn portal-btn--secondary portal-btn--compact"
                  onClick={handleConfirmRemoveFromModal}
                >
                  {t('removeFromCourseBin')}
                </button>
              ) : (
                <button
                  type="button"
                  className="portal-btn portal-btn--primary portal-btn--compact"
                  onClick={handleConfirmAddFromModal}
                >
                  {t('addToCourseBin')}
                </button>
              )}
              <button
                type="button"
                className="portal-btn portal-btn--compact"
                onClick={() => setDetailSection(null)}
              >
                {t('gcalModalClose')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

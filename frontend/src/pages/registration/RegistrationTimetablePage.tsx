import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'
import { TimetableWeekGrid } from '../../components/timetable/TimetableWeekGrid'
import type { AdminCourseSection } from '../../lib/api'
import { formatDeliveryModeForDisplay } from '../../lib/deliveryMode'
import { formatTimeHmsForDisplay, formatTimeRangeHmsForDisplay } from '../../lib/formatScheduleTime'
import { formatPrerequisiteCourseDisplay } from '../../lib/prerequisiteCourse'
import {
  buildTimetablePlacedBlocksByDay,
  STUDENT_REGISTRATION_TIMETABLE_GRID,
  TIMETABLE_END_HOUR,
  TIMETABLE_START_HOUR,
  timetableBodyHeightPx,
} from '../../lib/timetableBlockLayout'
import { formatWeekdaysLongFromStored, type WeekdayFull } from '../../lib/weekdaySchedule'
import { getPreferredCourseTitle, getSecondaryCourseTitle } from '../../lib/courseDisplayName'
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
import { navigateToRegistrationBin } from './registrationBinNavigation'
import { adminSectionToCourseBinItem, type CatalogCourseLite } from './sectionToCourseBinItem'
import { useRegistrationOfferings } from './useRegistrationOfferings'
import { useRegistrationWindow } from './RegistrationWindowContext'

type TimetableLangTab = 'en' | 'cn'

function weekdayShortLabel(day: WeekdayFull): string {
  return day.length > 3 ? day.slice(0, 3) : day
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

function RegistrationTimetableWeekGrid({
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
    <TimetableWeekGrid
      placedWeekdays={placedWeekdays}
      hourRows={hourRows}
      bodyHeightPx={bodyHeightPx}
      weekdayLabel={(d) => weekdayShortLabel(d)}
      hourLabel={(h) => formatTimeHmsForDisplay(`${h}:00:00`)}
      renderBlock={(b, d) => {
        const sec = b.source
        const colW = 100 / b.colCount
        const insetPx = 3
        const inBin = isSectionInBin(binItems, sec)
        const enrolled = isSectionEnrolledForTerm(enrolledKeys, sec)
        const cat = catalogByCode.get(cellText(sec.course_code).toUpperCase())
        const preferredTitle = getPreferredCourseTitle(
          cat ?? { code: sec.course_code, eng_name: null, chi_name: null },
          sec.schedule_track,
        )
        const deliveryMode = formatDeliveryModeForDisplay(sec.delivery_mode)
        const labelCore = `${sec.course_code} ${sec.section_code}. ${preferredTitle}`
        return (
          <button
            key={`${sec.id}-${d}-${b.startMin}-${b.colIndex}`}
            type="button"
            className="admin-timetable-v2__block"
            style={{
              top: b.topPx,
              height: b.heightPx,
              left: `calc(${colW * b.colIndex}% + ${insetPx}px)`,
              width: `calc(${colW}% - ${insetPx * 2}px)`,
            }}
            onClick={() => onSelectSection(sec)}
            aria-label={
              inBin
                ? t('offeredInCourseBinOpenDetails').replace('{label}', labelCore)
                : enrolled
                  ? t('offeredRegisteredOpenDetails').replace('{label}', labelCore)
                  : t('offeredViewDetailsFor').replace('{label}', labelCore)
            }
          >
            <span className="admin-timetable-v2__block-code">
              {sec.course_code} {sec.section_code}
            </span>
            <span className="admin-timetable-v2__block-subtitle">{preferredTitle}</span>
            <span className="admin-timetable-v2__block-meta">
              {formatTimeHmsForDisplay(sec.start_time)} – {formatTimeHmsForDisplay(sec.end_time)}
              {deliveryMode ? ` · ${deliveryMode}` : ''}
            </span>
            {enrolled ? (
              <span className="admin-timetable-v2__block-meta">
                {t('registrationPlanStatusEnrolled')}
              </span>
            ) : inBin ? (
              <span className="admin-timetable-v2__block-meta">
                {t('registrationPlanStatusInPlan')}
              </span>
            ) : null}
          </button>
        )
      }}
    />
  )
}

export function RegistrationTimetablePage() {
  const t = useStudentPortalT()
  const navigate = useNavigate()
  const { items: binItems, addToCourseBin, removeFromCourseBin } = useCourseBin()
  const {
    registrationTermId,
    termMissing,
    sections,
    catalogByCode,
    enrolledKeys,
    loading,
    error,
  } = useRegistrationOfferings()
  const { isOpen: registrationWindowOpen } = useRegistrationWindow()
  const [detailSection, setDetailSection] = useState<AdminCourseSection | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [langTab, setLangTab] = useState<TimetableLangTab>('en')
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

  const timetableGridOpts = STUDENT_REGISTRATION_TIMETABLE_GRID

  const hourRows = useMemo(
    () =>
      Array.from(
        { length: TIMETABLE_END_HOUR - TIMETABLE_START_HOUR + 1 },
        (_, i) => TIMETABLE_START_HOUR + i,
      ),
    [],
  )

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

  const placedEn = useMemo(
    () => buildTimetablePlacedBlocksByDay(englishSections, timetableGridOpts),
    [englishSections],
  )
  const placedCn = useMemo(
    () => buildTimetablePlacedBlocksByDay(chineseSections, timetableGridOpts),
    [chineseSections],
  )

  const bodyHeightPx = timetableBodyHeightPx(timetableGridOpts)

  const handleConfirmAddFromModal = useCallback(() => {
    if (detailSection == null) return
    if (!registrationWindowOpen) {
      showToast(t('registrationWindowClosedCheckout'))
      return
    }
    if (isSectionInBin(binItems, detailSection)) return
    if (isSectionEnrolledForTerm(enrolledKeys, detailSection)) {
      showToast(t('offeredAlreadyEnrolledToast'))
      setDetailSection(null)
      return
    }
    const cat = catalogByCode.get(cellText(detailSection.course_code).toUpperCase())
    addToCourseBin(adminSectionToCourseBinItem(detailSection, cat))
    showToast(t('registrationAddedToBinToast'))
    setDetailSection(null)
    navigateToRegistrationBin(navigate, registrationTermId)
  }, [
    addToCourseBin,
    binItems,
    catalogByCode,
    detailSection,
    enrolledKeys,
    navigate,
    registrationTermId,
    registrationWindowOpen,
    showToast,
    t,
  ])

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
  const detailInBin = detailSection != null && isSectionInBin(binItems, detailSection)
  const detailEnrolled =
    detailSection != null && isSectionEnrolledForTerm(enrolledKeys, detailSection)
  const detailPrerequisiteDisplay = formatPrerequisiteCourseDisplay({
    courseCode: detailSection?.prerequisite_course_code,
    courseTitle: detailSection?.prerequisite_course_title,
  })

  const showTimetableTabs =
    !termMissing && !loading && sections != null && error == null

  return (
    <main
      className="portal-page portal-registration-timetable-page"
      data-registration-term={registrationTermId ?? undefined}
    >
      {toast != null ? (
        <div className="portal-offered-timetable__toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}

      {termMissing ? (
        <p className="portal-text-muted" role="status">
          {t('offeredSelectTermForOfferings')}
        </p>
      ) : null}

      {error != null ? (
        <p className="portal-login-error" role="alert">
          {error}
        </p>
      ) : null}

      {!termMissing && loading ? (
        <p className="portal-text-muted" role="status">
          {t('offeredLoadingTimetable')}
        </p>
      ) : null}

      {showTimetableTabs ? (
        <div className="admin-scheduling-timetable-card">
          <div className="admin-scheduling-timetable-card__head">
            <div
              className="admin-finance-page-tabs admin-scheduling-timetable-tabs"
              role="tablist"
              aria-label={t('offeredTimetableLanguageAria')}
            >
              <button
                type="button"
                role="tab"
                id="offered-tt-tab-en"
                className={`admin-finance-page-tab${langTab === 'en' ? ' admin-finance-page-tab--active' : ''}`}
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
                className={`admin-finance-page-tab${langTab === 'cn' ? ' admin-finance-page-tab--active' : ''}`}
                aria-selected={langTab === 'cn'}
                aria-controls="offered-tt-panel-cn"
                onClick={() => setLangTab('cn')}
              >
                {t('offeredTimetableTabChinese')}
              </button>
            </div>
          </div>

          <div className="admin-scheduling-timetable-card__body">
            {langTab === 'en' ? (
              <div role="tabpanel" id="offered-tt-panel-en" aria-labelledby="offered-tt-tab-en">
                {sections!.length === 0 || englishSections.length === 0 ? (
                  <p className="portal-text-muted" role="status">
                    {t('offeredNoEnglishSections')}
                  </p>
                ) : (
                  <div className="admin-timetable-wrap">
                    <RegistrationTimetableWeekGrid
                      placedWeekdays={placedEn}
                      hourRows={hourRows}
                      bodyHeightPx={bodyHeightPx}
                      catalogByCode={catalogByCode}
                      binItems={binItems}
                      enrolledKeys={enrolledKeys}
                      onSelectSection={setDetailSection}
                      t={t}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div role="tabpanel" id="offered-tt-panel-cn" aria-labelledby="offered-tt-tab-cn">
                {sections!.length === 0 || chineseSections.length === 0 ? (
                  <p className="portal-text-muted" role="status">
                    {t('offeredNoChineseSections')}
                  </p>
                ) : (
                  <div className="admin-timetable-wrap">
                    <RegistrationTimetableWeekGrid
                      placedWeekdays={placedCn}
                      hourRows={hourRows}
                      bodyHeightPx={bodyHeightPx}
                      catalogByCode={catalogByCode}
                      binItems={binItems}
                      enrolledKeys={enrolledKeys}
                      onSelectSection={setDetailSection}
                      t={t}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {detailSection != null ? (
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
              ) : !registrationWindowOpen ? (
                <span className="portal-registration-window-badge">
                  {t('registrationWindowClosedShort')}
                </span>
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
      ) : null}
    </main>
  )
}

/** @deprecated Use RegistrationTimetablePage */
export const OfferedTimetablePage = RegistrationTimetablePage

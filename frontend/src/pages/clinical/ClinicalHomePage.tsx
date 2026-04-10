import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from '../../context/AccountContext'
import { useLanguage, useStudentPortalT } from '../../LanguageContext'
import type { PortalLocale, StudentPortalKey } from '../../lib/i18n'
import {
  fetchStudentClinicalSchedule,
  type ClinicalScheduleSession,
} from '../../lib/api'

function readinessLabel(
  readiness: 'ready' | 'not_ready',
  t: (k: StudentPortalKey) => string,
): string {
  return readiness === 'ready' ? t('clinicalReady') : t('clinicalNotReady')
}

function clinicalLevelLabel(level: number, t: (k: StudentPortalKey) => string): string {
  if (!Number.isFinite(level) || level <= 0) return t('clinicalNotStarted')
  return t('clinicalLevelN').replace('{n}', String(Math.trunc(level)))
}

function formatScheduleDate(isoYmd: string, locale: PortalLocale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYmd.trim())
  if (!m) return isoYmd
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return isoYmd
  }
  const loc = locale === 'zh' ? 'zh-Hant' : 'en-US'
  return dt.toLocaleDateString(loc, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function todayIsoYmdLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const UPCOMING_PREVIEW_LIMIT = 5

function upcomingAssignedSessions(sessions: ClinicalScheduleSession[]): ClinicalScheduleSession[] {
  const today = todayIsoYmdLocal()
  return sessions
    .filter((s) => {
      const d = s.sessionDate.trim()
      return d >= today
    })
    .sort((a, b) => {
      const c = a.sessionDate.trim().localeCompare(b.sessionDate.trim())
      if (c !== 0) return c
      return a.id - b.id
    })
}

export function ClinicalHomePage() {
  const { locale } = useLanguage()
  const t = useStudentPortalT()
  const { account, currentStudentId } = useAccount()
  const cp = account.clinicalProgress

  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ClinicalScheduleSession[]>([])

  useEffect(() => {
    const sid = currentStudentId?.trim()
    if (!sid) {
      setSessions([])
      setScheduleError(null)
      setScheduleLoading(false)
      return
    }
    const ac = new AbortController()
    setScheduleLoading(true)
    setScheduleError(null)
    ;(async () => {
      try {
        const list = await fetchStudentClinicalSchedule(sid, { signal: ac.signal })
        if (ac.signal.aborted) return
        setSessions(list)
      } catch (e) {
        if (ac.signal.aborted) return
        setSessions([])
        setScheduleError(
          e instanceof Error ? e.message : t('couldNotLoadClinicalSessionsFallback'),
        )
      } finally {
        if (!ac.signal.aborted) setScheduleLoading(false)
      }
    })()
    return () => ac.abort()
  }, [currentStudentId, t])

  const upcomingPreview = useMemo(
    () => upcomingAssignedSessions(sessions).slice(0, UPCOMING_PREVIEW_LIMIT),
    [sessions],
  )

  const pct =
    cp == null
      ? 0
      : cp.requiredHours > 0
        ? Math.min(100, Math.round((cp.completedHours / cp.requiredHours) * 100))
        : cp.completedHours > 0
          ? 100
          : 0

  const hoursCaption = t('clinicalHoursLoggedCaption')
    .replace('{completed}', String(cp?.completedHours ?? 0))
    .replace('{required}', String(cp?.requiredHours ?? 0))

  return (
    <main className="portal-page">
      <h2 className="portal-section-heading">{t('clinicalOverviewHeading')}</h2>
      <p className="portal-page-lede">
        {t('clinicalOverviewLede')}
      </p>

      <section
        className="portal-card portal-academics-progress-card"
        aria-labelledby="clinical-assigned-preview-heading"
      >
        <h3 id="clinical-assigned-preview-heading" className="portal-section-heading">
          {t('clinicalUpcomingAssignedSessions')}
        </h3>
        {scheduleLoading ? (
          <p className="portal-inline-note portal-inline-note--flush">{t('clinicalLoadingAssignedSessions')}</p>
        ) : scheduleError != null ? (
          <p className="portal-inline-note portal-inline-note--flush" role="alert">
            {scheduleError}
          </p>
        ) : upcomingPreview.length === 0 ? (
          <p className="portal-inline-note portal-inline-note--flush">
            {t('clinicalNoUpcomingSessions')}
          </p>
        ) : (
          <ul className="portal-module-list">
            {upcomingPreview.map((s) => (
              <li key={String(s.id)} className="portal-module-list-item">
                <span className="portal-module-list-label">
                  {formatScheduleDate(s.sessionDate, locale)}
                  {s.sessionName != null && String(s.sessionName).trim() !== ''
                    ? ` · ${String(s.sessionName).trim()}`
                    : ''}
                  {s.site != null && String(s.site).trim() !== ''
                    ? ` · ${String(s.site).trim()}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="portal-academics-progress-caption portal-inline-note portal-inline-note--flush">
          <Link to="/clinical/schedule" className="portal-text-link">
            {t('clinicalOpenFullSchedule')}
          </Link>
        </p>
      </section>

      {cp == null ? (
        <p
          style={{
            margin: '1.25rem 0 0',
            fontSize: 'var(--portal-body-font-size)',
            lineHeight: 'var(--portal-body-line-height)',
            color: 'var(--portal-text-muted)',
          }}
        >
          {t('clinicalProgressWhenAvailable')}
        </p>
      ) : (
        <>
          <h2 className="portal-section-heading" style={{ marginTop: '1.75rem' }}>
            {t('clinicalProgressSectionHeading')}
          </h2>

          <section
            className="portal-card portal-academics-progress-card"
            aria-labelledby="clinical-progress-heading"
          >
            <h3 id="clinical-progress-heading" className="portal-section-heading">
              {t('clinicalTrackerHeading')}
            </h3>
            <div className="portal-grid-4">
              <div>
                <p className="portal-card-label">{t('clinicalLevelLabel')}</p>
                <p className="portal-card-value">{clinicalLevelLabel(cp.level, t)}</p>
              </div>
              <div>
                <p className="portal-card-label">{t('clinicalCompletedHoursLabel')}</p>
                <p className="portal-card-value">{cp.completedHours} hrs</p>
              </div>
              <div>
                <p className="portal-card-label">{t('clinicalRequiredHoursLabel')}</p>
                <p className="portal-card-value">{cp.requiredHours} hrs</p>
              </div>
              <div>
                <p className="portal-card-label">{t('clinicalReadinessLabel')}</p>
                <p className="portal-card-value">{readinessLabel(cp.readiness, t)}</p>
              </div>
            </div>
            <div
              className="portal-academics-progress-track"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('clinicalHoursProgressAria')}
            >
              <div className="portal-academics-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="portal-academics-progress-caption portal-inline-note portal-inline-note--flush">
              {hoursCaption}
            </p>
          </section>

          <section className="portal-module-panel" aria-labelledby="clinical-courses-heading">
            <h3 id="clinical-courses-heading" className="portal-module-panel-heading">
              {t('clinicalCompletedCoursesHeading')}
            </h3>
            {cp.completedCourses.length === 0 ? (
              <p className="portal-inline-note portal-inline-note--flush">
                {t('clinicalNoCourseRowsOnFile')}
              </p>
            ) : (
              <ul className="portal-module-list">
                {cp.completedCourses.map((code) => (
                  <li key={code} className="portal-module-list-item">
                    <span className="portal-module-list-label">{code}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="portal-module-panel" aria-labelledby="clinical-missing-heading">
            <h3 id="clinical-missing-heading" className="portal-module-panel-heading">
              {t('clinicalMissingNextSteps')}
            </h3>
            {cp.missing.length === 0 ? (
              <p className="portal-inline-note portal-inline-note--flush">{t('clinicalNoOpenItems')}</p>
            ) : (
              <ul className="portal-module-list">
                {cp.missing.map((item) => (
                  <li key={item} className="portal-module-list-item">
                    <span className="portal-module-list-label">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}

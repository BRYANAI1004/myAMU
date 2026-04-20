import { useEffect, useState } from 'react'
import { useLanguage, useStudentPortalT } from '@/LanguageContext'
import { fetchPostedCurrentAcademicTerm, type AcademicTerm } from '../../lib/api'

function formatDashboardTermDate(iso: string | null, locale: string): string {
  if (iso == null || iso.trim() === '') return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (!m) return '—'
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

type CurrentTermField = { id: string; label: string; value: string }

function renderTermFieldColumn(items: CurrentTermField[]) {
  return (
    <dl className="portal-dashboard-current-term-card__column">
      {items.map((item) => (
        <div key={item.id} className="portal-dashboard-current-term-card__row">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function DashboardCurrentPostedTerm() {
  const { locale } = useLanguage()
  const t = useStudentPortalT()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [term, setTerm] = useState<AcademicTerm | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    void fetchPostedCurrentAcademicTerm({ signal: ac.signal })
      .then((row) => {
        if (!ac.signal.aborted) {
          setTerm(row)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (ac.signal.aborted) return
        setError(e instanceof Error ? e.message : 'Error')
        setLoading(false)
      })
    return () => ac.abort()
  }, [])

  if (loading) {
    return (
      <section
        className="portal-dashboard-current-term-card portal-card"
        aria-busy="true"
        aria-live="polite"
      >
        <p className="portal-card-note">{t('loadingCurrentAcademicTerm')}</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="portal-dashboard-current-term-card portal-card portal-dashboard-current-term-card--muted">
        <h2 className="portal-dashboard-current-term-card__title">
          {t('currentAcademicTermTitle')}
        </h2>
        <p className="portal-card-note">{t('couldNotLoadCurrentAcademicTerm')}</p>
      </section>
    )
  }

  if (term === null) {
    return (
      <section
        className="portal-dashboard-current-term-card portal-card portal-dashboard-current-term-card--muted"
        aria-live="polite"
      >
        <h2 className="portal-dashboard-current-term-card__title">
          {t('currentAcademicTermTitle')}
        </h2>
        <p className="portal-card-note">{t('noCurrentAcademicTermPosted')}</p>
      </section>
    )
  }

  const leftColumn: CurrentTermField[] = [
    {
      id: 'term_label',
      label: t('currentAcademicTermTermRow'),
      value: term.term_label.trim() || '—',
    },
    {
      id: 'registration_close',
      label: t('currentAcademicTermRegistrationCloses'),
      value: formatDashboardTermDate(term.registration_close, locale),
    },
  ]

  const rightColumn: CurrentTermField[] = [
    {
      id: 'payment_due',
      label: t('currentAcademicTermPaymentDeadline'),
      value: formatDashboardTermDate(term.payment_due_date, locale),
    },
    {
      id: 'withdraw_deadline',
      label: t('currentAcademicTermWithdrawDeadline'),
      value: formatDashboardTermDate(term.withdraw_deadline, locale),
    },
  ]

  return (
    <section
      className="portal-dashboard-current-term-card portal-card"
      aria-labelledby="portal-dashboard-current-term-heading"
    >
      <h2
        id="portal-dashboard-current-term-heading"
        className="portal-dashboard-current-term-card__title"
      >
        {t('currentAcademicTermTitle')}
      </h2>
      <div className="portal-dashboard-current-term-card__dl portal-dashboard-current-term-card__dl--two-col">
        {renderTermFieldColumn(leftColumn)}
        {renderTermFieldColumn(rightColumn)}
      </div>
    </section>
  )
}

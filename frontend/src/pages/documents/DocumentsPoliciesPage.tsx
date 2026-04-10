import { useMemo } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'

type PolicyRow = {
  id: string
  titleKey: StudentPortalKey
  categoryKey: StudentPortalKey
  effectiveDate: string
  actionLabelKey: StudentPortalKey
}

function PolicySection({
  headingId,
  title,
  policies,
  t,
}: {
  headingId: string
  title: string
  policies: readonly PolicyRow[]
  t: (key: StudentPortalKey) => string
}) {
  return (
    <section className="portal-module-panel portal-documents-panel-stack" aria-labelledby={headingId}>
      <h3 id={headingId} className="portal-documents-section-heading">
        {title}
      </h3>
      <ul className="portal-documents-item-list">
        {policies.map((p) => (
          <li key={p.id} className="portal-documents-item">
            <div className="portal-documents-item-main">
              <p className="portal-documents-item-title">{t(p.titleKey)}</p>
              <p className="portal-documents-item-meta">
                <span className="portal-documents-item-category">{t(p.categoryKey)}</span>
                <span className="portal-documents-item-sep" aria-hidden="true">
                  ·
                </span>
                <span>{t('documentsEffective').replace('{date}', p.effectiveDate)}</span>
              </p>
            </div>
            <button type="button" className="portal-btn portal-btn--secondary portal-btn--compact">
              {t(p.actionLabelKey)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function DocumentsPoliciesPage() {
  const t = useStudentPortalT()

  const privacyPolicies = useMemo(
    (): readonly PolicyRow[] => [
      {
        id: 'ferpa',
        titleKey: 'documentsPolicyFerpaTitle',
        categoryKey: 'documentsPolicyFerpaCategory',
        effectiveDate: 'Aug 1, 2025',
        actionLabelKey: 'documentsPolicyViewPdf',
      },
      {
        id: 'privacy',
        titleKey: 'documentsPolicyPrivacyTitle',
        categoryKey: 'documentsPolicyFerpaCategory',
        effectiveDate: 'Jan 15, 2026',
        actionLabelKey: 'documentsPolicyViewPdf',
      },
    ],
    [],
  )

  const academicPolicies = useMemo(
    (): readonly PolicyRow[] => [
      {
        id: 'copyright',
        titleKey: 'documentsPolicyCopyrightTitle',
        categoryKey: 'documentsPolicyCopyrightCategory',
        effectiveDate: 'Jul 1, 2025',
        actionLabelKey: 'documentsPolicyReview',
      },
      {
        id: 'integrity',
        titleKey: 'documentsPolicyIntegrityTitle',
        categoryKey: 'documentsPolicyIntegrityCategory',
        effectiveDate: 'Sep 1, 2025',
        actionLabelKey: 'documentsPolicyViewPdf',
      },
    ],
    [],
  )

  return (
    <main className="portal-page portal-documents-page-stack">
      <h2 className="portal-section-heading">{t('documentsPoliciesHeading')}</h2>
      <p className="portal-page-lede">{t('documentsPoliciesLede')}</p>
      <PolicySection
        headingId="policies-privacy-heading"
        title={t('documentsPoliciesPrivacySection')}
        policies={privacyPolicies}
        t={t}
      />
      <PolicySection
        headingId="policies-academic-heading"
        title={t('documentsPoliciesAcademicSection')}
        policies={academicPolicies}
        t={t}
      />
      <p className="portal-inline-note portal-inline-note--flush">{t('documentsPoliciesFooter')}</p>
    </main>
  )
}

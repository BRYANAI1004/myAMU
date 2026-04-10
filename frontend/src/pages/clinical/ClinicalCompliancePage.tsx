import { useStudentPortalT } from '../../LanguageContext'
import type { StudentPortalKey } from '../../lib/i18n'

type ComplianceRow = {
  id: string
  titleKey: StudentPortalKey
  detailKey: StudentPortalKey
  status: 'complete' | 'pending' | 'expiring'
  metaKey?: StudentPortalKey
}

const REQUIREMENTS: readonly ComplianceRow[] = [
  {
    id: 'hipaa',
    titleKey: 'complianceMockHipaaTitle',
    detailKey: 'complianceMockHipaaDetail',
    status: 'complete',
  },
  {
    id: 'bls',
    titleKey: 'complianceMockBlsTitle',
    detailKey: 'complianceMockBlsDetail',
    status: 'expiring',
    metaKey: 'complianceMockBlsMeta',
  },
  {
    id: 'imm',
    titleKey: 'complianceMockImmTitle',
    detailKey: 'complianceMockImmDetail',
    status: 'complete',
  },
  {
    id: 'bg',
    titleKey: 'complianceMockBgTitle',
    detailKey: 'complianceMockBgDetail',
    status: 'complete',
  },
  {
    id: 'annual',
    titleKey: 'complianceMockAnnualTitle',
    detailKey: 'complianceMockAnnualDetail',
    status: 'pending',
    metaKey: 'complianceMockAnnualMeta',
  },
]

function statusClass(status: ComplianceRow['status']) {
  if (status === 'complete') return 'portal-status portal-status--paid'
  if (status === 'pending') return 'portal-status portal-status--pending'
  return 'portal-status portal-status--expiring'
}

export function ClinicalCompliancePage() {
  const t = useStudentPortalT()

  return (
    <main className="portal-page">
      <h2 className="portal-section-heading">{t('compliance')}</h2>
      <p className="portal-page-lede">
        {t('compliancePageLede')}
      </p>
      <section className="portal-module-panel" aria-labelledby="compliance-list-heading">
        <h3 id="compliance-list-heading" className="portal-module-panel-heading">
          {t('complianceRequirementsListHeading')}
        </h3>
        <ul className="portal-registration-status-list">
          {REQUIREMENTS.map((row) => (
            <li key={row.id} className="portal-registration-status-item portal-clinical-compliance-item">
              <div>
                <p className="portal-registration-status-label">{t(row.titleKey)}</p>
                <p className="portal-registration-status-value portal-clinical-compliance-detail">{t(row.detailKey)}</p>
                {row.metaKey ? (
                  <p className="portal-clinical-meta-line portal-clinical-meta-line--flush">{t(row.metaKey)}</p>
                ) : null}
              </div>
              <span className={statusClass(row.status)}>
                {row.status === 'complete'
                  ? t('complianceStatusComplete')
                  : row.status === 'pending'
                    ? t('complianceStatusPending')
                    : t('complianceStatusExpiringSoon')}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <p className="portal-inline-note">
        {t('complianceFootnote')}
      </p>
    </main>
  )
}

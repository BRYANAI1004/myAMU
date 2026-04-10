import { useMemo } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'

export function DocumentsHandbookPage() {
  const t = useStudentPortalT()

  const quick = useMemo(
    () =>
      [
        {
          id: 'academic',
          titleKey: 'documentsHandbookQuickAcademicTitle' as const,
          descKey: 'documentsHandbookQuickAcademicDesc' as const,
        },
        {
          id: 'clinical',
          titleKey: 'documentsHandbookQuickClinicalTitle' as const,
          descKey: 'documentsHandbookQuickClinicalDesc' as const,
        },
        {
          id: 'conduct',
          titleKey: 'documentsHandbookQuickConductTitle' as const,
          descKey: 'documentsHandbookQuickConductDesc' as const,
        },
        {
          id: 'grad',
          titleKey: 'documentsHandbookQuickGradTitle' as const,
          descKey: 'documentsHandbookQuickGradDesc' as const,
        },
      ] as const,
    [],
  )

  return (
    <main className="portal-page portal-documents-page-stack">
      <h2 className="portal-section-heading">{t('documentsHandbookHeading')}</h2>
      <p className="portal-page-lede">{t('documentsHandbookLede')}</p>
      <section className="portal-documents-handbook-hero" aria-labelledby="handbook-primary-heading">
        <div className="portal-documents-handbook-hero-inner">
          <p id="handbook-primary-heading" className="portal-documents-handbook-label">
            {t('documentsHandbookCurrentEdition')}
          </p>
          <h3 className="portal-documents-handbook-title">{t('documentsHandbookTitle')}</h3>
          <p className="portal-documents-handbook-edition">{t('documentsHandbookEditionLine')}</p>
          <p className="portal-documents-handbook-desc">{t('documentsHandbookDesc')}</p>
          <div className="portal-documents-handbook-actions">
            <button type="button" className="portal-btn portal-btn--primary">
              {t('documentsHandbookView')}
            </button>
            <button type="button" className="portal-btn portal-btn--secondary">
              {t('documentsHandbookDownloadPdf')}
            </button>
          </div>
        </div>
      </section>
      <section className="portal-module-panel" aria-labelledby="handbook-quick-heading">
        <h3 id="handbook-quick-heading" className="portal-module-panel-heading">
          {t('documentsHandbookQuickLinks')}
        </h3>
        <p className="portal-documents-quick-intro">{t('documentsHandbookQuickIntro')}</p>
        <ul className="portal-documents-quick-grid">
          {quick.map((item) => (
            <li key={item.id}>
              <button type="button" className="portal-documents-quick-card">
                <span className="portal-documents-quick-title">
                  {t(item.titleKey as StudentPortalKey)}
                </span>
                <span className="portal-documents-quick-desc">
                  {t(item.descKey as StudentPortalKey)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

import { useMemo } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'

type UploadStatusKind = 'approved' | 'underReview' | 'submitted' | 'missing'

type UploadRow = {
  id: string
  labelKey: StudentPortalKey
  detailKey: StudentPortalKey
  statusKind: UploadStatusKind
}

function statusClass(kind: UploadStatusKind): string {
  switch (kind) {
    case 'approved':
      return 'portal-status portal-status--paid'
    case 'underReview':
      return 'portal-status portal-status--pending'
    case 'submitted':
      return 'portal-status portal-status--scheduled'
    case 'missing':
    default:
      return 'portal-status portal-status--missing'
  }
}

function statusLabelKey(kind: UploadStatusKind): StudentPortalKey {
  switch (kind) {
    case 'approved':
      return 'documentsUploadStatusApproved'
    case 'underReview':
      return 'documentsUploadStatusUnderReview'
    case 'submitted':
      return 'documentsUploadStatusSubmitted'
    case 'missing':
    default:
      return 'documentsUploadStatusMissing'
  }
}

export function DocumentsUploadsPage() {
  const t = useStudentPortalT()

  const uploads = useMemo(
    (): readonly UploadRow[] => [
      {
        id: 'imm',
        labelKey: 'documentsUploadImmLabel',
        detailKey: 'documentsUploadImmDetail',
        statusKind: 'approved',
      },
      {
        id: 'bls',
        labelKey: 'documentsUploadBlsLabel',
        detailKey: 'documentsUploadBlsDetail',
        statusKind: 'underReview',
      },
      {
        id: 'bg',
        labelKey: 'documentsUploadBgLabel',
        detailKey: 'documentsUploadBgDetail',
        statusKind: 'approved',
      },
      {
        id: 'copyright',
        labelKey: 'documentsUploadCopyrightLabel',
        detailKey: 'documentsUploadCopyrightDetail',
        statusKind: 'submitted',
      },
      {
        id: 'reg',
        labelKey: 'documentsUploadRegLabel',
        detailKey: 'documentsUploadRegDetail',
        statusKind: 'missing',
      },
    ],
    [],
  )

  return (
    <main className="portal-page portal-documents-page-stack">
      <h2 className="portal-section-heading">{t('documentsUploadsHeading')}</h2>
      <p className="portal-page-lede">{t('documentsUploadsLede')}</p>
      <section className="portal-module-panel" aria-labelledby="uploads-list-heading">
        <h3 id="uploads-list-heading" className="portal-module-panel-heading">
          {t('documentsUploadsYourDocuments')}
        </h3>
        <ul className="portal-registration-status-list">
          {uploads.map((row) => (
            <li key={row.id} className="portal-registration-status-item portal-documents-upload-row">
              <div>
                <p className="portal-registration-status-label">{t(row.labelKey)}</p>
                <p className="portal-registration-status-value portal-documents-upload-detail">
                  {t(row.detailKey)}
                </p>
              </div>
              <span className={statusClass(row.statusKind)}>
                {t(statusLabelKey(row.statusKind))}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="portal-documents-upload-cta" aria-labelledby="upload-cta-heading">
        <h3 id="upload-cta-heading" className="portal-documents-upload-cta-title">
          {t('documentsUploadCtaTitle')}
        </h3>
        <p className="portal-documents-upload-cta-desc">{t('documentsUploadCtaDesc')}</p>
        <div className="portal-documents-upload-cta-actions">
          <button type="button" className="portal-btn portal-btn--primary" disabled>
            {t('documentsUploadNewDocument')}
          </button>
          <button type="button" className="portal-btn portal-btn--secondary" disabled>
            {t('documentsUploadViewHistory')}
          </button>
        </div>
        <p className="portal-documents-upload-cta-note">{t('documentsUploadCtaNote')}</p>
      </section>
    </main>
  )
}

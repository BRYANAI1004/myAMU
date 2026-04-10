import { useMemo } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import type { StudentPortalKey } from '@/lib/i18n'

type FormRow = {
  id: string
  titleKey: StudentPortalKey
  officeKey: StudentPortalKey
  descriptionKey: StudentPortalKey
  actionLabelKey: StudentPortalKey
}

function FormSection({
  headingId,
  title,
  forms,
  t,
}: {
  headingId: string
  title: string
  forms: readonly FormRow[]
  t: (key: StudentPortalKey) => string
}) {
  return (
    <section className="portal-module-panel portal-documents-panel-stack" aria-labelledby={headingId}>
      <h3 id={headingId} className="portal-documents-section-heading">
        {title}
      </h3>
      <ul className="portal-documents-item-list">
        {forms.map((f) => (
          <li key={f.id} className="portal-documents-item portal-documents-item--forms">
            <div className="portal-documents-item-main">
              <p className="portal-documents-item-title">{t(f.titleKey)}</p>
              <p className="portal-documents-item-office">{t(f.officeKey)}</p>
              <p className="portal-documents-item-desc">{t(f.descriptionKey)}</p>
            </div>
            <button type="button" className="portal-btn portal-btn--secondary portal-btn--compact">
              {t(f.actionLabelKey)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function DocumentsFormsPage() {
  const t = useStudentPortalT()

  const registration = useMemo(
    (): readonly FormRow[] => [
      {
        id: 'reg-add-drop',
        titleKey: 'documentsFormRegAddDropTitle',
        officeKey: 'documentsFormRegAddDropOffice',
        descriptionKey: 'documentsFormRegAddDropDesc',
        actionLabelKey: 'documentsFormOpenForm',
      },
      {
        id: 'reg-leave',
        titleKey: 'documentsFormRegLeaveTitle',
        officeKey: 'documentsFormRegAddDropOffice',
        descriptionKey: 'documentsFormRegLeaveDesc',
        actionLabelKey: 'documentsFormDownload',
      },
    ],
    [],
  )

  const financial = useMemo(
    (): readonly FormRow[] => [
      {
        id: 'fin-plan',
        titleKey: 'documentsFormFinPlanTitle',
        officeKey: 'documentsFormFinPlanOffice',
        descriptionKey: 'documentsFormFinPlanDesc',
        actionLabelKey: 'documentsFormOpenForm',
      },
      {
        id: 'fin-aid',
        titleKey: 'documentsFormFinAidTitle',
        officeKey: 'documentsFormFinAidOffice',
        descriptionKey: 'documentsFormFinAidDesc',
        actionLabelKey: 'documentsFormDownload',
      },
    ],
    [],
  )

  const clinical = useMemo(
    (): readonly FormRow[] => [
      {
        id: 'clin-site',
        titleKey: 'documentsFormClinSiteTitle',
        officeKey: 'documentsFormClinSiteOffice',
        descriptionKey: 'documentsFormClinSiteDesc',
        actionLabelKey: 'documentsFormOpenForm',
      },
      {
        id: 'clin-incident',
        titleKey: 'documentsFormClinIncidentTitle',
        officeKey: 'documentsFormClinSiteOffice',
        descriptionKey: 'documentsFormClinIncidentDesc',
        actionLabelKey: 'documentsFormDownload',
      },
    ],
    [],
  )

  const general = useMemo(
    (): readonly FormRow[] => [
      {
        id: 'gen-name',
        titleKey: 'documentsFormGenNameTitle',
        officeKey: 'documentsFormGenNameOffice',
        descriptionKey: 'documentsFormGenNameDesc',
        actionLabelKey: 'documentsFormDownload',
      },
      {
        id: 'gen-address',
        titleKey: 'documentsFormGenAddressTitle',
        officeKey: 'documentsFormGenNameOffice',
        descriptionKey: 'documentsFormGenAddressDesc',
        actionLabelKey: 'documentsFormOpenForm',
      },
    ],
    [],
  )

  return (
    <main className="portal-page portal-documents-page-stack">
      <h2 className="portal-section-heading">{t('documentsFormsPageHeading')}</h2>
      <p className="portal-page-lede">{t('documentsFormsLede')}</p>
      <FormSection
        headingId="forms-reg-heading"
        title={t('documentsFormsSectionRegistration')}
        forms={registration}
        t={t}
      />
      <FormSection
        headingId="forms-fin-heading"
        title={t('documentsFormsSectionFinancial')}
        forms={financial}
        t={t}
      />
      <FormSection
        headingId="forms-clin-heading"
        title={t('documentsFormsSectionClinical')}
        forms={clinical}
        t={t}
      />
      <FormSection
        headingId="forms-gen-heading"
        title={t('documentsFormsSectionGeneral')}
        forms={general}
        t={t}
      />
      <p className="portal-inline-note portal-inline-note--flush">{t('documentsFormsFooter')}</p>
    </main>
  )
}

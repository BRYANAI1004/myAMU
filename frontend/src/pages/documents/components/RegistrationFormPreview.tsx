import { useStudentPortalT } from '@/LanguageContext'
import type { RegistrationFormViewModel } from '../../../lib/registrationFormAdapter'
import { RegistrationClinicTable } from './RegistrationClinicTable'
import { RegistrationDidacticTable } from './RegistrationDidacticTable'
import { RegistrationOfficeUseOnly } from './RegistrationOfficeUseOnly'
import { RegistrationSignatureBlock } from './RegistrationSignatureBlock'

type Props = {
  model: RegistrationFormViewModel
}

export function RegistrationFormPreview({ model }: Props) {
  const t = useStudentPortalT()
  const { student } = model

  return (
    <article
      className="portal-registration-form-sheet"
      aria-label={t('documentsRegistrationFormPreviewAria')}
    >
      <header className="portal-registration-form-sheet__masthead">
        <p className="portal-registration-form-sheet__school">{t('documentsRegFormSchoolLine')}</p>
        <p className="portal-registration-form-sheet__office">{t('documentsRegFormOfficeAddressLine')}</p>
        <p className="portal-registration-form-sheet__contact">{t('documentsRegFormContactLine')}</p>
      </header>

      <h2 className="portal-registration-form-sheet__doc-title">{t('documentsRegFormDocTitle')}</h2>

      <div className="portal-registration-form-sheet__student-grid">
        <dl className="portal-registration-form-sheet__dl">
          <div>
            <dt>{t('documentsRegFormDtName')}</dt>
            <dd>{student.name}</dd>
          </div>
          <div>
            <dt>{t('documentsRegFormDtAddress')}</dt>
            <dd>{student.address}</dd>
          </div>
          <div>
            <dt>{t('documentsRegFormDtEmail')}</dt>
            <dd>{student.email}</dd>
          </div>
          <div>
            <dt>{t('documentsRegFormDtRegistrationQuarter')}</dt>
            <dd>{student.registrationQuarter}</dd>
          </div>
        </dl>
        <dl className="portal-registration-form-sheet__dl">
          <div>
            <dt>{t('documentsRegFormDtStudentId')}</dt>
            <dd>{student.studentId}</dd>
          </div>
          <div>
            <dt>{t('documentsRegFormDtContactPhone')}</dt>
            <dd>{student.contactPhone}</dd>
          </div>
        </dl>
      </div>

      <section
        className="portal-registration-form-sheet__section"
        aria-label={t('documentsRegFormAriaDidactic')}
      >
        <RegistrationDidacticTable rows={model.didactic} totalUnits={model.totalUnits} />
      </section>

      <section
        className="portal-registration-form-sheet__section"
        aria-label={t('documentsRegFormAriaClinic')}
      >
        <RegistrationClinicTable rows={model.clinic} totalHours={model.totalHours} />
      </section>

      <div className="portal-registration-form-sheet__confirm">
        <p>{t('documentsRegFormConfirmEn')}</p>
        <p lang="zh-Hant">{t('documentsRegFormConfirmZh')}</p>
        <label className="portal-registration-form-sheet__check">
          <input type="checkbox" disabled />
          <span>{t('documentsRegFormCheckboxPlaceholder')}</span>
        </label>
        <label className="portal-registration-form-sheet__check">
          <input type="checkbox" disabled />
          <span>{t('documentsRegFormCheckboxPlaceholder')}</span>
        </label>
      </div>

      <RegistrationSignatureBlock />

      <RegistrationOfficeUseOnly fees={model.office} />

      <div className="portal-registration-form-sheet__print-actions portal-academics-print-hide">
        <button
          type="button"
          className="portal-btn portal-btn--secondary"
          onClick={() => window.print()}
        >
          {t('documentsRegFormPrintButton')}
        </button>
      </div>
    </article>
  )
}

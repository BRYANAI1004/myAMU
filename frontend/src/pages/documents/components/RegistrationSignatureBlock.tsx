import { useStudentPortalT } from '@/LanguageContext'

export function RegistrationSignatureBlock() {
  const t = useStudentPortalT()
  return (
    <div className="portal-registration-form-signatures">
      <div className="portal-registration-form-signatures__row">
        <span>{t('documentsRegFormStudentSignature')}</span>
        <span className="portal-registration-form-signatures__line" aria-hidden="true" />
        <span>{t('documentsRegFormDateLabel')}</span>
        <span className="portal-registration-form-signatures__line portal-registration-form-signatures__line--short" aria-hidden="true" />
      </div>
      <div className="portal-registration-form-signatures__row">
        <span>{t('documentsRegFormClinicDirectorSignature')}</span>
        <span className="portal-registration-form-signatures__line" aria-hidden="true" />
        <span>{t('documentsRegFormDateLabel')}</span>
        <span className="portal-registration-form-signatures__line portal-registration-form-signatures__line--short" aria-hidden="true" />
      </div>
      <div className="portal-registration-form-signatures__row">
        <span>{t('documentsRegFormRegistrarSignature')}</span>
        <span className="portal-registration-form-signatures__line" aria-hidden="true" />
        <span>{t('documentsRegFormDateLabel')}</span>
        <span className="portal-registration-form-signatures__line portal-registration-form-signatures__line--short" aria-hidden="true" />
      </div>
    </div>
  )
}

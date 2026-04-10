import { useStudentPortalT } from '@/LanguageContext'

export function RegistrationFormPage() {
  const t = useStudentPortalT()
  return (
    <main className="portal-page">
      <p className="portal-page-lede">{t('registrationFormPageLede')}</p>
      <section className="portal-card portal-stack" aria-labelledby="registration-form-heading">
        <h2 id="registration-form-heading" className="portal-section-heading">
          {t('registrationFormSectionTitle')}
        </h2>
        <div className="portal-actions">
          <button type="button" className="portal-btn portal-btn--primary">
            {t('registrationFormDownloadBtn')}
          </button>
          <button type="button" className="portal-btn portal-btn--secondary" disabled>
            {t('registrationFormEsignSoon')}
          </button>
        </div>
        <p className="portal-inline-note portal-inline-note--flush">{t('registrationFormButtonsNote')}</p>
        <div className="portal-registration-placeholder" role="status">
          {t('registrationFormUploadZonePlaceholder')}
        </div>
      </section>
    </main>
  )
}

import { useStudentPortalT } from '@/LanguageContext'
import type { RegistrationOfficeFees } from '../../../lib/registrationFormAdapter'

type Props = {
  fees: RegistrationOfficeFees
}

function money(n: number): string {
  if (!Number.isFinite(n)) return '0.00'
  return n.toFixed(2)
}

export function RegistrationOfficeUseOnly({ fees }: Props) {
  const t = useStudentPortalT()
  return (
    <section className="portal-registration-form-office" aria-label={t('documentsRegFormOfficeAria')}>
      <h3 className="portal-registration-form-office__title">{t('documentsRegFormOfficeTitle')}</h3>
      <div className="portal-registration-form-office__grid">
        <div className="portal-registration-form-office__col">
          <p className="portal-registration-form-office__label">{t('documentsRegFormFeesHeading')}</p>
          <ul className="portal-registration-form-office__list">
            <li>
              <span>{t('documentsRegFormTuition')}</span>
              <span>{money(fees.tuition)}</span>
            </li>
            <li>
              <span>{t('documentsRegFormClinicInsurances')}</span>
              <span>{money(0)}</span>
            </li>
            <li>
              <span>{t('documentsRegFormOthers')}</span>
              <span>{money(fees.other)}</span>
            </li>
            <li>
              <span>{t('documentsRegFormApplicationFee')}</span>
              <span>{money(fees.applicationFee)}</span>
            </li>
            <li>
              <span>{t('documentsRegFormDiscount')}</span>
              <span>{money(fees.discount)}</span>
            </li>
          </ul>
        </div>
        <div className="portal-registration-form-office__col">
          <p className="portal-registration-form-office__label">&nbsp;</p>
          <ul className="portal-registration-form-office__list">
            <li>
              <span>{t('documentsRegFormRegistration')}</span>
              <span>{money(fees.registration)}</span>
            </li>
            <li>
              <span>{t('documentsRegFormClinic')}</span>
              <span>{money(fees.clinic)}</span>
            </li>
            <li>
              <span>{t('documentsRegFormTotalFees')}</span>
              <span>{money(fees.totalFees)}</span>
            </li>
          </ul>
        </div>
        <div className="portal-registration-form-office__col">
          <p className="portal-registration-form-office__label">{t('documentsRegFormPaymentHeading')}</p>
          <ul className="portal-registration-form-office__list">
            <li>
              <span>{t('documentsRegFormPaymentReceived')}</span>
              <span>{money(0)}</span>
            </li>
            <li>
              <span>{t('documentsRegFormDateLabel')}</span>
              <span>—</span>
            </li>
            <li>
              <span>{t('documentsRegFormReceiptNumber')}</span>
              <span>—</span>
            </li>
            <li>
              <span>{t('documentsRegFormHandledBy')}</span>
              <span>—</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

import { useStudentPortalT } from '@/LanguageContext'
import {
  REGISTRATION_QUARTERS,
  type RegistrationQuarter,
} from '../../../data/registrationFormTerms'

type RegistrationFormFiltersProps = {
  years: number[]
  year: number
  quarter: RegistrationQuarter
  onYearChange: (y: number) => void
  onQuarterChange: (q: RegistrationQuarter) => void
  onGenerate: () => void
  busy?: boolean
}

export function RegistrationFormFilters({
  years,
  year,
  quarter,
  onYearChange,
  onQuarterChange,
  onGenerate,
  busy,
}: RegistrationFormFiltersProps) {
  const t = useStudentPortalT()
  return (
    <div className="portal-registration-form-filters portal-academics-print-hide">
      <label className="portal-registration-form-filters__field">
        <span className="portal-registration-form-filters__label">{t('documentsRegistrationYear')}</span>
        <select
          className="portal-account-ledger__select"
          value={String(year)}
          onChange={(e) => onYearChange(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className="portal-registration-form-filters__field">
        <span className="portal-registration-form-filters__label">{t('documentsQuarter')}</span>
        <select
          className="portal-account-ledger__select"
          value={quarter}
          onChange={(e) =>
            onQuarterChange(e.target.value as RegistrationQuarter)
          }
        >
          {REGISTRATION_QUARTERS.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </label>
      <div className="portal-registration-form-filters__actions">
        <button
          type="button"
          className="portal-registration-form-filters__generate"
          onClick={onGenerate}
          disabled={busy}
        >
          {busy ? t('loadingEllipsis') : t('documentsRegFormGenerate')}
        </button>
      </div>
    </div>
  )
}

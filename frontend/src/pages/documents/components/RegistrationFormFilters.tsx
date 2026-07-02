import { useStudentPortalT } from '@/LanguageContext'
import type { RegistrationTermOption } from '../../../data/registrationFormTerms'

type RegistrationFormFiltersProps = {
  terms: RegistrationTermOption[]
  termKey: string
  onTermChange: (key: string) => void
  onGenerate: () => void
  busy?: boolean
}

export function RegistrationFormFilters({
  terms,
  termKey,
  onTermChange,
  onGenerate,
  busy,
}: RegistrationFormFiltersProps) {
  const t = useStudentPortalT()
  return (
    <div className="portal-registration-form-filters portal-academics-print-hide">
      <label className="portal-registration-form-filters__field portal-registration-form-filters__field--term">
        <span className="portal-registration-form-filters__label">{t('documentsTerm')}</span>
        <select
          className="portal-account-ledger__select"
          value={termKey}
          onChange={(e) => onTermChange(e.target.value)}
        >
          {terms.map((term) => (
            <option key={term.key} value={term.key}>
              {term.label}
            </option>
          ))}
        </select>
      </label>
      <div className="portal-registration-form-filters__actions">
        <button
          type="button"
          className="portal-btn portal-btn--secondary"
          onClick={onGenerate}
          disabled={busy}
        >
          {busy ? t('loadingEllipsis') : t('documentsRegFormGenerate')}
        </button>
      </div>
    </div>
  )
}

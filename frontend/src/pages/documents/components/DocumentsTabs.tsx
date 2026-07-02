import { useStudentPortalT } from '@/LanguageContext'
import { portalPillTabClass } from '@/lib/portalPillTabClass'

export type DocumentsTabId = 'registration' | 'quiz' | 'agreements'

type DocumentsTabsProps = {
  active: DocumentsTabId
  onChange: (id: DocumentsTabId) => void
}

const TAB_IDS: { id: DocumentsTabId; labelKey: 'documentsTabRegistrationForms' | 'documentsTabQuiz' | 'documentsTabsAgreements' }[] = [
  { id: 'registration', labelKey: 'documentsTabRegistrationForms' },
  { id: 'quiz', labelKey: 'documentsTabQuiz' },
  { id: 'agreements', labelKey: 'documentsTabsAgreements' },
]

export function DocumentsTabs({ active, onChange }: DocumentsTabsProps) {
  const t = useStudentPortalT()

  return (
    <div
      className="portal-academics-print-hide"
      role="tablist"
      aria-label={t('documentsTabsSectionsAria')}
    >
      <div className="portal-tab-group portal-academics-portal-tabs">
        {TAB_IDS.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
              className={portalPillTabClass(active === id)}
            onClick={() => onChange(id)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}

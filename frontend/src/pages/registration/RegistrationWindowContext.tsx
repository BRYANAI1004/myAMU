import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useLanguage, useStudentPortalT } from '@/LanguageContext'
import type { AcademicTerm } from '../../lib/api'
import {
  formatRegistrationWindowDate,
  getRegistrationWindowStatus,
  isRegistrationWindowOpen,
  registrationTermDisplayLabel,
  type RegistrationWindowStatus,
} from '../../lib/registrationWindow'
import { useStudentPortalTerm } from '../../context/StudentPortalTermContext'

type RegistrationWindowContextValue = {
  term: AcademicTerm | null
  status: RegistrationWindowStatus
  isOpen: boolean
  bannerTitle: string | null
  bannerDetail: string | null
}

const RegistrationWindowContext =
  createContext<RegistrationWindowContextValue | null>(null)

type RegistrationWindowProviderProps = {
  registrationTermId: string
  children: ReactNode
}

export function RegistrationWindowProvider({
  registrationTermId,
  children,
}: RegistrationWindowProviderProps) {
  const t = useStudentPortalT()
  const { locale } = useLanguage()
  const { terms } = useStudentPortalTerm()

  const term = useMemo(() => {
    const id = registrationTermId.trim()
    if (id === '') return null
    return terms.find((row) => row.id === id) ?? null
  }, [registrationTermId, terms])

  const status = useMemo(() => getRegistrationWindowStatus(term), [term])
  const isOpen = useMemo(() => isRegistrationWindowOpen(term), [term])

  const bannerCopy = useMemo(() => {
    if (term == null || status === 'open') {
      return { bannerTitle: null, bannerDetail: null }
    }
    const termLabel = registrationTermDisplayLabel(term)
    if (status === 'closed') {
      return {
        bannerTitle: t('registrationWindowClosedTitle'),
        bannerDetail: t('registrationWindowClosedDetail')
          .replace('{term}', termLabel)
          .replace(
            '{date}',
            formatRegistrationWindowDate(term.registration_close, locale),
          ),
      }
    }
    return {
      bannerTitle: t('registrationWindowNotOpenTitle'),
      bannerDetail: t('registrationWindowNotOpenDetail')
        .replace('{term}', termLabel)
        .replace(
          '{date}',
          formatRegistrationWindowDate(term.registration_open, locale),
        ),
    }
  }, [locale, status, t, term])

  const value = useMemo(
    (): RegistrationWindowContextValue => ({
      term,
      status,
      isOpen,
      bannerTitle: bannerCopy.bannerTitle,
      bannerDetail: bannerCopy.bannerDetail,
    }),
    [bannerCopy.bannerDetail, bannerCopy.bannerTitle, isOpen, status, term],
  )

  return (
    <RegistrationWindowContext.Provider value={value}>
      {children}
    </RegistrationWindowContext.Provider>
  )
}

export function useRegistrationWindow(): RegistrationWindowContextValue {
  const ctx = useContext(RegistrationWindowContext)
  if (ctx == null) {
    throw new Error(
      'useRegistrationWindow must be used within RegistrationWindowProvider',
    )
  }
  return ctx
}

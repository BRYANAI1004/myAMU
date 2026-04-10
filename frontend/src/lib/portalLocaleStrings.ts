import type { PortalLocale } from '@/LanguageContext'

/** Minimal student-portal copy for locale toggle verification (not full i18n). */
const STRINGS: Record<
  PortalLocale,
  {
    registrationModule: string
    logout: string
  }
> = {
  en: {
    registrationModule: 'Registration',
    logout: 'Logout',
  },
  zh: {
    registrationModule: '選課註冊',
    logout: '登出',
  },
}

export function portalStudentLabel(locale: PortalLocale, key: keyof typeof STRINGS.en): string {
  return STRINGS[locale][key]
}

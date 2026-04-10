/**
 * @deprecated Use {@link useStudentPortalT} from `@/LanguageContext` or {@link t} from `@/lib/i18n`.
 */
import type { PortalLocale } from '@/lib/i18n'
import { t } from '@/lib/i18n'

export function portalStudentLabel(
  locale: PortalLocale,
  key: 'registrationModule' | 'logout',
): string {
  return t(locale, key)
}

import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  Award,
  BadgeCheck,
  BookOpen,
  CircleDollarSign,
  ClipboardList,
  Stethoscope,
  Clock,
  Copy,
  FileText,
  FlaskConical,
  Globe2,
  GraduationCap,
  IdCard,
  Leaf,
  ListPlus,
  Mail,
  RefreshCw,
  RotateCcw,
  ScrollText,
  UserRoundPlus,
} from 'lucide-react'

/** Lucide icon per store SKU — matched to fee meaning for quick scanning. */
const STORE_FEE_ICON_BY_CODE: Record<string, LucideIcon> = {
  graduation_evaluation: GraduationCap,
  institutional_exam: ClipboardList,
  makeup_exam: RotateCcw,
  independent_study: BookOpen,
  transfer_evaluation: ArrowLeftRight,
  application_fee: FileText,
  i20_application: Globe2,
  non_matriculating_application: UserRoundPlus,
  official_transcript: ScrollText,
  certificate_attendance: BadgeCheck,
  certificate_graduation: Award,
  diploma_copy: Copy,
  id_card: IdCard,
  abroad_mailing: Mail,
  lab_coat: FlaskConical,
  herbal_education_box: Leaf,
  i20_reissue: RefreshCw,
  late_registration: Clock,
  add_drop_fee: ListPlus,
  credit_unit_topup: CircleDollarSign,
  clinical_hour_topup: Stethoscope,
}

const DEFAULT_ICON = FileText

export function getStoreFeeIcon(code: string): LucideIcon {
  return STORE_FEE_ICON_BY_CODE[code.trim()] ?? DEFAULT_ICON
}

type StoreFeeIconProps = {
  code: string
  className?: string
  size?: number
}

/** Rounded badge icon for catalog product cards. */
export function StoreFeeIcon({ code, className, size = 17 }: StoreFeeIconProps) {
  const Icon = getStoreFeeIcon(code)
  return (
    <span
      className={['portal-store-product__icon', className].filter(Boolean).join(' ')}
      aria-hidden
    >
      <Icon size={size} strokeWidth={1.75} />
    </span>
  )
}

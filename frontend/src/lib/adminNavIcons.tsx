import type { LucideIcon } from 'lucide-react'
import {
  Calculator,
  CircleDollarSign,
  GraduationCap,
  LayoutGrid,
  Mail,
  NotebookText,
  Settings,
  Stethoscope,
  Users,
} from 'lucide-react'
import type { AdminModuleKey } from './adminAccess'

export const ADMIN_MODULE_ICONS: Record<AdminModuleKey, LucideIcon> = {
  students: Users,
  clinical: Stethoscope,
  courses: GraduationCap,
  academic_terms: Calculator,
  course_sections: LayoutGrid,
  scheduling_timetable: NotebookText,
  finance: CircleDollarSign,
  mass_email: Mail,
  settings: Settings,
}

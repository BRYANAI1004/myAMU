export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'teacher'
  | 'clinical_teacher'
  | 'clinical_admin'

const ADMIN_ROLE_SET: ReadonlySet<string> = new Set<AdminRole>([
  'super_admin',
  'admin',
  'teacher',
  'clinical_teacher',
  'clinical_admin',
])

export function isAdminRole(value: string): value is AdminRole {
  return ADMIN_ROLE_SET.has(value)
}

export type AdminModuleKey =
  | 'students'
  | 'clinical'
  | 'courses'
  | 'academic_terms'
  | 'course_sections'
  | 'scheduling_timetable'
  | 'feedback'
  | 'finance'
  | 'mass_email'
  | 'settings'

export type AdminModuleDefinition = {
  key: AdminModuleKey
  label: string
  path: string
  end?: boolean
  schedulingContext?: boolean
  /** Pinned to the bottom of the admin sidebar (e.g. Setting). */
  footer?: boolean
}

export const ADMIN_MODULES: readonly AdminModuleDefinition[] = [
  { key: 'students', label: 'Students', path: '/admin/students' },
  { key: 'clinical', label: 'Clinical', path: '/admin/clinical' },
  { key: 'courses', label: 'Courses', path: '/admin/courses' },
  { key: 'academic_terms', label: 'Academic Terms', path: '/admin/academic-terms' },
  {
    key: 'course_sections',
    label: 'Course Sections',
    path: '/admin/course-sections',
    end: true,
    schedulingContext: true,
  },
  {
    key: 'scheduling_timetable',
    label: 'Timetable',
    path: '/admin/course-sections/timetable',
    schedulingContext: true,
  },
  { key: 'feedback', label: 'Feedback', path: '/admin/feedback' },
  { key: 'finance', label: 'Finance', path: '/admin/finance' },
  { key: 'mass_email', label: 'Mass Email', path: '/admin/mass-email' },
  { key: 'settings', label: 'Setting', path: '/admin/settings', end: true, footer: true },
] as const

export const ADMIN_MAIN_MODULES = ADMIN_MODULES.filter((module) => !module.footer)
export const ADMIN_FOOTER_MODULES = ADMIN_MODULES.filter((module) => module.footer)

const ALL_ADMIN_MODULE_KEYS: readonly AdminModuleKey[] = ADMIN_MODULES.map(
  (module) => module.key,
)

const ROLE_MODULE_ACCESS: Record<AdminRole, readonly AdminModuleKey[]> = {
  super_admin: ALL_ADMIN_MODULE_KEYS,
  admin: ALL_ADMIN_MODULE_KEYS,
  teacher: ['courses', 'course_sections', 'scheduling_timetable', 'feedback'],
  clinical_teacher: ['clinical', 'finance'],
  clinical_admin: ['students', 'clinical', 'finance', 'mass_email'],
}

export function getAllowedAdminModules(role: AdminRole): readonly AdminModuleKey[] {
  return ROLE_MODULE_ACCESS[role]
}

export function hasAdminModuleAccess(role: AdminRole, module: AdminModuleKey): boolean {
  return ROLE_MODULE_ACCESS[role].includes(module)
}

export function getFirstAccessibleAdminPath(role: AdminRole): string {
  const firstModule = ADMIN_MODULES.find((module) => hasAdminModuleAccess(role, module.key))
  return firstModule?.path ?? '/admin/students'
}

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super administrator',
  admin: 'Administrator',
  teacher: 'Teacher',
  clinical_teacher: 'Clinical teacher',
  clinical_admin: 'Clinical administrator',
}

export function formatAdminRoleLabel(role: AdminRole): string {
  return ADMIN_ROLE_LABELS[role] ?? role
}

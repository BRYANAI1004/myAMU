/** Static mock data for the portal homepage — replace with API integration later. */

export type DashboardService = {
  to: string
  icon: 'registration' | 'finances' | 'academics' | 'clinical' | 'documents' | 'account'
}

export const DASHBOARD_SERVICES: DashboardService[] = [
  { to: '/registration', icon: 'registration' },
  { to: '/finances', icon: 'finances' },
  { to: '/academics', icon: 'academics' },
  { to: '/registration/clinical/schedule?section=clinical', icon: 'clinical' },
  { to: '/documents', icon: 'documents' },
  { to: '/profile', icon: 'account' },
]

export type DashboardCourse = {
  id: string
  code: string
  title: string
  credits: number
  section: string
  schedule: string
  location: string
}

/** Static weekly blocks for the dashboard timetable view (Mon–Fri). */
export type WeeklyTimetableBlock = {
  code: string
  /** Kept for accessibility (e.g. aria-label); not shown in the week grid. */
  time: string
  /** Minutes since midnight (start of session). */
  startMinutes: number
  /** Minutes since midnight (end of session). */
  endMinutes: number
  /** Short title or room — shown under the course code when set. */
  subtitle?: string
}

export const DASHBOARD_WEEKLY_TIMETABLE_MOCK: Record<
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday',
  WeeklyTimetableBlock[]
> = {
  monday: [
    {
      code: 'BIOC 510',
      time: '9:00 AM – 10:50 AM',
      startMinutes: 9 * 60,
      endMinutes: 10 * 60 + 50,
      subtitle: 'Biochemistry I',
    },
    {
      code: 'ICM 501',
      time: '11:00 AM – 12:15 PM',
      startMinutes: 11 * 60,
      endMinutes: 12 * 60 + 15,
      subtitle: 'HSB 112',
    },
    {
      code: 'ANAT 520L',
      time: '1:00 PM – 3:50 PM',
      startMinutes: 13 * 60,
      endMinutes: 15 * 60 + 50,
      subtitle: 'Anatomy Lab',
    },
    {
      code: 'ETHM 505',
      time: '4:30 PM – 5:45 PM',
      startMinutes: 16 * 60 + 30,
      endMinutes: 17 * 60 + 45,
      subtitle: 'Virtual',
    },
  ],
  tuesday: [
    {
      code: 'PHYS 515',
      time: '8:00 AM – 9:50 AM',
      startMinutes: 8 * 60,
      endMinutes: 9 * 60 + 50,
      subtitle: 'BMS 145',
    },
  ],
  wednesday: [
    {
      code: 'BIOC 510',
      time: '9:00 AM – 10:50 AM',
      startMinutes: 9 * 60,
      endMinutes: 10 * 60 + 50,
      subtitle: 'Biochemistry I',
    },
    {
      code: 'ANAT 520L',
      time: '1:00 PM – 3:50 PM',
      startMinutes: 13 * 60,
      endMinutes: 15 * 60 + 50,
      subtitle: 'Anatomy Lab',
    },
  ],
  thursday: [
    {
      code: 'PHYS 515',
      time: '8:00 AM – 9:50 AM',
      startMinutes: 8 * 60,
      endMinutes: 9 * 60 + 50,
      subtitle: 'BMS 145',
    },
  ],
  friday: [],
}

export const DASHBOARD_COURSES_MOCK: DashboardCourse[] = [
  {
    id: 'c1',
    code: 'BIOC 510',
    title: 'Biochemistry I',
    credits: 4,
    section: '001 — Lecture',
    schedule: 'Mon & Wed, 9:00 AM – 10:50 AM',
    location: 'Science Hall 204',
  },
  {
    id: 'c2',
    code: 'ICM 501',
    title: 'Introduction to Clinical Medicine',
    credits: 5,
    section: '002 — Lecture / Small group',
    schedule: 'Mon, 11:00 AM – 12:15 PM',
    location: 'Health Sciences Bldg 112',
  },
  {
    id: 'c3',
    code: 'ANAT 520L',
    title: 'Gross Anatomy — Laboratory',
    credits: 2,
    section: '001 — Lab',
    schedule: 'Mon & Wed, 1:00 PM – 3:50 PM',
    location: 'Anatomy Lab Suite',
  },
  {
    id: 'c4',
    code: 'PHYS 515',
    title: 'Physiology',
    credits: 4,
    section: '001 — Lecture',
    schedule: 'Tue & Thu, 8:00 AM – 9:50 AM',
    location: 'Biomedical Sciences 145',
  },
  {
    id: 'c5',
    code: 'ETHM 505',
    title: 'Ethics in Medicine',
    credits: 2,
    section: '001 — Seminar',
    schedule: 'Mon, 4:30 PM – 5:45 PM',
    location: 'Virtual (synchronous)',
  },
]

export type DashboardImportantDate = {
  dayMonth: string
  label: string
}

export const DASHBOARD_IMPORTANT_DATES_MOCK: DashboardImportantDate[] = [
  { dayMonth: 'Apr 4', label: 'Spring holiday' },
  { dayMonth: 'Apr 8', label: 'Biochemistry Exam I' },
  { dayMonth: 'Apr 15', label: 'Registration opens' },
  { dayMonth: 'Apr 22', label: 'Anatomy practical review' },
]

export const DASHBOARD_ACCOUNT_SUMMARY_MOCK = {
  currentBalance: '$1,248.50',
  nextPaymentDue: 'Apr 10 — $450.00',
  holds: 'None',
} as const


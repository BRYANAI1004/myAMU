export type CatalogPrefixGroup = {
  id: string
  /** Primary code letters shown in the nav, e.g. BS */
  codeLabel: string
  title: string
  /** Two-letter (or longer) course-code prefixes in this block */
  prefixes: string[]
  category?: string
}

/** Catalog blocks ordered for admin browsing (matches registrar code families). */
export const CATALOG_PREFIX_GROUPS: CatalogPrefixGroup[] = [
  {
    id: 'bs',
    codeLabel: 'BS',
    title: 'Basic Science',
    prefixes: ['BS'],
    category: 'A',
  },
  {
    id: 'om',
    codeLabel: 'OM',
    title: 'Traditional Chinese Medicine',
    prefixes: ['OM'],
    category: 'B',
  },
  {
    id: 'ac',
    codeLabel: 'AC',
    title: 'Acupuncture & Moxibustion',
    prefixes: ['AC'],
    category: 'C',
  },
  {
    id: 'hb',
    codeLabel: 'HB',
    title: 'Herbology',
    prefixes: ['HB'],
    category: 'D',
  },
  {
    id: 'tb',
    codeLabel: 'TB',
    title: 'Qi Gong & TCM Exercise',
    prefixes: ['TB'],
    category: 'E',
  },
  {
    id: 'cm',
    codeLabel: 'CM',
    title: 'Case Management',
    prefixes: ['CM'],
    category: 'F',
  },
  {
    id: 'west',
    codeLabel: 'WM',
    title: 'Clinical Medicine & Diagnosis',
    prefixes: ['WM', 'PD', 'SB', 'SD'],
    category: 'G',
  },
  {
    id: 'mg',
    codeLabel: 'MG',
    title: 'Practice Management',
    prefixes: ['MG'],
    category: 'H',
  },
  {
    id: 'ph',
    codeLabel: 'PH',
    title: 'Public Health',
    prefixes: ['PH'],
    category: 'I',
  },
  {
    id: 'prof',
    codeLabel: 'RM',
    title: 'Professional Development & Review',
    prefixes: ['RM', 'IS', 'CR'],
    category: 'J',
  },
  {
    id: 'cl',
    codeLabel: 'CL',
    title: 'Clinical Practice',
    prefixes: ['CL'],
    category: 'L',
  },
  {
    id: 'el',
    codeLabel: 'EL',
    title: 'Electives',
    prefixes: ['EL'],
    category: 'M',
  },
  {
    id: 'integrative',
    codeLabel: 'IM',
    title: 'Integrative / DAHM',
    prefixes: ['IM', 'EB', 'IC', 'PR'],
    category: 'D1',
  },
]

export function countForCatalogGroup(
  group: CatalogPrefixGroup,
  byPrefix: Record<string, number>,
): number {
  return group.prefixes.reduce((sum, p) => sum + (byPrefix[p] ?? 0), 0)
}

export function catalogGroupById(id: string): CatalogPrefixGroup | undefined {
  return CATALOG_PREFIX_GROUPS.find((g) => g.id === id)
}

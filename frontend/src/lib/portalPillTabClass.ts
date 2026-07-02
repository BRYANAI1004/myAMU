/** Shared class names for unified pill tab controls (nav links + buttons). */
export function portalPillTabClass(isActive: boolean): string {
  return ['portal-tab', isActive ? 'portal-tab--active' : ''].filter(Boolean).join(' ')
}

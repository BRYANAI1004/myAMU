import { Outlet } from 'react-router-dom'
import { ClinicalNav } from './ClinicalNav'

/** Nested under Registration › Clinical; keeps secondary clinical tabs + page outlet together. */
export function ClinicalModuleShell() {
  return (
    <>
      <ClinicalNav />
      <Outlet />
    </>
  )
}

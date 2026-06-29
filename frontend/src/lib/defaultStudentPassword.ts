/**
 * Default student portal password: given name (from "Last, First") + last 4 of student id.
 * Keep in sync with backend/src/lib/defaultStudentPassword.ts
 */
export function defaultStudentPassword(
  nameRaw: string,
  studentIdRaw: string,
): string {
  const studentId = studentIdRaw.trim()
  const last4 = studentId.slice(-4)
  const trimmedName = nameRaw.trim()
  let namePart = trimmedName
  const commaIdx = trimmedName.indexOf(',')
  if (commaIdx >= 0) {
    const given = trimmedName.slice(commaIdx + 1).trim()
    namePart = given !== '' ? given : trimmedName.slice(0, commaIdx).trim()
  }
  namePart = namePart.replace(/\s+/g, '')
  return `${namePart}${last4}`
}

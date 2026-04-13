export function normalizeOptionalText(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

export function formatPrerequisiteCourseDisplay(params: {
  courseCode?: string | null
  courseTitle?: string | null
}): string | null {
  const code = normalizeOptionalText(params.courseCode)
  const title = normalizeOptionalText(params.courseTitle)
  if (code && title) return `${code} — ${title}`
  if (code) return code
  if (title) return title
  return null
}

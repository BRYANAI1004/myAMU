export type InstructorSuggestionFields = {
  nameEng?: string | null
  nameChi?: string | null
  rawText?: string | null
}

function trimStr(v: string | number | null | undefined): string {
  if (v == null) return ''
  return String(v).trim()
}

/**
 * Stable admin default from resolved instructor fields (not timetable EN/CN track).
 * Priority: English name → Chinese name → raw text (e.g. marks or unparsed id).
 */
export function getPreferredInstructorDisplay(
  suggestion: InstructorSuggestionFields | null | undefined,
): string {
  if (suggestion == null) return ''
  const eng = trimStr(suggestion.nameEng)
  const chi = trimStr(suggestion.nameChi)
  const raw = trimStr(suggestion.rawText)
  if (eng !== '') return eng
  if (chi !== '') return chi
  return raw
}

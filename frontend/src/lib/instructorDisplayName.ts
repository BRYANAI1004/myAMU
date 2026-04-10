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
 * Admin create-section default from resolved instructor fields, ordered by schedule track.
 * CN: Chinese → English → raw. EN: English → Chinese → raw.
 * Returns '' only when suggestion is null or all three values are empty after trim.
 */
export function getPreferredInstructorDisplay(
  suggestion: InstructorSuggestionFields | null | undefined,
  track: 'EN' | 'CN',
): string {
  if (suggestion == null) return ''
  const eng = trimStr(suggestion.nameEng)
  const chi = trimStr(suggestion.nameChi)
  const raw = trimStr(suggestion.rawText)
  if (track === 'CN') {
    if (chi !== '') return chi
    if (eng !== '') return eng
    return raw
  }
  if (eng !== '') return eng
  if (chi !== '') return chi
  return raw
}

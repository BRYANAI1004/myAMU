import { normalizeScheduleTrack } from './courseDisplayName'

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
 * Visible instructor for a timetable track from resolved source fields.
 * EN: English → Chinese → raw. CN: Chinese → English → raw.
 * Does not return empty when only the “other” language is present.
 */
export function getPreferredInstructorDisplay(
  suggestion: InstructorSuggestionFields | null | undefined,
  scheduleTrack: 'EN' | 'CN' | undefined | null,
): string {
  if (suggestion == null) return ''
  const eng = trimStr(suggestion.nameEng)
  const chi = trimStr(suggestion.nameChi)
  const raw = trimStr(suggestion.rawText)
  const track = normalizeScheduleTrack(scheduleTrack)
  if (track === 'CN') {
    if (chi !== '') return chi
    if (eng !== '') return eng
    return raw
  }
  if (eng !== '') return eng
  if (chi !== '') return chi
  return raw
}

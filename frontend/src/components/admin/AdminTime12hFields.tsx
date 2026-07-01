import {
  formatTimeHmsForDisplay,
  inputTimeToApi,
  parseHmsTo12hParts,
  timeToInputValue,
  twelveHourPartsToHhMm,
} from '../../lib/formatScheduleTime'

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1)

const MINUTE_GROUPS = Array.from({ length: 6 }, (_, g) => {
  const start = g * 10
  const end = start + 9
  return {
    label: `:${String(start).padStart(2, '0')}–:${String(end).padStart(2, '0')}`,
    minutes: Array.from({ length: 10 }, (_, i) => start + i),
  }
})

type Layout = 'inline' | 'stacked'

type Props = {
  idPrefix: string
  label: string
  /** `HH:MM` 24h or '' (from `timeToInputValue` / cleared) */
  value: string
  onChange: (hhMm: string) => void
  disabled?: boolean
  /** `stacked` — labeled columns for narrow panels (e.g. course section form) */
  layout?: Layout
}

/**
 * Hour (1–12), minute (0–59), AM/PM. Emits `HH:MM` for `inputTimeToApi`.
 */
export function AdminTime12hFields({
  idPrefix,
  label,
  value,
  onChange,
  disabled,
  layout = 'inline',
}: Props) {
  const fromApi = value.trim() === '' ? null : parseHmsTo12hParts(value)
  const fromInput = value.trim() === '' ? null : parseHmsTo12hParts(timeToInputValue(value))
  const parts = fromApi ?? fromInput

  const hourVal = parts?.hour12 ?? ''
  const minVal = parts?.minute ?? ''
  const apVal = parts == null ? '' : parts.isPm ? 'PM' : 'AM'

  const emit = (h12: number, min: number, ap: 'AM' | 'PM') => {
    onChange(twelveHourPartsToHhMm({ hour12: h12, minute: min, isPm: ap === 'PM' }))
  }

  const previewApi = value.trim() === '' ? null : inputTimeToApi(value)
  const previewText =
    previewApi == null ? null : formatTimeHmsForDisplay(previewApi)

  const emptyLabel = layout === 'stacked' ? '—' : undefined

  const hourSelect = (
    <select
      id={`${idPrefix}-hour`}
      className="admin-input admin-time12h__select admin-time12h__select--hour"
      aria-label={`${label} hour (1–12)`}
      disabled={disabled}
      value={hourVal === '' ? '' : String(hourVal)}
      onChange={(e) => {
        const v = e.target.value
        if (v === '') {
          onChange('')
          return
        }
        const h12 = Number(v)
        if (!Number.isFinite(h12)) return
        const min = minVal === '' ? 0 : Number(minVal) || 0
        const ap = apVal === '' ? 'AM' : (apVal as 'AM' | 'PM')
        emit(h12, min, ap)
      }}
    >
      <option value="">{emptyLabel ?? 'Hour'}</option>
      {HOURS_12.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
  )

  const minuteSelect = (
    <select
      id={`${idPrefix}-min`}
      className="admin-input admin-time12h__select admin-time12h__select--minute"
      aria-label={`${label} minute`}
      disabled={disabled}
      value={minVal === '' ? '' : String(minVal).padStart(2, '0')}
      onChange={(e) => {
        const v = e.target.value
        if (v === '') {
          onChange('')
          return
        }
        const min = Number(v)
        if (!Number.isFinite(min)) return
        const h12 = hourVal === '' ? 12 : Number(hourVal) || 12
        const ap = apVal === '' ? 'AM' : (apVal as 'AM' | 'PM')
        emit(h12, min, ap)
      }}
    >
      <option value="">{emptyLabel ?? 'Min'}</option>
      {MINUTE_GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.minutes.map((m) => (
            <option key={m} value={String(m).padStart(2, '0')}>
              {String(m).padStart(2, '0')}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )

  const apSelect = (
    <select
      id={`${idPrefix}-ap`}
      className="admin-input admin-time12h__select admin-time12h__select--ap"
      aria-label={`${label} AM or PM`}
      disabled={disabled}
      value={apVal}
      onChange={(e) => {
        const v = e.target.value
        if (v !== 'AM' && v !== 'PM') {
          onChange('')
          return
        }
        const h12 = hourVal === '' ? 12 : Number(hourVal) || 12
        const min = minVal === '' ? 0 : Number(minVal) || 0
        emit(h12, min, v)
      }}
    >
      <option value="">{emptyLabel ?? 'AM/PM'}</option>
      <option value="AM">AM</option>
      <option value="PM">PM</option>
    </select>
  )

  return (
    <div className="admin-field">
      <span className="admin-field__label" id={`${idPrefix}-label`}>
        {label}
      </span>
      <div
        className={`admin-time12h${layout === 'stacked' ? ' admin-time12h--stacked' : ''}`}
        role="group"
        aria-labelledby={`${idPrefix}-label`}
      >
        {layout === 'stacked' ? (
          <>
            <label className="admin-time12h__cell">
              <span className="admin-time12h__cell-label">Hour</span>
              {hourSelect}
            </label>
            <label className="admin-time12h__cell">
              <span className="admin-time12h__cell-label">Minute</span>
              {minuteSelect}
            </label>
            <label className="admin-time12h__cell">
              <span className="admin-time12h__cell-label">AM / PM</span>
              {apSelect}
            </label>
          </>
        ) : (
          <>
            {hourSelect}
            <span className="admin-time12h__sep" aria-hidden>
              :
            </span>
            {minuteSelect}
            {apSelect}
          </>
        )}
        {previewText != null && layout === 'inline' && (
          <span className="admin-time12h__preview" aria-live="polite">
            → {previewText}
          </span>
        )}
      </div>
    </div>
  )
}

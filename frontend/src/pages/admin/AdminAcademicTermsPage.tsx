import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createAcademicTerm,
  deleteAcademicTerm,
  fetchAcademicTerms,
  postAcademicTermToDashboard,
  updateAcademicTerm,
  type AcademicTerm,
  type AcademicTermName,
  type AcademicTermStatus,
} from '../../lib/api'
import { useAdminPortalTerm } from '../../context/AdminPortalTermContext'

const TERM_NAMES: AcademicTermName[] = ['Winter', 'Spring', 'Summer', 'Fall']
const STATUSES: AcademicTermStatus[] = [
  'planned',
  'registration_open',
  'in_progress',
  'completed',
]

const STATUS_LABELS: Record<AcademicTermStatus, string> = {
  planned: 'Planned',
  registration_open: 'Registration open',
  in_progress: 'In progress',
  completed: 'Completed',
}

function formatStatusLabel(status: AcademicTermStatus): string {
  return STATUS_LABELS[status] ?? status
}

function statusHintForMeta(status: AcademicTermStatus): string {
  return formatStatusLabel(status)
}

function formatDateRange(open: string | null, close: string | null): string {
  const a = formatTableDate(open)
  const b = formatTableDate(close)
  if (a === '—' && b === '—') return '—'
  if (a === '—') return `Until ${b}`
  if (b === '—') return `From ${a}`
  return `${a} – ${b}`
}

type ModalMode = 'add' | 'edit' | null

type TermForm = {
  year: string
  term_name: AcademicTermName
  sequence_no: string
  term_label: string
  start_date: string
  end_date: string
  registration_open: string
  registration_close: string
  withdraw_deadline: string
  payment_due_date: string
  clinicAppointmentDeadline: string
  status: AcademicTermStatus
  is_visible: boolean
  lock_registration_if_overdue: boolean
}

function emptyToNull(iso: string): string | null {
  const s = iso.trim()
  return s === '' ? null : s
}

function humanizeDateFieldKey(k: string): string {
  if (k === 'clinicAppointmentDeadline') return 'clinic deadline'
  return k.replace(/_/g, ' ')
}

function formatTableDate(iso: string | null): string {
  if (iso == null || iso.trim() === '') return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (m) {
    const [, y, mo, d] = m
    return `${mo}/${d}/${y}`
  }
  return iso
}

function termToForm(t: AcademicTerm): TermForm {
  return {
    year: String(t.year),
    term_name: t.term_name,
    sequence_no: String(t.sequence_no),
    term_label: t.term_label,
    start_date: t.start_date ?? '',
    end_date: t.end_date ?? '',
    registration_open: t.registration_open ?? '',
    registration_close: t.registration_close ?? '',
    withdraw_deadline: t.withdraw_deadline ?? '',
    payment_due_date: t.payment_due_date ?? '',
    clinicAppointmentDeadline: t.clinicAppointmentDeadline ?? '',
    status: t.status,
    is_visible: t.is_visible,
    lock_registration_if_overdue: t.lock_registration_if_overdue,
  }
}

function TermScheduleRow({
  label,
  value,
  sectionStart,
}: {
  label: string
  value: string
  sectionStart?: boolean
}) {
  return (
    <div
      className={[
        'admin-academic-term-card__schedule-row',
        sectionStart ? 'admin-academic-term-card__schedule-row--section-start' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="admin-academic-term-card__schedule-label">{label}</span>
      <span className="admin-academic-term-card__schedule-value">{value}</span>
    </div>
  )
}

function sortTermsForDisplay(terms: AcademicTerm[]): AcademicTerm[] {
  return [...terms].sort((a, b) => {
    if (a.is_posted_to_dashboard !== b.is_posted_to_dashboard) {
      return a.is_posted_to_dashboard ? -1 : 1
    }
    if (a.sequence_no !== b.sequence_no) {
      return b.sequence_no - a.sequence_no
    }
    if (a.year !== b.year) {
      return b.year - a.year
    }
    return a.id.localeCompare(b.id)
  })
}

/** One-at-a-time portal default — drives student dashboard & registration default term. */
function PortalMasterSwitch({
  active,
  busy,
  disabled,
  termLabel,
  onActivate,
}: {
  active: boolean
  busy: boolean
  disabled?: boolean
  termLabel: string
  onActivate: () => void
}) {
  const label = 'Portal default'

  if (active) {
    return (
      <div
        className="admin-academic-term-master admin-academic-term-master--on"
        role="status"
        aria-label={`${termLabel} is the portal default term`}
      >
        <span className="admin-academic-term-master__label">{label}</span>
        <span className="admin-academic-term-master__track" aria-hidden="true">
          <span className="admin-academic-term-master__thumb" />
        </span>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="admin-academic-term-master admin-academic-term-master--off"
      disabled={busy || disabled}
      onClick={onActivate}
      aria-label={`Set ${termLabel} as portal default term`}
      title="Master switch: student portal uses this term for dates, registration, and billing scope"
    >
      <span className="admin-academic-term-master__label">{label}</span>
      <span className="admin-academic-term-master__track" aria-hidden="true">
        <span className="admin-academic-term-master__thumb" />
      </span>
    </button>
  )
}

type TermCardProps = {
  term: AcademicTerm
  postingId: string | null
  deleting: boolean
  onEdit: (term: AcademicTerm) => void
  onPost: (termId: string) => void
  onDelete: (term: AcademicTerm) => void
}

function TermCard({
  term,
  postingId,
  deleting,
  onEdit,
  onPost,
  onDelete,
}: TermCardProps) {
  const posting = postingId === term.id
  const isDefault = term.is_posted_to_dashboard
  const busy = posting || deleting

  return (
    <article
      className={[
        'admin-academic-term-card',
        isDefault ? 'admin-academic-term-card--portal-default' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="admin-academic-term-card__header">
        <div className="admin-academic-term-card__identity">
          <h2 className="admin-academic-term-card__title">{term.term_label}</h2>
          <p className="admin-academic-term-card__meta">
            <code className="admin-code">{term.id}</code>
            <span aria-hidden="true"> · </span>
            {statusHintForMeta(term.status)}
          </p>
        </div>
        <div className="admin-academic-term-card__master">
          <PortalMasterSwitch
            active={isDefault}
            busy={posting}
            disabled={postingId !== null && !posting}
            termLabel={term.term_label}
            onActivate={() => void onPost(term.id)}
          />
        </div>
      </div>

      <div className="admin-academic-term-card__schedule">
        <TermScheduleRow
          label="Term"
          value={formatDateRange(term.start_date, term.end_date)}
        />
        <TermScheduleRow
          label="Registration"
          value={formatDateRange(term.registration_open, term.registration_close)}
        />
        <TermScheduleRow
          label="Withdraw"
          value={formatTableDate(term.withdraw_deadline)}
          sectionStart
        />
        <TermScheduleRow
          label="Payment"
          value={formatTableDate(term.payment_due_date)}
        />
        <TermScheduleRow
          label="Clinic"
          value={formatTableDate(term.clinicAppointmentDeadline)}
        />
      </div>

      <div className="admin-academic-term-card__footer">
        <button
          type="button"
          className="admin-academic-term-card__action admin-academic-term-card__action--delete"
          disabled={busy}
          onClick={() => onDelete(term)}
        >
          Delete
        </button>
        <button
          type="button"
          className="admin-academic-term-card__action admin-academic-term-card__action--edit"
          disabled={busy}
          onClick={() => onEdit(term)}
        >
          Edit term
        </button>
      </div>
    </article>
  )
}

type TermFormFieldProps = {
  id: string
  label: string
  children: ReactNode
  className?: string
}

function TermFormField({ id, label, children, className }: TermFormFieldProps) {
  return (
    <div
      className={['admin-academic-term-form__field', className]
        .filter(Boolean)
        .join(' ')}
    >
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  )
}

function TermFormCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label htmlFor={id} className="admin-academic-term-form__checkbox">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

function defaultAddForm(nextSequence: number): TermForm {
  const y = new Date().getFullYear()
  return {
    year: String(y),
    term_name: 'Fall',
    sequence_no: String(nextSequence),
    term_label: '',
    start_date: '',
    end_date: '',
    registration_open: '',
    registration_close: '',
    withdraw_deadline: '',
    payment_due_date: '',
    clinicAppointmentDeadline: '',
    status: 'planned',
    is_visible: true,
    lock_registration_if_overdue: false,
  }
}

export function AdminAcademicTermsPage() {
  const { refreshPortalDefault } = useAdminPortalTerm()
  const [rows, setRows] = useState<AcademicTerm[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TermForm>(() => defaultAddForm(1))
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AcademicTerm | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [postingId, setPostingId] = useState<string | null>(null)
  const [postError, setPostError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    setPostError(null)
    try {
      const terms = await fetchAcademicTerms({ signal: ac.signal })
      if (ac.signal.aborted) return
      setRows(terms)
    } catch (e) {
      if (ac.signal.aborted) return
      setRows(null)
      setError(e instanceof Error ? e.message : 'Could not load academic terms.')
    } finally {
      if (!ac.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [reloadKey, load])

  const nextSequence = useMemo(() => {
    if (!rows?.length) return 1
    return Math.max(...rows.map((r) => r.sequence_no)) + 1
  }, [rows])

  const displayRows = useMemo(
    () => (rows == null ? null : sortTermsForDisplay(rows)),
    [rows],
  )

  function openAdd() {
    setEditingId(null)
    setForm(defaultAddForm(nextSequence))
    setFormError(null)
    setDeleteTarget(null)
    setModalMode('add')
  }

  function openEdit(t: AcademicTerm) {
    setEditingId(t.id)
    setForm(termToForm(t))
    setFormError(null)
    setDeleteTarget(null)
    setModalMode('edit')
  }

  function closeModal() {
    if (saving || deleting) return
    setModalMode(null)
    setEditingId(null)
    setFormError(null)
    setDeleteTarget(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const year = Math.trunc(Number(form.year))
    const sequence_no = Math.trunc(Number(form.sequence_no))
    if (!Number.isFinite(year) || year < 1900 || year > 2100) {
      setFormError('Enter a valid year.')
      return
    }
    if (!Number.isFinite(sequence_no) || sequence_no <= 0) {
      setFormError('Enter a valid sequence number.')
      return
    }
    const term_label_trim = form.term_label.trim()
    if (modalMode === 'edit' && term_label_trim === '') {
      setFormError('Term label is required when editing.')
      return
    }

    const datePayload = {
      start_date: emptyToNull(form.start_date),
      end_date: emptyToNull(form.end_date),
      registration_open: emptyToNull(form.registration_open),
      registration_close: emptyToNull(form.registration_close),
      withdraw_deadline: emptyToNull(form.withdraw_deadline),
      payment_due_date: emptyToNull(form.payment_due_date),
      clinicAppointmentDeadline: emptyToNull(form.clinicAppointmentDeadline),
    }
    for (const [k, v] of Object.entries(datePayload)) {
      if (v != null && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        setFormError(`Invalid date for ${humanizeDateFieldKey(k)} (use YYYY-MM-DD).`)
        return
      }
    }

    setSaving(true)
    try {
      if (modalMode === 'add') {
        await createAcademicTerm({
          year,
          term_name: form.term_name,
          sequence_no,
          ...(term_label_trim !== '' ? { term_label: term_label_trim } : {}),
          ...datePayload,
          status: form.status,
          is_visible: form.is_visible,
          lock_registration_if_overdue: form.lock_registration_if_overdue,
        })
      } else if (modalMode === 'edit' && editingId) {
        await updateAcademicTerm(editingId, {
          year,
          term_name: form.term_name,
          sequence_no,
          term_label: term_label_trim,
          ...datePayload,
          status: form.status,
          is_visible: form.is_visible,
          lock_registration_if_overdue: form.lock_registration_if_overdue,
        })
      }
      setReloadKey((k) => k + 1)
      setModalMode(null)
      setEditingId(null)
      setFormError(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function onPostTerm(termId: string) {
    setPostError(null)
    setPostingId(termId)
    try {
      await postAcademicTermToDashboard(termId)
      refreshPortalDefault()
      setReloadKey((k) => k + 1)
    } catch (e) {
      setPostError(e instanceof Error ? e.message : 'Could not post term.')
    } finally {
      setPostingId(null)
    }
  }

  function openDeleteConfirm(term: AcademicTerm) {
    if (saving || deleting) return
    setFormError(null)
    setDeleteTarget(term)
  }

  function closeDeleteConfirm() {
    if (deleting) return
    setDeleteTarget(null)
    setFormError(null)
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return
    const deletingId = deleteTarget.id
    setDeleting(true)
    setFormError(null)
    try {
      await deleteAcademicTerm(deletingId)
      setRows((prev) => (prev == null ? prev : prev.filter((row) => row.id !== deletingId)))
      setActionNotice(`Academic term ${deletingId} deleted.`)
      setDeleteTarget(null)
      if (modalMode === 'edit' && editingId === deletingId) {
        setModalMode(null)
        setEditingId(null)
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  const sectionLoading = loading && rows === null && error === null

  return (
    <main className="admin-page admin-academic-terms-page">
      <div className="admin-page__toolbar admin-academic-terms-page__toolbar">
        <div className="admin-academic-terms-page__heading">
          <h1 className="admin-page__title admin-page__title--inline">
            Academic Terms
          </h1>
          <p className="admin-academic-terms-page__lede">
            Each term controls registration dates, deadlines, and portal policy for
            that semester. Turn on <strong>Portal default</strong> for the one term
            students see first (only one active at a time).
            {!sectionLoading && !error && rows != null ? (
              <span className="admin-academic-terms-page__count">
                {' '}
                {rows.length} {rows.length === 1 ? 'term' : 'terms'}
              </span>
            ) : null}
          </p>
        </div>
        <div className="admin-page__toolbar-actions">
          <button
            type="button"
            className="admin-academic-terms-page__add-btn"
            disabled={sectionLoading || Boolean(error)}
            onClick={openAdd}
          >
            <span className="admin-academic-terms-page__add-icon" aria-hidden="true">
              +
            </span>
            Add term
          </button>
        </div>
      </div>
      {actionNotice ? (
        <p className="portal-card-note" role="status">
          {actionNotice}
        </p>
      ) : null}

      {sectionLoading ? (
        <section
          className="portal-card portal-profile-state"
          aria-busy="true"
          aria-live="polite"
        >
          <p className="portal-profile-state__title">Loading academic terms</p>
          <p className="portal-profile-state__detail">
            Please wait while we load terms from the database.
          </p>
        </section>
      ) : null}

      {!sectionLoading && error ? (
        <section
          className="portal-card portal-profile-state portal-profile-state--error"
          role="alert"
        >
          <p className="portal-profile-state__title">We could not load terms</p>
          <p className="portal-profile-state__detail">{error}</p>
          <div className="portal-actions portal-profile-state__actions">
            <button
              type="button"
              className="portal-btn portal-btn--secondary"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Try again
            </button>
          </div>
        </section>
      ) : null}

      {!sectionLoading && !error && rows != null ? (
        <div className="admin-academic-terms-list">
          {postError ? (
            <p className="admin-academic-terms-page__alert" role="alert">
              {postError}
            </p>
          ) : null}
          {rows.length === 0 ? (
            <section className="admin-academic-terms-empty portal-card">
              <p className="admin-academic-terms-empty__title">No terms yet</p>
              <p className="admin-academic-terms-empty__detail">
                Create your first academic term to set registration dates and
                deadlines.
              </p>
              <button
                type="button"
                className="admin-academic-terms-page__add-btn"
                onClick={openAdd}
              >
                <span className="admin-academic-terms-page__add-icon" aria-hidden="true">
                  +
                </span>
                Add term
              </button>
            </section>
          ) : (
            displayRows!.map((t) => (
              <TermCard
                key={t.id}
                term={t}
                postingId={postingId}
                deleting={deleting && deleteTarget?.id === t.id}
                onEdit={openEdit}
                onPost={onPostTerm}
                onDelete={openDeleteConfirm}
              />
            ))
          )}
        </div>
      ) : null}

      {modalMode != null ? (
        <div
          className="admin-section-detail-backdrop"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) closeModal()
          }}
        >
          <div
            className="admin-section-detail-modal admin-section-detail-modal--academic-term-form"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-academic-term-modal-title"
          >
            <h2
              id="admin-academic-term-modal-title"
              className="admin-section-detail-modal__title"
            >
              {modalMode === 'add' ? 'Add term' : 'Edit term'}
            </h2>
            {modalMode === 'edit' && editingId ? (
              <p className="admin-section-detail-modal__meta admin-academic-term-form__meta">
                ID <code className="admin-code">{editingId}</code>
                <span aria-hidden="true"> · </span>
                Year or term name changes update the canonical ID.
              </p>
            ) : (
              <p className="admin-section-detail-modal__meta admin-academic-term-form__meta">
                Term ID is derived from year and name (e.g.{' '}
                <code className="admin-code">2027-WIN</code>).
              </p>
            )}

            <form
              className="admin-academic-term-form"
              onSubmit={(e) => void onSubmit(e)}
            >
              <div className="admin-academic-term-form__sections">
                <section className="admin-academic-term-form__section">
                  <h3 className="admin-academic-term-form__section-title">
                    Term details
                  </h3>
                  <div className="admin-academic-term-form__row admin-academic-term-form__row--4">
                    <TermFormField id="admin-term-year" label="Year">
                      <input
                        id="admin-term-year"
                        className="admin-input admin-academic-term-form__input"
                        type="number"
                        inputMode="numeric"
                        min={1900}
                        max={2100}
                        required
                        value={form.year}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, year: e.target.value }))
                        }
                      />
                    </TermFormField>
                    <TermFormField id="admin-term-name" label="Term name">
                      <select
                        id="admin-term-name"
                        className="admin-input admin-academic-term-form__input"
                        value={form.term_name}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            term_name: e.target.value as AcademicTermName,
                          }))
                        }
                      >
                        {TERM_NAMES.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </TermFormField>
                    <TermFormField id="admin-term-seq" label="Sequence no.">
                      <input
                        id="admin-term-seq"
                        className="admin-input admin-academic-term-form__input"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        required
                        value={form.sequence_no}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            sequence_no: e.target.value,
                          }))
                        }
                      />
                    </TermFormField>
                    <TermFormField id="admin-term-status" label="Status">
                      <select
                        id="admin-term-status"
                        className="admin-input admin-academic-term-form__input"
                        value={form.status}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            status: e.target.value as AcademicTermStatus,
                          }))
                        }
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {formatStatusLabel(s)}
                          </option>
                        ))}
                      </select>
                    </TermFormField>
                  </div>
                  <div className="admin-academic-term-form__row admin-academic-term-form__row--1">
                    <TermFormField id="admin-term-label" label="Term label">
                      <input
                        id="admin-term-label"
                        className="admin-input admin-academic-term-form__input"
                        type="text"
                        placeholder={
                          modalMode === 'add'
                            ? 'Optional — defaults to “Term Year”'
                            : undefined
                        }
                        required={modalMode === 'edit'}
                        value={form.term_label}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, term_label: e.target.value }))
                        }
                      />
                    </TermFormField>
                  </div>
                </section>

                <section className="admin-academic-term-form__section">
                  <h3 className="admin-academic-term-form__section-title">
                    Term dates
                  </h3>
                  <div className="admin-academic-term-form__row admin-academic-term-form__row--2">
                    <TermFormField id="admin-term-start" label="Start date">
                      <input
                        id="admin-term-start"
                        className="admin-input admin-academic-term-form__input"
                        type="date"
                        value={form.start_date}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, start_date: e.target.value }))
                        }
                      />
                    </TermFormField>
                    <TermFormField id="admin-term-end" label="End date">
                      <input
                        id="admin-term-end"
                        className="admin-input admin-academic-term-form__input"
                        type="date"
                        value={form.end_date}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, end_date: e.target.value }))
                        }
                      />
                    </TermFormField>
                  </div>
                </section>

                <section className="admin-academic-term-form__section">
                  <h3 className="admin-academic-term-form__section-title">
                    Registration &amp; deadlines
                  </h3>
                  <div className="admin-academic-term-form__row admin-academic-term-form__row--2">
                    <TermFormField id="admin-term-reg-open" label="Registration open">
                      <input
                        id="admin-term-reg-open"
                        className="admin-input admin-academic-term-form__input"
                        type="date"
                        value={form.registration_open}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            registration_open: e.target.value,
                          }))
                        }
                      />
                    </TermFormField>
                    <TermFormField id="admin-term-reg-close" label="Registration close">
                      <input
                        id="admin-term-reg-close"
                        className="admin-input admin-academic-term-form__input"
                        type="date"
                        value={form.registration_close}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            registration_close: e.target.value,
                          }))
                        }
                      />
                    </TermFormField>
                  </div>
                  <div className="admin-academic-term-form__row admin-academic-term-form__row--3">
                    <TermFormField
                      id="admin-term-withdraw-deadline"
                      label="Withdraw deadline"
                    >
                      <input
                        id="admin-term-withdraw-deadline"
                        className="admin-input admin-academic-term-form__input"
                        type="date"
                        value={form.withdraw_deadline}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            withdraw_deadline: e.target.value,
                          }))
                        }
                      />
                    </TermFormField>
                    <TermFormField id="admin-term-pdd" label="Payment due date">
                      <input
                        id="admin-term-pdd"
                        className="admin-input admin-academic-term-form__input"
                        type="date"
                        value={form.payment_due_date}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            payment_due_date: e.target.value,
                          }))
                        }
                      />
                    </TermFormField>
                    <TermFormField id="admin-term-clinic-ddl" label="Clinic deadline">
                      <input
                        id="admin-term-clinic-ddl"
                        className="admin-input admin-academic-term-form__input"
                        type="date"
                        value={form.clinicAppointmentDeadline}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            clinicAppointmentDeadline: e.target.value,
                          }))
                        }
                      />
                    </TermFormField>
                  </div>
                </section>

                <section className="admin-academic-term-form__section admin-academic-term-form__section--options">
                  <h3 className="admin-academic-term-form__section-title">
                    Options
                  </h3>
                  <div className="admin-academic-term-form__options">
                    <TermFormCheckbox
                      id="admin-term-visible"
                      label="Visible to students"
                      checked={form.is_visible}
                      onChange={(checked) =>
                        setForm((f) => ({ ...f, is_visible: checked }))
                      }
                    />
                    <TermFormCheckbox
                      id="admin-term-lock"
                      label="Lock registration if overdue"
                      checked={form.lock_registration_if_overdue}
                      onChange={(checked) =>
                        setForm((f) => ({
                          ...f,
                          lock_registration_if_overdue: checked,
                        }))
                      }
                    />
                  </div>
                </section>
              </div>

              {formError ? (
                <p className="admin-courses-feedback--error" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="admin-section-detail-modal__actions admin-academic-term-form__actions">
                {modalMode === 'edit' && editingId ? (
                  <button
                    type="button"
                    className="portal-btn portal-btn--admin-danger portal-btn--compact"
                    disabled={saving || deleting}
                    style={{ marginRight: 'auto' }}
                    onClick={() => {
                      const term = rows?.find((row) => row.id === editingId)
                      if (term) openDeleteConfirm(term)
                    }}
                  >
                    Delete term
                  </button>
                ) : null}
                <button
                  type="button"
                  className="portal-btn portal-btn--secondary portal-btn--compact"
                  disabled={saving || deleting}
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-academic-terms-page__save-btn portal-btn portal-btn--compact"
                  disabled={saving || deleting}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget != null ? (
        <div
          className="admin-section-detail-backdrop"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) closeDeleteConfirm()
          }}
        >
          <div
            className="admin-section-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-academic-term-delete-title"
          >
            <h2
              id="admin-academic-term-delete-title"
              className="admin-section-detail-modal__title"
            >
              Delete term
            </h2>
            <p className="admin-section-detail-modal__meta">
              Delete <strong>{deleteTarget.term_label}</strong> (
              <code className="admin-code">{deleteTarget.id}</code>)?
            </p>
            {deleteTarget.is_posted_to_dashboard ? (
              <p className="admin-section-detail-modal__meta">
                This is the current portal default. Set another term as default before
                deleting, or the student portal may have no active term.
              </p>
            ) : null}
            <p className="admin-section-detail-modal__meta">
              This cannot be undone. Deletion is blocked if the term is still referenced
              by sections, enrollments, clinical records, or documents.
            </p>
            {formError && deleteTarget != null ? (
              <p className="admin-courses-feedback--error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="admin-section-detail-modal__actions">
              <button
                type="button"
                className="portal-btn portal-btn--secondary portal-btn--compact"
                disabled={deleting}
                onClick={closeDeleteConfirm}
              >
                Cancel
              </button>
              <button
                type="button"
                className="portal-btn portal-btn--admin-danger portal-btn--compact"
                disabled={deleting}
                onClick={() => void onConfirmDelete()}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

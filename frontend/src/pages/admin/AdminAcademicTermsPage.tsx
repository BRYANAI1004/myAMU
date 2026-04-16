import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createAcademicTerm,
  fetchAcademicTerms,
  postAcademicTermToDashboard,
  updateAcademicTerm,
  type AcademicTerm,
  type AcademicTermName,
  type AcademicTermStatus,
} from '../../lib/api'

const TERM_NAMES: AcademicTermName[] = ['Winter', 'Spring', 'Summer', 'Fall']
const STATUSES: AcademicTermStatus[] = [
  'planned',
  'registration_open',
  'in_progress',
  'completed',
]

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
  status: AcademicTermStatus
  is_visible: boolean
  lock_registration_if_overdue: boolean
}

function emptyToNull(iso: string): string | null {
  const s = iso.trim()
  return s === '' ? null : s
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
    status: t.status,
    is_visible: t.is_visible,
    lock_registration_if_overdue: t.lock_registration_if_overdue,
  }
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
    status: 'planned',
    is_visible: true,
    lock_registration_if_overdue: false,
  }
}

export function AdminAcademicTermsPage() {
  const [rows, setRows] = useState<AcademicTerm[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TermForm>(() => defaultAddForm(1))
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
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

  function openAdd() {
    setEditingId(null)
    setForm(defaultAddForm(nextSequence))
    setFormError(null)
    setModalMode('add')
  }

  function openEdit(t: AcademicTerm) {
    setEditingId(t.id)
    setForm(termToForm(t))
    setFormError(null)
    setModalMode('edit')
  }

  function closeModal() {
    if (saving) return
    setModalMode(null)
    setEditingId(null)
    setFormError(null)
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
    }
    for (const [k, v] of Object.entries(datePayload)) {
      if (v != null && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        setFormError(`Invalid date for ${k.replace(/_/g, ' ')} (use YYYY-MM-DD).`)
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
      setReloadKey((k) => k + 1)
    } catch (e) {
      setPostError(e instanceof Error ? e.message : 'Could not post term.')
    } finally {
      setPostingId(null)
    }
  }

  const sectionLoading = loading && rows === null && error === null

  return (
    <main className="admin-page">
      <div className="admin-page__toolbar">
        <h1 className="admin-page__title admin-page__title--inline">
          Academic Terms
        </h1>
        <div className="admin-page__toolbar-actions">
          <button
            type="button"
            className="portal-btn portal-btn--primary"
            disabled={sectionLoading || Boolean(error)}
            onClick={openAdd}
          >
            Add Term
          </button>
        </div>
      </div>

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
        <div className="portal-table-wrap admin-table-wrap admin-academic-terms-table-wrap">
          {postError ? (
            <p className="admin-courses-feedback--error" role="alert">
              {postError}
            </p>
          ) : null}
          <table className="portal-table portal-data-table admin-academic-terms-table">
            <thead>
              <tr>
                <th scope="col">Term Label</th>
                <th scope="col">Term ID</th>
                <th scope="col">Year</th>
                <th scope="col">Term Name</th>
                <th scope="col">Status</th>
                <th scope="col">Registration Open</th>
                <th scope="col">Registration Close</th>
                <th scope="col">Withdraw DDL</th>
                <th scope="col">Payment DDL</th>
                <th scope="col">Lock Registration if Overdue</th>
                <th scope="col">Visible</th>
                <th scope="col">Posted</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="portal-card-note">
                    No academic terms yet. Use Add Term to create one.
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id}>
                    <td>{t.term_label}</td>
                    <td>
                      <code className="admin-code">{t.id}</code>
                    </td>
                    <td>{t.year}</td>
                    <td>{t.term_name}</td>
                    <td>{t.status}</td>
                    <td>{formatTableDate(t.registration_open)}</td>
                    <td>{formatTableDate(t.registration_close)}</td>
                    <td>{formatTableDate(t.withdraw_deadline)}</td>
                    <td>{formatTableDate(t.payment_due_date)}</td>
                    <td>{t.lock_registration_if_overdue ? 'Yes' : 'No'}</td>
                    <td>{t.is_visible ? 'Yes' : 'No'}</td>
                    <td>{t.is_posted_to_dashboard ? 'Yes' : 'No'}</td>
                    <td>
                      <div className="admin-academic-terms-actions">
                        <button
                          type="button"
                          className="portal-btn portal-btn--secondary portal-btn--compact"
                          onClick={() => openEdit(t)}
                        >
                          Edit
                        </button>
                        {t.is_posted_to_dashboard ? (
                          <button
                            type="button"
                            className="portal-btn portal-btn--secondary portal-btn--compact"
                            disabled
                          >
                            Posted
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="portal-btn portal-btn--primary portal-btn--compact"
                            disabled={postingId !== null}
                            onClick={() => void onPostTerm(t.id)}
                          >
                            {postingId === t.id ? 'Posting…' : 'Post'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
            className="admin-section-detail-modal admin-section-detail-modal--form-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-academic-term-modal-title"
          >
            <h2
              id="admin-academic-term-modal-title"
              className="admin-section-detail-modal__title"
            >
              {modalMode === 'add' ? 'Add Term' : 'Edit Term'}
            </h2>
            {modalMode === 'edit' && editingId ? (
              <p className="admin-section-detail-modal__meta">
                Current id: <code className="admin-code">{editingId}</code>
                {' · '}
                Changing year or term name updates the canonical Term ID.
              </p>
            ) : (
              <p className="admin-section-detail-modal__meta">
                Canonical Term ID is derived from year and term name (for example{' '}
                <code className="admin-code">2027-WIN</code>).
              </p>
            )}

            <form onSubmit={(e) => void onSubmit(e)}>
              <div className="portal-course-feedback-modal__field">
                <label htmlFor="admin-term-year">Year</label>
                <input
                  id="admin-term-year"
                  className="admin-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
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
              </div>
              <div className="portal-course-feedback-modal__field">
                <label htmlFor="admin-term-name">Term name</label>
                <select
                  id="admin-term-name"
                  className="admin-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
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
              </div>
              <div className="portal-course-feedback-modal__field">
                <label htmlFor="admin-term-seq">Sequence no.</label>
                <input
                  id="admin-term-seq"
                  className="admin-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  required
                  value={form.sequence_no}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sequence_no: e.target.value }))
                  }
                />
              </div>
              <div className="portal-course-feedback-modal__field">
                <label htmlFor="admin-term-label">Term label</label>
                <input
                  id="admin-term-label"
                  className="admin-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
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
              </div>
              <div className="portal-course-feedback-modal__field">
                <label htmlFor="admin-term-start">Start date</label>
                <input
                  id="admin-term-start"
                  className="admin-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, start_date: e.target.value }))
                  }
                />
              </div>
              <div className="portal-course-feedback-modal__field">
                <label htmlFor="admin-term-end">End date</label>
                <input
                  id="admin-term-end"
                  className="admin-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  type="date"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, end_date: e.target.value }))
                  }
                />
              </div>
              <div className="portal-course-feedback-modal__field">
                <label htmlFor="admin-term-reg-open">Registration open</label>
                <input
                  id="admin-term-reg-open"
                  className="admin-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  type="date"
                  value={form.registration_open}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, registration_open: e.target.value }))
                  }
                />
              </div>
              <div className="portal-course-feedback-modal__field">
                <label htmlFor="admin-term-reg-close">Registration close</label>
                <input
                  id="admin-term-reg-close"
                  className="admin-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  type="date"
                  value={form.registration_close}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      registration_close: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="portal-course-feedback-modal__field">
                <label htmlFor="admin-term-withdraw-deadline">
                  Withdraw deadline
                </label>
                <input
                  id="admin-term-withdraw-deadline"
                  className="admin-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  type="date"
                  value={form.withdraw_deadline}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      withdraw_deadline: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="portal-course-feedback-modal__field">
                <label htmlFor="admin-term-status">Status</label>
                <select
                  id="admin-term-status"
                  className="admin-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
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
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="portal-course-feedback-modal__field">
                <label htmlFor="admin-term-visible" className="admin-academic-terms__checkbox-label">
                  <input
                    id="admin-term-visible"
                    type="checkbox"
                    checked={form.is_visible}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_visible: e.target.checked }))
                    }
                  />
                  Visible to students
                </label>
              </div>
              <div className="portal-course-feedback-modal__field">
                <label htmlFor="admin-term-pdd">Payment due date (DDL)</label>
                <input
                  id="admin-term-pdd"
                  className="admin-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  type="date"
                  value={form.payment_due_date}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      payment_due_date: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="portal-course-feedback-modal__field">
                <label htmlFor="admin-term-lock" className="admin-academic-terms__checkbox-label">
                  <input
                    id="admin-term-lock"
                    type="checkbox"
                    checked={form.lock_registration_if_overdue}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        lock_registration_if_overdue: e.target.checked,
                      }))
                    }
                  />
                  Lock registration if overdue (after payment DDL)
                </label>
              </div>

              {formError ? (
                <p className="admin-courses-feedback--error" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="admin-section-detail-modal__actions">
                <button
                  type="button"
                  className="portal-btn portal-btn--secondary portal-btn--compact"
                  disabled={saving}
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="portal-btn portal-btn--primary portal-btn--compact"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}

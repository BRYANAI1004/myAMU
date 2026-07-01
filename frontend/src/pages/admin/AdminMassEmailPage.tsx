import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import {
  fetchAdminLoginEmailStatus,
  fetchAdminStudents,
  sendAdminMassEmail,
  type AdminStudentListItem,
  type AdminStudentsProgramFilter,
  type AdminStudentsTrackFilter,
  type LoginEmailStatus,
  type SendAdminMassEmailAttachmentInput,
} from '../../lib/api'

import { AdminMassEmailLogsPanel } from './AdminMassEmailLogsPanel'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300
const SUBJECT_MAX = 200
const BODY_MAX = 50_000
const MAX_ATTACHMENTS = 5
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SelectedStudent = {
  email: string
  name: string
}

type PendingAttachment = {
  id: string
  file: File
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

function personalEmailOf(row: AdminStudentListItem): string | null {
  const email = row.email?.trim() ?? ''
  if (email === '' || !EMAIL_REGEX.test(email)) return null
  return email
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function fileToAttachmentInput(file: File): Promise<SendAdminMassEmailAttachmentInput> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return {
    filename: file.name,
    contentBase64: btoa(binary),
  }
}

type MassEmailPageTab = 'compose' | 'logs'

export function AdminMassEmailPage() {
  const [pageTab, setPageTab] = useState<MassEmailPageTab>('compose')
  const [senderStatus, setSenderStatus] = useState<LoginEmailStatus | null>(null)
  const [senderLoading, setSenderLoading] = useState(true)
  const [senderError, setSenderError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const debouncedSearch = useDebouncedValue(q.trim(), SEARCH_DEBOUNCE_MS)
  const [program, setProgram] = useState<AdminStudentsProgramFilter>('all')
  const [track, setTrack] = useState<AdminStudentsTrackFilter>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AdminStudentListItem[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<Map<string, SelectedStudent>>(
    () => new Map(),
  )

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)

  const debouncedSearchPrev = useRef<string | null>(null)
  useEffect(() => {
    if (debouncedSearchPrev.current === null) {
      debouncedSearchPrev.current = debouncedSearch
      return
    }
    if (debouncedSearchPrev.current !== debouncedSearch) {
      debouncedSearchPrev.current = debouncedSearch
      setPage(1)
    }
  }, [debouncedSearch])

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (filterRef.current != null && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    if (filterOpen) {
      document.addEventListener('mousedown', onPointerDown)
      return () => document.removeEventListener('mousedown', onPointerDown)
    }
    return undefined
  }, [filterOpen])

  useEffect(() => {
    const ac = new AbortController()
    setSenderLoading(true)
    setSenderError(null)
    fetchAdminLoginEmailStatus({ signal: ac.signal })
      .then((status) => {
        if (ac.signal.aborted) return
        setSenderStatus(status)
      })
      .catch((e) => {
        if (ac.signal.aborted) return
        setSenderStatus(null)
        setSenderError(
          e instanceof Error ? e.message : 'Could not load verified sender email.',
        )
      })
      .finally(() => {
        if (!ac.signal.aborted) setSenderLoading(false)
      })
    return () => ac.abort()
  }, [])

  useEffect(() => {
    if (pageTab !== 'compose') return undefined
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetchAdminStudents({
          signal: ac.signal,
          page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
          program,
          track,
        })
        if (ac.signal.aborted) return
        setRows(res.items)
        setTotal(res.total)
      } catch (e) {
        if (ac.signal.aborted) return
        setRows(null)
        setTotal(0)
        setError(e instanceof Error ? e.message : 'Could not load students.')
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    })()
    return () => ac.abort()
  }, [page, debouncedSearch, program, track, pageTab])

  const pageRows = rows ?? []
  const pageSelectable = pageRows.filter((row) => personalEmailOf(row) != null)
  const allPageSelected =
    pageSelectable.length > 0 &&
    pageSelectable.every((row) => selectedStudents.has(row.studentId))

  const selectedList = useMemo(
    () =>
      Array.from(selectedStudents.entries())
        .map(([studentId, value]) => ({ studentId, ...value }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [selectedStudents],
  )

  const selectedRecipients = useMemo(
    () => Array.from(new Set(selectedList.map((row) => row.email))),
    [selectedList],
  )

  const activeFilterCount =
    (program !== 'all' ? 1 : 0) + (track !== 'all' ? 1 : 0)

  const subjectTrimmed = subject.trim()
  const bodyTrimmed = body.trim()
  const senderReady = senderStatus?.verified === true
  const canSend =
    senderReady &&
    !sending &&
    selectedRecipients.length > 0 &&
    subjectTrimmed !== '' &&
    bodyTrimmed !== '' &&
    subject.length <= SUBJECT_MAX &&
    body.length <= BODY_MAX &&
    attachmentError == null

  function toggleRow(row: AdminStudentListItem, checked: boolean) {
    const email = personalEmailOf(row)
    if (email == null) return
    setSelectedStudents((prev) => {
      const next = new Map(prev)
      if (checked) next.set(row.studentId, { email, name: row.name })
      else next.delete(row.studentId)
      return next
    })
  }

  function togglePage(checked: boolean) {
    setSelectedStudents((prev) => {
      const next = new Map(prev)
      for (const row of pageSelectable) {
        const email = personalEmailOf(row)
        if (email == null) continue
        if (checked) next.set(row.studentId, { email, name: row.name })
        else next.delete(row.studentId)
      }
      return next
    })
  }

  function removeSelected(studentId: string) {
    setSelectedStudents((prev) => {
      const next = new Map(prev)
      next.delete(studentId)
      return next
    })
  }

  function clearSelection() {
    setSelectedStudents(new Map())
  }

  function resetFilters() {
    setProgram('all')
    setTrack('all')
    setPage(1)
    setFilterOpen(false)
  }

  function onAttachmentChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (picked.length === 0) return

    setAttachmentError(null)
    const next = [...attachments]
    for (const file of picked) {
      if (next.length >= MAX_ATTACHMENTS) {
        setAttachmentError(`Maximum ${MAX_ATTACHMENTS} attachments per email.`)
        break
      }
      next.push({ id: `${file.name}-${file.size}-${file.lastModified}`, file })
    }
    setAttachments(next)
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((item) => item.id !== id))
    setAttachmentError(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSend) return
    setSending(true)
    setSendError(null)
    setSendSuccess(null)
    try {
      const attachmentPayload =
        attachments.length > 0
          ? await Promise.all(attachments.map((item) => fileToAttachmentInput(item.file)))
          : undefined

      const result = await sendAdminMassEmail({
        recipients: selectedRecipients,
        subject: subjectTrimmed,
        body,
        attachments: attachmentPayload,
      })
      if (result.delivered) {
        setSendSuccess(
          `Delivered to ${result.recipientCount} student${result.recipientCount === 1 ? '' : 's'}.`,
        )
        setSubject('')
        setBody('')
        setAttachments([])
        setSelectedStudents(new Map())
      } else {
        setSendError(
          result.note ?? 'The server received your message but did not deliver it.',
        )
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Email send failed.')
    } finally {
      setSending(false)
    }
  }

  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(page * PAGE_SIZE, total)

  return (
    <main className="admin-page admin-mass-email-page">
      <header className="admin-mass-email-header">
        <div className="admin-mass-email-header__intro">
          <h1 className="admin-mass-email-header__title">Mass Email</h1>
          <div
            className="admin-finance-page-tabs admin-mass-email-page-tabs"
            role="tablist"
            aria-label="Mass email sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={pageTab === 'compose'}
              className={`admin-finance-page-tab${pageTab === 'compose' ? ' admin-finance-page-tab--active' : ''}`}
              onClick={() => setPageTab('compose')}
            >
              Compose
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pageTab === 'logs'}
              className={`admin-finance-page-tab${pageTab === 'logs' ? ' admin-finance-page-tab--active' : ''}`}
              onClick={() => setPageTab('logs')}
            >
              Email Logs
            </button>
          </div>
        </div>
      </header>

      {pageTab === 'logs' ? (
        <AdminMassEmailLogsPanel />
      ) : (
      <div className="admin-mass-email-layout">
        <form className="admin-mass-email-compose" onSubmit={onSubmit}>
          <div className="admin-mass-email-compose__section">
            <h2 className="admin-mass-email-compose__heading">Message</h2>

            <div className="admin-mass-email-meta">
              <div className="admin-mass-email-meta__row">
                <span className="admin-mass-email-meta__key">From</span>
                <div className="admin-mass-email-meta__value">
                  {senderLoading ? (
                    <span className="admin-mass-email-meta__muted">Loading…</span>
                  ) : senderError ? (
                    <span className="admin-mass-email-meta__error">{senderError}</span>
                  ) : senderReady ? (
                    <span className="admin-mass-email-chip admin-mass-email-chip--verified">
                      {senderStatus?.emailMasked}
                    </span>
                  ) : (
                    <span className="admin-mass-email-meta__error">
                      Not verified —{' '}
                      <Link to="/admin/settings" className="admin-mass-email-link">
                        verify in Setting
                      </Link>
                    </span>
                  )}
                </div>
              </div>
              <div className="admin-mass-email-meta__row admin-mass-email-meta__row--bcc">
                <span className="admin-mass-email-meta__key">Bcc</span>
                <div className="admin-mass-email-meta__value admin-mass-email-meta__value--bcc">
                  {selectedList.length === 0 ? (
                    <span className="admin-mass-email-meta__muted">No recipients yet</span>
                  ) : (
                    <div className="admin-mass-email-bcc-list">
                      {selectedList.map(({ studentId, name }) => (
                        <span
                          key={studentId}
                          className="admin-mass-email-chip admin-mass-email-chip--recipient"
                        >
                          {name}
                          <button
                            type="button"
                            className="admin-mass-email-chip__remove"
                            aria-label={`Remove ${name}`}
                            onClick={() => removeSelected(studentId)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedList.length > 0 ? (
                    <button
                      type="button"
                      className="admin-mass-email-link-btn"
                      onClick={clearSelection}
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <label className="admin-mass-email-field" htmlFor="mass-email-subject">
              <span className="admin-mass-email-field__label">Subject</span>
              <input
                id="mass-email-subject"
                type="text"
                className="admin-mass-email-field__input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={SUBJECT_MAX}
                disabled={sending || !senderReady}
                placeholder="Enter a subject line"
                required
              />
            </label>

            <label className="admin-mass-email-field admin-mass-email-field--body" htmlFor="mass-email-body">
              <span className="admin-mass-email-field__label">Body</span>
              <textarea
                id="mass-email-body"
                className="admin-mass-email-field__textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={BODY_MAX}
                disabled={sending || !senderReady}
                rows={10}
                placeholder="Write your message…"
                required
              />
              <span className="admin-mass-email-field__count" aria-live="polite">
                {body.length.toLocaleString()} / {BODY_MAX.toLocaleString()}
              </span>
            </label>

            <div className="admin-mass-email-attachments">
              <div className="admin-mass-email-attachments__head">
                <button
                  type="button"
                  className="admin-mass-email-attach-btn"
                  disabled={
                    sending || !senderReady || attachments.length >= MAX_ATTACHMENTS
                  }
                  onClick={() => fileInputRef.current?.click()}
                >
                  Attach files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="admin-mass-email-attachments__input"
                  multiple
                  onChange={onAttachmentChange}
                  aria-hidden
                  tabIndex={-1}
                />
              </div>
              {attachmentError ? (
                <p className="admin-mass-email-banner admin-mass-email-banner--error" role="alert">
                  {attachmentError}
                </p>
              ) : null}
              {attachments.length > 0 ? (
                <ul className="admin-mass-email-attachment-list">
                  {attachments.map((item) => (
                    <li key={item.id} className="admin-mass-email-attachment-item">
                      <span className="admin-mass-email-attachment-item__name">{item.file.name}</span>
                      <span className="admin-mass-email-attachment-item__size">
                        {formatFileSize(item.file.size)}
                      </span>
                      <button
                        type="button"
                        className="admin-mass-email-attachment-item__remove"
                        aria-label={`Remove ${item.file.name}`}
                        disabled={sending}
                        onClick={() => removeAttachment(item.id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          {sendError ? (
            <p className="admin-mass-email-banner admin-mass-email-banner--error" role="alert">
              {sendError}
            </p>
          ) : null}
          {sendSuccess ? (
            <p className="admin-mass-email-banner admin-mass-email-banner--success" role="status">
              {sendSuccess}
            </p>
          ) : null}

          <div className="admin-mass-email-compose__footer">
            <button
              type="submit"
              className="admin-mass-email-send-btn"
              disabled={!canSend}
            >
              {sending ? 'Sending…' : 'Send email'}
            </button>
          </div>
        </form>

        <section className="admin-mass-email-roster" aria-label="Select students">
          <div className="admin-mass-email-roster__head">
            <div>
              <h2 className="admin-mass-email-roster__title">Recipients</h2>
            </div>
            <div className="admin-mass-email-roster__tools">
              <input
                type="search"
                className="admin-mass-email-search"
                placeholder="Search by name or ID…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search students"
              />
              <div className="admin-mass-email-filter" ref={filterRef}>
                <button
                  type="button"
                  className={[
                    'admin-mass-email-filter-btn',
                    activeFilterCount > 0 ? 'admin-mass-email-filter-btn--active' : '',
                    filterOpen ? 'admin-mass-email-filter-btn--open' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-expanded={filterOpen}
                  aria-haspopup="true"
                  onClick={() => setFilterOpen((open) => !open)}
                >
                  Filter
                  {activeFilterCount > 0 ? (
                    <span className="admin-mass-email-filter-btn__badge">{activeFilterCount}</span>
                  ) : null}
                </button>
                {filterOpen ? (
                  <div className="admin-mass-email-filter-panel" role="dialog" aria-label="Filter students">
                    <label className="admin-mass-email-filter-field">
                      <span className="admin-mass-email-filter-field__label">Program</span>
                      <select
                        className="admin-mass-email-filter-field__select"
                        value={program}
                        onChange={(e) => {
                          setProgram(e.target.value as AdminStudentsProgramFilter)
                          setPage(1)
                        }}
                      >
                        <option value="all">All programs</option>
                        <option value="dahm">DAHM</option>
                        <option value="mahm">MAHM</option>
                      </select>
                    </label>
                    <label className="admin-mass-email-filter-field">
                      <span className="admin-mass-email-filter-field__label">Language</span>
                      <select
                        className="admin-mass-email-filter-field__select"
                        value={track}
                        onChange={(e) => {
                          setTrack(e.target.value as AdminStudentsTrackFilter)
                          setPage(1)
                        }}
                      >
                        <option value="all">All</option>
                        <option value="C">Chinese</option>
                        <option value="E">English</option>
                      </select>
                    </label>
                    <div className="admin-mass-email-filter-panel__actions">
                      <button
                        type="button"
                        className="admin-mass-email-link-btn"
                        disabled={activeFilterCount === 0}
                        onClick={resetFilters}
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        className="admin-mass-email-pager-btn"
                        onClick={() => setFilterOpen(false)}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <span className="admin-mass-email-roster__range">
                {loading ? 'Loading…' : `${pageStart}–${pageEnd} of ${total.toLocaleString()}`}
              </span>
            </div>
          </div>

          {error ? (
            <p className="admin-mass-email-banner admin-mass-email-banner--error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="admin-mass-email-table-wrap">
            <table className="admin-mass-email-table">
              <thead>
                <tr>
                  <th scope="col" className="admin-mass-email-table__check">
                    <input
                      type="checkbox"
                      className="admin-mass-email-checkbox"
                      aria-label="Select all on this page"
                      checked={allPageSelected}
                      disabled={pageSelectable.length === 0 || loading}
                      onChange={(e) => togglePage(e.target.checked)}
                    />
                  </th>
                  <th scope="col">Student</th>
                  <th scope="col">Email</th>
                  <th scope="col">Program</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="admin-mass-email-table__empty">
                      Loading students…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-mass-email-table__empty">
                      No students match your search or filters.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => {
                    const email = personalEmailOf(row)
                    const selectable = email != null
                    const selected = selectedStudents.has(row.studentId)
                    return (
                      <tr
                        key={row.studentId}
                        className={[
                          selected ? 'admin-mass-email-table__row--selected' : '',
                          !selectable ? 'admin-mass-email-table__row--disabled' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <td className="admin-mass-email-table__check">
                          <input
                            type="checkbox"
                            className="admin-mass-email-checkbox"
                            aria-label={`Select ${row.name}`}
                            checked={selected}
                            disabled={!selectable}
                            onChange={(e) => toggleRow(row, e.target.checked)}
                          />
                        </td>
                        <td>
                          <span className="admin-mass-email-table__id">{row.studentId}</span>
                          <span className="admin-mass-email-table__name">{row.name}</span>
                        </td>
                        <td className="admin-mass-email-table__email">
                          {email ?? <span className="admin-mass-email-meta__muted">—</span>}
                        </td>
                        <td>
                          <span className="admin-mass-email-table__program">{row.program}</span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="admin-mass-email-roster__footer">
            <button
              type="button"
              className="admin-mass-email-pager-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="admin-mass-email-roster__page">Page {page}</span>
            <button
              type="button"
              className="admin-mass-email-pager-btn"
              disabled={page * PAGE_SIZE >= total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </section>
      </div>
      )}
    </main>
  )
}

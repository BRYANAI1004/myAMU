import { useEffect, useState } from 'react'
import {
  fetchAdminEmailLogAttachmentUrl,
  fetchAdminEmailLogs,
  type AdminEmailLogKind,
  type AdminEmailLogListItem,
} from '../../lib/api'

const PAGE_SIZE = 25

function kindLabel(kind: AdminEmailLogKind): string {
  return kind === 'mass_email' ? 'Mass' : 'Bulk'
}

function formatWhen(iso: string): string {
  if (iso.trim() === '') return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function senderLabel(row: AdminEmailLogListItem): string {
  const name = row.sentByDisplayName?.trim() ?? ''
  if (name !== '') return name
  return row.sentByAdminEmail || '—'
}

function formatFileSize(bytes: number): string {
  if (bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function EmailLogAttachmentsCell({ row }: { row: AdminEmailLogListItem }) {
  const [openingId, setOpeningId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (row.attachments.length > 0) {
    return (
      <div className="admin-email-logs-attachments">
        {row.attachments.map((attachment) => (
          <button
            key={attachment.id}
            type="button"
            className="admin-email-logs-attachment-link"
            disabled={openingId === attachment.id}
            onClick={async () => {
              setOpeningId(attachment.id)
              setError(null)
              try {
                const result = await fetchAdminEmailLogAttachmentUrl(
                  row.id,
                  attachment.id,
                )
                window.open(result.url, '_blank', 'noopener,noreferrer')
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : 'Could not open attachment.',
                )
              } finally {
                setOpeningId(null)
              }
            }}
          >
            {attachment.filename}
            {attachment.byteSize > 0 ? (
              <span className="admin-email-logs-attachment-link__size">
                {formatFileSize(attachment.byteSize)}
              </span>
            ) : null}
          </button>
        ))}
        {error ? (
          <span className="admin-email-logs-attachments__error" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    )
  }

  if (row.attachmentCount <= 0) {
    return <span className="admin-email-logs-table__muted">—</span>
  }

  return (
    <div className="admin-email-logs-attachments admin-email-logs-attachments--names-only">
      {row.attachmentNames.map((name) => (
        <span key={name} className="admin-email-logs-attachment-name">
          {name}
        </span>
      ))}
    </div>
  )
}

export function AdminMassEmailLogsPanel() {
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AdminEmailLogListItem[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    fetchAdminEmailLogs({ signal: ac.signal, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (ac.signal.aborted) return
        setRows(res.items)
        setTotal(res.total)
      })
      .catch((e) => {
        if (ac.signal.aborted) return
        setRows(null)
        setTotal(0)
        setError(e instanceof Error ? e.message : 'Could not load email logs.')
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    return () => ac.abort()
  }, [page])

  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(page * PAGE_SIZE, total)
  const pageRows = rows ?? []

  return (
    <section className="admin-email-logs-panel" aria-label="Email logs">
      <div className="admin-email-logs-panel__head">
        <span className="admin-email-logs-panel__count">
          {loading ? 'Loading…' : `${total.toLocaleString()} total`}
        </span>
      </div>

      {error ? (
        <p className="admin-mass-email-banner admin-mass-email-banner--error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-email-logs-table-wrap">
        <table className="admin-email-logs-table">
          <colgroup>
            <col className="admin-email-logs-table__col admin-email-logs-table__col--when" />
            <col className="admin-email-logs-table__col admin-email-logs-table__col--type" />
            <col className="admin-email-logs-table__col admin-email-logs-table__col--sender" />
            <col className="admin-email-logs-table__col admin-email-logs-table__col--from" />
            <col className="admin-email-logs-table__col admin-email-logs-table__col--subject" />
            <col className="admin-email-logs-table__col admin-email-logs-table__col--recipients" />
            <col className="admin-email-logs-table__col admin-email-logs-table__col--attachments" />
            <col className="admin-email-logs-table__col admin-email-logs-table__col--status" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Type</th>
              <th scope="col">Sender</th>
              <th scope="col">From</th>
              <th scope="col">Subject</th>
              <th scope="col">Recipients</th>
              <th scope="col">Attachments</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="admin-email-logs-table__empty">
                  Loading email logs…
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-email-logs-table__empty">
                  No email logs yet.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id}>
                  <td className="admin-email-logs-table__when">{formatWhen(row.createdAt)}</td>
                  <td>
                    <span className="admin-email-logs-table__kind">{kindLabel(row.kind)}</span>
                  </td>
                  <td className="admin-email-logs-table__sender">{senderLabel(row)}</td>
                  <td className="admin-email-logs-table__from">{row.fromAddress || '—'}</td>
                  <td className="admin-email-logs-table__subject">{row.subject || '—'}</td>
                  <td className="admin-email-logs-table__count">{row.recipientCount}</td>
                  <td className="admin-email-logs-table__attachments">
                    <EmailLogAttachmentsCell row={row} />
                  </td>
                  <td>
                    <span
                      className={[
                        'admin-email-logs-table__status',
                        row.delivered
                          ? 'admin-email-logs-table__status--ok'
                          : 'admin-email-logs-table__status--fail',
                      ].join(' ')}
                      title={row.note ?? undefined}
                    >
                      {row.delivered ? 'Delivered' : 'Failed'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-email-logs-footer">
        <button
          type="button"
          className="admin-mass-email-pager-btn"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span className="admin-email-logs-footer__meta">
          {loading ? 'Loading…' : `${pageStart}–${pageEnd} of ${total.toLocaleString()}`}
        </span>
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
  )
}

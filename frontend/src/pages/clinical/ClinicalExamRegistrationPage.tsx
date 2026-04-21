import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import { useAccount } from '../../context/AccountContext'
import {
  ApiError,
  fetchAcademicTerms,
  fetchStudentClinicalExamRequests,
  postStudentClinicalExamRequest,
  type AcademicTerm,
  type ClinicalExamRequestDto,
} from '../../lib/api'
import { formatMoney } from '../../lib/formatMoney'
import { CLINICAL_EXAMS } from '../../constants/clinicalExams'

function formatDateTimeDisplay(iso: string): string {
  const t = iso.trim()
  if (t === '') return '—'
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return t
  return d.toLocaleString()
}

export function ClinicalExamRegistrationPage() {
  const t = useStudentPortalT()
  const { currentStudentId } = useAccount()
  const sid = currentStudentId?.trim() ?? ''

  const [terms, setTerms] = useState<AcademicTerm[] | null>(null)
  const [termsError, setTermsError] = useState<string | null>(null)
  const [selectedTermId, setSelectedTermId] = useState('')
  const [selectedExamCode, setSelectedExamCode] = useState<string>(CLINICAL_EXAMS[0]!.code)

  const [rows, setRows] = useState<ClinicalExamRequestDto[] | null>(null)
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    if (!sid) {
      setRows(null)
      return
    }
    setListLoading(true)
    setListError(null)
    try {
      const data = await fetchStudentClinicalExamRequests(sid)
      setRows(data)
    } catch (e) {
      setRows(null)
      setListError(e instanceof Error ? e.message : t('clinicalExamRegistrationLoadListError'))
    } finally {
      setListLoading(false)
    }
  }, [sid, t])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list = await fetchAcademicTerms()
        if (!cancelled) {
          setTerms(list)
          setSelectedTermId((prev) => (prev !== '' ? prev : list[0]?.id ?? ''))
        }
      } catch (e) {
        if (!cancelled) {
          setTerms(null)
          setTermsError(e instanceof Error ? e.message : t('couldNotLoadTerms'))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const selectedTerm = useMemo(
    () => (terms ?? []).find((x) => x.id === selectedTermId) ?? null,
    [terms, selectedTermId],
  )

  const onRequest = async () => {
    if (!sid || !selectedTerm) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await postStudentClinicalExamRequest(sid, {
        examCode: selectedExamCode,
        term: selectedTerm.term_name,
        year: selectedTerm.year,
      })
      await loadList()
    } catch (e) {
      if (e instanceof ApiError) {
        const body = e.body as { error?: string }
        setSubmitError(
          typeof body?.error === 'string' ? body.error : t('clinicalExamRegistrationRequestError'),
        )
      } else {
        setSubmitError(e instanceof Error ? e.message : t('clinicalExamRegistrationRequestError'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const showEmptyAccount = !sid

  return (
    <main className="portal-page">
      <h2 className="portal-section-heading">{t('clinicalExamRegistrationHeading')}</h2>
      <p className="portal-page-lede">{t('clinicalExamRegistrationLede')}</p>

      {showEmptyAccount ? (
        <p className="portal-page-lede" role="status">
          {t('clinicalExamNoAccount')}
        </p>
      ) : null}

      {termsError ? (
        <p className="portal-page-lede" role="alert">
          {termsError}
        </p>
      ) : null}

      {!showEmptyAccount ? (
        <section className="portal-stack" style={{ maxWidth: '36rem' }}>
          <div className="portal-field-stack">
            <label className="portal-label" htmlFor="clinical-exam-term">
              {t('clinicalExamRegistrationSelectTerm')}
            </label>
            <select
              id="clinical-exam-term"
              className="portal-input"
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              disabled={!terms || terms.length === 0}
            >
              {!terms || terms.length === 0 ? (
                <option value="">{t('clinicalExamSelectTermPlaceholder')}</option>
              ) : (
                terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.term_label} ({term.term_name} {term.year})
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="portal-field-stack">
            <label className="portal-label" htmlFor="clinical-exam-code">
              {t('clinicalExamRegistrationSelectExam')}
            </label>
            <select
              id="clinical-exam-code"
              className="portal-input"
              value={selectedExamCode}
              onChange={(e) => setSelectedExamCode(e.target.value)}
            >
              {CLINICAL_EXAMS.map((ex) => (
                <option key={ex.code} value={ex.code}>
                  {ex.code} — {ex.name}
                </option>
              ))}
            </select>
          </div>
          {submitError ? (
            <p className="portal-page-lede" role="alert">
              {submitError}
            </p>
          ) : null}
          <button
            type="button"
            className="portal-btn portal-btn--primary"
            disabled={submitting || !selectedTerm}
            onClick={() => void onRequest()}
          >
            {submitting ? t('clinicalExamRegistrationRequesting') : t('clinicalExamRegistrationRequestBtn')}
          </button>
        </section>
      ) : null}

      {!showEmptyAccount ? (
        <section className="portal-stack" style={{ marginTop: '2rem' }}>
          <h3 className="portal-section-heading" style={{ fontSize: '1.1rem' }}>
            {t('clinicalExamRegistrationRequestsSubheading')}
          </h3>
          {listError ? (
            <p className="portal-page-lede" role="alert">
              {listError}
            </p>
          ) : null}
          {listLoading ? (
            <p className="portal-page-lede" aria-live="polite">
              {t('clinicalExamRegistrationLoading')}
            </p>
          ) : null}
          {!listLoading && rows && rows.length === 0 ? (
            <p className="portal-page-lede">{t('clinicalExamRegistrationEmpty')}</p>
          ) : null}
          {!listLoading && rows && rows.length > 0 ? (
            <div className="portal-table-wrap">
              <table className="portal-table" aria-label={t('clinicalExamTableAria')}>
                <thead>
                  <tr>
                    <th scope="col">{t('clinicalExamColExam')}</th>
                    <th scope="col">{t('clinicalExamColStatus')}</th>
                    <th scope="col">{t('clinicalExamColRequestedAt')}</th>
                    <th scope="col">{t('clinicalExamColAssignedDate')}</th>
                    <th scope="col">{t('clinicalExamColFee')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.examCode} — {r.examName}
                      </td>
                      <td>{r.status}</td>
                      <td>{formatDateTimeDisplay(r.createdAt)}</td>
                      <td>
                        {r.assignedExamDate
                          ? `${r.assignedExamDate}${r.assignedExamTime ? ` · ${r.assignedExamTime}` : ''}`
                          : '—'}
                      </td>
                      <td>{formatMoney(r.registrationFeeUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import { useAccount } from '../../../context/AccountContext'
import {
  fetchStudentProfile,
  submitStudentDocumentAgreement,
  type StudentDocumentRequirement,
} from '../../../lib/api'

type AgreementsSectionProps = {
  studentId: string
  academicTermId: string
  requirement: StudentDocumentRequirement | undefined
  onRefresh: () => Promise<void>
}

export function AgreementsSection({
  studentId,
  academicTermId,
  requirement,
  onRefresh,
}: AgreementsSectionProps) {
  const t = useStudentPortalT()
  const { account } = useAccount()
  const [profileName, setProfileName] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitInFlightRef = useRef(false)

  useEffect(() => {
    const id = studentId.trim()
    if (!id) {
      setProfileName(null)
      return
    }
    const ac = new AbortController()
    fetchStudentProfile(id, { signal: ac.signal })
      .then((p) => setProfileName(p.fullName?.trim() || null))
      .catch(() => setProfileName(null))
    return () => ac.abort()
  }, [studentId])

  const displayName = useMemo(() => {
    const n = profileName || account.student.name?.trim()
    return n && n.length > 0 ? n : t('documentsAgreementStudentPlaceholder')
  }, [profileName, account.student.name, t])

  const completed = requirement?.status === 'completed'

  const closing = useMemo(() => {
    return t('copyrightReleaseClosing').replace('{{NAME}}', displayName)
  }, [displayName, t])

  const copyrightParagraphs = useMemo(
    () => [t('copyrightReleasePara1'), t('copyrightReleasePara2'), t('copyrightReleasePara3')],
    [t],
  )

  const handleSubmit = useCallback(async () => {
    if (!agreed || completed || submitInFlightRef.current) return
    const sid = studentId.trim()
    const tid = academicTermId.trim()
    if (!sid || !tid) {
      setError(t('documentsAgreementMissingStudentTerm'))
      return
    }
    submitInFlightRef.current = true
    setError(null)
    setSubmitting(true)
    try {
      console.debug('[documents] agreement submit → POST /documents/agreement/submit', {
        studentId: sid,
        academicTermId: tid,
      })
      const res = await submitStudentDocumentAgreement(sid, tid)
      console.debug('[documents] agreement submit ← response', res)
      await onRefresh()
      setAgreed(false)
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t('documentsAgreementSubmitFailed')
      setError(message)
    } finally {
      submitInFlightRef.current = false
      setSubmitting(false)
    }
  }, [academicTermId, agreed, completed, onRefresh, studentId, t])

  const submittedLabel = completed
    ? t('documentsAgreementSubmittedYes')
    : t('documentsAgreementSubmittedNo')

  return (
    <div className="portal-documents-agreements">
      <div className="portal-doc-quiz-entry-card">
        <div className="portal-doc-quiz-entry-card__row">
          <div className="portal-doc-quiz-entry-card__text">
            <p className="portal-doc-quiz-entry-card__title">{t('documentsCopyrightAgreementTitle')}</p>
            <p className="portal-doc-quiz-entry-card__desc">{t('documentsCopyrightAgreementDesc')}</p>
            <p className="portal-inline-note portal-inline-note--flush">
              <strong>{submittedLabel}</strong>
            </p>
          </div>
          <div className="portal-doc-quiz-entry-card__aside">
            {completed ? (
              <span
                className="portal-doc-quiz-entry-card__completed"
                aria-label={t('documentsAgreementCompletedAria')}
              >
                {t('documentsAgreementCompleted')}
              </span>
            ) : null}
            <button
              type="button"
              className="portal-tab portal-doc-quiz-tab"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? t('documentsAgreementHide') : t('documentsAgreementView')}
            </button>
          </div>
        </div>
        {error ? (
          <p className="portal-inline-note portal-inline-note--flush" role="alert">
            {error}
          </p>
        ) : null}
        {expanded ? (
          <div className="portal-doc-quiz-entry-card__expand">
            <div className="portal-doc-quiz-expand-form">
              <div className="portal-doc-quiz-expand-form__inner portal-documents-agreement-body">
                <img
                  className="portal-documents-agreement-body__logo"
                  src="/AMULogo.png"
                  alt={t('alhambraMedicalUniversityAlt')}
                />
                <h4 className="portal-documents-agreement-body__title">
                  {t('documentsAgreementBodyTitle')}
                </h4>
                {copyrightParagraphs.map((para, i) => (
                  <p key={i} className="portal-documents-agreement-body__para">
                    {para.split('\n').map((line, j, arr) => (
                      <span key={j}>
                        {line}
                        {j < arr.length - 1 ? <br /> : null}
                      </span>
                    ))}
                  </p>
                ))}
                <p className="portal-documents-agreement-body__para">{closing}</p>
                <p className="portal-documents-agreement-body__para">{t('copyrightReleaseSubmitNote')}</p>

                {completed ? (
                  <p className="portal-documents-agreement-body__success" role="status">
                    {t('documentsAgreementSubmittedOnFile')}
                  </p>
                ) : (
                  <div className="portal-documents-agreement-body__actions">
                    <label className="portal-documents-agreement-body__check">
                      <input
                        type="checkbox"
                        checked={agreed}
                        disabled={submitting}
                        onChange={(e) => setAgreed(e.target.checked)}
                      />
                      <span>{t('documentsAgreementCheckboxLabel')}</span>
                    </label>
                    <button
                      type="button"
                      className="portal-btn portal-btn--secondary portal-documents-agreement-body__submit"
                      disabled={!agreed || submitting}
                      onClick={() => {
                        void handleSubmit()
                      }}
                    >
                      {submitting ? t('submittingEllipsis') : t('submitButton')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

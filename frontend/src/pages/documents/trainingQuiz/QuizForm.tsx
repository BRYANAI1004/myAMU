import { useMemo } from 'react'
import { useStudentPortalT } from '@/LanguageContext'
import type { Quiz } from '../../../data/documentQuizzes'
import { CertificationCheckbox } from './CertificationCheckbox'
import { QuizQuestion } from './QuizQuestion'
import { SubmitButton } from './SubmitButton'

type QuizFormProps = {
  quiz: Quiz
  answers: Record<string, string>
  certificationChecked: boolean
  completed: boolean
  submitting: boolean
  incorrectQuestionIds: string[]
  onAnswerChange: (questionId: string, option: string) => void
  onCertificationChange: (next: boolean) => void
  onSubmit: () => void
}

export function QuizForm({
  quiz,
  answers,
  certificationChecked,
  completed,
  submitting,
  incorrectQuestionIds,
  onAnswerChange,
  onCertificationChange,
  onSubmit,
}: QuizFormProps) {
  const t = useStudentPortalT()
  const allAnswered = useMemo(
    () => quiz.questions.every((q) => Boolean(answers[q.id]?.trim())),
    [quiz.questions, answers],
  )

  const canSubmit =
    allAnswered && certificationChecked && !completed && !submitting
  const checkboxId = `doc-quiz-cert-${quiz.id}`
  const incorrectSet = useMemo(
    () => new Set(incorrectQuestionIds),
    [incorrectQuestionIds],
  )
  const showIncorrectHint = !completed && incorrectSet.size > 0

  return (
    <div className="portal-doc-quiz-expand-form">
      <form
        className="portal-doc-quiz-expand-form__inner"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSubmit) {
            console.debug('[documents] quiz form: submitting', { quizId: quiz.id })
            onSubmit()
          }
        }}
        noValidate
      >
        {showIncorrectHint ? (
          <p className="portal-inline-note portal-inline-note--flush" role="alert">
            {t('documentsQuizCorrectHighlighted')}
          </p>
        ) : null}

        <div className="portal-doc-quiz-questions">
          {quiz.questions.map((q, index) => (
            <QuizQuestion
              key={q.id}
              quizId={quiz.id}
              question={q}
              index={index}
              value={answers[q.id]}
              onChange={onAnswerChange}
              disabled={completed || submitting}
              hasIncorrectAnswer={incorrectSet.has(q.id)}
            />
          ))}
        </div>

        <CertificationCheckbox
          certificationText={quiz.certificationText}
          checkboxLabel={t('documentsQuizCertifyTrainingCheckbox')}
          checked={certificationChecked}
          onChange={onCertificationChange}
          disabled={completed || submitting}
          checkboxId={checkboxId}
        />

        {!completed && (!allAnswered || !certificationChecked) ? (
          <p className="portal-doc-quiz-hint" role="status">
            {t('documentsQuizValidationHint')}
          </p>
        ) : null}

        <div className="portal-doc-quiz-actions">
          <SubmitButton disabled={completed || !canSubmit} loading={submitting}>
            {completed
              ? t('documentsQuizSubmittedBadge')
              : submitting
                ? t('submittingEllipsis')
                : t('submitButton')}
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}

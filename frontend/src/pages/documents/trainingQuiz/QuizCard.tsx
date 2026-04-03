import type { Quiz } from '../../../data/documentQuizzes'
import { QuizForm } from './QuizForm'

type QuizCardProps = {
  quiz: Quiz
  expanded: boolean
  completed: boolean
  answers: Record<string, string>
  certificationChecked: boolean
  onToggleExpand: () => void
  onAnswerChange: (questionId: string, option: string) => void
  onCertificationChange: (next: boolean) => void
  onSubmit: () => void
}

export function QuizCard({
  quiz,
  expanded,
  completed,
  answers,
  certificationChecked,
  onToggleExpand,
  onAnswerChange,
  onCertificationChange,
  onSubmit,
}: QuizCardProps) {
  const toggleLabel = expanded ? 'Close' : 'Start Quiz'

  return (
    <article
      className="portal-doc-quiz-entry-card"
      aria-expanded={expanded}
    >
      <div className="portal-doc-quiz-entry-card__row">
        <div className="portal-doc-quiz-entry-card__text">
          <h3 className="portal-doc-quiz-entry-card__title">{quiz.title}</h3>
          <p className="portal-doc-quiz-entry-card__desc">{quiz.description}</p>
        </div>
        <div className="portal-doc-quiz-entry-card__aside">
          {completed ? (
            <span className="portal-doc-quiz-entry-card__completed" aria-label="Completed">
              Completed
            </span>
          ) : null}
          <button
            type="button"
            className="portal-btn portal-btn--secondary portal-doc-quiz-row__action"
            aria-expanded={expanded}
            aria-controls={`doc-quiz-expand-${quiz.id}`}
            id={`doc-quiz-trigger-${quiz.id}`}
            onClick={onToggleExpand}
          >
            {toggleLabel}
          </button>
        </div>
      </div>
      {expanded ? (
        <div
          id={`doc-quiz-expand-${quiz.id}`}
          role="region"
          aria-labelledby={`doc-quiz-trigger-${quiz.id}`}
          className="portal-doc-quiz-entry-card__expand"
        >
          <QuizForm
            quiz={quiz}
            answers={answers}
            certificationChecked={certificationChecked}
            completed={completed}
            onAnswerChange={onAnswerChange}
            onCertificationChange={onCertificationChange}
            onSubmit={onSubmit}
          />
        </div>
      ) : null}
    </article>
  )
}

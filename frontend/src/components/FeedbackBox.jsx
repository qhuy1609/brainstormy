import MathText from './MathText.jsx'

export default function FeedbackBox({ feedback }) {
  const isCorrect = feedback.correct

  return (
    <div className={`card feedback-card ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`}>
      <div className="feedback-header">
        <span className={`feedback-icon ${isCorrect ? 'icon-correct' : 'icon-wrong'}`}>
          {isCorrect ? '\u2713' : '\u2717'}
        </span>
        <span className="feedback-label">{isCorrect ? 'Correct!' : 'Not quite right'}</span>
      </div>
      <div className="feedback-text"><MathText>{feedback.feedback}</MathText></div>
      {isCorrect && feedback.explanation && (
        <div className="explanation-box">
          <strong>Explanation:</strong>
          <MathText>{feedback.explanation}</MathText>
        </div>
      )}
      {!isCorrect && feedback.hints_remaining !== undefined && feedback.hints_remaining > 0 && (
        <p className="feedback-hint-note">
          You have {feedback.hints_remaining} more {feedback.hints_remaining === 1 ? 'hint' : 'hints'} available.
        </p>
      )}
      {!isCorrect && feedback.hints_remaining !== undefined && feedback.hints_remaining === 0 && (
        <p className="feedback-hint-note">
          No more hints available. Try again or reveal the answer.
        </p>
      )}
    </div>
  )
}

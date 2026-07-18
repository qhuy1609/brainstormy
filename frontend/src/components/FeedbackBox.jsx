export default function FeedbackBox({ feedback }) {
  const diagnosis = feedback.diagnosis || feedback
  const workingLabels = {
    right_way: 'Right way',
    wrong_way: 'Wrong way',
    not_provided: 'Not provided',
  }
  const answerLabels = {
    correct: 'Correct',
    incorrect: 'Incorrect',
    not_provided: 'Not provided',
  }

  return (
    <section className="card feedback-card feedback-neutral" aria-label="Feedback">
      <span className="card-label">Feedback</span>
      <div className="feedback-verdict">
        <span>Working</span>
        <strong>{workingLabels[diagnosis.working_verdict]}</strong>
      </div>
      <div className="feedback-verdict">
        <span>Answer</span>
        <strong>{answerLabels[diagnosis.answer_verdict]}</strong>
      </div>
    </section>
  )
}

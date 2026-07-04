import { useState } from 'react'

export default function AttemptBox({ onSubmit, loading, disabled }) {
  const [answer, setAnswer] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!answer.trim() || loading || disabled) return
    onSubmit(answer.trim())
    setAnswer('')
  }

  return (
    <form className="attempt-form" onSubmit={handleSubmit}>
      <label className="input-label" htmlFor="attempt-input">Your Answer</label>
      <div className="attempt-row">
        <textarea
          id="attempt-input"
          className="attempt-input"
          placeholder="Type your answer here..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={loading || disabled}
          rows={2}
        />
        <button
          type="submit"
          className="btn btn-primary btn-submit-attempt"
          disabled={!answer.trim() || loading || disabled}
        >
          {loading ? <span className="spinner" /> : 'Submit Attempt'}
        </button>
      </div>
    </form>
  )
}

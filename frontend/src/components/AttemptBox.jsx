import { useState } from 'react'

export default function AttemptBox({ onSubmit, loading, disabled, label = 'Your response', placeholder = 'Show your reasoning here...', submitLabel = 'Check my answer' }) {
  const [answer, setAnswer] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!answer.trim() || loading || disabled) return
    onSubmit(answer.trim())
    setAnswer('')
  }

  return (
    <form className="attempt-form" onSubmit={handleSubmit}>
      <label className="input-label" htmlFor="attempt-input">{label}</label>
      <div className="attempt-row">
        <textarea
          id="attempt-input"
          className="attempt-input"
          placeholder={placeholder}
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
          {loading ? <span className="spinner" /> : submitLabel}
        </button>
      </div>
    </form>
  )
}

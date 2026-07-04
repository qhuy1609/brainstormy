import { useState } from 'react'
import ProgressBar from './ProgressBar.jsx'
import HintCard from './HintCard.jsx'
import AttemptBox from './AttemptBox.jsx'
import FeedbackBox from './FeedbackBox.jsx'
import MathText from './MathText.jsx'
import { fetchSessionState, requestHint, submitAttempt, revealAnswer } from '../api/learningApi.js'

export default function SessionView({ initialSession, onReset, onError }) {
  const [session, setSession] = useState(initialSession)
  const [hintLoading, setHintLoading] = useState(false)
  const [attemptLoading, setAttemptLoading] = useState(false)
  const [revealLoading, setRevealLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [revealedAnswer, setRevealedAnswer] = useState(null)
  const [revealError, setRevealError] = useState('')
  const [maxHintsReached, setMaxHintsReached] = useState(false)

  const isCompleted = session.status === 'completed'
  const currentPart = session.current_sub_question_index + 1
  const totalParts = session.total_sub_questions

  // Refresh session state from backend
  const refresh = async () => {
    try {
      const data = await fetchSessionState(session.session_id)
      setSession(data)
    } catch (err) {
      onError(err.message)
    }
  }

  // When feedback comes in with next sub-question, update session
  const handleAttemptResult = (result) => {
    setFeedback(result)
    if (result.correct && !result.session_completed && result.next_sub_question) {
      setSession(prev => ({
        ...prev,
        current_sub_question_index: result.next_sub_question_index,
        current_sub_question: result.next_sub_question,
        current_hint_level: result.next_hint_level,
        current_hint: result.next_hint,
      }))
      setFeedback(prev => ({ ...prev, _autoAdvanced: true }))
    }
    if (result.session_completed) {
      setSession(prev => ({ ...prev, status: 'completed' }))
    }
    // Clear reveal state for new sub-question
    setRevealedAnswer(null)
    setRevealError('')
    setMaxHintsReached(false)
  }

  const handleHint = async () => {
    setHintLoading(true)
    try {
      const data = await requestHint(session.session_id)
      if (data.max_hints_reached) {
        setMaxHintsReached(true)
      }
      setSession(prev => ({
        ...prev,
        current_hint_level: data.hint_level,
        current_hint: data.hint,
      }))
    } catch (err) {
      onError(err.message)
    } finally {
      setHintLoading(false)
    }
  }

  const handleAttempt = async (answer) => {
    setAttemptLoading(true)
    setFeedback(null)
    try {
      const result = await submitAttempt(session.session_id, answer)
      handleAttemptResult(result)
    } catch (err) {
      onError(err.message)
    } finally {
      setAttemptLoading(false)
    }
  }

  const handleReveal = async () => {
    setRevealLoading(true)
    setRevealError('')
    try {
      const data = await revealAnswer(session.session_id)
      setRevealedAnswer(data.answer)
    } catch (err) {
      setRevealError(err.message)
    } finally {
      setRevealLoading(false)
    }
  }

  if (isCompleted) {
    return (
      <div className="session-complete">
        <div className="card complete-card">
          <div className="complete-icon">&#10003;</div>
          <h2>Session Complete</h2>
          <p>You worked through {totalParts} {totalParts === 1 ? 'question' : 'questions'}. Great job thinking it through!</p>
          {feedback && feedback.explanation && (
            <div className="explanation-box">
              <strong>Explanation:</strong>
              <MathText>{feedback.explanation}</MathText>
            </div>
          )}
          <button className="btn btn-primary btn-new-session" onClick={onReset}>
  Start New Session
</button>
        </div>
      </div>
    )
  }

  return (
    <div className="session-view">
      <ProgressBar current={currentPart} total={totalParts} />

      <div className="card question-display-card">
        <div className="card-label">Question</div>
        <div className="question-display-text"><MathText>{session.cleaned_question}</MathText></div>
      </div>

      <div className="card sub-question-card">
        <div className="card-label">
          {totalParts > 1 ? `Part ${currentPart} of ${totalParts}` : 'Your Task'}
        </div>
        <div className="sub-question-text"><MathText>{session.current_sub_question}</MathText></div>
      </div>

      <HintCard
        level={session.current_hint_level + 1}
        text={session.current_hint}
        loading={hintLoading}
        maxReached={maxHintsReached}
      />

      <button
        className="btn btn-secondary btn-hint"
        onClick={handleHint}
        disabled={hintLoading || maxHintsReached || isCompleted}
      >
        {hintLoading ? <span className="spinner" /> : 'Get Next Hint'}
      </button>

      {maxHintsReached && (
        <p className="max-hints-note">All hints used. Try submitting an answer.</p>
      )}

      <AttemptBox
        onSubmit={handleAttempt}
        loading={attemptLoading}
        disabled={isCompleted}
      />

      {feedback && <FeedbackBox feedback={feedback} />}

      <div className="reveal-section">
        <button
          className="btn btn-ghost btn-reveal"
          onClick={handleReveal}
          disabled={revealLoading || isCompleted}
        >
          {revealLoading ? <span className="spinner" /> : 'Reveal Answer'}
        </button>

        {revealedAnswer && (
          <div className="card reveal-card">
            <div className="card-label">Final Answer</div>
            <div className="reveal-answer-text"><MathText>{revealedAnswer}</MathText></div>
          </div>
        )}

        {revealError && (
          <p className="reveal-error">{revealError}</p>
        )}
      </div>

      <button className="btn btn-ghost btn-back" onClick={onReset}>
        Back to Input
      </button>
    </div>
  )
}

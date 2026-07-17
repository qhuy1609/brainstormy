import { useState } from 'react'
import HintCard from './HintCard.jsx'
import AttemptBox from './AttemptBox.jsx'
import FeedbackBox from './FeedbackBox.jsx'
import MathText from './MathText.jsx'
import { isSymbolicFinalAnswer } from '../utils/normalizeAiText.js'
import ConceptTags from './ConceptTags.jsx'
import IdeaSessionView from './IdeaSessionView.jsx'
import { fetchSessionState, requestHint, submitAttempt, revealAnswer } from '../api/learningApi.js'

export default function SessionView({ initialSession, onReset, onError }) {
  if (initialSession.mode === 'idea') {
    return <IdeaSessionView initialSession={initialSession} onReset={onReset} onError={onError} />
  }

  const [session, setSession] = useState(initialSession)
  const [hintLoading, setHintLoading] = useState(false)
  const [attemptLoading, setAttemptLoading] = useState(false)
  const [revealLoading, setRevealLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [revealedAnswer, setRevealedAnswer] = useState(null)
  const [revealError, setRevealError] = useState('')
  const [maxHintsReached, setMaxHintsReached] = useState(false)

  const isCompleted = session.status === 'completed'
  const recommendedAction = feedback?.diagnosis?.next_action

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
      if (data.max_hints_reached) setMaxHintsReached(true)
      setSession(prev => ({
        ...prev,
        stage: data.stage || prev.stage,
        current_hint_title: data.hint?.type === 'targeted' ? 'Targeted hint' : 'A hint to get started',
        current_hint: data.hint?.content || data.hint,
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
      setRevealedAnswer(data.worked_solution || { full_working: '', final_answer: data.answer })
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
          <p>You worked through the question. Great job thinking it through!</p>
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
      <div className="card question-display-card">
        <div className="card-label">Question</div>
        <div className="sub-question-text"><MathText>{session.question}</MathText></div>
        <ConceptTags concepts={session.requiredConcepts} />
      </div>

      {session.current_hint && <HintCard
        level={session.current_hint_level + 1}
        title={session.current_hint_title}
        text={session.current_hint}
        loading={hintLoading}
        maxReached={maxHintsReached}
      />}

      <AttemptBox
        onSubmit={handleAttempt}
        onHint={handleHint}
        onReveal={handleReveal}
        loading={attemptLoading}
        hintLoading={hintLoading}
        revealLoading={revealLoading}
        disabled={isCompleted}
        revealDisabled={!session.attempt_count && !feedback}
        recommended={recommendedAction === 'revise'}
        hintRecommended={recommendedAction === 'hint'}
        solutionRecommended={recommendedAction === 'solution'}
        label={session.response_type?.kind === 'calculation' ? 'Your working' : (session.response_type?.label || 'Your reasoning')}
        placeholder={session.response_type?.placeholder || 'Show the key steps in your thinking.'}
        submitLabel={feedback ? 'Check revised answer' : 'Check my answer'}
        hintLabel={feedback ? 'Give me a targeted hint' : "I'm stuck - give me a hint"}
        solutionLabel="Show worked solution"
      />

      {feedback && <FeedbackBox feedback={feedback} />}

      <div className="reveal-section">
        {revealedAnswer && (
          <div className="card reveal-card">
            <div className="card-label">Worked solution</div>
            {revealedAnswer.full_working && <div className="solution-full-working"><MathText>{revealedAnswer.full_working}</MathText></div>}
            {revealedAnswer.final_answer && (
              <div className="solution-final-answer">
                <span className="solution-final-label">Final answer</span>
                {isSymbolicFinalAnswer(revealedAnswer.final_answer)
                  ? <MathText>{revealedAnswer.final_answer}</MathText>
                  : <span className="solution-final-value">{revealedAnswer.final_answer}</span>}
              </div>
            )}
          </div>
        )}

        {revealError && (
          <p className="reveal-error">{revealError}</p>
        )}
      </div>

      <button type="button" className="btn-back" onClick={onReset}>
        back to input
      </button>
    </div>
  )
}

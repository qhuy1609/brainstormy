import { useState } from 'react'
import ProgressBar from './ProgressBar.jsx'
import HintCard from './HintCard.jsx'
import AttemptBox from './AttemptBox.jsx'
import FeedbackBox from './FeedbackBox.jsx'
import MathText from './MathText.jsx'
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
  const currentPart = session.current_sub_question_index + 1
  const totalParts = session.total_sub_questions
  const isIdeaMode = session.mode === 'idea'

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
        current_hint_title: result.next_hint_title,
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
      setRevealedAnswer(data.worked_solution || { final_answer: data.answer, steps: [] })
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
          <p>You worked through {totalParts} {totalParts === 1 ? (isIdeaMode ? 'idea' : 'question') : (isIdeaMode ? 'ideas' : 'questions')}. Great job thinking it through!</p>
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
      {totalParts > 1 && <ProgressBar current={currentPart} total={totalParts} />}
      <div className="card question-display-card">
        <div className="card-label">{totalParts > 1 ? `Part ${currentPart} of ${totalParts}` : 'Question'}</div>
        <div className="sub-question-text"><MathText>{session.current_sub_question}</MathText></div>
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
        loading={attemptLoading}
        disabled={isCompleted}
        label={session.response_type?.label || 'Your reasoning'}
        placeholder={session.response_type?.placeholder || 'Show the key steps in your thinking.'}
        submitLabel={feedback ? 'Check revised answer' : 'Check my answer'}
      />

      <button className="btn btn-secondary btn-hint" onClick={handleHint} disabled={hintLoading || isCompleted}>
        {hintLoading ? <span className="spinner" /> : (feedback ? 'Give me a targeted hint' : "I'm stuck — give me a hint")}
      </button>

      {feedback && <FeedbackBox feedback={feedback} />}

      <div className="reveal-section">
        <button
          className="btn btn-ghost btn-reveal"
          onClick={handleReveal}
          disabled={revealLoading || isCompleted || !session.attempt_count && !feedback}
        >
          {revealLoading ? <span className="spinner" /> : 'Show worked solution'}
        </button>

        {revealedAnswer && (
          <div className="card reveal-card">
            <div className="card-label">Worked solution</div>
            {revealedAnswer.summary && <div className="solution-overview"><MathText>{revealedAnswer.summary}</MathText></div>}
            <ol className="worked-solution-steps">
              {revealedAnswer.steps?.map((step) => <li key={step.title}><h3>{step.title}</h3><MathText>{step.explanation}</MathText>{step.expression && <div className="solution-expression"><MathText>{step.expression}</MathText></div>}</li>)}
            </ol>
            <div className="solution-final-answer"><span>Final answer</span><MathText>{revealedAnswer.final_answer}</MathText></div>
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

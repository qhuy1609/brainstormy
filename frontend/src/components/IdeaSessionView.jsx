import { Fragment, useEffect, useState } from 'react'
import MathText from './MathText.jsx'
import {
  developSelectedIdeas,
  generateIdeasNow,
  submitDiscoveryAnswers,
} from '../api/learningApi.js'

function answerKey(questions) {
  return questions.map((question) => question.id).join('|')
}

export default function IdeaSessionView({ initialSession, onReset, onError }) {
  const [session, setSession] = useState(initialSession)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)
  const [selectedIdeas, setSelectedIdeas] = useState([])
  const flow = session.idea_flow
  const questions = flow.questions || []
  const isDiscovery = questions.length > 0

  useEffect(() => {
    setAnswers({})
    setSelectedIdeas([])
  }, [answerKey(questions)])

  const updateAnswer = (questionId, updater) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: updater(current[questionId] || { selected_options: [], custom_answer: '' }),
    }))
  }

  const toggleOption = (question, option) => {
    updateAnswer(question.id, (answer) => {
      const selected = answer.selected_options || []
      const next = question.type === 'single_select'
        ? [option]
        : (selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])
      return { ...answer, selected_options: next }
    })
  }

  const submitAnswers = async () => {
    const payload = questions.map((question) => ({
      question_id: question.id,
      selected_options: answers[question.id]?.selected_options || [],
      custom_answer: answers[question.id]?.custom_answer || '',
    }))
    setLoading(true)
    try {
      setSession(await submitDiscoveryAnswers(session.session_id, payload))
    } catch (error) {
      onError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const generateNow = async () => {
    setLoading(true)
    try {
      setSession(await generateIdeasNow(session.session_id))
    } catch (error) {
      onError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleIdea = (ideaId) => {
    setSelectedIdeas((current) => {
      if (current.includes(ideaId)) return current.filter((id) => id !== ideaId)
      return current.length === 2 ? current : [...current, ideaId]
    })
  }

  const developIdeas = async () => {
    setLoading(true)
    try {
      setSession(await developSelectedIdeas(session.session_id, selectedIdeas))
    } catch (error) {
      onError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="idea-session-view" aria-live="polite">
      <div className="idea-progress">
        <span>Discovery round {Math.min(flow.round, flow.max_rounds)} of {flow.max_rounds}</span>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${(Math.min(flow.round, flow.max_rounds) / flow.max_rounds) * 100}%` }} /></div>
      </div>

      <div className="card idea-summary-card">
        <span className="card-label">Your direction so far</span>
        <p>{flow.summary}</p>
        <p className="idea-deliverable">Creating: {flow.task_profile?.requested_deliverable}</p>
        {Object.keys(flow.known_context || {}).length > 0 && (
          <div className="idea-context-list">
            {Object.entries(flow.known_context).map(([key, values]) => (
              <span key={key} className="idea-context-chip">{values.join(', ')}</span>
            ))}
          </div>
        )}
      </div>

      {isDiscovery && (
        <>
          <div className="idea-question-intro">
            <h2>A few choices to shape the ideas</h2>
            <p>{flow.reason}</p>
          </div>
          {questions.map((question) => {
            const answer = answers[question.id] || { selected_options: [], custom_answer: '' }
            const showCustom = question.type === 'short_text' || answer.selected_options.includes('Other')
            return (
              <article key={question.id} className="card idea-question-card">
                <h3>{question.question}</h3>
                {question.type !== 'short_text' && (
                  <div className="idea-option-list">
                    {question.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`idea-option ${answer.selected_options.includes(option) ? 'is-selected' : ''}`}
                        onClick={() => toggleOption(question, option)}
                        aria-pressed={answer.selected_options.includes(option)}
                        disabled={loading}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                {showCustom && (
                  <textarea
                    className="attempt-input idea-custom-answer"
                    aria-label={`Custom answer for ${question.question}`}
                    placeholder="Add your answer..."
                    value={answer.custom_answer}
                    onChange={(event) => updateAnswer(question.id, (current) => ({ ...current, custom_answer: event.target.value }))}
                    disabled={loading}
                    rows="2"
                  />
                )}
              </article>
            )
          })}
          <div className="idea-actions">
            <button type="button" className="btn btn-primary" onClick={submitAnswers} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Continue'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={generateNow} disabled={loading}>
              Generate ideas now
            </button>
          </div>
        </>
      )}

      {flow.assumptions?.length > 0 && flow.ideas?.length > 0 && (
        <div className="card idea-assumptions-card">
          <span className="card-label">Assumptions used</span>
          <ul>{flow.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
        </div>
      )}

      {flow.ideas?.length > 0 && (
        <section className="idea-results">
          <div className="idea-results-header">
            <div><span className="card-label">Personalised ideas</span><h2>Choose up to two to develop</h2></div>
            <button type="button" className="btn btn-ghost" onClick={onReset}>Start over</button>
          </div>
          {flow.ideas.map((idea) => (
            <article key={idea.id} className={`card idea-card ${selectedIdeas.includes(idea.id) ? 'is-selected' : ''}`}>
              <div className="idea-card-heading">
                <div><h3>{idea.name}</h3><span className={`idea-difficulty difficulty-${idea.difficulty}`}>{idea.difficulty}</span></div>
                <button type="button" className="btn btn-secondary" onClick={() => toggleIdea(idea.id)} disabled={loading || (!selectedIdeas.includes(idea.id) && selectedIdeas.length === 2)}>
                  {selectedIdeas.includes(idea.id) ? 'Selected' : 'Select'}
                </button>
              </div>
              <p className="idea-concept"><MathText>{idea.concept}</MathText></p>
              <dl className="idea-details">
                {idea.details.map((detail) => <Fragment key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></Fragment>)}
                <dt>Why it fits</dt><dd>{idea.why_it_fits}</dd>
                <dt>Distinctive angle</dt><dd>{idea.distinctive_angle}</dd>
              </dl>
              <p className="idea-next-step">Next step: {idea.next_step}</p>
              {idea.risk_or_consideration && <p className="idea-risk">Consideration: {idea.risk_or_consideration}</p>}
            </article>
          ))}
          <button type="button" className="btn btn-primary idea-develop-button" onClick={developIdeas} disabled={loading || selectedIdeas.length === 0}>
            {loading ? <span className="spinner" /> : `Develop ${selectedIdeas.length === 2 ? 'these ideas' : 'selected idea'}`}
          </button>
        </section>
      )}

      {flow.development_brief && (
        <section className="card idea-brief-card">
          <span className="card-label">Development brief</span>
          <h2>{flow.development_brief.title}</h2>
          <p>{flow.development_brief.summary}</p>
          <h3>Recommended plan</h3><p>{flow.development_brief.recommended_direction}</p>
          <h3>Focus areas</h3><ol>{flow.development_brief.focus_areas.map((item) => <li key={item}>{item}</li>)}</ol>
          <h3>Next steps</h3><ol>{flow.development_brief.next_steps.map((item) => <li key={item}>{item}</li>)}</ol>
          <h3>Review it</h3><p>{flow.development_brief.review_step}</p>
        </section>
      )}

      {!isDiscovery && flow.ideas?.length === 0 && (
        <button type="button" className="btn btn-primary" onClick={generateNow} disabled={loading}>Generate ideas now</button>
      )}
    </section>
  )
}

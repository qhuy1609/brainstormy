import { useState } from 'react'

export default function AttemptBox({
  onSubmit,
  onHint,
  onReveal,
  loading,
  hintLoading,
  revealLoading,
  disabled,
  revealDisabled,
  recommended = false,
  hintRecommended = false,
  solutionRecommended = false,
  label = 'Your response',
  placeholder = 'Show your reasoning here...',
  submitLabel = 'Check my answer',
  hintLabel = "I'm stuck - give me a hint",
  solutionLabel = 'Show worked solution',
}) {
  const [answer, setAnswer] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!answer.trim() || loading || disabled) return
    onSubmit(answer.trim())
    setAnswer('')
  }

  return (
    <form className={`attempt-form ${recommended ? 'is-recommended' : ''}`} onSubmit={handleSubmit}>
      <label className="input-label" htmlFor="attempt-input">{label}</label>
      <div className="attempt-composer">
        <textarea
          id="attempt-input"
          className="attempt-input"
          placeholder={placeholder}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={loading || disabled}
          rows={4}
        />
        <div className="attempt-action-bar">
          <div className="attempt-tools">
            <div className="attempt-tooltip-wrap">
              <button
                type="button"
                className={`attempt-tool-button ${hintRecommended ? 'is-recommended' : ''}`}
                onClick={onHint}
                disabled={hintLoading || disabled}
                aria-label={hintLabel}
                aria-describedby="hint-action-tooltip"
              >
                {hintLoading ? <span className="spinner" /> : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" fillRule="evenodd" d="M9.25 18.709c0-.42.336-.76.75-.76h4c.414 0 .75.34.75.76s-.336.76-.75.76h-4a.755.755 0 0 1-.75-.76m.667 2.532c0-.42.335-.76.75-.76h2.666c.415 0 .75.34.75.76a.754.754 0 0 1-.75.759h-2.666a.755.755 0 0 1-.75-.76" clipRule="evenodd" />
                    <path fill="currentColor" d="m7.41 13.828l1.105 1.053c.31.295.485.707.485 1.137c0 .647.518 1.172 1.157 1.172h3.686c.639 0 1.157-.525 1.157-1.172c0-.43.176-.842.485-1.137l1.104-1.053c1.542-1.48 2.402-3.425 2.41-5.446L19 8.297C19 4.842 15.866 2 12 2S5 4.842 5 8.297v.085c.009 2.021.87 3.966 2.41 5.446" />
                  </svg>
                )}
              </button>
              <span id="hint-action-tooltip" className="attempt-tooltip" role="tooltip">
                <strong>{hintLabel.includes('targeted') ? 'Targeted hint' : 'Get a hint'}</strong>
                <span>{hintLabel.includes('targeted') ? 'Get a focused nudge based on your latest attempt.' : 'Get a small nudge without revealing the answer.'}</span>
              </span>
            </div>

            <div className="attempt-tooltip-wrap">
              <button
                type="button"
                className={`attempt-tool-button ${solutionRecommended ? 'is-recommended' : ''}`}
                onClick={onReveal}
                disabled={revealLoading || disabled || revealDisabled}
                aria-label={solutionLabel}
                aria-describedby="solution-action-tooltip"
              >
                {revealLoading ? <span className="spinner" /> : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" fillRule="evenodd" d="M10.46 1.25h3.08c1.603 0 2.86 0 3.864.095c1.023.098 1.861.3 2.6.752a5.75 5.75 0 0 1 1.899 1.899c.452.738.654 1.577.752 2.6c.095 1.004.095 2.261.095 3.865v1.067c0 1.141 0 2.036-.05 2.759c-.05.735-.153 1.347-.388 1.913a5.75 5.75 0 0 1-3.112 3.112c-.805.334-1.721.408-2.977.43a11 11 0 0 0-.929.036c-.198.022-.275.054-.32.08c-.047.028-.112.078-.224.232c-.121.166-.258.396-.476.764l-.542.916c-.773 1.307-2.69 1.307-3.464 0l-.542-.916a11 11 0 0 0-.476-.764c-.112-.154-.177-.204-.224-.232c-.045-.026-.122-.058-.32-.08c-.212-.023-.49-.03-.93-.037c-1.255-.021-2.171-.095-2.976-.429A5.75 5.75 0 0 1 1.688 16.2c-.235-.566-.338-1.178-.389-1.913c-.049-.723-.049-1.618-.049-2.76v-1.066c0-1.604 0-2.86.095-3.865c.098-1.023.3-1.862.752-2.6a5.75 5.75 0 0 1 1.899-1.899c.738-.452 1.577-.654 2.6-.752C7.6 1.25 8.857 1.25 10.461 1.25M6.739 2.839c-.914.087-1.495.253-1.959.537A4.25 4.25 0 0 0 3.376 4.78c-.284.464-.45 1.045-.537 1.96c-.088.924-.089 2.11-.089 3.761v1c0 1.175 0 2.019.046 2.685c.045.659.131 1.089.278 1.441a4.25 4.25 0 0 0 2.3 2.3c.515.214 1.173.294 2.429.316h.031c.398.007.747.013 1.037.045c.311.035.616.104.909.274c.29.17.5.395.682.645c.169.232.342.525.538.856l.559.944a.52.52 0 0 0 .882 0l.559-.944c.196-.331.37-.624.538-.856c.182-.25.392-.476.682-.645c.293-.17.598-.24.909-.274c.29-.032.639-.038 1.037-.045h.032c1.255-.022 1.913-.102 2.428-.316a4.25 4.25 0 0 0 2.3-2.3c.147-.352.233-.782.278-1.441c.046-.666.046-1.51.046-2.685v-1c0-1.651 0-2.837-.089-3.762c-.087-.914-.253-1.495-.537-1.959a4.25 4.25 0 0 0-1.403-1.403c-.464-.284-1.045-.45-1.96-.537c-.924-.088-2.11-.089-3.761-.089h-3c-1.651 0-2.837 0-3.762.089m8.792 5.63a.75.75 0 0 1 0 1.061l-4 4a.75.75 0 0 1-1.05.011l-2-1.92a.75.75 0 1 1 1.04-1.082l1.47 1.411l3.48-3.48a.75.75 0 0 1 1.06 0" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <span id="solution-action-tooltip" className="attempt-tooltip" role="tooltip">
                <strong>Worked solution</strong>
                <span>See the complete reasoning and final answer after making an attempt.</span>
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="attempt-submit-button"
            disabled={!answer.trim() || loading || disabled}
            aria-label={submitLabel}
            title={submitLabel}
          >
            {loading ? <span className="spinner" /> : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

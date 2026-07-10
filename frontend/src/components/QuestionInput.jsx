import { useEffect, useMemo, useRef, useState } from 'react'

const displayModes = [
  {
    id: 'idea',
    name: 'Idea',
    description: 'Creative response mode',
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'Structured study mode',
  },
]

function Icon({ name }) {
  const paths = {
    upload: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    exam: (
      <>
        <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    close: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    arrowUp: (
      <>
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className="composer-icon"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  )
}

export default function QuestionInput({ onSubmit, loading }) {
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [examMode, setExamMode] = useState(false)
  const [selectedDisplayMode, setSelectedDisplayMode] = useState('academic')
  const [modeMenuOpen, setModeMenuOpen] = useState(false)
  const [focusedModeIndex, setFocusedModeIndex] = useState(0)
  const [isComposing, setIsComposing] = useState(false)
  const fileRef = useRef(null)
  const textareaRef = useRef(null)
  const modeSelectorRef = useRef(null)
  const modeMenuRef = useRef(null)
  const selectedMode = displayModes.find((mode) => mode.id === selectedDisplayMode) || displayModes[0]
  const canSubmit = (text.trim().length > 0 || imageFile) && !loading
  const imagePreviewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile],
  )

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`
  }, [text])

  useEffect(() => {
    if (!modeMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (modeSelectorRef.current && !modeSelectorRef.current.contains(event.target)) {
        setModeMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [modeMenuOpen])

  useEffect(() => {
    setFocusedModeIndex(displayModes.findIndex((mode) => mode.id === selectedDisplayMode))
  }, [selectedDisplayMode])

  useEffect(() => {
    if (modeMenuOpen) modeMenuRef.current?.focus()
  }, [modeMenuOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit(text.trim(), imageFile, examMode, selectedDisplayMode)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
    }
  }

  const clearImage = () => {
    setImageFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const openFilePicker = () => {
    if (!loading) fileRef.current?.click()
  }

  const handleModeButtonKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setModeMenuOpen(true)
      setFocusedModeIndex((currentIndex) => {
        const direction = e.key === 'ArrowDown' ? 1 : -1
        return (currentIndex + direction + displayModes.length) % displayModes.length
      })
    }

    if (e.key === 'Escape') {
      setModeMenuOpen(false)
    }
  }

  const handleModeMenuKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setModeMenuOpen(false)
      return
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedModeIndex((currentIndex) => {
        const direction = e.key === 'ArrowDown' ? 1 : -1
        return (currentIndex + direction + displayModes.length) % displayModes.length
      })
      return
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const nextMode = displayModes[focusedModeIndex]
      setSelectedDisplayMode(nextMode.id)
      setModeMenuOpen(false)
    }
  }

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  return (
    <form className="question-form composer-form" onSubmit={handleSubmit}>
      <div className="chat-composer">
        <label className="sr-only" htmlFor="question-text">Your Question</label>

        {imageFile && imagePreviewUrl && (
          <div className="composer-previews" aria-label="Uploaded image preview">
            <div className="image-preview">
              <img src={imagePreviewUrl} alt={imageFile.name || 'Uploaded problem'} />
              <button
                type="button"
                className="image-remove-btn"
                onClick={clearImage}
                aria-label="Remove uploaded image"
                disabled={loading}
              >
                <Icon name="close" />
              </button>
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          id="question-text"
          className="question-textarea composer-textarea"
          placeholder="Ask a question or upload a problem..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={handleTextareaKeyDown}
          disabled={loading}
          rows={2}
        />

        <div className="composer-action-bar">
          <div className="composer-actions-left">
            <button
              type="button"
              className={`composer-icon-btn ${imageFile ? 'is-active' : ''}`}
              onClick={openFilePicker}
              aria-label="Upload an image"
              disabled={loading}
            >
              <Icon name="upload" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              disabled={loading}
              hidden
            />

            <div className="tooltip-wrap">
              <button
                type="button"
                className={`composer-icon-btn exam-mode-btn ${examMode ? 'is-active' : ''}`}
                onClick={() => setExamMode((enabled) => !enabled)}
                aria-pressed={examMode}
                aria-label="Exam mode. Hides the final answer and guides you with hints instead."
                aria-describedby="exam-mode-tooltip"
                disabled={loading}
              >
                <Icon name="exam" />
              </button>
              <div id="exam-mode-tooltip" className="exam-tooltip" role="tooltip">
                <strong>Exam mode</strong>
                <span>Hides the final answer and guides you with hints instead.</span>
              </div>
            </div>
          </div>

          <div className="composer-actions-right">
            <div className="display-mode-selector" ref={modeSelectorRef}>
              <button
                type="button"
                className="display-mode-button"
                aria-haspopup="listbox"
                aria-expanded={modeMenuOpen}
                aria-label="Select display mode"
                onClick={() => setModeMenuOpen((open) => !open)}
                onKeyDown={handleModeButtonKeyDown}
              >
                <span>{selectedMode.name}</span>
                <Icon name="chevron" />
              </button>

              {modeMenuOpen && (
                <div
                  ref={modeMenuRef}
                  className="display-mode-menu"
                  role="listbox"
                  aria-label="Display modes"
                  tabIndex="-1"
                  onKeyDown={handleModeMenuKeyDown}
                >
                  {displayModes.map((mode, index) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={`display-mode-option ${selectedDisplayMode === mode.id ? 'is-selected' : ''} ${focusedModeIndex === index ? 'is-focused' : ''}`}
                      role="option"
                      aria-selected={selectedDisplayMode === mode.id}
                      onMouseEnter={() => setFocusedModeIndex(index)}
                      onClick={() => {
                        setSelectedDisplayMode(mode.id)
                        setModeMenuOpen(false)
                      }}
                    >
                      <span>
                        <span className="display-mode-name">{mode.name}</span>
                        <span className="display-mode-description">{mode.description}</span>
                      </span>
                      {selectedDisplayMode === mode.id && <Icon name="check" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="composer-submit-btn"
              disabled={!canSubmit}
              aria-label="Start session"
            >
              {loading ? <span className="spinner" /> : <Icon name="arrowUp" />}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

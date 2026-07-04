import { useState, useRef } from 'react'

export default function QuestionInput({ onSubmit, loading }) {
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [examMode, setExamMode] = useState(false)
  const fileRef = useRef(null)

  const canSubmit = (text.trim().length > 0 || imageFile) && !loading

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit(text.trim(), imageFile, examMode)
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

  return (
    <form className="question-form" onSubmit={handleSubmit}>
      <div className="card input-card">
        <label className="input-label" htmlFor="question-text">Your Question</label>
        <textarea
          id="question-text"
          className="question-textarea"
          placeholder="e.g. Factorise x² + 5x + 6"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
          rows={4}
        />

        <div className="upload-row">
          <span className="upload-or">and/or</span>
          <label className={`upload-btn ${imageFile ? 'upload-btn-active' : ''}`}>
            {imageFile ? imageFile.name : 'Upload an image'}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              disabled={loading}
              hidden
            />
          </label>
          {imageFile && (
            <button type="button" className="clear-image-btn" onClick={clearImage}>
              Remove
            </button>
          )}
        </div>

        <label className="exam-toggle">
          <input
            type="checkbox"
            checked={examMode}
            onChange={(e) => setExamMode(e.target.checked)}
            disabled={loading}
          />
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
          <span className="toggle-label">Exam mode (hides final answer)</span>
        </label>
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-start"
        disabled={!canSubmit}
      >
        {loading ? <span className="spinner" /> : 'Start Session'}
      </button>
    </form>
  )
}

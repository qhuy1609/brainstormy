import { useState } from 'react'
import QuestionInput from './components/QuestionInput.jsx'
import SessionView from './components/SessionView.jsx'
import { buildStartSessionFormData } from './api/startSessionRequest.js'

const API_BASE = 'http://localhost:5000/api/session'

export default function App() {
  const [view, setView] = useState('input')        // 'input' | 'session'
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleStart = async (text, imageFile, examMode, mode) => {
    setLoading(true)
    setError('')

    try {
      const formData = buildStartSessionFormData(text, imageFile, examMode, mode)
      const response = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.clarification_question || data.error || 'Something went wrong.')
        return
      }

      setSession(data)
      setView('session')
    } catch (err) {
      setError('Could not connect to the server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setView('input')
    setSession(null)
    setError('')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">testapp</h1>
        <p className="app-subtitle">An AI tutor that protects your thinking, not replaces it.</p>
      </header>

      {error && (
        <div className="error-banner">
          <span className="error-icon">!</span>
          {error}
          <button className="error-dismiss" onClick={() => setError('')}>x</button>
        </div>
      )}

      <main className="app-main">
        {view === 'input' ? (
          <QuestionInput onSubmit={handleStart} loading={loading} />
        ) : (
          <SessionView
            initialSession={session}
            onReset={handleReset}
            onError={setError}
          />
        )}
      </main>
    </div>
  )
}

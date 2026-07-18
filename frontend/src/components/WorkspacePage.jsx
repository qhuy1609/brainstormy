import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import QuestionInput from './QuestionInput.jsx'
import SessionView from './SessionView.jsx'
import { buildStartSessionFormData } from '../api/startSessionRequest.js'

const API_BASE = 'https://brainstormy-backend.vercel.app/api/session'

const workspaceEntrance = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.05,
      staggerChildren: 0.1,
    },
  },
}

const headerEntrance = {
  hidden: { opacity: 0, y: -14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

const composerEntrance = {
  hidden: { opacity: 0, y: 20, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.62, ease: [0.22, 1, 0.36, 1] } },
}

const footerEntrance = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
}

export default function WorkspacePage() {
  const [view, setView] = useState('input')
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    document.title = 'brainstormy.'
  }, [])

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
    } catch {
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
    <motion.div
      className="app workspace-page"
      initial={shouldReduceMotion ? false : 'hidden'}
      animate="visible"
      variants={workspaceEntrance}
    >
      <motion.header className="app-header workspace-header" variants={headerEntrance}>
        <Link className="workspace-brand" to="/" aria-label="brainstormy home">brainstormy<span>.</span></Link>
        <p className="app-subtitle">
          {view === 'input' ? 'Bring a question or an unfinished idea.' : 'Stay with the thinking. We’ll guide the next step.'}
        </p>
      </motion.header>

      {error && (
        <div className="error-banner" role="alert">
          <span className="error-icon">!</span>
          {error}
          <button className="error-dismiss" onClick={() => setError('')} aria-label="Dismiss error">×</button>
        </div>
      )}

      <motion.main className="app-main" variants={composerEntrance}>
        {view === 'input' ? (
          <QuestionInput onSubmit={handleStart} onError={setError} loading={loading} />
        ) : (
          <SessionView
            initialSession={session}
            onReset={handleReset}
            onError={setError}
          />
        )}
      </motion.main>

      {view === 'input' && (
        <motion.footer className="workspace-footer" variants={footerEntrance}>
          <Link to="/">homepage</Link>
        </motion.footer>
      )}
    </motion.div>
  )
}

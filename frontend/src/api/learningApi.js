const API_BASE = 'http://localhost:5000/api/session'

export async function fetchSessionState(sessionId) {
  const res = await fetch(`${API_BASE}/${sessionId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch session.')
  return data
}

export async function requestHint(sessionId) {
  const res = await fetch(`${API_BASE}/${sessionId}/hint`, { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to get hint.')
  return data
}

export async function submitAttempt(sessionId, answer) {
  const res = await fetch(`${API_BASE}/${sessionId}/attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to submit attempt.')
  return data
}

export async function revealAnswer(sessionId) {
  const res = await fetch(`${API_BASE}/${sessionId}/reveal`, { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to reveal answer.')
  return data
}

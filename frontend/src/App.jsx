import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './components/LandingPage.jsx'
import WorkspacePage from './components/WorkspacePage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<WorkspacePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

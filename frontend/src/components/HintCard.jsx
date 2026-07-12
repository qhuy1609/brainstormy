import MathText from './MathText.jsx'

export default function HintCard({ level, title, text, loading, maxReached }) {
  return (
    <div className="card hint-card">
      <div className="hint-header">
        <span className="card-label">{title || 'Hint'}</span>
        <span className="hint-badge">{title === 'Targeted hint' ? 'Based on your attempt' : 'Think it through'}</span>
      </div>
      {loading ? (
        <div className="hint-loading">
          <span className="spinner" />
        </div>
      ) : (
        <div className="hint-text"><MathText>{text}</MathText></div>
      )}
    </div>
  )
}

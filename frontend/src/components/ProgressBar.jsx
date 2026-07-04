export default function ProgressBar({ current, total }) {
  if (total <= 1) {
    return (
      <div className="progress-section">
        <span className="progress-label">Question 1 of 1</span>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '100%' }} />
        </div>
      </div>
    )
  }

  const percent = ((current - 1) / total) * 100

  return (
    <div className="progress-section">
      <span className="progress-label">Part {current} of {total}</span>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-dots">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`progress-dot ${i < current - 1 ? 'dot-done' : ''} ${i === current - 1 ? 'dot-active' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}

import MathText from './MathText.jsx'
import { normalizeConcepts } from './conceptTags.js'

export default function ConceptTags({ concepts }) {
  const normalizedConcepts = normalizeConcepts(concepts)
  if (normalizedConcepts.length === 0) return null

  return (
    <ul className="concept-tags" aria-label="Key concepts">
      {normalizedConcepts.map((concept) => (
        <li key={concept} className="concept-tag">
          <MathText inline>{concept}</MathText>
        </li>
      ))}
    </ul>
  )
}

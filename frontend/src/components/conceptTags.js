const MAX_CONCEPTS = 4
const MAX_CONCEPT_LENGTH = 48
const MAX_CONCEPT_WORDS = 6

export function normalizeConcepts(concepts) {
  if (!Array.isArray(concepts)) return []

  const seen = new Set()
  return concepts.reduce((normalized, concept) => {
    if (normalized.length >= MAX_CONCEPTS) return normalized
    if (typeof concept !== 'string') return normalized

    const displayValue = concept.trim()
    const comparisonValue = displayValue.toLocaleLowerCase()
    const wordCount = displayValue ? displayValue.split(/\s+/u).length : 0
    if (
      !displayValue
      || displayValue.includes('\n')
      || displayValue.length > MAX_CONCEPT_LENGTH
      || wordCount > MAX_CONCEPT_WORDS
      || seen.has(comparisonValue)
    ) return normalized

    seen.add(comparisonValue)
    normalized.push(displayValue)
    return normalized
  }, [])
}

export function normalizeConcepts(concepts) {
  if (!Array.isArray(concepts)) return []

  const seen = new Set()
  return concepts.reduce((normalized, concept) => {
    if (typeof concept !== 'string') return normalized

    const displayValue = concept.trim()
    const comparisonValue = displayValue.toLocaleLowerCase()
    if (!displayValue || seen.has(comparisonValue)) return normalized

    seen.add(comparisonValue)
    normalized.push(displayValue)
    return normalized
  }, [])
}

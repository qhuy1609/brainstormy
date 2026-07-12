import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeConcepts } from './conceptTags.js'

const sampleQuestions = [
  {
    id: 'question-1',
    content: 'Solve x² - 5x + 6 = 0.',
    requiredConcepts: ['Quadratic equations', 'Factorisation', 'Zero-product property'],
  },
  {
    id: 'question-2',
    content: 'Explain how recursion calculates the factorial of a number.',
    requiredConcepts: ['Recursion', 'Base case', 'Call stack'],
  },
  {
    id: 'question-3',
    content: 'What were two social effects of the Industrial Revolution?',
    requiredConcepts: ['Industrial Revolution', 'Urbanisation', 'Labour conditions'],
  },
]

test('keeps several supplied concepts from different question domains', () => {
  assert.deepEqual(normalizeConcepts(sampleQuestions[0].requiredConcepts), sampleQuestions[0].requiredConcepts)
  assert.deepEqual(normalizeConcepts(sampleQuestions[1].requiredConcepts), sampleQuestions[1].requiredConcepts)
  assert.deepEqual(normalizeConcepts(sampleQuestions[2].requiredConcepts), sampleQuestions[2].requiredConcepts)
})

test('keeps one concept and omits missing, null, or empty concept lists', () => {
  assert.deepEqual(normalizeConcepts(['Gravity']), ['Gravity'])
  assert.deepEqual(normalizeConcepts([]), [])
  assert.deepEqual(normalizeConcepts(null), [])
  assert.deepEqual(normalizeConcepts(undefined), [])
})

test('trims values and removes case-insensitive duplicates while preserving first display casing', () => {
  assert.deepEqual(
    normalizeConcepts(['  Factorisation  ', 'factorisation', 'FACTORISATION', 'Discriminant']),
    ['Factorisation', 'Discriminant'],
  )
})

test('removes whitespace-only values and preserves long mathematical or technical concepts', () => {
  const concepts = [
    ' ', '\t', '  ',
    'The relationship between gravitational potential energy and work done against gravity near Earth’s surface',
    'Big-O time complexity for recursive calls',
    '$E = mc^2$',
  ]
  assert.deepEqual(normalizeConcepts(concepts), concepts.slice(3))
})

test('retains enough concepts for a wrapping tag layout without filtering valid values', () => {
  const concepts = Array.from({ length: 10 }, (_, index) => `Concept ${index + 1}`)
  assert.deepEqual(normalizeConcepts(concepts), concepts)
})

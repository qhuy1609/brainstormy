import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeConcepts } from './conceptTags.js'

const sampleQuestions = [
  {
    id: 'question-1',
    content: 'Explain the energy changes as an object falls.',
    requiredConcepts: ['Work and energy', 'Potential energy', 'Gravity'],
  },
  {
    id: 'question-2',
    content: 'Explain how recursion calculates the factorial of a number.',
    requiredConcepts: ['Recursion', 'Functions', 'Program flow'],
  },
  {
    id: 'question-3',
    content: 'What were two social effects of the Industrial Revolution?',
    requiredConcepts: ['Industrial Revolution', 'Social change', 'Historical evidence'],
  },
  {
    id: 'question-4',
    content: 'Analyse how imagery creates mood in the poem.',
    requiredConcepts: ['Literary analysis', 'Imagery', 'Mood and tone'],
  },
]

test('keeps several supplied concepts from different question domains', () => {
  assert.deepEqual(normalizeConcepts(sampleQuestions[0].requiredConcepts), sampleQuestions[0].requiredConcepts)
  assert.deepEqual(normalizeConcepts(sampleQuestions[1].requiredConcepts), sampleQuestions[1].requiredConcepts)
  assert.deepEqual(normalizeConcepts(sampleQuestions[2].requiredConcepts), sampleQuestions[2].requiredConcepts)
  assert.deepEqual(normalizeConcepts(sampleQuestions[3].requiredConcepts), sampleQuestions[3].requiredConcepts)
})

test('keeps one concept and omits missing, null, or empty concept lists', () => {
  assert.deepEqual(normalizeConcepts(['Gravity']), ['Gravity'])
  assert.deepEqual(normalizeConcepts([]), [])
  assert.deepEqual(normalizeConcepts(null), [])
  assert.deepEqual(normalizeConcepts(undefined), [])
})

test('trims values and removes case-insensitive duplicates while preserving first display casing', () => {
  assert.deepEqual(
    normalizeConcepts(['  Potential energy  ', 'potential energy', 'POTENTIAL ENERGY', 'Gravity']),
    ['Potential energy', 'Gravity'],
  )
})

test('removes whitespace-only, multiline, and sentence-length values', () => {
  const concepts = [
    ' ', '\t', '  ',
    'Energy\ntransfers',
    'The relationship between potential energy and work done',
    'Gravity',
    'Potential energy',
  ]
  assert.deepEqual(normalizeConcepts(concepts), ['Gravity', 'Potential energy'])
})

test('caps malformed payloads at four valid concepts', () => {
  const concepts = Array.from({ length: 10 }, (_, index) => `Concept ${index + 1}`)
  assert.deepEqual(normalizeConcepts(concepts), concepts.slice(0, 4))
})

test('preserves concise multilingual topic labels', () => {
  assert.deepEqual(normalizeConcepts(['递归', '函数', '程序流程']), ['递归', '函数', '程序流程'])
})

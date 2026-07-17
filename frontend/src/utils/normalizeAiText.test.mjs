import assert from 'node:assert/strict'
import test from 'node:test'

import { isSymbolicFinalAnswer, normalizeAiText } from './normalizeAiText.js'

test('normalizes legacy inline and display math delimiters', () => {
  const result = normalizeAiText('Use \\(x + 1\\). Then\\n\\[x = 2\\]')

  assert.match(result, /\$x \+ 1\$/)
  assert.match(result, /\$\$x = 2\$\$/)
})

test('preserves standard dollar delimiters and display-math line breaks', () => {
  const result = normalizeAiText('Use $x$.\n\n$$x = 2$$\n\nDone.')

  assert.equal(result, 'Use $x$.\n\n$$x = 2$$\n\nDone.')
})

test('converts legacy text units to robust KaTeX roman units', () => {
  const result = normalizeAiText('$3.9 \\text{ g/cm}^{-3}$')

  assert.equal(result, '$3.9 \\mathrm{g/cm}^{-3}$')
})

test('selects math rendering only for a fully delimited symbolic final answer', () => {
  assert.equal(isSymbolicFinalAnswer('$x = 3$'), true)
  assert.equal(isSymbolicFinalAnswer('3.71 m/s²'), false)
  assert.equal(isSymbolicFinalAnswer('Therefore, no solution exists.'), false)
  assert.equal(isSymbolicFinalAnswer('$$x = 3$$'), false)
})

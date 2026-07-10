import assert from 'node:assert/strict'
import test from 'node:test'

import { buildStartSessionFormData } from './startSessionRequest.js'

test('includes the selected response mode in the start-session request', () => {
  const formData = buildStartSessionFormData('write a poem idea', null, false, 'idea')

  assert.equal(formData.get('question'), 'write a poem idea')
  assert.equal(formData.get('exam_mode'), 'false')
  assert.equal(formData.get('mode'), 'idea')
  assert.equal(formData.has('image'), false)
})

test('defaults missing response mode to academic', () => {
  const formData = buildStartSessionFormData('factorise x^2 + 5x + 6', null, true)

  assert.equal(formData.get('mode'), 'academic')
  assert.equal(formData.get('exam_mode'), 'true')
})

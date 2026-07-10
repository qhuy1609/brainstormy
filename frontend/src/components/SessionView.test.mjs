import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Idea sessions render the request only once', async () => {
  const source = await readFile(new URL('./SessionView.jsx', import.meta.url), 'utf8')

  assert.match(source, /\{!isIdeaMode && \(/)
  assert.doesNotMatch(source, /isIdeaMode \? 'Request'/)
  assert.match(source, /isIdeaMode \? 'Your Idea Task' : 'Your Task'/)
})

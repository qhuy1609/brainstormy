import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Idea sessions use their dedicated discovery view', async () => {
  const source = await readFile(new URL('./SessionView.jsx', import.meta.url), 'utf8')

  assert.match(source, /import IdeaSessionView from '\.\/IdeaSessionView\.jsx'/)
  assert.match(source, /initialSession\.mode === 'idea'/)
  assert.match(source, /<IdeaSessionView/)
})

test('Idea discovery view exposes the non-quiz actions', async () => {
  const source = await readFile(new URL('./IdeaSessionView.jsx', import.meta.url), 'utf8')

  assert.match(source, /Generate ideas now/)
  assert.match(source, /Develop \$\{selectedIdeas\.length/)
  assert.doesNotMatch(source, /Submit Attempt/)
  assert.doesNotMatch(source, /Get Next Hint/)
})

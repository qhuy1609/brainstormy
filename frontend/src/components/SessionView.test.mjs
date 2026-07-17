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

test('Academic sessions use the single-question conversational contracts', async () => {
  const source = await readFile(new URL('./SessionView.jsx', import.meta.url), 'utf8')
  const feedback = await readFile(new URL('./FeedbackBox.jsx', import.meta.url), 'utf8')

  assert.match(source, /session\.question/)
  assert.doesNotMatch(source, /current_sub_question|total_sub_questions|ProgressBar/)
  assert.match(source, /revealedAnswer\.full_working/)
  assert.doesNotMatch(source, /revealedAnswer\.steps/)
  assert.match(feedback, /diagnosis\.feedback/)
  assert.doesNotMatch(feedback, /diagnosis\.strength|diagnosis\.focus/)
})

test('Academic recommendations emphasize actions without removing controls', async () => {
  const source = await readFile(new URL('./SessionView.jsx', import.meta.url), 'utf8')

  assert.match(source, /recommendedAction === 'revise'/)
  assert.match(source, /recommendedAction === 'hint'/)
  assert.match(source, /recommendedAction === 'solution'/)
  assert.match(source, /Give me a targeted hint/)
  assert.match(source, /Show worked solution/)
})

test('Final-answer uppercase styling applies only to its label', async () => {
  const source = await readFile(new URL('./SessionView.jsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8')

  assert.match(source, /className="solution-final-label"/)
  assert.match(styles, /\.solution-final-label[^}]*text-transform: uppercase/)
  assert.doesNotMatch(styles, /\.solution-final-answer > span/)
})

test('Worked solutions preserve paragraph spacing and choose final-answer rendering', async () => {
  const source = await readFile(new URL('./SessionView.jsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8')

  assert.match(source, /isSymbolicFinalAnswer\(revealedAnswer\.final_answer\)/)
  assert.match(source, /className="solution-final-value"/)
  assert.match(styles, /\.solution-full-working p \+ p[^}]*margin-top/)
})

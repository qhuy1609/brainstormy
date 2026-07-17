import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('maps the landing page and workspace to real browser routes', async () => {
  const [app, main] = await Promise.all([
    readSource('./App.jsx'),
    readSource('./main.jsx'),
  ])

  assert.match(main, /<BrowserRouter>/)
  assert.match(app, /path="\/" element={<LandingPage/)
  assert.match(app, /path="\/app" element={<WorkspacePage/)
  assert.match(app, /path="\*" element={<Navigate to="\/" replace/)
})

test('landing CTAs link to the app without starting an API request', async () => {
  const landing = await readSource('./components/LandingPage.jsx')

  assert.match(landing, /to="\/app"/)
  assert.match(landing, /Think better with AI/)
  assert.match(landing, /Academic mode/)
  assert.match(landing, /Idea mode/)
  assert.doesNotMatch(landing, /fetch\(/)
})

test('landing load motion staggers the hero and skips movement for reduced motion', async () => {
  const [landing, workspace, styles] = await Promise.all([
    readSource('./components/LandingPage.jsx'),
    readSource('./components/WorkspacePage.jsx'),
    readSource('./styles.css'),
  ])

  assert.match(landing, /motion, useReducedMotion/)
  assert.match(landing, /shouldReduceMotion \? false : 'hidden'/)
  assert.match(landing, /<motion\.header[^>]+variants={navEntrance}/)
  assert.equal((landing.match(/className="hero-orb/g) || []).length, 2)
  assert.match(landing, /staggerChildren: 0\.08/)
  assert.match(landing, /<motion\.h1[^>]+variants={copyItemEntrance}/)
  assert.match(landing, /className="hero-preview-intro" variants={previewEntrance}[\s\S]*<HeroProductPreview/)
  assert.match(styles, /\.hero-preview-intro \{\s+width: 100%/)
  assert.doesNotMatch(workspace, /navEntrance|heroEntrance|previewEntrance/)
})

test('workspace route staggers its entrance and respects reduced motion', async () => {
  const workspace = await readSource('./components/WorkspacePage.jsx')

  assert.match(workspace, /motion, useReducedMotion/)
  assert.match(workspace, /staggerChildren: 0\.1/)
  assert.match(workspace, /initial={shouldReduceMotion \? false : 'hidden'}/)
  assert.match(workspace, /<motion\.header[^>]+variants={headerEntrance}/)
  assert.match(workspace, /<motion\.main[^>]+variants={composerEntrance}/)
  assert.match(workspace, /<motion\.footer[^>]+variants={footerEntrance}/)
  assert.doesNotMatch(workspace, /key={view}/)
})

test('hero preview keeps its content and responds to hero scroll progress', async () => {
  const [landing, preview, styles, packageJson] = await Promise.all([
    readSource('./components/LandingPage.jsx'),
    readSource('./components/HeroProductPreview.jsx'),
    readSource('./styles.css'),
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ])

  assert.match(landing, /ref={heroRef}/)
  assert.match(landing, /<HeroProductPreview scrollTarget={heroRef}/)
  assert.match(preview, /useScroll/)
  assert.match(preview, /target: scrollTarget/)
  assert.match(preview, /offset: \['start start', 'end start'\]/)
  assert.match(preview, /useReducedMotion/)
  assert.match(preview, /Why does potential energy change when an object is lifted\?/)
  assert.match(preview, /your thinking/)
  assert.match(preview, /a useful nudge/)
  assert.match(styles, /perspective: 1200px/)
  assert.match(landing, /<div className="landing-hero-sticky">/)
  assert.match(styles, /\.landing-hero-sticky \{[^}]*position: relative;[^}]*min-height: 790px/)
  assert.doesNotMatch(styles, /\.landing-hero-sticky \{[^}]*position: sticky/)
  assert.equal(JSON.parse(packageJson).dependencies['framer-motion'] !== undefined, true)
})

test('the why heading draws a two-stroke underline once with reduced-motion support', async () => {
  const [landing, underline, styles] = await Promise.all([
    readSource('./components/LandingPage.jsx'),
    readSource('./components/AnimatedUnderline.jsx'),
    readSource('./styles.css'),
  ])

  assert.match(landing, /the <AnimatedUnderline>point\.<\/AnimatedUnderline>/)
  assert.equal((underline.match(/<motion\.path/g) || []).length, 2)
  assert.match(underline, /viewport: \{ once: true, amount: 0\.8 \}/)
  assert.match(underline, /useReducedMotion/)
  assert.match(underline, /initial: false/)
  assert.match(underline, /aria-hidden="true"/)
  assert.match(styles, /\.animated-underline-mark[\s\S]*color: var\(--mountbatten-pink\)/)
})

test('how it works moves one focus frame through three responsive steps', async () => {
  const [landing, howItWorks, styles] = await Promise.all([
    readSource('./components/LandingPage.jsx'),
    readSource('./components/HowItWorks.jsx'),
    readSource('./styles.css'),
  ])

  assert.match(landing, /<HowItWorks \/>/)
  assert.match(howItWorks, /useScroll/)
  assert.match(howItWorks, /useMotionValueEvent/)
  assert.match(howItWorks, /progressStops = \[0, 0\.18, 0\.42, 0\.58, 0\.82, 1\]/)
  assert.equal((howItWorks.match(/calc\(\(/g) || []).length, 6)
  assert.match(howItWorks, /\? \{ top: framePosition, left: 0 \}/)
  assert.match(howItWorks, /: \{ top: 0, left: framePosition \}/)
  assert.match(howItWorks, /useReducedMotion/)
  assert.match(howItWorks, /aria-hidden="true"/)
  assert.match(howItWorks, /Bring it/)
  assert.match(howItWorks, /Think with it/)
  assert.match(howItWorks, /Own the outcome/)
  assert.match(styles, /\.landing-how \{[\s\S]*min-height: 180vh/)
  assert.match(styles, /\.landing-how-sticky \{[\s\S]*position: sticky;[\s\S]*align-items: flex-start;[\s\S]*padding: 7rem 0/)
  assert.match(styles, /\.landing-how-sticky \{[\s\S]*radial-gradient[\s\S]*linear-gradient\(128deg/)
  assert.match(styles, /\.steps-grid \{[\s\S]*max-width: 1080px/)
  assert.match(styles, /\.landing-step \{[\s\S]*min-height: 210px/)
  assert.match(styles, /\.workflow-focus-frame \{[\s\S]*width: calc\(\(100% - 2rem\) \/ 3\)/)
  assert.match(styles, /\.workflow-focus-frame \{[\s\S]*linear-gradient\(145deg/)
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.workflow-focus-frame \{[\s\S]*height: calc\(\(100% - 2rem\) \/ 3\)/)
  assert.doesNotMatch(styles, /\.landing-step \{[\s\S]*?border-top:/)
})

test('landing presents the AI apocalypse mission and its three principles', async () => {
  const landing = await readSource('./components/LandingPage.jsx')

  assert.match(landing, /href="#mission"/)
  assert.match(landing, /id="mission"/)
  assert.match(landing, /Solving the AI apocalypse\./)
  assert.ok(landing.includes("Artificial Intelligence is rapidly becoming part of our everyday lives. Some people see it as humanity's greatest tool. Others see it as a threat. The future is uncertain, and that's exactly what makes it exciting."))
  assert.match(landing, />Participate</)
  assert.match(landing, />Question</)
  assert.match(landing, />Own</)
})

test('workspace owns the existing input and session flow on one route', async () => {
  const workspace = await readSource('./components/WorkspacePage.jsx')

  assert.match(workspace, /buildStartSessionFormData/)
  assert.match(workspace, /setView\('session'\)/)
  assert.match(workspace, /setView\('input'\)/)
  assert.match(workspace, /<QuestionInput/)
  assert.match(workspace, /<SessionView/)
})

test('landing and workspace share the lowercase wordmark and darker metadata', async () => {
  const [landing, workspace, html, styles, favicon] = await Promise.all([
    readSource('./components/LandingPage.jsx'),
    readSource('./components/WorkspacePage.jsx'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readSource('./styles.css'),
    readFile(new URL('../public/brainstormy-spark.svg', import.meta.url), 'utf8'),
  ])

  assert.match(landing, /aria-label="brainstormy home">brainstormy<span>\.<\/span>/)
  assert.match(workspace, /aria-label="brainstormy home">brainstormy<span>\.<\/span>/)
  assert.match(workspace, /document\.title = 'brainstormy\.'/)
  assert.match(html, /<title>brainstormy\.<\/title>/)
  assert.match(html, /name="description"/)
  assert.match(html, /name="theme-color" content="#211E26"/)
  assert.match(html, /rel="icon" type="image\/svg\+xml" sizes="any" href="\/brainstormy-spark\.svg"/)
  assert.match(favicon, /fill="#FFC5A6"/)
  assert.doesNotMatch(favicon, /<rect/)
  assert.match(styles, /--night: #211E26/)
  assert.match(styles, /--raised-charcoal: #302C35/)
  assert.match(styles, /--soft-charcoal: #3B3640/)
  assert.match(styles, /\.workspace-brand span \{\s+color: var\(--melon\)/)
  assert.match(styles, /\.landing-brand span \{\s+color: var\(--melon\)/)
})

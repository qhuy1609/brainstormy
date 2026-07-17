import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import AnimatedUnderline from './AnimatedUnderline.jsx'
import HeroProductPreview from './HeroProductPreview.jsx'
import HowItWorks from './HowItWorks.jsx'

function ArrowIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <path d="M16 3c.7 7.8 5.2 12.3 13 13-7.8.7-12.3 5.2-13 13-.7-7.8-5.2-12.3-13-13 7.8-.7 12.3-5.2 13-13Z" fill="currentColor" />
    </svg>
  )
}

const modes = [
  {
    number: '01',
    eyebrow: 'Academic mode',
    title: 'Understand it for yourself.',
    copy: 'Work through questions with broad concept cues, feedback on your reasoning, targeted hints, and a worked solution after you attempt it.',
    items: ['Type or upload a question', 'Get feedback that responds to your attempt', 'Move from a hint to a worked solution'],
  },
  {
    number: '02',
    eyebrow: 'Idea mode',
    title: 'Make the idea yours.',
    copy: 'Turn a rough creative direction into personalised options, compare what fits, then develop one or two into a practical brief.',
    items: ['Clarify only what changes the outcome', 'Compare five distinct directions', 'Leave with next steps and focus areas'],
  },
]

const introEase = [0.22, 1, 0.36, 1]

const navEntrance = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: introEase } },
}

const orbEntrance = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.9, ease: introEase } },
}

const heroEntrance = {
  hidden: {},
  visible: { transition: { delayChildren: 0.08 } },
}

const copyEntrance = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const copyItemEntrance = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.56, ease: introEase } },
}

const previewEntrance = {
  hidden: { opacity: 0, x: 30, y: 8, scale: 0.97 },
  visible: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.72, delay: 0.1, ease: introEase } },
}

export default function LandingPage() {
  const heroRef = useRef(null)
  const shouldReduceMotion = useReducedMotion()
  const introInitial = shouldReduceMotion ? false : 'hidden'

  useEffect(() => {
    document.title = 'brainstormy.'
  }, [])

  return (
    <div className="landing-page">
      <motion.header className="landing-nav-shell" initial={introInitial} animate="visible" variants={navEntrance}>
        <nav className="landing-nav" aria-label="Main navigation">
          <Link className="landing-brand" to="/" aria-label="brainstormy home">brainstormy<span>.</span></Link>
          <div className="landing-nav-links">
            <a href="#why">Why brainstormy</a>
            <a href="#mission">Mission</a>
            <a href="#modes">Modes</a>
            <a href="#how">How it works</a>
          </div>
          <Link className="landing-nav-cta" to="/app">Open app <ArrowIcon /></Link>
        </nav>
      </motion.header>

      <main>
        <section className="landing-hero" ref={heroRef} aria-labelledby="landing-title">
          <div className="landing-hero-sticky">
            <motion.div className="hero-orb hero-orb-one" initial={introInitial} animate="visible" variants={orbEntrance} />
            <motion.div className="hero-orb hero-orb-two" initial={introInitial} animate="visible" variants={orbEntrance} />
            <motion.div className="landing-container hero-grid" initial={introInitial} animate="visible" variants={heroEntrance}>
              <motion.div className="hero-copy" variants={copyEntrance}>
                <motion.h1 id="landing-title" variants={copyItemEntrance}>Think better with AI - <em>not less.</em></motion.h1>
                <motion.p variants={copyItemEntrance}>brainstormy helps you work through difficult questions and undeveloped ideas without taking the thinking away from you.</motion.p>
                <motion.div className="hero-actions" variants={copyItemEntrance}>
                  <Link className="landing-button landing-button-primary" to="/app">Start thinking <ArrowIcon /></Link>
                  <a className="landing-button landing-button-secondary" href="#how">See how it works</a>
                </motion.div>
                <motion.p className="hero-note" variants={copyItemEntrance}><span /> No instant-answer dependency. Just the next useful step.</motion.p>
              </motion.div>

              <motion.div className="hero-preview-intro" variants={previewEntrance}>
                <HeroProductPreview scrollTarget={heroRef} />
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="landing-contrast" id="why" aria-labelledby="why-title">
          <div className="landing-container">
            <p className="section-kicker">Why brainstormy</p>
            <h2 id="why-title">The answer is not always the <AnimatedUnderline>point.</AnimatedUnderline></h2>
            <div className="contrast-grid">
              <article className="contrast-card contrast-card-muted">
                <span>Typical AI</span>
                <h3>Here is the finished result.</h3>
                <p>Fast, convenient - and easy to forget because none of the reasoning became yours.</p>
                <div className="contrast-line"><i /> Copy <i /> Submit <i /> Forget</div>
              </article>
              <article className="contrast-card contrast-card-bright">
                <span>brainstormy</span>
                <h3>Here is your next useful move.</h3>
                <p>Attempt, choose, revise, and understand - with guidance that changes based on what you do.</p>
                <div className="contrast-line"><i /> Think <i /> Respond <i /> Grow</div>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-manifesto" id="mission" aria-labelledby="mission-title">
          <div className="landing-container manifesto-grid">
            <div className="manifesto-heading">
              <p className="section-kicker">Our mission</p>
              <h2 id="mission-title">Solving the AI apocalypse.</h2>
            </div>
            <div className="manifesto-content">
              <blockquote>
                Artificial Intelligence is rapidly becoming part of our everyday lives. Some people see it as humanity's greatest tool. Others see it as a threat. The future is uncertain, and that's exactly what makes it exciting.
              </blockquote>
              <p>brainstormy is our answer to one part of that uncertainty: passive dependence on instant output. It keeps people attempting, questioning, choosing, revising, and owning their results, because AI should expand what we can do without erasing the practice of thinking for ourselves.</p>
              <div className="manifesto-principles" aria-label="brainstormy mission principles">
                <article><span>01</span><strong>Participate</strong><p>Stay actively involved instead of waiting for a finished result.</p></article>
                <article><span>02</span><strong>Question</strong><p>Test ideas, revise reasoning, and remain curious about the answer.</p></article>
                <article><span>03</span><strong>Own</strong><p>Leave with understanding or direction that still feels like yours.</p></article>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-modes" id="modes" aria-labelledby="modes-title">
          <div className="landing-container">
            <div className="section-heading-row">
              <div><p className="section-kicker">Two ways to think</p><h2 id="modes-title">Choose what you need today.</h2></div>
              <p>One workspace for building understanding and developing original direction.</p>
            </div>
            <div className="mode-card-grid">
              {modes.map((mode) => (
                <article className="landing-mode-card" key={mode.number}>
                  <div className="mode-card-top"><span>{mode.eyebrow}</span><strong>{mode.number}</strong></div>
                  <h3>{mode.title}</h3>
                  <p>{mode.copy}</p>
                  <ul>{mode.items.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul>
                  <Link to="/app">Try {mode.eyebrow.toLowerCase()} <ArrowIcon /></Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <HowItWorks />

        <section className="landing-final-cta">
          <div className="landing-container final-cta-inner">
            <SparkIcon />
            <p>Ready when your brain is.</p>
            <h2>Keep the thinking. Get better guidance.</h2>
            <Link className="landing-button landing-button-dark" to="/app">Open brainstormy <ArrowIcon /></Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container"><Link className="landing-brand" to="/" aria-label="brainstormy home">brainstormy<span>.</span></Link><p>AI that strengthens your thinking.</p><Link to="/app">Open the app <ArrowIcon /></Link></div>
      </footer>
    </div>
  )
}

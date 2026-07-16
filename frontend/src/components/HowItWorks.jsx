import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion'

const steps = [
  ['Bring it', 'Paste a difficult question, upload a problem, or describe the thing you want to create.'],
  ['Think with it', 'You make the attempt or choice. brainstormy responds with the next useful nudge.'],
  ['Own the outcome', 'Finish with understanding you can reuse or a direction you can confidently develop.'],
]

const progressStops = [0, 0.18, 0.42, 0.58, 0.82, 1]
const framePositions = [
  'calc((0% + 0rem) / 3)',
  'calc((0% + 0rem) / 3)',
  'calc((100% + 1rem) / 3)',
  'calc((100% + 1rem) / 3)',
  'calc((200% + 2rem) / 3)',
  'calc((200% + 2rem) / 3)',
]

export default function HowItWorks() {
  const sectionRef = useRef(null)
  const [activeStep, setActiveStep] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: isMobile ? ['start 80%', 'end 20%'] : ['start start', 'end end'],
  })
  const framePosition = useTransform(scrollYProgress, progressStops, framePositions)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 760px)')
    const updateViewport = () => setIsMobile(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)
    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    const nextStep = progress < 0.3 ? 0 : progress < 0.7 ? 1 : 2
    setActiveStep((currentStep) => currentStep === nextStep ? currentStep : nextStep)
  })

  const sectionClassName = shouldReduceMotion
    ? 'landing-how is-reduced-motion'
    : 'landing-how has-progress-frame'
  const frameStyle = isMobile
    ? { top: framePosition, left: 0 }
    : { top: 0, left: framePosition }

  return (
    <section className={sectionClassName} id="how" ref={sectionRef} aria-labelledby="how-title">
      <div className="landing-how-sticky">
        <div className="landing-container">
          <p className="section-kicker">How it works</p>
          <h2 id="how-title">Bring it. Work through it. Own it.</h2>
          <div className="steps-grid">
            {!shouldReduceMotion && (
              <motion.div
                className="workflow-focus-frame"
                style={frameStyle}
                aria-hidden="true"
              />
            )}
            {steps.map(([title, copy], index) => (
              <article
                className={`landing-step${!shouldReduceMotion && index === activeStep ? ' is-active' : ''}`}
                key={title}
              >
                <span>0{index + 1}</span>
                <div><h3>{title}</h3><p>{copy}</p></div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

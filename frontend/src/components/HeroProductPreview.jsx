import { useEffect, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

function PreviewSparkIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <path d="M16 3c.7 7.8 5.2 12.3 13 13-7.8.7-12.3 5.2-13 13-.7-7.8-5.2-12.3-13-13 7.8-.7 12.3-5.2 13-13Z" fill="currentColor" />
    </svg>
  )
}

export default function HeroProductPreview({ scrollTarget }) {
  const [isMobile, setIsMobile] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: scrollTarget,
    offset: ['start start', 'end start'],
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const updateViewport = () => setIsMobile(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)
    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  const rotateX = useTransform(scrollYProgress, [0, 0.7], [isMobile ? 8 : 16, 0])
  const rotateZ = useTransform(scrollYProgress, [0, 0.7], [isMobile ? 0.5 : 1.5, 0])
  const scale = useTransform(scrollYProgress, [0, 0.7], [isMobile ? 0.94 : 1.04, 1])
  const y = useTransform(scrollYProgress, [0, 0.7], [isMobile ? 24 : 28, isMobile ? 0 : -40])
  const motionStyle = shouldReduceMotion
    ? { rotateX: 0, rotateZ: 0, scale: 1, y: 0 }
    : { rotateX, rotateZ, scale, y }

  return (
    <div className="hero-preview-stage">
      <motion.div
        className="product-preview"
        style={motionStyle}
        aria-label="Example of brainstormy guiding a learner"
      >
        <div className="preview-toolbar">
          <span className="preview-brand">brainstormy</span>
          <span className="preview-mode">Academic</span>
        </div>
        <div className="preview-question">
          <span>Question</span>
          <p>Why does potential energy change when an object is lifted?</p>
          <div className="preview-tags"><span>Work and energy</span><span>Gravity</span></div>
        </div>
        <div className="preview-attempt">
          <span className="preview-avatar">You</span>
          <p>I think energy is added because a force moves the object upward...</p>
        </div>
        <div className="preview-guidance">
          <div className="preview-guidance-head"><PreviewSparkIcon /><span>Good start</span></div>
          <p>You connected force and movement. Now consider where that transferred energy is stored.</p>
          <strong>Try this → Name the system receiving the energy.</strong>
        </div>
        <div className="preview-float preview-float-one">your thinking</div>
        <div className="preview-float preview-float-two">a useful nudge</div>
      </motion.div>
    </div>
  )
}

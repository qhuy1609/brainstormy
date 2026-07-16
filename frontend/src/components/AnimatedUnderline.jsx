import { motion, useReducedMotion } from 'framer-motion'

export default function AnimatedUnderline({ children }) {
  const shouldReduceMotion = useReducedMotion()

  const drawAnimation = (delay) => {
    if (shouldReduceMotion) {
      return {
        initial: false,
        animate: { pathLength: 1, opacity: 1 },
      }
    }

    return {
      initial: { pathLength: 0, opacity: 0 },
      whileInView: { pathLength: 1, opacity: 1 },
      viewport: { once: true, amount: 0.8 },
      transition: { duration: 1.05, delay, ease: [0.22, 1, 0.36, 1] },
    }
  }

  return (
    <span className="animated-underline">
      <span className="animated-underline-label">{children}</span>
      <svg
        className="animated-underline-mark"
        viewBox="0 0 220 28"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <motion.path d="M5 11 C48 3, 99 5, 142 7 C170 8, 193 7, 215 10" {...drawAnimation(0)} />
        <motion.path d="M8 22 C55 16, 104 15, 151 17 C178 18, 198 19, 216 21" {...drawAnimation(0.28)} />
      </svg>
    </span>
  )
}

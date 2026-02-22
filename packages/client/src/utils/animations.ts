import type { Variants, Transition } from 'framer-motion'

export const SPRING_SNAPPY: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 26,
}

export const SPRING_SMOOTH: Transition = {
  type: 'spring',
  stiffness: 250,
  damping: 22,
}

export const SPRING_GLASS: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 28,
}

export const SPRING_BOUNCY: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 18,
}

export const EASE_OUT_FAST: Transition = {
  duration: 0.2,
  ease: [0.25, 0.8, 0.25, 1],
}

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const slideUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.93 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.93 },
}

export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 16 },
}

export const listItem: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export const glassSlideIn: Variants = {
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: 8, filter: 'blur(4px)' },
}

export const glassFadeIn: Variants = {
  initial: { opacity: 0, filter: 'blur(4px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(4px)' },
}

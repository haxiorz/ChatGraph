import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface TooltipProps {
  label: string
  children: React.ReactNode
  delay?: number
}

export function Tooltip({ label, children, delay = 400 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const triggerRef = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setCoords({
          x: rect.left + rect.width / 2,
          y: rect.top - 6,
        })
      }
      setVisible(true)
    }, delay)
  }, [delay])

  const hide = useCallback(() => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {createPortal(
        <AnimatePresence>
          {visible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 2 }}
              transition={{ duration: 0.12 }}
              className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-elevated)] backdrop-blur-xl px-2.5 py-1.5 text-[11px] leading-tight text-fg-primary shadow-lg whitespace-nowrap"
              style={{ left: coords.x, top: coords.y }}
            >
              {label}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

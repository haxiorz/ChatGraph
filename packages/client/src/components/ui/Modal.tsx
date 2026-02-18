import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { modalOverlay, modalContent, EASE_OUT_FAST } from '../../utils/animations'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  top?: boolean
}

export function Modal({ open, onClose, children, className = '', top = false }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  // Focus trap: focus the panel when opened
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-50 flex ${top ? 'items-start pt-[15vh]' : 'items-center'} justify-center`}
          variants={modalOverlay}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={EASE_OUT_FAST}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            ref={panelRef}
            className={`relative z-10 w-full rounded-xl border border-border bg-surface shadow-md ${className}`}
            variants={modalContent}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ ...EASE_OUT_FAST, duration: 0.2 }}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

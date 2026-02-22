import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { modalOverlay, modalContent, SPRING_GLASS } from '../../utils/animations'

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
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            ref={panelRef}
            className={`glass-strong relative z-10 w-full rounded-xl border border-[var(--glass-border)] shadow-xl ${className}`}
            variants={modalContent}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={SPRING_GLASS}
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

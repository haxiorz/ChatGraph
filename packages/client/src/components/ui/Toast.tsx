import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useToastStore } from '../../stores/toastStore'

const ICON_MAP = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const COLOR_MAP = {
  success: 'text-success',
  error: 'text-destructive',
  info: 'text-accent',
  warning: 'text-warning',
}

const BG_MAP = {
  success: 'border-success/30',
  error: 'border-destructive/30',
  info: 'border-accent/30',
  warning: 'border-warning/30',
}

const PROGRESS_COLOR_MAP = {
  success: 'bg-success',
  error: 'bg-destructive',
  info: 'bg-accent',
  warning: 'bg-warning',
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const Icon = ICON_MAP[t.type]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.25, 0.8, 0.25, 1] }}
              role="alert"
              aria-live="assertive"
              className={`glass-elevated relative overflow-hidden flex items-start gap-2 rounded-xl border backdrop-blur-xl px-4 py-3 shadow-lg ${BG_MAP[t.type]}`}
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${COLOR_MAP[t.type]}`} />
              <span className="text-sm text-fg-primary">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick()
                    removeToast(t.id)
                  }}
                  className="ml-1 shrink-0 rounded px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => removeToast(t.id)}
                className="ml-2 shrink-0 text-fg-muted hover:text-fg-primary transition-colors"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
              {/* Auto-dismiss progress bar */}
              <div
                className={`absolute bottom-0 left-0 h-[2px] ${PROGRESS_COLOR_MAP[t.type]} opacity-40`}
                style={{ animation: 'toast-progress 5s linear forwards' }}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

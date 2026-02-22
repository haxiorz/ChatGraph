import { forwardRef } from 'react'

const INPUT_BASE =
  'w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-elevated)] backdrop-blur-sm px-3.5 py-2.5 text-sm text-fg-primary placeholder:text-fg-muted transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className = '', error, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`${INPUT_BASE} ${error ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''} ${className}`}
        {...props}
      />
    )
  },
)

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className = '', error, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={`${INPUT_BASE} resize-none ${error ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''} ${className}`}
        {...props}
      />
    )
  },
)

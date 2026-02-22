import { forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'text-white shadow-sm hover:shadow-md hover:brightness-110 disabled:opacity-50',
  secondary:
    'border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] text-fg-secondary shadow-xs hover:bg-[var(--glass-bg-elevated)] hover:text-fg-primary hover:border-[var(--color-border-strong)] disabled:opacity-50',
  ghost:
    'text-fg-secondary hover:bg-[var(--glass-bg)] hover:text-fg-primary disabled:opacity-50',
  destructive:
    'bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-lg',
  lg: 'px-5 py-3 text-sm rounded-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'primary', size = 'md', className = '', style, ...props },
    ref,
  ) {
    const isPrimary = variant === 'primary'
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
        style={isPrimary ? { backgroundImage: 'var(--gradient-accent)', ...style } : style}
        {...props}
      />
    )
  },
)

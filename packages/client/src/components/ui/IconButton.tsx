import { forwardRef } from 'react'

type IconButtonVariant = 'ghost' | 'outline' | 'danger'
type IconButtonSize = 'sm' | 'md'

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant
  size?: IconButtonSize
  'aria-label': string
  tooltip?: string
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  ghost:
    'text-fg-muted hover:bg-elevated hover:text-fg-primary',
  outline:
    'border border-border text-fg-muted hover:bg-elevated hover:text-fg-primary',
  danger:
    'text-fg-muted hover:bg-destructive/10 hover:text-destructive',
}

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  sm: 'h-7 w-7 rounded-md',
  md: 'h-8 w-8 rounded-lg',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      variant = 'ghost',
      size = 'md',
      className = '',
      tooltip,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${tooltip ? 'tooltip-trigger' : ''} ${className}`}
        data-tooltip={tooltip}
        {...props}
      />
    )
  },
)

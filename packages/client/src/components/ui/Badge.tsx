type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'destructive' | 'outline'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:
    'bg-elevated text-fg-secondary',
  accent:
    'bg-accent-muted text-accent',
  success:
    'bg-success/10 text-success',
  warning:
    'bg-warning/10 text-warning',
  destructive:
    'bg-destructive/10 text-destructive',
  outline:
    'border border-border text-fg-secondary',
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

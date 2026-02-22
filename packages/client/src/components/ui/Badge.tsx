type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'destructive' | 'outline'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:
    'bg-elevated text-fg-secondary ring-1 ring-[var(--glass-border)]',
  accent:
    'bg-accent-muted text-accent ring-1 ring-accent/20',
  success:
    'bg-success/10 text-success ring-1 ring-success/20',
  warning:
    'bg-warning/10 text-warning ring-1 ring-warning/20',
  destructive:
    'bg-destructive/10 text-destructive ring-1 ring-destructive/20',
  outline:
    'border border-[var(--glass-border)] text-fg-secondary',
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-medium leading-tight ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

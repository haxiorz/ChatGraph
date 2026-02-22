interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  selected?: boolean
  glass?: boolean
}

export function Card({
  interactive = false,
  selected = false,
  glass = false,
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-xl border transition-all duration-150 ${
        glass
          ? 'border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)]'
          : 'bg-[var(--color-surface)]'
      } ${
        selected
          ? 'border-accent/30 shadow-accent ring-1 ring-accent/15'
          : interactive
            ? 'border-[var(--glass-border)] shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:bg-[var(--glass-bg-elevated)] cursor-pointer'
            : 'border-[var(--glass-border)] shadow-xs'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  selected?: boolean
}

export function Card({
  interactive = false,
  selected = false,
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-xl border bg-surface transition-colors ${
        selected
          ? 'border-accent ring-2 ring-accent/20'
          : interactive
            ? 'border-border hover:border-border-strong cursor-pointer'
            : 'border-border'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

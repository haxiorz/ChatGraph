interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
  label?: string
}

export function Separator({ orientation = 'horizontal', className = '', label }: SeparatorProps) {
  if (orientation === 'vertical') {
    return <div className={`w-px self-stretch bg-gradient-to-b from-transparent via-border to-transparent ${className}`} />
  }

  if (label) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <span className="text-xs text-fg-muted">{label}</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
    )
  }

  return <div className={`h-px w-full bg-gradient-to-r from-transparent via-border to-transparent ${className}`} />
}

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Separator({ orientation = 'horizontal', className = '' }: SeparatorProps) {
  if (orientation === 'vertical') {
    return <div className={`w-px self-stretch bg-border ${className}`} />
  }
  return <div className={`h-px w-full bg-border ${className}`} />
}

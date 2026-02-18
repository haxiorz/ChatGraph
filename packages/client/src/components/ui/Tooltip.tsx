interface TooltipProps {
  label: string
  children: React.ReactNode
}

export function Tooltip({ label, children }: TooltipProps) {
  return (
    <span className="tooltip-trigger" data-tooltip={label}>
      {children}
    </span>
  )
}

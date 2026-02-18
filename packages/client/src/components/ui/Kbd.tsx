interface KbdProps {
  children: React.ReactNode
}

export function Kbd({ children }: KbdProps) {
  return (
    <kbd className="inline-flex items-center rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-fg-secondary">
      {children}
    </kbd>
  )
}

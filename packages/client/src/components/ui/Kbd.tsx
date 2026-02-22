interface KbdProps {
  children: React.ReactNode
}

export function Kbd({ children }: KbdProps) {
  return (
    <kbd className="inline-flex items-center rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-sm px-1.5 py-0.5 font-mono text-[11px] text-fg-secondary shadow-[0_1px_0_0_var(--glass-border)] active:translate-y-[1px] active:shadow-none transition-all">
      {children}
    </kbd>
  )
}

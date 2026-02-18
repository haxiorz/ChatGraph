interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center p-4">
      <div
        className={`${SIZE_CLASSES[size]} animate-spin rounded-full border-2 border-border border-t-accent`}
      />
    </div>
  )
}

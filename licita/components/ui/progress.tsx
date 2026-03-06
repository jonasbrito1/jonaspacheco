import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  color?: string
  className?: string
  showLabel?: boolean
}

export function Progress({ value, color = '#FFDF00', className, showLabel }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('relative', className)}>
      <div className="w-full h-2 bg-bg0 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-text2 mt-1">{pct}%</span>
      )}
    </div>
  )
}

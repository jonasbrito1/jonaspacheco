import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string
}

export function Badge({ className, color, style, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', className)}
      style={{ backgroundColor: `${color}22`, color: color, border: `1px solid ${color}44`, ...style }}
      {...props}
    >
      {children}
    </span>
  )
}

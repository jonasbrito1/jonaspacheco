import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full h-10 px-3 rounded-lg bg-bgInput border border-[#1a3a5c] text-text1 text-sm',
        'outline-none transition-colors appearance-none cursor-pointer',
        'focus:border-primary focus:ring-1 focus:ring-primary/30',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = 'Select'

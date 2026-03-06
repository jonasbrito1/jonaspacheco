import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full px-3 py-2 rounded-lg bg-bgInput border border-[#1a3a5c] text-text1 text-sm',
        'placeholder:text-text3 outline-none transition-colors resize-y min-h-[80px]',
        'focus:border-primary focus:ring-1 focus:ring-primary/30',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

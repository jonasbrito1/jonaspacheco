'use client'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm',
  {
    variants: {
      variant: {
        default: 'bg-primary text-bg0 hover:bg-primary-dark',
        secondary: 'bg-bg2 border border-[#1a3a5c] text-text1 hover:border-primary hover:text-primary',
        danger: 'bg-red/20 border border-red text-red hover:bg-red hover:text-white',
        ghost: 'text-text2 hover:text-text1 hover:bg-bg2',
        outline: 'border border-[#1a3a5c] text-text2 hover:border-primary hover:text-primary bg-transparent',
        green: 'bg-green text-white hover:bg-green-dark',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
)
Button.displayName = 'Button'

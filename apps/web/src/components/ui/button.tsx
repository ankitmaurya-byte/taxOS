import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#533afd] disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-[#533afd] text-white hover:bg-[#4434d4]': variant === 'default',
            'border border-[#b9b9f9] bg-white text-[#533afd] hover:bg-[rgba(83,58,253,0.05)]': variant === 'outline',
            'text-[#273951] hover:bg-[#f6f9fc]': variant === 'ghost',
            'bg-[#ea2261] text-white hover:bg-[#c91b52]': variant === 'destructive',
          },
          {
            'h-8 px-3 text-[13px]': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
          },
          className,
        )}
        style={{ fontWeight: 400, ...(props.style || {}) }}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

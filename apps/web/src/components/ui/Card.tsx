import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'interactive';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const baseStyles = 'rounded-card bg-white p-6 transition-all';
    const variants = {
      default: 'border border-neutral-200 shadow-sm',
      flat: 'border border-neutral-200',
      interactive:
        'border border-neutral-200 shadow-sm hover:shadow-md hover:border-brand-blue cursor-pointer',
    };

    return (
      <div ref={ref} className={cn(baseStyles, variants[variant], className)} {...props}>
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';


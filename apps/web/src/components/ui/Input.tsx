import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-brand-navy flex items-center gap-1 select-none"
        >
          {label}
          {required && (
            <span className="text-semantic-red" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            'w-full px-3.5 py-2.5 rounded-lg border bg-white text-brand-navy placeholder:text-neutral-400 text-base',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 min-h-touch',
            error
              ? 'border-semantic-red focus-visible:ring-semantic-red focus-visible:border-semantic-red'
              : 'border-neutral-300 focus-visible:ring-brand-blue focus-visible:border-brand-blue',
            'disabled:bg-neutral-100 disabled:cursor-not-allowed',
            className,
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-sm text-semantic-red flex items-center gap-1" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-neutral-500">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

import React from 'react';
import { cn } from '../../lib/utils';

export interface ToastProps {
  id: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  onDismiss?: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type = 'info',
  title,
  message,
  onDismiss,
}) => {
  const typeStyles = {
    info: 'border-brand-blue bg-brand-blue-light text-brand-navy',
    success: 'border-semantic-green bg-semantic-green-light text-brand-navy',
    warning: 'border-semantic-amber bg-semantic-amber-light text-brand-navy',
    error: 'border-semantic-red bg-semantic-red-light text-brand-navy',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'w-full max-w-sm rounded-lg border p-4 shadow-md flex items-start justify-between gap-3',
        typeStyles[type],
      )}
    >
      <div className="flex-1">
        {title && <h4 className="font-medium text-sm">{title}</h4>}
        <p className="text-sm mt-0.5">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={() => onDismiss(id)}
          aria-label="Dismiss notification"
          className="text-neutral-400 hover:text-brand-navy text-xs"
        >
          ✕
        </button>
      )}
    </div>
  );
};

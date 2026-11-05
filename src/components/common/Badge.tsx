import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber' | 'slate' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  className,
  dot = true
}) => {
  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200/90 shadow-2xs',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/90 shadow-2xs',
    danger: 'bg-rose-50 text-rose-800 border-rose-200/90 shadow-2xs',
    info: 'bg-sky-50 text-sky-800 border-sky-200/90 shadow-2xs',
    purple: 'bg-purple-50 text-purple-800 border-purple-200/90 shadow-2xs',
    amber: 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs',
    slate: 'bg-slate-100 text-slate-700 border-slate-200/90 shadow-2xs',
    cyan: 'bg-cyan-50 text-cyan-800 border-cyan-200/90 shadow-2xs'
  };

  const dotStyles = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
    slate: 'bg-slate-400',
    cyan: 'bg-cyan-500'
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[9px] font-bold',
    md: 'px-2.5 py-0.5 text-[11px] font-bold',
    lg: 'px-3 py-1 text-xs font-bold'
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md border tracking-wide uppercase font-mono select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && (
        <span className={clsx('h-1.5 w-1.5 rounded-full shrink-0', dotStyles[variant])} />
      )}
      <span>{children}</span>
    </span>
  );
};

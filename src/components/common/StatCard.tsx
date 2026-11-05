import React from 'react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  color?: 'amber' | 'blue' | 'emerald' | 'rose' | 'purple' | 'cyan' | 'slate';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'amber',
  onClick
}) => {
  const colorMap = {
    amber: 'bg-amber-50/90 text-amber-700 border-amber-200/80 group-hover:bg-amber-100/80 group-hover:border-amber-300',
    blue: 'bg-blue-50/90 text-blue-700 border-blue-200/80 group-hover:bg-blue-100/80 group-hover:border-blue-300',
    emerald: 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80 group-hover:bg-emerald-100/80 group-hover:border-emerald-300',
    rose: 'bg-rose-50/90 text-rose-700 border-rose-200/80 group-hover:bg-rose-100/80 group-hover:border-rose-300',
    purple: 'bg-purple-50/90 text-purple-700 border-purple-200/80 group-hover:bg-purple-100/80 group-hover:border-purple-300',
    cyan: 'bg-cyan-50/90 text-cyan-700 border-cyan-200/80 group-hover:bg-cyan-100/80 group-hover:border-cyan-300',
    slate: 'bg-slate-100/90 text-slate-700 border-slate-200/80 group-hover:bg-slate-200/80 group-hover:border-slate-300'
  };

  const topBorderMap = {
    amber: 'hover:border-t-amber-500',
    blue: 'hover:border-t-blue-500',
    emerald: 'hover:border-t-emerald-500',
    rose: 'hover:border-t-rose-500',
    purple: 'hover:border-t-purple-500',
    cyan: 'hover:border-t-cyan-500',
    slate: 'hover:border-t-slate-500'
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'group relative overflow-hidden rounded-xl border border-slate-200/90 p-4 sm:p-4.5 bg-white transition-all duration-200 shadow-2xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5',
        topBorderMap[color],
        onClick && 'cursor-pointer active:scale-[0.99]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">{title}</p>
          <p className="mt-1.5 text-2xl sm:text-[26px] font-black tracking-tight text-slate-900 leading-none">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500 font-medium truncate">{subtitle}</p>}
          {trend && (
            <span
              className={clsx(
                'mt-2 inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded',
                trend.isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
        <div className={clsx('rounded-xl p-2.5 sm:p-3 border shadow-2xs transition-all duration-200 shrink-0', colorMap[color])}>
          {icon}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  isHidden?: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  isHidden = false,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = '2xl'
}) => {
  useEffect(() => {
    if (!isOpen || isHidden) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (!isHidden) {
        document.body.style.overflow = 'auto';
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isHidden, onClose]);

  if (!isOpen) return null;

  const maxWidthMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl'
  };

  const modalNode = (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/70 backdrop-blur-[3px] animate-fade-in overflow-y-auto ${
        isHidden ? '!hidden pointer-events-none opacity-0' : ''
      }`}
      style={isHidden ? { display: 'none' } : undefined}
      aria-hidden={isHidden}
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidthMap[maxWidth]} max-h-[min(90vh,860px)] flex flex-col bg-white border border-slate-200/90 rounded-2xl shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] overflow-hidden my-auto transition-all`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Accent Strip */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-sky-500 shrink-0" />

        {/* Pinned Modal Header */}
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-200/90 bg-slate-50/90 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-snug">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5 font-medium leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition active:scale-95 cursor-pointer shrink-0"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5">
          {children}
        </div>

        {/* Pinned Modal Footer */}
        {footer && (
          <div className="shrink-0 border-t border-slate-200/90 bg-slate-50/95 px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};

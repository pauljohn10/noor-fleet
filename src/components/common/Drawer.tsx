import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = '2xl'
}) => {
  const { isRTL } = useI18n();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthMap = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl'
  };

  const drawerNode = (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-slate-900/65 backdrop-blur-[2px] transition-opacity animate-fade-in">
      <div className="absolute inset-0 overflow-hidden" onClick={onClose}>
        <div className={`pointer-events-none fixed inset-y-0 ${isRTL ? 'left-0 pr-10' : 'right-0 pl-10'} flex max-w-full`}>
          <div
            className={`pointer-events-auto w-screen ${widthMap[width]} bg-white border-slate-200 shadow-2xl flex flex-col ${isRTL ? 'border-r' : 'border-l'}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Top Accent Strip */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-sky-500 shrink-0" />

            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/90 bg-slate-50/90 shrink-0">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">{title}</h2>
                {subtitle && <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition active:scale-95 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawerNode, document.body) : drawerNode;
};

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

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

const MAX_WIDTH_PX: Record<NonNullable<ModalProps['maxWidth']>, number> = {
  sm: 384,
  md: 448,
  lg: 512,
  xl: 576,
  '2xl': 672,
  '3xl': 768,
  '4xl': 896,
  '5xl': 1024,
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  isHidden = false,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '2xl',
}) => {
  const { t, isRTL } = useI18n();

  useEffect(() => {
    if (!isOpen || isHidden) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (!isHidden) document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isHidden, onClose]);

  if (!isOpen) return null;

  const modalNode = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: isHidden ? 'none' : 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: 'rgba(22, 21, 19, 0.42)',
        overflowY: 'auto',
      }}
      aria-hidden={isHidden}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: MAX_WIDTH_PX[maxWidth],
          maxHeight: 'min(90vh, 860px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-page-bg)',
          color: 'var(--color-ink)',
          border: '1px solid var(--color-border)',
          borderRadius: 4,
          overflow: 'hidden',
          margin: 'auto',
          fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-ui)',
        }}
      >
        {/* Pinned Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            padding: '18px 24px',
            borderBottom: '1px solid var(--color-row-divider)',
            background: 'var(--color-surface)',
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-brand)',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: isRTL ? '0' : '-0.02em',
                color: 'var(--color-ink)',
                lineHeight: 1.2,
              }}
            >
              {t(title, title)}
            </h3>
            {subtitle && (
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                {t(subtitle, subtitle)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            title={t('Close (Esc)', 'Close (Esc)')}
            style={{
              padding: 6,
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px' }}>
          {children}
        </div>

        {/* Pinned Footer */}
        {footer && (
          <div
            style={{
              flexShrink: 0,
              borderTop: '1px solid var(--color-row-divider)',
              background: 'var(--color-surface)',
              padding: '14px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};

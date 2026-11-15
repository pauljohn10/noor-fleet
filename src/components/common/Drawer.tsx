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

const WIDTH_PX: Record<NonNullable<DrawerProps['width']>, number> = {
  md: 448,
  lg: 512,
  xl: 576,
  '2xl': 672,
  '3xl': 768,
  '4xl': 896,
};

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = '2xl',
}) => {
  const { isRTL, t } = useI18n();

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

  const drawerNode = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(22, 21, 19, 0.35)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: WIDTH_PX[width],
          height: '100%',
          background: 'var(--color-page-bg)',
          color: 'var(--color-ink)',
          borderInlineStart: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-ui)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-row-divider)',
            background: 'var(--color-surface)',
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-brand)',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: isRTL ? '0' : '-0.02em',
                color: 'var(--color-ink)',
              }}
            >
              {t(title, title)}
            </h2>
            {subtitle && (
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                {t(subtitle, subtitle)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            title={t('Close', 'Close')}
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
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>{children}</div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawerNode, document.body) : drawerNode;
};

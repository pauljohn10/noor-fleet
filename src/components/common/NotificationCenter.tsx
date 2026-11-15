import React, { useState } from 'react';
import { Bell, AlertTriangle, FileText, Wrench, Package, X } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { DESIGN_TOKENS } from '../../lib/designTokens';

export const NotificationCenter: React.FC = () => {
  const { notifications, markNotificationRead } = useFleet();
  const { isRTL, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'WORK_ORDER':
        return <Wrench size={14} style={{ color: DESIGN_TOKENS.colors.status.availableText }} />;
      case 'DOCUMENT':
        return <FileText size={14} style={{ color: DESIGN_TOKENS.colors.status.workshopText }} />;
      case 'STOCK':
        return <Package size={14} style={{ color: DESIGN_TOKENS.colors.status.outOfServiceText }} />;
      default:
        return <AlertTriangle size={14} style={{ color: DESIGN_TOKENS.colors.status.onTripText }} />;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={t('Notifications', 'Notifications')}
        style={{
          position: 'relative',
          padding: 7,
          color: 'var(--color-text-secondary)',
          background: 'transparent',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              insetInlineEnd: 2,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 4,
              background: DESIGN_TOKENS.colors.status.outOfServiceStripe,
              color: 'var(--color-surface)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsOpen(false)} />
          <div
            style={{
              position: 'absolute',
              [isRTL ? 'left' : 'right']: 0,
              marginTop: 8,
              zIndex: 50,
              width: 360,
              maxWidth: 'calc(100vw - 24px)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              overflow: 'hidden',
              fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-ui)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-row-divider)',
                background: 'var(--color-page-bg)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={14} style={{ color: 'var(--color-ink)' }} />
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                  {t('System Alerts', 'System Alerts')}
                </h4>
                {unreadCount > 0 && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: DESIGN_TOKENS.colors.status.outOfServiceText,
                      fontWeight: 600,
                    }}
                  >
                    {isRTL ? `${unreadCount} جديد` : `${unreadCount} new`}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title={t('Close', 'Close')}
                style={{
                  padding: 4,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12.5 }}>
                  {t('No system notifications currently.', 'No system notifications currently.')}
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--color-row-divider)',
                      borderInlineStart: !n.is_read
                        ? `3px solid ${DESIGN_TOKENS.colors.accent}`
                        : '3px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: 10,
                      opacity: n.is_read ? 0.7 : 1,
                      background: !n.is_read ? 'var(--color-surface)' : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        marginTop: 2,
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        background: 'var(--color-page-bg)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getCategoryIcon(n.category)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink)' }}>
                          {t(n.title, n.title)}
                        </p>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                        {n.message}
                      </p>
                      <span
                        dir="ltr"
                        style={{
                          display: 'block',
                          marginTop: 4,
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {new Date(n.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

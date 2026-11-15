import React from 'react';
import { useI18n } from '../../context/I18nContext';
import { DESIGN_TOKENS } from '../../lib/designTokens';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  color?: 'amber' | 'blue' | 'emerald' | 'rose' | 'purple' | 'cyan' | 'slate';
  onClick?: () => void;
}

const STRIPE_MAP: Record<NonNullable<StatCardProps['color']>, string> = {
  amber: DESIGN_TOKENS.colors.status.workshopStripe,
  blue: DESIGN_TOKENS.colors.status.onTripStripe,
  cyan: DESIGN_TOKENS.colors.status.onTripStripe,
  emerald: DESIGN_TOKENS.colors.status.availableStripe,
  rose: DESIGN_TOKENS.colors.status.outOfServiceStripe,
  purple: '#7C3AED',
  slate: '#6B665C',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  color = 'slate',
  onClick,
}) => {
  const { t, isRTL } = useI18n();
  const translatedTitle = t(title, title);
  const translatedSubtitle = subtitle ? t(subtitle, subtitle) : undefined;
  const translatedValue = typeof value === 'string' ? t(value, value) : value;
  const stripe = STRIPE_MAP[color] || STRIPE_MAP.slate;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px 14px',
        background: 'transparent',
        borderTop: '1px solid var(--color-row-divider)',
        borderBottom: '1px solid var(--color-row-divider)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => {
        if (onClick) e.currentTarget.style.background = 'var(--color-row-hover)';
      }}
      onMouseLeave={e => {
        if (onClick) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span
          style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: 2,
            background: stripe,
            flexShrink: 0,
          }}
        />
        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)' }}>
          {translatedTitle}
        </p>
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-brand)',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: isRTL ? '0' : '-0.03em',
          lineHeight: 1.1,
          color: 'var(--color-ink)',
        }}
      >
        {translatedValue}
      </p>
      {translatedSubtitle && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
          {translatedSubtitle}
        </p>
      )}
      {trend && (
        <span
          style={{
            display: 'inline-block',
            marginTop: 6,
            fontSize: 12,
            fontWeight: 500,
            color: trend.isPositive
              ? DESIGN_TOKENS.colors.status.availableText
              : DESIGN_TOKENS.colors.status.outOfServiceText,
          }}
        >
          {trend.isPositive ? '↑' : '↓'} {t(trend.value, trend.value)}
        </span>
      )}
    </div>
  );
};

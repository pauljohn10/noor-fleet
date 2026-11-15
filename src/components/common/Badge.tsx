import React from 'react';
import { useI18n } from '../../context/I18nContext';
import { DESIGN_TOKENS } from '../../lib/designTokens';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber' | 'slate' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dot?: boolean;
}

const VARIANT_COLORS: Record<NonNullable<BadgeProps['variant']>, { text: string; stripe: string }> = {
  success: { text: DESIGN_TOKENS.colors.status.availableText, stripe: DESIGN_TOKENS.colors.status.availableStripe },
  info: { text: DESIGN_TOKENS.colors.status.onTripText, stripe: DESIGN_TOKENS.colors.status.onTripStripe },
  cyan: { text: DESIGN_TOKENS.colors.status.onTripText, stripe: DESIGN_TOKENS.colors.status.onTripStripe },
  warning: { text: DESIGN_TOKENS.colors.status.workshopText, stripe: DESIGN_TOKENS.colors.status.workshopStripe },
  amber: { text: DESIGN_TOKENS.colors.status.workshopText, stripe: DESIGN_TOKENS.colors.status.workshopStripe },
  danger: { text: DESIGN_TOKENS.colors.status.outOfServiceText, stripe: DESIGN_TOKENS.colors.status.outOfServiceStripe },
  purple: { text: '#5B21B6', stripe: '#7C3AED' },
  slate: { text: '#5B574F', stripe: '#6B665C' },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  className = '',
  dot = true,
}) => {
  const { t } = useI18n();
  const resolvedContent = typeof children === 'string' ? t(children, children) : children;
  const palette = VARIANT_COLORS[variant] || VARIANT_COLORS.slate;

  const fontSize = size === 'sm' ? 11.5 : size === 'lg' ? 13 : 12.5;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize,
        fontWeight: 500,
        color: palette.text,
        userSelect: 'none',
        lineHeight: 1.3,
      }}
    >
      {dot && (
        <span
          style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: 2,
            background: palette.stripe,
            flexShrink: 0,
          }}
        />
      )}
      <span>{resolvedContent}</span>
    </span>
  );
};

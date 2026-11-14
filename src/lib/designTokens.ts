/**
 * Shared Noor Fleet editorial design tokens.
 * Warm-paper surface palette, ink typography, plate/focus accent (#0F5C4D),
 * and deep-green route telemetry panel colors.
 */
export const DESIGN_TOKENS = {
  colors: {
    pageBg: '#F4F1EA',
    surface: '#FFFDF8',
    ink: '#161513',
    textSecondary: '#5B574F',
    textMuted: '#6B665C',
    border: '#D9D4C8',
    rowDivider: '#DDD8CB',
    inputBorder: '#CFC9BA',
    rowHover: '#ECE8DE',
    sidebarHover: '#E8E3D8',
    accent: '#0F5C4D',
    focusRing: 'rgba(15, 92, 77, 0.2)',
    routePanel: {
      bg: '#0B3B33',
      grid: '#14584B',
      plannedRoute: '#1F7A68',
      activeRoute: '#8FD6C4',
      label: '#CDEBE3',
      body: '#BFE0D7',
    },
    status: {
      availableText: '#166534',
      availableStripe: '#16A34A',
      onTripText: '#1E40AF',
      onTripStripe: '#2563EB',
      workshopText: '#92400E',
      workshopStripe: '#D97706',
      outOfServiceText: '#991B1B',
      outOfServiceStripe: '#DC2626',
    },
  },
  fonts: {
    brand: "'Bricolage Grotesque', system-ui, sans-serif",
    ui: "'Instrument Sans', system-ui, sans-serif",
    mono: "'DM Mono', 'Courier New', monospace",
    arabic: "'IBM Plex Sans Arabic', system-ui, sans-serif",
  },
  radius: '4px',
} as const;

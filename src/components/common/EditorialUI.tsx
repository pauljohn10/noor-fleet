import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { DESIGN_TOKENS } from '../../lib/designTokens';

export interface StatusTabItem {
  key: string;
  label: string;
  count?: number;
  stripe?: string;
}

export interface DataColumn {
  label: string;
  align?: 'start' | 'end' | 'center';
  width?: number | string;
}

export const EDITORIAL_STATUS = {
  green: { stripe: DESIGN_TOKENS.colors.status.availableStripe, text: DESIGN_TOKENS.colors.status.availableText },
  blue: { stripe: DESIGN_TOKENS.colors.status.onTripStripe, text: DESIGN_TOKENS.colors.status.onTripText },
  amber: { stripe: DESIGN_TOKENS.colors.status.workshopStripe, text: DESIGN_TOKENS.colors.status.workshopText },
  red: { stripe: DESIGN_TOKENS.colors.status.outOfServiceStripe, text: DESIGN_TOKENS.colors.status.outOfServiceText },
  muted: { stripe: '#6B665C', text: '#5B574F' },
} as const;

export const PageContainer: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  const { isRTL } = useI18n();
  return (
    <div
      style={{
        padding: '32px 32px 48px',
        fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-ui)',
        minHeight: '100vh',
        background: 'var(--color-page-bg)',
        color: 'var(--color-ink)',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const PageShell = PageContainer;

export const PageHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}> = ({ title, subtitle, actions, badge }) => {
  const { isRTL } = useI18n();
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1
            style={{
              fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-brand)',
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: isRTL ? '0' : '-0.025em',
              lineHeight: 1.15,
              color: 'var(--color-ink)',
              margin: 0,
            }}
          >
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--color-text-muted)',
              marginTop: 8,
              marginBottom: 0,
              maxWidth: 520,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4, flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  dimWhenDisabled?: boolean;
}

export const EditorialButton: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  title,
  type = 'button',
  variant = 'primary',
  dimWhenDisabled = false,
  style,
  className,
  form,
  ...rest
}) => {
  const [hovered, setHovered] = useState(false);

  if (variant === 'primary') {
    return (
      <button
        {...rest}
        type={type}
        form={form}
        className={className}
        onClick={onClick}
        disabled={disabled}
        title={title}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '7px 16px',
          background: hovered && !disabled ? '#292724' : 'var(--color-ink)',
          color: 'var(--color-page-bg)',
          border: 'none',
          borderRadius: 4,
          fontSize: 13,
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          transition: 'background 0.12s',
          ...style,
        }}
      >
        {children}
      </button>
    );
  }

  if (variant === 'secondary') {
    return (
      <button
        {...rest}
        type={type}
        form={form}
        className={className}
        onClick={onClick}
        disabled={disabled}
        title={title}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '6px 12px',
          background: hovered && !disabled ? 'var(--color-sidebar-hover)' : 'var(--color-surface)',
          color: 'var(--color-ink)',
          border: '1px solid var(--color-input-border)',
          borderRadius: 4,
          fontSize: 13,
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          transition: 'background 0.12s',
          ...style,
        }}
      >
        {children}
      </button>
    );
  }

  if (variant === 'danger') {
    return (
      <button
        {...rest}
        type={type}
        form={form}
        className={className}
        onClick={onClick}
        disabled={disabled}
        title={title}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '7px 14px',
          background: hovered && !disabled ? '#7F1D1D' : '#991B1B',
          color: 'var(--color-surface)',
          border: 'none',
          borderRadius: 4,
          fontSize: 13,
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          transition: 'background 0.12s',
          ...style,
        }}
      >
        {children}
      </button>
    );
  }

  // ghost button: always readable (#5B574F) unless explicitly flagged dimWhenDisabled
  return (
    <button
      {...rest}
      type={type}
      form={form}
      className={className}
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '6px 12px',
        fontSize: 13,
        fontFamily: 'inherit',
        fontWeight: 500,
        color:
          disabled && dimWhenDisabled
            ? 'var(--color-text-muted)'
            : '#5B574F',
        background: hovered && !disabled ? 'var(--color-sidebar-hover)' : 'transparent',
        border: 'none',
        borderRadius: 4,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled && dimWhenDisabled ? 0.45 : 1,
        whiteSpace: 'nowrap',
        transition: 'background 0.12s, color 0.12s',
        ...style,
      }}
    >
      {children}
    </button>
  );
};

export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = props => (
  <EditorialButton {...props} variant="primary" />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = props => (
  <EditorialButton {...props} variant="secondary" />
);

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = props => (
  <EditorialButton {...props} variant="ghost" />
);

export const StatusTabs: React.FC<{
  tabs?: StatusTabItem[];
  activeKey?: string;
  onChange?: (key: string) => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  extraFilters?: React.ReactNode;
  leftSlot?: React.ReactNode;
}> = ({
  tabs = [],
  activeKey,
  onChange,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  extraFilters,
  leftSlot,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--color-row-divider)',
        marginBottom: 0,
        paddingBottom: 0,
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          maxWidth: '100%',
        }}
      >
        {tabs.map(tab => {
          const isActive = activeKey === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange?.(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
                marginBottom: -1,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--color-ink)' : 'var(--color-text-secondary)',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--color-ink)' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                transition: 'color 0.12s',
              }}
            >
              {tab.stripe && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: tab.stripe,
                    flexShrink: 0,
                  }}
                />
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: isActive ? 'var(--color-ink)' : 'var(--color-text-muted)',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
        {leftSlot}
      </div>

      {(extraFilters || onSearchChange) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
            flexWrap: 'wrap',
          }}
        >
          {extraFilters}
          {onSearchChange && (
            <div style={{ position: 'relative' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  insetInlineStart: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder={searchPlaceholder || 'Search...'}
                value={searchValue ?? ''}
                onChange={e => onSearchChange(e.target.value)}
                style={{
                  width: 240,
                  paddingBlock: 7,
                  paddingInlineStart: 30,
                  paddingInlineEnd: 10,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-input-border)',
                  borderRadius: 4,
                  color: 'var(--color-ink)',
                  outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--color-brand-accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-input-border)')}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const EditorialSelect: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { width?: number | string }
> = ({ width, style, ...rest }) => (
  <select
    {...rest}
    style={{
      width: width || 'auto',
      paddingBlock: 7,
      paddingInline: 10,
      fontSize: 13,
      fontFamily: 'inherit',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-input-border)',
      borderRadius: 4,
      color: 'var(--color-ink)',
      outline: 'none',
      cursor: 'pointer',
      ...style,
    }}
    onFocus={e => {
      e.target.style.borderColor = 'var(--color-brand-accent)';
      rest.onFocus?.(e);
    }}
    onBlur={e => {
      e.target.style.borderColor = 'var(--color-input-border)';
      rest.onBlur?.(e);
    }}
  />
);

export const EmptyState: React.FC<{
  message: string;
  onClearFilters?: () => void;
  clearFiltersLabel?: string;
  colSpan?: number;
}> = ({ message, onClearFilters, clearFiltersLabel, colSpan }) => {
  const { isRTL } = useI18n();
  const content = (
    <div style={{ padding: '64px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: onClearFilters ? 10 : 0 }}>
        {message}
      </div>
      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          style={{
            fontSize: 13,
            color: 'var(--color-brand-accent)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textDecoration: 'underline',
          }}
        >
          {clearFiltersLabel || (isRTL ? 'مسح الفلاتر' : 'Clear filters')}
        </button>
      )}
    </div>
  );

  if (colSpan !== undefined) {
    return (
      <tr>
        <td colSpan={colSpan}>{content}</td>
      </tr>
    );
  }
  return content;
};

export const DataTable: React.FC<{
  columns: DataColumn[];
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  onClearFilters?: () => void;
  clearFiltersLabel?: string;
  hasActionsColumn?: boolean;
  showPagination?: boolean;
}> = ({
  columns,
  children,
  isEmpty = false,
  emptyMessage = 'No records match query',
  onClearFilters,
  clearFiltersLabel,
  hasActionsColumn = true,
  showPagination = false,
}) => {
  const totalCols = columns.length + (hasActionsColumn ? 1 : 0);
  const sortCtrl = (children as any)?.__sortCtrl as
    | {
        sortColIndex: number | null;
        sortDirection: 'asc' | 'desc';
        onSort: (colIdx: number, colLabel: string) => void;
      }
    | undefined;

  const childArray = React.Children.toArray(children);
  const [internalPage, setInternalPage] = React.useState(1);
  const [internalPageSize, setInternalPageSize] = React.useState<number>(15);

  const totalInternalCount = childArray.length;
  const totalInternalPages = Math.max(1, Math.ceil(totalInternalCount / internalPageSize));
  const safeInternalPage = Math.min(Math.max(1, internalPage), totalInternalPages);

  React.useEffect(() => {
    setInternalPage(1);
  }, [totalInternalCount, internalPageSize]);

  const renderedChildren = showPagination
    ? childArray.slice(
        (safeInternalPage - 1) * internalPageSize,
        safeInternalPage * internalPageSize
      )
    : children;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: isEmpty ? 'fixed' : 'auto' }}>
        <thead>
          <tr>
            {columns.map((col, idx) => {
              const isSorted = sortCtrl?.sortColIndex === idx;
              return (
                <th
                  key={idx}
                  className={
                    sortCtrl && col.label
                      ? `nf-sortable-th ${isSorted ? 'is-sorted' : ''}`
                      : undefined
                  }
                  onClick={
                    sortCtrl && col.label
                      ? () => sortCtrl.onSort(idx, col.label)
                      : undefined
                  }
                  style={{
                    width: col.width,
                    padding: '11px 16px',
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: isSorted ? 'var(--color-ink)' : 'var(--color-text-muted)',
                    textAlign: col.align || 'start',
                    background: 'var(--color-page-bg)',
                    borderBottom: '1px solid var(--color-row-divider)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 5,
                    whiteSpace: 'nowrap',
                    cursor: sortCtrl && col.label ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span>{col.label}</span>
                    {sortCtrl && col.label && (
                      <span
                        className="nf-sort-icon"
                        style={{
                          fontSize: 12,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {isSorted ? (sortCtrl.sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
            {hasActionsColumn && (
              <th
                style={{
                  width: 96,
                  padding: '11px 16px',
                  background: 'var(--color-page-bg)',
                  borderBottom: '1px solid var(--color-row-divider)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 5,
                }}
              />
            )}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <EmptyState
              colSpan={totalCols}
              message={emptyMessage}
              onClearFilters={onClearFilters}
              clearFiltersLabel={clearFiltersLabel}
            />
          ) : (
            renderedChildren
          )}
        </tbody>
      </table>
      {showPagination && (
        <TableFooter
          summaryText={`${Array.isArray(renderedChildren) ? renderedChildren.length : 0} / ${totalInternalCount}`}
          page={safeInternalPage}
          totalPages={totalInternalPages}
          pageSize={internalPageSize}
          totalRecords={totalInternalCount}
          onPageChange={setInternalPage}
          onPageSizeChange={setInternalPageSize}
          onPrev={() => setInternalPage((p) => Math.max(1, p - 1))}
          onNext={() => setInternalPage((p) => Math.min(totalInternalPages, p + 1))}
        />
      )}
    </div>
  );
};

export const DataRow: React.FC<{
  stripeColor?: string;
  onClick?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ stripeColor = 'transparent', onClick, actions, children, style }) => {
  return (
    <tr
      className="nf-data-row"
      onClick={onClick}
      style={{
        borderBottom: '1px solid var(--color-row-divider)',
        borderInlineStart: `3px solid ${stripeColor}`,
        height: 76,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
      {actions !== undefined && (
        <td
          style={{
            padding: '14px 16px',
            verticalAlign: 'middle',
            textAlign: 'end',
            whiteSpace: 'nowrap',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div
            className="nf-row-actions"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 4,
            }}
          >
            {actions}
          </div>
        </td>
      )}
    </tr>
  );
};

export const RowAction: React.FC<{
  icon: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  danger?: boolean;
}> = ({ icon, title, onClick, danger }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onClick(e);
      }}
      title={title}
      aria-label={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 4,
        border: 'none',
        background: hovered ? (danger ? '#FEF2F2' : 'var(--color-sidebar-hover)') : 'transparent',
        color: hovered ? (danger ? '#991B1B' : 'var(--color-ink)') : 'var(--color-text-muted)',
        cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      {icon}
    </button>
  );
};

export const PlateChip: React.FC<{
  plate: string;
  accentColor?: string;
}> = ({ plate, accentColor = 'var(--color-brand-accent)' }) => (
  <span
    dir="ltr"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      border: '1.5px solid var(--color-ink)',
      borderRadius: 4,
      overflow: 'hidden',
      background: 'var(--color-surface)',
      whiteSpace: 'nowrap',
    }}
  >
    <span style={{ width: 6, alignSelf: 'stretch', background: accentColor, flexShrink: 0 }} />
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '0.08em',
        color: 'var(--color-ink)',
        padding: '4px 8px',
        direction: 'ltr',
      }}
    >
      {plate}
    </span>
  </span>
);

export const EmptyDash: React.FC<{
  label?: string;
}> = ({ label = 'Unassigned' }) => (
  <span
    aria-label={label}
    title={label}
    style={{
      color: 'var(--color-text-muted)',
      fontStyle: 'normal',
      fontSize: 14,
    }}
  >
    —
  </span>
);

export const StatusText: React.FC<{
  label: string;
  color?: string;
  subtext?: string;
  monoSubtext?: boolean;
}> = ({ label, color = 'var(--color-text-secondary)', subtext, monoSubtext = false }) => (
  <div>
    <span style={{ fontSize: 13, fontWeight: 600, color }}>{label}</span>
    {subtext && (
      <div
        style={{
          fontSize: 12.5,
          color: 'var(--color-text-muted)',
          marginTop: 2,
          fontFamily: monoSubtext ? 'var(--font-mono)' : 'inherit',
        }}
      >
        {subtext}
      </div>
    )}
  </div>
);

export const PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 15;

function buildPaginationRange(currentPage: number, totalPages: number): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  const safeTotal = Math.max(1, totalPages);
  const safeCurrent = Math.min(Math.max(1, currentPage), safeTotal);

  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [1];

  const start = Math.max(2, safeCurrent - 1);
  const end = Math.min(safeTotal - 1, safeCurrent + 1);

  if (start > 2) {
    pages.push('ellipsis-start');
  }

  for (let p = start; p <= end; p++) {
    pages.push(p);
  }

  if (end < safeTotal - 1) {
    pages.push('ellipsis-end');
  }

  pages.push(safeTotal);
  return pages;
}

export const TableFooter: React.FC<{
  summaryText: string;
  page?: number;
  totalPages?: number;
  pageSize?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
}> = ({
  summaryText,
  page = 1,
  totalPages = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  onPrev,
  onNext,
}) => {
  const { isRTL } = useI18n();
  const safeTotalPages = Math.max(
    1,
    totalRecords !== undefined && pageSize > 0
      ? Math.ceil(totalRecords / pageSize)
      : totalPages
  );
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const pageItems = buildPaginationRange(safePage, safeTotalPages);

  const rangeStart =
    totalRecords !== undefined
      ? totalRecords === 0
        ? 0
        : (safePage - 1) * pageSize + 1
      : null;
  const rangeEnd =
    totalRecords !== undefined
      ? Math.min(safePage * pageSize, totalRecords)
      : null;

  const handleGoToPage = (targetPage: number) => {
    const clamped = Math.min(Math.max(1, targetPage), safeTotalPages);
    if (clamped === safePage) return;
    if (onPageChange) {
      onPageChange(clamped);
    } else if (clamped < safePage && onPrev) {
      const steps = safePage - clamped;
      for (let i = 0; i < steps; i++) onPrev();
    } else if (clamped > safePage && onNext) {
      const steps = clamped - safePage;
      for (let i = 0; i < steps; i++) onNext();
    }
  };

  const handlePrevClick = () => {
    if (safePage <= 1) return;
    if (onPrev) {
      onPrev();
    } else if (onPageChange) {
      onPageChange(safePage - 1);
    }
  };

  const handleNextClick = () => {
    if (safePage >= safeTotalPages) return;
    if (onNext) {
      onNext();
    } else if (onPageChange) {
      onPageChange(safePage + 1);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px 16px',
        padding: '14px 0 4px',
        fontSize: 13,
        fontFamily: 'var(--font-ui)',
        color: 'var(--color-text-muted)',
      }}
    >
      {/* Left: Single-line record summary in UI font */}
      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500, fontFamily: 'var(--font-ui)' }}>
        {summaryText}
      </span>

      {/* Right: Rows per page selector + Page numbers (1, 2, 3...) + Previous / Next */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px 12px',
          maxWidth: '100%',
        }}
      >
        {onPageSizeChange && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
              {isRTL ? 'سجلات لكل صفحة:' : 'Rows per page:'}
            </span>
            <select
              aria-label={isRTL ? 'سجلات لكل صفحة' : 'Rows per page'}
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              style={{
                height: 30,
                padding: '0 8px',
                fontSize: 12.5,
                fontFamily: 'var(--font-ui)',
                fontWeight: 500,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-input-border)',
                borderRadius: 4,
                color: 'var(--color-ink)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {PAGE_SIZE_OPTIONS.map(sizeOpt => (
                <option key={sizeOpt} value={sizeOpt}>
                  {sizeOpt}
                </option>
              ))}
            </select>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 4,
          }}
        >
          <EditorialButton
            variant="ghost"
            disabled={safePage <= 1}
            dimWhenDisabled
            onClick={handlePrevClick}
            style={{ height: 30, padding: '0 10px', fontSize: 12 }}
          >
            {isRTL ? 'السابق' : 'Previous'}
          </EditorialButton>

          {pageItems.map(item => {
            if (item === 'ellipsis-start' || item === 'ellipsis-end') {
              return (
                <span
                  key={item}
                  style={{
                    padding: '0 4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    userSelect: 'none',
                  }}
                >
                  …
                </span>
              );
            }
            const isCurrent = item === safePage;
            return (
              <button
                key={item}
                type="button"
                onClick={() => handleGoToPage(item)}
                aria-current={isCurrent ? 'page' : undefined}
                style={{
                  minWidth: 30,
                  height: 30,
                  padding: '0 8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: isCurrent ? 700 : 500,
                  borderRadius: 4,
                  border: isCurrent
                    ? '1px solid var(--color-ink)'
                    : '1px solid var(--color-input-border)',
                  background: isCurrent ? 'var(--color-ink)' : 'var(--color-surface)',
                  color: isCurrent ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                  cursor: isCurrent ? 'default' : 'pointer',
                  transition: 'background 0.12s, color 0.12s',
                }}
              >
                {item}
              </button>
            );
          })}

          <EditorialButton
            variant="ghost"
            disabled={safePage >= safeTotalPages}
            dimWhenDisabled
            onClick={handleNextClick}
            style={{ height: 30, padding: '0 10px', fontSize: 12 }}
          >
            {isRTL ? 'التالي' : 'Next'}
          </EditorialButton>
        </div>
      </div>
    </div>
  );
};

export interface MetricItem {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  stripe?: string;
  valueColor?: string;
  onClick?: () => void;
  mono?: boolean;
}

export const MetricStrip: React.FC<{
  items: MetricItem[];
  marginBottom?: number;
}> = ({ items, marginBottom = 28 }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      borderTop: '1px solid var(--color-row-divider)',
      borderBottom: '1px solid var(--color-row-divider)',
      marginBottom,
    }}
  >
    {items.map((item, idx) => (
      <div
        key={idx}
        onClick={item.onClick}
        style={{
          padding: '18px 20px',
          borderInlineEnd: idx < items.length - 1 ? '1px solid var(--color-row-divider)' : 'none',
          cursor: item.onClick ? 'pointer' : 'default',
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => {
          if (item.onClick) e.currentTarget.style.background = 'var(--color-row-hover)';
        }}
        onMouseLeave={e => {
          if (item.onClick) e.currentTarget.style.background = 'transparent';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          {item.stripe && (
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: 2,
                background: item.stripe,
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)' }}>
            {item.label}
          </span>
        </div>
        <div
          style={{
            fontFamily: item.mono ? 'var(--font-mono)' : 'var(--font-brand)',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: item.mono ? '-0.01em' : '-0.03em',
            lineHeight: 1.1,
            color: item.valueColor || 'var(--color-ink)',
          }}
        >
          {item.value}
        </div>
        {item.subtext && (
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            {item.subtext}
          </div>
        )}
      </div>
    ))}
  </div>
);

export const EditorialSection: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  marginTop?: number;
}> = ({ title, subtitle, action, children, marginTop = 28 }) => {
  const { isRTL } = useI18n();
  return (
    <section style={{ marginTop }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          paddingBottom: 10,
          borderBottom: '1px solid var(--color-row-divider)',
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
            {title}
          </h2>
          {subtitle && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
};

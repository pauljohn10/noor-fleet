import React, { useState, useEffect } from 'react';
import { Search, Truck, Wrench, Package, FileText, User } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { DESIGN_TOKENS } from '../../lib/designTokens';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult?: (type: string, id: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  onSelectResult,
}) => {
  const { vehicles, trailers, workOrders, parts, drivers, technicians } = useFleet();
  const { t, isRTL } = useI18n();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const matchedVehicles = q
    ? vehicles.filter(
        v =>
          v.plate_number.toLowerCase().includes(q) ||
          v.vehicle_id.toLowerCase().includes(q) ||
          v.fleet_number.toLowerCase().includes(q) ||
          v.vin.toLowerCase().includes(q)
      )
    : [];

  const matchedTrailers = q
    ? trailers.filter(
        tr =>
          tr.plate_number.toLowerCase().includes(q) ||
          tr.trailer_id.toLowerCase().includes(q) ||
          tr.trailer_number.toLowerCase().includes(q) ||
          tr.vin.toLowerCase().includes(q)
      )
    : [];

  const matchedWorkOrders = q
    ? workOrders.filter(
        w =>
          w.work_order_number.toLowerCase().includes(q) ||
          w.problem_description.toLowerCase().includes(q)
      )
    : [];

  const matchedParts = q
    ? parts.filter(
        p =>
          p.part_number.toLowerCase().includes(q) ||
          p.part_name.toLowerCase().includes(q)
      )
    : [];

  const matchedDrivers = q
    ? drivers.filter(
        d =>
          d.full_name.toLowerCase().includes(q) ||
          d.employee_id.toLowerCase().includes(q)
      )
    : [];

  const matchedTechs = q
    ? technicians.filter(
        tech =>
          tech.full_name.toLowerCase().includes(q) ||
          tech.employee_id.toLowerCase().includes(q)
      )
    : [];

  const hasResults =
    matchedVehicles.length > 0 ||
    matchedTrailers.length > 0 ||
    matchedWorkOrders.length > 0 ||
    matchedParts.length > 0 ||
    matchedDrivers.length > 0 ||
    matchedTechs.length > 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 72,
        paddingInline: 16,
        backgroundColor: 'rgba(22, 21, 19, 0.42)',
        fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-ui)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 680,
          background: 'var(--color-page-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {/* Search bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-row-divider)',
          }}
        >
          <Search size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={
              isRTL
                ? 'البحث الشامل باللوحة، رقم الشاحنة، رقم الهيكل، أمر العمل، قطعة الغيار، السائق...'
                : 'Global Search by Plate, Fleet #, VIN, Work Order #, Part #, Driver...'
            }
            style={{
              width: '100%',
              background: 'transparent',
              color: 'var(--color-ink)',
              fontSize: 13.5,
              border: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '3px 8px',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              background: 'var(--color-page-bg)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Esc
          </button>
        </div>

        {/* Results body */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: 16 }}>
          {!q && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-muted)' }}>
              <Search size={28} style={{ margin: '0 auto 10px', opacity: 0.45 }} />
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: 'var(--color-ink)' }}>
                {isRTL
                  ? 'اكتب للبحث الفوري في سجلات الشاحنات، الصهاريج، أوامر الصيانة، قطع الغيار، وطاقم العمل'
                  : 'Type to search across Trucks, Trailers, Work Orders, Parts & Staff'}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 12 }}>
                {isRTL
                  ? 'جرب البحث برقم الشاحنة أو "أمر عمل" أو "فرامل" أو اسم السائق'
                  : 'Try searching by Truck ID, "WO-2026", "Brake Pad", or Driver name'}
              </p>
            </div>
          )}

          {q && !hasResults && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-muted)', fontSize: 13 }}>
              {isRTL
                ? `لا توجد نتائج مطابقة لـ "${query}"`
                : `No matching fleet records found for "${query}"`}
            </div>
          )}

          {matchedVehicles.length > 0 && (
            <SearchGroup
              icon={<Truck size={14} />}
              title={`${isRTL ? 'شاحنات ورؤوس النقل' : 'Tractor Head Trucks'} (${matchedVehicles.length})`}
            >
              {matchedVehicles.map(v => (
                <SearchResultRow
                  key={v.id}
                  onClick={() => {
                    onSelectResult?.('vehicle', v.id);
                    onClose();
                  }}
                  primary={`${v.vehicle_id} (${v.plate_number})`}
                  secondary={`${v.make} ${v.model} · ${isRTL ? 'الأسطول' : 'Fleet'} #${v.fleet_number}`}
                  meta={t(v.status, v.status)}
                  metaColor={DESIGN_TOKENS.colors.status.availableText}
                />
              ))}
            </SearchGroup>
          )}

          {matchedTrailers.length > 0 && (
            <SearchGroup
              icon={<Truck size={14} />}
              title={`${isRTL ? 'مقطورات وصهاريج الوقود' : 'Tanker Trailers'} (${matchedTrailers.length})`}
            >
              {matchedTrailers.map(tr => (
                <SearchResultRow
                  key={tr.id}
                  onClick={() => {
                    onSelectResult?.('trailer', tr.id);
                    onClose();
                  }}
                  primary={`${tr.trailer_id} (${tr.plate_number})`}
                  secondary={`${(tr.tank_capacity_liters || 0).toLocaleString()} ${isRTL ? 'لتر' : 'L'} · ${tr.number_of_compartments || 0} ${isRTL ? 'خزانات' : 'Compartments'}`}
                  meta={t(tr.status, tr.status)}
                  metaColor={DESIGN_TOKENS.colors.status.onTripText}
                />
              ))}
            </SearchGroup>
          )}

          {matchedWorkOrders.length > 0 && (
            <SearchGroup
              icon={<Wrench size={14} />}
              title={`${isRTL ? 'أوامر العمل وبطاقات الصيانة' : 'Work Orders / Job Cards'} (${matchedWorkOrders.length})`}
            >
              {matchedWorkOrders.map(w => (
                <SearchResultRow
                  key={w.id}
                  onClick={() => {
                    onSelectResult?.('workOrder', w.id);
                    onClose();
                  }}
                  primary={w.work_order_number}
                  secondary={w.problem_description}
                  meta={t(w.status, w.status)}
                  metaColor={DESIGN_TOKENS.colors.status.workshopText}
                />
              ))}
            </SearchGroup>
          )}

          {matchedParts.length > 0 && (
            <SearchGroup
              icon={<Package size={14} />}
              title={`${isRTL ? 'مخزن قطع الغيار' : 'Spare Parts Store'} (${matchedParts.length})`}
            >
              {matchedParts.map(p => (
                <SearchResultRow
                  key={p.id}
                  onClick={() => {
                    onSelectResult?.('part', p.id);
                    onClose();
                  }}
                  primary={p.part_number}
                  secondary={p.part_name}
                  meta={isRTL ? `الرصيد: ${p.current_stock}` : `Stock: ${p.current_stock}`}
                  metaColor="var(--color-ink)"
                />
              ))}
            </SearchGroup>
          )}

          {matchedDrivers.length > 0 && (
            <SearchGroup
              icon={<User size={14} />}
              title={`${isRTL ? 'السائقون' : 'Drivers'} (${matchedDrivers.length})`}
            >
              {matchedDrivers.map(d => (
                <SearchResultRow
                  key={d.id}
                  onClick={() => {
                    onSelectResult?.('driver', d.id);
                    onClose();
                  }}
                  primary={d.full_name}
                  secondary={d.employee_id}
                  meta={t(d.status, d.status)}
                  metaColor={DESIGN_TOKENS.colors.status.onTripText}
                />
              ))}
            </SearchGroup>
          )}

          {matchedTechs.length > 0 && (
            <SearchGroup
              icon={<FileText size={14} />}
              title={`${isRTL ? 'الفنيون والميكانيكيون' : 'Technicians'} (${matchedTechs.length})`}
            >
              {matchedTechs.map(tech => (
                <SearchResultRow
                  key={tech.id}
                  onClick={() => {
                    onSelectResult?.('technician', tech.id);
                    onClose();
                  }}
                  primary={tech.full_name}
                  secondary={tech.employee_id}
                  meta={t(tech.status, tech.status)}
                  metaColor={DESIGN_TOKENS.colors.status.availableText}
                />
              ))}
            </SearchGroup>
          )}
        </div>
      </div>
    </div>
  );
};

const SearchGroup: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <div style={{ marginBottom: 16 }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        paddingBottom: 6,
        borderBottom: '1px solid var(--color-row-divider)',
      }}
    >
      {icon}
      <span>{title}</span>
    </div>
    <div>{children}</div>
  </div>
);

const SearchResultRow: React.FC<{
  onClick: () => void;
  primary: string;
  secondary?: string;
  meta: string;
  metaColor: string;
}> = ({ onClick, primary, secondary, meta, metaColor }) => (
  <div
    className="nf-data-row"
    onClick={onClick}
    style={{
      padding: '10px 8px',
      borderBottom: '1px solid var(--color-row-divider)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}
  >
    <div style={{ minWidth: 0 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }} dir="ltr">
        {primary}
      </span>
      {secondary && (
        <span style={{ marginInlineStart: 10, fontSize: 12.5, color: 'var(--color-text-muted)' }}>
          {secondary}
        </span>
      )}
    </div>
    <span style={{ fontSize: 12, fontWeight: 500, color: metaColor, flexShrink: 0 }}>{meta}</span>
  </div>
);

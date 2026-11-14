import React, { useState } from 'react';
import { Eye, Edit3, Trash2, Search } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { VehicleFormModal } from './VehicleFormModal';
import { VehicleDetailDrawer } from './VehicleDetailDrawer';
import { Vehicle } from '../../types';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';

/* ── Design-token helpers ──────────────────────────────────────── */
const STATUS_META: Record<
  string,
  { text: string; stripe: string; label: string; labelAr: string }
> = {
  AVAILABLE:      { text: '#166534', stripe: '#16A34A', label: 'Available',       labelAr: 'متاح' },
  ON_TRIP:        { text: '#1E40AF', stripe: '#2563EB', label: 'On trip',          labelAr: 'في رحلة' },
  IN_WORKSHOP:    { text: '#92400E', stripe: '#D97706', label: 'In workshop',      labelAr: 'في الورشة' },
  OUT_OF_SERVICE: { text: '#991B1B', stripe: '#DC2626', label: 'Out of service',   labelAr: 'خارج الخدمة' },
  SOLD:           { text: '#6B665C', stripe: '#9CA3AF', label: 'Sold',             labelAr: 'مباع' },
  RETIRED:        { text: '#6B665C', stripe: '#9CA3AF', label: 'Retired',          labelAr: 'متقاعد' },
};

const STATUS_TABS: { key: string; label: string; labelAr: string }[] = [
  { key: 'ALL',            label: 'All',            labelAr: 'الكل' },
  { key: 'AVAILABLE',      label: 'Available',      labelAr: 'متاح' },
  { key: 'ON_TRIP',        label: 'On trip',        labelAr: 'في رحلة' },
  { key: 'IN_WORKSHOP',    label: 'In workshop',    labelAr: 'في الورشة' },
  { key: 'OUT_OF_SERVICE', label: 'Out of service', labelAr: 'خارج الخدمة' },
];

export const isTractorTruck = (v: Vehicle): boolean => {
  return !(
    v.vehicle_type === 'SMALL_VEHICLE' ||
    v.vehicle_id.startsWith('SV-') ||
    Boolean(v.notes && v.notes.includes('Small Vehicles'))
  );
};

/* ── Main Trucks Master component ──────────────────────────────── */
export const VehicleList: React.FC = () => {
  const { vehicles, deleteVehicle, drivers, trailers } = useFleet();
  const { hasPermission } = useAuth();
  const { isRTL } = useI18n();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle]   = useState<Vehicle | undefined>(undefined);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Filter ONLY Heavy Tractor Trucks (Trucks Master)
  const tractorTrucks = vehicles.filter(isTractorTruck);

  // Search & Status filtering
  const filtered = tractorTrucks.filter(v => {
    const q = search.toLowerCase();
    const assignedDriver = drivers.find(d => d.id === v.assigned_driver_id);
    const driverName = assignedDriver?.full_name || '';

    const matchesSearch =
      v.vehicle_id.toLowerCase().includes(q) ||
      v.plate_number.toLowerCase().includes(q) ||
      v.fleet_number.toLowerCase().includes(q) ||
      v.vin.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      driverName.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Status counts
  const counts = STATUS_TABS.reduce<Record<string, number>>((acc, tab) => {
    acc[tab.key] = tab.key === 'ALL'
      ? tractorTrucks.length
      : tractorTrucks.filter(v => v.status === tab.key).length;
    return acc;
  }, {});

  // Exports
  const handleExportExcel = () => {
    const data = filtered.map(v => {
      const trl = trailers.find(t => t.id === v.assigned_trailer_id);
      const drv = drivers.find(d => d.id === v.assigned_driver_id);
      return {
        'Vehicle ID': v.vehicle_id,
        'Plate Number': v.plate_number,
        'Fleet Number': v.fleet_number,
        'Make': v.make,
        'Model': v.model,
        'Year': v.year,
        'VIN': v.vin,
        'Mileage (KM)': v.current_mileage,
        'Hours': v.current_engine_hours,
        'Assigned Driver': drv ? drv.full_name : 'Unassigned',
        'Coupled Trailer': trl ? `${trl.trailer_id} (${trl.plate_number})` : 'Uncoupled',
        'Status': v.status,
        'Location': v.station_location,
      };
    });
    exportToExcel(data, 'Fuel_Fleet_Tractor_Trucks');
  };

  const handleExportPDF = () => {
    const headers = ['Vehicle ID', 'Plate', 'Fleet #', 'Make & Model', 'Trailer', 'Driver', 'Odometer', 'Status'];
    const rows = filtered.map(v => {
      const trl = trailers.find(t => t.id === v.assigned_trailer_id);
      const drv = drivers.find(d => d.id === v.assigned_driver_id);
      return [
        v.vehicle_id,
        v.plate_number,
        v.fleet_number || '—',
        `${v.make} ${v.model}`,
        trl ? trl.trailer_id : 'Unassigned',
        drv ? drv.full_name : 'Unassigned',
        `${(v.current_mileage || 0).toLocaleString()} km`,
        v.status,
      ];
    });

    exportToPDFReport(
      'Fuel Fleet Tractor Trucks Register',
      headers,
      rows,
      'Fuel_Fleet_Tractor_Trucks',
      {
        orientation: 'landscape',
        subtitle: 'Commercial Fuel Transportation Tractor Units, Assigned Tankers & Driver Roster',
        summaryKPIs: [
          { label: 'Total Tractor Heads', value: tractorTrucks.length, color: 'slate' },
          { label: 'Operational', value: tractorTrucks.filter(v => v.status === 'AVAILABLE' || v.status === 'ON_TRIP').length, color: 'emerald' },
          { label: 'In Workshop / OOS', value: tractorTrucks.filter(v => v.status === 'IN_WORKSHOP' || v.status === 'OUT_OF_SERVICE').length, color: 'rose' },
        ],
        metadata: [
          { label: 'Master Category', value: 'Heavy Tractor Trucks' },
          { label: 'Status Filter', value: statusFilter },
          { label: 'Scope', value: `${filtered.length} vehicles listed` },
        ],
      }
    );
  };

  return (
    <div style={{ padding: '32px 32px 48px', fontFamily: 'var(--font-ui)', minHeight: '100vh' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-brand)',
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            color: 'var(--color-ink)',
            margin: 0,
          }}>
            {isRTL ? 'نقل الوقود' : 'Fuel Transport'}
            <br />
            {isRTL ? 'الشاحنات الرئيسية' : 'Tractor Trucks'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8, maxWidth: 440, lineHeight: 1.5 }}>
            {isRTL
              ? 'قائمة رئيسية لشاحنات نقل الوقود، بيانات المسافة، السائقين، وحالة الاقتران.'
              : 'Master list of heavy tractor head trucks, mileage telemetry, assigned drivers and coupling status.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <GhostBtn onClick={handleExportExcel} disabled={filtered.length === 0}>
            {isRTL ? 'إكسل' : 'Excel'}
          </GhostBtn>
          <GhostBtn onClick={handleExportPDF} disabled={filtered.length === 0}>
            {isRTL ? 'تقرير PDF' : 'PDF report'}
          </GhostBtn>
          {hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) && (
            <button
              onClick={() => { setEditingVehicle(undefined); setIsFormOpen(true); }}
              style={{
                padding: '7px 16px',
                background: 'var(--color-ink)',
                color: 'var(--color-page-bg)',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                whiteSpace: 'nowrap',
              }}
            >
              {isRTL ? '+ إضافة شاحنة وقود' : '+ Add fuel truck'}
            </button>
          )}
        </div>
      </div>

      {/* Status tabs row + search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-row-divider)',
        marginBottom: 0,
        paddingBottom: 0,
        gap: 16,
      }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
          {STATUS_TABS.map(tab => {
            const isActive = statusFilter === tab.key;
            const meta = STATUS_META[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--color-ink)' : 'var(--color-text-secondary)',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--color-ink)' : '2px solid transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.12s',
                  marginBottom: -1,
                }}
              >
                {meta && (
                  <span style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: meta.stripe,
                    flexShrink: 0,
                  }} />
                )}
                <span>{isRTL ? tab.labelAr : tab.label}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: isActive ? 'var(--color-ink)' : 'var(--color-text-muted)',
                }}>
                  {counts[tab.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 4 }}>
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
            placeholder={isRTL ? 'اللوحة، أسطول #، VIN، الصنع...' : 'Plate, fleet #, VIN, make...'}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: 230,
              padding: '7px 10px 7px 30px',
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
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
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-row-divider)' }}>
              {[
                { label: isRTL ? 'المركبة' : 'Vehicle',               align: 'start' as const },
                { label: isRTL ? 'الصنع والموديل' : 'Make and model', align: 'start' as const },
                { label: isRTL ? 'عداد المسافة' : 'Odometer',        align: 'end' as const },
                { label: isRTL ? 'السائق' : 'Driver',                 align: 'start' as const },
                { label: isRTL ? 'المقطورة' : 'Trailer',              align: 'start' as const },
                { label: isRTL ? 'الحالة' : 'Status',                 align: 'start' as const },
                { label: '',                                           align: 'end' as const },
              ].map((col, i) => (
                <th
                  key={i}
                  style={{
                    padding: '10px 16px',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--color-text-muted)',
                    textAlign: col.align,
                    background: 'var(--color-page-bg)',
                    position: 'sticky',
                    top: 52,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '64px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                    {isRTL ? 'لا توجد شاحنات وقود مطابقة' : 'No fuel trucks match query'}
                  </div>
                  <button
                    onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
                    style={{
                      fontSize: 13,
                      color: 'var(--color-brand-accent)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                      textDecoration: 'underline',
                    }}
                  >
                    {isRTL ? 'مسح الفلاتر' : 'Clear filters'}
                  </button>
                </td>
              </tr>
            ) : (
              paged.map(v => {
                const driver  = drivers.find(d => d.id === v.assigned_driver_id);
                const trailer = trailers.find(t => t.id === v.assigned_trailer_id);
                const meta    = STATUS_META[v.status] || STATUS_META['AVAILABLE'];
                return (
                  <VehicleRow
                    key={v.id}
                    v={v}
                    driver={driver?.full_name}
                    trailerLabel={trailer?.trailer_id}
                    trailerPlate={trailer?.plate_number}
                    meta={meta}
                    isRTL={isRTL}
                    canEdit={hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER'])}
                    canDelete={hasPermission(['SUPER_ADMIN'])}
                    onView={() => setSelectedVehicle(v)}
                    onEdit={() => { setEditingVehicle(v); setIsFormOpen(true); }}
                    onDelete={() => {
                      if (confirm(`Delete tractor truck ${v.vehicle_id}?`)) deleteVehicle(v.id);
                    }}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 16,
        borderTop: '1px solid var(--color-row-divider)',
        fontSize: 13,
        color: 'var(--color-text-muted)',
      }}>
        <span>
          {isRTL
            ? `${filtered.length} من ${tractorTrucks.length} شاحنة`
            : `${filtered.length} of ${tractorTrucks.length} vehicles`}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <GhostBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
            {isRTL ? 'السابق' : 'Previous'}
          </GhostBtn>
          <GhostBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            {isRTL ? 'التالي' : 'Next'}
          </GhostBtn>
        </div>
      </div>

      {/* Modals */}
      <VehicleFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialVehicle={editingVehicle}
      />
      <VehicleDetailDrawer
        vehicle={selectedVehicle}
        isOpen={!!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
      />
    </div>
  );
};

/* ── Tractor Vehicle Row ───────────────────────────────────────── */
const VehicleRow: React.FC<{
  v: Vehicle;
  driver?: string;
  trailerLabel?: string;
  trailerPlate?: string;
  meta: { text: string; stripe: string; label: string; labelAr: string };
  isRTL: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ v, driver, trailerLabel, meta, isRTL, canEdit, canDelete, onView, onEdit, onDelete }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: '1px solid var(--color-row-divider)',
        background: hovered ? 'var(--color-row-hover)' : 'transparent',
        transition: 'background 0.12s',
        minHeight: 76,
        position: 'relative',
      }}
    >
      {/* 3px status stripe */}
      <td style={{
        width: 0,
        padding: 0,
        borderInlineStart: `3px solid ${meta.stripe}`,
      }} />

      {/* Vehicle column: plate chip + fleet/truck IDs */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          border: '1.5px solid var(--color-ink)',
          borderRadius: 4,
          overflow: 'hidden',
          marginBottom: 6,
          background: 'var(--color-surface)',
        }}>
          <span style={{ width: 6, alignSelf: 'stretch', background: 'var(--color-brand-accent)', flexShrink: 0 }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.08em',
            color: 'var(--color-ink)',
            padding: '4px 8px',
            direction: 'ltr',
          }}>
            {v.plate_number}
          </span>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          direction: 'ltr',
          letterSpacing: '0.03em',
        }}>
          {v.vehicle_id} · {v.fleet_number}
        </div>
      </td>

      {/* Make & Model */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-ink)' }}>{v.make}</div>
        <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2 }}>
          {v.model} ({v.year})
        </div>
      </td>

      {/* Odometer — right-aligned, DM Mono */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--color-ink)', direction: 'ltr' }}>
          {(v.current_mileage || 0).toLocaleString()}
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, fontSize: 12 }}> km</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', direction: 'ltr', marginTop: 2 }}>
          {(v.current_engine_hours || 0).toLocaleString()} h
        </div>
      </td>

      {/* Driver */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        {driver ? (
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>{driver}</span>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            {isRTL ? 'غير محدد' : 'Unassigned'}
          </span>
        )}
      </td>

      {/* Trailer */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        {trailerLabel ? (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--color-ink)',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: 1,
            cursor: 'default',
            direction: 'ltr',
          }}>
            {trailerLabel}
          </span>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            {isRTL ? 'غير مقترن' : 'Unassigned'}
          </span>
        )}
      </td>

      {/* Status */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: meta.text }}>
          {isRTL ? meta.labelAr : meta.label}
        </span>
      </td>

      {/* Row actions */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'end', whiteSpace: 'nowrap' }}>
        <div style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.12s', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
          <RowAction icon={<Eye size={14} />} title={isRTL ? 'عرض' : 'View'} onClick={onView} />
          {canEdit && <RowAction icon={<Edit3 size={14} />} title={isRTL ? 'تعديل' : 'Edit'} onClick={onEdit} />}
          {canDelete && <RowAction icon={<Trash2 size={14} />} title={isRTL ? 'حذف' : 'Delete'} onClick={onDelete} danger />}
        </div>
      </td>
    </tr>
  );
};

const RowAction: React.FC<{
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, title, onClick, danger }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
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

const GhostBtn: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}> = ({ children, onClick, disabled }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px 12px',
        fontSize: 13,
        fontFamily: 'var(--font-ui)',
        fontWeight: 400,
        color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
        background: hovered && !disabled ? 'var(--color-sidebar-hover)' : 'transparent',
        border: 'none',
        borderRadius: 4,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.12s, color 0.12s',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
};

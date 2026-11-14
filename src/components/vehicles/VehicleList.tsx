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

export type FleetCategory = 'SMALL' | 'TRACTOR' | 'ALL';

const CATEGORY_TABS: { key: FleetCategory; label: string; labelAr: string }[] = [
  { key: 'SMALL',   label: 'Small Vehicles',    labelAr: 'المركبات الصغيرة' },
  { key: 'TRACTOR', label: 'Tractor Trucks',    labelAr: 'الشاحنات الرئيسية' },
  { key: 'ALL',     label: 'All Vehicles',      labelAr: 'جميع المركبات' },
];

const STATUS_TABS: { key: string; label: string; labelAr: string }[] = [
  { key: 'ALL',            label: 'All',            labelAr: 'الكل' },
  { key: 'AVAILABLE',      label: 'Available',      labelAr: 'متاح' },
  { key: 'ON_TRIP',        label: 'On trip',        labelAr: 'في رحلة' },
  { key: 'IN_WORKSHOP',    label: 'In workshop',    labelAr: 'في الورشة' },
  { key: 'OUT_OF_SERVICE', label: 'Out of service', labelAr: 'خارج الخدمة' },
];

export const isSmallVehicle = (v: Vehicle): boolean => {
  return (
    v.vehicle_id.startsWith('SV-') ||
    v.vehicle_type === 'SMALL_VEHICLE' ||
    Boolean(v.notes && v.notes.includes('Small Vehicles'))
  );
};

/* ── Main component ────────────────────────────────────────────── */
export const VehicleList: React.FC = () => {
  const { vehicles, deleteVehicle, drivers, trailers } = useFleet();
  const { hasPermission } = useAuth();
  const { isRTL } = useI18n();

  const [categoryFilter, setCategoryFilter] = useState<FleetCategory>('SMALL');
  const [search, setSearch]                 = useState('');
  const [statusFilter, setStatusFilter]     = useState('ALL');
  const [isFormOpen, setIsFormOpen]         = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle]   = useState<Vehicle | undefined>(undefined);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  /* Category filtering */
  const categoryVehicles = vehicles.filter(v => {
    if (categoryFilter === 'SMALL') return isSmallVehicle(v);
    if (categoryFilter === 'TRACTOR') return !isSmallVehicle(v);
    return true;
  });

  /* Search & Status filtering */
  const filtered = categoryVehicles.filter(v => {
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
      (v.department && v.department.toLowerCase().includes(q)) ||
      (v.station_location && v.station_location.toLowerCase().includes(q)) ||
      driverName.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* Tab counters */
  const counts = STATUS_TABS.reduce<Record<string, number>>((acc, tab) => {
    acc[tab.key] = tab.key === 'ALL'
      ? categoryVehicles.length
      : categoryVehicles.filter(v => v.status === tab.key).length;
    return acc;
  }, {});

  const categoryCounts: Record<FleetCategory, number> = {
    SMALL: vehicles.filter(isSmallVehicle).length,
    TRACTOR: vehicles.filter(v => !isSmallVehicle(v)).length,
    ALL: vehicles.length,
  };

  /* Exports */
  const handleExportExcel = () => {
    const data = filtered.map(v => {
      const drv = drivers.find(d => d.id === v.assigned_driver_id);
      return {
        'Vehicle Number': v.vehicle_id,
        'Plate Number': v.plate_number,
        'Category': isSmallVehicle(v) ? 'Small Vehicle' : 'Tractor Truck',
        'Brand': v.make,
        'Model': v.model,
        'Model Year': v.year,
        'Driver Name': drv?.full_name || 'Unassigned',
        'Department': v.department || '—',
        'Location': v.station_location || '—',
        'Status': v.status,
        'Purchase Date': v.purchase_date || '—',
        'Purchase Cost (SAR)': v.purchase_cost || 0,
        'Odometer (KM)': v.current_mileage || 0,
      };
    });
    const filename =
      categoryFilter === 'SMALL'
        ? 'Noor_Fleet_Small_Vehicles'
        : categoryFilter === 'TRACTOR'
        ? 'Noor_Fleet_Tractor_Trucks'
        : 'Noor_Fleet_All_Vehicles';
    exportToExcel(data, filename);
  };

  const handleExportPDF = () => {
    const isSmall = categoryFilter === 'SMALL';
    const headers = isSmall
      ? ['Vehicle #', 'Plate Number', 'Brand', 'Model Year', 'Driver Name', 'Department', 'Location', 'Status']
      : ['Vehicle ID', 'Plate', 'Fleet #', 'Make & Model', 'Trailer', 'Driver', 'Odometer', 'Status'];

    const rows = filtered.map(v => {
      const trl = trailers.find(t => t.id === v.assigned_trailer_id);
      const drv = drivers.find(d => d.id === v.assigned_driver_id);

      if (isSmall) {
        return [
          v.vehicle_id,
          v.plate_number,
          v.make,
          String(v.year),
          drv ? drv.full_name : 'Unassigned',
          v.department || '—',
          v.station_location || '—',
          v.status,
        ];
      }

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

    const title =
      categoryFilter === 'SMALL'
        ? 'Small Vehicles Registry (Official Roster)'
        : categoryFilter === 'TRACTOR'
        ? 'Fuel Fleet Tractor Trucks Register'
        : 'Complete Noor Fleet Master Register';

    exportToPDFReport(
      title,
      headers,
      rows,
      categoryFilter === 'SMALL' ? 'Small_Vehicles_Register' : 'Fuel_Fleet_Register',
      {
        orientation: 'landscape',
        subtitle: isSmall
          ? 'Commercial Small Vehicles, Service Pickups, Department & Driver Allocations'
          : 'Commercial Fuel Transportation Units, Telemetry & Driver Roster',
        summaryKPIs: [
          { label: 'Total in Category', value: categoryVehicles.length, color: 'slate' },
          { label: 'Operational', value: categoryVehicles.filter(v => v.status === 'AVAILABLE' || v.status === 'ON_TRIP').length, color: 'emerald' },
          { label: 'Maintenance / Standby', value: categoryVehicles.filter(v => v.status === 'IN_WORKSHOP' || v.status === 'OUT_OF_SERVICE').length, color: 'rose' },
        ],
        metadata: [
          { label: 'Category', value: categoryFilter },
          { label: 'Status Filter', value: statusFilter },
          { label: 'Export Scope', value: `${filtered.length} vehicles listed` },
        ],
      }
    );
  };

  /* Titles based on active category */
  const getHeaderTitles = () => {
    if (categoryFilter === 'SMALL') {
      return {
        titleLine1: isRTL ? 'المركبات الصغيرة' : 'Small Vehicles',
        titleLine2: isRTL ? 'أسطول الخدمات المساندة' : 'Service & Utility Fleet',
        desc: isRTL
          ? 'السجل الرسمي للمركبات الصغيرة، سيارات الخدمة، سيارات الإدارة، وتوزيع السائقين والمواقع.'
          : 'Official registry of light service vehicles, pickups, administrative cars, driver assignments and station locations.',
        addBtn: isRTL ? '+ إضافة مركبة صغيرة' : 'Add small vehicle',
      };
    }
    if (categoryFilter === 'TRACTOR') {
      return {
        titleLine1: isRTL ? 'نقل الوقود' : 'Fuel Transport',
        titleLine2: isRTL ? 'الشاحنات الرئيسية' : 'Tractor Trucks',
        desc: isRTL
          ? 'قائمة رئيسية لشاحنات نقل الوقود، بيانات المسافة، السائقين، وحالة الاقتران.'
          : 'Master list of heavy tractor head trucks, mileage telemetry, assigned drivers and coupling status.',
        addBtn: isRTL ? '+ إضافة شاحنة' : 'Add fuel truck',
      };
    }
    return {
      titleLine1: isRTL ? 'أسطول النور' : 'Noor Fleet',
      titleLine2: isRTL ? 'السجل العام للمركبات' : 'Vehicle Master List',
      desc: isRTL
        ? 'السجل العام الشامل للشاحنات الثقيلة والمركبات المساندة، وتوزيع السائقين والأقسام.'
        : 'Comprehensive master ledger of heavy commercial tractor units, service vehicles, driver assignments and status.',
      addBtn: isRTL ? '+ إضافة مركبة' : 'Add vehicle',
    };
  };

  const titles = getHeaderTitles();

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '32px 32px 48px', fontFamily: 'var(--font-ui)', minHeight: '100vh' }}>

      {/* Category Switcher Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: 12,
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          marginInlineEnd: 4,
          letterSpacing: '0.02em',
        }}>
          {isRTL ? 'فئة الأسطول:' : 'FLEET CATEGORY:'}
        </span>
        {CATEGORY_TABS.map(cat => {
          const isActive = categoryFilter === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => { setCategoryFilter(cat.key); setPage(1); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--color-page-bg)' : 'var(--color-ink)',
                background: isActive ? 'var(--color-ink)' : 'var(--color-surface)',
                border: isActive ? '1px solid var(--color-ink)' : '1px solid var(--color-input-border)',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                transition: 'all 0.12s',
              }}
            >
              <span>{isRTL ? cat.labelAr : cat.label}</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 3,
                background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--color-page-bg)',
                color: isActive ? 'var(--color-page-bg)' : 'var(--color-text-muted)',
                fontWeight: 600,
              }}>
                {categoryCounts[cat.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Page header */}
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
            {titles.titleLine1}
            <br />
            {titles.titleLine2}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8, maxWidth: 520, lineHeight: 1.5 }}>
            {titles.desc}
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <GhostBtn onClick={handleExportExcel}>{isRTL ? 'إكسل' : 'Excel'}</GhostBtn>
          <GhostBtn onClick={handleExportPDF}>{isRTL ? 'تقرير PDF' : 'PDF report'}</GhostBtn>
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
              {titles.addBtn}
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
            placeholder={
              categoryFilter === 'SMALL'
                ? (isRTL ? 'ابحث بالرقم، اللوحة، السائق، القسم...' : 'Vehicle #, plate, driver, dept...')
                : (isRTL ? 'اللوحة، أسطول #، VIN، الصنع' : 'Plate, fleet #, VIN, make...')
            }
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: 250,
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
              {categoryFilter === 'SMALL' ? (
                /* Small Vehicles Headers */
                [
                  { label: isRTL ? 'المركبة واللوحة' : 'Vehicle Number & Plate', align: 'start' as const },
                  { label: isRTL ? 'الماركة والموديل' : 'Brand & Model Year',     align: 'start' as const },
                  { label: isRTL ? 'اسم السائق' : 'Driver Name',                  align: 'start' as const },
                  { label: isRTL ? 'القسم' : 'Department',                        align: 'start' as const },
                  { label: isRTL ? 'الموقع' : 'Location',                         align: 'start' as const },
                  { label: isRTL ? 'الحالة' : 'Status',                           align: 'start' as const },
                  { label: '',                                                    align: 'end' as const },
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
                ))
              ) : (
                /* Tractor / All Headers */
                [
                  { label: isRTL ? 'المركبة' : 'Vehicle',         align: 'start' as const },
                  { label: isRTL ? 'الصنع والموديل' : 'Make and model', align: 'start' as const },
                  { label: isRTL ? 'عداد المسافة' : 'Odometer',  align: 'end' as const },
                  { label: isRTL ? 'السائق' : 'Driver',           align: 'start' as const },
                  { label: isRTL ? 'المقطورة' : 'Trailer',        align: 'start' as const },
                  { label: isRTL ? 'الحالة' : 'Status',           align: 'start' as const },
                  { label: '',                                     align: 'end' as const },
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
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '64px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                    {isRTL ? 'لا توجد مركبات مطابقة' : 'No vehicles match'}
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
                const isSmall = isSmallVehicle(v);

                return (
                  <VehicleRow
                    key={v.id}
                    v={v}
                    driver={driver?.full_name}
                    trailerLabel={trailer?.trailer_id}
                    meta={meta}
                    isSmall={isSmall}
                    isRTL={isRTL}
                    canEdit={hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER'])}
                    canDelete={hasPermission(['SUPER_ADMIN'])}
                    onView={() => setSelectedVehicle(v)}
                    onEdit={() => { setEditingVehicle(v); setIsFormOpen(true); }}
                    onDelete={() => {
                      if (confirm(`Delete ${v.vehicle_id}?`)) deleteVehicle(v.id);
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
            ? `${filtered.length} من ${categoryVehicles.length} مركبة`
            : `${filtered.length} of ${categoryVehicles.length} vehicles`}
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

/* ── Vehicle row ───────────────────────────────────────────────── */
const VehicleRow: React.FC<{
  v: Vehicle;
  driver?: string;
  trailerLabel?: string;
  meta: { text: string; stripe: string; label: string; labelAr: string };
  isSmall: boolean;
  isRTL: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ v, driver, trailerLabel, meta, isSmall, isRTL, canEdit, canDelete, onView, onEdit, onDelete }) => {
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
      {/* Status stripe — 3px left (or right in RTL) border */}
      <td style={{
        width: 0,
        padding: 0,
        borderInlineStart: `3px solid ${meta.stripe}`,
      }} />

      {/* Vehicle column: plate chip + vehicle ID */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        {/* Plate chip */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          border: '1.5px solid var(--color-ink)',
          borderRadius: 4,
          overflow: 'hidden',
          marginBottom: 6,
          background: 'var(--color-surface)',
        }}>
          {/* Green left strip */}
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
        {/* Vehicle Number */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          direction: 'ltr',
          letterSpacing: '0.03em',
        }}>
          {v.vehicle_id}
          {v.fleet_number && v.fleet_number !== v.vehicle_id ? ` · ${v.fleet_number}` : ''}
        </div>
      </td>

      {/* Brand & Model Year */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-ink)' }}>{v.make}</div>
        <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2 }}>
          {v.model} · <span style={{ fontFamily: 'var(--font-mono)' }}>{v.year}</span>
        </div>
      </td>

      {/* Small Vehicle Columns vs Tractor Columns */}
      {isSmall ? (
        <>
          {/* Driver Name */}
          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
            {driver && !driver.includes('STANDBY') ? (
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>{driver}</span>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                {isRTL ? 'غير مخصص / احتياط' : 'Unassigned / Standby'}
              </span>
            )}
          </td>

          {/* Department */}
          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
            <span style={{ fontSize: 13, color: 'var(--color-ink)' }}>
              {v.department || (isRTL ? 'العمليات' : 'Operations')}
            </span>
          </td>

          {/* Location */}
          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
            <span style={{
              fontSize: 12,
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: 3,
              background: 'var(--color-page-bg)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}>
              {v.station_location || 'Najran'}
            </span>
          </td>
        </>
      ) : (
        <>
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
        </>
      )}

      {/* Status — plain colored text, no pill */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: meta.text }}>
          {isRTL ? meta.labelAr : meta.label}
        </span>
      </td>

      {/* Row actions — visible only on hover */}
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

/* ── Small icon button ─────────────────────────────────────────── */
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

/* ── Ghost button ──────────────────────────────────────────────── */
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

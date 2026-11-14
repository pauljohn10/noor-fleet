import React, { useState } from 'react';
import { Eye, Edit3, Trash2, Search, Plus, Car } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { VehicleFormModal } from './VehicleFormModal';
import { VehicleDetailDrawer } from './VehicleDetailDrawer';
import { Vehicle } from '../../types';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';

/* ── Status Tokens ─────────────────────────────────────────────── */
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

export const isSmallVehicleRecord = (v: Vehicle): boolean => {
  return (
    v.vehicle_type === 'SMALL_VEHICLE' ||
    v.vehicle_id.startsWith('SV-') ||
    Boolean(v.notes && v.notes.includes('Small Vehicles'))
  );
};

export const SmallVehicleList: React.FC = () => {
  const { vehicles, deleteVehicle, drivers } = useFleet();
  const { hasPermission } = useAuth();
  const { isRTL } = useI18n();

  const [search, setSearch]                 = useState('');
  const [statusFilter, setStatusFilter]     = useState('ALL');
  const [isFormOpen, setIsFormOpen]         = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle]   = useState<Vehicle | undefined>(undefined);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Filter ONLY Small Vehicles records
  const smallVehicles = vehicles.filter(isSmallVehicleRecord);

  // Search & Status filtering
  const filtered = smallVehicles.filter(v => {
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

  // Status counts
  const counts = STATUS_TABS.reduce<Record<string, number>>((acc, tab) => {
    acc[tab.key] = tab.key === 'ALL'
      ? smallVehicles.length
      : smallVehicles.filter(v => v.status === tab.key).length;
    return acc;
  }, {});

  // Exports
  const handleExportExcel = () => {
    const data = filtered.map(v => {
      const drv = drivers.find(d => d.id === v.assigned_driver_id);
      return {
        'Vehicle Number': v.vehicle_id,
        'Plate Number': v.plate_number,
        'Category': 'Small Vehicle',
        'Brand': v.make,
        'Model': v.model,
        'Model Year': v.year,
        'Driver Name': drv?.full_name || 'Unassigned',
        'Department': v.department || '—',
        'Location': v.station_location || '—',
        'Status': v.status,
        'Purchase Date': v.purchase_date || '—',
        'Purchase Cost (SAR)': v.purchase_cost || 0,
      };
    });
    exportToExcel(data, 'Noor_Fleet_Small_Vehicles_Master');
  };

  const handleExportPDF = () => {
    const headers = ['Vehicle #', 'Plate Number', 'Brand', 'Model Year', 'Driver Name', 'Department', 'Location', 'Status'];
    const rows = filtered.map(v => {
      const drv = drivers.find(d => d.id === v.assigned_driver_id);
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
    });

    exportToPDFReport(
      'Small Vehicles Master Register',
      headers,
      rows,
      'Small_Vehicles_Master_Register',
      {
        orientation: 'landscape',
        subtitle: 'Official Registry of Commercial Service Vehicles, Pickups & Administration Transport',
        summaryKPIs: [
          { label: 'Total Registered', value: smallVehicles.length, color: 'slate' },
          { label: 'Operational', value: smallVehicles.filter(v => v.status === 'AVAILABLE' || v.status === 'ON_TRIP').length, color: 'emerald' },
          { label: 'In Workshop / Standby', value: smallVehicles.filter(v => v.status === 'IN_WORKSHOP' || v.status === 'OUT_OF_SERVICE').length, color: 'rose' },
        ],
        metadata: [
          { label: 'Master Category', value: 'Small Vehicles / Utility Fleet' },
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
            {isRTL ? 'المركبات الصغيرة' : 'Small Vehicles'}
            <br />
            {isRTL ? 'أسطول الخدمات المساندة' : 'Service & Utility Fleet'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8, maxWidth: 520, lineHeight: 1.5 }}>
            {isRTL
              ? 'السجل الرسمي للمركبات الصغيرة، سيارات الخدمة، سيارات الإدارة، وتوزيع السائقين والمواقع.'
              : 'Dedicated master ledger for commercial light service vehicles, pickups, administrative cars, driver allocations and depot stations.'}
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
              {isRTL ? '+ إضافة مركبة صغيرة' : '+ Add small vehicle'}
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
            placeholder={isRTL ? 'الرقم، اللوحة، السائق، القسم، الموقع...' : 'Vehicle #, plate, driver, dept, location...'}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: 270,
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

      {/* Table / Empty State */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-row-divider)' }}>
              {[
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
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '72px 16px', textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: 4,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                    marginBottom: 12,
                  }}>
                    <Car size={24} />
                  </div>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                    marginBottom: 6,
                    fontFamily: 'var(--font-brand)',
                  }}>
                    {search || statusFilter !== 'ALL'
                      ? (isRTL ? 'لا توجد مركبات صغيرة مطابقة لمعايير البحث' : 'No small vehicles match query criteria')
                      : (isRTL ? 'لا توجد مركبات صغيرة مسجلة حتى الآن' : 'No small vehicles registered yet')}
                  </div>
                  <p style={{
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                    maxWidth: 420,
                    margin: '0 auto 16px',
                    lineHeight: 1.4,
                  }}>
                    {search || statusFilter !== 'ALL'
                      ? (isRTL ? 'حاول تغيير شروط الفلتر أو مسح البحث.' : 'Try adjusting your search query or status filter.')
                      : (isRTL
                          ? 'ابدأ بتسجيل سيارة خدمة جديدة أو بيك آب أو مركبة إدارية مباشرة في قاعدة البيانات.'
                          : 'Register a new commercial light vehicle, service pickup or administration car directly into the Supabase database.')}
                  </p>
                  {search || statusFilter !== 'ALL' ? (
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
                      {isRTL ? 'مسح الفلاتر والبحث' : 'Clear filters and search'}
                    </button>
                  ) : hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) ? (
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Plus size={14} />
                      <span>{isRTL ? 'تسجيل مركبة صغيرة' : 'Register Small Vehicle'}</span>
                    </button>
                  ) : null}
                </td>
              </tr>
            ) : (
              paged.map(v => {
                const driver = drivers.find(d => d.id === v.assigned_driver_id);
                const meta = STATUS_META[v.status] || STATUS_META['AVAILABLE'];
                return (
                  <SmallVehicleRow
                    key={v.id}
                    v={v}
                    driver={driver?.full_name}
                    meta={meta}
                    isRTL={isRTL}
                    canEdit={hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER'])}
                    canDelete={hasPermission(['SUPER_ADMIN'])}
                    onView={() => setSelectedVehicle(v)}
                    onEdit={() => { setEditingVehicle(v); setIsFormOpen(true); }}
                    onDelete={() => {
                      if (confirm(`Delete small vehicle ${v.vehicle_id}?`)) deleteVehicle(v.id);
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
            ? `${filtered.length} من ${smallVehicles.length} مركبة صغيرة`
            : `${filtered.length} of ${smallVehicles.length} small vehicles`}
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

/* ── Small Vehicle Row ─────────────────────────────────────────── */
const SmallVehicleRow: React.FC<{
  v: Vehicle;
  driver?: string;
  meta: { text: string; stripe: string; label: string; labelAr: string };
  isRTL: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ v, driver, meta, isRTL, canEdit, canDelete, onView, onEdit, onDelete }) => {
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

      {/* Vehicle column: plate chip + vehicle number */}
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

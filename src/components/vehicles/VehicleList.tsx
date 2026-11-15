import React, { useState } from 'react';
import { Eye, Edit3, Trash2 } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { VehicleFormModal } from './VehicleFormModal';
import { VehicleDetailDrawer } from './VehicleDetailDrawer';
import { Vehicle } from '../../types';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';
import { DESIGN_TOKENS } from '../../lib/designTokens';
import {
  PageContainer,
  PageHeader,
  PrimaryButton,
  GhostButton,
  StatusTabs,
  DataTable,
  DataRow,
  RowAction,
  PlateChip,
  StatusText,
  TableFooter,
} from '../common/EditorialUI';

/* ── Design-token helpers ──────────────────────────────────────── */
const STATUS_META: Record<
  string,
  { text: string; stripe: string; label: string; labelAr: string }
> = {
  AVAILABLE: {
    text: DESIGN_TOKENS.colors.status.availableText,
    stripe: DESIGN_TOKENS.colors.status.availableStripe,
    label: 'Available',
    labelAr: 'متاح',
  },
  ON_TRIP: {
    text: DESIGN_TOKENS.colors.status.onTripText,
    stripe: DESIGN_TOKENS.colors.status.onTripStripe,
    label: 'On trip',
    labelAr: 'في رحلة',
  },
  IN_WORKSHOP: {
    text: DESIGN_TOKENS.colors.status.workshopText,
    stripe: DESIGN_TOKENS.colors.status.workshopStripe,
    label: 'In workshop',
    labelAr: 'في الورشة',
  },
  OUT_OF_SERVICE: {
    text: DESIGN_TOKENS.colors.status.outOfServiceText,
    stripe: DESIGN_TOKENS.colors.status.outOfServiceStripe,
    label: 'Out of service',
    labelAr: 'خارج الخدمة',
  },
  SOLD: { text: '#6B665C', stripe: '#9CA3AF', label: 'Sold', labelAr: 'مباع' },
  RETIRED: { text: '#6B665C', stripe: '#9CA3AF', label: 'Retired', labelAr: 'متقاعد' },
};

const STATUS_TABS: { key: string; label: string; labelAr: string }[] = [
  { key: 'ALL', label: 'All', labelAr: 'الكل' },
  { key: 'AVAILABLE', label: 'Available', labelAr: 'متاح' },
  { key: 'ON_TRIP', label: 'On trip', labelAr: 'في رحلة' },
  { key: 'IN_WORKSHOP', label: 'In workshop', labelAr: 'في الورشة' },
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
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>(undefined);
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
    acc[tab.key] =
      tab.key === 'ALL'
        ? tractorTrucks.length
        : tractorTrucks.filter(v => v.status === tab.key).length;
    return acc;
  }, {});

  // Exports
  const handleExportExcel = () => {
    const data = filtered.map(v => {
      const trl = trailers.find(tr => tr.id === v.assigned_trailer_id);
      const drv = drivers.find(d => d.id === v.assigned_driver_id);
      return {
        [isRTL ? 'رقم المركبة' : 'Vehicle ID']: v.vehicle_id,
        [isRTL ? 'رقم اللوحة' : 'Plate Number']: v.plate_number,
        [isRTL ? 'رقم الأسطول' : 'Fleet Number']: v.fleet_number,
        [isRTL ? 'الصنع' : 'Make']: v.make,
        [isRTL ? 'الموديل' : 'Model']: v.model,
        [isRTL ? 'السنة' : 'Year']: v.year,
        [isRTL ? 'رقم الهيكل' : 'VIN']: v.vin,
        [isRTL ? 'عداد المسافة (كم)' : 'Mileage (KM)']: v.current_mileage,
        [isRTL ? 'ساعات التشغيل' : 'Hours']: v.current_engine_hours,
        [isRTL ? 'السائق المعين' : 'Assigned Driver']: drv
          ? drv.full_name
          : isRTL
            ? 'غير معين'
            : 'Unassigned',
        [isRTL ? 'المقطورة المقترنة' : 'Coupled Trailer']: trl
          ? `${trl.trailer_id} (${trl.plate_number})`
          : isRTL
            ? 'غير مقترنة'
            : 'Uncoupled',
        [isRTL ? 'الحالة' : 'Status']: STATUS_META[v.status]
          ? isRTL
            ? STATUS_META[v.status].labelAr
            : STATUS_META[v.status].label
          : v.status,
        [isRTL ? 'الموقع' : 'Location']: v.station_location,
      };
    });
    exportToExcel(data, 'Fuel_Fleet_Tractor_Trucks');
  };

  const handleExportPDF = () => {
    const headers = isRTL
      ? ['رقم المركبة', 'اللوحة', 'رقم الأسطول', 'الصنع والموديل', 'المقطورة', 'السائق', 'عداد المسافة', 'الحالة']
      : ['Vehicle ID', 'Plate', 'Fleet #', 'Make & Model', 'Trailer', 'Driver', 'Odometer', 'Status'];
    const rows = filtered.map(v => {
      const trl = trailers.find(tr => tr.id === v.assigned_trailer_id);
      const drv = drivers.find(d => d.id === v.assigned_driver_id);
      return [
        v.vehicle_id,
        v.plate_number,
        v.fleet_number || '—',
        `${v.make} ${v.model}`,
        trl ? trl.trailer_id : isRTL ? 'غير مقترن' : 'Unassigned',
        drv ? drv.full_name : isRTL ? 'غير معين' : 'Unassigned',
        `${(v.current_mileage || 0).toLocaleString()} ${isRTL ? 'كم' : 'km'}`,
        STATUS_META[v.status]
          ? isRTL
            ? STATUS_META[v.status].labelAr
            : STATUS_META[v.status].label
          : v.status,
      ];
    });

    exportToPDFReport(
      isRTL ? 'سجل شاحنات أسطول نقل الوقود' : 'Fuel Fleet Tractor Trucks Register',
      headers,
      rows,
      'Fuel_Fleet_Tractor_Trucks',
      {
        orientation: 'landscape',
        subtitle: isRTL
          ? 'الشاحنات الثقيلة لنقل الوقود والصهاريج المخصصة وقائمة السائقين'
          : 'Commercial Fuel Transportation Tractor Units, Assigned Tankers & Driver Roster',
        summaryKPIs: [
          { label: isRTL ? 'إجمالي رؤوس الجر' : 'Total Tractor Heads', value: tractorTrucks.length, color: 'slate' },
          {
            label: isRTL ? 'تشغيلية' : 'Operational',
            value: tractorTrucks.filter(v => v.status === 'AVAILABLE' || v.status === 'ON_TRIP').length,
            color: 'emerald',
          },
          {
            label: isRTL ? 'في الورشة / خارج الخدمة' : 'In Workshop / OOS',
            value: tractorTrucks.filter(v => v.status === 'IN_WORKSHOP' || v.status === 'OUT_OF_SERVICE').length,
            color: 'rose',
          },
        ],
        metadata: [
          {
            label: isRTL ? 'فئة السجل' : 'Master Category',
            value: isRTL ? 'الشاحنات الثقيلة' : 'Heavy Tractor Trucks',
          },
          {
            label: isRTL ? 'تصفية الحالة' : 'Status Filter',
            value: STATUS_META[statusFilter]
              ? isRTL
                ? STATUS_META[statusFilter].labelAr
                : STATUS_META[statusFilter].label
              : isRTL
                ? 'الكل'
                : statusFilter,
          },
          {
            label: isRTL ? 'النطاق' : 'Scope',
            value: isRTL ? `${filtered.length} مركبة مدرجة` : `${filtered.length} vehicles listed`,
          },
        ],
      }
    );
  };

  const canEdit = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);
  const canDelete = hasPermission(['SUPER_ADMIN']);

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'نقل الوقود' : 'Fuel Transport'}
            <br />
            {isRTL ? 'الشاحنات الرئيسية' : 'Tractor Trucks'}
          </>
        }
        subtitle={
          isRTL
            ? 'قائمة رئيسية لشاحنات نقل الوقود، بيانات المسافة، السائقين، وحالة الاقتران.'
            : 'Master list of heavy tractor head trucks, mileage telemetry, assigned drivers and coupling status.'
        }
        actions={
          <>
            <GhostButton onClick={handleExportExcel}>
              {isRTL ? 'إكسل' : 'Excel'}
            </GhostButton>
            <GhostButton onClick={handleExportPDF}>
              {isRTL ? 'تقرير PDF' : 'PDF report'}
            </GhostButton>
            {canEdit && (
              <PrimaryButton onClick={() => { setEditingVehicle(undefined); setIsFormOpen(true); }}>
                {isRTL ? '+ إضافة شاحنة وقود' : '+ Add fuel truck'}
              </PrimaryButton>
            )}
          </>
        }
      />

      <StatusTabs
        tabs={STATUS_TABS.map(tab => ({
          key: tab.key,
          label: isRTL ? tab.labelAr : tab.label,
          count: counts[tab.key] ?? 0,
          stripe: STATUS_META[tab.key]?.stripe,
        }))}
        activeKey={statusFilter}
        onChange={key => {
          setStatusFilter(key);
          setPage(1);
        }}
        searchValue={search}
        onSearchChange={val => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder={isRTL ? 'اللوحة، أسطول #، VIN، الصنع...' : 'Plate, fleet #, VIN, make...'}
      />

      <DataTable
        columns={[
          { label: isRTL ? 'المركبة' : 'Vehicle', align: 'start', width: '18%' },
          { label: isRTL ? 'الصنع والموديل' : 'Make and model', align: 'start', width: '22%' },
          { label: isRTL ? 'عداد المسافة' : 'Odometer', align: 'start', width: '16%' },
          { label: isRTL ? 'السائق' : 'Driver', align: 'start', width: '18%' },
          { label: isRTL ? 'المقطورة' : 'Trailer', align: 'start', width: '14%' },
          { label: isRTL ? 'الحالة' : 'Status', align: 'start', width: '12%' },
        ]}
        isEmpty={paged.length === 0}
        emptyMessage={isRTL ? 'لا توجد شاحنات وقود مطابقة' : 'No fuel trucks match query'}
        onClearFilters={() => {
          setSearch('');
          setStatusFilter('ALL');
          setPage(1);
        }}
      >
        {paged.map(v => {
          const driver = drivers.find(d => d.id === v.assigned_driver_id);
          const trailer = trailers.find(tr => tr.id === v.assigned_trailer_id);
          const meta = STATUS_META[v.status] || STATUS_META.AVAILABLE;

          return (
            <DataRow
              key={v.id}
              stripeColor={meta.stripe}
              onClick={() => setSelectedVehicle(v)}
              actions={
                <>
                  <RowAction
                    icon={<Eye size={14} />}
                    title={isRTL ? 'عرض' : 'View'}
                    onClick={() => setSelectedVehicle(v)}
                  />
                  {canEdit && (
                    <RowAction
                      icon={<Edit3 size={14} />}
                      title={isRTL ? 'تعديل' : 'Edit'}
                      onClick={() => {
                        setEditingVehicle(v);
                        setIsFormOpen(true);
                      }}
                    />
                  )}
                  {canDelete && (
                    <RowAction
                      icon={<Trash2 size={14} />}
                      title={isRTL ? 'حذف' : 'Delete'}
                      danger
                      onClick={() => {
                        if (
                          confirm(
                            isRTL
                              ? `هل أنت متأكد من حذف الشاحنة ${v.vehicle_id}؟`
                              : `Delete tractor truck ${v.vehicle_id}?`
                          )
                        ) {
                          deleteVehicle(v.id);
                        }
                      }}
                    />
                  )}
                </>
              }
            >
              {/* Vehicle column */}
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ marginBottom: 6 }}>
                  <PlateChip plate={v.plate_number} />
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    direction: 'ltr',
                    letterSpacing: '0.03em',
                  }}
                >
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

              {/* Odometer */}
              <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'start' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--color-ink)' }}>
                  <span dir="ltr">{(v.current_mileage || 0).toLocaleString()}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, fontSize: 12 }}>
                    {' '}
                    {isRTL ? 'كم' : 'km'}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  <span dir="ltr">{(v.current_engine_hours || 0).toLocaleString()}</span> {isRTL ? 'س' : 'h'}
                </div>
              </td>

              {/* Driver */}
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                {driver ? (
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>
                    {driver.full_name}
                  </span>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    {isRTL ? 'غير محدد' : 'Unassigned'}
                  </span>
                )}
              </td>

              {/* Trailer */}
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                {trailer ? (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--color-ink)',
                      borderBottom: '1px solid var(--color-border)',
                      paddingBottom: 1,
                      direction: 'ltr',
                    }}
                  >
                    {trailer.trailer_id}
                  </span>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    {isRTL ? 'غير مقترن' : 'Unassigned'}
                  </span>
                )}
              </td>

              {/* Status */}
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <StatusText
                  label={isRTL ? meta.labelAr : meta.label}
                  color={meta.text}
                />
              </td>
            </DataRow>
          );
        })}
      </DataTable>

      <TableFooter
        summaryText={
          isRTL
            ? `${filtered.length} من ${tractorTrucks.length} شاحنة`
            : `${filtered.length} of ${tractorTrucks.length} vehicles`
        }
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
      />

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
    </PageContainer>
  );
};

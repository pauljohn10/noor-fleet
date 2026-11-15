import React, { useMemo, useState } from 'react';
import { Eye, Edit } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { Vehicle, VehicleStatus } from '../../types';
import { VehicleFormModal } from './VehicleFormModal';
import { Modal } from '../common/Modal';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';
import {
  PageContainer,
  PageHeader,
  StatusTabs,
  DataTable,
  DataRow,
  PlateChip,
  StatusText,
  TableFooter,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  RowAction,
  EditorialSelect,
  EDITORIAL_STATUS,
} from '../common/EditorialUI';

const PAGE_SIZE = 20;

const STATUS_META: Record<
  string,
  { label: string; labelAr: string; stripe: string; text: string }
> = {
  AVAILABLE: {
    label: 'Available',
    labelAr: 'متاح',
    stripe: EDITORIAL_STATUS.green.stripe,
    text: EDITORIAL_STATUS.green.text,
  },
  ON_TRIP: {
    label: 'On trip',
    labelAr: 'في رحلة',
    stripe: EDITORIAL_STATUS.blue.stripe,
    text: EDITORIAL_STATUS.blue.text,
  },
  IN_WORKSHOP: {
    label: 'In workshop',
    labelAr: 'في الورشة',
    stripe: EDITORIAL_STATUS.amber.stripe,
    text: EDITORIAL_STATUS.amber.text,
  },
  REQUIRES_INSPECTION: {
    label: 'Requires inspection',
    labelAr: 'يتطلب فحص',
    stripe: EDITORIAL_STATUS.amber.stripe,
    text: EDITORIAL_STATUS.amber.text,
  },
  OUT_OF_SERVICE: {
    label: 'Out of service',
    labelAr: 'خارج الخدمة',
    stripe: EDITORIAL_STATUS.red.stripe,
    text: EDITORIAL_STATUS.red.text,
  },
};

const STATUS_TABS = [
  { key: 'ALL', label: 'All', labelAr: 'الكل' },
  { key: 'AVAILABLE', label: 'Available', labelAr: 'متاح' },
  { key: 'ON_TRIP', label: 'On trip', labelAr: 'في رحلة' },
  { key: 'IN_WORKSHOP', label: 'In workshop', labelAr: 'في الورشة' },
  { key: 'REQUIRES_INSPECTION', label: 'Requires inspection', labelAr: 'يتطلب فحص' },
  { key: 'OUT_OF_SERVICE', label: 'Out of service', labelAr: 'خارج الخدمة' },
];

export const VehicleStatusMatrix: React.FC = () => {
  const { vehicles, trailers, drivers, workOrders, updateVehicle } = useFleet();
  const { hasPermission } = useAuth();
  const { isRTL } = useI18n();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>();

  const tractorTrucks = useMemo(
    () =>
      vehicles.filter(
        v =>
          !v.vehicle_id.toUpperCase().startsWith('SV-') &&
          !(v.fleet_number || '').toUpperCase().startsWith('SV-')
      ),
    [vehicles]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: tractorTrucks.length };
    for (const tab of STATUS_TABS) {
      if (tab.key !== 'ALL') {
        map[tab.key] = tractorTrucks.filter(v => v.status === tab.key).length;
      }
    }
    return map;
  }, [tractorTrucks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tractorTrucks.filter(v => {
      const matchesSearch =
        !q ||
        v.vehicle_id.toLowerCase().includes(q) ||
        v.plate_number.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.fleet_number.toLowerCase().includes(q) ||
        (v.vin || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tractorTrucks, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleExportExcel = () => {
    const data = filtered.map(v => {
      const trl = trailers.find(tr => tr.id === v.assigned_trailer_id);
      const drv = drivers.find(d => d.id === v.assigned_driver_id);
      const openWOs = workOrders.filter(
        w => w.vehicle_id === v.id && w.status !== 'COMPLETED' && w.status !== 'CANCELLED'
      ).length;
      return {
        [isRTL ? 'معرف الشاحنة' : 'Tractor ID']: v.vehicle_id,
        [isRTL ? 'رقم الأسطول' : 'Fleet #']: v.fleet_number,
        [isRTL ? 'رقم اللوحة' : 'Plate Number']: v.plate_number,
        [isRTL ? 'الصنع والموديل' : 'Make & Model']: `${v.make} ${v.model} (${v.year})`,
        [isRTL ? 'السائق المعين' : 'Assigned Driver']: drv ? drv.full_name : isRTL ? 'غير معين' : 'Unassigned',
        [isRTL ? 'المقطورة المقترنة' : 'Coupled Trailer']: trl ? trl.trailer_id : isRTL ? 'غير مقترن' : 'Unassigned',
        [isRTL ? 'أوامر العمل المفتوحة' : 'Open Work Orders']: openWOs,
        [isRTL ? 'المسافة (كم)' : 'Mileage (KM)']: v.current_mileage,
        [isRTL ? 'الحالة' : 'Status']: STATUS_META[v.status]
          ? isRTL
            ? STATUS_META[v.status].labelAr
            : STATUS_META[v.status].label
          : v.status,
      };
    });
    exportToExcel(data, 'Fleet_Vehicle_Status_Matrix');
  };

  const handleExportPDF = () => {
    const headers = [
      isRTL ? 'معرف الشاحنة' : 'Tractor ID',
      isRTL ? 'رقم اللوحة' : 'Plate Number',
      isRTL ? 'الصنع والموديل' : 'Make & Model',
      isRTL ? 'السائق المعين' : 'Assigned Driver',
      isRTL ? 'أوامر العمل المفتوحة' : 'Open WOs',
      isRTL ? 'المسافة' : 'Mileage',
      isRTL ? 'الحالة' : 'Status',
    ];
    const rows = filtered.map(v => {
      const drv = drivers.find(d => d.id === v.assigned_driver_id);
      const openWOs = workOrders.filter(
        w => w.vehicle_id === v.id && w.status !== 'COMPLETED' && w.status !== 'CANCELLED'
      ).length;
      return [
        `${v.vehicle_id} (${v.fleet_number})`,
        v.plate_number,
        `${v.make} ${v.model} (${v.year})`,
        drv ? drv.full_name : isRTL ? 'غير معين' : 'Unassigned',
        String(openWOs),
        `${(v.current_mileage || 0).toLocaleString()} ${isRTL ? 'كم' : 'km'}`,
        STATUS_META[v.status]
          ? isRTL
            ? STATUS_META[v.status].labelAr
            : STATUS_META[v.status].label
          : v.status,
      ];
    });

    exportToPDFReport(
      isRTL ? 'مصفوفة حالة مركبات الأسطول' : 'Fleet Vehicle Status Matrix',
      headers,
      rows,
      'Fleet_Vehicle_Status_Matrix',
      {
        orientation: 'landscape',
        subtitle: isRTL
          ? 'حالة الجاهزية التشغيلية وتعيينات السائقين وأوامر العمل المفتوحة'
          : 'Operational Readiness, Driver Assignments & Open Workshop Orders',
      }
    );
  };

  const canEdit = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'مصفوفة حالة' : 'Vehicle Status'}
            <br />
            {isRTL ? 'المركبات التشغيلية' : 'Operational Matrix'}
          </>
        }
        subtitle={
          isRTL
            ? 'متابعة فورية لحالة جاهزية الشاحنات، أوامر العمل المفتوحة، وتحديث حالة التشغيل.'
            : 'Real-time operational readiness, open workshop job counts, and quick dispatch status controls.'
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
          { label: isRTL ? 'الصنع والموديل' : 'Make and model', align: 'start', width: '20%' },
          { label: isRTL ? 'عداد المسافة' : 'Odometer', align: 'start', width: '15%' },
          { label: isRTL ? 'السائق' : 'Driver', align: 'start', width: '17%' },
          { label: isRTL ? 'أوامر العمل المفتوحة' : 'Open work orders', align: 'start', width: '14%' },
          { label: isRTL ? 'الحالة' : 'Status', align: 'start', width: '16%' },
        ]}
        isEmpty={paged.length === 0}
        emptyMessage={isRTL ? 'لا توجد مركبات مطابقة للبحث' : 'No vehicles match query'}
        onClearFilters={() => {
          setSearch('');
          setStatusFilter('ALL');
          setPage(1);
        }}
      >
        {paged.map(v => {
          const driver = drivers.find(d => d.id === v.assigned_driver_id);
          const meta = STATUS_META[v.status] || STATUS_META.AVAILABLE;
          const openWOs = workOrders.filter(
            w => w.vehicle_id === v.id && w.status !== 'COMPLETED' && w.status !== 'CANCELLED'
          );

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
                      icon={<Edit size={14} />}
                      title={isRTL ? 'تعديل' : 'Edit'}
                      onClick={() => {
                        setEditingVehicle(v);
                        setIsFormOpen(true);
                      }}
                    />
                  )}
                </>
              }
            >
              {/* Vehicle */}
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
                    {isRTL ? 'غير معين' : 'Unassigned'}
                  </span>
                )}
              </td>

              {/* Open WOs */}
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                {openWOs.length > 0 ? (
                  <StatusText
                    label={
                      isRTL
                        ? `${openWOs.length} أمر مفتوح`
                        : `${openWOs.length} open`
                    }
                    color={EDITORIAL_STATUS.amber.text}
                  />
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {isRTL ? 'لا يوجد' : 'None'}
                  </span>
                )}
              </td>

              {/* Status */}
              <td
                style={{ padding: '14px 16px', verticalAlign: 'middle' }}
                onClick={e => e.stopPropagation()}
              >
                {canEdit ? (
                  <EditorialSelect
                    value={v.status}
                    onChange={e => updateVehicle(v.id, { status: e.target.value as VehicleStatus })}
                    style={{ height: 32, fontSize: 12.5, minWidth: 148, color: meta.text, fontWeight: 600 }}
                  >
                    {Object.entries(STATUS_META).map(([key, item]) => (
                      <option key={key} value={key}>
                        {isRTL ? item.labelAr : item.label}
                      </option>
                    ))}
                  </EditorialSelect>
                ) : (
                  <StatusText
                    label={isRTL ? meta.labelAr : meta.label}
                    color={meta.text}
                  />
                )}
              </td>
            </DataRow>
          );
        })}
      </DataTable>

      <TableFooter
        summaryText={
          isRTL
            ? `${paged.length} من ${filtered.length} مركبة`
            : `${paged.length} of ${filtered.length} vehicles`
        }
        page={currentPage}
        totalPages={totalPages}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
      />

      {isFormOpen && (
        <VehicleFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          initialVehicle={editingVehicle}
        />
      )}

      {selectedVehicle && (
        <Modal
          isOpen={!!selectedVehicle}
          onClose={() => setSelectedVehicle(undefined)}
          title={`${selectedVehicle.vehicle_id} — ${selectedVehicle.plate_number}`}
          subtitle={`${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.year})`}
          maxWidth="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                  {isRTL ? 'رقم الأسطول' : 'Fleet number'}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)', marginTop: 2 }}>
                  {selectedVehicle.fleet_number}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                  {isRTL ? 'عداد المسافة' : 'Odometer'}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)', marginTop: 2 }}>
                  {(selectedVehicle.current_mileage || 0).toLocaleString()} {isRTL ? 'كم' : 'km'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <SecondaryButton onClick={() => setSelectedVehicle(undefined)}>
                {isRTL ? 'إغلاق' : 'Close'}
              </SecondaryButton>
              {canEdit && (
                <PrimaryButton
                  onClick={() => {
                    const veh = selectedVehicle;
                    setSelectedVehicle(undefined);
                    setEditingVehicle(veh);
                    setIsFormOpen(true);
                  }}
                >
                  {isRTL ? 'تعديل المركبة' : 'Edit vehicle'}
                </PrimaryButton>
              )}
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
};

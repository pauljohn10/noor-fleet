import React, { useState } from 'react';
import { Eye, Edit3, Trash2 } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { SmallVehicleFormModal } from './SmallVehicleFormModal';
import { SmallVehicleDetailDrawer } from './SmallVehicleDetailDrawer';
import { SmallVehicle } from '../../types';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';
import { DESIGN_TOKENS } from '../../lib/designTokens';
import { useTablePagination } from '../../lib/supabasePagination';
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

export const SmallVehicleList: React.FC = () => {
  const { smallVehicles, deleteSmallVehicle } = useFleet();
  const { hasPermission } = useAuth();
  const { isRTL } = useI18n();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'STANDBY'>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<SmallVehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<SmallVehicle | null>(null);

  const isStandby = (v: SmallVehicle) =>
    !v.driver_name || v.driver_name.toLowerCase().includes('standby');

  const filtered = smallVehicles.filter(v => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'STANDBY' ? isStandby(v) : !isStandby(v));
    if (!matchesStatus) return false;

    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(v.sn).includes(q) ||
      v.plate_number.toLowerCase().includes(q) ||
      v.vehicle_number.toLowerCase().includes(q) ||
      (v.model_year && String(v.model_year).includes(q)) ||
      (v.brand && v.brand.toLowerCase().includes(q)) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(q)) ||
      (v.department_location && v.department_location.toLowerCase().includes(q))
    );
  });

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pagedItems: paged,
  } = useTablePagination(filtered, [search, statusFilter], {
    table: 'small_vehicles',
    orderBy: 'sn',
    ascending: true,
    search,
    searchColumns: ['plate_number', 'vehicle_number', 'brand', 'driver_name', 'department_location'],
  });

  const assignedCount = smallVehicles.filter(v => !isStandby(v)).length;
  const standbyCount = smallVehicles.filter(isStandby).length;

  const handleExportExcel = () => {
    const data = filtered.map(v => ({
      [isRTL ? 'م' : 'Sn']: v.sn,
      [isRTL ? 'رقم اللوحة' : 'Plate No.']: v.plate_number,
      [isRTL ? 'رقم المركبة' : 'Vehicle Number']: v.vehicle_number,
      [isRTL ? 'سنة الصنع' : 'Model Year']: v.model_year || '—',
      [isRTL ? 'الماركة' : 'Brand']: v.brand || '—',
      [isRTL ? 'اسم السائق' : 'Driver Name']:
        v.driver_name || (isRTL ? 'غير مخصص / احتياط' : 'Unassigned / Standby'),
      [isRTL ? 'القسم / الموقع' : 'Dept. / Location']: v.department_location || '—',
      [isRTL ? 'تاريخ التسجيل' : 'Registered At']: new Date(v.created_at).toLocaleDateString(
        isRTL ? 'ar-SA-u-ca-gregory' : 'en-US'
      ),
    }));
    exportToExcel(data, 'Noor_Fleet_Small_Vehicles_Master');
  };

  const handleExportPDF = () => {
    const headers = isRTL
      ? ['م', 'رقم اللوحة', 'رقم المركبة', 'سنة الصنع', 'الماركة', 'اسم السائق', 'القسم / الموقع']
      : ['Sn', 'Plate No.', 'Vehicle Number', 'Model Year', 'Brand', 'Driver Name', 'Dept. / Location'];
    const rows = filtered.map(v => [
      `#${v.sn}`,
      v.plate_number,
      v.vehicle_number,
      v.model_year ? String(v.model_year) : '—',
      v.brand || '—',
      v.driver_name || (isRTL ? 'غير مخصص / احتياط' : 'Unassigned / Standby'),
      v.department_location || '—',
    ]);

    exportToPDFReport(
      isRTL ? 'سجل المركبات الصغيرة الرئيسي' : 'Small Vehicles Master Register',
      headers,
      rows,
      'Small_Vehicles_Master_Register',
      {
        orientation: 'landscape',
        subtitle: isRTL
          ? 'السجل الرسمي لمركبات الخدمة التجارية والبيك آب والنقل الإداري'
          : 'Official Registry of Commercial Service Vehicles, Pickups & Administration Transport (public.small_vehicles)',
        summaryKPIs: [
          { label: isRTL ? 'إجمالي المسجل' : 'Total Registered', value: smallVehicles.length, color: 'slate' },
          { label: isRTL ? 'سائقون مخصصون' : 'Assigned Drivers', value: assignedCount, color: 'emerald' },
          { label: isRTL ? 'احتياط / أسطول' : 'Standby / Pool', value: standbyCount, color: 'amber' },
        ],
        metadata: [
          { label: isRTL ? 'جدول البيانات' : 'Schema Table', value: 'public.small_vehicles' },
          {
            label: isRTL ? 'النطاق' : 'Scope',
            value: isRTL ? `${filtered.length} مركبة مدرجة` : `${filtered.length} vehicles listed`,
          },
        ],
      }
    );
  };

  const handleDelete = async (v: SmallVehicle) => {
    const confirmMsg = isRTL
      ? `هل أنت متأكد من حذف المركبة ${v.vehicle_number} (لوحة: ${v.plate_number})؟`
      : `Are you sure you want to delete small vehicle ${v.vehicle_number} (Plate: ${v.plate_number})?`;
    if (window.confirm(confirmMsg)) {
      try {
        await deleteSmallVehicle(v.id);
        if (selectedVehicle?.id === v.id) setSelectedVehicle(null);
      } catch (err: any) {
        alert(err?.message || (isRTL ? 'فشل حذف المركبة.' : 'Failed to delete vehicle.'));
      }
    }
  };

  const canEdit = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);
  const canDelete = hasPermission(['SUPER_ADMIN']);

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'المركبات الصغيرة' : 'Small Vehicles'}
            <br />
            {isRTL ? 'السجل الرئيسي' : 'Master Register'}
          </>
        }
        subtitle={
          isRTL
            ? 'سجل مستقل مخصص لسيارات الخدمة، البيك آب، والسيارات الإدارية، منفصل تماماً عن سجل الشاحنات والمعدات الثقيلة.'
            : 'Independent ledger dedicated exclusively to light service vehicles, pickups, and administrative transport, separate from heavy trucks.'
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
              <PrimaryButton onClick={() => { setEditingVehicle(null); setIsFormOpen(true); }}>
                {isRTL ? '+ إضافة مركبة صغيرة' : '+ Add small vehicle'}
              </PrimaryButton>
            )}
          </>
        }
      />

      <StatusTabs
        tabs={[
          { key: 'ALL', label: isRTL ? 'الكل' : 'All', count: smallVehicles.length },
          {
            key: 'ASSIGNED',
            label: isRTL ? 'مخصص لسائق' : 'Assigned',
            count: assignedCount,
            stripe: DESIGN_TOKENS.colors.status.availableStripe,
          },
          {
            key: 'STANDBY',
            label: isRTL ? 'احتياط' : 'Standby',
            count: standbyCount,
            stripe: DESIGN_TOKENS.colors.status.workshopStripe,
          },
        ]}
        activeKey={statusFilter}
        onChange={k => {
          setStatusFilter(k as 'ALL' | 'ASSIGNED' | 'STANDBY');
          setPage(1);
        }}
        searchValue={search}
        onSearchChange={val => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder={isRTL ? 'اللوحة، الرقم، الماركة، السائق...' : 'Plate, vehicle #, brand, driver...'}
      />

      <DataTable
        columns={[
          { label: isRTL ? 'م (Sn)' : 'Sn', align: 'start', width: 70 },
          { label: isRTL ? 'رقم اللوحة' : 'Plate No.', align: 'start' },
          { label: isRTL ? 'رقم المركبة' : 'Vehicle number', align: 'start' },
          { label: isRTL ? 'سنة الصنع' : 'Model year', align: 'start' },
          { label: isRTL ? 'الماركة' : 'Brand', align: 'start' },
          { label: isRTL ? 'اسم السائق' : 'Driver name', align: 'start' },
          { label: isRTL ? 'القسم / الموقع' : 'Dept. / Location', align: 'start' },
        ]}
        isEmpty={paged.length === 0}
        emptyMessage={
          search || statusFilter !== 'ALL'
            ? isRTL
              ? 'لا توجد مركبات صغيرة مطابقة لمعايير البحث'
              : 'No small vehicles match query'
            : isRTL
              ? 'لا توجد مركبات صغيرة مسجلة حتى الآن'
              : 'No small vehicles registered yet'
        }
        onClearFilters={
          search || statusFilter !== 'ALL'
            ? () => {
              setSearch('');
              setStatusFilter('ALL');
              setPage(1);
            }
            : undefined
        }
      >
        {paged.map(v => {
          const standby = isStandby(v);
          const stripe = standby
            ? DESIGN_TOKENS.colors.status.workshopStripe
            : DESIGN_TOKENS.colors.status.availableStripe;

          return (
            <DataRow
              key={v.id}
              stripeColor={stripe}
              onClick={() => setSelectedVehicle(v)}
              actions={
                <>
                  <RowAction
                    icon={<Eye size={14} />}
                    title={isRTL ? 'عرض التفاصيل' : 'View details'}
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
                      onClick={() => handleDelete(v)}
                    />
                  )}
                </>
              }
            >
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  #{v.sn}
                </span>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <PlateChip plate={v.plate_number} />
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                  }}
                >
                  {v.vehicle_number}
                </span>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-ink)' }}>
                  {v.model_year || '—'}
                </span>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>
                  {v.brand || '—'}
                </span>
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                {!standby ? (
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>
                    {v.driver_name}
                  </span>
                ) : (
                  <StatusText
                    label={isRTL ? 'احتياط / غير مخصص' : 'Unassigned / Standby'}
                    color={DESIGN_TOKENS.colors.status.workshopText}
                  />
                )}
              </td>
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {v.department_location || '—'}
                </span>
              </td>
            </DataRow>
          );
        })}
      </DataTable>

      <TableFooter
        summaryText={
          isRTL
            ? `${filtered.length} من ${smallVehicles.length} مركبة صغيرة`
            : `${filtered.length} of ${smallVehicles.length} small vehicles`
        }
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRecords={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
      />

      <SmallVehicleFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialVehicle={editingVehicle}
        onSuccess={() => { }}
      />
      <SmallVehicleDetailDrawer
        vehicle={selectedVehicle}
        isOpen={!!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        onEdit={v => {
          setSelectedVehicle(null);
          setEditingVehicle(v);
          setIsFormOpen(true);
        }}
        onDelete={v => handleDelete(v)}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </PageContainer>
  );
};

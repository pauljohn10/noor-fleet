import React, { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { Driver } from '../../types';
import { DriverFormModal } from './DriverFormModal';
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
  EmptyDash,
} from '../common/EditorialUI';

const getExpiryStatus = (dateStr: string): { color: string; hint: string; hintAr: string } => {
  if (!dateStr) {
    return { color: 'var(--color-text-muted)', hint: '—', hintAr: '—' };
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  const days = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) {
    return {
      color: DESIGN_TOKENS.colors.status.outOfServiceText,
      hint: `Expired (${Math.abs(days)}d ago)`,
      hintAr: `منتهية (منذ ${Math.abs(days)} يوم)`,
    };
  }
  if (days <= 30) {
    return {
      color: DESIGN_TOKENS.colors.status.workshopText,
      hint: `Expiring in ${days}d`,
      hintAr: `تنتهي خلال ${days} يوم`,
    };
  }
  return {
    color: DESIGN_TOKENS.colors.status.availableText,
    hint: `Valid (${days}d)`,
    hintAr: `سارية (${days} يوم)`,
  };
};

export const DriverList: React.FC = () => {
  const { drivers, vehicles } = useFleet();
  const { hasPermission } = useAuth();
  const { t, isRTL } = useI18n();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ASSIGNED' | 'ON_LEAVE' | 'INACTIVE'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | undefined>(undefined);

  const isAssignedDriver = (driverId: string) =>
    vehicles.some(v => v.assigned_driver_id === driverId);

  const filteredDrivers = drivers.filter(d => {
    const q = search.toLowerCase();
    const matchesSearch =
      d.full_name.toLowerCase().includes(q) ||
      d.employee_id.toLowerCase().includes(q) ||
      d.license_number.toLowerCase().includes(q) ||
      (d.phone || '').toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ASSIGNED') return isAssignedDriver(d.id);
    return d.status === statusFilter;
  });

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pagedItems: pagedDrivers,
  } = useTablePagination(filteredDrivers, [search, statusFilter], {
    table: 'drivers',
    orderBy: 'created_at',
    ascending: false,
    search,
    searchColumns: ['full_name', 'employee_id', 'license_number', 'phone'],
  });

  const handleOpenAdd = () => {
    setEditingDriver(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setIsModalOpen(true);
  };

  const handleExportExcel = () => {
    const data = filteredDrivers.map(d => {
      const assigned = vehicles.find(v => v.assigned_driver_id === d.id);
      return {
        [t('Employee ID')]: d.employee_id,
        [t('Full Name')]: d.full_name,
        [t('Phone Number')]: d.phone,
        [t('License Number')]: d.license_number,
        [t('License Type')]: d.license_type,
        [t('License Expiry')]: d.license_expiry,
        [t('Assigned Tractor')]: assigned ? `${assigned.vehicle_id} (${assigned.plate_number})` : t('Standby / Unassigned'),
        [t('Status')]: t(d.status),
      };
    });
    exportToExcel(data, 'Driver_Roster_Assignments');
  };

  const handleExportPDF = () => {
    const headers = [
      t('Employee ID'),
      t('Driver Full Name'),
      t('Phone Number'),
      t('Heavy License #'),
      t('License Expiry'),
      t('Assigned Tractor'),
      t('Status'),
    ];
    const rows = filteredDrivers.map(d => {
      const assigned = vehicles.find(v => v.assigned_driver_id === d.id);
      return [
        d.employee_id,
        d.full_name,
        d.phone,
        d.license_number,
        d.license_expiry,
        assigned ? `${assigned.vehicle_id} (${assigned.plate_number})` : t('Standby Spare'),
        t(d.status),
      ];
    });

    const activeCount = drivers.filter(d => d.status === 'ACTIVE').length;

    exportToPDFReport(
      t('Driver Roster & Vehicle Assignments Register'),
      headers,
      rows,
      'Driver_Roster_Report',
      {
        orientation: 'landscape',
        subtitle: t('Commercial Heavy Fuel Transport Driver Roster, Licensing & Vehicle Coupling Matrix'),
        summaryKPIs: [
          { label: t('Total Drivers'), value: drivers.length, color: 'slate' },
          { label: t('Active On Duty'), value: activeCount, color: 'emerald' },
          { label: t('Assigned to Truck'), value: vehicles.filter(v => Boolean(v.assigned_driver_id)).length, color: 'sky' },
        ],
        metadata: [
          { label: t('Search Query'), value: search || t('All Drivers') },
          { label: t('Export Scope'), value: `${filteredDrivers.length} ${t('drivers listed')}` },
        ],
      }
    );
  };

  const getDriverStatusMeta = (d: Driver, hasAssigned: boolean) => {
    if (d.status === 'INACTIVE') {
      return {
        stripe: DESIGN_TOKENS.colors.status.outOfServiceStripe,
        text: DESIGN_TOKENS.colors.status.outOfServiceText,
        label: isRTL ? 'غير نشط' : 'Inactive',
      };
    }
    if (d.status === 'ON_LEAVE') {
      return {
        stripe: DESIGN_TOKENS.colors.status.workshopStripe,
        text: DESIGN_TOKENS.colors.status.workshopText,
        label: isRTL ? 'في إجازة' : 'On leave',
      };
    }
    if (hasAssigned) {
      return {
        stripe: DESIGN_TOKENS.colors.status.onTripStripe,
        text: DESIGN_TOKENS.colors.status.onTripText,
        label: isRTL ? 'مكلف بشاحنة' : 'Assigned',
      };
    }
    return {
      stripe: DESIGN_TOKENS.colors.status.availableStripe,
      text: DESIGN_TOKENS.colors.status.availableText,
      label: isRTL ? 'متاح على رأس العمل' : 'Active',
    };
  };

  const activeCount = drivers.filter(d => d.status === 'ACTIVE').length;
  const assignedCount = drivers.filter(d => isAssignedDriver(d.id)).length;
  const onLeaveCount = drivers.filter(d => d.status === 'ON_LEAVE').length;
  const inactiveCount = drivers.filter(d => d.status === 'INACTIVE').length;
  const canEdit = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'قائمة السائقين' : 'Driver Roster &'}
            <br />
            {isRTL ? 'وتكليفات المركبات' : 'Vehicle Assignments'}
          </>
        }
        subtitle={t('Heavy transport driver profiles, hazardous material driver licenses, license expiries, and tractor assignments.')}
        actions={
          <>
            <GhostButton onClick={handleExportExcel}>
              {t('Excel')}
            </GhostButton>
            <GhostButton onClick={handleExportPDF}>
              {isRTL ? 'تقرير PDF' : 'PDF report'}
            </GhostButton>
            {canEdit && (
              <PrimaryButton onClick={handleOpenAdd}>
                {isRTL ? `+ ${t('Register Driver')}` : '+ Register driver'}
              </PrimaryButton>
            )}
          </>
        }
      />

      <StatusTabs
        tabs={[
          { key: 'ALL', label: isRTL ? 'الكل' : 'All', count: drivers.length },
          {
            key: 'ACTIVE',
            label: isRTL ? 'نشط' : 'Active',
            count: activeCount,
            stripe: DESIGN_TOKENS.colors.status.availableStripe,
          },
          {
            key: 'ASSIGNED',
            label: isRTL ? 'معين لشاحنة' : 'Assigned',
            count: assignedCount,
            stripe: DESIGN_TOKENS.colors.status.onTripStripe,
          },
          {
            key: 'ON_LEAVE',
            label: isRTL ? 'في إجازة' : 'On leave',
            count: onLeaveCount,
            stripe: DESIGN_TOKENS.colors.status.workshopStripe,
          },
          {
            key: 'INACTIVE',
            label: isRTL ? 'غير نشط' : 'Inactive',
            count: inactiveCount,
            stripe: DESIGN_TOKENS.colors.status.outOfServiceStripe,
          },
        ]}
        activeKey={statusFilter}
        onChange={k => {
          setStatusFilter(k as typeof statusFilter);
          setPage(1);
        }}
        searchValue={search}
        onSearchChange={val => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder={t('Search Driver Name, Employee ID, License...')}
      />

      <DataTable
        columns={[
          { label: isRTL ? 'اسم السائق' : 'Driver name', align: 'start' },
          { label: isRTL ? 'الرقم الوظيفي' : 'Employee ID', align: 'start' },
          { label: isRTL ? 'رقم الرخصة' : 'License #', align: 'start' },
          { label: isRTL ? 'نوع الرخصة' : 'License type', align: 'start' },
          { label: isRTL ? 'انتهاء الرخصة' : 'License expiry', align: 'start' },
          { label: isRTL ? 'الشاحنة المخصصة' : 'Assigned tractor', align: 'start' },
          { label: isRTL ? 'الحالة' : 'Status', align: 'start' },
        ]}
        isEmpty={pagedDrivers.length === 0}
        emptyMessage={t('No drivers found matching query.')}
        onClearFilters={() => {
          setSearch('');
          setStatusFilter('ALL');
          setPage(1);
        }}
      >
        {pagedDrivers.map(d => {
          const assignedVeh = vehicles.find(v => v.assigned_driver_id === d.id);
          const meta = getDriverStatusMeta(d, !!assignedVeh);
          const expStatus = getExpiryStatus(d.license_expiry);

          return (
            <DataRow
              key={d.id}
              stripeColor={meta.stripe}
              onClick={canEdit ? () => handleOpenEdit(d) : undefined}
              actions={
                canEdit ? (
                  <RowAction
                    icon={<Edit3 size={14} />}
                    title={t('Edit')}
                    onClick={() => handleOpenEdit(d)}
                  />
                ) : null
              }
            >
              {/* 1. Driver name */}
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>
                  {d.full_name}
                </div>
                {d.phone && (
                  <div
                    dir="ltr"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      marginTop: 2,
                    }}
                  >
                    {d.phone}
                  </div>
                )}
              </td>

              {/* 2. Employee ID */}
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-ink)',
                  }}
                >
                  {d.employee_id}
                </span>
              </td>

              {/* 3. License # */}
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
                  {d.license_number}
                </span>
              </td>

              {/* 4. License type */}
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span style={{ fontSize: 13, color: 'var(--color-ink)' }}>{t(d.license_type)}</span>
              </td>

              {/* 5. License expiry */}
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div
                  dir="ltr"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: expStatus.color,
                  }}
                >
                  {d.license_expiry || '—'}
                </div>
                <div style={{ fontSize: 12.5, color: expStatus.color, marginTop: 2 }}>
                  {isRTL ? expStatus.hintAr : expStatus.hint}
                </div>
              </td>

              {/* 6. Assigned tractor */}
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                {assignedVeh ? (
                  <div>
                    <PlateChip plate={assignedVeh.plate_number} />
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12.5,
                        color: 'var(--color-text-muted)',
                        marginTop: 4,
                      }}
                    >
                      {assignedVeh.vehicle_id} · {assignedVeh.make} {assignedVeh.model}
                    </div>
                  </div>
                ) : (
                  <EmptyDash label={t('Unassigned')} />
                )}
              </td>

              {/* 7. Status */}
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <StatusText label={meta.label} color={meta.text} />
              </td>
            </DataRow>
          );
        })}
      </DataTable>

      <TableFooter
        summaryText={
          isRTL
            ? `${filteredDrivers.length} من ${drivers.length} سائق`
            : `${filteredDrivers.length} of ${drivers.length} drivers`
        }
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRecords={filteredDrivers.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
      />

      <DriverFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialDriver={editingDriver}
      />
    </PageContainer>
  );
};

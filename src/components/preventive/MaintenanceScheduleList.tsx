import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { MaintenanceSchedule, PMStatus } from '../../types';
import { Modal } from '../common/Modal';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';
import { DESIGN_TOKENS } from '../../lib/designTokens';
import { useTablePagination } from '../../lib/supabasePagination';
import {
  PageContainer,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  StatusTabs,
  EditorialSelect,
  DataTable,
  DataRow,
  RowAction,
  StatusText,
  TableFooter,
} from '../common/EditorialUI';

const PM_STATUS_OPTIONS: {
  value: PMStatus;
  label: string;
  shortLabel: string;
  description: string;
  stripe: string;
  text: string;
}[] = [
    {
      value: 'UPCOMING',
      label: 'Upcoming (Scheduled)',
      shortLabel: 'UPCOMING',
      description: 'Scheduled for future service; within normal operating interval.',
      stripe: DESIGN_TOKENS.colors.status.onTripStripe,
      text: DESIGN_TOKENS.colors.status.onTripText,
    },
    {
      value: 'DUE_SOON',
      label: 'Due Soon',
      shortLabel: 'DUE SOON',
      description: 'Approaching service threshold (mileage or calendar date).',
      stripe: DESIGN_TOKENS.colors.status.workshopStripe,
      text: DESIGN_TOKENS.colors.status.workshopText,
    },
    {
      value: 'DUE',
      label: 'Due Now',
      shortLabel: 'DUE NOW',
      description: 'Service threshold reached; ready for workshop bay induction.',
      stripe: DESIGN_TOKENS.colors.status.workshopStripe,
      text: DESIGN_TOKENS.colors.status.workshopText,
    },
    {
      value: 'OVERDUE',
      label: 'Overdue',
      shortLabel: 'OVERDUE',
      description: 'Exceeded target mileage or due date; requires immediate attention.',
      stripe: DESIGN_TOKENS.colors.status.outOfServiceStripe,
      text: DESIGN_TOKENS.colors.status.outOfServiceText,
    },
    {
      value: 'COMPLETED',
      label: 'Completed',
      shortLabel: 'COMPLETED',
      description: 'Preventive maintenance service completed and verified.',
      stripe: DESIGN_TOKENS.colors.status.availableStripe,
      text: DESIGN_TOKENS.colors.status.availableText,
    },
  ];

export const MaintenanceScheduleList: React.FC = () => {
  const {
    schedules,
    vehicles,
    trailers,
    addMaintenanceSchedule,
    updateMaintenanceScheduleStatus,
    updateMaintenanceSchedule,
  } = useFleet();
  const { currentProfile, hasPermission } = useAuth();
  const { t, isRTL } = useI18n();

  const canManageStatus = hasPermission(['SUPER_ADMIN', 'WORKSHOP_MANAGER', 'WORKSHOP_STAFF']);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Status update states
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [targetStatus, setTargetStatus] = useState<PMStatus>('UPCOMING');
  const [statusNotes, setStatusNotes] = useState('');
  const [isSavingStatusModal, setIsSavingStatusModal] = useState(false);

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Schedule Form State
  const [title, setTitle] = useState('');
  const [unitType, setUnitType] = useState<'VEHICLE' | 'TRAILER'>('VEHICLE');
  const [targetVehicleId, setTargetVehicleId] = useState('');
  const [targetTrailerId, setTargetTrailerId] = useState('');
  const [frequencyType, setFrequencyType] = useState<'MILEAGE' | 'HOURS' | 'DAYS'>('MILEAGE');
  const [intervalValue, setIntervalValue] = useState(10000);
  const [lastServiceMileage, setLastServiceMileage] = useState(130000);
  const [nextDueMileage, setNextDueMileage] = useState(140000);
  const [nextDueDate, setNextDueDate] = useState('');
  const [initialStatus, setInitialStatus] = useState<PMStatus>('UPCOMING');
  const [newScheduleNotes, setNewScheduleNotes] = useState('');

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const filteredSchedules = schedules.filter(s => {
    const veh = vehicles.find(v => v.id === s.vehicle_id);
    const trl = trailers.find(tr => tr.id === s.trailer_id);
    const unitLabel = veh
      ? `${veh.vehicle_id} ${veh.plate_number}`
      : trl
        ? `${trl.trailer_id} ${trl.plate_number}`
        : '';
    const q = search.toLowerCase();
    const matchesSearch =
      s.title.toLowerCase().includes(q) ||
      unitLabel.toLowerCase().includes(q) ||
      (s.notes || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pagedItems: pagedSchedules,
  } = useTablePagination(filteredSchedules, [search, statusFilter], {
    table: 'maintenance_schedules',
    orderBy: 'created_at',
    ascending: false,
    search,
    searchColumns: ['title', 'notes'],
    eqFilters: { status: statusFilter },
  });

  const countByStatus = (st: PMStatus) => schedules.filter(s => s.status === st).length;

  const openChangeStatusModal = (schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    setTargetStatus(schedule.status);
    setStatusNotes(schedule.notes || '');
  };

  const handleQuickStatusChange = async (schedule: MaintenanceSchedule, newStatus: PMStatus) => {
    if (newStatus === schedule.status || updatingRowId === schedule.id) return;
    setUpdatingRowId(schedule.id);
    setFeedback(null);

    try {
      const ok = await updateMaintenanceScheduleStatus(
        schedule.id,
        newStatus,
        undefined,
        currentProfile?.full_name || 'Fleet Manager'
      );
      if (ok) {
        const statusMeta = PM_STATUS_OPTIONS.find(o => o.value === newStatus);
        setFeedback({
          type: 'success',
          message: `${t('Status for')} "${schedule.title}" ${t('updated to')} ${t(statusMeta?.shortLabel || newStatus)}.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `${t('Could not locate schedule')} "${schedule.title}" ${t('to update status.')}`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || t('Failed to update preventive maintenance status.'),
      });
    } finally {
      setUpdatingRowId(null);
    }
  };

  const handleModalStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule || isSavingStatusModal) return;

    setIsSavingStatusModal(true);
    setFeedback(null);

    try {
      const updates: Partial<MaintenanceSchedule> = {
        status: targetStatus,
        notes: statusNotes.trim(),
      };

      const ok = await updateMaintenanceSchedule(
        selectedSchedule.id,
        updates,
        currentProfile?.full_name || 'Fleet Manager'
      );

      if (ok) {
        const statusMeta = PM_STATUS_OPTIONS.find(o => o.value === targetStatus);
        setFeedback({
          type: 'success',
          message: `${t('Preventive maintenance record')} "${selectedSchedule.title}" ${t('updated to')} ${t(statusMeta?.shortLabel || targetStatus)}.`,
        });
        setSelectedSchedule(null);
      } else {
        setFeedback({
          type: 'error',
          message: t('Failed to save status update. Please try again.'),
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || t('An unexpected error occurred while saving status.'),
      });
    } finally {
      setIsSavingStatusModal(false);
    }
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (unitType === 'VEHICLE' && !targetVehicleId) return;
    if (unitType === 'TRAILER' && !targetTrailerId) return;

    addMaintenanceSchedule({
      vehicle_id: unitType === 'VEHICLE' ? targetVehicleId : undefined,
      trailer_id: unitType === 'TRAILER' ? targetTrailerId : undefined,
      title: title.trim(),
      frequency_type: frequencyType,
      interval_value: Number(intervalValue),
      last_service_mileage: frequencyType === 'MILEAGE' ? Number(lastServiceMileage) : 0,
      last_service_date: new Date().toISOString().slice(0, 10),
      next_due_mileage: frequencyType === 'MILEAGE' ? Number(nextDueMileage) : 0,
      next_due_date: nextDueDate || '2026-10-15',
      status: initialStatus,
      notes: newScheduleNotes.trim() || 'Scheduled routine preventive maintenance service',
    });

    setFeedback({
      type: 'success',
      message: `${t('Created preventive maintenance schedule')} "${title.trim()}".`,
    });
    setIsCreateModalOpen(false);
    setTitle('');
    setNewScheduleNotes('');
  };

  const handleExportExcel = () => {
    const data = filteredSchedules.map(s => {
      const veh = vehicles.find(v => v.id === s.vehicle_id);
      const trl = trailers.find(tr => tr.id === s.trailer_id);
      const statusMeta = PM_STATUS_OPTIONS.find(o => o.value === s.status);
      return {
        [t('Schedule Title')]: s.title,
        [t('Assigned Unit')]: veh
          ? `${veh.vehicle_id} (${veh.plate_number})`
          : trl
            ? `${trl.trailer_id} (${trl.plate_number})`
            : t('Unassigned'),
        [t('Interval')]:
          s.frequency_type === 'MILEAGE'
            ? `${t('Every')} ${s.interval_value} ${t('KM')}`
            : s.frequency_type === 'HOURS'
              ? `${t('Every')} ${s.interval_value} ${t('Hrs')}`
              : `${t('Every')} ${s.interval_value} ${t('Days')}`,
        [t('Last Service Odometer')]: s.last_service_mileage || t('N/A'),
        [t('Next Due Odometer')]: s.next_due_mileage || t('N/A'),
        [t('Next Due Date')]: s.next_due_date || t('N/A'),
        [t('Status')]: t(statusMeta?.shortLabel || s.status),
        [t('Notes')]: s.notes || '',
      };
    });
    exportToExcel(data, 'Preventive_Maintenance_Schedules');
  };

  const handleExportPDF = () => {
    const headers = [
      t('Schedule Title'),
      t('Assigned Unit'),
      t('Interval'),
      t('Last Service Odo'),
      t('Next Due Odo'),
      t('Next Due Date'),
      t('Status'),
    ];
    const rows = filteredSchedules.map(s => {
      const veh = vehicles.find(v => v.id === s.vehicle_id);
      const trl = trailers.find(tr => tr.id === s.trailer_id);
      const statusMeta = PM_STATUS_OPTIONS.find(o => o.value === s.status);
      return [
        s.title,
        veh
          ? `${veh.vehicle_id} (${veh.plate_number})`
          : trl
            ? `${trl.trailer_id} (${trl.plate_number})`
            : t('Unassigned'),
        s.frequency_type === 'MILEAGE'
          ? `${t('Every')} ${(s.interval_value || 0).toLocaleString()} ${t('KM')}`
          : s.frequency_type === 'HOURS'
            ? `${t('Every')} ${s.interval_value || 0} ${t('Hrs')}`
            : `${t('Every')} ${s.interval_value || 0} ${t('Days')}`,
        s.last_service_mileage ? `${(s.last_service_mileage || 0).toLocaleString()} ${t('KM')}` : t('N/A'),
        s.next_due_mileage ? `${(s.next_due_mileage || 0).toLocaleString()} ${t('KM')}` : t('N/A'),
        s.next_due_date || t('N/A'),
        t(statusMeta?.shortLabel || s.status.replace(/_/g, ' ')),
      ];
    });

    const overdueCount = countByStatus('OVERDUE');
    const dueCount = countByStatus('DUE') + countByStatus('DUE_SOON');
    const completedCount = countByStatus('COMPLETED');

    exportToPDFReport(
      t('Preventive Maintenance Service Schedules Ledger'),
      headers,
      rows,
      'Preventive_Maintenance_Report',
      {
        orientation: 'landscape',
        subtitle: t('Commercial Tractor & Tanker Scheduled Service Intervals, Target Odometers & Due Dates'),
        summaryKPIs: [
          { label: t('Total PM Schedules'), value: schedules.length, color: 'slate' },
          { label: t('Overdue Services'), value: overdueCount, color: overdueCount > 0 ? 'rose' : 'emerald' },
          { label: t('Due / Due Soon'), value: dueCount, color: dueCount > 0 ? 'amber' : 'emerald' },
          { label: t('Completed'), value: completedCount, color: 'emerald' },
        ],
        metadata: [
          {
            label: t('Status Filter'),
            value:
              statusFilter === 'ALL'
                ? t('All')
                : t(PM_STATUS_OPTIONS.find(o => o.value === statusFilter)?.shortLabel || statusFilter),
          },
          { label: t('Export Scope'), value: `${filteredSchedules.length} ${t('schedules listed')}` },
        ],
      }
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'جداول الصيانة' : 'Preventive'}
            <br />
            {isRTL ? 'الوقائية الدورية' : 'Maintenance'}
          </>
        }
        subtitle={t('Automated maintenance intervals triggered by Odometer Mileage (KM), Engine Hours, or Calendar Days.')}
        actions={
          <>
            <GhostButton onClick={handleExportExcel}>
              {t('Excel')}
            </GhostButton>
            <GhostButton onClick={handleExportPDF}>
              {isRTL ? 'تقرير PDF' : 'PDF report'}
            </GhostButton>
            {canManageStatus && (
              <PrimaryButton onClick={() => setIsCreateModalOpen(true)}>
                {isRTL ? `+ ${t('Create PM Schedule')}` : '+ Create PM schedule'}
              </PrimaryButton>
            )}
          </>
        }
      />

      {feedback && (
        <div
          role="status"
          style={{
            marginBottom: 20,
            padding: '10px 14px',
            borderRadius: 4,
            border: '1px solid var(--color-border)',
            borderInlineStart: `3px solid ${feedback.type === 'success'
              ? DESIGN_TOKENS.colors.status.availableStripe
              : DESIGN_TOKENS.colors.status.outOfServiceStripe
              }`,
            background: 'var(--color-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {feedback.type === 'success' ? (
              <CheckCircle2 size={15} style={{ color: DESIGN_TOKENS.colors.status.availableText }} />
            ) : (
              <AlertCircle size={15} style={{ color: DESIGN_TOKENS.colors.status.outOfServiceText }} />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 12,
              textDecoration: 'underline',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            {t('Dismiss')}
          </button>
        </div>
      )}

      <StatusTabs
        tabs={[
          { key: 'ALL', label: isRTL ? 'الكل' : 'All', count: schedules.length },
          {
            key: 'UPCOMING',
            label: isRTL ? 'مجدولة' : 'Upcoming',
            count: countByStatus('UPCOMING'),
            stripe: DESIGN_TOKENS.colors.status.onTripStripe,
          },
          {
            key: 'DUE_SOON',
            label: isRTL ? 'مستحقة قريباً' : 'Due soon',
            count: countByStatus('DUE_SOON'),
            stripe: DESIGN_TOKENS.colors.status.workshopStripe,
          },
          {
            key: 'DUE',
            label: isRTL ? 'مستحقة الآن' : 'Due now',
            count: countByStatus('DUE'),
            stripe: DESIGN_TOKENS.colors.status.workshopStripe,
          },
          {
            key: 'OVERDUE',
            label: isRTL ? 'متأخرة' : 'Overdue',
            count: countByStatus('OVERDUE'),
            stripe: DESIGN_TOKENS.colors.status.outOfServiceStripe,
          },
          {
            key: 'COMPLETED',
            label: isRTL ? 'مكتملة' : 'Completed',
            count: countByStatus('COMPLETED'),
            stripe: DESIGN_TOKENS.colors.status.availableStripe,
          },
        ]}
        activeKey={statusFilter}
        onChange={k => {
          setStatusFilter(k);
          setPage(1);
        }}
        searchValue={search}
        onSearchChange={val => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder={t('Search PM schedule title, unit, or notes...')}
      />

      <DataTable
        columns={[
          { label: isRTL ? 'مهمة الصيانة' : 'Service task', align: 'start' },
          { label: isRTL ? 'المركبة / المقطورة' : 'Assigned unit', align: 'start' },
          { label: isRTL ? 'التكرار' : 'Frequency', align: 'start' },
          { label: isRTL ? 'الفاصل' : 'Interval', align: 'end' },
          { label: isRTL ? 'موعد الصيانة القادم' : 'Next due target', align: 'start' },
          { label: isRTL ? 'الحالة' : 'Status', align: 'start' },
        ]}
        hasActionsColumn={canManageStatus}
        isEmpty={pagedSchedules.length === 0}
        emptyMessage={t('No preventive maintenance schedules found matching filter.')}
        onClearFilters={() => {
          setSearch('');
          setStatusFilter('ALL');
          setPage(1);
        }}
      >
        {pagedSchedules.map(s => {
          const veh = vehicles.find(v => v.id === s.vehicle_id);
          const trl = trailers.find(tr => tr.id === s.trailer_id);
          const meta = PM_STATUS_OPTIONS.find(o => o.value === s.status) || PM_STATUS_OPTIONS[0];
          const isRowUpdating = updatingRowId === s.id;

          return (
            <DataRow
              key={s.id}
              stripeColor={meta.stripe}
              onClick={canManageStatus ? () => openChangeStatusModal(s) : undefined}
              actions={
                canManageStatus ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <EditorialSelect
                      aria-label={`${t('Quick status select for')} ${s.title}`}
                      value={s.status}
                      disabled={isRowUpdating}
                      onChange={e => handleQuickStatusChange(s, e.target.value as PMStatus)}
                      style={{ paddingBlock: 4, fontSize: 12 }}
                    >
                      {PM_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.shortLabel)}
                        </option>
                      ))}
                    </EditorialSelect>
                    <RowAction
                      icon={isRowUpdating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      title={t('Change Status')}
                      onClick={() => openChangeStatusModal(s)}
                    />
                  </div>
                ) : null
              }
            >
              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{s.title}</div>
                {s.notes && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{s.notes}</div>
                )}
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                {veh ? (
                  <div>
                    <div
                      dir="ltr"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}
                    >
                      {veh.vehicle_id}
                    </div>
                    <div
                      dir="ltr"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}
                    >
                      {veh.plate_number}
                    </div>
                  </div>
                ) : trl ? (
                  <div>
                    <div
                      dir="ltr"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}
                    >
                      {trl.trailer_id}
                    </div>
                    <div
                      dir="ltr"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}
                    >
                      {trl.plate_number}
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    {t('Fleet General')}
                  </span>
                )}
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{t(s.frequency_type)}</span>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'end' }}>
                <span dir="ltr" style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, color: 'var(--color-ink)' }}>
                  {(s.interval_value || 0).toLocaleString()}{' '}
                  {s.frequency_type === 'MILEAGE' ? t('KM') : s.frequency_type === 'HOURS' ? t('Hrs') : t('Days')}
                </span>
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <div dir="ltr" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-ink)' }}>
                  {s.next_due_date || t('N/A')}
                </div>
                {(s.next_due_mileage || 0) > 0 && (
                  <div
                    dir="ltr"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}
                  >
                    {(s.next_due_mileage || 0).toLocaleString()} {t('KM')}
                  </div>
                )}
              </td>

              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                <StatusText label={t(meta.label)} color={meta.text} />
              </td>
            </DataRow>
          );
        })}
      </DataTable>

      <TableFooter
        summaryText={
          isRTL
            ? `${filteredSchedules.length} من ${schedules.length} جدول صيانة`
            : `${filteredSchedules.length} of ${schedules.length} schedules`
        }
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRecords={filteredSchedules.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
      />

      {/* Change Status Modal */}
      {selectedSchedule && (
        <Modal
          isOpen={!!selectedSchedule}
          onClose={() => !isSavingStatusModal && setSelectedSchedule(null)}
          title={t('Update Preventive Maintenance Status')}
          subtitle={t('Modify schedule lifecycle status and log workshop service remarks.')}
          maxWidth="lg"
        >
          <form onSubmit={handleModalStatusSubmit} className="space-y-4">
            <div
              style={{
                padding: '14px 16px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
              }}
            >
              <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                {t('Maintenance Schedule Record')}
              </div>
              <h4 style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>
                {selectedSchedule.title}
              </h4>
            </div>

            <div>
              <label className="text-xs font-medium text-[#5B574F] block mb-2">
                {t('Select New Maintenance Status')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PM_STATUS_OPTIONS.map(option => {
                  const isSelected = targetStatus === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTargetStatus(option.value)}
                      style={{
                        textAlign: 'start',
                        padding: 12,
                        borderRadius: 4,
                        border: isSelected
                          ? '1.5px solid var(--color-ink)'
                          : '1px solid var(--color-border)',
                        borderInlineStart: `3px solid ${option.stripe}`,
                        background: isSelected ? 'var(--color-row-hover)' : 'var(--color-surface)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                        {t(option.label)}
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                        {t(option.description)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[#5B574F] block mb-1.5">
                {t('Maintenance Status Notes / Remarks')}
              </label>
              <textarea
                rows={2}
                value={statusNotes}
                onChange={e => setStatusNotes(e.target.value)}
                placeholder={t('Optional workshop notes, bay assignment, or completion remarks...')}
                className="nf-field resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DDD8CB]">
              <SecondaryButton disabled={isSavingStatusModal} onClick={() => setSelectedSchedule(null)}>
                {t('Cancel')}
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={isSavingStatusModal}>
                {isSavingStatusModal ? t('Saving Status...') : t('Save Status Update')}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Schedule Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('Create Preventive Maintenance Schedule')}
        subtitle={t('Automate recurring service intervals for fuel trucks and tanker trailers.')}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#5B574F] block mb-1.5">
              {t('Schedule Title')} *
            </label>
            <input
              type="text"
              required
              placeholder={t('e.g. 10,000 KM Engine Oil & Filter Service')}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="nf-field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-medium text-[#5B574F] block mb-1.5">
                {t('Asset Category')}
              </label>
              <select
                value={unitType}
                onChange={e => setUnitType(e.target.value as 'VEHICLE' | 'TRAILER')}
                className="nf-field"
              >
                <option value="VEHICLE">{t('Tractor Head Truck')}</option>
                <option value="TRAILER">{t('Fuel Tanker Trailer')}</option>
              </select>
            </div>

            {unitType === 'VEHICLE' ? (
              <div>
                <label className="text-xs font-medium text-[#5B574F] block mb-1.5">
                  {t('Target Tractor Truck')} *
                </label>
                <select
                  required
                  value={targetVehicleId}
                  onChange={e => setTargetVehicleId(e.target.value)}
                  className="nf-field"
                >
                  <option value="">{t('-- Select Truck --')}</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.vehicle_id} ({v.plate_number})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-[#5B574F] block mb-1.5">
                  {t('Target Tanker Trailer')} *
                </label>
                <select
                  required
                  value={targetTrailerId}
                  onChange={e => setTargetTrailerId(e.target.value)}
                  className="nf-field"
                >
                  <option value="">{t('-- Select Trailer --')}</option>
                  {trailers.map(tr => (
                    <option key={tr.id} value={tr.id}>
                      {tr.trailer_id} ({tr.plate_number})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="text-xs font-medium text-[#5B574F] block mb-1.5">{t('Frequency Rule')}</label>
              <select
                value={frequencyType}
                onChange={e => setFrequencyType(e.target.value as 'MILEAGE' | 'HOURS' | 'DAYS')}
                className="nf-field"
              >
                <option value="MILEAGE">{t('Mileage Interval (KM)')}</option>
                <option value="HOURS">{t('Engine Hours')}</option>
                <option value="DAYS">{t('Calendar Days')}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#5B574F] block mb-1.5">{t('Interval Value')}</label>
              <input
                type="number"
                min={1}
                dir="ltr"
                value={intervalValue}
                onChange={e => setIntervalValue(Number(e.target.value))}
                className="nf-field font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5B574F] block mb-1.5">{t('Initial Status')}</label>
              <select
                value={initialStatus}
                onChange={e => setInitialStatus(e.target.value as PMStatus)}
                className="nf-field"
              >
                {PM_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.shortLabel)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="text-xs font-medium text-[#5B574F] block mb-1.5">{t('Last Service (KM)')}</label>
              <input
                type="number"
                min={0}
                dir="ltr"
                value={lastServiceMileage}
                onChange={e => setLastServiceMileage(Number(e.target.value))}
                className="nf-field font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5B574F] block mb-1.5">{t('Next Due (KM)')}</label>
              <input
                type="number"
                min={0}
                dir="ltr"
                value={nextDueMileage}
                onChange={e => setNextDueMileage(Number(e.target.value))}
                className="nf-field font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5B574F] block mb-1.5">{t('Next Due Date')}</label>
              <input
                type="date"
                dir="ltr"
                value={nextDueDate}
                onChange={e => setNextDueDate(e.target.value)}
                className="nf-field font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#5B574F] block mb-1.5">{t('Service Notes (Optional)')}</label>
            <input
              type="text"
              value={newScheduleNotes}
              onChange={e => setNewScheduleNotes(e.target.value)}
              placeholder={t('e.g. Replace 15W-40 oil, primary/secondary filters, and inspect belts.')}
              className="nf-field"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DDD8CB]">
            <SecondaryButton onClick={() => setIsCreateModalOpen(false)}>{t('Cancel')}</SecondaryButton>
            <PrimaryButton type="submit">{t('Save Schedule')}</PrimaryButton>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};

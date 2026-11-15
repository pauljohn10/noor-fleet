import React, { useState } from 'react';
import {
  Truck,
  Plus,
  CalendarCheck,
  ShieldCheck,
  Eye,
  ZoomIn,
  Maximize2,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ImageLightboxModal } from '../common/ImageLightboxModal';
import { VehicleFormModal } from '../vehicles/VehicleFormModal';
import { TrailerFormModal } from '../trailers/TrailerFormModal';
import {
  DefectReport,
  SeverityLevel,
  VehicleStatus,
  DefectReportStatus,
  PMStatus,
} from '../../types';
import {
  EDITORIAL_STATUS,
  PageContainer,
  PageHeader,
  MetricStrip,
  EditorialSection,
  DataTable,
  DataRow,
  RowAction,
  PlateChip,
  StatusText,
  EditorialSelect,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
} from '../common/EditorialUI';

interface FleetManagerDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const FleetManagerDashboard: React.FC<FleetManagerDashboardProps> = ({ onNavigateTab }) => {
  const {
    vehicles,
    trailers,
    schedules,
    defectReports,
    drivers,
    addWorkOrder,
    addMaintenanceSchedule,
    updateMaintenanceScheduleStatus,
    updateVehicle,
    updateDefectReport,
    refreshData,
  } = useFleet();
  const { t, isRTL } = useI18n();

  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DefectReport | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  // Lightbox Modal state for full-screen photo viewing & zoom
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title?: string;
    subtitle?: string;
    reportNumber?: string;
    createdAt?: string;
  }>({
    isOpen: false,
    imageUrl: '',
  });

  const openLightbox = (
    imageUrl: string,
    title?: string,
    subtitle?: string,
    reportNumber?: string,
    createdAt?: string
  ) => {
    setLightboxData({
      isOpen: true,
      imageUrl,
      title: title || 'Attached Incident Photo',
      subtitle,
      reportNumber,
      createdAt,
    });
  };

  const closeLightbox = () => {
    setLightboxData((prev) => ({ ...prev, isOpen: false }));
  };

  // Status Metrics
  const availableCount = vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const onTripCount = vehicles.filter((v) => v.status === 'ON_TRIP').length;
  const inWorkshopCount = vehicles.filter((v) => v.status === 'IN_WORKSHOP').length;
  const requiresInspectionCount = vehicles.filter((v) => v.status === 'REQUIRES INSPECTION').length;
  const outOfServiceCount = vehicles.filter((v) => v.status === 'OUT_OF_SERVICE').length;

  // Fleet Manager Action Handlers
  const handleCreateWorkOrder = async (rep: DefectReport) => {
    const veh = vehicles.find((v) => v.vehicle_id === rep.vehicle_id || v.id === rep.vehicle_id);
    const wo = await addWorkOrder({
      vehicle_id: veh?.id || rep.vehicle_id,
      trailer_id: rep.trailer_id,
      driver_id: rep.driver_id,
      problem_description: `[DEFECT REPORT ${rep.report_number}]: ${rep.category} - ${rep.description}`,
      priority: rep.severity === 'CRITICAL' ? 'CRITICAL' : rep.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
      reported_by: rep.driver_name,
      status: 'REPORTED',
    });

    await updateDefectReport(rep.id, {
      status: 'WORK_ORDER_CREATED' as DefectReportStatus,
      work_order_id: wo.id,
      action_taken: `Work Order ${wo.work_order_number} created by Fleet Manager.`,
      workshop_response: `Work order created by Fleet Manager.`,
    });

    if (veh) {
      await updateVehicle(veh.id, { status: 'IN_WORKSHOP' });
    }

    alert(
      `Work Order ${wo.work_order_number} created successfully! Vehicle ${rep.vehicle_id} set to IN WORKSHOP.`
    );
    setSelectedReport(null);
    setActionNotes('');
    await refreshData();
  };

  const handleSchedulePM = async (rep: DefectReport) => {
    const veh = vehicles.find((v) => v.vehicle_id === rep.vehicle_id || v.id === rep.vehicle_id);
    await addMaintenanceSchedule({
      vehicle_id: veh?.id,
      title: `Scheduled Repair: ${rep.category} (${rep.report_number})`,
      frequency_type: 'DAYS',
      interval_value: 7,
      last_service_mileage: veh?.current_mileage || 0,
      last_service_date: new Date().toISOString().slice(0, 10),
      next_due_mileage: (veh?.current_mileage || 0) + 1000,
      next_due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: 'DUE_SOON',
      notes: `Defect Report ${rep.report_number}: ${rep.description}`,
    });

    await updateDefectReport(rep.id, {
      status: 'SCHEDULED' as DefectReportStatus,
      action_taken: 'Scheduled maintenance item created.',
      workshop_response: 'Scheduled for workshop repair within 7 days.',
    });

    alert(`Maintenance scheduled for vehicle ${rep.vehicle_id}.`);
    setSelectedReport(null);
    setActionNotes('');
    await refreshData();
  };

  const _handleRequestMoreInfo = async (rep: DefectReport) => {
    if (!actionNotes.trim()) {
      alert('Please provide notes specifying what additional information is needed from the driver.');
      return;
    }

    await updateDefectReport(rep.id, {
      status: 'MORE_INFO_REQUESTED' as DefectReportStatus,
      fleet_manager_notes: actionNotes,
      workshop_response: `Fleet Manager request: ${actionNotes}`,
    });

    alert(`Information request sent to Driver ${rep.driver_name}.`);
    setSelectedReport(null);
    setActionNotes('');
    await refreshData();
  };
  void _handleRequestMoreInfo;

  const handleMarkResolved = async (rep: DefectReport) => {
    const note = actionNotes.trim() || 'Reviewed by Fleet Manager. Issue addressed.';
    await updateDefectReport(rep.id, {
      status: 'RESOLVED' as DefectReportStatus,
      fleet_manager_notes: note,
      workshop_response: note,
    });

    alert(`Defect report ${rep.report_number} marked as RESOLVED.`);
    setSelectedReport(null);
    setActionNotes('');
    await refreshData();
  };

  const _handleMarkDuplicate = async (rep: DefectReport) => {
    await updateDefectReport(rep.id, {
      status: 'DUPLICATE' as DefectReportStatus,
      workshop_response: 'Closed as duplicate report.',
    });

    alert(`Defect report ${rep.report_number} marked as DUPLICATE.`);
    setSelectedReport(null);
    setActionNotes('');
    await refreshData();
  };
  void _handleMarkDuplicate;

  const handleUpdateVehicleStatus = (rep: DefectReport, newStatus: VehicleStatus) => {
    const veh = vehicles.find((v) => v.vehicle_id === rep.vehicle_id);
    if (veh) {
      updateVehicle(veh.id, { status: newStatus });
      alert(`Vehicle ${rep.vehicle_id} status updated to ${newStatus}.`);
    } else {
      alert(`Vehicle ${rep.vehicle_id} updated to ${newStatus}.`);
    }
    refreshData();
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <Badge variant="danger" size="sm">
            {t('CRITICAL', 'CRITICAL')}
          </Badge>
        );
      case 'HIGH':
        return (
          <Badge variant="amber" size="sm">
            {t('HIGH', 'HIGH')}
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge variant="info" size="sm">
            {t('MEDIUM', 'MEDIUM')}
          </Badge>
        );
      case 'LOW':
        return (
          <Badge variant="slate" size="sm">
            {t('LOW', 'LOW')}
          </Badge>
        );
    }
  };

  const getVehicleStripe = (status: VehicleStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return EDITORIAL_STATUS.green.stripe;
      case 'ON_TRIP':
        return EDITORIAL_STATUS.blue.stripe;
      case 'IN_WORKSHOP':
      case 'REQUIRES INSPECTION':
        return EDITORIAL_STATUS.amber.stripe;
      case 'OUT_OF_SERVICE':
        return EDITORIAL_STATUS.red.stripe;
      default:
        return EDITORIAL_STATUS.muted.stripe;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'مساحة عمل' : 'Fleet Operations'}
            <br />
            {isRTL ? 'عمليات الأسطول' : 'Control Workspace'}
          </>
        }
        subtitle={t(
          'fleet_workspace_desc',
          'Control center for vehicle status, driver defect reports, and maintenance schedules.'
        )}
        actions={
          <>
            <SecondaryButton onClick={() => onNavigateTab('drivers')}>
              {t('assign_driver', 'Assign Driver')}
            </SecondaryButton>
            <SecondaryButton onClick={() => setIsTrailerModalOpen(true)}>
              {isRTL ? `+ ${t('add_trailer', 'Add Trailer')}` : '+ Add trailer'}
            </SecondaryButton>
            <PrimaryButton onClick={() => setIsVehicleModalOpen(true)}>
              {isRTL ? `+ ${t('add_vehicle', 'Add Vehicle')}` : '+ Add fuel truck'}
            </PrimaryButton>
          </>
        }
      />

      {/* COMPACT ERP FLEET STATUS SUMMARY BAR */}
      <EditorialSection
        title={t('fleet_status_summary', 'Fleet operational status summary')}
        action={
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
            }}
          >
            {isRTL ? 'مراقبة مباشرة' : 'Live Telemetry'}
          </span>
        }
        marginTop={0}
      >
        <MetricStrip
          items={[
            {
              label: isRTL ? 'متاح' : 'Available',
              value: availableCount,
              mono: true,
              stripe: EDITORIAL_STATUS.green.stripe,
              onClick: () => onNavigateTab('vehicles'),
            },
            {
              label: isRTL ? 'في رحلة' : 'On trip',
              value: onTripCount,
              mono: true,
              stripe: EDITORIAL_STATUS.blue.stripe,
              onClick: () => onNavigateTab('vehicles'),
            },
            {
              label: isRTL ? 'في الورشة' : 'In workshop',
              value: inWorkshopCount,
              mono: true,
              stripe: EDITORIAL_STATUS.amber.stripe,
              onClick: () => onNavigateTab('workOrders'),
            },
            {
              label: isRTL ? 'يتطلب فحص' : 'Requires inspection',
              value: requiresInspectionCount,
              mono: true,
              stripe: EDITORIAL_STATUS.amber.stripe,
              onClick: () => onNavigateTab('vehicles'),
            },
            {
              label: isRTL ? 'خارج الخدمة' : 'Out of service',
              value: outOfServiceCount,
              mono: true,
              stripe: EDITORIAL_STATUS.red.stripe,
              onClick: () => onNavigateTab('vehicles'),
            },
          ]}
        />
      </EditorialSection>

      {/* DATA TABLE 1: DRIVER REPORTS */}
      <EditorialSection
        title={
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" style={{ color: 'var(--color-brand-accent)' }} />
            {t('driver_problem_reports_inbox', 'Driver problem reports inbox')}
          </span>
        }
        action={
          <GhostButton onClick={() => onNavigateTab('inspections')}>
            {t('view_all_reports', 'View All Reports')} {isRTL ? '←' : '→'}
          </GhostButton>
        }
        marginTop={8}
      >
        <DataTable
          columns={[
            { label: t('priority', 'Priority') },
            { label: t('report_num', 'Report #') },
            { label: t('driver', 'Driver') },
            { label: t('vehicles', 'Vehicle') },
            { label: t('problem_summary', 'Problem Summary') },
            { label: t('date', 'Date') },
            { label: t('status', 'Status') },
          ]}
          isEmpty={defectReports.length === 0}
          emptyMessage={t('no_defect_reports', 'No driver defect reports found.')}
        >
          {defectReports.slice(0, 5).map((rep) => (
            <DataRow
              key={rep.id}
              stripeColor={
                rep.severity === 'CRITICAL'
                  ? EDITORIAL_STATUS.red.stripe
                  : rep.severity === 'HIGH'
                  ? EDITORIAL_STATUS.amber.stripe
                  : rep.status === 'RESOLVED'
                  ? EDITORIAL_STATUS.green.stripe
                  : EDITORIAL_STATUS.blue.stripe
              }
              onClick={() => {
                setSelectedReport(rep);
                setActionNotes(rep.fleet_manager_notes || '');
              }}
              actions={
                <RowAction
                  icon={<Eye className="w-4 h-4" />}
                  title={t('process', 'Process')}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedReport(rep);
                    setActionNotes(rep.fleet_manager_notes || '');
                  }}
                />
              }
            >
              <td className="py-3 pe-3 whitespace-nowrap">{getSeverityBadge(rep.severity)}</td>
              <td className="py-3 pe-3 whitespace-nowrap">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                    fontSize: 12,
                  }}
                >
                  {rep.report_number}
                </span>
              </td>
              <td className="py-3 pe-3 whitespace-nowrap">
                <span style={{ fontWeight: 500, color: 'var(--color-ink)', fontSize: 13 }}>
                  {rep.driver_name}
                </span>
              </td>
              <td className="py-3 pe-3 whitespace-nowrap">
                <span style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: 12 }}>
                  {rep.plate_number ? `${rep.plate_number} (${rep.vehicle_id})` : rep.vehicle_id}
                  {rep.trailer_id ? ` • ${rep.trailer_id}` : ''}
                </span>
              </td>
              <td className="py-3 pe-3">
                <span
                  className="block max-w-xs truncate"
                  style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}
                >
                  {rep.description}
                </span>
              </td>
              <td className="py-3 pe-3 whitespace-nowrap">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-muted)',
                    fontSize: 11,
                  }}
                >
                  {new Date(rep.created_at).toLocaleDateString()}
                </span>
              </td>
              <td className="py-3 pe-3 whitespace-nowrap">
                <Badge
                  variant={
                    rep.status === 'NEW' || rep.status === 'REPORTED'
                      ? 'amber'
                      : rep.status === 'UNDER_REVIEW'
                      ? 'info'
                      : rep.status === 'IN_PROGRESS' || rep.status === 'WORK_ORDER_CREATED'
                      ? 'purple'
                      : rep.status === 'RESOLVED'
                      ? 'success'
                      : rep.status === 'REJECTED'
                      ? 'danger'
                      : 'slate'
                  }
                  size="sm"
                >
                  {rep.status === 'REPORTED'
                    ? 'New'
                    : t(rep.status, rep.status.replace(/_/g, ' '))}
                </Badge>
              </td>
            </DataRow>
          ))}
        </DataTable>
      </EditorialSection>

      {/* DATA TABLE 2: VEHICLE STATUS MATRIX */}
      <EditorialSection
        title={
          <span className="inline-flex items-center gap-2">
            <Truck className="w-4 h-4" style={{ color: 'var(--color-brand-accent)' }} />
            {t('fleet_vehicle_status_matrix', 'Fleet vehicle status matrix')}
          </span>
        }
        action={
          <GhostButton onClick={() => onNavigateTab('vehicles')}>
            {t('manage_fleet', 'Manage Fleet')} {isRTL ? '←' : '→'}
          </GhostButton>
        }
        marginTop={28}
      >
        <DataTable
          columns={[
            { label: t('vehicles', 'Vehicle') },
            { label: t('plate_number', 'Plate Number') },
            { label: t('coupled_trailer', 'Coupled Trailer') },
            { label: t('assigned_driver', 'Assigned Driver') },
            { label: t('odometer', 'Odometer') },
            { label: t('status', 'Status') },
          ]}
          isEmpty={vehicles.length === 0}
          emptyMessage={t('no_vehicles', 'No vehicles registered.')}
        >
          {vehicles.map((v) => {
            const driver = drivers.find((d) => d.id === v.assigned_driver_id);
            const stripe = getVehicleStripe(v.status);
            return (
              <DataRow
                key={v.id}
                stripeColor={stripe}
                onClick={() => onNavigateTab('vehicles')}
                actions={
                  <RowAction
                    icon={<Eye className="w-4 h-4" />}
                    title={t('details', 'View Record')}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateTab('vehicles');
                    }}
                  />
                }
              >
                <td className="py-3 pe-3 whitespace-nowrap">
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                    {v.vehicle_id}
                  </span>
                </td>
                <td className="py-3 pe-3 whitespace-nowrap">
                  <PlateChip plate={v.plate_number} accentColor={stripe} />
                </td>
                <td className="py-3 pe-3 whitespace-nowrap">
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                    {v.assigned_trailer_id || t('none_coupled', 'Uncoupled')}
                  </span>
                </td>
                <td className="py-3 pe-3 whitespace-nowrap">
                  <span style={{ color: 'var(--color-ink)', fontWeight: 500, fontSize: 13 }}>
                    {driver ? driver.full_name : t('unassigned_driver', 'Unassigned')}
                  </span>
                </td>
                <td className="py-3 pe-3 whitespace-nowrap">
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-secondary)',
                      fontSize: 12,
                    }}
                  >
                    {(v.current_mileage || 0).toLocaleString()} KM
                  </span>
                </td>
                <td className="py-3 pe-3 whitespace-nowrap">
                  <StatusText
                    label={t(v.status, v.status.replace(/_/g, ' '))}
                    color={
                      v.status === 'AVAILABLE'
                        ? EDITORIAL_STATUS.green.text
                        : v.status === 'ON_TRIP'
                        ? EDITORIAL_STATUS.blue.text
                        : v.status === 'OUT_OF_SERVICE'
                        ? EDITORIAL_STATUS.red.text
                        : EDITORIAL_STATUS.amber.text
                    }
                  />
                </td>
              </DataRow>
            );
          })}
        </DataTable>
      </EditorialSection>

      {/* DATA TABLE 3: UPCOMING MAINTENANCE */}
      <EditorialSection
        title={
          <span className="inline-flex items-center gap-2">
            <CalendarCheck className="w-4 h-4" style={{ color: 'var(--color-brand-accent)' }} />
            {t('upcoming_pm', 'Upcoming preventive maintenance')}
          </span>
        }
        action={
          <GhostButton onClick={() => onNavigateTab('preventive')}>
            {t('view_all', 'View PM Rules')} {isRTL ? '←' : '→'}
          </GhostButton>
        }
        marginTop={28}
      >
        <DataTable
          columns={[
            { label: isRTL ? 'عنوان الخدمة المجدولة' : 'Schedule Service Title' },
            { label: isRTL ? 'الشاحنة المستهدفة' : 'Target Unit' },
            { label: isRTL ? 'الفترة' : 'Interval' },
            { label: isRTL ? 'تاريخ الاستحقاق' : 'Due Date Target' },
            { label: t('status', 'Status') },
            { label: t('action', 'Change Status'), align: 'end' },
          ]}
          hasActionsColumn={false}
          isEmpty={schedules.length === 0}
          emptyMessage={isRTL ? 'لا توجد خطط صيانة وقائية.' : 'No preventive maintenance schedules.'}
        >
          {schedules.map((s) => {
            const veh = vehicles.find((v) => v.id === s.vehicle_id);
            const trl = trailers.find((tr) => tr.id === s.trailer_id);
            const stripe =
              s.status === 'OVERDUE'
                ? EDITORIAL_STATUS.red.stripe
                : s.status === 'DUE' || s.status === 'DUE_SOON'
                ? EDITORIAL_STATUS.amber.stripe
                : s.status === 'COMPLETED'
                ? EDITORIAL_STATUS.green.stripe
                : EDITORIAL_STATUS.blue.stripe;
            return (
              <DataRow key={s.id} stripeColor={stripe}>
                <td className="py-3 pe-3">
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-ink)' }}>
                    {s.title}
                  </span>
                </td>
                <td className="py-3 pe-3 whitespace-nowrap">
                  <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {veh
                      ? veh.vehicle_id
                      : trl
                      ? trl.trailer_id
                      : isRTL
                      ? 'عام للأسطول'
                      : 'Fleet General'}
                  </span>
                </td>
                <td className="py-3 pe-3 whitespace-nowrap">
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {(s.interval_value || 0).toLocaleString()}{' '}
                    {s.frequency_type === 'MILEAGE'
                      ? isRTL
                        ? 'كم'
                        : 'KM'
                      : isRTL
                      ? 'يوم'
                      : 'Days'}
                  </span>
                </td>
                <td className="py-3 pe-3 whitespace-nowrap">
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {s.next_due_date || (isRTL ? 'شرط المسافة' : 'KM Trigger')}
                  </span>
                </td>
                <td className="py-3 pe-3 whitespace-nowrap">
                  <Badge
                    variant={
                      s.status === 'OVERDUE'
                        ? 'danger'
                        : s.status === 'DUE' || s.status === 'DUE_SOON'
                        ? 'amber'
                        : s.status === 'COMPLETED'
                        ? 'success'
                        : 'info'
                    }
                    size="sm"
                  >
                    {s.status === 'OVERDUE'
                      ? isRTL
                        ? 'متأخر'
                        : 'Overdue'
                      : s.status === 'DUE'
                      ? isRTL
                        ? 'يستحق الآن'
                        : 'Due now'
                      : s.status === 'DUE_SOON'
                      ? isRTL
                        ? 'يستحق قريباً'
                        : 'Due soon'
                      : s.status === 'COMPLETED'
                      ? isRTL
                        ? 'مكتمل'
                        : 'Completed'
                      : isRTL
                      ? 'مجدول'
                      : 'Upcoming'}
                  </Badge>
                </td>
                <td className="py-3 text-end whitespace-nowrap">
                  <EditorialSelect
                    aria-label={
                      isRTL ? `تغيير حالة ${s.title}` : `Change status for ${s.title}`
                    }
                    value={s.status}
                    onChange={(e) =>
                      updateMaintenanceScheduleStatus(s.id, e.target.value as PMStatus)
                    }
                    width={140}
                  >
                    <option value="UPCOMING">{isRTL ? 'قادم (مجدول)' : 'UPCOMING'}</option>
                    <option value="DUE_SOON">{isRTL ? 'يستحق قريباً' : 'DUE SOON'}</option>
                    <option value="DUE">{isRTL ? 'يستحق الآن' : 'DUE NOW'}</option>
                    <option value="OVERDUE">{isRTL ? 'متأخر' : 'OVERDUE'}</option>
                    <option value="COMPLETED">{isRTL ? 'مكتمل' : 'COMPLETED'}</option>
                  </EditorialSelect>
                </td>
              </DataRow>
            );
          })}
        </DataTable>
      </EditorialSection>

      {/* PROCESS DEFECT REPORT ACTION MODAL */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          isHidden={lightboxData.isOpen}
          onClose={() => setSelectedReport(null)}
          title={
            isRTL
              ? `سجل تدقيق البلاغ: ${selectedReport.report_number}`
              : `Defect Audit Record: ${selectedReport.report_number}`
          }
          subtitle={
            isRTL
              ? `السائق: ${selectedReport.driver_name} | الوحدة: ${selectedReport.vehicle_id}`
              : `Driver: ${selectedReport.driver_name} | Unit: ${selectedReport.vehicle_id}`
          }
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div
              className="p-4 space-y-2.5"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-ink)' }}>
                    {isRTL
                      ? `عطل: ${selectedReport.category}`
                      : `${selectedReport.category} Defect`}
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
                  >
                    ({new Date(selectedReport.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')})
                  </span>
                </div>
                {getSeverityBadge(selectedReport.severity)}
              </div>
              <p
                className="p-3 leading-relaxed"
                style={{
                  background: 'var(--color-page-bg)',
                  border: '1px solid var(--color-row-divider)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-ink)',
                }}
              >
                {selectedReport.description}
              </p>
              {selectedReport.photo_url && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[11px] font-semibold block"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {isRTL ? 'صورة العطل المرفقة:' : 'Attached Issue Photo:'}
                    </span>
                    <SecondaryButton
                      type="button"
                      onClick={() =>
                        openLightbox(
                          selectedReport.photo_url!,
                          isRTL
                            ? `صورة البلاغ: ${selectedReport.report_number}`
                            : `Issue Photo: ${selectedReport.report_number}`,
                          isRTL
                            ? `السائق: ${selectedReport.driver_name} • الوحدة: ${selectedReport.vehicle_id}`
                            : `Driver: ${selectedReport.driver_name} • Unit: ${selectedReport.vehicle_id}`,
                          selectedReport.report_number,
                          selectedReport.created_at
                        )
                      }
                      style={{ height: 28, padding: '2px 10px', fontSize: 11 }}
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>
                        {isRTL ? 'اضغط للتكبير والعرض الكامل' : 'Click to Open Full Size & Zoom'}
                      </span>
                    </SecondaryButton>
                  </div>
                  <div
                    onClick={() =>
                      openLightbox(
                        selectedReport.photo_url!,
                        isRTL
                          ? `صورة البلاغ: ${selectedReport.report_number}`
                          : `Issue Photo: ${selectedReport.report_number}`,
                        isRTL
                          ? `السائق: ${selectedReport.driver_name} • الوحدة: ${selectedReport.vehicle_id}`
                          : `Driver: ${selectedReport.driver_name} • Unit: ${selectedReport.vehicle_id}`,
                        selectedReport.report_number,
                        selectedReport.created_at
                      )
                    }
                    style={{
                      background: 'var(--color-page-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    className="group relative cursor-pointer overflow-hidden max-w-sm"
                    title={
                      isRTL
                        ? 'اضغط لعرض الصورة بالحجم الكامل'
                        : 'Click to open full-screen viewer with zoom'
                    }
                  >
                    <img
                      src={selectedReport.photo_url}
                      alt={isRTL ? 'صورة العطل المبلغ عنه' : 'Driver reported issue'}
                      className="max-h-48 w-auto object-contain mx-auto"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <span
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
                        style={{
                          background: 'var(--color-ink)',
                          color: 'var(--color-page-bg)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        {isRTL ? 'عرض في عارض الصور' : 'View Full-Screen Lightbox'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className="p-3 space-y-2"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <span
                className="text-[11px] font-semibold block"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {isRTL ? 'تحديث الحالة التشغيلية للمركبة:' : 'Update Vehicle Operational Status:'}
              </span>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => handleUpdateVehicleStatus(selectedReport, 'REQUIRES INSPECTION')}
                  style={{ height: 30, fontSize: 12 }}
                >
                  {isRTL ? 'تعيين: يتطلب فحص' : 'Set Requires Inspection'}
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => handleUpdateVehicleStatus(selectedReport, 'OUT_OF_SERVICE')}
                  style={{
                    height: 30,
                    fontSize: 12,
                    color: EDITORIAL_STATUS.red.text,
                  }}
                >
                  {isRTL ? 'تعيين: خارج الخدمة' : 'Set Out of Service'}
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => handleUpdateVehicleStatus(selectedReport, 'AVAILABLE')}
                  style={{
                    height: 30,
                    fontSize: 12,
                    color: EDITORIAL_STATUS.green.text,
                  }}
                >
                  {isRTL ? 'تعيين: متاح للخدمة' : 'Set Available'}
                </SecondaryButton>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-ink)' }}>
                {isRTL ? 'ملاحظات المعالجة ورد المشرف' : 'Resolution & Supervisor Response Notes'}
              </label>
              <textarea
                rows={3}
                placeholder={
                  isRTL
                    ? 'أدخل الإجراءات المتخذة أو توجيهات الورشة أو نتائج الفحص...'
                    : 'Enter actions taken, workshop instructions, or inspection results...'
                }
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="nf-field w-full resize-none"
              />
            </div>

            <div
              className="pt-3 flex flex-wrap items-center justify-end gap-2.5"
              style={{ borderTop: '1px solid var(--color-row-divider)' }}
            >
              <SecondaryButton
                type="button"
                onClick={() => setSelectedReport(null)}
                style={{ marginInlineEnd: 'auto' }}
              >
                {t('Close', 'Close')}
              </SecondaryButton>
              <SecondaryButton type="button" onClick={() => handleSchedulePM(selectedReport)}>
                {isRTL ? 'جدولة صيانة وقائية' : 'Schedule PM Repair'}
              </SecondaryButton>
              <SecondaryButton type="button" onClick={() => handleCreateWorkOrder(selectedReport)}>
                {isRTL ? 'إنشاء أمر عمل' : 'Create Work Order'}
              </SecondaryButton>
              <PrimaryButton type="button" onClick={() => handleMarkResolved(selectedReport)}>
                {isRTL ? 'اعتماد الحل' : 'Mark Resolved'}
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}

      <VehicleFormModal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} />

      <TrailerFormModal isOpen={isTrailerModalOpen} onClose={() => setIsTrailerModalOpen(false)} />

      {/* Full-Screen Image Lightbox Viewer with Zoom & Pan */}
      <ImageLightboxModal
        isOpen={lightboxData.isOpen}
        onClose={closeLightbox}
        imageUrl={lightboxData.imageUrl}
        title={lightboxData.title}
        subtitle={lightboxData.subtitle}
        reportNumber={lightboxData.reportNumber}
        createdAt={lightboxData.createdAt}
      />
    </PageContainer>
  );
};

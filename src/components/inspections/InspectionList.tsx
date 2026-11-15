import React, { useState } from 'react';
import {
  ShieldCheck, Plus, AlertTriangle, CheckCircle2,
  FileSpreadsheet, FileText, Truck, History, Camera,
  Link2, Copy, Share2, ExternalLink, Check, Users, Maximize2, ZoomIn, Eye
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ImageLightboxModal } from '../common/ImageLightboxModal';
import { InspectionFormMobile } from './InspectionFormMobile';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';
import { useTablePagination } from '../../lib/supabasePagination';
import { DefectReport, SeverityLevel, VehicleStatus, DefectReportStatus } from '../../types';
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
  PlateChip,
  StatusText,
  TableFooter,
  EDITORIAL_STATUS,
  EmptyDash,
} from '../common/EditorialUI';

const REPORT_STATUS_OPTIONS: {
  value: DefectReportStatus;
  label: string;
  tone: 'amber' | 'blue' | 'green' | 'red';
}[] = [
  { value: 'NEW', label: 'New', tone: 'amber' },
  { value: 'UNDER_REVIEW', label: 'Under Review', tone: 'blue' },
  { value: 'IN_PROGRESS', label: 'In Progress', tone: 'blue' },
  { value: 'RESOLVED', label: 'Resolved', tone: 'green' },
  { value: 'REJECTED', label: 'Rejected', tone: 'red' },
];

export const InspectionList: React.FC = () => {
  const {
    inspections,
    defectReports,
    vehicles,
    trailers,
    drivers,
    technicians,
    workOrders,
    addWorkOrder,
    addMaintenanceSchedule,
    updateVehicle,
    updateDefectReport,
    refreshData,
  } = useFleet();
  const { currentProfile, hasPermission } = useAuth();
  const { t, isRTL } = useI18n();
  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER', 'WORKSHOP_MANAGER', 'FLEET_STAFF', 'WORKSHOP_STAFF']);

  const [activeMainTab, setActiveMainTab] = useState<'DEFECT_REPORTS' | 'CHECKLISTS'>('DEFECT_REPORTS');

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Shareable URL copy state
  const [copiedLink, setCopiedLink] = useState(false);

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
      title: title || t('Attached Incident Photo'),
      subtitle,
      reportNumber,
      createdAt,
    });
  };

  const closeLightbox = () => {
    setLightboxData((prev) => ({ ...prev, isOpen: false }));
  };

  // Modal & Record Detail Sheet State
  const [isInspectionFormOpen, setIsInspectionFormOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DefectReport | null>(null);
  const [detailTab, setDetailTab] = useState<'DETAILS' | 'VEHICLE' | 'DRIVER' | 'PHOTOS' | 'MAINTENANCE' | 'HISTORY'>('DETAILS');
  const [modalStatus, setModalStatus] = useState<DefectReportStatus>('NEW');
  const [internalNotes, setInternalNotes] = useState('');
  const [assignedTeam, setAssignedTeam] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const publicReportUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/driver-report`
      : '/driver-report';

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicReportUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // Fallback copy
      const input = document.createElement('input');
      input.value = publicReportUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `${t('Noor Fleet â€” Report a Vehicle Issue (No Login Required)')}:\n${publicReportUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  // Normalize legacy status 'REPORTED' to 'NEW' for filtering consistency
  const normalizeStatus = (status: DefectReportStatus): DefectReportStatus => {
    if (status === 'REPORTED') return 'NEW';
    if (status === 'WORK_ORDER_CREATED' || status === 'SCHEDULED') return 'IN_PROGRESS';
    if (status === 'DUPLICATE') return 'REJECTED';
    return status;
  };

  const filteredReports = defectReports.filter(r => {
    const veh = vehicles.find(
      v => v.vehicle_id === r.vehicle_id || v.plate_number === r.plate_number
    );
    const plateStr = r.plate_number || veh?.plate_number || '';
    const q = search.toLowerCase();

    const matchesSearch =
      r.report_number.toLowerCase().includes(q) ||
      r.driver_name.toLowerCase().includes(q) ||
      r.vehicle_id.toLowerCase().includes(q) ||
      plateStr.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q);

    const matchesSeverity = severityFilter === 'ALL' || r.severity === severityFilter;
    const normalized = normalizeStatus(r.status);
    const matchesStatus =
      statusFilter === 'ALL' || r.status === statusFilter || normalized === statusFilter;
    const matchesVehicle =
      vehicleFilter === 'ALL' ||
      r.vehicle_id === vehicleFilter ||
      veh?.vehicle_id === vehicleFilter;
    const matchesCategory =
      categoryFilter === 'ALL' || r.category.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesSeverity && matchesStatus && matchesVehicle && matchesCategory;
  });

  const filteredChecklists = inspections.filter(i =>
    i.inspection_number.toLowerCase().includes(search.toLowerCase())
  );

  const {
    page: reportsPage,
    setPage: setReportsPage,
    pageSize: reportsPageSize,
    setPageSize: setReportsPageSize,
    totalPages: reportsTotalPages,
    pagedItems: pagedReports,
  } = useTablePagination(
    filteredReports,
    [search, severityFilter, statusFilter, vehicleFilter, categoryFilter, activeMainTab],
    {
      table: 'defect_reports',
      orderBy: 'created_at',
      ascending: false,
      search,
      searchColumns: ['report_number', 'driver_name', 'vehicle_id', 'plate_number', 'category', 'description'],
      eqFilters: { severity: severityFilter },
    }
  );

  const {
    page: checklistsPage,
    setPage: setChecklistsPage,
    pageSize: checklistsPageSize,
    setPageSize: setChecklistsPageSize,
    totalPages: checklistsTotalPages,
    pagedItems: pagedChecklists,
  } = useTablePagination(filteredChecklists, [search, activeMainTab], {
    table: 'vehicle_inspections',
    orderBy: 'created_at',
    ascending: false,
    search,
    searchColumns: ['inspection_number'],
  });

  // Open detail modal & populate state
  const openReportDetail = (rep: DefectReport) => {
    setSelectedReport(rep);
    setDetailTab('DETAILS');
    setModalStatus(normalizeStatus(rep.status));
    setInternalNotes(rep.internal_notes || rep.fleet_manager_notes || '');
    setAssignedTeam(rep.assigned_maintenance_team || '');
  };

  // Inline or modal status update
  const handleQuickStatusUpdate = async (rep: DefectReport, newStatus: DefectReportStatus) => {
    const statusLabel = REPORT_STATUS_OPTIONS.find(s => s.value === newStatus)?.label || newStatus.replace(/_/g, ' ');
    await updateDefectReport(
      rep.id,
      {
        status: newStatus,
        action_taken: `Status updated to ${newStatus.replace(/_/g, ' ')} by ${currentProfile.full_name}.`,
      },
      currentProfile.full_name
    );
    setFeedbackMessage(`${t('Report')} ${rep.report_number} ${t('status updated to')} ${t(statusLabel)}.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleSaveReportReview = async () => {
    if (!selectedReport) return;
    const statusLabel = REPORT_STATUS_OPTIONS.find(s => s.value === modalStatus)?.label || modalStatus.replace(/_/g, ' ');

    await updateDefectReport(
      selectedReport.id,
      {
        status: modalStatus,
        internal_notes: internalNotes.trim(),
        fleet_manager_notes: internalNotes.trim(),
        assigned_maintenance_team: assignedTeam || undefined,
        action_taken: `Reviewed by ${currentProfile.full_name} â€” Status: ${modalStatus}${
          assignedTeam ? `, Assigned Team: ${assignedTeam}` : ''
        }`,
      },
      currentProfile.full_name
    );

    setFeedbackMessage(
      `${t('Saved review for')} ${selectedReport.report_number} (${t('Status')}: ${t(statusLabel)}).`
    );
    setTimeout(() => setFeedbackMessage(null), 4000);
    setSelectedReport(null);
  };

  const handleCreateWorkOrder = async (rep: DefectReport) => {
    const veh = vehicles.find(
      v => v.vehicle_id === rep.vehicle_id || v.plate_number === rep.plate_number
    );
    const wo = await addWorkOrder({
      vehicle_id: veh?.id || rep.vehicle_id,
      trailer_id: rep.trailer_id,
      driver_id: rep.driver_id,
      problem_description: `[DRIVER ISSUE REPORT ${rep.report_number}]: ${rep.category} - ${rep.description}`,
      priority: rep.severity === 'CRITICAL' ? 'CRITICAL' : rep.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
      reported_by: rep.driver_name,
      status: 'REPORTED',
    });
    const woId = typeof wo === 'string' ? wo : (wo as any)?.work_order_number || (wo as any)?.id || 'WO-CREATED';

    await updateDefectReport(
      rep.id,
      {
        status: 'IN_PROGRESS',
        work_order_id: woId,
        internal_notes: internalNotes.trim() || rep.internal_notes,
        assigned_maintenance_team: assignedTeam || rep.assigned_maintenance_team,
        action_taken: `Work Order ${woId} created by ${currentProfile.full_name}.`,
        workshop_response: `Work order ${woId} created.`,
      },
      currentProfile.full_name
    );

    if (veh) {
      updateVehicle(veh.id, { status: 'IN_WORKSHOP' });
    }

    setFeedbackMessage(`${t('Work Order')} ${woId} ${t('created for vehicle')} ${rep.vehicle_id} ${t('and status set to IN PROGRESS')}.`);
    setTimeout(() => setFeedbackMessage(null), 4500);
    setSelectedReport(null);
    refreshData();
  };

  const handleSchedulePM = async (rep: DefectReport) => {
    const veh = vehicles.find(
      v => v.vehicle_id === rep.vehicle_id || v.plate_number === rep.plate_number
    );
    addMaintenanceSchedule({
      vehicle_id: veh?.id,
      title: `Scheduled Repair: ${rep.category} (${rep.report_number})`,
      frequency_type: 'DAYS',
      interval_value: 7,
      last_service_mileage: veh?.current_mileage || 0,
      last_service_date: new Date().toISOString().slice(0, 10),
      next_due_mileage: (veh?.current_mileage || 0) + 1000,
      next_due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: 'DUE_SOON',
      notes: `Driver Report ${rep.report_number}: ${rep.description}`,
    });

    await updateDefectReport(
      rep.id,
      {
        status: 'IN_PROGRESS',
        internal_notes: internalNotes.trim() || rep.internal_notes,
        assigned_maintenance_team: assignedTeam || rep.assigned_maintenance_team,
        action_taken: 'Scheduled 7-day preventive maintenance service.',
        workshop_response: 'Scheduled for workshop service.',
      },
      currentProfile.full_name
    );

    setFeedbackMessage(`${t('Maintenance scheduled for vehicle')} ${rep.vehicle_id}.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setSelectedReport(null);
    refreshData();
  };

  const handleUpdateVehicleStatus = (rep: DefectReport, newStatus: VehicleStatus) => {
    const veh = vehicles.find(
      v => v.vehicle_id === rep.vehicle_id || v.plate_number === rep.plate_number
    );
    if (veh) {
      updateVehicle(veh.id, { status: newStatus });
      setFeedbackMessage(`${t('Vehicle')} ${veh.vehicle_id} (${veh.plate_number}) ${t('status updated to')} ${t(newStatus)}.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
    refreshData();
  };

  const handleExportExcel = () => {
    const dateLocale = isRTL ? 'ar-SA-u-ca-gregory' : 'en-US';
    if (activeMainTab === 'DEFECT_REPORTS') {
      const data = filteredReports.map(r => {
        const veh = vehicles.find(v => v.vehicle_id === r.vehicle_id || v.plate_number === r.plate_number);
        const norm = normalizeStatus(r.status);
        const statusMeta = REPORT_STATUS_OPTIONS.find(s => s.value === norm);
        return {
          [t('Report #')]: r.report_number,
          [t('Driver Name')]: r.driver_name,
          [t('Plate Number')]: r.plate_number || veh?.plate_number || t('N/A'),
          [t('Vehicle ID')]: r.vehicle_id,
          [t('Category')]: t(r.category),
          [t('Severity')]: t(r.severity),
          [t('Description')]: r.description,
          [t('Assigned Team')]: r.assigned_maintenance_team ? t(r.assigned_maintenance_team) : t('Unassigned'),
          [t('Status')]: t(statusMeta?.label || norm),
          [t('Internal Notes')]: r.internal_notes || r.fleet_manager_notes || '',
          [t('Date')]: new Date(r.created_at).toLocaleString(dateLocale),
        };
      });
      exportToExcel(data, 'Driver_Issue_Reports');
    } else {
      const data = filteredChecklists.map(i => ({
        [t('Inspection #')]: i.inspection_number,
        [t('Vehicle ID')]: vehicles.find(v => v.id === i.vehicle_id)?.vehicle_id || t('N/A'),
        [t('Odometer')]: i.odometer_reading,
        [t('Result')]: t(i.overall_status),
        [t('Critical Failure')]: i.has_critical_failure ? t('YES') : t('NO'),
        [t('Date')]: new Date(i.inspection_date).toLocaleString(dateLocale),
      }));
      exportToExcel(data, 'Vehicle_Inspections');
    }
  };

  const handleExportPDF = () => {
    const dateLocale = isRTL ? 'ar-SA-u-ca-gregory' : 'en-US';
    if (activeMainTab === 'DEFECT_REPORTS') {
      const headers = [
        t('Report #'),
        t('Driver Name'),
        t('Plate Number'),
        t('Category'),
        t('Severity'),
        t('Issue Description'),
        t('Status'),
        t('Date Reported'),
      ];
      const rows = filteredReports.map(r => {
        const veh = vehicles.find(v => v.vehicle_id === r.vehicle_id || v.plate_number === r.plate_number);
        const norm = normalizeStatus(r.status);
        const statusMeta = REPORT_STATUS_OPTIONS.find(s => s.value === norm);
        return [
          r.report_number,
          r.driver_name,
          r.plate_number || veh?.plate_number || r.vehicle_id || t('N/A'),
          t(r.category),
          t(r.severity || 'MEDIUM'),
          r.description,
          t(statusMeta?.label || norm),
          new Date(r.created_at).toLocaleDateString(dateLocale),
        ];
      });

      const critCount = defectReports.filter(r => r.severity === 'CRITICAL').length;
      const newCount = defectReports.filter(r => normalizeStatus(r.status) === 'REPORTED').length;
      const resCount = defectReports.filter(r => normalizeStatus(r.status) === 'RESOLVED').length;

      exportToPDFReport(
        t('Driver Issue & Defect Reports Register'),
        headers,
        rows,
        'Driver_Issue_Reports',
        {
          orientation: 'landscape',
          subtitle: t('Commercial driver issue logs submitted via Public Driver Portal & Workshop Dispatch'),
          summaryKPIs: [
            { label: t('Total Reports'), value: defectReports.length, color: 'slate' },
            { label: t('Critical Severity'), value: critCount, color: 'rose' },
            { label: t('Pending / In Review'), value: newCount, color: 'amber' },
            { label: t('Resolved'), value: resCount, color: 'emerald' }
          ],
          metadata: [
            { label: t('Status Filter'), value: statusFilter === 'ALL' ? t('All Statuses') : t(REPORT_STATUS_OPTIONS.find(s => s.value === statusFilter)?.label || statusFilter) },
            { label: t('Category Filter'), value: categoryFilter === 'ALL' ? t('All Categories') : t(categoryFilter) },
            { label: t('Export Scope'), value: `${filteredReports.length} ${t('records')}` }
          ]
        }
      );
    } else {
      const headers = [
        t('Inspection #'),
        t('Vehicle ID'),
        t('Plate Number'),
        t('Inspector ID'),
        t('Odometer'),
        t('Overall Status'),
        t('Critical Safety Fail'),
        t('Inspection Date'),
      ];
      const rows = filteredChecklists.map(i => {
        const veh = vehicles.find(v => v.id === i.vehicle_id);
        return [
          i.inspection_number,
          veh ? veh.vehicle_id : t('N/A'),
          veh ? veh.plate_number : t('N/A'),
          i.inspector_id || t('Authorized Safety Inspector'),
          `${(i.odometer_reading || 0).toLocaleString()} ${t('KM')}`,
          t(i.overall_status),
          i.has_critical_failure ? t('CRITICAL FAIL') : t('PASS'),
          new Date(i.inspection_date).toLocaleDateString(dateLocale),
        ];
      });

      const passCount = inspections.filter(i => i.overall_status === 'PASS').length;
      const failCount = inspections.filter(i => i.overall_status === 'FAIL' || i.has_critical_failure).length;

      exportToPDFReport(
        t('Vehicle Pre-Trip & Safety Inspection Log'),
        headers,
        rows,
        'Vehicle_Inspections_Report',
        {
          orientation: 'landscape',
          subtitle: t('Mandatory Saudi DOT (Muroor) & Aramco Terminal Pre-Trip Vehicle Safety Verifications'),
          summaryKPIs: [
            { label: t('Total Inspections'), value: inspections.length, color: 'slate' },
            { label: t('Safety Passed'), value: passCount, color: 'emerald' },
            { label: t('Safety Failed'), value: failCount, color: 'rose' }
          ],
          metadata: [
            { label: t('Result Filter'), value: statusFilter === 'ALL' ? t('All') : t(statusFilter) },
            { label: t('Total Exported'), value: `${filteredChecklists.length} ${t('inspection logs')}` }
          ]
        }
      );
    }
  };

  const getToneStyle = (sev: SeverityLevel) => {
    switch (sev) {
      case 'CRITICAL':
        return { bg: 'transparent', color: EDITORIAL_STATUS.red.text, border: 'var(--color-border)' };
      case 'HIGH':
        return { bg: 'transparent', color: EDITORIAL_STATUS.amber.text, border: 'var(--color-border)' };
      case 'MEDIUM':
        return { bg: 'transparent', color: EDITORIAL_STATUS.blue.text, border: 'var(--color-border)' };
      case 'LOW':
      default:
        return { bg: 'transparent', color: 'var(--color-text-secondary)', border: 'var(--color-border)' };
    }
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    const tone = getToneStyle(sev);
    return <StatusText label={t(sev)} color={tone.color} />;
  };

  const getStatusMeta = (status: DefectReportStatus) => {
    const norm = normalizeStatus(status);
    const meta = REPORT_STATUS_OPTIONS.find(s => s.value === norm);
    const tone = EDITORIAL_STATUS[meta?.tone || 'muted'];
    return {
      norm,
      label: t(meta?.label || norm.replace(/_/g, ' ')),
      tone,
    };
  };

  const maintenanceTeamOptions = [
    'Engine & Powertrain Workshop Team',
    'Brakes, Pneumatics & Chassis Team',
    'Electrical & Telematics Team',
    'Tires & Wheel Alignment Bay',
    'Tanker Valves & Hydrostatic Team',
    ...technicians.map(tech => `${tech.full_name} (${tech.specialization})`),
  ];

  const hasActiveDefectFilters =
    search !== '' ||
    statusFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    vehicleFilter !== 'ALL' ||
    severityFilter !== 'ALL';

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setVehicleFilter('ALL');
    setSeverityFilter('ALL');
  };

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            {isRTL ? 'ط¨ظ„ط§ط؛ط§طھ ط§ظ„ط³ط§ط¦ظ‚ظٹظ†' : 'Driver Reports &'}
            <br />
            {isRTL ? 'ظˆظپط­ظˆطµط§طھ ط§ظ„ظ…ط±ظƒط¨ط§طھ' : 'Inspections Inbox'}
          </>
        }
        subtitle={t('Driver issue reports, public reporting link, and digital pre-trip checklist logs.')}
        actions={
          <>
            <GhostButton onClick={handleExportExcel}>
              {t('Excel')}
            </GhostButton>
            <GhostButton onClick={handleExportPDF}>
              {isRTL ? 'طھظ‚ط±ظٹط± PDF' : 'PDF report'}
            </GhostButton>
            <SecondaryButton onClick={handleCopyPublicLink}>
              {copiedLink ? t('Copied Link!') : isRTL ? 'ظ†ط³ط® ط±ط§ط¨ط· ط§ظ„ط¨ظ„ط§ط؛ط§طھ' : 'Copy public link'}
            </SecondaryButton>
            {canManage && (
              <PrimaryButton onClick={() => setIsInspectionFormOpen(true)}>
                {isRTL ? `+ ${t('Log Pre-Trip Inspection')}` : '+ Log pre-trip inspection'}
              </PrimaryButton>
            )}
          </>
        }
      />

      {/* Feedback Notification Banner */}
      {feedbackMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '10px 14px',
            marginBottom: 16,
            borderRadius: 4,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderInlineStart: `3px solid ${EDITORIAL_STATUS.green.stripe}`,
            color: 'var(--color-ink)',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0, color: EDITORIAL_STATUS.green.text }} />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            style={{
              background: 'transparent',
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

      {/* Main Editorial Tabs + Search */}
      <StatusTabs
        tabs={[
          {
            key: 'ALL',
            label: isRTL ? 'ط§ظ„ظƒظ„' : 'All',
            count: defectReports.length,
          },
          {
            key: 'NEW',
            label: isRTL ? 'ط¬ط¯ظٹط¯' : 'New',
            count: defectReports.filter(r => normalizeStatus(r.status) === 'NEW').length,
            stripe: EDITORIAL_STATUS.amber.stripe,
          },
          {
            key: 'UNDER_REVIEW',
            label: isRTL ? 'ظ‚ظٹط¯ ط§ظ„ظ…ط±ط§ط¬ط¹ط©' : 'Under review',
            count: defectReports.filter(r => normalizeStatus(r.status) === 'UNDER_REVIEW').length,
            stripe: EDITORIAL_STATUS.blue.stripe,
          },
          {
            key: 'IN_PROGRESS',
            label: isRTL ? 'ظ‚ظٹط¯ ط§ظ„طھظ†ظپظٹط°' : 'In progress',
            count: defectReports.filter(r => normalizeStatus(r.status) === 'IN_PROGRESS').length,
            stripe: EDITORIAL_STATUS.amber.stripe,
          },
          {
            key: 'RESOLVED',
            label: isRTL ? 'طھظ… ط§ظ„ط­ظ„' : 'Resolved',
            count: defectReports.filter(r => normalizeStatus(r.status) === 'RESOLVED').length,
            stripe: EDITORIAL_STATUS.green.stripe,
          },
          {
            key: 'CHECKLISTS',
            label: isRTL ? 'ظپط­ظˆطµط§طھ ظ…ط§ ظ‚ط¨ظ„ ط§ظ„ط±ط­ظ„ط©' : 'Pre-trip logs',
            count: inspections.length,
            stripe: EDITORIAL_STATUS.blue.stripe,
          },
        ]}
        activeKey={activeMainTab === 'CHECKLISTS' ? 'CHECKLISTS' : statusFilter}
        onChange={key => {
          if (key === 'CHECKLISTS') {
            setActiveMainTab('CHECKLISTS');
          } else {
            setActiveMainTab('DEFECT_REPORTS');
            setStatusFilter(key);
          }
        }}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={
          activeMainTab === 'DEFECT_REPORTS'
            ? t('Search report #, driver name, plate #, issue...')
            : t('Search inspection #...')
        }
        extraFilters={
          activeMainTab === 'DEFECT_REPORTS' ? (
            <>
              <EditorialSelect
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">{t('All Categories')}</option>
                <option value="Mechanical">{t('Mechanical')}</option>
                <option value="Electrical">{t('Electrical')}</option>
                <option value="Tire">{t('Tire')}</option>
                <option value="Accident">{t('Accident')}</option>
                <option value="Other">{t('Other')}</option>
              </EditorialSelect>
              <EditorialSelect
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
              >
                <option value="ALL">{t('All Severities')}</option>
                <option value="CRITICAL">{t('CRITICAL')}</option>
                <option value="HIGH">{t('HIGH')}</option>
                <option value="MEDIUM">{t('MEDIUM')}</option>
                <option value="LOW">{t('LOW')}</option>
              </EditorialSelect>
            </>
          ) : undefined
        }
      />

      {/* TAB 1: DRIVER ISSUE REPORTS */}
      {activeMainTab === 'DEFECT_REPORTS' && (
        <div>
          <DataTable
            columns={[
              { label: t('Report #') },
              { label: t('Driver Name') },
              { label: t('Vehicle Plate & Unit') },
              { label: t('Category') },
              { label: t('Issue Description') },
              { label: t('Assigned Team') },
              { label: t('Submitted') },
              { label: t('Status') },
            ]}
            isEmpty={filteredReports.length === 0}
            emptyMessage={t('No driver issue reports found matching your filter criteria.')}
            onClearFilters={hasActiveDefectFilters ? clearAllFilters : undefined}
            clearFiltersLabel={t('Clear filters')}
          >
            {pagedReports.map(rep => {
              const veh = vehicles.find(
                v => v.vehicle_id === rep.vehicle_id || v.plate_number === rep.plate_number
              );
              const displayPlate = rep.plate_number || veh?.plate_number || rep.vehicle_id;
              const statusMeta = getStatusMeta(rep.status);

              return (
                <DataRow
                  key={rep.id}
                  stripeColor={statusMeta.tone.stripe}
                  onClick={() => openReportDetail(rep)}
                  actions={
                    <>
                      <select
                        aria-label={`${t('Status for')} ${rep.report_number}`}
                        value={statusMeta.norm}
                        onChange={e =>
                          handleQuickStatusUpdate(rep, e.target.value as DefectReportStatus)
                        }
                        className="nf-field"
                        style={{ height: 28, fontSize: 12.5, padding: '0 8px', width: 'auto' }}
                      >
                        {REPORT_STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {t(opt.label)}
                          </option>
                        ))}
                      </select>
                      <RowAction
                        icon={<Eye style={{ width: 15, height: 15 }} />}
                        title={t('Review')}
                        onClick={() => openReportDetail(rep)}
                      />
                    </>
                  }
                >
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        dir="ltr"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--color-ink)',
                        }}
                      >
                        {rep.report_number}
                      </span>
                      {rep.photo_url && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            openLightbox(
                              rep.photo_url!,
                              `${t('Issue Photo')}: ${rep.report_number}`,
                              `${t('Driver')}: ${rep.driver_name} â€¢ ${t('Plate')}: ${displayPlate}`,
                              rep.report_number,
                              rep.created_at
                            );
                          }}
                          title={t('Click to view attached photo full size')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'var(--color-page-bg)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-brand-accent)',
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          <Camera style={{ width: 12, height: 12 }} />
                          <span className="hidden sm:inline">{t('Photo')}</span>
                        </button>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>
                    {rep.driver_name}
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                      <PlateChip plate={displayPlate} accentColor={statusMeta.tone.stripe} />
                      {veh && (
                        <span
                          dir="ltr"
                          style={{ fontSize: 12.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                        >
                          {veh.vehicle_id} â€¢ {veh.make}
                        </span>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>
                        {t(rep.category)}
                      </span>
                      {getSeverityBadge(rep.severity)}
                    </div>
                  </td>

                  <td
                    style={{
                      padding: '14px 16px',
                      verticalAlign: 'middle',
                      fontSize: 12.5,
                      color: 'var(--color-text-secondary)',
                      maxWidth: 260,
                    }}
                    title={rep.description}
                  >
                    <div className="truncate">{rep.description}</div>
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: 12.5 }}>
                    {rep.assigned_maintenance_team ? (
                      <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>
                        {t(rep.assigned_maintenance_team)}
                      </span>
                    ) : (
                      <EmptyDash label={t('Unassigned')} />
                    )}
                  </td>

                  <td
                    style={{
                      padding: '14px 16px',
                      verticalAlign: 'middle',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span dir="ltr">
                      {new Date(rep.created_at).toLocaleString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US', {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <StatusText label={statusMeta.label} color={statusMeta.tone.text} />
                  </td>
                </DataRow>
              );
            })}
          </DataTable>

          <TableFooter
            summaryText={`${t('Showing')} ${filteredReports.length} ${t('of')} ${defectReports.length} ${t('driver issue reports')} آ· ${t('Public Portal Endpoint: Active')} (/driver-report)`}
            page={reportsPage}
            totalPages={reportsTotalPages}
            pageSize={reportsPageSize}
            totalRecords={filteredReports.length}
            onPageChange={setReportsPage}
            onPageSizeChange={setReportsPageSize}
            onPrev={() => setReportsPage(p => Math.max(1, p - 1))}
            onNext={() => setReportsPage(p => Math.min(reportsTotalPages, p + 1))}
          />
        </div>
      )}

      {/* TAB 2: PRE-TRIP CHECKLIST LOGS */}
      {activeMainTab === 'CHECKLISTS' && (
        <div>
          <DataTable
            columns={[
              { label: t('Inspection #') },
              { label: t('Tractor Truck') },
              { label: t('Odometer') },
              { label: t('Result') },
              { label: t('Critical Defect') },
              { label: t('Linked WO') },
              { label: t('Date') },
            ]}
            isEmpty={filteredChecklists.length === 0}
            emptyMessage={t('No inspection checklist logs match your query.')}
            onClearFilters={search ? () => setSearch('') : undefined}
            clearFiltersLabel={t('Clear filters')}
            hasActionsColumn={false}
          >
            {pagedChecklists.map(i => {
              const veh = vehicles.find(v => v.id === i.vehicle_id);
              const linkedWO = workOrders.find(w => w.id === i.created_work_order_id);
              const isPass = i.overall_status === 'PASS';
              const stripe = isPass ? EDITORIAL_STATUS.green.stripe : EDITORIAL_STATUS.red.stripe;

              return (
                <DataRow key={i.id} stripeColor={stripe}>
                  <td
                    style={{
                      padding: '14px 16px',
                      verticalAlign: 'middle',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--color-ink)',
                    }}
                  >
                    <span dir="ltr">{i.inspection_number}</span>
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                      {veh?.plate_number ? (
                        <PlateChip plate={veh.plate_number} accentColor={stripe} />
                      ) : null}
                      <span dir="ltr" style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {veh?.vehicle_id || 'â€”'}
                      </span>
                    </div>
                  </td>

                  <td
                    style={{
                      padding: '14px 16px',
                      verticalAlign: 'middle',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--color-ink)',
                    }}
                  >
                    <span dir="ltr">{(i.odometer_reading || 0).toLocaleString()}</span> {t('KM')}
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    <Badge variant={isPass ? 'success' : 'danger'}>
                      {t(i.overall_status)}
                    </Badge>
                  </td>

                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    {i.has_critical_failure ? (
                      <StatusText label={t('CRITICAL FAIL')} color={EDITORIAL_STATUS.red.text} />
                    ) : (
                      <StatusText label={t('Pass')} color={EDITORIAL_STATUS.green.text} />
                    )}
                  </td>

                  <td
                    style={{
                      padding: '14px 16px',
                      verticalAlign: 'middle',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12.5,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {linkedWO ? <span dir="ltr">{linkedWO.work_order_number}</span> : t('None')}
                  </td>

                  <td
                    style={{
                      padding: '14px 16px',
                      verticalAlign: 'middle',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12.5,
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <span dir="ltr">{new Date(i.inspection_date).toLocaleDateString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US')}</span>
                  </td>
                </DataRow>
              );
            })}
          </DataTable>

          <TableFooter
            summaryText={`${t('Showing')} ${filteredChecklists.length} ${t('of')} ${inspections.length}`}
            page={checklistsPage}
            totalPages={checklistsTotalPages}
            pageSize={checklistsPageSize}
            totalRecords={filteredChecklists.length}
            onPageChange={setChecklistsPage}
            onPageSizeChange={setChecklistsPageSize}
            onPrev={() => setChecklistsPage(p => Math.max(1, p - 1))}
            onNext={() => setChecklistsPage(p => Math.min(checklistsTotalPages, p + 1))}
          />
        </div>
      )}

      {/* FORM MODAL FOR PRE-TRIP INSPECTION */}
      {isInspectionFormOpen && (
        <Modal
          isOpen={isInspectionFormOpen}
          onClose={() => setIsInspectionFormOpen(false)}
          title={t('Digital Vehicle Pre-Trip Inspection')}
          maxWidth="2xl"
        >
          <InspectionFormMobile onComplete={() => setIsInspectionFormOpen(false)} />
        </Modal>
      )}

      {/* STAFF REVIEW & STATUS MANAGEMENT MODAL */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          isHidden={lightboxData.isOpen}
          onClose={() => setSelectedReport(null)}
          title={`${t('Driver Issue Report')}: ${selectedReport.report_number}`}
          subtitle={`${t('Category')}: ${t(selectedReport.category)} | ${t('Reported by')} ${selectedReport.driver_name}`}
          maxWidth="2xl"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 12.5 }}>
            {/* Record Header Summary Bar */}
            <div
              style={{
                padding: 14,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: 14 }}>
                  <span dir="ltr">{selectedReport.report_number}</span> â€” {t(selectedReport.category)} {t('Issue')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {t('Driver')}: <strong style={{ color: 'var(--color-ink)' }}>{selectedReport.driver_name}</strong> â€¢ {t('Vehicle')}:{' '}
                  <strong dir="ltr" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>
                    {selectedReport.plate_number || selectedReport.vehicle_id} ({selectedReport.vehicle_id})
                  </strong>{' '}
                  â€¢ <span dir="ltr">{new Date(selectedReport.created_at).toLocaleString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {getSeverityBadge(selectedReport.severity)}
                <StatusText
                  label={getStatusMeta(selectedReport.status).label}
                  color={getStatusMeta(selectedReport.status).tone.text}
                />
              </div>
            </div>

            {/* Quick Workshop Escalation Actions */}
            {canManage && (
              <div
                style={{
                  padding: 12,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                  {t('Workshop Escalation:')}
                </span>
                <PrimaryButton onClick={() => handleCreateWorkOrder(selectedReport)}>
                  {t('Create Work Order')}
                </PrimaryButton>
                <SecondaryButton onClick={() => handleSchedulePM(selectedReport)}>
                  {t('Schedule PM Service')}
                </SecondaryButton>
                <SecondaryButton onClick={() => handleUpdateVehicleStatus(selectedReport, 'REQUIRES INSPECTION')}>
                  {t('Flag Vehicle: Requires Inspection')}
                </SecondaryButton>
                <SecondaryButton
                  onClick={() => handleUpdateVehicleStatus(selectedReport, 'OUT_OF_SERVICE')}
                  style={{ color: '#991B1B', borderColor: '#FECACA' }}
                >
                  {t('Set Out of Service')}
                </SecondaryButton>
              </div>
            )}

            {/* Internal Record Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: 18, overflowX: 'auto', overflowY: 'hidden' }} className="no-scrollbar">
              {(['DETAILS', 'VEHICLE', 'PHOTOS', 'MAINTENANCE', 'HISTORY'] as const).map(tabKey => {
                const isActive = detailTab === tabKey;
                return (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setDetailTab(tabKey)}
                    style={{
                      padding: '8px 2px',
                      fontSize: 12.5,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--color-ink)' : 'var(--color-text-muted)',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: isActive ? '2px solid var(--color-ink)' : '2px solid transparent',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tabKey === 'PHOTOS' && selectedReport.photo_url ? `${t('PHOTOS')} (1)` : t(tabKey)}
                  </button>
                );
              })}
            </div>

            {/* TAB 1: DETAILS, STATUS, INTERNAL NOTES & TEAM ASSIGNMENT */}
            {detailTab === 'DETAILS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div
                  style={{
                    padding: 14,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                    {t('Driver Issue Description')}
                  </span>
                  <p style={{ margin: 0, color: 'var(--color-ink)', fontWeight: 500, lineHeight: 1.6, fontSize: 13 }}>
                    {selectedReport.description}
                  </p>
                </div>

                {selectedReport.photo_url && (
                  <div
                    style={{
                      padding: 14,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Camera style={{ width: 14, height: 14, color: 'var(--color-text-muted)' }} />
                        {t('Attached Issue Photo')}
                      </span>
                      <SecondaryButton
                        onClick={() => openLightbox(
                          selectedReport.photo_url!,
                          `${t('Issue Photo')}: ${selectedReport.report_number}`,
                          `${t('Driver')}: ${selectedReport.driver_name} â€¢ ${t('Plate')}: ${selectedReport.plate_number}`,
                          selectedReport.report_number,
                          selectedReport.created_at
                        )}
                      >
                        <Maximize2 style={{ width: 13, height: 13 }} />
                        <span>{t('Click to Open Full Size & Zoom')}</span>
                      </SecondaryButton>
                    </div>

                    <div
                      onClick={() => openLightbox(
                        selectedReport.photo_url!,
                        `${t('Issue Photo')}: ${selectedReport.report_number}`,
                        `${t('Driver')}: ${selectedReport.driver_name} â€¢ ${t('Plate')}: ${selectedReport.plate_number}`,
                        selectedReport.report_number,
                        selectedReport.created_at
                      )}
                      style={{
                        position: 'relative',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        borderRadius: 4,
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-page-bg)',
                        maxWidth: 420,
                      }}
                      title={t('Click to open full-screen viewer with zoom')}
                    >
                      <img
                        src={selectedReport.photo_url}
                        alt={t('Driver uploaded issue')}
                        style={{ maxHeight: 240, width: 'auto', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                      />
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 12,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                    padding: 14,
                  }}
                >
                  <div>
                    <label style={{ fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6, fontSize: 12 }}>
                      {t('Update Report Status')}
                    </label>
                    <EditorialSelect
                      width="100%"
                      value={modalStatus}
                      onChange={e => setModalStatus(e.target.value as DefectReportStatus)}
                    >
                      {REPORT_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.label)}
                        </option>
                      ))}
                    </EditorialSelect>
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 12 }}>
                      <Users style={{ width: 14, height: 14, color: 'var(--color-brand-accent)' }} />
                      {t('Assign Maintenance Team / Technician')}
                    </label>
                    <EditorialSelect
                      width="100%"
                      value={assignedTeam}
                      onChange={e => setAssignedTeam(e.target.value)}
                    >
                      <option value="">{t('-- Unassigned --')}</option>
                      {maintenanceTeamOptions.map(team => (
                        <option key={team} value={team}>
                          {t(team)}
                        </option>
                      ))}
                    </EditorialSelect>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6, fontSize: 12 }}>
                      {t('Internal Staff & Maintenance Notes')}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={t('Add internal review notes, diagnosis remarks, or dispatch instructions...')}
                      value={internalNotes}
                      onChange={e => setInternalNotes(e.target.value)}
                      className="nf-field"
                      style={{ height: 'auto', padding: '10px 12px', lineHeight: 1.5 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LINKED VEHICLE RECORD */}
            {detailTab === 'VEHICLE' && (
              <div
                style={{
                  padding: 16,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {(() => {
                  const veh = vehicles.find(
                    v =>
                      v.vehicle_id === selectedReport.vehicle_id ||
                      v.plate_number === selectedReport.plate_number
                  );
                  const trl = veh?.assigned_trailer_id
                    ? trailers.find(tr => tr.id === veh.assigned_trailer_id)
                    : undefined;

                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-row-divider)', paddingBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--color-ink)', fontSize: 13.5 }}>
                          <Truck style={{ width: 16, height: 16, color: 'var(--color-brand-accent)' }} />
                          <span>
                            {t('Linked Vehicle')}: <span dir="ltr">{veh ? `${veh.plate_number} (${veh.vehicle_id})` : selectedReport.vehicle_id}</span>
                          </span>
                        </div>
                        {veh && <Badge variant="info">{t(veh.status)}</Badge>}
                      </div>
                      {veh ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, fontSize: 12 }}>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>{t('Plate Number')}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)' }} dir="ltr">{veh.plate_number}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>{t('Fleet Unit ID')}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)' }} dir="ltr">{veh.vehicle_id}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>{t('Make & Model')}</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{veh.make} {veh.model}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>{t('Current Odometer')}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-ink)' }}>
                              <span dir="ltr">{((veh && veh.current_mileage) || 0).toLocaleString()}</span> {t('KM')}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>{t('Coupled Trailer')}</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-brand-accent)' }}>
                              {trl ? <span dir="ltr">{`${trl.trailer_id} (${trl.plate_number})`}</span> : t('Uncoupled')}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>{t('Station Location')}</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{veh.station_location}</span>
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                          {t('Reported Plate Number')}: <strong style={{ fontFamily: 'var(--font-mono)' }} dir="ltr">{selectedReport.plate_number || selectedReport.vehicle_id}</strong>
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* TAB 3: PHOTOS */}
            {detailTab === 'PHOTOS' && (
              <div
                style={{
                  padding: 20,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  textAlign: 'center',
                }}
              >
                {selectedReport.photo_url ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div
                      onClick={() => openLightbox(
                        selectedReport.photo_url!,
                        `${t('Issue Photo')}: ${selectedReport.report_number}`,
                        `${t('Driver')}: ${selectedReport.driver_name} â€¢ ${t('Plate')}: ${selectedReport.plate_number}`,
                        selectedReport.report_number,
                        selectedReport.created_at
                      )}
                      style={{
                        cursor: 'pointer',
                        display: 'inline-block',
                        overflow: 'hidden',
                        borderRadius: 4,
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-page-bg)',
                      }}
                      title={t('Click to open full-screen viewer with zoom')}
                    >
                      <img
                        src={selectedReport.photo_url}
                        alt={t('Reported vehicle issue')}
                        style={{ maxHeight: 320, margin: '0 auto', objectFit: 'contain', display: 'block' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                        {t('Photo attached by')} {selectedReport.driver_name} {t('on')} <span dir="ltr">{new Date(selectedReport.created_at).toLocaleString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US')}</span>
                      </p>
                      <SecondaryButton
                        onClick={() => openLightbox(
                          selectedReport.photo_url!,
                          `${t('Issue Photo')}: ${selectedReport.report_number}`,
                          `${t('Driver')}: ${selectedReport.driver_name} â€¢ ${t('Plate')}: ${selectedReport.plate_number}`,
                          selectedReport.report_number,
                          selectedReport.created_at
                        )}
                      >
                        <ZoomIn style={{ width: 14, height: 14 }} />
                        <span>{t('Open Full Screen')}</span>
                      </SecondaryButton>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px 0', color: 'var(--color-text-muted)' }}>
                    <Camera style={{ width: 28, height: 28, margin: '0 auto 8px', opacity: 0.6 }} />
                    <p style={{ fontWeight: 600, fontSize: 13, margin: 0, color: 'var(--color-text-secondary)' }}>{t('No photo attached')}</p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>{t('The driver did not upload a photo with this report.')}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: MAINTENANCE */}
            {detailTab === 'MAINTENANCE' && (
              <div
                style={{
                  padding: 16,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--color-ink)', display: 'block', borderBottom: '1px solid var(--color-row-divider)', paddingBottom: 8 }}>
                  {t('Workshop & Maintenance Assignment')}
                </span>
                <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                  {t('Assigned Maintenance Team')}:{' '}
                  <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                    {selectedReport.assigned_maintenance_team
                      ? t(selectedReport.assigned_maintenance_team)
                      : assignedTeam
                      ? t(assignedTeam)
                      : t('Not yet assigned')}
                  </span>
                </p>
                <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                  {t('Linked Work Order')}:{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-brand-accent)' }} dir="ltr">
                    {selectedReport.work_order_id || t('None Created')}
                  </span>
                </p>
              </div>
            )}

            {/* TAB 5: HISTORY */}
            {detailTab === 'HISTORY' && (
              <div
                style={{
                  padding: 16,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--color-ink)', borderBottom: '1px solid var(--color-row-divider)', paddingBottom: 8 }}>
                  <History style={{ width: 15, height: 15, color: 'var(--color-brand-accent)' }} /> {t('Audit Log History')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  <p style={{ margin: 0 }}>
                    <span dir="ltr">[{new Date(selectedReport.created_at).toLocaleString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US')}]</span> {t('Issue report submitted by')}{' '}
                    {selectedReport.driver_name}
                  </p>
                  {selectedReport.action_taken && <p style={{ margin: 0 }}>[{t('Staff Action')}] {selectedReport.action_taken}</p>}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <SecondaryButton onClick={() => setSelectedReport(null)}>
                {canManage ? t('Cancel') : t('Close')}
              </SecondaryButton>
              {canManage && (
                <PrimaryButton onClick={handleSaveReportReview}>
                  {t('Save Review & Status')}
                </PrimaryButton>
              )}
            </div>
          </div>
        </Modal>
      )}

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

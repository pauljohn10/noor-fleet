import React, { useState } from 'react';
import {
  ShieldCheck, Plus, Search, AlertTriangle, CheckCircle2,
  FileSpreadsheet, FileText, Wrench, User, Truck, History, Camera,
  Link2, Copy, Share2, ExternalLink, Check, Users, Maximize2, ZoomIn
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ImageLightboxModal } from '../common/ImageLightboxModal';
import { InspectionFormMobile } from './InspectionFormMobile';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';
import { DefectReport, SeverityLevel, VehicleStatus, DefectReportStatus } from '../../types';

const REPORT_STATUS_OPTIONS: {
  value: DefectReportStatus;
  label: string;
  badgeClass: string;
}[] = [
  {
    value: 'NEW',
    label: 'New',
    badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300',
  },
  {
    value: 'UNDER_REVIEW',
    label: 'Under Review',
    badgeClass: 'bg-sky-100 text-sky-900 border border-sky-300',
  },
  {
    value: 'IN_PROGRESS',
    label: 'In Progress',
    badgeClass: 'bg-indigo-100 text-indigo-900 border border-indigo-300',
  },
  {
    value: 'RESOLVED',
    label: 'Resolved',
    badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
  },
  {
    value: 'REJECTED',
    label: 'Rejected',
    badgeClass: 'bg-rose-100 text-rose-900 border border-rose-300',
  },
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
  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

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
      title: title || 'Attached Incident Photo',
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
      `Noor Fleet — Report a Vehicle Issue (No Login Required):\n${publicReportUrl}`
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
    await updateDefectReport(
      rep.id,
      {
        status: newStatus,
        action_taken: `Status updated to ${newStatus.replace(/_/g, ' ')} by ${currentProfile.full_name}.`,
      },
      currentProfile.full_name
    );
    setFeedbackMessage(`Report ${rep.report_number} status updated to ${newStatus.replace(/_/g, ' ')}.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleSaveReportReview = async () => {
    if (!selectedReport) return;

    await updateDefectReport(
      selectedReport.id,
      {
        status: modalStatus,
        internal_notes: internalNotes.trim(),
        fleet_manager_notes: internalNotes.trim(),
        assigned_maintenance_team: assignedTeam || undefined,
        action_taken: `Reviewed by ${currentProfile.full_name} — Status: ${modalStatus}${
          assignedTeam ? `, Assigned Team: ${assignedTeam}` : ''
        }`,
      },
      currentProfile.full_name
    );

    setFeedbackMessage(
      `Saved review for ${selectedReport.report_number} (Status: ${modalStatus.replace(/_/g, ' ')}).`
    );
    setTimeout(() => setFeedbackMessage(null), 4000);
    setSelectedReport(null);
  };

  const handleCreateWorkOrder = async (rep: DefectReport) => {
    const veh = vehicles.find(
      v => v.vehicle_id === rep.vehicle_id || v.plate_number === rep.plate_number
    );
    const woId = addWorkOrder({
      vehicle_id: veh?.id || rep.vehicle_id,
      trailer_id: rep.trailer_id,
      driver_id: rep.driver_id,
      problem_description: `[DRIVER ISSUE REPORT ${rep.report_number}]: ${rep.category} - ${rep.description}`,
      priority: rep.severity === 'CRITICAL' ? 'CRITICAL' : rep.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
      reported_by: rep.driver_name,
      status: 'REPORTED',
    });

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

    setFeedbackMessage(`Work Order ${woId} created for vehicle ${rep.vehicle_id} and status set to IN PROGRESS.`);
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

    setFeedbackMessage(`Maintenance scheduled for vehicle ${rep.vehicle_id}.`);
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
      setFeedbackMessage(`Vehicle ${veh.vehicle_id} (${veh.plate_number}) status updated to ${newStatus}.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
    refreshData();
  };

  const handleExportExcel = () => {
    if (activeMainTab === 'DEFECT_REPORTS') {
      const data = filteredReports.map(r => {
        const veh = vehicles.find(v => v.vehicle_id === r.vehicle_id || v.plate_number === r.plate_number);
        return {
          'Report #': r.report_number,
          'Driver Name': r.driver_name,
          'Plate Number': r.plate_number || veh?.plate_number || 'N/A',
          'Vehicle ID': r.vehicle_id,
          'Category': r.category,
          'Severity': r.severity,
          'Description': r.description,
          'Assigned Team': r.assigned_maintenance_team || 'Unassigned',
          'Status': normalizeStatus(r.status),
          'Internal Notes': r.internal_notes || r.fleet_manager_notes || '',
          'Date': new Date(r.created_at).toLocaleString(),
        };
      });
      exportToExcel(data, 'Driver_Issue_Reports');
    } else {
      const data = filteredChecklists.map(i => ({
        'Inspection #': i.inspection_number,
        'Vehicle ID': vehicles.find(v => v.id === i.vehicle_id)?.vehicle_id || 'N/A',
        'Odometer': i.odometer_reading,
        'Result': i.overall_status,
        'Critical Failure': i.has_critical_failure ? 'YES' : 'NO',
        'Date': new Date(i.inspection_date).toLocaleString(),
      }));
      exportToExcel(data, 'Vehicle_Inspections');
    }
  };

  const handleExportPDF = () => {
    if (activeMainTab === 'DEFECT_REPORTS') {
      const headers = ['Report #', 'Driver Name', 'Plate Number', 'Category', 'Severity', 'Issue Description', 'Status', 'Date Reported'];
      const rows = filteredReports.map(r => {
        const veh = vehicles.find(v => v.vehicle_id === r.vehicle_id || v.plate_number === r.plate_number);
        return [
          r.report_number,
          r.driver_name,
          r.plate_number || veh?.plate_number || r.vehicle_id || 'N/A',
          r.category,
          r.severity || 'MEDIUM',
          r.description,
          normalizeStatus(r.status),
          new Date(r.created_at).toLocaleDateString(),
        ];
      });

      const critCount = defectReports.filter(r => r.severity === 'CRITICAL').length;
      const newCount = defectReports.filter(r => normalizeStatus(r.status) === 'REPORTED').length;
      const resCount = defectReports.filter(r => normalizeStatus(r.status) === 'RESOLVED').length;

      exportToPDFReport(
        'Driver Issue & Defect Reports Register',
        headers,
        rows,
        'Driver_Issue_Reports',
        {
          orientation: 'landscape',
          subtitle: 'Commercial driver issue logs submitted via Public Driver Portal & Workshop Dispatch',
          summaryKPIs: [
            { label: 'Total Reports', value: defectReports.length, color: 'slate' },
            { label: 'Critical Severity', value: critCount, color: 'rose' },
            { label: 'Pending / In Review', value: newCount, color: 'amber' },
            { label: 'Resolved', value: resCount, color: 'emerald' }
          ],
          metadata: [
            { label: 'Status Filter', value: statusFilter },
            { label: 'Category Filter', value: categoryFilter },
            { label: 'Export Scope', value: `${filteredReports.length} records` }
          ]
        }
      );
    } else {
      const headers = ['Inspection #', 'Vehicle ID', 'Plate Number', 'Inspector ID', 'Odometer', 'Overall Status', 'Critical Safety Fail', 'Inspection Date'];
      const rows = filteredChecklists.map(i => {
        const veh = vehicles.find(v => v.id === i.vehicle_id);
        return [
          i.inspection_number,
          veh ? veh.vehicle_id : 'N/A',
          veh ? veh.plate_number : 'N/A',
          i.inspector_id || 'Authorized Safety Inspector',
          `${i.odometer_reading.toLocaleString()} KM`,
          i.overall_status,
          i.has_critical_failure ? 'CRITICAL FAIL' : 'PASS',
          new Date(i.inspection_date).toLocaleDateString(),
        ];
      });

      const passCount = inspections.filter(i => i.overall_status === 'PASS').length;
      const failCount = inspections.filter(i => i.overall_status === 'FAIL' || i.has_critical_failure).length;

      exportToPDFReport(
        'Vehicle Pre-Trip & Safety Inspection Log',
        headers,
        rows,
        'Vehicle_Inspections_Report',
        {
          orientation: 'landscape',
          subtitle: 'Mandatory Saudi DOT (Muroor) & Aramco Terminal Pre-Trip Vehicle Safety Verifications',
          summaryKPIs: [
            { label: 'Total Inspections', value: inspections.length, color: 'slate' },
            { label: 'Safety Passed', value: passCount, color: 'emerald' },
            { label: 'Safety Failed', value: failCount, color: 'rose' }
          ],
          metadata: [
            { label: 'Result Filter', value: statusFilter },
            { label: 'Total Exported', value: `${filteredChecklists.length} inspection logs` }
          ]
        }
      );
    }
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">MEDIUM</span>;
      case 'LOW':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">LOW</span>;
    }
  };

  const getStatusBadge = (status: DefectReportStatus) => {
    const norm = normalizeStatus(status);
    const meta = REPORT_STATUS_OPTIONS.find(s => s.value === norm);
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${meta?.badgeClass || 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
        {meta?.label || norm.replace(/_/g, ' ')}
      </span>
    );
  };

  const maintenanceTeamOptions = [
    'Engine & Powertrain Workshop Team',
    'Brakes, Pneumatics & Chassis Team',
    'Electrical & Telematics Team',
    'Tires & Wheel Alignment Bay',
    'Tanker Valves & Hydrostatic Team',
    ...technicians.map(t => `${t.full_name} (${t.specialization})`),
  ];

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Shareable Public Driver Reporting Link Banner */}
      <div className="bg-gradient-to-r from-[#081a44] via-[#0d2870] to-[#0a215e] text-white rounded-xl p-4 shadow-sm border border-sky-400/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
              Public Shareable Link
            </span>
            <h2 className="text-sm sm:text-base font-black tracking-tight text-white">
              Driver Vehicle Issue Reporting Portal (No Login Required)
            </h2>
          </div>
          <p className="text-xs text-sky-200/90">
            Share this link with drivers via WhatsApp or SMS. Drivers can submit vehicle issues and photos directly from their phones without an account.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-950/60 border border-white/15 rounded-lg px-3 py-1.5 font-mono text-xs text-amber-300">
            <Link2 className="w-3.5 h-3.5 mr-2 text-sky-300 shrink-0" />
            <span className="truncate max-w-[240px] sm:max-w-[300px]">{publicReportUrl}</span>
          </div>

          <button
            type="button"
            onClick={handleCopyPublicLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-2xs"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share via WhatsApp</span>
          </button>

          <a
            href="/driver-report"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Portal</span>
          </a>
        </div>
      </div>

      {/* Feedback Notification Banner */}
      {feedbackMessage && (
        <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-[11px] underline opacity-75 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tab Bar */}
      <div className="flex border-b border-slate-200 gap-4 bg-white px-4 pt-2.5 rounded-t-xl">
        <button
          onClick={() => setActiveMainTab('DEFECT_REPORTS')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
            activeMainTab === 'DEFECT_REPORTS'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Driver Issue Reports ({defectReports.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('CHECKLISTS')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
            activeMainTab === 'CHECKLISTS'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Pre-Trip Checklist Logs ({inspections.length})</span>
        </button>
      </div>

      {/* TAB 1: DRIVER ISSUE REPORTS */}
      {activeMainTab === 'DEFECT_REPORTS' && (
        <div className="space-y-3">
          {/* Action Toolbar & Filters */}
          <div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {canManage && (
                  <button
                    onClick={() => setIsInspectionFormOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log Pre-Trip Inspection
                  </button>
                )}
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-200 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-200 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" /> PDF
                </button>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search report #, driver name, plate #, issue..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Filter controls row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-[11px]">
              <div>
                <label className="text-slate-500 font-bold block mb-1">Report Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="NEW">New</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500 font-bold block mb-1">Issue Category</label>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Tire">Tire</option>
                  <option value="Accident">Accident</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500 font-bold block mb-1">Vehicle Plate / Unit</label>
                <select
                  value={vehicleFilter}
                  onChange={e => setVehicleFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold"
                >
                  <option value="ALL">All Registered Vehicles</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.vehicle_id}>
                      {v.plate_number} — {v.vehicle_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 font-bold block mb-1">Severity Level</label>
                <select
                  value={severityFilter}
                  onChange={e => setSeverityFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>
          </div>

          {/* ERP Data Table */}
          <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="p-3">Report #</th>
                    <th className="p-3">Driver Name</th>
                    <th className="p-3">Vehicle Plate & Unit</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Issue Description</th>
                    <th className="p-3">Assigned Team</th>
                    <th className="p-3">Submitted</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Review & Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No driver issue reports found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map(rep => {
                      const veh = vehicles.find(
                        v => v.vehicle_id === rep.vehicle_id || v.plate_number === rep.plate_number
                      );
                      const displayPlate = rep.plate_number || veh?.plate_number || rep.vehicle_id;

                      return (
                        <tr
                          key={rep.id}
                          onClick={() => openReportDetail(rep)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        >
                          <td className="p-3 font-mono font-bold text-amber-700 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{rep.report_number}</span>
                              {rep.photo_url && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openLightbox(
                                      rep.photo_url!,
                                      `Issue Photo: ${rep.report_number}`,
                                      `Driver: ${rep.driver_name} • Plate: ${displayPlate}`,
                                      rep.report_number,
                                      rep.created_at
                                    );
                                  }}
                                  title="Click to view attached photo full size"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold transition cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5 text-amber-600" />
                                  <span className="hidden sm:inline">Photo</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-bold text-slate-900">{rep.driver_name}</td>
                          <td className="p-3">
                            <span className="font-mono font-black text-slate-900 block">
                              {displayPlate}
                            </span>
                            {veh && (
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {veh.vehicle_id} • {veh.make}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">{rep.category}</span>
                              {getSeverityBadge(rep.severity)}
                            </div>
                          </td>
                          <td className="p-3 text-slate-700 max-w-xs truncate" title={rep.description}>
                            {rep.description}
                          </td>
                          <td className="p-3">
                            {rep.assigned_maintenance_team ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[11px] border border-slate-200">
                                {rep.assigned_maintenance_team}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {new Date(rep.created_at).toLocaleString([], {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-3 whitespace-nowrap">{getStatusBadge(rep.status)}</td>
                          <td className="p-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1.5">
                              <select
                                aria-label={`Status for ${rep.report_number}`}
                                value={normalizeStatus(rep.status)}
                                onChange={e =>
                                  handleQuickStatusUpdate(rep, e.target.value as DefectReportStatus)
                                }
                                className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-white px-2 py-1 text-[11px] font-bold text-slate-800 focus:border-amber-500 focus:outline-none cursor-pointer"
                              >
                                {REPORT_STATUS_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => openReportDetail(rep)}
                                className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold text-[11px] rounded-lg hover:bg-amber-400 transition cursor-pointer"
                              >
                                Review
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 font-mono flex justify-between items-center">
              <span>
                Showing {filteredReports.length} of {defectReports.length} driver issue reports
              </span>
              <span>Public Portal Endpoint: Active (/driver-report)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRE-TRIP CHECKLIST LOGS */}
      {activeMainTab === 'CHECKLISTS' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                  <tr>
                    <th className="p-3">Inspection #</th>
                    <th className="p-3">Tractor Truck</th>
                    <th className="p-3">Odometer</th>
                    <th className="p-3">Result</th>
                    <th className="p-3">Critical Defect</th>
                    <th className="p-3">Linked WO</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredChecklists.map(i => {
                    const veh = vehicles.find(v => v.id === i.vehicle_id);
                    const linkedWO = workOrders.find(w => w.id === i.created_work_order_id);
                    return (
                      <tr key={i.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-sky-700">{i.inspection_number}</td>
                        <td className="p-3 font-bold text-slate-900">
                          {veh?.vehicle_id} ({veh?.plate_number})
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {i.odometer_reading.toLocaleString()} KM
                        </td>
                        <td className="p-3">
                          <Badge variant={i.overall_status === 'PASS' ? 'success' : 'danger'}>
                            {i.overall_status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {i.has_critical_failure ? (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200">
                              CRITICAL FAIL
                            </span>
                          ) : (
                            <span className="text-slate-400">Pass</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {linkedWO ? linkedWO.work_order_number : 'None'}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {new Date(i.inspection_date).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL FOR PRE-TRIP INSPECTION */}
      {isInspectionFormOpen && (
        <Modal
          isOpen={isInspectionFormOpen}
          onClose={() => setIsInspectionFormOpen(false)}
          title="Digital Vehicle Pre-Trip Inspection"
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
          title={`Driver Issue Report: ${selectedReport.report_number}`}
          subtitle={`Category: ${selectedReport.category} | Reported by ${selectedReport.driver_name}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Record Header Summary Bar */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-black text-slate-900 text-sm block">
                  {selectedReport.report_number} — {selectedReport.category} Issue
                </span>
                <span className="text-[11px] text-slate-500">
                  Driver: <strong>{selectedReport.driver_name}</strong> • Vehicle:{' '}
                  <strong>
                    {selectedReport.plate_number || selectedReport.vehicle_id} ({selectedReport.vehicle_id})
                  </strong>{' '}
                  • {new Date(selectedReport.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getSeverityBadge(selectedReport.severity)}
                {getStatusBadge(selectedReport.status)}
              </div>
            </div>

            {/* Quick Workshop Escalation Actions */}
            {canManage && (
              <div className="p-3 bg-slate-100/80 border border-slate-200/90 rounded-xl flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-extrabold text-slate-600 mr-1 uppercase text-[10px]">
                  Workshop Escalation:
                </span>
                <button
                  type="button"
                  onClick={() => handleCreateWorkOrder(selectedReport)}
                  className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition cursor-pointer"
                >
                  Create Work Order
                </button>
                <button
                  type="button"
                  onClick={() => handleSchedulePM(selectedReport)}
                  className="px-3 py-1.5 bg-white text-slate-800 font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  Schedule PM Service
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateVehicleStatus(selectedReport, 'REQUIRES INSPECTION')}
                  className="px-3 py-1.5 bg-orange-100 text-orange-900 font-semibold border border-orange-200 rounded-lg hover:bg-orange-200 transition cursor-pointer"
                >
                  Flag Vehicle: Requires Inspection
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateVehicleStatus(selectedReport, 'OUT_OF_SERVICE')}
                  className="px-3 py-1.5 bg-rose-100 text-rose-900 font-semibold border border-rose-200 rounded-lg hover:bg-rose-200 transition cursor-pointer"
                >
                  Set Out of Service
                </button>
              </div>
            )}

            {/* Internal Record Tabs */}
            <div className="flex border-b border-slate-200 gap-4 text-[11px]">
              {(['DETAILS', 'VEHICLE', 'PHOTOS', 'MAINTENANCE', 'HISTORY'] as const).map(tabKey => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setDetailTab(tabKey)}
                  className={`pb-2 font-bold uppercase transition border-b-2 cursor-pointer ${
                    detailTab === tabKey
                      ? 'border-amber-500 text-amber-800'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tabKey === 'PHOTOS' && selectedReport.photo_url ? 'PHOTOS (1)' : tabKey}
                </button>
              ))}
            </div>

            {/* TAB 1: DETAILS, STATUS, INTERNAL NOTES & TEAM ASSIGNMENT */}
            {detailTab === 'DETAILS' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Driver Issue Description
                  </span>
                  <p className="text-slate-900 font-semibold leading-relaxed text-xs">
                    {selectedReport.description}
                  </p>
                </div>

                {selectedReport.photo_url && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-slate-400" />
                        Attached Issue Photo
                      </span>
                      <button
                        type="button"
                        onClick={() => openLightbox(
                          selectedReport.photo_url!,
                          `Issue Photo: ${selectedReport.report_number}`,
                          `Driver: ${selectedReport.driver_name} • Plate: ${selectedReport.plate_number}`,
                          selectedReport.report_number,
                          selectedReport.created_at
                        )}
                        className="text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Click to Open Full Size & Zoom</span>
                      </button>
                    </div>

                    <div
                      onClick={() => openLightbox(
                        selectedReport.photo_url!,
                        `Issue Photo: ${selectedReport.report_number}`,
                        `Driver: ${selectedReport.driver_name} • Plate: ${selectedReport.plate_number}`,
                        selectedReport.report_number,
                        selectedReport.created_at
                      )}
                      className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200/90 bg-white hover:border-amber-400 transition shadow-xs max-w-md"
                      title="Click to open full-screen viewer with zoom"
                    >
                      <img
                        src={selectedReport.photo_url}
                        alt="Driver uploaded issue"
                        className="max-h-60 w-auto rounded-xl object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/30 transition-all flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-xs text-white text-xs font-bold shadow-lg flex items-center gap-1.5">
                          <ZoomIn className="w-4 h-4 text-amber-400" />
                          View Full-Screen Lightbox
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/70 border border-slate-200/90 rounded-xl p-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">
                      Update Report Status
                    </label>
                    <select
                      value={modalStatus}
                      onChange={e => setModalStatus(e.target.value as DefectReportStatus)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                    >
                      {REPORT_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                      Assign Maintenance Team / Technician
                    </label>
                    <select
                      value={assignedTeam}
                      onChange={e => setAssignedTeam(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Unassigned --</option>
                      {maintenanceTeamOptions.map(team => (
                        <option key={team} value={team}>
                          {team}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1.5">
                      Internal Staff & Maintenance Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Add internal review notes, diagnosis remarks, or dispatch instructions..."
                      value={internalNotes}
                      onChange={e => setInternalNotes(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LINKED VEHICLE RECORD */}
            {detailTab === 'VEHICLE' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                {(() => {
                  const veh = vehicles.find(
                    v =>
                      v.vehicle_id === selectedReport.vehicle_id ||
                      v.plate_number === selectedReport.plate_number
                  );
                  const trl = veh?.assigned_trailer_id
                    ? trailers.find(t => t.id === veh.assigned_trailer_id)
                    : undefined;

                  return (
                    <>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2 font-black text-slate-900">
                          <Truck className="w-4 h-4 text-amber-600" />
                          <span>
                            Linked Vehicle: {veh ? `${veh.plate_number} (${veh.vehicle_id})` : selectedReport.vehicle_id}
                          </span>
                        </div>
                        {veh && <Badge variant="info">{veh.status}</Badge>}
                      </div>
                      {veh ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                          <div>
                            <span className="text-slate-400 block">Plate Number</span>
                            <span className="font-mono font-bold text-slate-900">{veh.plate_number}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Fleet Unit ID</span>
                            <span className="font-mono font-bold text-slate-900">{veh.vehicle_id}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Make & Model</span>
                            <span className="font-bold text-slate-900">{veh.make} {veh.model}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Current Odometer</span>
                            <span className="font-mono font-bold text-slate-900">{veh.current_mileage.toLocaleString()} KM</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Coupled Trailer</span>
                            <span className="font-bold text-sky-800">{trl ? `${trl.trailer_id} (${trl.plate_number})` : 'Uncoupled'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Station Location</span>
                            <span className="font-bold text-slate-900">{veh.station_location}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-500">
                          Reported Plate Number: <strong className="font-mono">{selectedReport.plate_number || selectedReport.vehicle_id}</strong>
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* TAB 3: PHOTOS */}
            {detailTab === 'PHOTOS' && (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                {selectedReport.photo_url ? (
                  <div className="space-y-3">
                    <div
                      onClick={() => openLightbox(
                        selectedReport.photo_url!,
                        `Issue Photo: ${selectedReport.report_number}`,
                        `Driver: ${selectedReport.driver_name} • Plate: ${selectedReport.plate_number}`,
                        selectedReport.report_number,
                        selectedReport.created_at
                      )}
                      className="group relative cursor-pointer inline-block overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white hover:border-amber-400 transition"
                      title="Click to open full-screen viewer with zoom"
                    >
                      <img
                        src={selectedReport.photo_url}
                        alt="Reported vehicle issue"
                        className="max-h-80 mx-auto rounded-xl object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/30 transition-all flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 rounded-full bg-slate-900/90 backdrop-blur-xs text-white text-xs font-bold shadow-lg flex items-center gap-2">
                          <ZoomIn className="w-4 h-4 text-amber-400" />
                          Click to View Full-Screen & Zoom
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <p className="text-[11px] text-slate-500 font-medium">
                        Photo attached by {selectedReport.driver_name} on {new Date(selectedReport.created_at).toLocaleString()}
                      </p>
                      <button
                        type="button"
                        onClick={() => openLightbox(
                          selectedReport.photo_url!,
                          `Issue Photo: ${selectedReport.report_number}`,
                          `Driver: ${selectedReport.driver_name} • Plate: ${selectedReport.plate_number}`,
                          selectedReport.report_number,
                          selectedReport.created_at
                        )}
                        className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Open Full Screen</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-slate-500">
                    <Camera className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                    <p className="font-bold text-xs">No photo attached</p>
                    <p className="text-[11px] mt-0.5">The driver did not upload a photo with this report.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: MAINTENANCE */}
            {detailTab === 'MAINTENANCE' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-slate-900 block border-b border-slate-200 pb-1.5">
                  Workshop & Maintenance Assignment
                </span>
                <p className="text-slate-700">
                  Assigned Maintenance Team:{' '}
                  <span className="font-bold text-slate-900">
                    {selectedReport.assigned_maintenance_team || assignedTeam || 'Not yet assigned'}
                  </span>
                </p>
                <p className="text-slate-700">
                  Linked Work Order:{' '}
                  <span className="font-mono font-bold text-amber-700">
                    {selectedReport.work_order_id || 'None Created'}
                  </span>
                </p>
              </div>
            )}

            {/* TAB 5: HISTORY */}
            {detailTab === 'HISTORY' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                  <History className="w-4 h-4 text-sky-600" /> Audit Log History
                </div>
                <div className="space-y-1 text-[11px] text-slate-600 font-mono">
                  <p>
                    [{new Date(selectedReport.created_at).toLocaleString()}] Issue report submitted by{' '}
                    {selectedReport.driver_name}
                  </p>
                  {selectedReport.action_taken && <p>[Staff Action] {selectedReport.action_taken}</p>}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 hover:bg-slate-200 transition cursor-pointer"
              >
                {canManage ? 'Cancel' : 'Close'}
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={handleSaveReportReview}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg shadow-xs transition cursor-pointer"
                >
                  Save Review & Status
                </button>
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
    </div>
  );
};

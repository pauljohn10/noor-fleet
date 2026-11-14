import React, { useState } from 'react';
import { 
  Truck, Plus, CalendarCheck, ShieldCheck, Eye, Wrench, Clock, CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle, XCircle,
  ZoomIn, Maximize2
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';
import { Modal } from '../common/Modal';
import { ImageLightboxModal } from '../common/ImageLightboxModal';
import { VehicleFormModal } from '../vehicles/VehicleFormModal';
import { TrailerFormModal } from '../trailers/TrailerFormModal';
import { DefectReport, SeverityLevel, VehicleStatus, DefectReportStatus, PMStatus } from '../../types';

interface FleetManagerDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const FleetManagerDashboard: React.FC<FleetManagerDashboardProps> = ({ onNavigateTab }) => {
  const { 
    vehicles, trailers, schedules, workOrders, defectReports, drivers,
    addWorkOrder, addMaintenanceSchedule, updateMaintenanceScheduleStatus, updateVehicle, updateDefectReport, refreshData 
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
    setLightboxData(prev => ({ ...prev, isOpen: false }));
  };

  // Status Metrics
  const availableCount = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const onTripCount = vehicles.filter(v => v.status === 'ON_TRIP').length;
  const inWorkshopCount = vehicles.filter(v => v.status === 'IN_WORKSHOP').length;
  const requiresInspectionCount = vehicles.filter(v => v.status === 'REQUIRES INSPECTION').length;
  const outOfServiceCount = vehicles.filter(v => v.status === 'OUT_OF_SERVICE').length;

  // Fleet Manager Action Handlers
  const handleCreateWorkOrder = async (rep: DefectReport) => {
    const veh = vehicles.find(v => v.vehicle_id === rep.vehicle_id || v.id === rep.vehicle_id);
    const wo = await addWorkOrder({
      vehicle_id: veh?.id || rep.vehicle_id,
      trailer_id: rep.trailer_id,
      driver_id: rep.driver_id,
      problem_description: `[DEFECT REPORT ${rep.report_number}]: ${rep.category} - ${rep.description}`,
      priority: rep.severity === 'CRITICAL' ? 'CRITICAL' : rep.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
      reported_by: rep.driver_name,
      status: 'REPORTED'
    });

    await updateDefectReport(rep.id, {
      status: 'WORK_ORDER_CREATED' as DefectReportStatus,
      work_order_id: wo.id,
      action_taken: `Work Order ${wo.work_order_number} created by Fleet Manager.`,
      workshop_response: `Work order created by Fleet Manager.`
    });

    if (veh) {
      await updateVehicle(veh.id, { status: 'IN_WORKSHOP' });
    }

    alert(`Work Order ${wo.work_order_number} created successfully! Vehicle ${rep.vehicle_id} set to IN WORKSHOP.`);
    setSelectedReport(null);
    setActionNotes('');
    await refreshData();
  };

  const handleSchedulePM = async (rep: DefectReport) => {
    const veh = vehicles.find(v => v.vehicle_id === rep.vehicle_id || v.id === rep.vehicle_id);
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
      notes: `Defect Report ${rep.report_number}: ${rep.description}`
    });

    await updateDefectReport(rep.id, {
      status: 'SCHEDULED' as DefectReportStatus,
      action_taken: 'Scheduled maintenance item created.',
      workshop_response: 'Scheduled for workshop repair within 7 days.'
    });

    alert(`Maintenance scheduled for vehicle ${rep.vehicle_id}.`);
    setSelectedReport(null);
    setActionNotes('');
    await refreshData();
  };

  const handleRequestMoreInfo = async (rep: DefectReport) => {
    if (!actionNotes.trim()) {
      alert('Please provide notes specifying what additional information is needed from the driver.');
      return;
    }

    await updateDefectReport(rep.id, {
      status: 'MORE_INFO_REQUESTED' as DefectReportStatus,
      fleet_manager_notes: actionNotes,
      workshop_response: `Fleet Manager request: ${actionNotes}`
    });

    alert(`Information request sent to Driver ${rep.driver_name}.`);
    setSelectedReport(null);
    setActionNotes('');
    await refreshData();
  };

  const handleMarkResolved = async (rep: DefectReport) => {
    const note = actionNotes.trim() || 'Reviewed by Fleet Manager. Issue addressed.';
    await updateDefectReport(rep.id, {
      status: 'RESOLVED' as DefectReportStatus,
      fleet_manager_notes: note,
      workshop_response: note
    });

    alert(`Defect report ${rep.report_number} marked as RESOLVED.`);
    setSelectedReport(null);
    setActionNotes('');
    await refreshData();
  };

  const handleMarkDuplicate = async (rep: DefectReport) => {
    await updateDefectReport(rep.id, {
      status: 'DUPLICATE' as DefectReportStatus,
      workshop_response: 'Closed as duplicate report.'
    });

    alert(`Defect report ${rep.report_number} marked as DUPLICATE.`);
    setSelectedReport(null);
    setActionNotes('');
    await refreshData();
  };

  const handleUpdateVehicleStatus = (rep: DefectReport, newStatus: VehicleStatus) => {
    const veh = vehicles.find(v => v.vehicle_id === rep.vehicle_id);
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
      case 'CRITICAL': return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">{t('CRITICAL', 'CRITICAL')}</span>;
      case 'HIGH': return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">{t('HIGH', 'HIGH')}</span>;
      case 'MEDIUM': return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">{t('MEDIUM', 'MEDIUM')}</span>;
      case 'LOW': return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{t('LOW', 'LOW')}</span>;
    }
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Page Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-4 rounded-xl shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight">{t('fleet_workspace_title', 'FLEET OPERATIONS WORKSPACE')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('fleet_workspace_desc', 'Control center for vehicle status, driver defect reports, and maintenance schedules.')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsVehicleModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-2xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {t('add_vehicle', 'Add Vehicle')}
          </button>
          <button
            onClick={() => setIsTrailerModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 font-bold text-xs rounded-lg border border-slate-200 hover:bg-slate-50 transition shadow-2xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-500" /> {t('add_trailer', 'Add Trailer')}
          </button>
          <button
            onClick={() => onNavigateTab('drivers')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 font-bold text-xs rounded-lg border border-slate-200 hover:bg-slate-50 transition shadow-2xs active:scale-95 cursor-pointer"
          >
            {t('assign_driver', 'Assign Driver')}
          </button>
          <a
            href="/driver-report"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-lg transition shadow-2xs active:scale-95"
          >
            {isRTL ? 'رابط بلاغات السائقين العام ↗' : 'Public Driver Report Link ↗'}
          </a>
        </div>
      </div>

      {/* COMPACT ERP FLEET STATUS SUMMARY BAR */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
          <span>{t('fleet_status_summary', 'FLEET OPERATIONAL STATUS SUMMARY')}</span>
          <span className="text-[10px] font-mono text-slate-400">Live Telemetry</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div 
            onClick={() => onNavigateTab('vehicles')}
            className="p-3 bg-gradient-to-b from-emerald-50/80 to-white border border-emerald-200/80 rounded-xl cursor-pointer hover:border-emerald-300 hover:shadow-xs transition group"
          >
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">{t('AVAILABLE', 'AVAILABLE')}</span>
            <span className="font-mono font-black text-emerald-950 text-2xl mt-1 block group-hover:scale-105 transition-transform">{availableCount}</span>
          </div>

          <div 
            onClick={() => onNavigateTab('vehicles')}
            className="p-3 bg-gradient-to-b from-sky-50/80 to-white border border-sky-200/80 rounded-xl cursor-pointer hover:border-sky-300 hover:shadow-xs transition group"
          >
            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">{t('ON_TRIP', 'ON TRIP')}</span>
            <span className="font-mono font-black text-sky-950 text-2xl mt-1 block group-hover:scale-105 transition-transform">{onTripCount}</span>
          </div>

          <div 
            onClick={() => onNavigateTab('workOrders')}
            className="p-3 bg-gradient-to-b from-amber-50/80 to-white border border-amber-200/80 rounded-xl cursor-pointer hover:border-amber-300 hover:shadow-xs transition group"
          >
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">{t('IN_WORKSHOP', 'IN WORKSHOP')}</span>
            <span className="font-mono font-black text-amber-950 text-2xl mt-1 block group-hover:scale-105 transition-transform">{inWorkshopCount}</span>
          </div>

          <div 
            onClick={() => onNavigateTab('vehicles')}
            className="p-3 bg-gradient-to-b from-orange-50/80 to-white border border-orange-200/80 rounded-xl cursor-pointer hover:border-orange-300 hover:shadow-xs transition group"
          >
            <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block">{t('REQUIRES INSPECTION', 'REQUIRES INSPECT')}</span>
            <span className="font-mono font-black text-orange-950 text-2xl mt-1 block group-hover:scale-105 transition-transform">{requiresInspectionCount}</span>
          </div>

          <div 
            onClick={() => onNavigateTab('vehicles')}
            className="p-3 bg-gradient-to-b from-rose-50/80 to-white border border-rose-200/80 rounded-xl cursor-pointer hover:border-rose-300 hover:shadow-xs transition group"
          >
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">{t('OUT_OF_SERVICE', 'OUT OF SERVICE')}</span>
            <span className="font-mono font-black text-rose-950 text-2xl mt-1 block group-hover:scale-105 transition-transform">{outOfServiceCount}</span>
          </div>
        </div>
      </div>

      {/* DATA TABLE 1: DRIVER REPORTS */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" /> {t('driver_problem_reports_inbox', 'DRIVER PROBLEM REPORTS INBOX')}
          </h3>
          <button
            onClick={() => onNavigateTab('inspections')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 transition"
          >
            {t('view_all_reports', 'View All Reports')} {isRTL ? '←' : '→'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs border-collapse">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="p-3">{t('priority', 'Priority')}</th>
                <th className="p-3">{t('report_num', 'Report #')}</th>
                <th className="p-3">{t('driver', 'Driver')}</th>
                <th className="p-3">{t('vehicles', 'Vehicle')}</th>
                <th className="p-3">{t('problem_summary', 'Problem Summary')}</th>
                <th className="p-3">{t('date', 'Date')}</th>
                <th className="p-3">{t('status', 'Status')}</th>
                <th className="p-3 text-right rtl:text-left">{t('action', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {defectReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">{t('no_defect_reports', 'No driver defect reports found.')}</td>
                </tr>
              ) : (
                defectReports.slice(0, 5).map(rep => (
                  <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">{getSeverityBadge(rep.severity)}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{rep.report_number}</td>
                    <td className="p-3 font-semibold text-slate-800">{rep.driver_name}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {rep.plate_number ? `${rep.plate_number} (${rep.vehicle_id})` : rep.vehicle_id} {rep.trailer_id ? `• ${rep.trailer_id}` : ''}
                    </td>
                    <td className="p-3 font-medium text-slate-700 max-w-xs truncate">{rep.description}</td>
                    <td className="p-3 font-mono text-slate-500 text-[11px]">{new Date(rep.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        rep.status === 'NEW' || rep.status === 'REPORTED' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        rep.status === 'UNDER_REVIEW' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                        rep.status === 'IN_PROGRESS' || rep.status === 'WORK_ORDER_CREATED' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                        rep.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        rep.status === 'REJECTED' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {rep.status === 'REPORTED' ? 'NEW' : t(rep.status, rep.status.replace(/_/g, ' '))}
                      </span>
                    </td>
                    <td className="p-3 text-right rtl:text-left">
                      <button
                        onClick={() => {
                          setSelectedReport(rep);
                          setActionNotes(rep.fleet_manager_notes || '');
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-2xs transition active:scale-95 cursor-pointer"
                      >
                        {t('process', 'Process')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DATA TABLE 2: VEHICLE STATUS MATRIX */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" /> {t('fleet_vehicle_status_matrix', 'FLEET VEHICLE STATUS MATRIX')}
          </h3>
          <button
            onClick={() => onNavigateTab('vehicles')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 transition"
          >
            {t('manage_fleet', 'Manage Fleet')} {isRTL ? '←' : '→'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs border-collapse">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="p-3">{t('vehicles', 'Vehicle')}</th>
                <th className="p-3">{t('plate_number', 'Plate Number')}</th>
                <th className="p-3">{t('coupled_trailer', 'Coupled Trailer')}</th>
                <th className="p-3">{t('assigned_driver', 'Assigned Driver')}</th>
                <th className="p-3">{t('odometer', 'Odometer')}</th>
                <th className="p-3">{t('status', 'Status')}</th>
                <th className="p-3 text-right rtl:text-left">{t('action', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {vehicles.map(v => {
                const driver = drivers.find(d => d.id === v.assigned_driver_id);
                return (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{v.vehicle_id}</td>
                    <td className="p-3 font-mono text-slate-700">{v.plate_number}</td>
                    <td className="p-3 font-semibold text-slate-600">{v.assigned_trailer_id || t('none_coupled', 'Uncoupled')}</td>
                    <td className="p-3 font-semibold text-slate-800">{driver ? driver.full_name : t('unassigned_driver', 'Unassigned')}</td>
                    <td className="p-3 font-mono text-slate-600">{v.current_mileage.toLocaleString()} KM</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        v.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        v.status === 'ON_TRIP' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                        v.status === 'IN_WORKSHOP' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        v.status === 'OUT_OF_SERVICE' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                        'bg-orange-50 text-orange-800 border border-orange-200'
                      }`}>
                        {t(v.status, v.status.replace(/_/g, ' '))}
                      </span>
                    </td>
                    <td className="p-3 text-right rtl:text-left">
                      <button
                        onClick={() => onNavigateTab('vehicles')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer"
                      >
                        {t('details', 'View Record')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DATA TABLE 3: UPCOMING MAINTENANCE */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-purple-600" /> {t('upcoming_pm', 'UPCOMING PREVENTIVE MAINTENANCE')}
          </h3>
          <button
            onClick={() => onNavigateTab('preventive')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 transition"
          >
            {t('view_all', 'View PM Rules')} {isRTL ? '←' : '→'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs border-collapse">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="p-3">{isRTL ? 'عنوان الخدمة المجدولة' : 'Schedule Service Title'}</th>
                <th className="p-3">{isRTL ? 'الشاحنة المستهدفة' : 'Target Unit'}</th>
                <th className="p-3">{isRTL ? 'الفترة' : 'Interval'}</th>
                <th className="p-3">{isRTL ? 'تاريخ الاستحقاق' : 'Due Date Target'}</th>
                <th className="p-3">{t('status', 'Status')}</th>
                <th className="p-3 text-right rtl:text-left">{t('action', 'Change Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {schedules.map(s => {
                const veh = vehicles.find(v => v.id === s.vehicle_id);
                const trl = trailers.find(tr => tr.id === s.trailer_id);
                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{s.title}</td>
                    <td className="p-3 font-semibold text-slate-800">
                      {veh ? veh.vehicle_id : trl ? trl.trailer_id : (isRTL ? 'عام للأسطول' : 'Fleet General')}
                    </td>
                    <td className="p-3 font-mono text-slate-600">{s.interval_value.toLocaleString()} {s.frequency_type === 'MILEAGE' ? (isRTL ? 'كم' : 'KM') : (isRTL ? 'يوم' : 'Days')}</td>
                    <td className="p-3 font-mono text-slate-600">{s.next_due_date || (isRTL ? 'شرط المسافة' : 'KM Trigger')}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        s.status === 'OVERDUE' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                        s.status === 'DUE' ? 'bg-orange-50 text-orange-800 border border-orange-200' :
                        s.status === 'DUE_SOON' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        s.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        'bg-sky-50 text-sky-800 border border-sky-200'
                      }`}>
                        {s.status === 'OVERDUE' ? (isRTL ? 'متأخر' : 'OVERDUE') :
                         s.status === 'DUE' ? (isRTL ? 'يستحق الآن' : 'DUE NOW') :
                         s.status === 'DUE_SOON' ? (isRTL ? 'يستحق قريباً' : 'DUE SOON') :
                         s.status === 'COMPLETED' ? (isRTL ? 'مكتمل' : 'COMPLETED') :
                         (isRTL ? 'مجدول' : 'UPCOMING')}
                      </span>
                    </td>
                    <td className="p-3 text-right rtl:text-left">
                      <select
                        aria-label={`Change status for ${s.title}`}
                        value={s.status}
                        onChange={e => updateMaintenanceScheduleStatus(s.id, e.target.value as PMStatus)}
                        className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-none transition cursor-pointer"
                      >
                        <option value="UPCOMING">UPCOMING</option>
                        <option value="DUE_SOON">DUE SOON</option>
                        <option value="DUE">DUE NOW</option>
                        <option value="OVERDUE">OVERDUE</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROCESS DEFECT REPORT ACTION MODAL */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          isHidden={lightboxData.isOpen}
          onClose={() => setSelectedReport(null)}
          title={`Defect Audit Record: ${selectedReport.report_number}`}
          subtitle={`Driver: ${selectedReport.driver_name} | Unit: ${selectedReport.vehicle_id}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm">{selectedReport.category} Defect</span>
                  <span className="text-[11px] text-slate-500 font-mono">({new Date(selectedReport.created_at).toLocaleDateString()})</span>
                </div>
                {getSeverityBadge(selectedReport.severity)}
              </div>
              <p className="text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                {selectedReport.description}
              </p>
              {selectedReport.photo_url && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Attached Issue Photo:
                    </span>
                    <button
                      type="button"
                      onClick={() => openLightbox(
                        selectedReport.photo_url!,
                        `Issue Photo: ${selectedReport.report_number}`,
                        `Driver: ${selectedReport.driver_name} • Unit: ${selectedReport.vehicle_id}`,
                        selectedReport.report_number,
                        selectedReport.created_at
                      )}
                      className="text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Click to Open Full Size & Zoom</span>
                    </button>
                  </div>
                  <div
                    onClick={() => openLightbox(
                      selectedReport.photo_url!,
                      `Issue Photo: ${selectedReport.report_number}`,
                      `Driver: ${selectedReport.driver_name} • Unit: ${selectedReport.vehicle_id}`,
                      selectedReport.report_number,
                      selectedReport.created_at
                    )}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-amber-400 transition shadow-xs max-w-sm"
                    title="Click to open full-screen viewer with zoom"
                  >
                    <img
                      src={selectedReport.photo_url}
                      alt="Driver reported issue"
                      className="max-h-48 w-auto rounded-lg object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/30 transition-all flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-xs text-white text-xs font-bold shadow-lg flex items-center gap-1.5">
                        <ZoomIn className="w-4 h-4 text-amber-400" />
                        View Full-Screen Lightbox
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Update Vehicle Operational Status:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateVehicleStatus(selectedReport, 'REQUIRES INSPECTION')}
                  className="px-3 py-1.5 bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 font-bold rounded-lg border border-amber-300 transition text-xs cursor-pointer active:scale-95"
                >
                  Set REQUIRES INSPECTION
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateVehicleStatus(selectedReport, 'OUT_OF_SERVICE')}
                  className="px-3 py-1.5 bg-rose-100/80 hover:bg-rose-200/80 text-rose-900 font-bold rounded-lg border border-rose-300 transition text-xs cursor-pointer active:scale-95"
                >
                  Set OUT OF SERVICE
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateVehicleStatus(selectedReport, 'AVAILABLE')}
                  className="px-3 py-1.5 bg-emerald-100/80 hover:bg-emerald-200/80 text-emerald-900 font-bold rounded-lg border border-emerald-300 transition text-xs cursor-pointer active:scale-95"
                >
                  Set AVAILABLE
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Resolution & Supervisor Response Notes
              </label>
              <textarea
                rows={3}
                placeholder="Enter actions taken, workshop instructions, or inspection results..."
                value={actionNotes}
                onChange={e => setActionNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer mr-auto"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleSchedulePM(selectedReport)}
                className="px-4 py-2 bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-200 hover:bg-slate-200 transition text-xs cursor-pointer active:scale-95"
              >
                Schedule PM Repair
              </button>
              <button
                type="button"
                onClick={() => handleCreateWorkOrder(selectedReport)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-xs transition text-xs cursor-pointer active:scale-95"
              >
                Create Work Order
              </button>
              <button
                type="button"
                onClick={() => handleMarkResolved(selectedReport)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-xs transition text-xs cursor-pointer active:scale-95"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </Modal>
      )}

      <VehicleFormModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
      />

      <TrailerFormModal
        isOpen={isTrailerModalOpen}
        onClose={() => setIsTrailerModalOpen(false)}
      />

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

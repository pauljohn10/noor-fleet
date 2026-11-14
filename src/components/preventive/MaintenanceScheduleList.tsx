import React, { useState, useEffect } from 'react';
import {
  CalendarCheck, Plus, Search, Filter, CheckCircle2, AlertCircle,
  Clock, AlertTriangle, Loader2, RefreshCw, Wrench, Truck, FileText, Download
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { MaintenanceSchedule, PMStatus } from '../../types';
import { Modal } from '../common/Modal';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';

const PM_STATUS_OPTIONS: {
  value: PMStatus;
  label: string;
  shortLabel: string;
  description: string;
  badgeVariant: 'info' | 'amber' | 'danger' | 'success' | 'slate';
  cardClasses: string;
}[] = [
  {
    value: 'UPCOMING',
    label: 'Upcoming (Scheduled)',
    shortLabel: 'UPCOMING',
    description: 'Scheduled for future service; within normal operating interval.',
    badgeVariant: 'info',
    cardClasses: 'border-sky-200 bg-sky-50/70 text-sky-900'
  },
  {
    value: 'DUE_SOON',
    label: 'Due Soon',
    shortLabel: 'DUE SOON',
    description: 'Approaching service threshold (mileage or calendar date).',
    badgeVariant: 'amber',
    cardClasses: 'border-amber-200 bg-amber-50/70 text-amber-900'
  },
  {
    value: 'DUE',
    label: 'Due Now',
    shortLabel: 'DUE NOW',
    description: 'Service threshold reached; ready for workshop bay induction.',
    badgeVariant: 'amber',
    cardClasses: 'border-orange-200 bg-orange-50/70 text-orange-900'
  },
  {
    value: 'OVERDUE',
    label: 'Overdue',
    shortLabel: 'OVERDUE',
    description: 'Exceeded target mileage or due date; requires immediate attention.',
    badgeVariant: 'danger',
    cardClasses: 'border-rose-200 bg-rose-50/70 text-rose-900'
  },
  {
    value: 'COMPLETED',
    label: 'Completed',
    shortLabel: 'COMPLETED',
    description: 'Preventive maintenance service completed and verified.',
    badgeVariant: 'success',
    cardClasses: 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
  }
];

export const MaintenanceScheduleList: React.FC = () => {
  const {
    schedules,
    vehicles,
    trailers,
    addMaintenanceSchedule,
    updateMaintenanceScheduleStatus,
    updateMaintenanceSchedule
  } = useFleet();
  const { currentProfile, hasPermission } = useAuth();

  const canManageStatus = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Status update states
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [targetStatus, setTargetStatus] = useState<PMStatus>('UPCOMING');
  const [statusNotes, setStatusNotes] = useState('');
  const [isSavingStatusModal, setIsSavingStatusModal] = useState(false);

  // Feedback banner state
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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
    const trl = trailers.find(t => t.id === s.trailer_id);
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

  // Status KPI counts
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
          message: `Status for "${schedule.title}" updated to ${statusMeta?.shortLabel || newStatus}.`
        });
      } else {
        setFeedback({
          type: 'error',
          message: `Could not locate schedule "${schedule.title}" to update status.`
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to update preventive maintenance status.'
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
      // Only update status and notes so other schedule fields are never accidentally overwritten
      const trimmedNotes = statusNotes.trim();
      const updates: Partial<MaintenanceSchedule> = {
        status: targetStatus,
        notes: trimmedNotes
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
          message: `Preventive maintenance record "${selectedSchedule.title}" updated to ${statusMeta?.shortLabel || targetStatus}.`
        });
        setSelectedSchedule(null);
      } else {
        setFeedback({
          type: 'error',
          message: 'Failed to save status update. Please try again.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'An unexpected error occurred while saving status.'
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
      notes: newScheduleNotes.trim() || 'Scheduled routine preventive maintenance service'
    });

    setFeedback({
      type: 'success',
      message: `Created preventive maintenance schedule "${title.trim()}".`
    });
    setIsCreateModalOpen(false);
    setTitle('');
    setNewScheduleNotes('');
  };

  const getStatusBadge = (status: PMStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">COMPLETED</Badge>;
      case 'UPCOMING':
        return <Badge variant="info">UPCOMING</Badge>;
      case 'DUE_SOON':
        return <Badge variant="amber">DUE SOON</Badge>;
      case 'DUE':
        return <Badge variant="amber">DUE NOW</Badge>;
      case 'OVERDUE':
        return <Badge variant="danger">OVERDUE</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  const handleExportExcel = () => {
    const data = filteredSchedules.map(s => {
      const veh = vehicles.find(v => v.id === s.vehicle_id);
      const trl = trailers.find(t => t.id === s.trailer_id);
      return {
        'Schedule Title': s.title,
        'Assigned Unit': veh ? `${veh.vehicle_id} (${veh.plate_number})` : trl ? `${trl.trailer_id} (${trl.plate_number})` : 'Unassigned',
        'Interval': s.frequency_type === 'MILEAGE' ? `Every ${s.interval_value} KM` : `Every ${s.interval_value} Days`,
        'Last Service Odometer': s.last_service_mileage || 'N/A',
        'Next Due Odometer': s.next_due_mileage || 'N/A',
        'Next Due Date': s.next_due_date,
        'Status': s.status,
        'Notes': s.notes || ''
      };
    });
    exportToExcel(data, 'Preventive_Maintenance_Schedules');
  };

  const handleExportPDF = () => {
    const headers = ['Schedule Title', 'Unit Assigned', 'Interval', 'Last Service Odo', 'Next Due Odo', 'Next Due Date', 'Status'];
    const rows = filteredSchedules.map(s => {
      const veh = vehicles.find(v => v.id === s.vehicle_id);
      const trl = trailers.find(t => t.id === s.trailer_id);
      return [
        s.title,
        veh ? `${veh.vehicle_id} (${veh.plate_number})` : trl ? `${trl.trailer_id} (${trl.plate_number})` : 'Unassigned',
        s.frequency_type === 'MILEAGE' ? `Every ${(s.interval_value || 0).toLocaleString()} KM` : `Every ${s.interval_value || 0} Days`,
        s.last_service_mileage ? `${(s.last_service_mileage || 0).toLocaleString()} KM` : 'N/A',
        s.next_due_mileage ? `${(s.next_due_mileage || 0).toLocaleString()} KM` : 'N/A',
        s.next_due_date || 'N/A',
        s.status.replace(/_/g, ' ')
      ];
    });

    const overdueCount = schedules.filter(s => s.status === 'OVERDUE').length;
    const dueCount = schedules.filter(s => s.status === 'DUE' || s.status === 'DUE_SOON').length;
    const completedCount = schedules.filter(s => s.status === 'COMPLETED').length;

    exportToPDFReport(
      'Preventive Maintenance Service Schedules Ledger',
      headers,
      rows,
      'Preventive_Maintenance_Report',
      {
        orientation: 'landscape',
        subtitle: 'Commercial Tractor & Tanker Scheduled Service Intervals, Target Odometers & Due Dates',
        summaryKPIs: [
          { label: 'Total PM Schedules', value: schedules.length, color: 'slate' },
          { label: 'Overdue Services', value: overdueCount, color: overdueCount > 0 ? 'rose' : 'emerald' },
          { label: 'Due / Due Soon', value: dueCount, color: dueCount > 0 ? 'amber' : 'emerald' },
          { label: 'Completed', value: completedCount, color: 'emerald' }
        ],
        metadata: [
          { label: 'Status Filter', value: statusFilter },
          { label: 'Export Scope', value: `${filteredSchedules.length} schedules listed` }
        ]
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-4 rounded-xl shadow-2xs">
        <div>
          <h2 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-amber-600" /> PREVENTIVE MAINTENANCE SCHEDULES
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated maintenance intervals triggered by Odometer Mileage (KM), Engine Hours, or Calendar Days.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition active:scale-95 cursor-pointer"
            title="Export to Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition active:scale-95 cursor-pointer"
            title="Export to PDF"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          {canManageStatus && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-lg hover:bg-amber-400 transition shadow-2xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create PM Schedule
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-bold shadow-2xs transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[11px] font-bold underline opacity-75 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Status Summary Cards (Interactive Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-800 border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${statusFilter === 'ALL' ? 'text-slate-300' : 'text-slate-400'}`}>
            All Schedules
          </span>
          <span className="font-mono font-black text-xl mt-0.5 block">{schedules.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('UPCOMING')}
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            statusFilter === 'UPCOMING'
              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
              : 'bg-sky-50/60 text-sky-950 border-sky-200/80 hover:bg-sky-50'
          }`}
        >
          <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${statusFilter === 'UPCOMING' ? 'text-sky-100' : 'text-sky-700'}`}>
            Upcoming
          </span>
          <span className="font-mono font-black text-xl mt-0.5 block">{countByStatus('UPCOMING')}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('DUE_SOON')}
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            statusFilter === 'DUE_SOON'
              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
              : 'bg-amber-50/60 text-amber-950 border-amber-200/80 hover:bg-amber-50'
          }`}
        >
          <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${statusFilter === 'DUE_SOON' ? 'text-slate-900' : 'text-amber-800'}`}>
            Due Soon
          </span>
          <span className="font-mono font-black text-xl mt-0.5 block">{countByStatus('DUE_SOON')}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('DUE')}
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            statusFilter === 'DUE'
              ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
              : 'bg-orange-50/60 text-orange-950 border-orange-200/80 hover:bg-orange-50'
          }`}
        >
          <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${statusFilter === 'DUE' ? 'text-orange-100' : 'text-orange-800'}`}>
            Due Now
          </span>
          <span className="font-mono font-black text-xl mt-0.5 block">{countByStatus('DUE')}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('OVERDUE')}
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            statusFilter === 'OVERDUE'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-rose-50/60 text-rose-950 border-rose-200/80 hover:bg-rose-50'
          }`}
        >
          <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${statusFilter === 'OVERDUE' ? 'text-rose-100' : 'text-rose-800'}`}>
            Overdue
          </span>
          <span className="font-mono font-black text-xl mt-0.5 block">{countByStatus('OVERDUE')}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('COMPLETED')}
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            statusFilter === 'COMPLETED'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-emerald-50/60 text-emerald-950 border-emerald-200/80 hover:bg-emerald-50'
          }`}
        >
          <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${statusFilter === 'COMPLETED' ? 'text-emerald-100' : 'text-emerald-800'}`}>
            Completed
          </span>
          <span className="font-mono font-black text-xl mt-0.5 block">{countByStatus('COMPLETED')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200/90 p-3 rounded-xl shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search PM schedule title, unit, or notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            aria-label="Filter by maintenance status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-semibold focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Maintenance Statuses</option>
            <option value="UPCOMING">UPCOMING</option>
            <option value="DUE_SOON">DUE SOON</option>
            <option value="DUE">DUE NOW</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="p-3.5">Schedule Title & Notes</th>
                <th className="p-3.5">Assigned Unit</th>
                <th className="p-3.5">Frequency</th>
                <th className="p-3.5">Interval</th>
                <th className="p-3.5">Next Due Target</th>
                <th className="p-3.5">Status</th>
                {canManageStatus && (
                  <th className="p-3.5 text-right">Status Management</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={canManageStatus ? 7 : 6} className="p-8 text-center text-slate-400">
                    No preventive maintenance schedules found matching filter.
                  </td>
                </tr>
              ) : (
                filteredSchedules.map(s => {
                  const veh = vehicles.find(v => v.id === s.vehicle_id);
                  const trl = trailers.find(t => t.id === s.trailer_id);
                  const isRowUpdating = updatingRowId === s.id;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{s.title}</div>
                        {s.notes && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {s.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        {veh ? (
                          <span className="font-bold text-slate-900">{veh.vehicle_id} ({veh.plate_number})</span>
                        ) : trl ? (
                          <span className="font-bold text-blue-700">{trl.trailer_id} ({trl.plate_number})</span>
                        ) : (
                          <span className="text-slate-400 italic">Fleet General</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-700 text-[11px] border border-slate-200">
                          {s.frequency_type}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {(s.interval_value || 0).toLocaleString()}{' '}
                        {s.frequency_type === 'MILEAGE' ? 'KM' : s.frequency_type === 'HOURS' ? 'Hrs' : 'Days'}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">
                        <div>{s.next_due_date || 'N/A'}</div>
                        {(s.next_due_mileage || 0) > 0 && (
                          <div className="text-[11px] text-slate-400">
                            Target: {(s.next_due_mileage || 0).toLocaleString()} KM
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(s.status)}
                          {isRowUpdating && (
                            <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                          )}
                        </div>
                      </td>
                      {canManageStatus && (
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <select
                              aria-label={`Quick status select for ${s.title}`}
                              value={s.status}
                              disabled={isRowUpdating}
                              onChange={e => handleQuickStatusChange(s, e.target.value as PMStatus)}
                              className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-none transition cursor-pointer disabled:opacity-50"
                            >
                              {PM_STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.shortLabel}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => openChangeStatusModal(s)}
                              disabled={isRowUpdating}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-slate-950 font-bold text-[11px] rounded-lg border border-slate-200 hover:border-amber-300 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className="w-3 h-3 text-amber-600" />
                              Change Status
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Status Modal */}
      {selectedSchedule && (
        <Modal
          isOpen={!!selectedSchedule}
          onClose={() => !isSavingStatusModal && setSelectedSchedule(null)}
          title="Update Preventive Maintenance Status"
          subtitle="Modify schedule lifecycle status and log workshop service remarks."
          maxWidth="lg"
        >
          <form onSubmit={handleModalStatusSubmit} className="space-y-4 text-xs font-sans">
            {/* Schedule Context Summary Card */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Maintenance Schedule Record
                  </span>
                  <h4 className="text-sm font-black text-slate-900 mt-0.5">
                    {selectedSchedule.title}
                  </h4>
                </div>
                <div className="shrink-0">
                  {getStatusBadge(selectedSchedule.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/70 text-[11px]">
                <div>
                  <span className="text-slate-400 font-semibold block">Assigned Unit</span>
                  <span className="font-bold text-slate-800">
                    {(() => {
                      const v = vehicles.find(x => x.id === selectedSchedule.vehicle_id);
                      const tr = trailers.find(x => x.id === selectedSchedule.trailer_id);
                      if (v) return `${v.vehicle_id} (${v.plate_number})`;
                      if (tr) return `${tr.trailer_id} (${tr.plate_number})`;
                      return 'Fleet General';
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Interval Rule</span>
                  <span className="font-mono font-bold text-slate-800">
                    {(selectedSchedule.interval_value || 0).toLocaleString()} {selectedSchedule.frequency_type}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Next Due Target</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedSchedule.next_due_date ||
                      (selectedSchedule.next_due_mileage
                        ? `${(selectedSchedule.next_due_mileage || 0).toLocaleString()} KM`
                        : 'N/A')}
                  </span>
                </div>
              </div>
            </div>

            {/* Select Target Status */}
            <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                    Select New Maintenance Status
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-amber-700">Required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PM_STATUS_OPTIONS.map(option => {
                  const isSelected = targetStatus === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTargetStatus(option.value)}
                      className={`text-left p-3 rounded-xl border transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/90 ring-2 ring-amber-500/20 shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-black text-xs text-slate-900">{option.label}</span>
                        <Badge variant={option.badgeVariant}>{option.shortLabel}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Service Remarks / Status Notes */}
            <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Maintenance Status Notes / Remarks
              </label>
              <textarea
                rows={2}
                value={statusNotes}
                onChange={e => setStatusNotes(e.target.value)}
                placeholder="Optional workshop notes, bay assignment, or completion remarks..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition resize-none"
              />
              <p className="text-[11px] text-slate-400">
                Updating the status preserves all existing interval, vehicle assignment, and mileage targets.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={isSavingStatusModal}
                onClick={() => setSelectedSchedule(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingStatusModal}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSavingStatusModal ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving Status...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Save Status Update
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Schedule Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Preventive Maintenance Schedule"
        subtitle="Automate recurring service intervals for fuel trucks and tanker trailers."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSchedule} className="space-y-4 text-xs font-sans">
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  1. Schedule Definition & Target Asset
                </span>
              </div>
              <span className="text-[10px] font-semibold text-amber-700">* Required fields</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Schedule Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 10,000 KM Engine Oil & Filter Service"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Asset Category
                </label>
                <select
                  value={unitType}
                  onChange={e => setUnitType(e.target.value as 'VEHICLE' | 'TRAILER')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                >
                  <option value="VEHICLE">Tractor Head Truck</option>
                  <option value="TRAILER">Fuel Tanker Trailer</option>
                </select>
              </div>

              {unitType === 'VEHICLE' ? (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Target Tractor Truck <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={targetVehicleId}
                    onChange={e => setTargetVehicleId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  >
                    <option value="">-- Select Truck --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_id} ({v.plate_number})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Target Tanker Trailer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={targetTrailerId}
                    onChange={e => setTargetTrailerId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  >
                    <option value="">-- Select Trailer --</option>
                    {trailers.map(tr => (
                      <option key={tr.id} value={tr.id}>
                        {tr.trailer_id} ({tr.plate_number})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  2. Interval Threshold & Initial Status
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Frequency Rule</label>
                <select
                  value={frequencyType}
                  onChange={e => setFrequencyType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                >
                  <option value="MILEAGE">Mileage Interval (KM)</option>
                  <option value="HOURS">Engine Hours</option>
                  <option value="DAYS">Calendar Days</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Interval Value</label>
                <input
                  type="number"
                  min={1}
                  value={intervalValue}
                  onChange={e => setIntervalValue(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Initial Status</label>
                <select
                  value={initialStatus}
                  onChange={e => setInitialStatus(e.target.value as PMStatus)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                >
                  {PM_STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.shortLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Last Service (KM)</label>
                <input
                  type="number"
                  min={0}
                  value={lastServiceMileage}
                  onChange={e => setLastServiceMileage(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Next Due (KM)</label>
                <input
                  type="number"
                  min={0}
                  value={nextDueMileage}
                  onChange={e => setNextDueMileage(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Next Due Date</label>
                <input
                  type="date"
                  value={nextDueDate}
                  onChange={e => setNextDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Service Notes (Optional)</label>
              <input
                type="text"
                value={newScheduleNotes}
                onChange={e => setNewScheduleNotes(e.target.value)}
                placeholder="e.g. Replace 15W-40 oil, primary/secondary filters, and inspect belts."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
            >
              Save Schedule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Truck, ShieldCheck, AlertTriangle, FileText, Bell, ChevronRight, AlertOctagon, CheckCircle2, Clock, Wrench, Shield
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { InspectionFormMobile } from '../inspections/InspectionFormMobile';
import { DefectReportCategory, SeverityLevel } from '../../types';

interface DriverDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onNavigateTab }) => {
  const { vehicles, trailers, defectReports, submitDefectReport } = useFleet();
  const { currentProfile } = useAuth();

  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showCriticalConfirm, setShowCriticalConfirm] = useState(false);

  // Form State
  const [category, setCategory] = useState<DefectReportCategory>('Brakes');
  const [severity, setSeverity] = useState<SeverityLevel>('MEDIUM');
  const [description, setDescription] = useState('');

  // 1:1 Vehicle resolution based on active driver profile
  const isDriverA = currentProfile.email.includes('driver001');
  const driverId = isDriverA ? 'd1111111-1111-1111-1111-111111111111' : 'd2222222-2222-2222-2222-222222222222';
  
  const myAssignedTractor = vehicles.find(v => v.assigned_driver_id === driverId) 
    || vehicles.find(v => isDriverA ? v.vehicle_id === 'TRK-0101' : v.vehicle_id === 'TRK-0102') 
    || vehicles[0];

  const myAssignedTrailer = trailers.find(t => t.id === myAssignedTractor?.assigned_trailer_id)
    || trailers.find(t => isDriverA ? t.trailer_id === 'TRL-101' : t.trailer_id === 'TRL-102')
    || trailers[0];

  // Isolated Defect Reports for active driver ONLY
  const myReports = defectReports.filter(r => r.driver_id === driverId || r.driver_name.includes(isDriverA ? 'Mohammed' : 'Salem'));

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    if (severity === 'CRITICAL') {
      setShowCriticalConfirm(true);
    } else {
      executeSubmit();
    }
  };

  const executeSubmit = () => {
    if (!myAssignedTractor) return;

    submitDefectReport({
      driver_id: driverId,
      driver_name: currentProfile.full_name,
      vehicle_id: myAssignedTractor.vehicle_id,
      trailer_id: myAssignedTrailer?.trailer_id,
      category,
      severity,
      description,
      status: 'REPORTED'
    });

    setDescription('');
    setIsReportOpen(false);
    setShowCriticalConfirm(false);
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'CRITICAL': return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">CRITICAL</span>;
      case 'HIGH': return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">HIGH</span>;
      case 'MEDIUM': return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200">MEDIUM</span>;
      case 'LOW': return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">LOW</span>;
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'REPORTED': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">REPORTED</span>;
      case 'UNDER_REVIEW': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">UNDER REVIEW</span>;
      case 'WORK_ORDER_CREATED': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">WORK ORDER CREATED</span>;
      case 'RESOLVED': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">RESOLVED</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{st}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* DRIVER MOBILE HEADER */}
      <div className="bg-white border border-slate-200 p-4 rounded-lg flex items-center justify-between shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AUTHENTICATED DRIVER PORTAL</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 mt-0.5">
            Welcome, {currentProfile.full_name}
          </h2>
          <p className="text-xs text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Aramco Certified Hazardous Materials Transporter
          </p>
        </div>
        <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg">
          <Truck className="w-5 h-5" />
        </div>
      </div>

      {/* MY ASSIGNED VEHICLE CARD (STRICT 1:1 BINDING - NO DROPDOWN - NO FINANCIAL DATA) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">MY ASSIGNED TRACTOR & COUPLED TRAILER</h3>
          </div>
          <Badge variant={
            myAssignedTractor?.status === 'AVAILABLE' ? 'success' :
            myAssignedTractor?.status === 'REQUIRES INSPECTION' ? 'amber' : 'danger'
          }>
            {myAssignedTractor?.status || 'AVAILABLE'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Tractor details */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-amber-100 text-amber-900 text-[9px] font-bold rounded-bl border-b border-l border-amber-200">
              ASSIGNED TRACTOR
            </div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Tractor Head Truck</p>
            <p className="font-extrabold text-slate-900 text-base">{myAssignedTractor?.vehicle_id} <span className="text-amber-700 text-xs font-semibold">({myAssignedTractor?.plate_number})</span></p>
            <p className="text-slate-600">{myAssignedTractor?.make} {myAssignedTractor?.model} ({myAssignedTractor?.year})</p>
            <div className="pt-2 flex items-center justify-between text-[11px] border-t border-slate-200 mt-2">
              <span className="text-slate-500">Odometer:</span>
              <span className="text-slate-900 font-mono font-bold">{myAssignedTractor?.current_mileage.toLocaleString()} KM</span>
            </div>
          </div>

          {/* Coupled Trailer details */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-sky-100 text-sky-900 text-[9px] font-bold rounded-bl border-b border-l border-sky-200">
              COUPLED TANKER
            </div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Tanker Trailer</p>
            <p className="font-extrabold text-sky-700 text-base">{myAssignedTrailer?.trailer_id} <span className="text-slate-600 text-xs font-semibold">({myAssignedTrailer?.plate_number})</span></p>
            <p className="text-slate-600">{myAssignedTrailer?.tank_capacity_liters.toLocaleString()} Liters ({myAssignedTrailer?.number_of_compartments} Compartments)</p>
            <div className="pt-2 flex items-center justify-between text-[11px] border-t border-slate-200 mt-2">
              <span className="text-slate-500">Specification:</span>
              <span className="text-sky-800 font-semibold">{myAssignedTrailer?.tank_type}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PRIMARY ACTION BUTTONS (MOBILE FIRST BIG TOUCH TARGETS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setIsInspectionOpen(true)}
          className="p-4 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 transition text-left space-y-2 shadow-xs flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <ShieldCheck className="w-7 h-7" />
            <span className="text-[10px] bg-emerald-700 text-emerald-100 font-extrabold px-2 py-0.5 rounded uppercase">DAILY MANDATORY</span>
          </div>
          <div>
            <p className="text-base uppercase tracking-wider font-extrabold">START PRE-TRIP CHECK</p>
            <p className="text-xs font-medium opacity-90">Perform 15-Point Digital Safety Checklist</p>
          </div>
        </button>

        <button
          onClick={() => setIsReportOpen(true)}
          className="p-4 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-500 transition text-left space-y-2 shadow-xs flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-7 h-7 text-amber-200" />
            <span className="text-[10px] bg-rose-700 text-rose-100 font-extrabold px-2 py-0.5 rounded uppercase">IMMEDIATE ACTION</span>
          </div>
          <div>
            <p className="text-base uppercase tracking-wider font-extrabold">REPORT A PROBLEM</p>
            <p className="text-xs font-medium opacity-90">Log Defect / Breakdown / Safety Concern</p>
          </div>
        </button>
      </div>

      {/* QUICK NAVIGATION TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateTab('vehicles')}
          className="p-3.5 bg-white border border-slate-200 text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition text-left flex flex-col gap-2 shadow-xs"
        >
          <Truck className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-xs font-bold text-slate-900">My Vehicle</p>
            <p className="text-[10px] text-slate-500 font-normal">Specs & History</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('inspections')}
          className="p-3.5 bg-white border border-slate-200 text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition text-left flex flex-col gap-2 shadow-xs"
        >
          <ShieldCheck className="w-5 h-5 text-sky-600" />
          <div>
            <p className="text-xs font-bold text-slate-900">My Inspections</p>
            <p className="text-[10px] text-slate-500 font-normal">Checklist Logs</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('documents')}
          className="p-3.5 bg-white border border-slate-200 text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition text-left flex flex-col gap-2 shadow-xs"
        >
          <FileText className="w-5 h-5 text-purple-600" />
          <div>
            <p className="text-xs font-bold text-slate-900">Documents</p>
            <p className="text-[10px] text-slate-500 font-normal">Istimara & Permits</p>
          </div>
        </button>

        <button
          onClick={() => alert('Notifications: All safety alerts active for driver ' + currentProfile.full_name)}
          className="p-3.5 bg-white border border-slate-200 text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition text-left flex flex-col gap-2 shadow-xs"
        >
          <Bell className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-xs font-bold text-slate-900">Notifications</p>
            <p className="text-[10px] text-slate-500 font-normal">System Alerts</p>
          </div>
        </button>
      </div>

      {/* MY DEFECT REPORTS SECTION */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">MY SUBMITTED DEFECT & PROBLEM REPORTS</h3>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
            {myReports.length} Reports Logged
          </span>
        </div>

        {myReports.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-bold text-slate-800">No active defect reports</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Your vehicle is currently in operational condition.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myReports.map(rep => (
              <div key={rep.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg text-xs space-y-2 hover:border-slate-300 transition">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-700">{rep.report_number}</span>
                    <span className="text-slate-600 font-medium">({rep.category})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(rep.severity)}
                    {getStatusBadge(rep.status)}
                  </div>
                </div>

                <p className="text-slate-800 leading-relaxed font-medium">{rep.description}</p>

                {rep.workshop_response && (
                  <div className="p-2.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700 flex items-start gap-2">
                    <Wrench className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sky-800 block">Workshop Response:</span>
                      <span>{rep.workshop_response}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(rep.created_at).toLocaleString()}
                  </span>
                  <span>Vehicle: {rep.vehicle_id} / {rep.trailer_id || 'No Trailer'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PRE-TRIP INSPECTION MODAL */}
      {isInspectionOpen && (
        <Modal
          isOpen={isInspectionOpen}
          onClose={() => setIsInspectionOpen(false)}
          title="Digital Vehicle Pre-Trip Inspection"
          maxWidth="3xl"
        >
          <InspectionFormMobile onComplete={() => setIsInspectionOpen(false)} />
        </Modal>
      )}

      {/* REPORT PROBLEM MODAL */}
      {isReportOpen && (
        <Modal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          title="Report Vehicle Defect or Safety Issue"
          subtitle="Alerts Workshop Supervisor immediately and records defect audit history."
        >
          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-sans">
            {/* Auto-populated read-only vehicle fields */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 block font-medium">Assigned Tractor:</span>
                <span className="font-bold text-amber-800">{myAssignedTractor?.vehicle_id} ({myAssignedTractor?.plate_number})</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Coupled Trailer:</span>
                <span className="font-bold text-sky-800">{myAssignedTrailer?.trailer_id || 'N/A'}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200/80">
                <span className="text-slate-500 font-medium">Reporting Driver: </span>
                <span className="font-bold text-slate-900">{currentProfile.full_name}</span>
              </div>
            </div>

            {/* Category selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Defect Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as DefectReportCategory)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="Brakes">Brakes & Pneumatics</option>
                <option value="Engine">Engine & Drivetrain</option>
                <option value="Tires">Tires & Wheels</option>
                <option value="Valve">API Discharge Valves & Manifold</option>
                <option value="Electrical">Lighting & Electrical</option>
                <option value="Safety Gear">Hazmat Safety Equipment & Grounding</option>
                <option value="Steering">Steering & Suspension</option>
                <option value="Transmission">Transmission & Clutch</option>
                <option value="Leaks">Fuel / Oil Leaks</option>
                <option value="Other">Other Mechanical Defect</option>
              </select>
            </div>

            {/* Severity selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Severity Level <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as SeverityLevel[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={`py-2 px-1 rounded-xl text-center font-extrabold text-xs transition border cursor-pointer ${
                      severity === s
                        ? s === 'CRITICAL'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : s === 'HIGH'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : s === 'MEDIUM'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-slate-700 text-white border-slate-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Problem Description */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Detailed Defect Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Explain the specific issue encountered (e.g. low pressure building up slowly, leak at discharge API valve 2, tire pressure warning)..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                Submit Problem Report
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CRITICAL DEFECT CONFIRMATION WARNING MODAL */}
      {showCriticalConfirm && (
        <Modal
          isOpen={showCriticalConfirm}
          onClose={() => setShowCriticalConfirm(false)}
          title="⚠️ CRITICAL SAFETY WARNING"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-rose-900">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-700 shrink-0" />
                <h4 className="font-extrabold text-sm uppercase tracking-wide">Vehicle Operational Suspension Warning</h4>
              </div>
              <p className="text-xs leading-relaxed font-medium">
                You are marking this defect report as <strong className="text-rose-950 underline">CRITICAL</strong> for tractor vehicle <strong className="text-amber-900">{myAssignedTractor?.vehicle_id}</strong>.
              </p>
              <p className="text-xs leading-relaxed font-medium">
                Submitting a CRITICAL report will automatically change vehicle status to <strong className="text-amber-900 font-black">REQUIRES INSPECTION</strong> and generate an urgent alert for the Workshop Supervisor.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Defect Summary:</span>
              <p className="font-bold text-slate-900">{category} - {description}</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowCriticalConfirm(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                onClick={executeSubmit}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Confirm Critical Report
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

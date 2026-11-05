import React, { useState } from 'react';
import { 
  Wrench, Clock, CheckCircle2, Package, Camera, Play, Pause, FileText, AlertTriangle, ChevronRight
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { Drawer } from '../common/Drawer';
import { WorkOrder } from '../../types';

interface MechanicDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const MechanicDashboard: React.FC<MechanicDashboardProps> = ({ onNavigateTab }) => {
  const { workOrders, vehicles, trailers, parts, updateWorkOrderStatus, addWorkOrderPart, addWorkOrderLabor } = useFleet();
  const { currentProfile } = useAuth();

  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  // Local workbench state
  const [diagnosisText, setDiagnosisText] = useState('');
  const [repairText, setRepairText] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [laborHours, setLaborHours] = useState(2);

  // Filter jobs for active mechanic
  const myAssignedJobs = workOrders.filter(w => 
    w.assigned_technician_id === 't1111111-1111-1111-1111-111111111111' || 
    w.assigned_technician_id === currentProfile.id ||
    w.status === 'IN_PROGRESS' || 
    w.status === 'ASSIGNED'
  );

  const myOpenJobs = myAssignedJobs.filter(w => w.status !== 'RELEASED' && w.status !== 'CANCELLED');
  const inProgressJobs = myAssignedJobs.filter(w => w.status === 'IN_PROGRESS');
  const waitingPartsJobs = myAssignedJobs.filter(w => w.status === 'WAITING_FOR_PARTS');
  const completedTodayJobs = myAssignedJobs.filter(w => w.status === 'COMPLETED' || w.status === 'RELEASED');

  const handleStartJob = (woId: string) => {
    updateWorkOrderStatus(woId, 'IN_PROGRESS', 'Repair started by mechanic', currentProfile.full_name);
  };

  const handlePauseJob = (woId: string) => {
    updateWorkOrderStatus(woId, 'WAITING_FOR_PARTS', 'Paused waiting for store parts', currentProfile.full_name);
  };

  const handleCompleteJob = (woId: string) => {
    updateWorkOrderStatus(woId, 'REPAIR_COMPLETED', 'Repair completed by mechanic, awaiting QC', currentProfile.full_name);
    setSelectedWO(null);
    alert('Work order marked as REPAIR COMPLETED! Sent to QC Supervisor.');
  };

  const handleIssuePart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO || !selectedPartId) return;
    addWorkOrderPart(selectedWO.id, selectedPartId, partQty, currentProfile.full_name);
    alert('Spare part requested and deducted from store inventory.');
    setSelectedPartId('');
  };

  const handleLogLabor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO) return;
    addWorkOrderLabor(selectedWO.id, 't1111111-1111-1111-1111-111111111111', laborHours, 'Labor hours logged by mechanic');
    alert('Labor hours logged successfully!');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Mechanic Mobile-Friendly Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-100">
            Good Morning, {currentProfile.full_name}
          </h2>
          <p className="text-xs text-amber-400 font-semibold mt-0.5">
            Heavy Diesel & Tanker Mechanic Workbench
          </p>
        </div>
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
          <Wrench className="w-6 h-6" />
        </div>
      </div>

      {/* Mechanic KPIs - Simple & Mobile Focused */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="MY OPEN JOBS"
          value={myOpenJobs.length}
          subtitle="Assigned to Me"
          icon={<Wrench className="w-4 h-4 text-amber-400" />}
          color="amber"
        />
        <StatCard
          title="IN PROGRESS"
          value={inProgressJobs.length}
          subtitle="Active Bay"
          icon={<Clock className="w-4 h-4 text-blue-400" />}
          color="blue"
        />
        <StatCard
          title="WAITING PARTS"
          value={waitingPartsJobs.length}
          subtitle="Store Request"
          icon={<Package className="w-4 h-4 text-rose-400" />}
          color="rose"
        />
        <StatCard
          title="COMPLETED TODAY"
          value={completedTodayJobs.length}
          subtitle="Finished"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          color="emerald"
        />
      </div>

      {/* Main Section: MY ASSIGNED JOBS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-400" /> My Assigned Work Orders
        </h3>

        <div className="space-y-3">
          {myAssignedJobs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              You currently have no open repair jobs assigned.
            </div>
          ) : (
            myAssignedJobs.map(wo => {
              const veh = vehicles.find(v => v.id === wo.vehicle_id);
              const trl = trailers.find(t => t.id === wo.trailer_id);

              return (
                <div
                  key={wo.id}
                  className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-amber-500/40 transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-400 text-sm">{wo.work_order_number}</span>
                      <Badge variant={wo.priority === 'CRITICAL' ? 'danger' : 'amber'} size="sm">{wo.priority}</Badge>
                    </div>
                    <Badge variant={wo.status === 'IN_PROGRESS' ? 'amber' : 'purple'} size="sm">{wo.status.replace(/_/g, ' ')}</Badge>
                  </div>

                  <div>
                    <p className="font-bold text-slate-100 text-sm">{veh?.vehicle_id} ({veh?.plate_number}) - {veh?.make} {veh?.model}</p>
                    {trl && <p className="text-xs text-sky-400 mt-0.5">Coupled Trailer: {trl.trailer_id} ({trl.plate_number})</p>}
                    <p className="text-xs text-slate-300 mt-2 font-medium bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                      Problem: {wo.problem_description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-500 font-mono">Reported: {new Date(wo.date_reported).toLocaleDateString()}</span>
                    <button
                      onClick={() => {
                        setSelectedWO(wo);
                        setDiagnosisText(wo.diagnosis_notes || '');
                        setRepairText(wo.repair_summary || '');
                      }}
                      className="flex items-center gap-1 px-4 py-1.5 bg-amber-500 text-slate-950 font-black text-xs rounded-lg hover:bg-amber-400 transition"
                    >
                      Open Job Workbench <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mechanic Personal Job Workbench Drawer */}
      {selectedWO && (
        <Drawer
          isOpen={!!selectedWO}
          onClose={() => setSelectedWO(null)}
          title={`Mechanic Workbench: ${selectedWO.work_order_number}`}
          subtitle="Simple mobile-optimized repair actions and labor logging."
          width="3xl"
        >
          <div className="space-y-6 text-xs">
            {/* Quick Action Bar */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                onClick={() => handleStartJob(selectedWO.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400 transition"
              >
                <Play className="w-3.5 h-3.5" /> Start Job
              </button>
              <button
                onClick={() => handlePauseJob(selectedWO.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold rounded-lg hover:bg-rose-500/30 transition"
              >
                <Pause className="w-3.5 h-3.5" /> Request Parts (Pause)
              </button>
              <button
                onClick={() => handleCompleteJob(selectedWO.id)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 text-slate-950 font-black rounded-lg hover:bg-amber-400 transition ml-auto"
              >
                <CheckCircle2 className="w-4 h-4" /> Complete Repair
              </button>
            </div>

            {/* Diagnosis & Repair Notes Form */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="font-bold text-slate-200 block">Add Diagnostic Finding</label>
                <textarea
                  rows={2}
                  placeholder="Record root cause diagnosis (e.g. Civacon API seal leak under 4 bar pressure)..."
                  value={diagnosisText}
                  onChange={e => setDiagnosisText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                />
              </div>

              {/* Request Spare Part */}
              <form onSubmit={handleIssuePart} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-purple-400" /> Request Part Used from Store
                </h4>
                <div className="flex gap-2">
                  <select
                    required
                    value={selectedPartId}
                    onChange={e => setSelectedPartId(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100"
                  >
                    <option value="">-- Select Spare Part --</option>
                    {parts.map(p => (
                      <option key={p.id} value={p.id}>{p.part_number} - {p.part_name} (Stock: {p.current_stock})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={partQty}
                    onChange={e => setPartQty(Number(e.target.value))}
                    className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono text-center font-bold"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-500 text-slate-950 font-bold rounded-lg hover:bg-purple-400 transition"
                  >
                    Use Part
                  </button>
                </div>
              </form>

              {/* Log Labor Hours */}
              <form onSubmit={handleLogLabor} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-400" /> Log Labor Hours Worked
                </h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={laborHours}
                    onChange={e => setLaborHours(Number(e.target.value))}
                    className="w-28 bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono font-bold"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-500 text-slate-950 font-bold rounded-lg hover:bg-sky-400 transition"
                  >
                    Log Hours
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
};

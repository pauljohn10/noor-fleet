import React, { useState } from 'react';
import { 
  Wrench, Plus, Users, ShieldCheck, Clock, AlertTriangle, Package, Calendar, ArrowRight
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { JobCardFormModal } from '../workOrders/JobCardFormModal';
import { WorkOrder, WOStatus } from '../../types';

interface WorkshopSupervisorDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const WorkshopSupervisorDashboard: React.FC<WorkshopSupervisorDashboardProps> = ({ onNavigateTab }) => {
  const { workOrders, technicians, vehicles, parts } = useFleet();
  const [isWOModalOpen, setIsWOModalOpen] = useState(false);

  const openWOs = workOrders.filter(w => w.status !== 'RELEASED' && w.status !== 'CANCELLED');
  const criticalJobs = workOrders.filter(w => w.priority === 'CRITICAL' && w.status !== 'RELEASED');
  const inProgressJobs = workOrders.filter(w => w.status === 'IN_PROGRESS');
  const waitingPartsJobs = workOrders.filter(w => w.status === 'WAITING_FOR_PARTS');
  const qcPendingJobs = workOrders.filter(w => w.status === 'QC_INSPECTION');
  const completedTodayJobs = workOrders.filter(w => w.status === 'COMPLETED' || w.status === 'RELEASED');
  
  const today = new Date();
  const overdueJobs = workOrders.filter(w => {
    if (!w.estimated_completion) return false;
    return new Date(w.estimated_completion) < today && w.status !== 'RELEASED' && w.status !== 'COMPLETED';
  });

  const pipelineStages: { status: WOStatus; label: string }[] = [
    { status: 'REPORTED', label: 'Reported' },
    { status: 'INSPECTION', label: 'Inspection' },
    { status: 'ASSIGNED', label: 'Assigned' },
    { status: 'IN_PROGRESS', label: 'In Progress' },
    { status: 'WAITING_FOR_PARTS', label: 'Waiting Parts' },
    { status: 'QC_INSPECTION', label: 'QC' },
    { status: 'RELEASED', label: 'Released' }
  ];

  return (
    <div className="space-y-6">
      {/* Supervisor Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-black tracking-tight text-slate-100">Workshop Control & Repair Operations</h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/40 uppercase">
              Workshop Supervisor Focus
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Job card dispatch, mechanic assignment, QC sign-offs, and workshop bay throughput tracking.
          </p>
        </div>

        {/* Supervisor Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsWOModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 text-slate-950 font-extrabold text-xs rounded-lg hover:bg-amber-400 transition"
          >
            <Plus className="w-4 h-4" /> Open Job Card
          </button>
          <button
            onClick={() => onNavigateTab('technicians')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 text-slate-200 font-bold text-xs rounded-lg hover:bg-slate-700 transition"
          >
            <Users className="w-4 h-4 text-sky-400" /> Technicians Roster
          </button>
        </div>
      </div>

      {/* Workshop Operational KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard
          title="OPEN JOB CARDS"
          value={openWOs.length}
          subtitle="Active Repairs"
          icon={<Wrench className="w-4 h-4 text-amber-400" />}
          color="amber"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title="CRITICAL JOBS"
          value={criticalJobs.length}
          subtitle="Urgent Fixes"
          icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
          color="rose"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title="IN PROGRESS"
          value={inProgressJobs.length}
          subtitle="Active Bays"
          icon={<Clock className="w-4 h-4 text-blue-400" />}
          color="blue"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title="WAITING PARTS"
          value={waitingPartsJobs.length}
          subtitle="Store Requisition"
          icon={<Package className="w-4 h-4 text-rose-400" />}
          color="rose"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title="QC PENDING"
          value={qcPendingJobs.length}
          subtitle="Awaiting Inspection"
          icon={<ShieldCheck className="w-4 h-4 text-purple-400" />}
          color="purple"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title="COMPLETED TODAY"
          value={completedTodayJobs.length}
          subtitle="Throughput"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
          color="emerald"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title="OVERDUE JOBS"
          value={overdueJobs.length}
          subtitle="Delayed Fixes"
          icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
          color="rose"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title="CALENDAR"
          value="8"
          subtitle="Scheduled Services"
          icon={<Calendar className="w-4 h-4 text-sky-400" />}
          color="cyan"
          onClick={() => onNavigateTab('analytics')}
        />
      </div>

      {/* Workshop Visual Pipeline Widget */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-400" /> Workshop Throughput Pipeline Status
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {pipelineStages.map(stage => {
            const count = workOrders.filter(w => w.status === stage.status).length;
            return (
              <div key={stage.status} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{stage.label}</span>
                <p className="text-2xl font-black font-mono text-amber-400 mt-1">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Technician Workload & Critical Repairs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technician Workload */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" /> Technician Bay Workload
            </h3>
            <button
              onClick={() => onNavigateTab('technicians')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300"
            >
              View Roster →
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {technicians.map(t => {
              const activeCount = workOrders.filter(w => w.assigned_technician_id === t.id && w.status !== 'RELEASED').length;
              return (
                <div key={t.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-100">{t.full_name}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{t.specialization}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold font-mono border border-amber-500/30">
                    {activeCount} Active Jobs
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Critical Repairs List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" /> Urgent Critical Repair Orders
            </h3>
            <button
              onClick={() => onNavigateTab('workOrders')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300"
            >
              View Job Cards →
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {criticalJobs.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No critical emergency repairs currently pending.</div>
            ) : (
              criticalJobs.map(w => {
                const veh = vehicles.find(v => v.id === w.vehicle_id);
                return (
                  <div key={w.id} className="p-3.5 bg-slate-950/60 border border-rose-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rose-400">{w.work_order_number}</span>
                        <span className="font-bold text-slate-200">{veh?.vehicle_id}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] mt-1 line-clamp-1">{w.problem_description}</p>
                    </div>
                    <Badge variant="purple">{w.status}</Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <JobCardFormModal
        isOpen={isWOModalOpen}
        onClose={() => setIsWOModalOpen(false)}
      />
    </div>
  );
};

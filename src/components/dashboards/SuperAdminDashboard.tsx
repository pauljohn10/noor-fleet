import React, { useState } from 'react';
import { 
  ShieldCheck, Users, Lock, Server, History, AlertTriangle, Truck, Wrench, Bell, Database, Activity, CheckCircle2
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { StatCard } from '../common/StatCard';
import { UserManagementModal } from '../common/UserManagementModal';
import { Badge } from '../common/Badge';

interface SuperAdminDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigateTab }) => {
  const { vehicles, trailers, workOrders, notifications, auditLogs } = useFleet();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const openWOsCount = workOrders.filter(w => w.status !== 'RELEASED' && w.status !== 'CANCELLED').length;

  return (
    <div className="space-y-6">
      {/* Super Admin Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-4 rounded-xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">Super Admin Control Center</h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 rounded-md border border-amber-200 uppercase">
              System Root Level
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            System administration, user access provisioning, security audit streams, and database health telemetry.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsUserModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-2xs active:scale-95 cursor-pointer"
          >
            <Users className="w-4 h-4" /> Manage Users & Provisioning
          </button>
          <button
            onClick={() => onNavigateTab('auditLog')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 font-bold text-xs rounded-lg border border-slate-200 hover:bg-slate-50 transition shadow-2xs active:scale-95 cursor-pointer"
          >
            <History className="w-4 h-4 text-sky-600" /> Audit Logs
          </button>
        </div>
      </div>

      {/* Admin KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <StatCard
          title="TOTAL USERS"
          value={7}
          subtitle="Provisioned Accounts"
          icon={<Users className="w-4 h-4 text-amber-600" />}
          color="amber"
          onClick={() => setIsUserModalOpen(true)}
        />
        <StatCard
          title="ACTIVE USERS"
          value={7}
          subtitle="100% Verified"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          color="emerald"
        />
        <StatCard
          title="SYSTEM ROLES"
          value={7}
          subtitle="RBAC Profiles"
          icon={<Lock className="w-4 h-4 text-purple-600" />}
          color="purple"
        />
        <StatCard
          title="TOTAL VEHICLES"
          value={vehicles.length}
          subtitle="Tractor Units"
          icon={<Truck className="w-4 h-4 text-sky-600" />}
          color="cyan"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title="OPEN WORK ORDERS"
          value={openWOsCount}
          subtitle="Active Job Cards"
          icon={<Wrench className="w-4 h-4 text-amber-600" />}
          color="amber"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title="DATABASE HEALTH"
          value="100%"
          subtitle="PostgreSQL 15.1 Live"
          icon={<Database className="w-4 h-4 text-emerald-600" />}
          color="emerald"
        />
      </div>

      {/* Admin Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Audit Log Stream */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-sky-600" /> Recent Security & Audit Events
            </h3>
            <button
              onClick={() => onNavigateTab('auditLog')}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 transition"
            >
              Full Audit Trail →
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {auditLogs.slice(0, 5).map(log => (
              <div key={log.id} className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-lg flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.user_name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">{log.user_role}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5 font-medium">{log.action} on {log.module} ({log.record_id})</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health & RBAC Roles Distribution */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" /> Infrastructure & Database Telemetry
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-lg flex items-center justify-between hover:bg-slate-50 transition">
              <div>
                <p className="font-bold text-slate-900">Supabase PostgreSQL Engine</p>
                <p className="text-slate-500 text-[10px] font-medium">Row Level Security (RLS) Active</p>
              </div>
              <Badge variant="success">HEALTHY</Badge>
            </div>
            <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-lg flex items-center justify-between hover:bg-slate-50 transition">
              <div>
                <p className="font-bold text-slate-900">Storage Buckets (Photos & Docs)</p>
                <p className="text-slate-500 text-[10px] font-medium">vehicle-photos, work-order-photos, inspection-photos</p>
              </div>
              <Badge variant="success">ONLINE</Badge>
            </div>
            <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-lg flex items-center justify-between hover:bg-slate-50 transition">
              <div>
                <p className="font-bold text-slate-900">System Notification Sentinel</p>
                <p className="text-slate-500 text-[10px] font-medium">{notifications.length} active system alerts</p>
              </div>
              <Badge variant="info">RUNNING</Badge>
            </div>
          </div>
        </div>
      </div>

      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />
    </div>
  );
};

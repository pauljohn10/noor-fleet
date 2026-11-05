import React from 'react';
import { 
  Truck, Wrench, AlertTriangle, CalendarCheck, Package, DollarSign, FileText, Calendar, Filter, ArrowUpRight
} from 'lucide-react';
import { useFleet, DateFilterOption } from '../../context/FleetContext';
import { StatCard } from '../common/StatCard';
import { DashboardCharts } from './DashboardCharts';
import { Badge } from '../common/Badge';

interface ManagementDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const ManagementDashboard: React.FC<ManagementDashboardProps> = ({ onNavigateTab }) => {
  const { 
    vehicles, trailers, workOrders, parts, schedules, documents,
    dateFilter, setDateFilter, customDateRange, setCustomDateRange
  } = useFleet();

  // Metrics Calculations
  const totalTrucks = vehicles.filter(v => v.vehicle_type === 'TRACTOR_HEAD' || v.vehicle_type === 'OTHER').length;
  const totalTrailers = trailers.length;
  const availableCount = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const onTripCount = vehicles.filter(v => v.status === 'ON_TRIP').length;
  const inWorkshopCount = vehicles.filter(v => v.status === 'IN_WORKSHOP').length;
  const outOfServiceCount = vehicles.filter(v => v.status === 'OUT_OF_SERVICE').length;
  
  const maintenanceDueCount = schedules.filter(s => s.status === 'DUE' || s.status === 'OVERDUE' || s.status === 'DUE_SOON').length;
  
  const today = new Date();
  const docsExpiringCount = documents.filter(d => {
    const exp = new Date(d.expiry_date);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 30;
  }).length;

  const openWOsCount = workOrders.filter(w => w.status !== 'RELEASED' && w.status !== 'CANCELLED' && w.status !== 'COMPLETED').length;
  const overdueWOsCount = workOrders.filter(w => {
    if (!w.estimated_completion) return false;
    return new Date(w.estimated_completion) < today && w.status !== 'RELEASED' && w.status !== 'COMPLETED';
  }).length;

  const lowStockCount = parts.filter(p => p.current_stock <= p.minimum_stock).length;

  const totalMonthlyMaintCost = workOrders.reduce((sum, w) => sum + (w.total_cost || 0), 0);
  const totalMonthlyPartsCost = workOrders.reduce((sum, w) => sum + (w.parts_cost || 0), 0);

  const dateFilterOptions: { key: DateFilterOption; label: string }[] = [
    { key: 'TODAY', label: 'Today' },
    { key: 'WEEK', label: 'This Week' },
    { key: 'MONTH', label: 'This Month' },
    { key: 'YEAR', label: 'This Year' },
    { key: 'ALL', label: 'All Time' },
    { key: 'CUSTOM', label: 'Custom Range' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Date Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-100 flex items-center gap-2">
            <Truck className="w-6 h-6 text-amber-400" /> Executive Fleet & Workshop Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, job card pipeline, stock alerts, and fuel tanker maintenance metrics.
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-lg">
            <Filter className="w-3.5 h-3.5 text-amber-400 ml-1.5" />
            {dateFilterOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setDateFilter(opt.key)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                  dateFilter === opt.key
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-slate-950 p-1 border border-slate-800 rounded-lg text-xs">
              <input
                type="date"
                value={customDateRange.startDate}
                onChange={e => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                className="bg-slate-900 text-slate-200 border border-slate-800 px-2 py-0.5 rounded"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={customDateRange.endDate}
                onChange={e => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                className="bg-slate-900 text-slate-200 border border-slate-800 px-2 py-0.5 rounded"
              />
            </div>
          )}
        </div>
      </div>

      {/* Primary KPI Grid (13 Counters) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          title="TOTAL TRUCKS"
          value={totalTrucks}
          subtitle="Tractor Heads"
          icon={<Truck className="w-5 h-5" />}
          color="amber"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title="TOTAL TRAILERS"
          value={totalTrailers}
          subtitle="Tanker Units"
          icon={<Truck className="w-5 h-5 text-sky-400" />}
          color="cyan"
          onClick={() => onNavigateTab('trailers')}
        />
        <StatCard
          title="AVAILABLE"
          value={availableCount}
          subtitle="Ready for Trip"
          icon={<Truck className="w-5 h-5 text-emerald-400" />}
          color="emerald"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title="ON TRIP"
          value={onTripCount}
          subtitle="Active Delivery"
          icon={<Truck className="w-5 h-5 text-blue-400" />}
          color="blue"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title="IN WORKSHOP"
          value={inWorkshopCount}
          subtitle="Under Maintenance"
          icon={<Wrench className="w-5 h-5 text-amber-400" />}
          color="amber"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title="OUT OF SERVICE"
          value={outOfServiceCount}
          subtitle="Grounded Units"
          icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
          color="rose"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title="MAINTENANCE DUE"
          value={maintenanceDueCount}
          subtitle="PM Overdue/Due"
          icon={<CalendarCheck className="w-5 h-5" />}
          color="purple"
          onClick={() => onNavigateTab('preventive')}
        />
        <StatCard
          title="DOCS EXPIRING"
          value={docsExpiringCount}
          subtitle="≤ 30 Days Expiry"
          icon={<FileText className="w-5 h-5 text-amber-400" />}
          color="amber"
          onClick={() => onNavigateTab('documents')}
        />
        <StatCard
          title="OPEN JOB CARDS"
          value={openWOsCount}
          subtitle="Active Work Orders"
          icon={<Wrench className="w-5 h-5 text-blue-400" />}
          color="blue"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title="OVERDUE JOBS"
          value={overdueWOsCount}
          subtitle="Passed Completion"
          icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
          color="rose"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title="LOW STOCK PARTS"
          value={lowStockCount}
          subtitle="Below Min Threshold"
          icon={<Package className="w-5 h-5 text-rose-400" />}
          color="rose"
          onClick={() => onNavigateTab('inventory')}
        />
        <StatCard
          title="MONTHLY COST"
          value={`${totalMonthlyMaintCost.toLocaleString()} SAR`}
          subtitle="Total Maintenance"
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          color="emerald"
          onClick={() => onNavigateTab('analytics')}
        />
      </div>

      {/* Dashboard Analytics & Recharts */}
      <DashboardCharts
        vehicles={vehicles}
        trailers={trailers}
        workOrders={workOrders}
        parts={parts}
        schedules={schedules}
      />

      {/* Operational Highlights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" /> Active Job Cards & Repairs
            </h3>
            <button
              onClick={() => onNavigateTab('workOrders')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {workOrders.slice(0, 4).map(wo => (
              <div
                key={wo.id}
                onClick={() => onNavigateTab('workOrders')}
                className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl hover:border-slate-700 transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400 text-xs font-mono">{wo.work_order_number}</span>
                    <Badge variant={wo.priority === 'CRITICAL' ? 'danger' : wo.priority === 'HIGH' ? 'amber' : 'info'} size="sm">
                      {wo.priority}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-slate-300 mt-1 line-clamp-1">{wo.problem_description}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Reported: {new Date(wo.date_reported).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <Badge variant={wo.status === 'RELEASED' ? 'success' : 'purple'} size="sm">
                    {wo.status.replace(/_/g, ' ')}
                  </Badge>
                  <p className="text-xs font-mono font-bold text-slate-200 mt-1">{wo.total_cost} SAR</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Inventory Warnings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Package className="w-4 h-4 text-rose-400" /> Low Stock Spare Parts Alert
            </h3>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              Manage Store <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {parts.filter(p => p.current_stock <= p.minimum_stock).length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                All spare parts inventory levels are above minimum thresholds.
              </div>
            ) : (
              parts.filter(p => p.current_stock <= p.minimum_stock).map(p => (
                <div
                  key={p.id}
                  onClick={() => onNavigateTab('inventory')}
                  className="p-3.5 bg-slate-950/60 border border-rose-500/20 rounded-xl hover:border-rose-500/40 transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-rose-400 text-xs">{p.part_number}</span>
                    <p className="text-xs font-bold text-slate-200 mt-0.5">{p.part_name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Location: {p.location_rack}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg">
                      {p.current_stock} / Min {p.minimum_stock} {p.unit}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">{p.unit_cost} SAR / {p.unit}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

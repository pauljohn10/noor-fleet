import React from 'react';
import { 
  Truck, Wrench, DollarSign, CalendarCheck, Package, AlertTriangle, Filter, BarChart3
} from 'lucide-react';
import { useFleet, DateFilterOption } from '../../context/FleetContext';
import { StatCard } from '../common/StatCard';
import { DashboardCharts } from '../dashboard/DashboardCharts';

interface ManagementDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const ManagementDashboard: React.FC<ManagementDashboardProps> = ({ onNavigateTab }) => {
  const { 
    vehicles, trailers, workOrders, parts, schedules, documents,
    dateFilter, setDateFilter, customDateRange, setCustomDateRange
  } = useFleet();

  const totalTrucks = vehicles.filter(v => v.vehicle_type === 'TRACTOR_HEAD' || v.vehicle_type === 'OTHER').length;
  const totalTrailers = trailers.length;
  const availableCount = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const onTripCount = vehicles.filter(v => v.status === 'ON_TRIP').length;
  const inWorkshopCount = vehicles.filter(v => v.status === 'IN_WORKSHOP').length;
  const outOfServiceCount = vehicles.filter(v => v.status === 'OUT_OF_SERVICE').length;
  
  const maintenanceDueCount = schedules.filter(s => s.status === 'DUE' || s.status === 'OVERDUE' || s.status === 'DUE_SOON').length;
  const openWOsCount = workOrders.filter(w => w.status !== 'RELEASED' && w.status !== 'CANCELLED' && w.status !== 'COMPLETED').length;

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
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Executive Management Dashboard</h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 rounded border border-amber-200 uppercase">
              Executive Read-Only Overview
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            High-level executive financial metrics, fleet availability, breakdown frequencies, and maintenance cost analysis.
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 border border-slate-200 rounded">
          <Filter className="w-3.5 h-3.5 text-amber-700 ml-1.5" />
          {dateFilterOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setDateFilter(opt.key)}
              className={`px-2.5 py-1 text-xs font-bold rounded transition ${
                dateFilter === opt.key
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Management Executive KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard
          title="TOTAL TRUCKS"
          value={totalTrucks}
          subtitle="Tractor Units"
          icon={<Truck className="w-4 h-4 text-amber-600" />}
          color="amber"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title="TOTAL TRAILERS"
          value={totalTrailers}
          subtitle="Semi-Trailers"
          icon={<Truck className="w-4 h-4 text-sky-600" />}
          color="cyan"
          onClick={() => onNavigateTab('trailers')}
        />
        <StatCard
          title="AVAILABLE"
          value={availableCount}
          subtitle="Ready for Trip"
          icon={<Truck className="w-4 h-4 text-emerald-600" />}
          color="emerald"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title="ON TRIP"
          value={onTripCount}
          subtitle="Active Hauling"
          icon={<Truck className="w-4 h-4 text-blue-600" />}
          color="blue"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title="IN WORKSHOP"
          value={inWorkshopCount}
          subtitle="Downtime"
          icon={<Wrench className="w-4 h-4 text-amber-600" />}
          color="amber"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title="OUT OF SERVICE"
          value={outOfServiceCount}
          subtitle="Grounded"
          icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
          color="rose"
          onClick={() => onNavigateTab('vehicles')}
        />
        <StatCard
          title="OPEN JOB CARDS"
          value={openWOsCount}
          subtitle="Active Repairs"
          icon={<Wrench className="w-4 h-4 text-blue-600" />}
          color="blue"
          onClick={() => onNavigateTab('workOrders')}
        />
        <StatCard
          title="MONTHLY COST"
          value={`${(totalMonthlyMaintCost || 0).toLocaleString()} SAR`}
          subtitle="Total Maintenance"
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          color="emerald"
          onClick={() => onNavigateTab('analytics')}
        />
        <StatCard
          title="PARTS COST"
          value={`${(totalMonthlyPartsCost || 0).toLocaleString()} SAR`}
          subtitle="Spare Parts"
          icon={<DollarSign className="w-4 h-4 text-amber-600" />}
          color="amber"
          onClick={() => onNavigateTab('analytics')}
        />
        <StatCard
          title="MAINTENANCE DUE"
          value={maintenanceDueCount}
          subtitle="PM Overdue/Due"
          icon={<CalendarCheck className="w-4 h-4 text-purple-600" />}
          color="purple"
          onClick={() => onNavigateTab('preventive')}
        />
      </div>

      {/* Executive Recharts Graphics */}
      <DashboardCharts
        vehicles={vehicles}
        trailers={trailers}
        workOrders={workOrders}
        parts={parts}
        schedules={schedules}
      />
    </div>
  );
};

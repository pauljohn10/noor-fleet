import React from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Vehicle, Trailer, WorkOrder, Part, MaintenanceSchedule } from '../../types';

interface DashboardChartsProps {
  vehicles: Vehicle[];
  trailers: Trailer[];
  workOrders: WorkOrder[];
  parts: Part[];
  schedules: MaintenanceSchedule[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  vehicles,
  workOrders
}) => {
  // 1. Real Fleet Status Data (Derived strictly from live Supabase vehicles)
  const availableCount = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const onTripCount = vehicles.filter(v => v.status === 'ON_TRIP').length;
  const inWorkshopCount = vehicles.filter(v => v.status === 'IN_WORKSHOP').length;
  const outOfServiceCount = vehicles.filter(v => v.status === 'OUT_OF_SERVICE').length;
  const totalFleetCount = vehicles.length;

  const fleetStatusData = [
    { name: 'Available', value: availableCount, color: '#10b981' },
    { name: 'On Trip', value: onTripCount, color: '#3b82f6' },
    { name: 'In Workshop', value: inWorkshopCount, color: '#f59e0b' },
    { name: 'Out of Service', value: outOfServiceCount, color: '#ef4444' }
  ].filter(item => item.value > 0);

  // 2. Real Workshop Work Order Pipeline Status
  const woStatusCounts: Record<string, number> = {};
  workOrders.forEach(w => {
    woStatusCounts[w.status] = (woStatusCounts[w.status] || 0) + 1;
  });

  const woJobStatusData = Object.keys(woStatusCounts).map(status => ({
    status: status.replace(/_/g, ' '),
    count: woStatusCounts[status]
  }));

  // 3. Real Monthly Maintenance Cost Trend (Calculated from actual Supabase work orders)
  const monthlyCostMap = new Map<string, { parts: number; labor: number; external: number }>();
  workOrders.forEach(w => {
    const rawDate = w.date_reported || w.created_at;
    const date = rawDate ? new Date(rawDate) : new Date();
    const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    const existing = monthlyCostMap.get(key) || { parts: 0, labor: 0, external: 0 };
    existing.parts += Number(w.parts_cost) || 0;
    existing.labor += Number(w.labor_cost) || 0;
    existing.external += Number(w.external_service_cost) || 0;
    monthlyCostMap.set(key, existing);
  });

  const monthlyCostData = Array.from(monthlyCostMap.entries()).map(([month, data]) => ({
    month,
    parts: data.parts,
    labor: data.labor,
    external: data.external
  }));

  // 4. Real Maintenance Cost by Vehicle
  const costByVehicle = vehicles
    .map(v => {
      const vWOs = workOrders.filter(w => w.vehicle_id === v.id);
      const totalCost = vWOs.reduce((acc, w) => acc + (Number(w.total_cost) || 0), 0);
      return {
        vehicleId: v.vehicle_id,
        plate: v.plate_number,
        cost: totalCost
      };
    })
    .filter(item => item.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 1. Fleet Status Overview */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-4">
          Fleet Operational Status
        </h4>
        <div className="h-64 w-full flex items-center justify-center">
          {totalFleetCount === 0 || fleetStatusData.length === 0 ? (
            <div className="text-center text-slate-400 text-xs">
              <p className="font-bold">No active vehicles in fleet</p>
              <p className="text-[11px] text-slate-400 mt-1">Add vehicles to view live status distribution</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fleetStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {fleetStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. Monthly Maintenance Cost Breakdown */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs lg:col-span-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-4">
          Monthly Maintenance Expense Trend (SAR)
        </h4>
        <div className="h-64 w-full flex items-center justify-center">
          {monthlyCostData.length === 0 ? (
            <div className="text-center text-slate-400 text-xs">
              <p className="font-bold">No maintenance expenditure recorded</p>
              <p className="text-[11px] text-slate-400 mt-1">Expenses will plot dynamically as work orders are completed</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyCostData}>
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '8px' }} />
                <Legend />
                <Area type="monotone" dataKey="parts" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} name="Parts Cost" />
                <Area type="monotone" dataKey="labor" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} name="Labor Cost" />
                <Area type="monotone" dataKey="external" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.4} name="External Service" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. Workshop Work Order Pipeline */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs lg:col-span-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-4">
          Workshop Work Order Pipeline
        </h4>
        <div className="h-64 w-full flex items-center justify-center">
          {woJobStatusData.length === 0 ? (
            <div className="text-center text-slate-400 text-xs">
              <p className="font-bold">No active job cards in workshop</p>
              <p className="text-[11px] text-slate-400 mt-1">Open work orders will be categorized by stage here</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={woJobStatusData}>
                <XAxis dataKey="status" stroke="#64748b" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} name="Active Jobs" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4. Maintenance Cost by Vehicle */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-4">
          Highest Repair Cost Vehicles (SAR)
        </h4>
        <div className="h-64 w-full flex items-center justify-center">
          {costByVehicle.length === 0 ? (
            <div className="text-center text-slate-400 text-xs">
              <p className="font-bold">No repair cost data yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Costs will rank highest-maintenance vehicles</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costByVehicle} layout="vertical">
                <XAxis type="number" stroke="#64748b" fontSize={10} />
                <YAxis dataKey="vehicleId" type="category" stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '8px' }} />
                <Bar dataKey="cost" fill="#e11d48" radius={[0, 4, 4, 0]} name="Total Cost (SAR)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

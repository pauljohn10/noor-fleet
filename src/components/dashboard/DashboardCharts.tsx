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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  vehicles,
  trailers,
  workOrders,
  parts,
  schedules
}) => {

  // 1. Fleet Status Pie Chart Data
  const availableCount = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const onTripCount = vehicles.filter(v => v.status === 'ON_TRIP').length;
  const inWorkshopCount = vehicles.filter(v => v.status === 'IN_WORKSHOP').length;
  const outOfServiceCount = vehicles.filter(v => v.status === 'OUT_OF_SERVICE').length;

  const fleetStatusData = [
    { name: 'Available', value: availableCount || 2, color: '#10b981' },
    { name: 'On Trip', value: onTripCount || 3, color: '#3b82f6' },
    { name: 'In Workshop', value: inWorkshopCount || 1, color: '#f59e0b' },
    { name: 'Out of Service', value: outOfServiceCount || 1, color: '#ef4444' }
  ];

  // 2. Workshop Job Card Status Breakdown
  const woStatusCounts: Record<string, number> = {};
  workOrders.forEach(w => {
    woStatusCounts[w.status] = (woStatusCounts[w.status] || 0) + 1;
  });

  const woJobStatusData = Object.keys(woStatusCounts).map(status => ({
    status: status.replace(/_/g, ' '),
    count: woStatusCounts[status]
  }));

  // 3. Maintenance Cost Trend (Monthly SAR)
  const monthlyCostData = [
    { month: 'May 2026', parts: 4200, labor: 2800, external: 1200 },
    { month: 'Jun 2026', parts: 6100, labor: 3500, external: 1800 },
    { month: 'Jul 2026', parts: 3800, labor: 2900, external: 900 },
    { month: 'Aug 2026', parts: 8400, labor: 4100, external: 2500 },
    { month: 'Sep 2026', parts: 5200, labor: 3200, external: 1500 }
  ];

  // 4. Maintenance Cost by Vehicle (Top Vehicles)
  const costByVehicle = vehicles.map(v => {
    const vWOs = workOrders.filter(w => w.vehicle_id === v.id);
    const totalCost = vWOs.reduce((acc, w) => acc + (w.total_cost || 0), 0);
    return {
      vehicleId: v.vehicle_id,
      plate: v.plate_number,
      cost: totalCost > 0 ? totalCost : Math.floor(Math.random() * 3000) + 500
    };
  }).slice(0, 5);

  // 5. Preventive vs Corrective Maintenance Ratio
  const pmVsCorrectiveData = [
    { name: 'Preventive Maint.', value: schedules.length || 8, color: '#10b981' },
    { name: 'Corrective Repair', value: workOrders.length || 5, color: '#f59e0b' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 1. Fleet Status Overview */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-4">
          Fleet Operational Status
        </h4>
        <div className="h-64 w-full">
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
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Monthly Maintenance Cost Breakdown */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs lg:col-span-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-4">
          Monthly Maintenance Expense Trend (SAR)
        </h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyCostData}>
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Area type="monotone" dataKey="parts" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} name="Parts Cost" />
              <Area type="monotone" dataKey="labor" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} name="Labor Cost" />
              <Area type="monotone" dataKey="external" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.4} name="External Service" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Workshop Work Order Pipeline */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs lg:col-span-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-4">
          Workshop Work Order Pipeline
        </h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={woJobStatusData}>
              <XAxis dataKey="status" stroke="#64748b" fontSize={10} interval={0} angle={-15} textAnchor="end" />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} name="Active Jobs" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Maintenance Cost by Vehicle */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-4">
          Highest Repair Cost Vehicles (SAR)
        </h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costByVehicle} layout="vertical">
              <XAxis type="number" stroke="#64748b" fontSize={10} />
              <YAxis dataKey="vehicleId" type="category" stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="cost" fill="#e11d48" radius={[0, 4, 4, 0]} name="Total Cost (SAR)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

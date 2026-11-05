import React from 'react';
import { DollarSign, Calendar, Wrench, Truck, Clock, Download, FileText } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';

export const CostAnalysisView: React.FC = () => {
  const { vehicles, workOrders, schedules } = useFleet();

  const totalPartsCost = workOrders.reduce((sum, w) => sum + (w.parts_cost || 0), 0);
  const totalLaborCost = workOrders.reduce((sum, w) => sum + (w.labor_cost || 0), 0);
  const totalExternalCost = workOrders.reduce((sum, w) => sum + (w.external_service_cost || 0), 0);
  const totalGrandCost = workOrders.reduce((sum, w) => sum + (w.total_cost || 0), 0);

  const vehicleCostRanking = vehicles.map(v => {
    const vWOs = workOrders.filter(w => w.vehicle_id === v.id);
    const cost = vWOs.reduce((sum, w) => sum + (w.total_cost || 0), 0);
    return {
      vehicle: v,
      repairsCount: vWOs.length,
      cost
    };
  }).sort((a, b) => b.cost - a.cost);

  const handleExportExcel = () => {
    const data = vehicleCostRanking.map(r => ({
      'Vehicle ID': r.vehicle.vehicle_id,
      'Plate Number': r.vehicle.plate_number,
      'Make & Model': `${r.vehicle.make} ${r.vehicle.model}`,
      'Work Orders Count': r.repairsCount,
      'Total Maintenance Cost (SAR)': r.cost,
      'Status': r.vehicle.status
    }));
    exportToExcel(data, 'Vehicle_Maintenance_Cost_Ranking');
  };

  const handleExportPDF = () => {
    const headers = ['Rank', 'Vehicle ID', 'Plate Number', 'Make & Model', 'Repairs Count', 'Maintenance Cost (SAR)', 'Fleet Status'];
    const rows = vehicleCostRanking.map((r, idx) => [
      `#${idx + 1}`,
      r.vehicle.vehicle_id,
      r.vehicle.plate_number,
      `${r.vehicle.make} ${r.vehicle.model}`,
      `${r.repairsCount} work orders`,
      `${r.cost.toLocaleString()} SAR`,
      r.vehicle.status
    ]);

    exportToPDFReport(
      'Fleet Maintenance Cost Analysis & Vehicle Ranking',
      headers,
      rows,
      'Vehicle_Cost_Analysis_Report',
      {
        orientation: 'landscape',
        subtitle: 'Workshop Repair Expenditure Analysis (Spare Parts + Labor + External Subcontracting)',
        summaryKPIs: [
          { label: 'Total Maintenance', value: `${totalGrandCost.toLocaleString()} SAR`, color: 'emerald' },
          { label: 'Parts Incurred', value: `${totalPartsCost.toLocaleString()} SAR`, color: 'amber' },
          { label: 'Labor Hours Billed', value: `${totalLaborCost.toLocaleString()} SAR`, color: 'sky' }
        ],
        metadata: [
          { label: 'Total Vehicles Audited', value: `${vehicles.length} units` },
          { label: 'Total Work Orders', value: `${workOrders.length} orders` }
        ]
      }
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" /> Maintenance Cost Analysis & Workshop Calendar
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total Cost Formula = Spare Parts + Technician Labor + External Subcontracting Services. Breakdown by vehicle unit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md border border-slate-200 transition active:scale-95 cursor-pointer"
            title="Export to Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md border border-slate-200 transition active:scale-95 cursor-pointer"
            title="Export to PDF"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="TOTAL MAINTENANCE EXPENSE"
          value={`${totalGrandCost.toLocaleString()} SAR`}
          subtitle="Cumulative Maintenance"
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          color="emerald"
        />
        <StatCard
          title="PARTS EXPENSE"
          value={`${totalPartsCost.toLocaleString()} SAR`}
          subtitle="Spare Parts Issued"
          icon={<DollarSign className="w-5 h-5 text-amber-600" />}
          color="amber"
        />
        <StatCard
          title="LABOR EXPENSE"
          value={`${totalLaborCost.toLocaleString()} SAR`}
          subtitle="Technician Hours"
          icon={<Clock className="w-5 h-5 text-blue-600" />}
          color="blue"
        />
        <StatCard
          title="EXTERNAL SERVICES"
          value={`${totalExternalCost.toLocaleString()} SAR`}
          subtitle="Specialized Subcontract"
          icon={<Wrench className="w-5 h-5 text-purple-600" />}
          color="purple"
        />
      </div>

      {/* Cost Ranking & Calendar Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" /> Highest Repair Cost Vehicles
          </h3>
          <div className="space-y-2">
            {vehicleCostRanking.map(item => (
              <div key={item.vehicle.id} className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs">{item.vehicle.vehicle_id} ({item.vehicle.plate_number})</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.vehicle.make} {item.vehicle.model} - {item.repairsCount} Repairs Logged</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 text-xs">{item.cost.toLocaleString()} SAR</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workshop Calendar Overview */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" /> Maintenance Calendar Schedule Overview
          </h3>
          <div className="space-y-2 text-xs">
            {schedules.map(s => (
              <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{s.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Target Due: {s.next_due_date || 'KM Trigger'}</p>
                </div>
                <Badge variant={s.status === 'OVERDUE' ? 'danger' : 'info'}>{s.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

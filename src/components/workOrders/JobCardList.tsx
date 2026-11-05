import React, { useState } from 'react';
import { 
  Plus, Search, Filter, Wrench, Eye, FileSpreadsheet, FileText
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { JobCardFormModal } from './JobCardFormModal';
import { JobCardDetailView } from './JobCardDetailView';
import { WorkOrder, WOStatus, WOPriority } from '../../types';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';

export const JobCardList: React.FC = () => {
  const { workOrders, vehicles, technicians } = useFleet();
  const { hasPermission } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  const filteredWOs = workOrders.filter(w => {
    const matchesSearch = 
      w.work_order_number.toLowerCase().includes(search.toLowerCase()) ||
      w.problem_description.toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || w.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleExportExcel = () => {
    const data = filteredWOs.map(w => ({
      'Work Order #': w.work_order_number,
      'Vehicle ID': vehicles.find(v => v.id === w.vehicle_id)?.vehicle_id || 'N/A',
      'Priority': w.priority,
      'Status': w.status,
      'Problem': w.problem_description,
      'Parts Cost': w.parts_cost,
      'Labor Cost': w.labor_cost,
      'Total Cost': w.total_cost,
      'Date Reported': new Date(w.date_reported).toLocaleDateString()
    }));
    exportToExcel(data, 'Workshop_Job_Cards');
  };

  const handleExportPDF = () => {
    const headers = ['WO #', 'Vehicle Unit', 'Priority', 'Workflow Status', 'Assigned Tech', 'Problem Description', 'Parts Cost', 'Labor Cost', 'Total Cost'];
    const rows = filteredWOs.map(w => {
      const veh = vehicles.find(v => v.id === w.vehicle_id);
      const tech = technicians.find(t => t.id === w.assigned_technician_id);
      return [
        w.work_order_number,
        veh ? `${veh.vehicle_id} (${veh.plate_number})` : 'N/A',
        w.priority,
        w.status.replace(/_/g, ' '),
        tech ? tech.full_name : 'Unassigned',
        w.problem_description,
        `${w.parts_cost.toLocaleString()} SAR`,
        `${w.labor_cost.toLocaleString()} SAR`,
        `${w.total_cost.toLocaleString()} SAR`
      ];
    });

    const totalCost = workOrders.reduce((sum, w) => sum + (w.total_cost || 0), 0);
    const inProgressCount = workOrders.filter(w => w.status === 'IN_PROGRESS' || w.status === 'ASSIGNED').length;

    exportToPDFReport(
      'Al-Noor Workshop Job Card Summary Report',
      headers,
      rows,
      'Workshop_Job_Cards_Report',
      {
        orientation: 'landscape',
        subtitle: 'Commercial Workshop Work Orders, Technician Allocations, Spare Parts Incurred & Cost Totals',
        summaryKPIs: [
          { label: 'Total Job Cards', value: workOrders.length, color: 'slate' },
          { label: 'Active In Bay', value: inProgressCount, color: 'amber' },
          { label: 'Total Workshop Cost', value: `${totalCost.toLocaleString()} SAR`, color: 'emerald' }
        ],
        metadata: [
          { label: 'Status Filter', value: statusFilter },
          { label: 'Priority Filter', value: priorityFilter },
          { label: 'Export Scope', value: `${filteredWOs.length} work orders` }
        ]
      }
    );
  };

  const getPriorityBadge = (priority: WOPriority) => {
    switch (priority) {
      case 'CRITICAL': return <Badge variant="danger">CRITICAL</Badge>;
      case 'HIGH': return <Badge variant="amber">HIGH</Badge>;
      case 'MEDIUM': return <Badge variant="info">MEDIUM</Badge>;
      case 'LOW': return <Badge variant="slate">LOW</Badge>;
      default: return <Badge variant="slate">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: WOStatus) => {
    switch (status) {
      case 'RELEASED': return <Badge variant="success">RELEASED</Badge>;
      case 'COMPLETED': return <Badge variant="success">COMPLETED</Badge>;
      case 'IN_PROGRESS': return <Badge variant="amber">IN PROGRESS</Badge>;
      case 'WAITING_FOR_PARTS': return <Badge variant="danger">WAITING PARTS</Badge>;
      case 'CANCELLED': return <Badge variant="slate">CANCELLED</Badge>;
      default: return <Badge variant="purple">{status.replace(/_/g, ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-3.5 rounded-md shadow-xs">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-600" /> MAINTENANCE WORK ORDERS REGISTER
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Repair job cards, technician task logs, spare parts issuance deductions, labor hours, and QC release authorization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded hover:bg-slate-200 border border-slate-200 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded hover:bg-slate-200 border border-slate-200 transition"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" /> PDF Report
          </button>
          {hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-slate-950 text-xs font-bold rounded hover:bg-amber-600 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Create Work Order
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-md shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search WO #, problem description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Status Workflow</option>
            <option value="REPORTED">REPORTED</option>
            <option value="INSPECTION">INSPECTION</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="WAITING_FOR_PARTS">WAITING FOR PARTS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="RELEASED">RELEASED</option>
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
              <tr>
                <th className="p-2.5">Work Order #</th>
                <th className="p-2.5">Vehicle / Unit</th>
                <th className="p-2.5">Priority</th>
                <th className="p-2.5">Problem Description</th>
                <th className="p-2.5">Lead Technician</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Total Cost</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredWOs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    No work order job cards found matching filter.
                  </td>
                </tr>
              ) : (
                filteredWOs.map(w => {
                  const veh = vehicles.find(v => v.id === w.vehicle_id);
                  const tech = technicians.find(t => t.id === w.assigned_technician_id);
                  return (
                    <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5">
                        <div className="font-mono font-bold text-amber-700">{w.work_order_number}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{new Date(w.date_reported).toLocaleDateString()}</div>
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{veh?.vehicle_id} ({veh?.plate_number})</div>
                      </td>
                      <td className="p-2.5">{getPriorityBadge(w.priority)}</td>
                      <td className="p-2.5 max-w-xs truncate text-slate-800 font-medium">
                        {w.problem_description}
                      </td>
                      <td className="p-2.5">
                        {tech ? (
                          <div className="font-bold text-slate-900">{tech.full_name}</div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-2.5">{getStatusBadge(w.status)}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-800">
                        {w.total_cost.toLocaleString()} SAR
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => setSelectedWO(w)}
                          className="px-2 py-1 bg-slate-100 text-slate-700 font-semibold border border-slate-200 text-[11px] rounded hover:bg-slate-200 transition"
                        >
                          View Job Card
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Record count bar */}
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 font-mono">
          Showing 1–{filteredWOs.length} of {workOrders.length} work order records
        </div>
      </div>

      <JobCardFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />

      <JobCardDetailView
        workOrder={selectedWO}
        isOpen={!!selectedWO}
        onClose={() => setSelectedWO(null)}
      />
    </div>
  );
};

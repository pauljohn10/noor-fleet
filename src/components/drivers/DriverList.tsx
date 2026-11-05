import React, { useState } from 'react';
import { UserCheck, Truck, Search, Plus, Edit3, Download, FileText } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Driver } from '../../types';
import { DriverFormModal } from './DriverFormModal';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';

export const DriverList: React.FC = () => {
  const { drivers, vehicles } = useFleet();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | undefined>(undefined);

  const filteredDrivers = drivers.filter(d => 
    d.full_name.toLowerCase().includes(search.toLowerCase()) ||
    d.employee_id.toLowerCase().includes(search.toLowerCase()) ||
    d.license_number.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingDriver(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setIsModalOpen(true);
  };

  const handleExportExcel = () => {
    const data = filteredDrivers.map(d => {
      const assigned = vehicles.find(v => v.assigned_driver_id === d.id);
      return {
        'Employee ID': d.employee_id,
        'Full Name': d.full_name,
        'Phone Number': d.phone,
        'License Number': d.license_number,
        'License Expiry': d.license_expiry,
        'Assigned Tractor': assigned ? `${assigned.vehicle_id} (${assigned.plate_number})` : 'Standby / Unassigned',
        'Status': d.status
      };
    });
    exportToExcel(data, 'Driver_Roster_Assignments');
  };

  const handleExportPDF = () => {
    const headers = ['Employee ID', 'Driver Full Name', 'Phone Number', 'Heavy License #', 'License Expiry', 'Assigned Tractor', 'Status'];
    const rows = filteredDrivers.map(d => {
      const assigned = vehicles.find(v => v.assigned_driver_id === d.id);
      return [
        d.employee_id,
        d.full_name,
        d.phone,
        d.license_number,
        d.license_expiry,
        assigned ? `${assigned.vehicle_id} (${assigned.plate_number})` : 'Standby Spare',
        d.status
      ];
    });

    const activeCount = drivers.filter(d => d.status === 'ACTIVE').length;

    exportToPDFReport(
      'Driver Roster & Vehicle Assignments Register',
      headers,
      rows,
      'Driver_Roster_Report',
      {
        orientation: 'landscape',
        subtitle: 'Commercial Heavy Fuel Transport Driver Roster, Licensing & Vehicle Coupling Matrix',
        summaryKPIs: [
          { label: 'Total Drivers', value: drivers.length, color: 'slate' },
          { label: 'Active On Duty', value: activeCount, color: 'emerald' },
          { label: 'Assigned to Truck', value: vehicles.filter(v => Boolean(v.assigned_driver_id)).length, color: 'sky' }
        ],
        metadata: [
          { label: 'Search Query', value: search || 'All Drivers' },
          { label: 'Export Scope', value: `${filteredDrivers.length} drivers listed` }
        ]
      }
    );
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-600" /> DRIVER ROSTER & VEHICLE ASSIGNMENTS
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Heavy transport driver profiles, hazardous material driver licenses, license expiries, and tractor assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
            title="Export to Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
            title="Export to PDF"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          {hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Driver</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Driver Name, Employee ID, License..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition"
          />
        </div>
      </div>

      {/* Driver Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
              <tr>
                <th className="p-3">Driver Name</th>
                <th className="p-3">Employee ID</th>
                <th className="p-3">Driver License #</th>
                <th className="p-3">License Type</th>
                <th className="p-3">License Expiry</th>
                <th className="p-3">Assigned Tractor</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    No drivers found matching query.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map(d => {
                  const assignedVeh = vehicles.find(v => v.assigned_driver_id === d.id);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{d.full_name}</td>
                      <td className="p-3 font-mono text-slate-700">{d.employee_id}</td>
                      <td className="p-3 font-mono font-bold text-amber-800">{d.license_number}</td>
                      <td className="p-3 text-slate-600">{d.license_type}</td>
                      <td className="p-3 font-mono text-slate-700">{d.license_expiry}</td>
                      <td className="p-3">
                        {assignedVeh ? (
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{assignedVeh.vehicle_id}</span>
                            <span className="font-mono text-[10px] text-slate-500 font-normal">({assignedVeh.plate_number})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant={d.status === 'ACTIVE' ? 'success' : 'slate'}>{d.status}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        {hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) ? (
                          <button
                            onClick={() => handleOpenEdit(d)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg border border-slate-200 transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Record Count Bar */}
        <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 font-mono">
          Showing 1–{filteredDrivers.length} of {drivers.length} registered driver accounts
        </div>
      </div>

      <DriverFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialDriver={editingDriver}
      />
    </div>
  );
};

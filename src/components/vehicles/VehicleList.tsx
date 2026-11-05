import React, { useState } from 'react';
import { 
  Plus, Search, Filter, Download, Truck, Wrench, Shield, Trash2, Edit3, Eye, FileSpreadsheet, FileText
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { VehicleFormModal } from './VehicleFormModal';
import { VehicleDetailDrawer } from './VehicleDetailDrawer';
import { Vehicle, VehicleStatus } from '../../types';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';

export const VehicleList: React.FC = () => {
  const { vehicles, deleteVehicle, drivers, trailers } = useFleet();
  const { currentProfile, activeRole, hasPermission } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>(undefined);

  const accessibleVehicles = vehicles;

  const filteredVehicles = accessibleVehicles.filter(v => {
    const matchesSearch = 
      v.vehicle_id.toLowerCase().includes(search.toLowerCase()) ||
      v.plate_number.toLowerCase().includes(search.toLowerCase()) ||
      v.fleet_number.toLowerCase().includes(search.toLowerCase()) ||
      v.vin.toLowerCase().includes(search.toLowerCase()) ||
      v.make.toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportExcel = () => {
    const data = filteredVehicles.map(v => ({
      'Vehicle ID': v.vehicle_id,
      'Plate Number': v.plate_number,
      'Fleet Number': v.fleet_number,
      'Make': v.make,
      'Model': v.model,
      'Year': v.year,
      'VIN': v.vin,
      'Mileage (KM)': v.current_mileage,
      'Hours': v.current_engine_hours,
      'Status': v.status,
      'Location': v.station_location
    }));
    exportToExcel(data, 'Fuel_Fleet_Trucks');
  };

  const handleExportPDF = () => {
    const headers = ['Vehicle ID', 'Plate Number', 'Fleet #', 'Make & Model', 'Coupled Trailer', 'Assigned Driver', 'Odometer (KM)', 'Station Depot', 'Status'];
    const rows = filteredVehicles.map(v => {
      const trl = trailers.find(t => t.id === v.assigned_trailer_id);
      const drv = drivers.find(d => d.id === v.assigned_driver_id);
      return [
        v.vehicle_id,
        v.plate_number,
        v.fleet_number || 'N/A',
        `${v.make} ${v.model}`,
        trl ? `${trl.trailer_id} (${trl.plate_number})` : 'Uncoupled',
        drv ? drv.full_name : 'Standby / Unassigned',
        `${v.current_mileage.toLocaleString()} KM`,
        v.station_location || 'Dammam',
        v.status
      ];
    });

    const activeCount = vehicles.filter(v => v.status === 'AVAILABLE' || v.status === 'ON_TRIP').length;
    const workshopCount = vehicles.filter(v => v.status === 'IN_WORKSHOP' || v.status === 'OUT_OF_SERVICE').length;

    exportToPDFReport(
      'Fuel Fleet Tractor Trucks Register',
      headers,
      rows,
      'Fuel_Fleet_Tractor_Trucks',
      {
        orientation: 'landscape',
        subtitle: 'Commercial Fuel Transportation Tractor Units, Assigned Tankers & Driver Roster Ledger',
        summaryKPIs: [
          { label: 'Total Tractor Heads', value: vehicles.length, color: 'slate' },
          { label: 'Operational & Dispatched', value: activeCount, color: 'emerald' },
          { label: 'In Maintenance / OOS', value: workshopCount, color: workshopCount > 0 ? 'rose' : 'emerald' }
        ],
        metadata: [
          { label: 'Status Filter', value: statusFilter },
          { label: 'Export Scope', value: `${filteredVehicles.length} vehicles listed` }
        ]
      }
    );
  };

  const getStatusBadge = (status: VehicleStatus) => {
    switch (status) {
      case 'AVAILABLE': return <Badge variant="success">AVAILABLE</Badge>;
      case 'ON_TRIP': return <Badge variant="info">ON TRIP</Badge>;
      case 'IN_WORKSHOP': return <Badge variant="amber">IN WORKSHOP</Badge>;
      case 'OUT_OF_SERVICE': return <Badge variant="danger">OUT OF SERVICE</Badge>;
      case 'SOLD': return <Badge variant="slate">SOLD</Badge>;
      case 'RETIRED': return <Badge variant="slate">RETIRED</Badge>;
      default: return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-600" /> Fuel Transport Tractor Trucks
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Master list of heavy fuel tractor head trucks, mileage telemetry, assigned drivers, and coupling status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded hover:bg-slate-200 border border-slate-200 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded hover:bg-slate-200 border border-slate-200 transition"
          >
            <FileText className="w-4 h-4 text-rose-600" /> PDF Report
          </button>
          {hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) && (
            <button
              onClick={() => {
                setEditingVehicle(undefined);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 text-slate-950 text-xs font-bold rounded hover:bg-amber-400 transition shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Fuel Truck
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-lg shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-amber-600 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Plate, Fleet #, VIN, Make..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 font-medium"
          >
            <option value="ALL">All Operational Statuses</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="ON_TRIP">ON TRIP</option>
            <option value="IN_WORKSHOP">IN WORKSHOP</option>
            <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
          </select>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-600 tracking-wider">
              <tr>
                <th className="p-3.5">Vehicle & Plate</th>
                <th className="p-3.5">Fleet #</th>
                <th className="p-3.5">Make & Model</th>
                <th className="p-3.5">Odometer (KM)</th>
                <th className="p-3.5">Assigned Driver</th>
                <th className="p-3.5">Assigned Trailer</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No trucks matching query criteria.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map(v => {
                  const driver = drivers.find(d => d.id === v.assigned_driver_id);
                  const trailer = trailers.find(t => t.id === v.assigned_trailer_id);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{v.vehicle_id}</div>
                        <div className="font-mono text-amber-700 text-[11px] font-semibold">{v.plate_number}</div>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-700">{v.fleet_number}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{v.make}</div>
                        <div className="text-slate-500 text-[10px]">{v.model} ({v.year})</div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-slate-900">{v.current_mileage.toLocaleString()} KM</div>
                        <div className="text-slate-500 text-[10px]">{v.current_engine_hours} Hours</div>
                      </td>
                      <td className="p-3.5">
                        {driver ? (
                          <div className="font-bold text-slate-900">{driver.full_name}</div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {trailer ? (
                          <div className="font-bold text-sky-700">{trailer.trailer_id}</div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3.5">{getStatusBadge(v.status)}</td>
                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => setSelectedVehicle(v)}
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) && (
                          <button
                            onClick={() => {
                              setEditingVehicle(v);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded transition"
                            title="Edit Vehicle"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission(['SUPER_ADMIN']) && (
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${v.vehicle_id}?`)) {
                                deleteVehicle(v.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-slate-100 rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      <VehicleFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialVehicle={editingVehicle}
      />

      {/* Detail Drawer */}
      <VehicleDetailDrawer
        vehicle={selectedVehicle}
        isOpen={!!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
      />
    </div>
  );
};

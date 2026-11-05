import React, { useState } from 'react';
import { 
  Plus, Search, Filter, Truck, Trash2, Edit3, Eye, FileSpreadsheet, FileText
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { TrailerFormModal } from './TrailerFormModal';
import { TrailerDetailDrawer } from './TrailerDetailDrawer';
import { Trailer, TrailerStatus } from '../../types';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';

export const TrailerList: React.FC = () => {
  const { trailers, deleteTrailer, vehicles } = useFleet();
  const { hasPermission } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTrailer, setSelectedTrailer] = useState<Trailer | null>(null);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | undefined>(undefined);

  const filteredTrailers = trailers.filter(t => {
    const matchesSearch = 
      t.trailer_id.toLowerCase().includes(search.toLowerCase()) ||
      t.plate_number.toLowerCase().includes(search.toLowerCase()) ||
      t.trailer_number.toLowerCase().includes(search.toLowerCase()) ||
      t.vin.toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportExcel = () => {
    const data = filteredTrailers.map(t => ({
      'Trailer ID': t.trailer_id,
      'Trailer #': t.trailer_number,
      'Plate Number': t.plate_number,
      'Capacity (Liters)': t.tank_capacity_liters,
      'Compartments': t.number_of_compartments,
      'Manufacturer': t.manufacturer,
      'VIN': t.vin,
      'Status': t.status,
      'Current Location': t.current_location
    }));
    exportToExcel(data, 'Fuel_Tanker_Trailers');
  };

  const handleExportPDF = () => {
    const headers = ['Trailer ID', 'Plate Number', 'Tank Type', 'Capacity (L)', 'Compartments', 'Coupled Tractor', 'Depot Location', 'Status'];
    const rows = filteredTrailers.map(t => {
      const tractor = vehicles.find(v => v.id === t.assigned_tractor_id);
      return [
        t.trailer_id,
        t.plate_number,
        t.tank_type || 'Fuel Tanker',
        `${t.tank_capacity_liters.toLocaleString()} L`,
        `${t.number_of_compartments} Compartments`,
        tractor ? `${tractor.vehicle_id} (${tractor.plate_number})` : 'Uncoupled',
        t.current_location || 'Dammam',
        t.status
      ];
    });

    const totalCap = trailers.reduce((sum, t) => sum + (t.tank_capacity_liters || 0), 0);
    const assignedCount = trailers.filter(t => t.status === 'ASSIGNED').length;

    exportToPDFReport(
      'Al-Noor Tanker Trailer Master Registry',
      headers,
      rows,
      'Tanker_Trailer_Master_Registry',
      {
        orientation: 'landscape',
        subtitle: 'Heavy Commercial Fuel Tanker Trailers, Shell Specifications, Coupling Matrix & Depots',
        summaryKPIs: [
          { label: 'Total Tankers', value: trailers.length, color: 'slate' },
          { label: 'Total Fleet Capacity', value: `${(totalCap / 1000).toLocaleString()}K Liters`, color: 'sky' },
          { label: 'Coupled to Tractor', value: assignedCount, color: 'emerald' }
        ],
        metadata: [
          { label: 'Status Filter', value: statusFilter },
          { label: 'Export Scope', value: `${filteredTrailers.length} trailers` }
        ]
      }
    );
  };

  const getStatusBadge = (status: TrailerStatus) => {
    switch (status) {
      case 'AVAILABLE': return <Badge variant="success">AVAILABLE</Badge>;
      case 'ASSIGNED': return <Badge variant="info">ASSIGNED</Badge>;
      case 'IN_WORKSHOP': return <Badge variant="amber">IN WORKSHOP</Badge>;
      case 'OUT_OF_SERVICE': return <Badge variant="danger">OUT OF SERVICE</Badge>;
      default: return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-3.5 rounded-md shadow-xs">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-sky-600" /> FUEL TANKER TRAILERS REGISTER
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Directory of multi-compartment fuel tankers, API bottom loading valves, and hydrostatic safety certifications.
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
              onClick={() => {
                setEditingTrailer(undefined);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 text-white text-xs font-bold rounded hover:bg-sky-500 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Tanker Trailer
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-md shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search Trailer ID, Plate, VIN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_WORKSHOP">IN WORKSHOP</option>
            <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
          </select>
        </div>
      </div>

      {/* Trailers Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
              <tr>
                <th className="p-2.5">Trailer ID & Plate</th>
                <th className="p-2.5">Tank Capacity</th>
                <th className="p-2.5">Compartments</th>
                <th className="p-2.5">Manufacturer</th>
                <th className="p-2.5">Coupled Tractor</th>
                <th className="p-2.5">Current Terminal</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredTrailers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    No tanker trailers found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTrailers.map(t => {
                  const tractor = vehicles.find(v => v.id === t.assigned_tractor_id);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5">
                        <div className="font-bold text-sky-700">{t.trailer_id}</div>
                        <div className="font-mono text-slate-600 text-[11px] font-semibold">{t.plate_number}</div>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">
                        {t.tank_capacity_liters.toLocaleString()} L
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700 border border-slate-200">
                          {t.number_of_compartments} Compartments
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{t.manufacturer}</div>
                        <div className="text-slate-500 text-[10px]">{t.model} ({t.year})</div>
                      </td>
                      <td className="p-2.5">
                        {tractor ? (
                          <div className="font-bold text-amber-700">{tractor.vehicle_id}</div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-700">{t.current_location}</td>
                      <td className="p-2.5">{getStatusBadge(t.status)}</td>
                      <td className="p-2.5 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTrailer(t)}
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) && (
                          <button
                            onClick={() => {
                              setEditingTrailer(t);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Edit Trailer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission(['SUPER_ADMIN']) && (
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete trailer ${t.trailer_id}?`)) {
                                deleteTrailer(t.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Delete Trailer"
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

        {/* Record Count Bar */}
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 font-mono">
          Showing 1–{filteredTrailers.length} of {trailers.length} fuel tanker trailer records
        </div>
      </div>

      <TrailerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialTrailer={editingTrailer}
      />

      <TrailerDetailDrawer
        trailer={selectedTrailer}
        isOpen={!!selectedTrailer}
        onClose={() => setSelectedTrailer(null)}
      />
    </div>
  );
};

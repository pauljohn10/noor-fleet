import React, { useState } from 'react';
import { 
  FileText, Plus, Search, Filter, AlertTriangle, CheckCircle2, 
  Clock, Edit3, Trash2, Eye, ShieldCheck, FileSpreadsheet, Download,
  Truck, Building2, Calendar, RefreshCw
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { VehicleDocument } from '../../types';
import { DocumentFormModal, COMMON_DOCUMENT_TYPES } from './DocumentFormModal';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';

export const DocumentList: React.FC = () => {
  const { documents, vehicles, trailers, deleteDocument } = useFleet();
  const { hasPermission, currentProfile } = useAuth();

  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);
  const isSuperAdmin = hasPermission(['SUPER_ADMIN']);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<VehicleDocument | null>(null);
  const [isViewOnly, setIsViewOnly] = useState<boolean>(false);

  // Search & Filter states
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assetFilter, setAssetFilter] = useState<'ALL' | 'VEHICLE' | 'TRAILER'>('ALL');

  // Feedback banner state
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const getDaysUntilExpiry = (expiryStr: string): number => {
    const exp = new Date(expiryStr);
    const today = new Date();
    exp.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
  };

  const getExpiryStatus = (expiryStr: string): 'EXPIRED' | 'EXPIRING_SOON' | 'VALID' => {
    const diff = getDaysUntilExpiry(expiryStr);
    if (diff < 0) return 'EXPIRED';
    if (diff <= 30) return 'EXPIRING_SOON';
    return 'VALID';
  };

  const getExpiryBadge = (expiryStr: string) => {
    const diff = getDaysUntilExpiry(expiryStr);

    if (diff < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono font-bold text-[11px] bg-rose-100 text-rose-900 border border-rose-300">
          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
          EXPIRED ({Math.abs(diff)}d ago)
        </span>
      );
    }
    if (diff === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono font-bold text-[11px] bg-rose-100 text-rose-900 border border-rose-300">
          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
          EXPIRES TODAY
        </span>
      );
    }
    if (diff <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono font-bold text-[11px] bg-rose-50 text-rose-800 border border-rose-200">
          <Clock className="w-3 h-3 text-rose-600 shrink-0" />
          EXPIRING IN {diff} DAYS
        </span>
      );
    }
    if (diff <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono font-bold text-[11px] bg-amber-100 text-amber-950 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-700 shrink-0" />
          EXPIRING IN {diff} DAYS
        </span>
      );
    }
    if (diff <= 60) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono font-semibold text-[11px] bg-sky-50 text-sky-800 border border-sky-200">
          <CheckCircle2 className="w-3 h-3 text-sky-600 shrink-0" />
          VALID ({diff}d left)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono font-semibold text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
        VALID ({diff}d left)
      </span>
    );
  };

  // Filtered documents
  const filteredDocuments = documents.filter(d => {
    const veh = vehicles.find(v => v.id === d.vehicle_id);
    const trl = trailers.find(t => t.id === d.trailer_id);
    const q = search.toLowerCase().trim();

    const matchesSearch = 
      !q ||
      d.document_number.toLowerCase().includes(q) ||
      d.document_type.toLowerCase().includes(q) ||
      (d.issuing_authority && d.issuing_authority.toLowerCase().includes(q)) ||
      (d.notes && d.notes.toLowerCase().includes(q)) ||
      (veh && (
        veh.vehicle_id.toLowerCase().includes(q) ||
        veh.plate_number.toLowerCase().includes(q) ||
        veh.fleet_number.toLowerCase().includes(q)
      )) ||
      (trl && (
        trl.trailer_id.toLowerCase().includes(q) ||
        trl.plate_number.toLowerCase().includes(q)
      ));

    const matchesType = typeFilter === 'ALL' || d.document_type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || getExpiryStatus(d.expiry_date) === statusFilter;
    const matchesAsset = 
      assetFilter === 'ALL' ||
      (assetFilter === 'VEHICLE' && Boolean(d.vehicle_id)) ||
      (assetFilter === 'TRAILER' && Boolean(d.trailer_id));

    return matchesSearch && matchesType && matchesStatus && matchesAsset;
  });

  // KPI calculations
  const totalCount = documents.length;
  const expiredCount = documents.filter(d => getExpiryStatus(d.expiry_date) === 'EXPIRED').length;
  const expiringSoonCount = documents.filter(d => getExpiryStatus(d.expiry_date) === 'EXPIRING_SOON').length;
  const compliantCount = totalCount - expiredCount - expiringSoonCount;

  const handleOpenAdd = () => {
    setEditingDoc(null);
    setIsViewOnly(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: VehicleDocument) => {
    setEditingDoc(doc);
    setIsViewOnly(false);
    setIsModalOpen(true);
  };

  const handleOpenView = (doc: VehicleDocument) => {
    setEditingDoc(doc);
    setIsViewOnly(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (doc: VehicleDocument) => {
    if (!isSuperAdmin) return;
    if (confirm(`Are you sure you want to delete ${doc.document_type} (Doc #: ${doc.document_number})?`)) {
      await deleteDocument(doc.id, currentProfile?.full_name || 'Super Admin');
      setFeedback({
        type: 'success',
        message: `Document ${doc.document_number} successfully deleted.`
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleExportExcel = () => {
    const data = filteredDocuments.map(d => {
      const veh = vehicles.find(v => v.id === d.vehicle_id);
      const trl = trailers.find(t => t.id === d.trailer_id);
      return {
        'Document Type': d.document_type,
        'Document Number': d.document_number,
        'Associated Asset': veh ? `${veh.vehicle_id} (${veh.plate_number})` : trl ? `${trl.trailer_id} (${trl.plate_number})` : 'Fleet Master',
        'Issuing Authority': d.issuing_authority || 'N/A',
        'Issue Date': d.issue_date || 'N/A',
        'Expiration Date': d.expiry_date,
        'Days Left': getDaysUntilExpiry(d.expiry_date),
        'Status': getExpiryStatus(d.expiry_date),
        'Last Updated': d.updated_at ? new Date(d.updated_at).toLocaleDateString() : 'N/A',
        'Updated By': d.updated_by || 'System'
      };
    });
    exportToExcel(data, 'Vehicle_Permits_Istimara_Register');
  };

  const handleExportPDF = () => {
    const headers = ['Document Type', 'Document #', 'Associated Unit', 'Issuing Authority', 'Issue Date', 'Expiry Date', 'Status'];
    const rows = filteredDocuments.map(d => {
      const veh = vehicles.find(v => v.id === d.vehicle_id);
      const trl = trailers.find(t => t.id === d.trailer_id);
      return [
        d.document_type,
        d.document_number,
        veh ? `${veh.vehicle_id} (${veh.plate_number})` : trl ? `${trl.trailer_id} (${trl.plate_number})` : 'Fleet Master',
        d.issuing_authority || 'Saudi Traffic Dept.',
        d.issue_date || 'N/A',
        d.expiry_date,
        getExpiryStatus(d.expiry_date)
      ];
    });

    exportToPDFReport(
      'Vehicle Permits & Istimara Compliance Register',
      headers,
      rows,
      'Vehicle_Permits_Istimara_Register',
      {
        orientation: 'landscape',
        subtitle: 'Official Saudi Traffic Department (Muroor), Saudi Aramco Terminal Loading & Civil Defense Register',
        summaryKPIs: [
          { label: 'Total Documents', value: totalCount, color: 'slate' },
          { label: 'Compliant & Valid', value: compliantCount, color: 'emerald' },
          { label: 'Expiring Soon (≤30d)', value: expiringSoonCount, color: 'amber' },
          { label: 'Expired (Urgent)', value: expiredCount, color: 'rose' }
        ],
        metadata: [
          { label: 'Status Filter', value: statusFilter },
          { label: 'Asset Category', value: assetFilter },
          { label: 'Export Scope', value: `${filteredDocuments.length} units listed` }
        ]
      }
    );
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                VEHICLE PERMITS & ISTIMARA REGISTER
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Saudi Istimara registration renewals, Comprehensive Insurance, Hydrostatic certificates, and Aramco loading permits.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF Report</span>
          </button>

          {canManage && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold animate-fade-in ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[11px] underline opacity-70 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Total Tracked Documents</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {totalCount}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Istimara, Insurance & Permits</p>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-2xs bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700 text-[10px] font-bold uppercase tracking-wider">
            <span>Expired (Urgent Renewal)</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-700 mt-1">
            {expiredCount}
          </div>
          <p className="text-[10px] text-rose-600/80 mt-0.5">Immediate legal risk</p>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-2xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-800 text-[10px] font-bold uppercase tracking-wider">
            <span>Expiring Soon (≤30 Days)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-700 mt-1">
            {expiringSoonCount}
          </div>
          <p className="text-[10px] text-amber-700/80 mt-0.5">Renewal action required</p>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
            <span>Active & Compliant</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {compliantCount}
          </div>
          <p className="text-[10px] text-emerald-700/80 mt-0.5">Valid highway permits</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Document #, Unit Plate, Authority..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Expiry Statuses</option>
                <option value="EXPIRED">Expired</option>
                <option value="EXPIRING_SOON">Expiring Soon (≤30 Days)</option>
                <option value="VALID">Valid & Compliant</option>
              </select>
            </div>

            {/* Document Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-amber-500 max-w-[200px] truncate"
            >
              <option value="ALL">All Document Types</option>
              {COMMON_DOCUMENT_TYPES.map((t: string) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Asset Category Filter */}
            <select
              value={assetFilter}
              onChange={e => setAssetFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Asset Types</option>
              <option value="VEHICLE">Tractor Trucks</option>
              <option value="TRAILER">Tanker Trailers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3 px-3.5">Document Type & Spec</th>
                <th className="py-3 px-3.5">Document Number</th>
                <th className="py-3 px-3.5">Associated Fleet Unit</th>
                <th className="py-3 px-3.5">Issuing Authority</th>
                <th className="py-3 px-3.5">Issue Date</th>
                <th className="py-3 px-3.5">Expiration Date</th>
                <th className="py-3 px-3.5">Status Alert</th>
                <th className="py-3 px-3.5">Last Renewal Audit</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No vehicle permits or registration records matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map(d => {
                  const veh = vehicles.find(v => v.id === d.vehicle_id);
                  const trl = trailers.find(t => t.id === d.trailer_id);
                  const daysLeft = getDaysUntilExpiry(d.expiry_date);
                  const isExpired = daysLeft < 0;
                  const isExpiringSoon = daysLeft >= 0 && daysLeft <= 30;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Document Type */}
                      <td className="py-3 px-3.5">
                        <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{d.document_type}</span>
                        </div>
                        {d.notes && (
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">
                            {d.notes}
                          </p>
                        )}
                      </td>

                      {/* Document Number */}
                      <td className="py-3 px-3.5">
                        <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {d.document_number}
                        </span>
                      </td>

                      {/* Associated Unit */}
                      <td className="py-3 px-3.5">
                        {veh ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-bold text-slate-900">
                              <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{veh.vehicle_id}</span>
                              <span className="font-mono text-slate-700 bg-slate-100 px-1 rounded text-[10px]">
                                {veh.plate_number}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Fleet #{veh.fleet_number} • {veh.make} {veh.model}
                            </span>
                          </div>
                        ) : trl ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-bold text-sky-900">
                              <Truck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span>{trl.trailer_id}</span>
                              <span className="font-mono text-slate-700 bg-slate-100 px-1 rounded text-[10px]">
                                {trl.plate_number}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Cap: {(trl.tank_capacity_liters || 0).toLocaleString()} L
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-600 font-bold">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Fleet Master Policy</span>
                          </div>
                        )}
                      </td>

                      {/* Issuing Authority */}
                      <td className="py-3 px-3.5 text-slate-700">
                        {d.issuing_authority || 'N/A'}
                      </td>

                      {/* Issue Date */}
                      <td className="py-3 px-3.5 font-mono text-slate-600 text-[11px]">
                        {d.issue_date || '—'}
                      </td>

                      {/* Expiration Date */}
                      <td className="py-3 px-3.5">
                        <span className={`font-mono font-extrabold text-xs ${
                          isExpired ? 'text-rose-600' : isExpiringSoon ? 'text-amber-700' : 'text-slate-900'
                        }`}>
                          {d.expiry_date}
                        </span>
                      </td>

                      {/* Status Alert Badge */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {getExpiryBadge(d.expiry_date)}
                      </td>

                      {/* Last Renewal Audit */}
                      <td className="py-3 px-3.5 text-[11px] text-slate-500 font-mono">
                        {d.updated_at ? (
                          <div>
                            <div>{new Date(d.updated_at).toLocaleDateString()}</div>
                            {d.updated_by && <div className="text-[10px] text-slate-400 truncate max-w-[100px]">{d.updated_by}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-400">Initial Setup</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap space-x-1">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(d)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-2xs transition active:scale-95 cursor-pointer"
                            title="Edit & Renew Document Expiration Date"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                            <span>Edit / Renew</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenView(d)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition cursor-pointer"
                            title="View Document Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        )}

                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDelete(d)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Record count footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 font-mono flex items-center justify-between">
          <span>
            Showing {filteredDocuments.length} of {documents.length} registered vehicle documents & legal permits
          </span>
          <span className="text-emerald-700 font-semibold">
            Absher & Mouror Compliance Monitoring Active
          </span>
        </div>
      </div>

      {/* Edit / Renew & Create Document Modal */}
      <DocumentFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDoc(null);
          setIsViewOnly(false);
        }}
        initialDoc={editingDoc}
        isReadOnly={isViewOnly}
      />
    </div>
  );
};

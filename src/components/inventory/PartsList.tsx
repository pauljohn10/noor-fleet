import React, { useState } from 'react';
import { 
  Package, Plus, Search, Filter, AlertTriangle, DollarSign, FileSpreadsheet, FileText, Edit3
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { PartFormModal } from './PartFormModal';
import { Part } from '../../types';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';
import { Modal } from '../common/Modal';

export const PartsList: React.FC = () => {
  const { parts, receivePartStock, adjustPartStock } = useFleet();
  const { hasPermission, currentProfile } = useAuth();

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<string>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [editingPart, setEditingPart] = useState<Part | undefined>(undefined);

  // Stock Receive modal state
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [receiveQty, setReceiveQty] = useState(10);
  const [receiveUnitCost, setReceiveUnitCost] = useState(250);

  // Stock Adjustment modal state
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustNewStock, setAdjustNewStock] = useState(10);
  const [adjustNotes, setAdjustNotes] = useState('');

  const filteredParts = parts.filter(p => {
    const matchesSearch = 
      p.part_number.toLowerCase().includes(search.toLowerCase()) ||
      p.part_name.toLowerCase().includes(search.toLowerCase()) ||
      p.location_rack.toLowerCase().includes(search.toLowerCase());
      
    let matchesStock = true;
    if (stockFilter === 'LOW') matchesStock = p.current_stock <= p.minimum_stock;
    if (stockFilter === 'OK') matchesStock = p.current_stock > p.minimum_stock;

    return matchesSearch && matchesStock;
  });

  const totalInventoryValue = parts.reduce((sum, p) => sum + (p.current_stock * p.unit_cost), 0);
  const lowStockCount = parts.filter(p => p.current_stock <= p.minimum_stock).length;

  const handleExportExcel = () => {
    const data = filteredParts.map(p => ({
      'Part Number': p.part_number,
      'Part Name': p.part_name,
      'Category': p.category_id,
      'Location Rack': p.location_rack,
      'Current Stock': p.current_stock,
      'Min Stock': p.minimum_stock,
      'Unit Cost (SAR)': p.unit_cost,
      'Total Value (SAR)': p.current_stock * p.unit_cost
    }));
    exportToExcel(data, 'Spare_Parts_Inventory');
  };

  const handleExportPDF = () => {
    const headers = ['Part Number', 'Part Name & Specification', 'Warehouse Rack', 'Current Stock', 'Min Threshold', 'Unit Cost', 'Stock Valuation', 'Status'];
    const rows = filteredParts.map(p => {
      const isLow = p.current_stock <= p.minimum_stock;
      return [
        p.part_number,
        p.part_name,
        p.location_rack || 'Main Store',
        `${(p.current_stock || 0).toLocaleString()} ${p.unit}`,
        `${(p.minimum_stock || 0).toLocaleString()} ${p.unit}`,
        `${(p.unit_cost || 0).toLocaleString()} SAR`,
        `${((p.current_stock || 0) * (p.unit_cost || 0)).toLocaleString()} SAR`,
        isLow ? 'LOW STOCK' : 'IN STOCK'
      ];
    });

    const totalValuation = parts.reduce((sum, p) => sum + (p.current_stock * p.unit_cost), 0);
    const lowStockCount = parts.filter(p => p.current_stock <= p.minimum_stock).length;

    exportToPDFReport(
      'Al-Noor Workshop Spare Parts Inventory Valuation',
      headers,
      rows,
      'Parts_Inventory_Report',
      {
        orientation: 'landscape',
        subtitle: 'Central Workshop Storehouse Inventory Valuation, Stock Balances & Reorder Thresholds',
        summaryKPIs: [
          { label: 'Total Catalog SKUs', value: parts.length, color: 'slate' },
          { label: 'Total Store Valuation', value: `${(totalValuation || 0).toLocaleString()} SAR`, color: 'emerald' },
          { label: 'Low Stock Alerts', value: lowStockCount, color: lowStockCount > 0 ? 'amber' : 'emerald' }
        ],
        metadata: [
          { label: 'Stock Filter', value: stockFilter === 'LOW' ? 'Low Stock Only' : 'All Inventory Items' },
          { label: 'Export Scope', value: `${filteredParts.length} SKUs listed` }
        ]
      }
    );
  };

  const handleReceiveStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;
    receivePartStock(selectedPart.id, receiveQty, receiveUnitCost, currentProfile.full_name);
    setIsReceiveOpen(false);
    setSelectedPart(null);
  };

  const handleAdjustStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;
    adjustPartStock(selectedPart.id, adjustNewStock, adjustNotes || 'Physical count audit adjustment', currentProfile.full_name);
    setIsAdjustOpen(false);
    setSelectedPart(null);
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-3.5 rounded-md shadow-xs">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-600" /> SPARE PARTS STORE & INVENTORY REGISTER
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Stock receiving, bin locations, work order deductions, minimum reorder thresholds, and inventory valuation.
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
                setEditingPart(undefined);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-slate-950 text-xs font-bold rounded hover:bg-amber-600 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Part
            </button>
          )}
        </div>
      </div>

      {/* COMPACT ERP SUMMARY BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded-md flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Inventory Valuation</p>
            <p className="text-base font-extrabold font-mono text-emerald-800 mt-0.5">{(totalInventoryValue || 0).toLocaleString()} SAR</p>
          </div>
          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-700">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-md flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Registered SKUs</p>
            <p className="text-base font-extrabold font-mono text-slate-900 mt-0.5">{parts.length} SKUs</p>
          </div>
          <div className="p-2 bg-purple-50 border border-purple-200 rounded text-purple-700">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-md flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Low Stock Alerts</p>
            <p className="text-base font-extrabold font-mono text-rose-800 mt-0.5">{lowStockCount} SKUs</p>
          </div>
          <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-md shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search Part #, Name, Location Rack..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="LOW">Low Stock Only (&le; Min)</option>
            <option value="OK">Sufficient Stock (&gt; Min)</option>
          </select>
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
              <tr>
                <th className="p-2.5">Part Number & Name</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Bin Location</th>
                <th className="p-2.5">Current Stock</th>
                <th className="p-2.5">Min / Max</th>
                <th className="p-2.5">Unit Cost</th>
                <th className="p-2.5">Total Value</th>
                <th className="p-2.5 text-right">Store Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    No spare parts found matching query.
                  </td>
                </tr>
              ) : (
                filteredParts.map(p => {
                  const isLow = p.current_stock <= p.minimum_stock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5">
                        <div className="font-mono font-bold text-amber-700">{p.part_number}</div>
                        <div className="font-bold text-slate-900 text-xs mt-0.5">{p.part_name}</div>
                      </td>
                      <td className="p-2.5 font-semibold text-slate-600">{p.category_id}</td>
                      <td className="p-2.5 font-mono text-slate-700">{p.location_rack}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                          isLow ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {p.current_stock} {p.unit}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-500">
                        {p.minimum_stock} / {p.maximum_stock}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">{p.unit_cost} SAR</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-800">
                        {((p.current_stock || 0) * (p.unit_cost || 0)).toLocaleString()} SAR
                      </td>
                      <td className="p-2.5 text-right space-x-1 whitespace-nowrap">
                        {hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']) && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPart(p);
                                setReceiveUnitCost(p.unit_cost);
                                setIsReceiveOpen(true);
                              }}
                              className="px-2 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded font-bold text-[10px] cursor-pointer"
                            >
                              + Receive
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPart(p);
                                setAdjustNewStock(p.current_stock);
                                setIsAdjustOpen(true);
                              }}
                              className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded font-semibold text-[10px] cursor-pointer"
                            >
                              Adjust
                            </button>
                            <button
                              onClick={() => {
                                setEditingPart(p);
                                setIsFormOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded transition cursor-pointer inline-flex items-center align-middle"
                              title="Edit Part"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
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
          Showing 1–{filteredParts.length} of {parts.length} spare parts inventory SKUs
        </div>
      </div>

      <PartFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialPart={editingPart}
      />

      {/* Stock Receive Modal */}
      {isReceiveOpen && selectedPart && (
        <Modal
          isOpen={isReceiveOpen}
          onClose={() => setIsReceiveOpen(false)}
          title={`Receive Purchase Stock: ${selectedPart.part_number}`}
          subtitle={`Current Available Stock: ${selectedPart.current_stock} ${selectedPart.unit} • ${selectedPart.part_name}`}
          maxWidth="lg"
        >
          <form onSubmit={handleReceiveStockSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Quantity Received ({selectedPart.unit}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={receiveQty}
                onChange={e => setReceiveQty(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Unit Purchase Cost (SAR)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={receiveUnitCost}
                onChange={e => setReceiveUnitCost(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-emerald-700 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsReceiveOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                Confirm Stock Receipt
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Stock Adjust Modal */}
      {isAdjustOpen && selectedPart && (
        <Modal
          isOpen={isAdjustOpen}
          onClose={() => setIsAdjustOpen(false)}
          title={`Stock Adjustment Audit: ${selectedPart.part_number}`}
          subtitle={`Current Registered Stock: ${selectedPart.current_stock} ${selectedPart.unit} • ${selectedPart.part_name}`}
          maxWidth="lg"
        >
          <form onSubmit={handleAdjustStockSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                New Audited Stock Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                required
                value={adjustNewStock}
                onChange={e => setAdjustNewStock(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-amber-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Adjustment Reason / Physical Audit Notes <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Reason for discrepancy (e.g. Physical inventory count variance, damaged stock write-off)..."
                value={adjustNotes}
                onChange={e => setAdjustNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsAdjustOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                Save Adjustment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Package, Plus, AlertTriangle, ArrowDownRight, ArrowUpRight, DollarSign, RefreshCw, FileText
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { PartFormModal } from '../inventory/PartFormModal';
import { Modal } from '../common/Modal';

interface StorekeeperDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const StorekeeperDashboard: React.FC<StorekeeperDashboardProps> = ({ onNavigateTab }) => {
  const { parts, receivePartStock, adjustPartStock, workOrders } = useFleet();

  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [receiveQty, setReceiveQty] = useState(10);

  const lowStockParts = parts.filter(p => p.current_stock <= p.minimum_stock && p.current_stock > 0);
  const outOfStockParts = parts.filter(p => p.current_stock === 0);
  const totalValuation = parts.reduce((sum, p) => sum + (p.current_stock * p.unit_cost), 0);

  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;
    receivePartStock(selectedPart.id, receiveQty, selectedPart.unit_cost, 'Storekeeper');
    setIsReceiveOpen(false);
    setSelectedPart(null);
  };

  return (
    <div className="space-y-6">
      {/* Storekeeper Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-black tracking-tight text-slate-100">Spare Parts Store & Warehouse Control</h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-purple-500/20 text-purple-300 rounded border border-purple-500/40 uppercase">
              Storekeeper Focus
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Spare parts catalog management, inventory receiving, work order issuances, and physical stock count audits.
          </p>
        </div>

        {/* Storekeeper Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPartModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-500 text-slate-950 font-extrabold text-xs rounded-lg hover:bg-purple-400 transition"
          >
            <Plus className="w-4 h-4" /> Add Spare Part SKU
          </button>
          <button
            onClick={() => onNavigateTab('inventory')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 text-slate-200 font-bold text-xs rounded-lg hover:bg-slate-700 transition"
          >
            <Package className="w-4 h-4 text-amber-400" /> Full Inventory Catalog
          </button>
        </div>
      </div>

      {/* Storekeeper KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard
          title="TOTAL PARTS SKUS"
          value={parts.length}
          subtitle="Catalog SKUs"
          icon={<Package className="w-4 h-4 text-purple-400" />}
          color="purple"
          onClick={() => onNavigateTab('inventory')}
        />
        <StatCard
          title="LOW STOCK"
          value={lowStockParts.length}
          subtitle="&le; Min Threshold"
          icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
          color="amber"
          onClick={() => onNavigateTab('inventory')}
        />
        <StatCard
          title="OUT OF STOCK"
          value={outOfStockParts.length}
          subtitle="0 Available"
          icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
          color="rose"
          onClick={() => onNavigateTab('inventory')}
        />
        <StatCard
          title="TODAY RECEIVING"
          value={12}
          subtitle="Stock Receipts"
          icon={<ArrowDownRight className="w-4 h-4 text-emerald-400" />}
          color="emerald"
        />
        <StatCard
          title="TODAY ISSUES"
          value={18}
          subtitle="Issued to WOs"
          icon={<ArrowUpRight className="w-4 h-4 text-sky-400" />}
          color="blue"
        />
        <StatCard
          title="RETURNS"
          value={2}
          subtitle="Unused Parts"
          icon={<RefreshCw className="w-4 h-4 text-amber-400" />}
          color="amber"
        />
        <StatCard
          title="STORE VALUATION"
          value={`${totalValuation.toLocaleString()} SAR`}
          subtitle="Stock Value"
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
          color="emerald"
        />
      </div>

      {/* Storekeeper Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Warning List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Low Stock Inventory Items
          </h3>

          <div className="space-y-3 text-xs">
            {lowStockParts.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No low stock warnings. All items above threshold.</div>
            ) : (
              lowStockParts.map(p => (
                <div key={p.id} className="p-3.5 bg-slate-950/60 border border-amber-500/30 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-amber-400">{p.part_number}</span>
                    <p className="font-bold text-slate-200 mt-0.5">{p.part_name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Rack: {p.location_rack}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-300 font-bold font-mono rounded-lg">
                      {p.current_stock} / Min {p.minimum_stock}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedPart(p);
                        setIsReceiveOpen(true);
                      }}
                      className="block text-[10px] text-emerald-400 font-bold mt-1 hover:underline ml-auto"
                    >
                      + Receive Stock
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Most Consumed Parts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-400" /> Most Frequently Consumed Parts
          </h3>

          <div className="space-y-3 text-xs">
            {parts.slice(0, 4).map(p => (
              <div key={p.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-purple-400">{p.part_number}</span>
                  <p className="font-bold text-slate-200 mt-0.5">{p.part_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-slate-200">{p.unit_cost} SAR / {p.unit}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Location: {p.location_rack}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PartFormModal
        isOpen={isPartModalOpen}
        onClose={() => setIsPartModalOpen(false)}
      />

      {isReceiveOpen && selectedPart && (
        <Modal
          isOpen={isReceiveOpen}
          onClose={() => setIsReceiveOpen(false)}
          title={`Receive Stock: ${selectedPart.part_number}`}
          subtitle={`${selectedPart.name} | Current In Stock: ${selectedPart.current_stock} ${selectedPart.unit_of_measure}`}
          maxWidth="md"
        >
          <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-950 block">{selectedPart.name}</span>
                <span className="text-[10px] text-amber-700 font-mono">Location: {selectedPart.warehouse_location || 'Main Depot'}</span>
              </div>
              <span className="text-xs font-mono font-extrabold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                Qty: {selectedPart.current_stock}
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Quantity Received <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={receiveQty}
                onChange={e => setReceiveQty(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsReceiveOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                Confirm Receipt
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

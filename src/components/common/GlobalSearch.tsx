import React, { useState, useEffect } from 'react';
import { Search, Truck, Wrench, Package, FileText, User } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useI18n } from '../../context/I18nContext';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult?: (type: string, id: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  onSelectResult
}) => {
  const { vehicles, trailers, workOrders, parts, drivers, technicians } = useFleet();
  const { t, isRTL } = useI18n();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const matchedVehicles = q ? vehicles.filter(v => 
    v.plate_number.toLowerCase().includes(q) || 
    v.vehicle_id.toLowerCase().includes(q) ||
    v.fleet_number.toLowerCase().includes(q) ||
    v.vin.toLowerCase().includes(q)
  ) : [];

  const matchedTrailers = q ? trailers.filter(t => 
    t.plate_number.toLowerCase().includes(q) || 
    t.trailer_id.toLowerCase().includes(q) ||
    t.trailer_number.toLowerCase().includes(q) ||
    t.vin.toLowerCase().includes(q)
  ) : [];

  const matchedWorkOrders = q ? workOrders.filter(w => 
    w.work_order_number.toLowerCase().includes(q) || 
    w.problem_description.toLowerCase().includes(q)
  ) : [];

  const matchedParts = q ? parts.filter(p => 
    p.part_number.toLowerCase().includes(q) || 
    p.part_name.toLowerCase().includes(q)
  ) : [];

  const matchedDrivers = q ? drivers.filter(d => 
    d.full_name.toLowerCase().includes(q) || 
    d.employee_id.toLowerCase().includes(q)
  ) : [];

  const matchedTechs = q ? technicians.filter(t => 
    t.full_name.toLowerCase().includes(q) || 
    t.employee_id.toLowerCase().includes(q)
  ) : [];

  const hasResults = matchedVehicles.length > 0 || matchedTrailers.length > 0 || 
                     matchedWorkOrders.length > 0 || matchedParts.length > 0 || 
                     matchedDrivers.length > 0 || matchedTechs.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-slate-950/50">
          <Search className="w-5 h-5 text-amber-400 mr-3 rtl:mr-0 rtl:ml-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={isRTL ? "البحث الشامل باللوحة، رقم الشاحنة، رقم الهيكل، أمر العمل، قطعة الغيار، السائق..." : "Global Search by Plate, Fleet #, VIN, Work Order #, Part #, Driver..."}
            className="w-full bg-transparent text-slate-100 text-sm focus:outline-none placeholder-slate-500"
          />
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-semibold bg-slate-800 text-slate-400 rounded hover:text-slate-200 transition"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 text-xs">
          {!q && (
            <div className="text-center py-8 text-slate-500">
              <Search className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
              <p className="text-sm font-medium">
                {isRTL ? 'اكتب للبحث الفوري في سجلات الشاحنات، الصهاريج، أوامر الصيانة، قطع الغيار، وطاقم العمل' : 'Type to search across Trucks, Trailers, Work Orders, Parts & Staff'}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {isRTL ? 'جرب البحث بـ "TRK-0101" أو "أمر عمل" أو "فرامل" أو اسم السائق' : 'Try "TRK-0101", "WO-2026", "LBR-4921", or "Brake Pad"'}
              </p>
            </div>
          )}

          {q && !hasResults && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">
                {isRTL ? `لا توجد نتائج مطابقة لـ "${query}"` : `No matching fleet records found for "${query}"`}
              </p>
            </div>
          )}

          {matchedVehicles.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-400" /> {isRTL ? 'شاحنات ورؤوس النقل' : 'Tractor Head Trucks'} ({matchedVehicles.length})
              </div>
              <div className="space-y-1">
                {matchedVehicles.map(v => (
                  <div
                    key={v.id}
                    onClick={() => {
                      onSelectResult?.('vehicle', v.id);
                      onClose();
                    }}
                    className="p-3 bg-slate-800/40 hover:bg-slate-800 rounded-lg cursor-pointer flex items-center justify-between border border-slate-800"
                  >
                    <div>
                      <span className="font-bold text-slate-200 text-sm">{v.vehicle_id} ({v.plate_number})</span>
                      <span className="ml-2 rtl:ml-0 rtl:mr-2 text-xs text-slate-400">{v.make} {v.model} - Fleet #{v.fleet_number}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold">{t(v.status, v.status)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchedTrailers.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-sky-400" /> {isRTL ? 'مقطورات وصهاريج الوقود' : 'Tanker Trailers'} ({matchedTrailers.length})
              </div>
              <div className="space-y-1">
                {matchedTrailers.map(t => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onSelectResult?.('trailer', t.id);
                      onClose();
                    }}
                    className="p-3 bg-slate-800/40 hover:bg-slate-800 rounded-lg cursor-pointer flex items-center justify-between border border-slate-800"
                  >
                    <div>
                      <span className="font-bold text-slate-200 text-sm">{t.trailer_id} ({t.plate_number})</span>
                      <span className="ml-2 text-xs text-slate-400">{t.tank_capacity_liters.toLocaleString()} L - {t.number_of_compartments} Compartments</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-semibold">{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchedWorkOrders.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-emerald-400" /> Work Orders / Job Cards ({matchedWorkOrders.length})
              </div>
              <div className="space-y-1">
                {matchedWorkOrders.map(w => (
                  <div
                    key={w.id}
                    onClick={() => {
                      onSelectResult?.('workOrder', w.id);
                      onClose();
                    }}
                    className="p-3 bg-slate-800/40 hover:bg-slate-800 rounded-lg cursor-pointer flex items-center justify-between border border-slate-800"
                  >
                    <div>
                      <span className="font-bold text-slate-200 text-sm">{w.work_order_number}</span>
                      <span className="ml-2 text-xs text-slate-400 line-clamp-1">{w.problem_description}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">{w.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchedParts.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-purple-400" /> Spare Parts Store ({matchedParts.length})
              </div>
              <div className="space-y-1">
                {matchedParts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectResult?.('part', p.id);
                      onClose();
                    }}
                    className="p-3 bg-slate-800/40 hover:bg-slate-800 rounded-lg cursor-pointer flex items-center justify-between border border-slate-800"
                  >
                    <div>
                      <span className="font-bold text-slate-200 text-sm">{p.part_number}</span>
                      <span className="ml-2 text-xs text-slate-400">{p.part_name}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Stock: {p.current_stock}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Part } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { Package, AlertTriangle, Loader2, ShieldCheck, Layers, MapPin } from 'lucide-react';

interface PartFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPart?: Part;
}

export const PartFormModal: React.FC<PartFormModalProps> = ({
  isOpen,
  onClose,
  initialPart
}) => {
  const { addPart, updatePart } = useFleet();

  const [partNumber, setPartNumber] = useState(initialPart?.part_number || '');
  const [partName, setPartName] = useState(initialPart?.part_name || '');
  const [categoryName, setCategoryName] = useState(initialPart?.category_id || 'Engine & Filters');
  const [manufacturer, setManufacturer] = useState(initialPart?.manufacturer || '');
  const [unit, setUnit] = useState(initialPart?.unit || 'PCS');
  const [minimumStock, setMinimumStock] = useState(initialPart?.minimum_stock || 5);
  const [maximumStock, setMaximumStock] = useState(initialPart?.maximum_stock || 50);
  const [currentStock, setCurrentStock] = useState(initialPart?.current_stock || 10);
  const [locationRack, setLocationRack] = useState(initialPart?.location_rack || 'Rack A-01');
  const [unitCost, setUnitCost] = useState(initialPart?.unit_cost || 250);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialPart) {
      setPartNumber(initialPart.part_number);
      setPartName(initialPart.part_name);
      setCategoryName(initialPart.category_id);
      setManufacturer(initialPart.manufacturer || '');
      setUnit(initialPart.unit);
      setMinimumStock(initialPart.minimum_stock);
      setMaximumStock(initialPart.maximum_stock);
      setCurrentStock(initialPart.current_stock);
      setLocationRack(initialPart.location_rack);
      setUnitCost(initialPart.unit_cost);
    } else {
      setPartNumber('');
      setPartName('');
      setCategoryName('Engine & Filters');
      setManufacturer('');
      setUnit('PCS');
      setMinimumStock(5);
      setMaximumStock(50);
      setCurrentStock(10);
      setLocationRack('Rack A-01');
      setUnitCost(250);
    }
    setErrorMessage(null);
  }, [initialPart, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanNum = partNumber.trim();
    const cleanName = partName.trim();

    if (!cleanNum || !cleanName) {
      setErrorMessage('Please fill in required fields: Part Number and Part Name.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        part_number: cleanNum.toUpperCase(),
        part_name: cleanName,
        category_id: categoryName,
        manufacturer: manufacturer.trim() || undefined,
        unit,
        minimum_stock: Number(minimumStock) || 0,
        maximum_stock: Number(maximumStock) || 0,
        current_stock: Number(currentStock) || 0,
        location_rack: locationRack.trim(),
        unit_cost: Number(unitCost) || 0,
        status: (Number(currentStock) <= Number(minimumStock)) ? ('LOW_STOCK' as const) : ('IN_STOCK' as const)
      };

      if (initialPart) {
        updatePart(initialPart.id, payload);
      } else {
        addPart(payload);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving the spare part.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalFooter = (
    <>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Inventory tracked across Dammam Workshop Storehouse with automated reorder alerts.</span>
      </div>

      <div className="flex items-center justify-end gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition active:scale-95 cursor-pointer shadow-2xs disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="part-form"
          disabled={isSubmitting}
          className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Saving Part...</span>
            </>
          ) : (
            <span>{initialPart ? 'Save Part Record' : 'Register Spare Part'}</span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialPart ? `Edit Spare Part: ${initialPart.part_number}` : 'Register New Spare Part in Catalog'}
      subtitle="Configure minimum stock alert thresholds, unit cost, and rack bin location."
      icon={<Package className="w-5 h-5 text-amber-600" />}
      footer={modalFooter}
      maxWidth="3xl"
    >
      <form id="part-form" onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold text-xs">{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Part Identity */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">1</span>
              <Package className="w-4 h-4 text-slate-500" />
              <span>Part Identification & Classification</span>
            </div>
            <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
              * Required fields
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Part Number / SKU <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. FIL-VOL-1512"
                value={partNumber}
                onChange={e => setPartNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold uppercase placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Part Name / Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Volvo Engine Primary Fuel Filter Element"
                value={partName}
                onChange={e => setPartName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
              <select
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="Engine & Filters">Engine & Filters</option>
                <option value="Brakes & Pneumatics">Brakes & Pneumatics</option>
                <option value="Tires & Wheels">Tires & Wheels</option>
                <option value="Electrical & Sensors">Electrical & Sensors</option>
                <option value="Tanker Discharge Valves">Tanker Discharge Valves</option>
                <option value="Suspension & Steering">Suspension & Steering</option>
                <option value="Lubricants & Fluids">Lubricants & Fluids</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Manufacturer / Brand</label>
              <input
                type="text"
                placeholder="e.g. Bosch / Donaldson"
                value={manufacturer}
                onChange={e => setManufacturer(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Unit of Measure</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="PCS">Pieces (PCS)</option>
                <option value="SET">Set / Kit (SET)</option>
                <option value="LITERS">Liters (L)</option>
                <option value="BOX">Box (BOX)</option>
                <option value="ROLL">Roll (ROLL)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Stock Levels & Valuation */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">2</span>
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Stock Quantities, Thresholds & Bin Location</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Current Stock Qty</label>
              <input
                type="number"
                min={0}
                value={currentStock}
                onChange={e => setCurrentStock(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Min Alert Stock</label>
              <input
                type="number"
                min={0}
                value={minimumStock}
                onChange={e => setMinimumStock(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-amber-700 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Max Capacity</label>
              <input
                type="number"
                min={0}
                value={maximumStock}
                onChange={e => setMaximumStock(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Unit Cost (SAR)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={e => setUnitCost(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-emerald-700 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Rack / Bin Location</label>
              <input
                type="text"
                placeholder="e.g. Rack A-12"
                value={locationRack}
                onChange={e => setLocationRack(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

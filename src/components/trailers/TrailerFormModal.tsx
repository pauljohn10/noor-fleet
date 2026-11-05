import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Trailer, TrailerStatus } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { Truck, ShieldCheck, AlertTriangle, Loader2, FileText, Droplets, Link2 } from 'lucide-react';

interface TrailerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrailer?: Trailer;
}

export const TrailerFormModal: React.FC<TrailerFormModalProps> = ({
  isOpen,
  onClose,
  initialTrailer
}) => {
  const { addTrailer, updateTrailer, vehicles } = useFleet();

  const [trailerId, setTrailerId] = useState(initialTrailer?.trailer_id || `TRL-${Math.floor(200 + Math.random() * 800)}`);
  const [trailerNumber, setTrailerNumber] = useState(initialTrailer?.trailer_number || `T-${Math.floor(200 + Math.random() * 800)}`);
  const [plateNumber, setPlateNumber] = useState(initialTrailer?.plate_number || '');
  const [tankCapacityLiters, setTankCapacityLiters] = useState(initialTrailer?.tank_capacity_liters || 36000);
  const [numberOfCompartments, setNumberOfCompartments] = useState(initialTrailer?.number_of_compartments || 4);
  const [manufacturer, setManufacturer] = useState(initialTrailer?.manufacturer || 'Al-Mutlaq Tankers');
  const [model, setModel] = useState(initialTrailer?.model || '36K-ALU-4C');
  const [year, setYear] = useState(initialTrailer?.year || 2023);
  const [vin, setVin] = useState(initialTrailer?.vin || '');
  const [tankType, setTankType] = useState(initialTrailer?.tank_type || 'Aluminum Alloy Fuel Tanker');
  const [assignedTractorId, setAssignedTractorId] = useState(initialTrailer?.assigned_tractor_id || '');
  const [status, setStatus] = useState<TrailerStatus>(initialTrailer?.status || 'AVAILABLE');
  const [currentLocation, setCurrentLocation] = useState(initialTrailer?.current_location || 'Dammam Fuel Terminal');
  const [notes, setNotes] = useState(initialTrailer?.notes || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialTrailer) {
      setTrailerId(initialTrailer.trailer_id);
      setTrailerNumber(initialTrailer.trailer_number);
      setPlateNumber(initialTrailer.plate_number);
      setTankCapacityLiters(initialTrailer.tank_capacity_liters);
      setNumberOfCompartments(initialTrailer.number_of_compartments);
      setManufacturer(initialTrailer.manufacturer);
      setModel(initialTrailer.model);
      setYear(initialTrailer.year);
      setVin(initialTrailer.vin);
      setTankType(initialTrailer.tank_type);
      setAssignedTractorId(initialTrailer.assigned_tractor_id || '');
      setStatus(initialTrailer.status);
      setCurrentLocation(initialTrailer.current_location);
      setNotes(initialTrailer.notes || '');
    } else {
      const randNum = Math.floor(200 + Math.random() * 800);
      setTrailerId(`TRL-${randNum}`);
      setTrailerNumber(`T-${randNum}`);
      setPlateNumber('');
      setTankCapacityLiters(36000);
      setNumberOfCompartments(4);
      setManufacturer('Al-Mutlaq Tankers');
      setModel('36K-ALU-4C');
      setYear(2023);
      setVin('');
      setTankType('Aluminum Alloy Fuel Tanker');
      setAssignedTractorId('');
      setStatus('AVAILABLE');
      setCurrentLocation('Dammam Fuel Terminal');
      setNotes('');
    }
    setErrorMessage(null);
  }, [initialTrailer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPlate = plateNumber.trim();
    const cleanVin = vin.trim();

    if (!cleanPlate || !cleanVin) {
      setErrorMessage('Please fill in required fields: Plate Number and VIN / Chassis Number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        trailer_id: trailerId.trim(),
        trailer_number: trailerNumber.trim(),
        plate_number: cleanPlate.toUpperCase(),
        tank_capacity_liters: Number(tankCapacityLiters),
        number_of_compartments: Number(numberOfCompartments),
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        year: Number(year),
        vin: cleanVin.toUpperCase(),
        tank_type: tankType.trim(),
        assigned_tractor_id: assignedTractorId || undefined,
        status,
        current_location: currentLocation.trim(),
        notes: notes.trim() || undefined
      };

      if (initialTrailer) {
        await updateTrailer(initialTrailer.id, payload);
      } else {
        await addTrailer(payload);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving trailer details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalFooter = (
    <>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Saudi SASO and Aramco petroleum transport certified specification.</span>
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
          form="trailer-form"
          disabled={isSubmitting}
          className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Saving Trailer...</span>
            </>
          ) : (
            <span>{initialTrailer ? 'Save Trailer Master' : 'Create Trailer Master'}</span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTrailer ? `Edit Tanker Trailer: ${initialTrailer.trailer_id}` : 'Register New Fuel Tanker Trailer'}
      subtitle="Configure tanker compartment capacities, discharge manifold specs, and tractor coupling."
      icon={<Truck className="w-5 h-5 text-amber-600" />}
      footer={modalFooter}
      maxWidth="3xl"
    >
      <form id="trailer-form" onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold text-xs">{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Identification & Registration */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">1</span>
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Trailer Identification & Registry</span>
            </div>
            <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
              * Required fields
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Trailer ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={trailerId}
                onChange={e => setTrailerId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Trailer Internal # <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={trailerNumber}
                onChange={e => setTrailerNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Plate Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TRA-3310"
                value={plateNumber}
                onChange={e => setPlateNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold uppercase placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Model Year</label>
              <input
                type="number"
                min={2000}
                max={2030}
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Tank Specifications */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">2</span>
              <Droplets className="w-4 h-4 text-slate-500" />
              <span>Tank Construction & Volumetric Capacity</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Capacity (Liters) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1000}
                max={60000}
                step={500}
                value={tankCapacityLiters}
                onChange={e => setTankCapacityLiters(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Compartments</label>
              <select
                value={numberOfCompartments}
                onChange={e => setNumberOfCompartments(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value={1}>1 Compartment</option>
                <option value={2}>2 Compartments</option>
                <option value={3}>3 Compartments</option>
                <option value={4}>4 Compartments (Standard)</option>
                <option value={5}>5 Compartments</option>
                <option value={6}>6 Compartments</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Manufacturer</label>
              <input
                type="text"
                value={manufacturer}
                onChange={e => setManufacturer(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Model / Serial</label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                VIN / Chassis Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={vin}
                onChange={e => setVin(e.target.value)}
                placeholder="17-character VIN number"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono uppercase focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Tank Material / Type</label>
              <input
                type="text"
                value={tankType}
                onChange={e => setTankType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Operational Assignment & Location */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">3</span>
              <Link2 className="w-4 h-4 text-slate-500" />
              <span>Operational Coupling & Depot Location</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Coupled Tractor Head</label>
              <select
                value={assignedTractorId}
                onChange={e => setAssignedTractorId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="">-- Uncoupled / Yard Standby --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_id} ({v.plate_number}) - {v.make}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Operational Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TrailerStatus)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="IN_WORKSHOP">IN WORKSHOP</option>
                <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
                <option value="RETIRED">RETIRED</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Current Terminal Location</label>
              <input
                type="text"
                value={currentLocation}
                onChange={e => setCurrentLocation(e.target.value)}
                placeholder="e.g. Dammam Main Depot"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-bold text-slate-700 block mb-1">Operational Notes / Discharge Valves</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. 4-inch API bottom couplers, vapor recovery line, hydrostatic certification valid"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

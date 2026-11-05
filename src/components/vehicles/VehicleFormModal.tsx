import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Vehicle, VehicleType, VehicleStatus } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { Truck, ShieldCheck, AlertTriangle, Loader2, FileText, Settings, Compass } from 'lucide-react';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVehicle?: Vehicle;
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  initialVehicle
}) => {
  const { addVehicle, updateVehicle, drivers, trailers } = useFleet();

  const [vehicleId, setVehicleId] = useState(initialVehicle?.vehicle_id || `TRK-${Math.floor(1000 + Math.random() * 9000)}`);
  const [plateNumber, setPlateNumber] = useState(initialVehicle?.plate_number || '');
  const [fleetNumber, setFleetNumber] = useState(initialVehicle?.fleet_number || '');
  const [vehicleType, setVehicleType] = useState<VehicleType>(initialVehicle?.vehicle_type || 'TRACTOR_HEAD');
  const [make, setMake] = useState(initialVehicle?.make || 'Volvo');
  const [model, setModel] = useState(initialVehicle?.model || 'FH 500 Globetrotter (6x4)');
  const [year, setYear] = useState(initialVehicle?.year || 2024);
  const [vin, setVin] = useState(initialVehicle?.vin || '');
  const [engineNumber, setEngineNumber] = useState(initialVehicle?.engine_number || '');
  const [color, setColor] = useState(initialVehicle?.color || 'White / Yellow Stripe');
  const [currentMileage, setCurrentMileage] = useState(initialVehicle?.current_mileage || 120000);
  const [currentEngineHours, setCurrentEngineHours] = useState(initialVehicle?.current_engine_hours || 3200);
  const [assignedDriverId, setAssignedDriverId] = useState(initialVehicle?.assigned_driver_id || '');
  const [assignedTrailerId, setAssignedTrailerId] = useState(initialVehicle?.assigned_trailer_id || '');
  const [stationLocation, setStationLocation] = useState(initialVehicle?.station_location || 'Dammam Main Terminal');
  const [status, setStatus] = useState<VehicleStatus>(initialVehicle?.status || 'AVAILABLE');
  const [purchaseCost, setPurchaseCost] = useState(initialVehicle?.purchase_cost || 450000);
  const [notes, setNotes] = useState(initialVehicle?.notes || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialVehicle) {
      setVehicleId(initialVehicle.vehicle_id);
      setPlateNumber(initialVehicle.plate_number);
      setFleetNumber(initialVehicle.fleet_number);
      setVehicleType(initialVehicle.vehicle_type);
      setMake(initialVehicle.make);
      setModel(initialVehicle.model);
      setYear(initialVehicle.year);
      setVin(initialVehicle.vin);
      setEngineNumber(initialVehicle.engine_number || '');
      setColor(initialVehicle.color || 'White / Yellow Stripe');
      setCurrentMileage(initialVehicle.current_mileage);
      setCurrentEngineHours(initialVehicle.current_engine_hours || 0);
      setAssignedDriverId(initialVehicle.assigned_driver_id || '');
      setAssignedTrailerId(initialVehicle.assigned_trailer_id || '');
      setStationLocation(initialVehicle.station_location);
      setStatus(initialVehicle.status);
      setPurchaseCost(initialVehicle.purchase_cost || 0);
      setNotes(initialVehicle.notes || '');
    } else {
      setVehicleId(`TRK-${Math.floor(1000 + Math.random() * 9000)}`);
      setPlateNumber('');
      setFleetNumber('');
      setVehicleType('TRACTOR_HEAD');
      setMake('Volvo');
      setModel('FH 500 Globetrotter (6x4)');
      setYear(2024);
      setVin('');
      setEngineNumber('');
      setColor('White / Yellow Stripe');
      setCurrentMileage(120000);
      setCurrentEngineHours(3200);
      setAssignedDriverId('');
      setAssignedTrailerId('');
      setStationLocation('Dammam Main Terminal');
      setStatus('AVAILABLE');
      setPurchaseCost(450000);
      setNotes('');
    }
    setErrorMessage(null);
  }, [initialVehicle, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!vehicleId.trim()) {
      setErrorMessage('Vehicle ID is required.');
      return;
    }
    if (!plateNumber.trim()) {
      setErrorMessage('Plate number is required.');
      return;
    }
    if (!vin.trim()) {
      setErrorMessage('VIN / Chassis number is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (initialVehicle) {
        await updateVehicle(initialVehicle.id, {
          vehicle_id: vehicleId.trim(),
          plate_number: plateNumber.trim().toUpperCase(),
          fleet_number: fleetNumber.trim().toUpperCase(),
          vehicle_type: vehicleType,
          make,
          model: model.trim(),
          year: Number(year),
          vin: vin.trim().toUpperCase(),
          engine_number: engineNumber.trim() || undefined,
          color: color.trim() || 'White / Yellow Stripe',
          current_mileage: Number(currentMileage) || 0,
          current_engine_hours: Number(currentEngineHours) || 0,
          assigned_driver_id: assignedDriverId || undefined,
          assigned_trailer_id: assignedTrailerId || undefined,
          station_location: stationLocation.trim(),
          status,
          purchase_cost: Number(purchaseCost) || 0,
          notes: notes.trim() || undefined
        });
      } else {
        await addVehicle({
          vehicle_id: vehicleId.trim(),
          plate_number: plateNumber.trim().toUpperCase(),
          fleet_number: fleetNumber.trim().toUpperCase(),
          vehicle_type: vehicleType,
          make,
          model: model.trim(),
          year: Number(year),
          vin: vin.trim().toUpperCase(),
          engine_number: engineNumber.trim() || undefined,
          color: color.trim() || 'White / Yellow Stripe',
          fuel_type: 'Diesel (Euro 5)',
          department: 'Fleet Operations',
          current_mileage: Number(currentMileage) || 0,
          current_engine_hours: Number(currentEngineHours) || 0,
          assigned_driver_id: assignedDriverId || undefined,
          assigned_trailer_id: assignedTrailerId || undefined,
          station_location: stationLocation.trim(),
          status,
          purchase_cost: Number(purchaseCost) || 0,
          notes: notes.trim() || undefined
        });
      }

      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to save vehicle.');
    }
  };

  const modalFooter = (
    <>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Validated for Saudi Ministry of Transport & Aramco safety compliance.</span>
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
          form="vehicle-form"
          disabled={isSubmitting}
          className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Saving Vehicle...</span>
            </>
          ) : (
            <span>{initialVehicle ? 'Save Vehicle Master' : 'Create Vehicle Master'}</span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialVehicle ? `Edit Tractor Truck: ${initialVehicle.vehicle_id}` : 'Register Heavy Tractor Truck'}
      subtitle="Enter heavy commercial tractor specifications, chassis identity, telemetry, and driver coupling."
      icon={<Truck className="w-5 h-5 text-amber-600" />}
      footer={modalFooter}
      maxWidth="3xl"
    >
      <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
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
              <span>Vehicle Identification & Registration</span>
            </div>
            <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
              * Required fields
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Vehicle ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
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
                placeholder="e.g. LBR-4921"
                value={plateNumber}
                onChange={e => setPlateNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold uppercase placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Fleet Internal # <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. FLT-101"
                value={fleetNumber}
                onChange={e => setFleetNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold uppercase placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Operational Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as VehicleStatus)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="ON_TRIP">ON TRIP</option>
                <option value="IN_WORKSHOP">IN WORKSHOP</option>
                <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
                <option value="SOLD">SOLD</option>
                <option value="RETIRED">RETIRED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Specifications & VIN */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">2</span>
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Make, Model & Chassis Specifications</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Make / Brand</label>
              <select
                value={make}
                onChange={e => setMake(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="Volvo">Volvo Trucks</option>
                <option value="MAN">MAN Trucks</option>
                <option value="Mercedes-Benz">Mercedes-Benz Actros</option>
                <option value="Scania">Scania Heavy</option>
                <option value="Renault">Renault Trucks</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Model Description</label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="e.g. FH 500 Globetrotter (6x4)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
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

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                VIN / Chassis Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="17-character VIN number"
                value={vin}
                onChange={e => setVin(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono uppercase focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Engine Serial Number</label>
              <input
                type="text"
                value={engineNumber}
                onChange={e => setEngineNumber(e.target.value)}
                placeholder="e.g. D13K500-EU6"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Purchase Cost (SAR)</label>
              <input
                type="number"
                min={0}
                value={purchaseCost}
                onChange={e => setPurchaseCost(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Telemetry, Assignments & Notes */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">3</span>
              <Compass className="w-4 h-4 text-slate-500" />
              <span>Telemetry, Assignments & Depot Hub</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Odometer (KM)</label>
              <input
                type="number"
                min={0}
                value={currentMileage}
                onChange={e => setCurrentMileage(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Engine Hours</label>
              <input
                type="number"
                min={0}
                value={currentEngineHours}
                onChange={e => setCurrentEngineHours(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Primary Driver</label>
              <select
                value={assignedDriverId}
                onChange={e => setAssignedDriverId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="">-- Unassigned --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.employee_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Coupled Tanker Trailer</label>
              <select
                value={assignedTrailerId}
                onChange={e => setAssignedTrailerId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="">-- Unassigned --</option>
                {trailers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.trailer_id} ({t.plate_number}) - {t.tank_capacity_liters.toLocaleString()}L
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Station / Depot Hub</label>
              <input
                type="text"
                value={stationLocation}
                onChange={e => setStationLocation(e.target.value)}
                placeholder="e.g. Dammam Main Terminal"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-bold text-slate-700 block mb-1">Maintenance & Safety Notes</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Equipped with Aramco-certified ADR safety kit and dual retarder brakes"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

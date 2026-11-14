import React, { useState, useEffect } from 'react';
import { Radio, Truck, AlertTriangle, ShieldCheck, Cpu, Wifi, Info } from 'lucide-react';
import { Modal } from '../common/Modal';
import { GpsDevice } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';

interface GpsDeviceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDevice?: GpsDevice;
}

const COMMON_DEVICE_MODELS = [
  'Teltonika FMB120 (Dual CAN & Fuel Sensor)',
  'Teltonika FMC130 (4G LTE Cat 1 & CAN)',
  'Teltonika FMB920 (Compact Tracker)',
  'CalAmp LMU-3030 OBD-II/CAN',
  'Queclink GV300 (Heavy Commercial)',
  'Ruptela HCV5 (Heavy Fleet & Tachograph)',
  'Meitrack T399G (Fuel Level Sensor)',
  'Other / Custom Model'
];

export const GpsDeviceFormModal: React.FC<GpsDeviceFormModalProps> = ({
  isOpen,
  onClose,
  initialDevice
}) => {
  const { vehicles, gpsDevices, addGpsDevice, updateGpsDevice } = useFleet();
  const { hasPermission } = useAuth();

  const [imei, setImei] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [deviceModel, setDeviceModel] = useState(COMMON_DEVICE_MODELS[0]);
  const [customModel, setCustomModel] = useState('');
  const [installedVehicleId, setInstalledVehicleId] = useState('');
  const [simPhoneNumber, setSimPhoneNumber] = useState('');
  const [simIccid, setSimIccid] = useState('');
  const [installationDate, setInstallationDate] = useState(new Date().toISOString().slice(0, 10));
  const [installationOdometer, setInstallationOdometer] = useState(0);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when editing or opening
  useEffect(() => {
    if (initialDevice) {
      setImei(initialDevice.device_imei);
      setSerialNumber(initialDevice.serial_number || '');
      if (COMMON_DEVICE_MODELS.includes(initialDevice.device_model)) {
        setDeviceModel(initialDevice.device_model);
        setCustomModel('');
      } else {
        setDeviceModel('Other / Custom Model');
        setCustomModel(initialDevice.device_model);
      }
      setInstalledVehicleId(initialDevice.installed_vehicle_id || '');
      setSimPhoneNumber(initialDevice.sim_phone_number || '');
      setSimIccid(initialDevice.sim_iccid || '');
      setInstallationDate(initialDevice.installation_date || new Date().toISOString().slice(0, 10));
      setInstallationOdometer(initialDevice.installation_odometer || 0);
      setNotes(initialDevice.notes || '');
    } else {
      setImei('');
      setSerialNumber('');
      setDeviceModel(COMMON_DEVICE_MODELS[0]);
      setCustomModel('');
      setInstalledVehicleId('');
      setSimPhoneNumber('');
      setSimIccid('');
      setInstallationDate(new Date().toISOString().slice(0, 10));
      setInstallationOdometer(0);
      setNotes('');
    }
    setErrorMessage(null);
  }, [initialDevice, isOpen]);

  // Auto-populate installation odometer when truck is selected in create mode
  const handleVehicleChange = (vId: string) => {
    setInstalledVehicleId(vId);
    if (!initialDevice && vId) {
      const selected = vehicles.find(v => v.id === vId);
      if (selected && selected.current_mileage) {
        setInstallationOdometer(selected.current_mileage);
      }
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === installedVehicleId);

  // Check if another device is currently linked to the selected truck
  const existingDeviceForTruck = installedVehicleId
    ? gpsDevices.find(d => d.installed_vehicle_id === installedVehicleId && d.id !== initialDevice?.id)
    : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanImei = imei.trim();
    if (!cleanImei) {
      setErrorMessage('Please enter a valid hardware IMEI number.');
      return;
    }

    // Enforce IMEI Uniqueness check
    const isDuplicate = gpsDevices.some(
      d => d.device_imei.trim().toLowerCase() === cleanImei.toLowerCase() && d.id !== initialDevice?.id
    );

    if (isDuplicate) {
      setErrorMessage(`Duplicate IMEI rejected: An existing device is already registered with IMEI "${cleanImei}".`);
      return;
    }

    const finalModel = deviceModel === 'Other / Custom Model' 
      ? (customModel.trim() || 'Custom Telematics Device')
      : deviceModel;

    try {
      if (initialDevice) {
        updateGpsDevice(initialDevice.id, {
          device_imei: cleanImei,
          serial_number: serialNumber.trim() || undefined,
          device_model: finalModel,
          installed_vehicle_id: installedVehicleId || undefined,
          sim_phone_number: simPhoneNumber.trim() || undefined,
          sim_iccid: simIccid.trim() || undefined,
          installation_date: installationDate,
          installation_odometer: Number(installationOdometer) || 0,
          notes: notes.trim() || undefined
        });
      } else {
        addGpsDevice({
          device_imei: cleanImei,
          serial_number: serialNumber.trim() || undefined,
          device_model: finalModel,
          installed_vehicle_id: installedVehicleId || undefined,
          installation_date: installationDate,
          installation_odometer: Number(installationOdometer) || 0,
          is_active: true,
          battery_level_percent: undefined,
          signal_strength_csq: undefined,
          last_heartbeat: undefined,
          sim_phone_number: simPhoneNumber.trim() || undefined,
          sim_iccid: simIccid.trim() || undefined,
          notes: notes.trim() || undefined
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register GPS device.');
    }
  };

  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  // Pinned Footer with guaranteed visibility
  const modalFooter = (
    <>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Status initializes as <strong className="text-slate-700">Awaiting Data Link</strong> until live telemetry arrives.</span>
      </div>

      <div className="flex items-center justify-end gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition active:scale-95 cursor-pointer shadow-2xs"
        >
          Cancel
        </button>

        <button
          type="submit"
          form="gps-device-form"
          disabled={!canManage}
          className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {initialDevice ? 'Save Hardware Updates' : 'Confirm Hardware Registration'}
        </button>
      </div>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialDevice ? `Edit GPS Hardware: ${initialDevice.device_imei}` : 'Register GPS Tracking Hardware'}
      subtitle="Register physical telematics tracker units, map to tractor heads, and configure cellular identity."
      icon={<Radio className="w-5 h-5 text-amber-600" />}
      footer={modalFooter}
      maxWidth="2xl"
    >
      <form id="gps-device-form" onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold text-xs">{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Hardware Identification */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">1</span>
              <Cpu className="w-4 h-4 text-slate-500" />
              <span>Hardware Identification</span>
            </div>
            <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
              * 15-Digit Unique IMEI Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Device IMEI Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 864019283746101"
                value={imei}
                onChange={e => {
                  setImei(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Serial Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. SN-TK-9014"
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Device Make & Model</label>
              <select
                value={deviceModel}
                onChange={e => setDeviceModel(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                {COMMON_DEVICE_MODELS.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            {deviceModel === 'Other / Custom Model' && (
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Specify Custom Hardware Model</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tramigo T23 Fleet"
                  value={customModel}
                  onChange={e => setCustomModel(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Tractor Truck Assignment */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">2</span>
              <Truck className="w-4 h-4 text-slate-500" />
              <span>Tractor Truck Assignment</span>
            </div>
            <span className="text-[11px] text-slate-600 font-medium">
              {selectedVehicle ? `Paired to ${selectedVehicle.vehicle_id}` : 'Standby Spare Inventory'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Tractor Head Truck</label>
              <select
                value={installedVehicleId}
                onChange={e => handleVehicleChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              >
                <option value="">-- Unassigned / Standby Spare Unit --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_id} — {v.plate_number} ({v.make} {v.model})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Installation Odometer (KM)</label>
              <input
                type="number"
                min="0"
                value={installationOdometer}
                onChange={e => setInstallationOdometer(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>

          {/* Selected Truck Information Preview Card */}
          {selectedVehicle ? (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-700" />
                  <span className="font-bold text-slate-900">{selectedVehicle.vehicle_id}</span>
                  <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                    {selectedVehicle.plate_number}
                  </span>
                  <span className="text-slate-600 font-mono text-[11px] font-semibold">
                    {selectedVehicle.make} {selectedVehicle.model}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                  {(selectedVehicle.current_mileage || 0).toLocaleString()} KM • {selectedVehicle.station_location}
                </span>
              </div>

              {existingDeviceForTruck && (
                <div className="p-2 rounded bg-amber-100/90 border border-amber-300 text-[11px] text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                  <span>
                    Note: <strong>{selectedVehicle.vehicle_id}</strong> is currently mapped to IMEI <code className="font-mono font-bold">{existingDeviceForTruck.device_imei}</code>. Saving will reassign it.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="px-3 py-2 bg-white border border-slate-200/80 rounded-lg text-slate-500 text-[11px] flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>This unit will be stored as an unassigned spare in inventory until paired with a tractor head.</span>
            </div>
          )}
        </div>

        {/* Section 3: Cellular SIM & Commissioning */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center font-extrabold text-[11px]">3</span>
              <Wifi className="w-4 h-4 text-slate-500" />
              <span>Cellular Connectivity & Commissioning</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Installation Date</label>
              <input
                type="date"
                value={installationDate}
                onChange={e => setInstallationDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">M2M SIM Phone Number</label>
              <input
                type="text"
                placeholder="+966 50 XXX XXXX"
                value={simPhoneNumber}
                onChange={e => setSimPhoneNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">SIM Card ICCID</label>
              <input
                type="text"
                placeholder="89966..."
                value={simIccid}
                onChange={e => setSimIccid(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-bold text-slate-700 block mb-1">Installation Notes & Wiring Location</label>
              <input
                type="text"
                placeholder="e.g. Installed behind lower dash fuse compartment; CAN high/low tapped into OBD port."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

import React from 'react';
import { 
  Radio, Truck, Cpu, Wifi, Battery, Clock, 
  ShieldCheck, AlertCircle, Edit3, Trash2, Phone, Hash, Calendar, FileText
} from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { GpsDevice, Vehicle } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';

interface GpsDeviceDetailDrawerProps {
  device: GpsDevice | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (device: GpsDevice) => void;
  onDelete: (deviceId: string) => void;
}

export const GpsDeviceDetailDrawer: React.FC<GpsDeviceDetailDrawerProps> = ({
  device,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const { vehicles, isGpsProviderConnected } = useFleet();
  const { hasPermission } = useAuth();

  if (!device) return null;

  const linkedVehicle = vehicles.find(v => v.id === device.installed_vehicle_id);
  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`GPS TRACKER: ${device.device_imei}`}
      subtitle={`${device.device_model} • Hardware Registry Detail`}
      width="xl"
    >
      <div className="space-y-4 text-xs text-slate-800 font-sans">
        {/* Header Summary Banner */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              PHYSICAL HARDWARE IDENTIFIER
            </div>
            <div className="text-sm font-bold font-mono tracking-tight text-slate-900 mt-0.5">
              {device.device_imei}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              Model: {device.device_model}
            </div>
          </div>

          <div className="text-right">
            {isGpsProviderConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Active Live Feed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                Awaiting Provider Feed
              </span>
            )}
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              ERP State: {device.is_active ? 'Active Unit' : 'Deactivated'}
            </div>
          </div>
        </div>

        {/* Section 1: Assigned Tractor Head Truck */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-amber-600" />
            <span>1. PAIRED VEHICLE SPECIFICATIONS</span>
          </div>

          {linkedVehicle ? (
            <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-md space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>{linkedVehicle.vehicle_id}</span>
                    <span className="font-mono text-slate-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[11px] font-bold">
                      {linkedVehicle.plate_number}
                    </span>
                    <span className="text-slate-600 text-[11px] font-mono">
                      Fleet #{linkedVehicle.fleet_number}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {linkedVehicle.make} {linkedVehicle.model} ({linkedVehicle.year})
                  </div>
                </div>

                <Badge variant={linkedVehicle.status === 'AVAILABLE' ? 'success' : 'amber'}>
                  {linkedVehicle.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/60 text-[11px]">
                <div>
                  <span className="text-slate-500 text-[10px] block">CURRENT ODOMETER</span>
                  <span className="font-mono font-bold text-slate-900">
                    {(linkedVehicle.current_mileage || 0).toLocaleString()} KM
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block">ENGINE HOURS</span>
                  <span className="font-mono font-bold text-slate-900">
                    {(linkedVehicle.current_engine_hours || 0).toLocaleString()} Hours
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block">ASSIGNED DEPOT</span>
                  <span className="font-semibold text-slate-800">{linkedVehicle.station_location}</span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block">VIN / CHASSIS NUMBER</span>
                  <span className="font-mono text-[10px] text-slate-700">{linkedVehicle.vin}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-md text-center text-slate-500">
              <AlertCircle className="w-5 h-5 mx-auto text-slate-400 mb-1" />
              <div className="font-semibold text-xs">No Vehicle Linked</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                This unit is currently stored in inventory as an unassigned spare device.
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Hardware Telemetry Metrics */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-sky-600" />
            <span>2. SENSORS & CELLULAR CONNECTIVITY</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
              <div className="flex items-center justify-between text-slate-500 text-[10px]">
                <span>BATTERY LEVEL</span>
                <Battery className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                {device.battery_level_percent !== undefined ? `${device.battery_level_percent}%` : '-- (Awaiting Feed)'}
              </div>
              <span className="text-[10px] text-slate-400">Backup Internal Battery</span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
              <div className="flex items-center justify-between text-slate-500 text-[10px]">
                <span>CELLULAR CSQ SIGNAL</span>
                <Wifi className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                {device.signal_strength_csq !== undefined ? `CSQ ${device.signal_strength_csq}/31` : '-- (Awaiting Feed)'}
              </div>
              <span className="text-[10px] text-slate-400">4G LTE / GSM Network</span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
              <div className="text-slate-500 text-[10px]">M2M SIM PHONE</div>
              <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                {device.sim_phone_number || 'Not Configured'}
              </div>
              <span className="text-[10px] text-slate-400">Telemetry Data SIM</span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
              <div className="text-slate-500 text-[10px]">SIM ICCID</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5 truncate" title={device.sim_iccid}>
                {device.sim_iccid || 'Not Configured'}
              </div>
              <span className="text-[10px] text-slate-400">M2M Card Serial</span>
            </div>
          </div>
        </div>

        {/* Section 3: Installation & Commissioning */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>3. INSTALLATION AUDIT & NOTES</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 text-[10px] block">INSTALLATION DATE</span>
                <span className="font-semibold text-slate-800">{device.installation_date || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">ODOMETER AT INSTALL</span>
                <span className="font-mono font-semibold text-slate-800">
                  {(device.installation_odometer || 0).toLocaleString()} KM
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">HARDWARE SERIAL</span>
                <span className="font-mono text-slate-800">{device.serial_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">REGISTRATION DATE</span>
                <span className="text-slate-700">
                  {new Date(device.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {device.notes && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 text-[10px] block font-semibold mb-0.5">INSTALLATION NOTES</span>
                <p className="text-xs text-slate-700 leading-relaxed bg-white p-2 rounded border border-slate-200 font-sans">
                  {device.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          {canManage ? (
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete GPS device ${device.device_imei}?`)) {
                  onDelete(device.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs font-semibold transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Unit</span>
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 rounded text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Close
            </button>

            {canManage && (
              <button
                onClick={() => {
                  onEdit(device);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Assignment</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};

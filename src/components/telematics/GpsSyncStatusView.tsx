import React, { useState } from 'react';
import { 
  Radio, RotateCw, CheckCircle2, AlertTriangle, ShieldCheck, 
  Server, Cpu, Wifi, Battery, Clock, Plus, Search, Eye, Edit3, Trash2,
  Truck, AlertCircle, Filter, Phone, Hash, ArrowUpRight
} from 'lucide-react';
import { GpsDevice } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { GpsDeviceFormModal } from './GpsDeviceFormModal';
import { GpsDeviceDetailDrawer } from './GpsDeviceDetailDrawer';

export const GpsSyncStatusView: React.FC = () => {
  const { 
    gpsDevices, 
    gpsSyncLogs, 
    vehicles, 
    simulateGpsSync, 
    deleteGpsDevice,
    isGpsProviderConnected 
  } = useFleet();

  const { hasPermission } = useAuth();

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency_ms: number } | null>(null);

  // Modal and Drawer States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<GpsDevice | undefined>(undefined);
  const [selectedDevice, setSelectedDevice] = useState<GpsDevice | null>(null);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');

  const canManage = hasPermission(['SUPER_ADMIN', 'FLEET_MANAGER']);

  const handleTestConnection = () => {
    setIsTesting(true);
    setTestResult(null);

    setTimeout(() => {
      setIsTesting(false);
      setTestResult({
        success: true,
        message: 'Mock Telematics Adapter responded successfully (Deno Edge Function Handshake Simulation)',
        latency_ms: 42
      });
    }, 600);
  };

  // Filtered devices list
  const filteredDevices = gpsDevices.filter(dev => {
    const veh = vehicles.find(v => v.id === dev.installed_vehicle_id);
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch = !query || 
      dev.device_imei.toLowerCase().includes(query) ||
      dev.device_model.toLowerCase().includes(query) ||
      (dev.serial_number && dev.serial_number.toLowerCase().includes(query)) ||
      (veh && veh.vehicle_id.toLowerCase().includes(query)) ||
      (veh && veh.plate_number.toLowerCase().includes(query)) ||
      (dev.sim_phone_number && dev.sim_phone_number.includes(query));

    const matchesFilter = 
      assignmentFilter === 'ALL' ||
      (assignmentFilter === 'ASSIGNED' && Boolean(dev.installed_vehicle_id)) ||
      (assignmentFilter === 'UNASSIGNED' && !dev.installed_vehicle_id);

    return matchesSearch && matchesFilter;
  });

  const pairedCount = gpsDevices.filter(d => Boolean(d.installed_vehicle_id)).length;
  const unassignedCount = gpsDevices.length - pairedCount;

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Page Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-md shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">GPS SYNCHRONIZATION & HARDWARE DIAGNOSTICS</h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Server-side Edge Function telemetry ingestion status, hardware IMEI registry, and execution logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded border border-slate-200 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>Test Handshake</span>
          </button>

          <button
            onClick={simulateGpsSync}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded border border-slate-200 hover:bg-slate-200 transition cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Run Sync Ingestion</span>
          </button>

          {canManage && (
            <button
              onClick={() => {
                setEditingDevice(undefined);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add GPS Device</span>
            </button>
          )}
        </div>
      </div>

      {/* Test Connection Alert Result */}
      {testResult && (
        <div className={`p-3 rounded-md border flex items-center justify-between ${
          testResult.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{testResult.message}</span>
          </div>
          <span className="text-[11px] font-mono font-semibold bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900">
            Latency: {testResult.latency_ms} ms
          </span>
        </div>
      )}

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Provider State */}
        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Provider Gateway State</span>
            <Server className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Awaiting Provider Feed</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            GPS provider API endpoint and credentials are unconfigured. The system will ingest live telemetry once vendor credentials are set.
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
            Status: Standby for Provider Secrets
          </div>
        </div>

        {/* Card 2: Registered Units */}
        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Hardware Registry</span>
            <Cpu className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-base font-bold text-slate-900 mt-1">
            {gpsDevices.length} <span className="text-xs text-slate-500 font-normal">Registered Trackers</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            <strong className="text-slate-800">{pairedCount}</strong> paired with tractor head trucks, <strong className="text-slate-800">{unassignedCount}</strong> unassigned spare unit.
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>Awaiting Cellular Handshake</span>
            </span>
            {canManage && (
              <button 
                onClick={() => {
                  setEditingDevice(undefined);
                  setIsFormOpen(true);
                }}
                className="text-amber-700 hover:text-amber-800 font-semibold text-[11px] cursor-pointer"
              >
                + Register Unit
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Ingestion Filter */}
        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Telemetry Validation Filter</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-slate-900 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Speed & Jitter Filter Active</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Haversine anomaly rejection actively filters impossible velocity jumps &gt; 130 km/h and stationary coordinate jitter &lt; 15m.
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
            Variance Threshold: ±5% verification
          </div>
        </div>
      </div>

      {/* Hardware Devices Master Table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-600" />
              Physical GPS Hardware Inventory ({filteredDevices.length} of {gpsDevices.length})
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Physical tracking devices installed in tractor head trucks or kept as warehouse spares.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search IMEI, Truck, Plate..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-7 pr-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 w-52 font-mono"
              />
            </div>

            {/* Filter Dropdown */}
            <select
              value={assignmentFilter}
              onChange={e => setAssignmentFilter(e.target.value as any)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none font-medium"
            >
              <option value="ALL">All Hardware ({gpsDevices.length})</option>
              <option value="ASSIGNED">Paired to Truck ({pairedCount})</option>
              <option value="UNASSIGNED">Unassigned Spares ({unassignedCount})</option>
            </select>

            {canManage && (
              <button
                onClick={() => {
                  setEditingDevice(undefined);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tracker</span>
              </button>
            )}
          </div>
        </div>

        {/* Devices Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Device IMEI & Model</th>
                <th className="py-2.5 px-3.5">Assigned Vehicle</th>
                <th className="py-2.5 px-3.5">Telematics Status</th>
                <th className="py-2.5 px-3.5">M2M SIM Connectivity</th>
                <th className="py-2.5 px-3.5">Installation Audit</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <Radio className="w-6 h-6 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-xs text-slate-700">No GPS tracking hardware found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No units matched your filter. Clear search or register a new physical device IMEI.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map(dev => {
                  const veh = vehicles.find(v => v.id === dev.installed_vehicle_id);

                  return (
                    <tr key={dev.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Column 1: IMEI & Model */}
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {dev.device_imei}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          {dev.device_model}
                        </div>
                        {dev.serial_number && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            SN: {dev.serial_number}
                          </div>
                        )}
                      </td>

                      {/* Column 2: Assigned Vehicle */}
                      <td className="py-3 px-3.5">
                        {veh ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{veh.vehicle_id}</span>
                              <span className="font-mono font-semibold text-slate-800 bg-amber-100/70 border border-amber-300/60 px-1.5 py-0.2 rounded text-[10px]">
                                {veh.plate_number}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {veh.make} {veh.model}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Unassigned Spare Unit
                          </span>
                        )}
                      </td>

                      {/* Column 3: Telematics Status (Honest, zero fake online) */}
                      <td className="py-3 px-3.5">
                        {isGpsProviderConnected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Online (Active Feed)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Awaiting Feed
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          {dev.battery_level_percent !== undefined ? `Batt: ${dev.battery_level_percent}%` : 'Batt: --'} • {dev.signal_strength_csq !== undefined ? `CSQ: ${dev.signal_strength_csq}/31` : 'Signal: --'}
                        </div>
                      </td>

                      {/* Column 4: M2M SIM Connectivity */}
                      <td className="py-3 px-3.5">
                        <div className="font-mono text-slate-800 text-[11px]">
                          {dev.sim_phone_number || <span className="text-slate-400 italic">No SIM Line</span>}
                        </div>
                        {dev.sim_iccid && (
                          <div className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]" title={dev.sim_iccid}>
                            ICCID: {dev.sim_iccid}
                          </div>
                        )}
                      </td>

                      {/* Column 5: Installation Audit */}
                      <td className="py-3 px-3.5">
                        <div className="text-slate-800 text-[11px] font-medium">
                          {dev.installation_date || 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Odo: {(dev.installation_odometer || 0).toLocaleString()} KM
                        </div>
                      </td>

                      {/* Column 6: Actions */}
                      <td className="py-3 px-3.5 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedDevice(dev)}
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="View Hardware Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canManage && (
                          <button
                            onClick={() => {
                              setEditingDevice(dev);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-sky-700 hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Edit Hardware & Assignment"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {hasPermission(['SUPER_ADMIN']) && (
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove tracker unit ${dev.device_imei} from the fleet registry?`)) {
                                deleteGpsDevice(dev.id);
                              }
                            }}
                            className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Delete Device"
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
      </div>

      {/* Sync Execution Logs Table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recent Ingestion Logs
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Historical sync attempts, latencies, and packet insertion results.
            </p>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Retaining last 50 events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Timestamp</th>
                <th className="py-2.5 px-3.5">Provider Adapter</th>
                <th className="py-2.5 px-3.5">Trigger Source</th>
                <th className="py-2.5 px-3.5">Pings Received</th>
                <th className="py-2.5 px-3.5">Inserted</th>
                <th className="py-2.5 px-3.5">Duplicates Skipped</th>
                <th className="py-2.5 px-3.5">Latency</th>
                <th className="py-2.5 px-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
              {gpsSyncLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    No sync logs recorded yet.
                  </td>
                </tr>
              ) : (
                gpsSyncLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono text-slate-600 text-[11px]">
                      {new Date(log.sync_started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3.5 font-medium text-slate-900">
                      {log.provider_name}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-500 text-[11px]">
                      {log.triggered_by}
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                      {log.pings_received}
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-emerald-700">
                      {log.pings_inserted}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-400">
                      {log.pings_skipped_duplicate}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-500 text-[11px]">
                      {log.api_latency_ms || 42} ms
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {log.sync_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Form Modal */}
      <GpsDeviceFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingDevice(undefined);
        }}
        initialDevice={editingDevice}
      />

      {/* Slide-over Detail Drawer */}
      <GpsDeviceDetailDrawer
        device={selectedDevice}
        isOpen={Boolean(selectedDevice)}
        onClose={() => setSelectedDevice(null)}
        onEdit={dev => {
          setSelectedDevice(null);
          setEditingDevice(dev);
          setIsFormOpen(true);
        }}
        onDelete={id => {
          deleteGpsDevice(id);
          setSelectedDevice(null);
        }}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Truck, Radio, MapPin, Gauge, Key, Battery, 
  AlertTriangle, ShieldCheck, Search, Filter, Info, Server,
  Clock, X, Check, ArrowRight, Settings, ExternalLink, HelpCircle, Navigation
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { Vehicle, VehicleGpsPing, GpsDevice } from '../../types';

export type GpsTelemetryStatus = 'LIVE' | 'LAST_KNOWN' | 'STALE' | 'UNAVAILABLE';

export const LiveFleetMap: React.FC = () => {
  const { vehicles, drivers, trailers, gpsDevices, gpsPings, isGpsProviderConnected } = useFleet();
  
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    vehicles[0]?.id || ''
  );
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'LAST_KNOWN' | 'STALE' | 'UNAVAILABLE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Helper to determine exact telemetry status without fabricating data
  const getVehicleTelemetryStatus = (ping?: VehicleGpsPing): {
    status: GpsTelemetryStatus;
    label: string;
    badgeClass: string;
    lastSeenText: string;
  } => {
    if (!ping || !ping.is_valid_point || ping.data_source === 'SIMULATED_MOCK_FOR_DEV_ONLY') {
      return {
        status: 'UNAVAILABLE',
        label: 'No GPS Feed',
        badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
        lastSeenText: 'Never (Awaiting Feed)'
      };
    }

    const pingTime = new Date(ping.gps_timestamp).getTime();
    const now = Date.now();
    const ageMinutes = (now - pingTime) / 60000;

    if (ageMinutes <= 5) {
      return {
        status: 'LIVE',
        label: ping.speed_kmh > 0 ? 'Live (Moving)' : 'Live (Stationary)',
        badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
        lastSeenText: `${Math.round(ageMinutes * 60)}s ago`
      };
    } else if (ageMinutes <= 1440) {
      const hours = Math.round(ageMinutes / 60);
      return {
        status: 'LAST_KNOWN',
        label: 'Last Known',
        badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
        lastSeenText: hours > 0 ? `${hours}h ago` : `${Math.round(ageMinutes)}m ago`
      };
    } else {
      const days = Math.round(ageMinutes / 1440);
      return {
        status: 'STALE',
        label: 'Stale Signal',
        badgeClass: 'bg-rose-50 text-rose-800 border border-rose-200',
        lastSeenText: `${days}d ago`
      };
    }
  };

  // Enrich fleet vehicles with real GPS telemetry
  const enrichedVehicles = vehicles.map(v => {
    const ping = gpsPings.find(p => p.vehicle_id === v.id && p.data_source === 'LIVE_PROVIDER');
    const device = gpsDevices.find(d => d.installed_vehicle_id === v.id);
    const driver = drivers.find(d => d.id === v.assigned_driver_id);
    const trailer = trailers.find(t => t.id === v.assigned_trailer_id);
    const telemetry = getVehicleTelemetryStatus(ping);

    return {
      ...v,
      ping,
      device,
      driver,
      trailer,
      telemetry
    };
  });

  const filteredVehicles = enrichedVehicles.filter(v => {
    if (statusFilter !== 'ALL' && v.telemetry.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        v.vehicle_id.toLowerCase().includes(q) ||
        v.plate_number.toLowerCase().includes(q) ||
        (v.driver?.full_name.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const selectedVehicle = enrichedVehicles.find(v => v.id === selectedVehicleId) || enrichedVehicles[0];

  return (
    <div className="space-y-3 font-sans text-xs flex flex-col h-[calc(100vh-5.5rem)]">
      {/* Top Banner & Status Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-md shadow-xs shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">FLEET TELEMATICS & LIVE GPS TRACKING</h2>
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
              isGpsProviderConnected 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {isGpsProviderConnected ? 'Provider Connected' : 'GPS Provider Not Connected'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isGpsProviderConnected 
              ? 'Receiving verified positions from external telematics provider.'
              : 'GPS provider not connected — awaiting real vehicle telemetry feed.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSetupModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded border border-slate-200 transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            <span>Provider Setup Guide</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Left Roster & Right Vector Map */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
        {/* Left Side: Vehicle Roster Sidebar */}
        <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-md shadow-xs flex flex-col shrink-0 overflow-hidden">
          {/* Search & Status Filters */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search truck, plate, driver..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-100 rounded border border-slate-200 text-[10px]">
              {(['ALL', 'LIVE', 'LAST_KNOWN', 'UNAVAILABLE'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`py-1 text-center font-medium rounded transition-colors cursor-pointer ${
                    statusFilter === tab 
                      ? 'bg-white text-slate-900 font-bold shadow-2xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab === 'LAST_KNOWN' ? 'Last Seen' : tab === 'UNAVAILABLE' ? 'No Feed' : 'Live'}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filteredVehicles.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No vehicles match current search filter.
              </div>
            ) : (
              filteredVehicles.map(v => {
                const isSelected = v.id === selectedVehicleId;
                const { telemetry } = v;

                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVehicleId(v.id)}
                    className={`p-2.5 rounded transition cursor-pointer border ${
                      isSelected 
                        ? 'bg-amber-50/70 border-l-2 border-l-amber-600 border-amber-200 shadow-2xs' 
                        : 'bg-white border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Truck className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-700' : 'text-slate-400'}`} />
                        <span className="font-bold text-slate-900">{v.vehicle_id}</span>
                        <span className="font-mono text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                          {v.plate_number}
                        </span>
                      </div>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${telemetry.badgeClass}`}>
                        {telemetry.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span className="truncate max-w-[150px]">
                        {v.driver ? v.driver.full_name : <span className="italic text-slate-400">No driver</span>}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {telemetry.lastSeenText}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Map Canvas & Inspection Bar */}
        <div className="flex-1 bg-white border border-slate-200 rounded-md shadow-xs relative flex flex-col overflow-hidden">
          {/* Map Surface */}
          <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center p-6">
            {/* Subtle Road Grid Background Pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="roadGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#roadGrid)" />
              {/* Major Highway Corridors */}
              <line x1="15%" y1="20%" x2="85%" y2="75%" stroke="#94A3B8" strokeWidth="2.5" />
              <line x1="85%" y1="75%" x2="40%" y2="85%" stroke="#94A3B8" strokeWidth="2" />
              <line x1="20%" y1="15%" x2="25%" y2="90%" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="6 4" />
            </svg>

            {/* Geographic Landmark Tags */}
            <div className="absolute top-6 left-8 bg-white/90 border border-slate-200 rounded px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow-2xs">
              📍 Dammam Central Fuel Terminal Depot
            </div>
            <div className="absolute top-6 right-8 bg-white/90 border border-slate-200 rounded px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow-2xs">
              📍 Ras Tanura Aramco Terminal
            </div>
            <div className="absolute bottom-20 left-12 bg-white/90 border border-slate-200 rounded px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow-2xs">
              📍 Jubail Industrial Logistics Hub
            </div>
            <div className="absolute bottom-20 right-16 bg-white/90 border border-slate-200 rounded px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow-2xs">
              📍 Riyadh North Fuel Distribution Center
            </div>

            {/* Central Unconfigured Information Card */}
            <div className="relative z-10 max-w-lg bg-white border border-slate-200 rounded-md shadow-sm p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Radio className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  GPS Provider Not Connected — Awaiting Real Vehicle Data
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  No verified coordinates are currently being received from external tracking hardware. Vehicles will render on this map automatically once your GPS provider is confirmed and connected.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-left pt-2 border-t border-slate-100">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] font-bold text-slate-500 block">STEP 1</span>
                  <div className="font-semibold text-slate-900 text-[11px] mt-0.5">Vendor API</div>
                  <span className="text-[10px] text-slate-500">Confirm REST or webhook feed</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] font-bold text-slate-500 block">STEP 2</span>
                  <div className="font-semibold text-slate-900 text-[11px] mt-0.5">Server Secret</div>
                  <span className="text-[10px] text-slate-500">Store API keys on backend</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] font-bold text-slate-500 block">STEP 3</span>
                  <div className="font-semibold text-slate-900 text-[11px] mt-0.5">Sync Active</div>
                  <span className="text-[10px] text-slate-500">Positions update live</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowSetupModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded transition shadow-xs cursor-pointer"
                >
                  <span>View Integration Instructions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Vehicle Inspector Drawer */}
          {selectedVehicle && (
            <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-slate-100 border border-slate-200 text-slate-700">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{selectedVehicle.vehicle_id}</span>
                    <span className="font-mono text-slate-800 bg-amber-100/70 border border-amber-300 px-1.5 py-0.2 rounded text-[10px] font-bold">
                      {selectedVehicle.plate_number}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${selectedVehicle.telemetry.badgeClass}`}>
                      {selectedVehicle.telemetry.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedVehicle.make} {selectedVehicle.model} • Driver: {selectedVehicle.driver?.full_name || 'Unassigned'} • Status: {selectedVehicle.status}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-5 text-[11px]">
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold">SPEED</span>
                  <span className="font-mono font-bold text-slate-900">--</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold">IGNITION</span>
                  <span className="font-semibold text-slate-600">Unavailable</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold">LAST GPS SIGNAL</span>
                  <span className="text-slate-600 font-mono">Never (No Feed)</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold">HARDWARE UNIT</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedVehicle.device ? selectedVehicle.device.device_imei : 'Awaiting Data'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Setup Guide Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-md shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">GPS PROVIDER INTEGRATION GUIDE</h3>
              </div>
              <button 
                onClick={() => setShowSetupModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Your Noor Fleet ERP is architected to be <strong>vendor-agnostic</strong>. It accepts live coordinates from any modern fleet telematics hardware via standard REST polling or webhooks.
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                <div className="font-bold text-slate-900">1. Confirm Tracking Vendor</div>
                <p className="text-slate-600 text-[11px]">
                  Provide the API endpoint, authentication method (Bearer token, API key, or OAuth2), and JSON payload format.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                <div className="font-bold text-slate-900">2. Configure Supabase Secrets</div>
                <p className="text-slate-600 text-[11px]">
                  Store credentials on the backend. No secrets are ever exposed in frontend code:
                </p>
                <code className="block bg-slate-900 text-amber-300 p-2 rounded text-[10px] font-mono mt-1">
                  supabase secrets set GPS_PROVIDER_BASE_URL="https://api.vendor.com/v1" GPS_PROVIDER_API_KEY="..."
                </code>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                <div className="font-bold text-slate-900">3. Activate Scheduled Sync or Webhook</div>
                <p className="text-slate-600 text-[11px]">
                  Deploy <code className="font-mono text-slate-800 font-semibold">sync-gps-positions</code> Edge Function to process coordinates with the active speed and stationary jitter filters.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowSetupModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

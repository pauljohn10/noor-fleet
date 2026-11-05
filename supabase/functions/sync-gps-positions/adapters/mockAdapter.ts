// Development Mock Adapter for Noor Fleet Telematics
// NOTE: Clearly labelled as SIMULATED_MOCK_FOR_DEV_ONLY in accordance with safety guidelines.

import { IGpsProviderAdapter, NormalizedGpsPing } from './types.ts';

// Key geographical waypoints along the Saudi Eastern Province & Riyadh petroleum corridors
const SAUDI_FLEET_CORRIDORS = [
  { name: 'Dammam Fuel Terminal Depot', lat: 26.4344, lon: 50.1033 },
  { name: 'Dammam-Riyadh Expressway Mile 80', lat: 26.0123, lon: 48.5521 },
  { name: 'Dahna Sand Corridor (Highway 40)', lat: 25.5412, lon: 47.6214 },
  { name: 'Riyadh North Distribution Depot', lat: 24.7136, lon: 46.6753 },
  { name: 'Ras Tanura Aramco Bulk Plant', lat: 26.6749, lon: 50.1557 },
  { name: 'Jubail Industrial Tanker Terminal', lat: 27.0046, lon: 49.6582 },
  { name: 'Al Ahsa (Hofuf) Delivery Station', lat: 25.3783, lon: 49.5855 }
];

export class MockGpsProviderAdapter implements IGpsProviderAdapter {
  readonly providerName = 'SIMULATED_MOCK_ADAPTER_FOR_DEV_ONLY';

  async authenticate(): Promise<boolean> {
    // Simulated handshake always succeeds in test environment
    return Promise.resolve(true);
  }

  async testConnection(): Promise<{ success: boolean; message: string; latency_ms: number }> {
    return Promise.resolve({
      success: true,
      message: 'Mock GPS Provider Adapter is operational (Development Mode)',
      latency_ms: 42
    });
  }

  async fetchLatestPositions(
    deviceImeis: string[] = ['IMEI-864019283746101', 'IMEI-864019283746102', 'IMEI-864019283746103']
  ): Promise<NormalizedGpsPing[]> {
    const now = new Date();
    const pings: NormalizedGpsPing[] = [];

    deviceImeis.forEach((imei, idx) => {
      const waypoint = SAUDI_FLEET_CORRIDORS[idx % SAUDI_FLEET_CORRIDORS.length];
      
      // Inject slight jitter/movement along highway
      const deltaLat = (Math.random() - 0.5) * 0.008;
      const deltaLon = (Math.random() - 0.5) * 0.008;
      const speed = idx === 2 ? 0.0 : 68.0 + Math.random() * 12.0; // Vehicle 3 parked, others in transit
      const isIgnitionOn = speed > 0;

      pings.push({
        device_imei: imei,
        latitude: +(waypoint.lat + deltaLat).toFixed(7),
        longitude: +(waypoint.lon + deltaLon).toFixed(7),
        speed_kmh: +speed.toFixed(1),
        heading_degrees: +(180.0 + Math.random() * 45.0).toFixed(1),
        altitude_meters: 145.0,
        ignition_on: isIgnitionOn,
        odometer_km: 142500 + Math.floor(Math.random() * 150),
        gps_timestamp: new Date(now.getTime() - idx * 30000).toISOString(),
        received_at: now.toISOString(),
        accuracy_meters: 6.5,
        battery_level: 98,
        data_source: 'SIMULATED_MOCK_FOR_DEV_ONLY',
        raw_payload: {
          simulated_note: 'Development mock telemetry data. Not real vehicle positions.',
          corridor: waypoint.name,
          mock_batch: Date.now()
        }
      });
    });

    return Promise.resolve(pings);
  }
}

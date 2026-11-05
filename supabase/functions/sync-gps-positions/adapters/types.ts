// Supabase Edge Function: sync-gps-positions
// Module: Hardware-Independent GPS Provider Adapter Contracts

export interface RawGpsPayload {
  [key: string]: unknown;
}

export type GpsDataSource = 'LIVE_PROVIDER' | 'SIMULATED_MOCK_FOR_DEV_ONLY' | 'MANUAL_ODOMETER_ENTRY';

export interface NormalizedGpsPing {
  device_imei: string;
  vehicle_id?: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading_degrees: number;
  altitude_meters?: number;
  ignition_on: boolean;
  odometer_km?: number;
  gps_timestamp: string;      // ISO 8601 UTC timestamp from GPS satellite
  received_at: string;        // Server receipt timestamp ISO 8601 UTC
  accuracy_meters?: number;
  battery_level?: number;
  data_source: GpsDataSource;
  raw_payload?: RawGpsPayload;
}

export interface IGpsProviderAdapter {
  readonly providerName: string;
  authenticate(): Promise<boolean>;
  fetchLatestPositions(deviceImeis?: string[], sinceTimestamp?: string): Promise<NormalizedGpsPing[]>;
  testConnection(): Promise<{ success: boolean; message: string; latency_ms: number }>;
}

export interface SyncResult {
  provider_name: string;
  pings_received: number;
  pings_inserted: number;
  pings_skipped_duplicate: number;
  pings_rejected_anomaly: number;
  sync_status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' | 'SKIPPED';
  api_latency_ms: number;
  error_message?: string;
}

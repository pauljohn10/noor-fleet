// Generic REST Provider Adapter for Noor Fleet Telematics
// Configurable for any standard HTTP REST telematics gateway once confirmed by management.

import { IGpsProviderAdapter, NormalizedGpsPing, RawGpsPayload } from './types.ts';

export interface GenericRestConfig {
  baseUrl: string;
  apiKey?: string;
  authHeaderName?: string;
  authHeaderPrefix?: string;
  timeoutMs?: number;
}

export class GenericRestAdapter implements IGpsProviderAdapter {
  readonly providerName = 'GENERIC_REST_PROVIDER';
  private config: GenericRestConfig;

  constructor(config?: Partial<GenericRestConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || Deno.env.get('GPS_PROVIDER_BASE_URL') || '',
      apiKey: config?.apiKey || Deno.env.get('GPS_PROVIDER_API_KEY') || '',
      authHeaderName: config?.authHeaderName || Deno.env.get('GPS_PROVIDER_AUTH_HEADER') || 'Authorization',
      authHeaderPrefix: config?.authHeaderPrefix || 'Bearer ',
      timeoutMs: config?.timeoutMs || 15000
    };
  }

  async authenticate(): Promise<boolean> {
    if (!this.config.baseUrl) {
      console.warn('[GenericRestAdapter] GPS_PROVIDER_BASE_URL is not configured.');
      return false;
    }
    return true;
  }

  async testConnection(): Promise<{ success: boolean; message: string; latency_ms: number }> {
    const startTime = performance.now();
    try {
      if (!this.config.baseUrl) {
        return {
          success: false,
          message: 'GPS Provider URL is not yet configured. Please supply provider details in Supabase Secrets.',
          latency_ms: 0
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - startTime);

      if (response.ok) {
        return { success: true, message: `Connected successfully (${response.status})`, latency_ms: latency };
      } else {
        return { success: false, message: `Provider returned HTTP ${response.status}`, latency_ms: latency };
      }
    } catch (err: unknown) {
      const latency = Math.round(performance.now() - startTime);
      const errorMsg = err instanceof Error ? err.message : 'Unknown network failure';
      return { success: false, message: `Connection failed: ${errorMsg}`, latency_ms: latency };
    }
  }

  async fetchLatestPositions(deviceImeis?: string[], sinceTimestamp?: string): Promise<NormalizedGpsPing[]> {
    if (!this.config.baseUrl) {
      throw new Error('GPS Provider API URL is missing. Set GPS_PROVIDER_BASE_URL in Supabase Secrets.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    const queryParams = new URLSearchParams();
    if (sinceTimestamp) queryParams.set('since', sinceTimestamp);
    if (deviceImeis && deviceImeis.length > 0) queryParams.set('devices', deviceImeis.join(','));

    const response = await fetch(`${this.config.baseUrl}/positions?${queryParams.toString()}`, {
      method: 'GET',
      headers: this.buildHeaders(),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Provider API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();
    return this.normalizeProviderPayload(rawData);
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (this.config.apiKey) {
      headers[this.config.authHeaderName!] = `${this.config.authHeaderPrefix}${this.config.apiKey}`.trim();
    }

    return headers;
  }

  /**
   * Normalizes raw third-party payloads into standard Noor Fleet NormalizedGpsPing array.
   * This mapping will be fine-tuned once the vendor API response specification is confirmed.
   */
  private normalizeProviderPayload(rawItems: RawGpsPayload[] | unknown): NormalizedGpsPing[] {
    if (!Array.isArray(rawItems)) return [];

    const nowIso = new Date().toISOString();
    return rawItems.map((item: any) => ({
      device_imei: item.imei || item.device_id || item.serial || 'UNKNOWN_IMEI',
      vehicle_id: item.vehicle_id || undefined,
      latitude: Number(item.lat ?? item.latitude ?? 0),
      longitude: Number(item.lon ?? item.longitude ?? 0),
      speed_kmh: Number(item.speed ?? item.speed_kmh ?? 0),
      heading_degrees: Number(item.heading ?? item.course ?? 0),
      altitude_meters: item.altitude ? Number(item.altitude) : undefined,
      ignition_on: Boolean(item.ignition ?? item.acc ?? (Number(item.speed ?? 0) > 0)),
      odometer_km: item.odometer ? Math.round(Number(item.odometer) / 1000) : undefined,
      gps_timestamp: item.timestamp ? new Date(item.timestamp).toISOString() : nowIso,
      received_at: nowIso,
      accuracy_meters: item.accuracy ? Number(item.accuracy) : 10.0,
      battery_level: item.battery ? Number(item.battery) : undefined,
      data_source: 'LIVE_PROVIDER',
      raw_payload: item
    }));
  }
}

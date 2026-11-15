// Sniper GPS Provider Adapter Scaffold for Noor Fleet Telematics
// SECURITY:
// - Reads all credentials exclusively from Supabase Secrets (Deno.env).
// - Enforces HTTPS for external API communication.
// - Never logs or returns API keys, tokens, usernames, or passwords.
// - Do NOT enable against production until official Sniper API documentation
//   and management authorization are confirmed.

import { IGpsProviderAdapter, NormalizedGpsPing, RawGpsPayload } from './types.ts';

export class SniperGpsAdapter implements IGpsProviderAdapter {
  readonly providerName = 'SNIPER_GPS_PROVIDER';
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiToken: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = (Deno.env.get('SNIPER_API_BASE_URL') || '').trim().replace(/\/+$/, '');
    this.apiKey = (Deno.env.get('SNIPER_API_KEY') || '').trim();
    this.apiToken = (Deno.env.get('SNIPER_API_TOKEN') || '').trim();
    this.timeoutMs = 15000;
  }

  private assertConfigured(): void {
    if (!this.baseUrl) {
      throw new Error('Sniper GPS API is not configured. Store SNIPER_API_BASE_URL in Supabase Secrets.');
    }
    if (!this.baseUrl.startsWith('https://')) {
      throw new Error('Sniper GPS API base URL must use HTTPS.');
    }
    if (!this.apiKey && !this.apiToken) {
      throw new Error('Sniper GPS credentials are not configured in Supabase Secrets.');
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    } else if (this.apiKey) {
      const headerName = (Deno.env.get('SNIPER_AUTH_HEADER') || 'X-API-Key').trim();
      headers[headerName] = this.apiKey;
    }
    return headers;
  }

  async authenticate(): Promise<boolean> {
    this.assertConfigured();
    return true;
  }

  async testConnection(): Promise<{ success: boolean; message: string; latency_ms: number }> {
    const startTime = performance.now();
    try {
      this.assertConfigured();

      const positionsPath = (Deno.env.get('SNIPER_POSITIONS_PATH') || '/positions').trim();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}${positionsPath}`, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - startTime);

      if (response.ok) {
        return {
          success: true,
          message: `Sniper GPS API reachable (HTTP ${response.status})`,
          latency_ms: latency,
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: `Sniper GPS authentication rejected (HTTP ${response.status}). Verify Supabase Secrets.`,
          latency_ms: latency,
        };
      }

      return {
        success: false,
        message: `Sniper GPS API returned HTTP ${response.status}`,
        latency_ms: latency,
      };
    } catch (err: unknown) {
      const latency = Math.round(performance.now() - startTime);
      const msg = err instanceof Error && err.name === 'AbortError'
        ? 'Sniper GPS API request timed out'
        : err instanceof Error
          ? err.message
          : 'Network error connecting to Sniper GPS API';
      return { success: false, message: msg, latency_ms: latency };
    }
  }

  async fetchLatestPositions(deviceImeis?: string[], sinceTimestamp?: string): Promise<NormalizedGpsPing[]> {
    this.assertConfigured();

    const positionsPath = (Deno.env.get('SNIPER_POSITIONS_PATH') || '/positions').trim();
    const params = new URLSearchParams();
    if (sinceTimestamp) params.set('since', sinceTimestamp);
    if (deviceImeis && deviceImeis.length > 0) params.set('imeis', deviceImeis.join(','));

    const qs = params.toString();
    const url = `${this.baseUrl}${positionsPath}${qs ? `?${qs}` : ''}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Sniper GPS authentication failed (HTTP ${response.status}).`);
      }
      if (response.status === 429) {
        throw new Error('Sniper GPS API rate limit exceeded (HTTP 429). Please wait before syncing again.');
      }
      if (!response.ok) {
        throw new Error(`Sniper GPS API returned HTTP ${response.status}.`);
      }

      const payload = await response.json();
      return this.normalizePayload(payload);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Sniper GPS API request timed out.');
      }
      throw err;
    }
  }

  private normalizePayload(raw: unknown): NormalizedGpsPing[] {
    const items: RawGpsPayload[] = Array.isArray(raw)
      ? raw
      : (raw && typeof raw === 'object' && Array.isArray((raw as RawGpsPayload).data))
        ? ((raw as RawGpsPayload).data as RawGpsPayload[])
        : (raw && typeof raw === 'object' && Array.isArray((raw as RawGpsPayload).positions))
          ? ((raw as RawGpsPayload).positions as RawGpsPayload[])
          : [];

    const nowIso = new Date().toISOString();

    return items
      .map((item): NormalizedGpsPing | null => {
        const imei = String(item.imei ?? item.device_imei ?? item.deviceId ?? '').trim();
        const lat = Number(item.latitude ?? item.lat);
        const lon = Number(item.longitude ?? item.lng ?? item.lon);

        if (!imei || !Number.isFinite(lat) || !Number.isFinite(lon)) {
          return null;
        }

        const speed = Number(item.speed_kmh ?? item.speed ?? 0);
        const heading = Number(item.heading_degrees ?? item.heading ?? item.course ?? 0);
        const odometer = item.odometer_km ?? item.odometer;
        const tsRaw = item.gps_timestamp ?? item.timestamp ?? item.fixTime ?? item.deviceTime;
        const gpsTimestamp = tsRaw ? new Date(String(tsRaw)).toISOString() : nowIso;

        return {
          device_imei: imei,
          latitude: lat,
          longitude: lon,
          speed_kmh: Number.isFinite(speed) ? speed : 0,
          heading_degrees: Number.isFinite(heading) ? heading : 0,
          altitude_meters: item.altitude !== undefined ? Number(item.altitude) : undefined,
          ignition_on: Boolean(item.ignition_on ?? item.ignition ?? (speed > 0)),
          odometer_km: odometer !== undefined && Number.isFinite(Number(odometer)) ? Number(odometer) : undefined,
          gps_timestamp: gpsTimestamp,
          received_at: nowIso,
          accuracy_meters: item.accuracy !== undefined ? Number(item.accuracy) : undefined,
          battery_level: item.battery !== undefined ? Number(item.battery) : undefined,
          data_source: 'LIVE_PROVIDER',
          // Store only sanitized non-credential telemetry metadata
          raw_payload: {
            provider: 'SNIPER',
            gps_timestamp: gpsTimestamp,
          },
        };
      })
      .filter((p): p is NormalizedGpsPing => p !== null);
  }
}

// Supabase Edge Function: sync-gps-positions
// Follows Deno 2 / Supabase standard runtime.
// Provider-agnostic telematics synchronization engine.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { IGpsProviderAdapter, NormalizedGpsPing, SyncResult } from './adapters/types.ts';
import { MockGpsProviderAdapter } from './adapters/mockAdapter.ts';
import { GenericRestAdapter } from './adapters/genericRestAdapter.ts';
import { validateGpsPing } from './filters/anomalyFilter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = performance.now();
  const syncBatchId = crypto.randomUUID();

  try {
    // 1. Initialize Supabase Admin client using internal server environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Select Adapter via Environment Setting (Defaults safely to Mock while provider is unconfirmed)
    const providerType = Deno.env.get('GPS_PROVIDER_TYPE') || 'MOCK';
    let adapter: IGpsProviderAdapter;

    if (providerType === 'GENERIC_REST') {
      adapter = new GenericRestAdapter();
    } else {
      adapter = new MockGpsProviderAdapter();
    }

    console.log(`[sync-gps-positions] Starting synchronization using adapter: ${adapter.providerName}`);

    // 3. Fetch Registered GPS Devices from DB to map IMEI -> vehicle_id
    const { data: registeredDevices, error: devicesError } = await supabase
      .from('gps_devices')
      .select('id, device_imei, installed_vehicle_id, is_active')
      .eq('is_active', true);

    if (devicesError) {
      console.warn('[sync-gps-positions] Notice: gps_devices query note:', devicesError.message);
    }

    const imeiToDeviceMap = new Map<string, { id: string; vehicle_id: string }>();
    if (registeredDevices) {
      for (const d of registeredDevices) {
        if (d.installed_vehicle_id) {
          imeiToDeviceMap.set(d.device_imei, { id: d.id, vehicle_id: d.installed_vehicle_id });
        }
      }
    }

    // 4. Ingest Telematics from Adapter
    const latestPings: NormalizedGpsPing[] = await adapter.fetchLatestPositions();
    let insertedCount = 0;
    let duplicateSkippedCount = 0;
    let anomalyRejectedCount = 0;

    // 5. Process & Validate Each Ping
    for (const ping of latestPings) {
      const deviceLink = imeiToDeviceMap.get(ping.device_imei);
      const vehicleId = ping.vehicle_id || deviceLink?.vehicle_id;
      const deviceId = deviceLink?.id;

      if (!vehicleId) {
        // Skip pings for devices not mapped to a fleet vehicle
        continue;
      }

      // Validate against basic constraints and jitter
      const validation = validateGpsPing(ping);
      if (validation.isJitterDuplicate) {
        duplicateSkippedCount++;
        continue;
      }
      if (!validation.isValid) {
        anomalyRejectedCount++;
        console.warn(`[sync-gps-positions] Ping rejected for ${ping.device_imei}: ${validation.reason}`);
        continue;
      }

      // Upsert into vehicle_gps_pings
      const { error: insertError } = await supabase
        .from('vehicle_gps_pings')
        .insert({
          device_id: deviceId,
          vehicle_id: vehicleId,
          latitude: ping.latitude,
          longitude: ping.longitude,
          speed_kmh: ping.speed_kmh,
          heading_degrees: ping.heading_degrees,
          altitude_meters: ping.altitude_meters,
          ignition_on: ping.ignition_on,
          odometer_km: ping.odometer_km,
          gps_timestamp: ping.gps_timestamp,
          received_at: ping.received_at,
          accuracy_meters: ping.accuracy_meters,
          is_valid_point: true,
          data_source: ping.data_source,
          sync_batch_id: syncBatchId,
          raw_telematics: ping.raw_payload
        });

      if (insertError) {
        // Unique constraint violation indicates duplicate timestamp
        if (insertError.code === '23505') {
          duplicateSkippedCount++;
        } else {
          console.error(`[sync-gps-positions] Insert error for vehicle ${vehicleId}:`, insertError.message);
        }
      } else {
        insertedCount++;

        // Update vehicle's latest odometer and status if on trip
        if (ping.odometer_km) {
          await supabase
            .from('vehicles')
            .update({
              current_mileage: ping.odometer_km,
              status: ping.speed_kmh > 0 ? 'ON_TRIP' : undefined,
              updated_at: new Date().toISOString()
            })
            .eq('id', vehicleId);
        }
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);

    const result: SyncResult = {
      provider_name: adapter.providerName,
      pings_received: latestPings.length,
      pings_inserted: insertedCount,
      pings_skipped_duplicate: duplicateSkippedCount,
      pings_rejected_anomaly: anomalyRejectedCount,
      sync_status: insertedCount > 0 || latestPings.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
      api_latency_ms: latencyMs
    };

    // 6. Record Diagnostics in gps_sync_logs
    await supabase.from('gps_sync_logs').insert({
      id: syncBatchId,
      provider_name: result.provider_name,
      sync_status: result.sync_status,
      pings_received: result.pings_received,
      pings_inserted: result.pings_inserted,
      pings_skipped_duplicate: result.pings_skipped_duplicate,
      pings_rejected_anomaly: result.pings_rejected_anomaly,
      api_latency_ms: latencyMs,
      triggered_by: req.headers.get('x-triggered-by') || 'HTTP_CALL',
      sync_completed_at: new Date().toISOString()
    });

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error during GPS sync';
    const latencyMs = Math.round(performance.now() - startTime);

    console.error('[sync-gps-positions] Fatal error:', errorMsg);

    return new Response(
      JSON.stringify({
        error: errorMsg,
        sync_status: 'FAILED',
        latency_ms: latencyMs,
        sync_batch_id: syncBatchId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

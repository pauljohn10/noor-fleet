// Supabase Edge Function: sync-gps-positions
// Follows Deno 2 / Supabase standard runtime.
// Security-hardened telematics synchronization engine.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { IGpsProviderAdapter, NormalizedGpsPing, SyncResult } from './adapters/types.ts';
import { MockGpsProviderAdapter } from './adapters/mockAdapter.ts';
import { GenericRestAdapter } from './adapters/genericRestAdapter.ts';
import { SniperGpsAdapter } from './adapters/sniperAdapter.ts';
import { validateGpsPing } from './filters/anomalyFilter.ts';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-triggered-by, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYNC_ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'FLEET_MANAGER']);
const MANUAL_SYNC_COOLDOWN_MS = 30_000;

function sanitizeErrorMessage(raw: string): string {
  return raw
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/(api[_-]?key|token|password|secret)=[^&\s]+/gi, '$1=[REDACTED]')
    .slice(0, 300);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  const startTime = performance.now();
  const syncBatchId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server configuration incomplete.');
    }

    // 1. Authenticate caller: either valid cron secret OR authorized Supabase user JWT
    const cronSecret = Deno.env.get('GPS_SYNC_CRON_SECRET') || '';
    const providedCronSecret = req.headers.get('x-cron-secret') || '';
    const isCronAuthorized = Boolean(cronSecret && constantTimeEqual(cronSecret, providedCronSecret));

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    let triggeredBy = isCronAuthorized ? 'SCHEDULED_CRON' : 'MANUAL_REFRESH';

    if (!isCronAuthorized) {
      const authHeader = req.headers.get('Authorization') || '';
      const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

      if (!jwt || !supabaseAnonKey) {
        return new Response(JSON.stringify({ error: 'Authentication required.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }

      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      });

      const { data: userData, error: authErr } = await supabaseUser.auth.getUser(jwt);
      if (authErr || !userData?.user) {
        return new Response(JSON.stringify({ error: 'Invalid or expired session.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }

      const { data: profile, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('role, is_active')
        .eq('id', userData.user.id)
        .single();

      if (profErr || !profile || profile.is_active === false) {
        return new Response(JSON.stringify({ error: 'Account inactive or unauthorized.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }

      const role = String(profile.role || '').toUpperCase();
      if (!SYNC_ALLOWED_ROLES.has(role)) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Only Super Admin or Fleet Manager can trigger GPS sync.' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          },
        );
      }

      triggeredBy = req.headers.get('x-triggered-by') === 'TEST_CONNECTION' ? 'TEST_CONNECTION' : 'MANUAL_REFRESH';
    }

    // Parse optional action body
    let action = 'sync';
    try {
      const body = await req.json();
      if (body && typeof body.action === 'string') {
        action = body.action;
      }
    } catch {
      // Empty body defaults to 'sync'
    }

    // 2. Select Adapter (NEVER fall back to mock GPS data in production)
    const providerType = (Deno.env.get('GPS_PROVIDER_TYPE') || '').trim().toUpperCase();
    const allowDevMock = Deno.env.get('ALLOW_DEV_MOCK_GPS') === 'true';

    let adapter: IGpsProviderAdapter;
    if (providerType === 'SNIPER') {
      adapter = new SniperGpsAdapter();
    } else if (providerType === 'GENERIC_REST') {
      adapter = new GenericRestAdapter();
    } else if (providerType === 'MOCK' && allowDevMock) {
      adapter = new MockGpsProviderAdapter();
    } else {
      return new Response(
        JSON.stringify({
          error: 'GPS provider is not configured. Set GPS_PROVIDER_TYPE=SNIPER and provider secrets in Supabase Secrets.',
          sync_status: 'FAILED',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503,
        },
      );
    }

    // If action === 'test', perform connection test without inserting pings
    if (action === 'test') {
      const testRes = await adapter.testConnection();
      return new Response(JSON.stringify(testRes), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: testRes.success ? 200 : 502,
      });
    }

    // 3. Rate limit manual sync calls
    if (!isCronAuthorized) {
      const { data: recentLogs } = await supabaseAdmin
        .from('gps_sync_logs')
        .select('sync_started_at')
        .order('sync_started_at', { ascending: false })
        .limit(1);

      const lastStarted = recentLogs?.[0]?.sync_started_at
        ? new Date(recentLogs[0].sync_started_at).getTime()
        : 0;

      const elapsed = Date.now() - lastStarted;
      if (elapsed < MANUAL_SYNC_COOLDOWN_MS) {
        const retryAfterSec = Math.ceil((MANUAL_SYNC_COOLDOWN_MS - elapsed) / 1000);
        return new Response(
          JSON.stringify({
            error: `Sync cooldown active. Please wait ${retryAfterSec}s before syncing again.`,
            retry_after_seconds: retryAfterSec,
            sync_status: 'SKIPPED',
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfterSec),
            },
            status: 429,
          },
        );
      }
    }

    // 4. Fetch Registered Active GPS Devices from DB to map IMEI -> vehicle_id
    const { data: registeredDevices, error: devicesError } = await supabaseAdmin
      .from('gps_devices')
      .select('id, device_imei, installed_vehicle_id, is_active')
      .eq('is_active', true);

    if (devicesError) {
      throw new Error('Failed to load registered GPS devices.');
    }

    const imeiToDeviceMap = new Map<string, { id: string; vehicle_id: string }>();
    const activeImeis: string[] = [];
    if (registeredDevices) {
      for (const d of registeredDevices) {
        activeImeis.push(d.device_imei);
        if (d.installed_vehicle_id) {
          imeiToDeviceMap.set(d.device_imei, { id: d.id, vehicle_id: d.installed_vehicle_id });
        }
      }
    }

    // Determine incremental sinceTimestamp from last successful sync
    const { data: lastSuccessSync } = await supabaseAdmin
      .from('gps_sync_logs')
      .select('sync_completed_at')
      .eq('sync_status', 'SUCCESS')
      .order('sync_completed_at', { ascending: false })
      .limit(1);

    const sinceTimestamp = lastSuccessSync?.[0]?.sync_completed_at || undefined;

    // 5. Ingest Telematics from Adapter
    const latestPings: NormalizedGpsPing[] = await adapter.fetchLatestPositions(activeImeis, sinceTimestamp);
    let insertedCount = 0;
    let duplicateSkippedCount = 0;
    let anomalyRejectedCount = 0;

    // 6. Process & Validate Each Ping
    for (const ping of latestPings) {
      const deviceLink = imeiToDeviceMap.get(ping.device_imei);
      const vehicleId = ping.vehicle_id || deviceLink?.vehicle_id;
      const deviceId = deviceLink?.id;

      if (!vehicleId) {
        continue;
      }

      const validation = validateGpsPing(ping);
      if (validation.isJitterDuplicate) {
        duplicateSkippedCount++;
        continue;
      }
      if (!validation.isValid) {
        anomalyRejectedCount++;
        continue;
      }

      const { error: insertError } = await supabaseAdmin
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
          raw_telematics: ping.raw_payload,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          duplicateSkippedCount++;
        }
      } else {
        insertedCount++;

        if (deviceId) {
          await supabaseAdmin
            .from('gps_devices')
            .update({
              last_heartbeat: ping.gps_timestamp,
              updated_at: new Date().toISOString(),
            })
            .eq('id', deviceId);
        }

        if (ping.odometer_km) {
          await supabaseAdmin
            .from('vehicles')
            .update({
              current_mileage: ping.odometer_km,
              status: ping.speed_kmh > 0 ? 'ON_TRIP' : undefined,
              updated_at: new Date().toISOString(),
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
      api_latency_ms: latencyMs,
    };

    await supabaseAdmin.from('gps_sync_logs').insert({
      id: syncBatchId,
      provider_name: result.provider_name,
      sync_status: result.sync_status,
      pings_received: result.pings_received,
      pings_inserted: result.pings_inserted,
      pings_skipped_duplicate: result.pings_skipped_duplicate,
      pings_rejected_anomaly: result.pings_rejected_anomaly,
      api_latency_ms: latencyMs,
      triggered_by: triggeredBy,
      sync_completed_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const rawMsg = error instanceof Error ? error.message : 'Unknown error during GPS sync';
    const safeMsg = sanitizeErrorMessage(rawMsg);
    const latencyMs = Math.round(performance.now() - startTime);

    console.error('[sync-gps-positions] Error:', safeMsg);

    return new Response(
      JSON.stringify({
        error: safeMsg,
        sync_status: 'FAILED',
        latency_ms: latencyMs,
        sync_batch_id: syncBatchId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

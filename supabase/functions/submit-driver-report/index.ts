// Supabase Edge Function: submit-driver-report
// Secure server-side endpoint for public Driver Issue Reporting Portal (/driver-report).
// - Requires NO driver account or password.
// - Uses SUPABASE_SERVICE_ROLE_KEY strictly on the server (never exposed to the client).
// - Sanitizes and validates all inputs, enforces IP rate limiting & honeypot spam checks.
// - Links submitted plate_number to existing registered vehicles without creating duplicates.
// - Restricts public access to report submission only (never returns other drivers' reports).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_CATEGORIES = new Set([
  'Mechanical',
  'Electrical',
  'Tire',
  'Accident',
  'Other',
]);

// In-memory sliding window rate limiter per IP (max 5 submissions per 10 minutes)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitMap.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

function sanitizeText(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, maxLength);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST to submit a report.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown';

    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({
          error: 'Too many submissions from this device. Please wait a few minutes before submitting another report.',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();

    // Honeypot check against automated bots
    if (body.website_url || body.honeypot) {
      return new Response(
        JSON.stringify({ success: true, report_number: 'DEF-2026-00000' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const driverName = sanitizeText(body.driver_name, 120);
    const plateNumber = sanitizeText(body.plate_number, 40).toUpperCase();
    const rawCategory = sanitizeText(body.category, 40);
    const category = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : 'Other';
    const description = sanitizeText(body.description, 2000);
    const photoUrl = typeof body.photo_url === 'string' && body.photo_url.length <= 1_500_000
      ? body.photo_url.trim()
      : null;

    if (driverName.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Driver Name is required (minimum 2 characters).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (plateNumber.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Vehicle Plate Number is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (description.length < 5) {
      return new Response(
        JSON.stringify({ error: 'Please provide a brief description of the vehicle issue (minimum 5 characters).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server configuration missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Match plate_number against existing registered vehicles (never create duplicate vehicle records)
    const { data: matchedVehicles } = await supabase
      .from('vehicles')
      .select('id, vehicle_id, plate_number, assigned_driver_id, assigned_trailer_id')
      .or(`plate_number.ilike.${plateNumber},vehicle_id.ilike.${plateNumber}`)
      .limit(1);

    const matchedVehicle = matchedVehicles && matchedVehicles.length > 0 ? matchedVehicles[0] : null;
    const resolvedVehicleCode = matchedVehicle ? matchedVehicle.vehicle_id : plateNumber;

    // Generate sequential report number
    const { count } = await supabase
      .from('defect_reports')
      .select('id', { count: 'exact', head: true });

    const nextSeq = (count || 0) + 1;
    const nowIso = new Date().toISOString();
    const year = new Date().getFullYear();
    const reportNumber = `DEF-${year}-${String(nextSeq).padStart(5, '0')}`;

    const severity =
      category === 'Accident'
        ? 'CRITICAL'
        : category === 'Mechanical'
        ? 'HIGH'
        : 'MEDIUM';

    const { error: insertError } = await supabase.from('defect_reports').insert([
      {
        report_number: reportNumber,
        driver_id: matchedVehicle?.assigned_driver_id || null,
        driver_name: driverName,
        vehicle_id: resolvedVehicleCode,
        plate_number: matchedVehicle?.plate_number || plateNumber,
        category,
        severity,
        description,
        photo_url: photoUrl,
        status: 'NEW',
        created_at: nowIso,
      },
    ]);

    if (insertError) {
      console.error('[submit-driver-report] Insert error:', insertError.message);
      return new Response(
        JSON.stringify({ error: 'Unable to save report at this time. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_number: reportNumber,
        vehicle_id: resolvedVehicleCode,
        plate_number: matchedVehicle?.plate_number || plateNumber,
        submitted_at: nowIso,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[submit-driver-report] Exception:', msg);
    return new Response(
      JSON.stringify({ error: 'Failed to process driver issue report.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


import { createClient } from '@supabase/supabase-js';

const ALLOWED_ROLES = [
  'SUPER_ADMIN',
  'FLEET_MANAGER',
  'WORKSHOP_MANAGER',
  'FLEET_STAFF',
  'WORKSHOP_STAFF',
  'VIEWER',
] as const;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

function normalizeRole(role?: string | null): AllowedRole {
  const cleaned = (role || '').trim().toUpperCase();
  switch (cleaned) {
    case 'SUPER_ADMIN':
      return 'SUPER_ADMIN';
    case 'FLEET_MANAGER':
      return 'FLEET_MANAGER';
    case 'WORKSHOP_MANAGER':
    case 'WORKSHOP_SUPERVISOR':
      return 'WORKSHOP_MANAGER';
    case 'FLEET_STAFF':
    case 'OPERATIONS_STAFF':
      return 'FLEET_STAFF';
    case 'WORKSHOP_STAFF':
    case 'MECHANIC':
    case 'STOREKEEPER':
      return 'WORKSHOP_STAFF';
    case 'VIEWER':
    case 'MANAGEMENT':
    default:
      return 'VIEWER';
  }
}

function getEnv(name: string): string {
  return (process.env[name] || '').trim();
}

function getAdminSupabaseClient() {
  const supabaseUrl =
    getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const serviceRoleKey =
    getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Server configuration missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function verifySuperAdmin(req: any, adminClient: any): Promise<{
  actorId: string;
  actorEmail: string;
  actorName: string;
}> {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    const err: any = new Error('Missing Authorization bearer token.');
    err.statusCode = 401;
    throw err;
  }

  const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    const err: any = new Error('Invalid or expired session token.');
    err.statusCode = 401;
    throw err;
  }

  const caller = userData.user;

  const { data: profile, error: profErr } = await adminClient
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', caller.id)
    .maybeSingle();

  if (profErr || !profile) {
    const err: any = new Error('Unable to verify caller profile permissions.');
    err.statusCode = 403;
    throw err;
  }

  if (profile.is_active === false) {
    const err: any = new Error('Caller account is deactivated.');
    err.statusCode = 403;
    throw err;
  }

  const callerRole = normalizeRole(profile.role);
  if (callerRole !== 'SUPER_ADMIN') {
    const err: any = new Error(
      'Access Denied: Only Super Admin accounts can manage users and roles.'
    );
    err.statusCode = 403;
    throw err;
  }

  return {
    actorId: caller.id,
    actorEmail: profile.email || caller.email || '',
    actorName: profile.full_name || caller.email || 'Super Admin',
  };
}

async function recordAdminAuditLog(
  adminClient: any,
  params: {
    actorId: string;
    actorName: string;
    action: string;
    recordId: string;
    oldValues?: Record<string, any> | null;
    newValues?: Record<string, any> | null;
  }
) {
  try {
    await adminClient.from('audit_logs').insert({
      user_id: params.actorId,
      user_name: params.actorName,
      user_role: 'SUPER_ADMIN',
      action: params.action,
      module: 'USER_MANAGEMENT',
      record_id: params.recordId,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
    });
  } catch (err) {
    console.warn('Non-fatal audit log write error:', err);
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let adminClient: any;
  try {
    adminClient = getAdminSupabaseClient();
  } catch (cfgErr: any) {
    return res.status(503).json({
      error: cfgErr.message || 'Admin service unavailable.',
      code: 'MISSING_SERVICE_ROLE_KEY',
    });
  }

  let actor: { actorId: string; actorEmail: string; actorName: string };
  try {
    actor = await verifySuperAdmin(req, adminClient);
  } catch (authErr: any) {
    return res.status(authErr.statusCode || 403).json({
      error: authErr.message || 'Forbidden',
    });
  }

  try {
    // GET: List all users & profiles
    if (req.method === 'GET') {
      const [{ data: authUsersData, error: authListErr }, { data: profilesData, error: profListErr }] =
        await Promise.all([
          adminClient.auth.admin.listUsers({ page: 1, perPage: 500 }),
          adminClient
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false }),
        ]);

      if (authListErr) throw authListErr;
      if (profListErr) throw profListErr;

      const profileById = new Map<string, any>();
      for (const p of profilesData || []) {
        profileById.set(p.id, p);
      }

      const mergedUsers: any[] = [];
      const seenIds = new Set<string>();

      for (const au of authUsersData?.users || []) {
        seenIds.add(au.id);
        const p = profileById.get(au.id);
        const role = normalizeRole(p?.role || au.user_metadata?.role);
        mergedUsers.push({
          id: au.id,
          email: au.email || p?.email || '',
          full_name:
            p?.full_name ||
            au.user_metadata?.full_name ||
            (au.email ? au.email.split('@')[0] : 'User'),
          role,
          department:
            p?.department || au.user_metadata?.department || 'Fleet Operations',
          phone: p?.phone || au.user_metadata?.phone || '',
          is_active: p ? p.is_active !== false : true,
          created_at: p?.created_at || au.created_at,
          last_sign_in_at: au.last_sign_in_at || null,
          email_confirmed_at: au.email_confirmed_at || null,
        });
      }

      for (const p of profilesData || []) {
        if (!seenIds.has(p.id)) {
          mergedUsers.push({
            id: p.id,
            email: p.email || '',
            full_name: p.full_name || 'User',
            role: normalizeRole(p.role),
            department: p.department || 'Fleet Operations',
            phone: p.phone || '',
            is_active: p.is_active !== false,
            created_at: p.created_at,
            last_sign_in_at: null,
            email_confirmed_at: null,
          });
        }
      }

      return res.status(200).json({ users: mergedUsers });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const action = body.action;

    // 1. CREATE USER
    if (action === 'create-user') {
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';
      const full_name = (body.full_name || '').trim();
      const role = normalizeRole(body.role);
      const department = (body.department || 'Fleet Operations').trim();
      const phone = (body.phone || '').trim();
      const is_active = body.is_active !== false;

      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }
      if (!password || password.length < 6) {
        return res
          .status(400)
          .json({ error: 'Password must be at least 6 characters long.' });
      }
      if (!full_name) {
        return res.status(400).json({ error: 'Full name is required.' });
      }

      const { data: createdAuth, error: createErr } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name,
            role,
            department,
            phone,
            is_active,
          },
        });

      if (createErr || !createdAuth?.user) {
        return res.status(400).json({
          error: createErr?.message || 'Failed to create user in Supabase Auth.',
        });
      }

      const newUserId = createdAuth.user.id;

      const { error: upsertErr } = await adminClient.from('profiles').upsert(
        {
          id: newUserId,
          email,
          full_name,
          role,
          department,
          phone,
          is_active,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (upsertErr) {
        console.error('Profile upsert error:', upsertErr);
      }

      await recordAdminAuditLog(adminClient, {
        actorId: actor.actorId,
        actorName: actor.actorName,
        action: 'CREATE_USER',
        recordId: newUserId,
        newValues: { email, full_name, role, department, phone, is_active },
      });

      return res.status(200).json({
        user: {
          id: newUserId,
          email,
          full_name,
          role,
          department,
          phone,
          is_active,
          created_at: createdAuth.user.created_at,
          last_sign_in_at: null,
          email_confirmed_at: createdAuth.user.email_confirmed_at || new Date().toISOString(),
        },
      });
    }

    // 2. UPDATE USER ROLE / DETAILS
    if (action === 'update-user') {
      const userId = body.userId;
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId.' });
      }

      const role = normalizeRole(body.role);
      const full_name = (body.full_name || '').trim();
      const department = (body.department || 'Fleet Operations').trim();
      const phone = (body.phone || '').trim();
      const is_active = body.is_active !== false;

      if (userId === actor.actorId && role !== 'SUPER_ADMIN') {
        return res.status(400).json({
          error: 'Safety Lock: You cannot demote your own Super Admin account.',
        });
      }

      if (userId === actor.actorId && !is_active) {
        return res.status(400).json({
          error: 'Safety Lock: You cannot deactivate your own Super Admin account.',
        });
      }

      const { data: oldProfile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name,
          role,
          department,
          phone,
          is_active,
        },
      });

      const { data: updatedProfile, error: profErr } = await adminClient
        .from('profiles')
        .update({
          full_name,
          role,
          department,
          phone,
          is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('*')
        .single();

      if (profErr) {
        return res.status(400).json({ error: profErr.message });
      }

      await recordAdminAuditLog(adminClient, {
        actorId: actor.actorId,
        actorName: actor.actorName,
        action:
          oldProfile?.role !== role ? 'CHANGE_USER_ROLE' : 'UPDATE_USER_PROFILE',
        recordId: userId,
        oldValues: oldProfile || null,
        newValues: { full_name, role, department, phone, is_active },
      });

      return res.status(200).json({
        user: {
          ...updatedProfile,
          role: normalizeRole(updatedProfile.role),
        },
      });
    }

    // 3. TOGGLE ACTIVE / DEACTIVATE ACCOUNT
    if (action === 'toggle-active') {
      const userId = body.userId;
      const is_active = Boolean(body.is_active);

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId.' });
      }
      if (userId === actor.actorId && !is_active) {
        return res.status(400).json({
          error: 'Safety Lock: You cannot deactivate your own Super Admin account.',
        });
      }

      const { data: oldProfile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { error: profErr } = await adminClient
        .from('profiles')
        .update({
          is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profErr) {
        return res.status(400).json({ error: profErr.message });
      }

      await recordAdminAuditLog(adminClient, {
        actorId: actor.actorId,
        actorName: actor.actorName,
        action: is_active ? 'ACTIVATE_USER_ACCOUNT' : 'DEACTIVATE_USER_ACCOUNT',
        recordId: userId,
        oldValues: oldProfile ? { is_active: oldProfile.is_active } : null,
        newValues: { is_active },
      });

      return res.status(200).json({ success: true, is_active });
    }

    // 4. RESET PASSWORD
    if (action === 'reset-password') {
      const userId = body.userId;
      const newPassword = body.newPassword || '';

      if (!userId || newPassword.length < 6) {
        return res.status(400).json({
          error: 'Valid userId and password (min 6 characters) are required.',
        });
      }

      const { error: pwErr } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (pwErr) {
        return res.status(400).json({ error: pwErr.message });
      }

      await recordAdminAuditLog(adminClient, {
        actorId: actor.actorId,
        actorName: actor.actorName,
        action: 'RESET_USER_PASSWORD',
        recordId: userId,
      });

      return res.status(200).json({ success: true });
    }

    // 5. DELETE USER
    if (action === 'delete-user') {
      const userId = body.userId;
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId.' });
      }
      if (userId === actor.actorId) {
        return res.status(400).json({
          error: 'Safety Lock: You cannot delete your own Super Admin account.',
        });
      }

      const { data: oldProfile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      await adminClient.from('profiles').delete().eq('id', userId);
      const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
      if (delErr) {
        console.warn('Auth user deletion warning:', delErr.message);
      }

      await recordAdminAuditLog(adminClient, {
        actorId: actor.actorId,
        actorName: actor.actorName,
        action: 'DELETE_USER',
        recordId: userId,
        oldValues: oldProfile || null,
      });

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err: any) {
    console.error('Admin Users API Error:', err);
    return res.status(500).json({
      error: err.message || 'Internal Server Error',
    });
  }
}

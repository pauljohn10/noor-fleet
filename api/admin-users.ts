import { createClient } from '@supabase/supabase-js';

// Server-side Supabase Admin Client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xpbcfnxorfqnoraqdpiq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwYmNmbnhvcmZxbm9yYXFkcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQwMjMzMiwiZXhwIjoyMTA4OTc4MzMyfQ.xJl3mRJilo5nHwJavt9m_LDBgUMeDroSJPG_Q1L4S6A';

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper to parse JSON body from incoming Node.js / Vercel request
async function parseBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

// Verify caller JWT from Authorization header and confirm SUPER_ADMIN role
async function verifySuperAdmin(req: any): Promise<{ authorized: boolean; callerId?: string; error?: string }> {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing or malformed Authorization header.' };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) {
    return { authorized: false, error: 'Invalid or expired authentication token.' };
  }

  // Check role from profiles table
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  const isSuperAdmin = profile?.role === 'SUPER_ADMIN' || user.user_metadata?.role === 'SUPER_ADMIN';
  const isActive = profile ? profile.is_active : true;

  if (!isSuperAdmin || !isActive) {
    return { authorized: false, error: 'Unauthorized: Super Admin permissions required.' };
  }

  return { authorized: true, callerId: user.id };
}

// Check how many super admins currently exist
async function getSuperAdminCount(): Promise<number> {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('role', 'SUPER_ADMIN');

  if (error || !data) {
    // Fallback: check users metadata in auth.users
    const { data: authData } = await adminClient.auth.admin.listUsers();
    const count = (authData?.users || []).filter((u: any) => u.user_metadata?.role === 'SUPER_ADMIN').length;
    return count;
  }

  return data.length;
}

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const queryAction = url.searchParams.get('action');

    // 1. GET /api/admin-users?action=check-setup
    if (req.method === 'GET' && queryAction === 'check-setup') {
      const superAdminCount = await getSuperAdminCount();
      return res.status(200).json({
        setupRequired: superAdminCount === 0,
        superAdminCount
      });
    }

    const body = await parseBody(req);
    const action = body.action || queryAction;

    // 2. BOOTSTRAP: Register the initial Super Admin (ONLY allowed when 0 Super Admins exist)
    if (action === 'bootstrap') {
      const count = await getSuperAdminCount();
      if (count > 0) {
        return res.status(403).json({
          error: 'Forbidden: Super Admin setup has already been completed. Contact your administrator.'
        });
      }

      const { fullName, email, password, department } = body;
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanName = (fullName || '').trim();

      if (!cleanEmail || !cleanName || !password) {
        return res.status(400).json({ error: 'Full legal name, email, and password are required.' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }

      // Create initial Super Admin via Admin API
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          role: 'SUPER_ADMIN',
          department: (department || 'Executive Management').trim()
        }
      });

      if (createError || !newUser?.user) {
        return res.status(400).json({ error: createError?.message || 'Failed to create Super Admin account.' });
      }

      // Upsert into profiles to guarantee profile role is SUPER_ADMIN
      await adminClient.from('profiles').upsert({
        id: newUser.user.id,
        email: cleanEmail,
        full_name: cleanName,
        role: 'SUPER_ADMIN',
        department: (department || 'Executive Management').trim(),
        is_active: true
      });

      return res.status(201).json({
        success: true,
        message: 'Initial Super Admin account provisioned successfully. You may now sign in.',
        user: {
          id: newUser.user.id,
          email: cleanEmail,
          full_name: cleanName,
          role: 'SUPER_ADMIN'
        }
      });
    }

    // ALL SUBSEQUENT ACTIONS REQUIRE VERIFIED SUPER_ADMIN BEARER TOKEN
    const authCheck = await verifySuperAdmin(req);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error || 'Super Admin permission required.' });
    }

    // 3. LIST USERS
    if (action === 'list-users') {
      const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();
      if (authError) {
        return res.status(500).json({ error: authError.message });
      }

      const { data: profiles, error: profError } = await adminClient
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profError) {
        return res.status(500).json({ error: profError.message });
      }

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const combinedUsers = (authData?.users || []).map((u: any) => {
        const prof = profileMap.get(u.id);
        const role = prof?.role || u.user_metadata?.role || 'MANAGEMENT';
        return {
          id: u.id,
          email: u.email,
          full_name: prof?.full_name || u.user_metadata?.full_name || u.email?.split('@')[0],
          role: role,
          department: prof?.department || u.user_metadata?.department || 'Fleet Operations',
          is_active: prof ? prof.is_active : true,
          created_at: prof?.created_at || u.created_at,
          last_sign_in_at: u.last_sign_in_at || null,
          email_confirmed_at: u.email_confirmed_at || null
        };
      });

      return res.status(200).json({ users: combinedUsers });
    }

    // 4. CREATE USER (Super Admin provisions new employee account)
    if (action === 'create-user') {
      const { fullName, email, password, role, department } = body;
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanName = (fullName || '').trim();
      const validRole = ['SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT'].includes(role) ? role : 'MANAGEMENT';

      if (!cleanEmail || !cleanName || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }

      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          role: validRole,
          department: (department || 'Fleet Operations').trim()
        }
      });

      if (createErr || !created?.user) {
        return res.status(400).json({ error: createErr?.message || 'Failed to create user.' });
      }

      // Upsert profile
      await adminClient.from('profiles').upsert({
        id: created.user.id,
        email: cleanEmail,
        full_name: cleanName,
        role: validRole,
        department: (department || 'Fleet Operations').trim(),
        is_active: true
      });

      return res.status(201).json({
        success: true,
        message: `User ${cleanEmail} created successfully with role ${validRole}.`,
        user: {
          id: created.user.id,
          email: cleanEmail,
          full_name: cleanName,
          role: validRole
        }
      });
    }

    // 5. UPDATE USER (Name, Department, Role)
    if (action === 'update-user') {
      const { userId, fullName, role, department } = body;
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId parameter.' });
      }

      // Guard: Super Admin cannot demote their own account
      if (userId === authCheck.callerId && role && role !== 'SUPER_ADMIN') {
        return res.status(400).json({ error: 'Cannot demote your own Super Admin account.' });
      }

      const updates: any = {};
      const metadataUpdates: any = {};

      if (fullName) {
        updates.full_name = fullName.trim();
        metadataUpdates.full_name = fullName.trim();
      }
      if (role && ['SUPER_ADMIN', 'FLEET_MANAGER', 'MANAGEMENT'].includes(role)) {
        updates.role = role;
        metadataUpdates.role = role;
      }
      if (department !== undefined) {
        updates.department = department.trim();
        metadataUpdates.department = department.trim();
      }

      // Update Supabase profiles table
      const { error: profUpdateErr } = await adminClient
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (profUpdateErr) {
        return res.status(500).json({ error: profUpdateErr.message });
      }

      // Update auth user metadata
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: metadataUpdates
      });

      return res.status(200).json({ success: true, message: 'User updated successfully.' });
    }

    // 6. TOGGLE ACTIVE (Activate / Deactivate Account)
    if (action === 'toggle-active') {
      const { userId, isActive } = body;
      if (!userId || typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'Missing userId or isActive boolean.' });
      }

      if (userId === authCheck.callerId) {
        return res.status(400).json({ error: 'You cannot deactivate your own Super Admin account.' });
      }

      // Update profiles
      const { error: profErr } = await adminClient
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (profErr) {
        return res.status(500).json({ error: profErr.message });
      }

      // If deactivated, ban user session in Supabase Auth
      await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: isActive ? 'none' : '876000h'
      });

      return res.status(200).json({
        success: true,
        message: `User account has been ${isActive ? 'activated' : 'deactivated'}.`
      });
    }

    // 7. RESET PASSWORD (Direct password update by Super Admin)
    if (action === 'reset-password') {
      const { userId, newPassword } = body;
      if (!userId || !newPassword) {
        return res.status(400).json({ error: 'userId and newPassword are required.' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      }

      const { error: passErr } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (passErr) {
        return res.status(500).json({ error: passErr.message });
      }

      return res.status(200).json({ success: true, message: 'Password reset successfully.' });
    }

    // 8. DELETE USER
    if (action === 'delete-user') {
      const { userId } = body;
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId.' });
      }

      if (userId === authCheck.callerId) {
        return res.status(400).json({ error: 'You cannot delete your own Super Admin account.' });
      }

      // Delete from profiles
      await adminClient.from('profiles').delete().eq('id', userId);
      // Delete from auth.users
      const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
      if (delErr) {
        return res.status(500).json({ error: delErr.message });
      }

      return res.status(200).json({ success: true, message: 'User deleted permanently.' });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err: any) {
    console.error('[Admin API Exception]:', err);
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
}


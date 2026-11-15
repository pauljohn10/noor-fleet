import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { UserRole } from '../types';
import { normalizeRole } from './rbac';

export interface ManagedUserRecord {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  department?: string;
  phone?: string;
  is_active?: boolean;
}

export interface UpdateUserPayload {
  userId: string;
  full_name: string;
  role: UserRole;
  department?: string;
  phone?: string;
  is_active?: boolean;
}

export async function checkSetupStatus(): Promise<{ setupRequired: boolean }> {
  try {
    const res = await fetch('/api/admin-users?action=check-setup', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      // Never falsely show Initial Setup banner when unauthenticated RLS blocks direct profile reads
      return { setupRequired: false };
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { setupRequired: false };
    }
    const data = await res.json();
    return { setupRequired: Boolean(data.setupRequired) };
  } catch {
    return { setupRequired: false };
  }
}

export async function bootstrapSuperAdmin(payload: {
  fullName: string;
  email: string;
  password: string;
  department?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const status = await checkSetupStatus();
    if (!status.setupRequired) {
      return {
        success: false,
        error: 'A Super Admin account already exists in the system.',
      };
    }

    const email = payload.email.trim().toLowerCase();
    const full_name = payload.fullName.trim();
    const department = (payload.department || 'Executive Management').trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: payload.password,
      options: {
        data: {
          full_name,
          role: 'SUPER_ADMIN',
          department,
          is_active: true,
        },
      },
    });

    if (error || !data.user) {
      return {
        success: false,
        error: error?.message || 'Failed to initialize Super Admin account.',
      };
    }

    await supabase.from('profiles').upsert(
      {
        id: data.user.id,
        email,
        full_name,
        role: 'SUPER_ADMIN',
        department,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to initialize Super Admin.',
    };
  }
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Authentication required. Please sign in as Super Admin.');
  }
  return session.access_token;
}

async function writeClientAuditLog(params: {
  action: string;
  recordId: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .maybeSingle();

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_name: actorProfile?.full_name || user.email || 'Super Admin',
      user_role: actorProfile?.role || 'SUPER_ADMIN',
      action: params.action,
      module: 'USER_MANAGEMENT',
      record_id: params.recordId,
      old_values: params.oldValues || null,
      newValues: undefined,
      new_values: params.newValues || null,
    });
  } catch (err) {
    console.warn('Client audit log warning:', err);
  }
}

export async function listManagedUsers(): Promise<ManagedUserRecord[]> {
  try {
    const token = await getAccessToken();
    const res = await fetch('/api/admin-users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        if (Array.isArray(json.users)) {
          return json.users.map((u: any) => ({
            ...u,
            role: normalizeRole(u.role),
          }));
        }
      }
    }
  } catch {
    // Fallback to direct Supabase profiles query below
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    email: p.email || '',
    full_name: p.full_name || (p.email ? p.email.split('@')[0] : 'User'),
    role: normalizeRole(p.role),
    department: p.department || 'Fleet Operations',
    phone: p.phone || '',
    is_active: p.is_active !== false,
    created_at: p.created_at || new Date().toISOString(),
    last_sign_in_at: null,
    email_confirmed_at: p.created_at || null,
  }));
}

export async function createManagedUser(
  payload: CreateUserPayload
): Promise<ManagedUserRecord> {
  const normalizedRole = normalizeRole(payload.role);
  const token = await getAccessToken();

  try {
    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'create-user',
        ...payload,
        role: normalizedRole,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await res.json();
      if (res.ok && json.user) {
        return {
          ...json.user,
          role: normalizeRole(json.user.role),
        };
      }
      if (res.status !== 404 && res.status !== 503 && json.error) {
        throw new Error(json.error);
      }
    }
  } catch (err: any) {
    if (
      err.message &&
      !err.message.includes('Failed to fetch') &&
      !err.message.includes('Missing SUPABASE') &&
      !err.message.includes('Admin service unavailable')
    ) {
      throw err;
    }
  }

  // Fallback for local dev or when service-role endpoint isn't configured:
  // Create the user via an isolated non-persisting Supabase client so the Super Admin's session is preserved.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const email = payload.email.trim().toLowerCase();
  const full_name = payload.full_name.trim();
  const department = (payload.department || 'Fleet Operations').trim();
  const phone = (payload.phone || '').trim();
  const is_active = payload.is_active !== false;

  const { data: signUpData, error: signUpErr } = await tempClient.auth.signUp({
    email,
    password: payload.password,
    options: {
      data: {
        full_name,
        role: normalizedRole,
        department,
        phone,
        is_active,
      },
    },
  });

  if (signUpErr || !signUpData.user) {
    throw new Error(signUpErr?.message || 'Failed to create user account.');
  }

  const newUserId = signUpData.user.id;

  const { error: upsertErr } = await supabase.from('profiles').upsert(
    {
      id: newUserId,
      email,
      full_name,
      role: normalizedRole,
      department,
      phone,
      is_active,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (upsertErr) {
    throw new Error(upsertErr.message);
  }

  await writeClientAuditLog({
    action: 'CREATE_USER',
    recordId: newUserId,
    newValues: { email, full_name, role: normalizedRole, department, phone, is_active },
  });

  return {
    id: newUserId,
    email,
    full_name,
    role: normalizedRole,
    department,
    phone,
    is_active,
    created_at: signUpData.user.created_at || new Date().toISOString(),
    last_sign_in_at: null,
    email_confirmed_at: signUpData.user.email_confirmed_at || null,
  };
}

export async function updateManagedUser(
  payload: UpdateUserPayload
): Promise<ManagedUserRecord> {
  const normalizedRole = normalizeRole(payload.role);
  const token = await getAccessToken();

  try {
    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'update-user',
        ...payload,
        role: normalizedRole,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await res.json();
      if (res.ok && json.user) {
        return {
          ...json.user,
          role: normalizeRole(json.user.role),
        };
      }
      if (res.status !== 404 && res.status !== 503 && json.error) {
        throw new Error(json.error);
      }
    }
  } catch (err: any) {
    if (
      err.message &&
      !err.message.includes('Failed to fetch') &&
      !err.message.includes('Admin service unavailable')
    ) {
      throw err;
    }
  }

  const { data: oldProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', payload.userId)
    .maybeSingle();

  const { data: updated, error } = await supabase
    .from('profiles')
    .update({
      full_name: payload.full_name.trim(),
      role: normalizedRole,
      department: (payload.department || 'Fleet Operations').trim(),
      phone: (payload.phone || '').trim(),
      is_active: payload.is_active !== false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await writeClientAuditLog({
    action: oldProfile?.role !== normalizedRole ? 'CHANGE_USER_ROLE' : 'UPDATE_USER_PROFILE',
    recordId: payload.userId,
    oldValues: oldProfile || null,
    newValues: {
      full_name: updated.full_name,
      role: normalizedRole,
      department: updated.department,
      phone: updated.phone,
      is_active: updated.is_active,
    },
  });

  return {
    id: updated.id,
    email: updated.email || '',
    full_name: updated.full_name || 'User',
    role: normalizeRole(updated.role),
    department: updated.department || 'Fleet Operations',
    phone: updated.phone || '',
    is_active: updated.is_active !== false,
    created_at: updated.created_at || new Date().toISOString(),
    last_sign_in_at: null,
    email_confirmed_at: updated.created_at || null,
  };
}

export async function toggleManagedUserActive(
  userId: string,
  is_active: boolean
): Promise<void> {
  const token = await getAccessToken();

  try {
    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'toggle-active',
        userId,
        is_active,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await res.json();
      if (res.ok) return;
      if (res.status !== 404 && res.status !== 503 && json.error) {
        throw new Error(json.error);
      }
    }
  } catch (err: any) {
    if (
      err.message &&
      !err.message.includes('Failed to fetch') &&
      !err.message.includes('Admin service unavailable')
    ) {
      throw err;
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }

  await writeClientAuditLog({
    action: is_active ? 'ACTIVATE_USER_ACCOUNT' : 'DEACTIVATE_USER_ACCOUNT',
    recordId: userId,
    newValues: { is_active },
  });
}

export async function resetManagedUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'reset-password',
      userId,
      newPassword,
    }),
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to reset user password.');
    }
    return;
  }

  throw new Error(
    'Password reset requires the server SUPABASE_SERVICE_ROLE_KEY environment variable.'
  );
}

export async function deleteManagedUser(userId: string): Promise<void> {
  const token = await getAccessToken();

  try {
    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'delete-user',
        userId,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await res.json();
      if (res.ok) return;
      if (res.status !== 404 && res.status !== 503 && json.error) {
        throw new Error(json.error);
      }
    }
  } catch (err: any) {
    if (
      err.message &&
      !err.message.includes('Failed to fetch') &&
      !err.message.includes('Admin service unavailable')
    ) {
      throw err;
    }
  }

  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) {
    throw new Error(error.message);
  }

  await writeClientAuditLog({
    action: 'DELETE_USER',
    recordId: userId,
  });
}

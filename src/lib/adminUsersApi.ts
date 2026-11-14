import { supabase } from './supabase';
import { UserRole } from '../types';

export interface AdminUserRecord {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string;
  is_active: boolean;
  created_at: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
}

// Helper to get active JWT access token
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Check if initial setup is needed (i.e. zero Super Admins exist in system)
 */
export async function checkSetupStatus(): Promise<{ setupRequired: boolean; superAdminCount: number }> {
  try {
    const res = await fetch('/api/admin-users?action=check-setup', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      // Fallback: query profiles directly via public supabase client
      const { data } = await supabase.from('profiles').select('id').eq('role', 'SUPER_ADMIN');
      const count = data ? data.length : 0;
      return { setupRequired: count === 0, superAdminCount: count };
    }
    const data = await res.json();
    return {
      setupRequired: !!data.setupRequired,
      superAdminCount: data.superAdminCount ?? 0
    };
  } catch (err) {
    console.warn('[AdminAPI] checkSetupStatus failed, attempting direct query:', err);
    try {
      const { data } = await supabase.from('profiles').select('id').eq('role', 'SUPER_ADMIN');
      const count = data ? data.length : 0;
      return { setupRequired: count === 0, superAdminCount: count };
    } catch {
      return { setupRequired: false, superAdminCount: 1 };
    }
  }
}

/**
 * Bootstrap the initial Super Admin account (Allowed ONLY when superAdminCount === 0)
 */
export async function bootstrapSuperAdmin(payload: {
  fullName: string;
  email: string;
  password: string;
  department?: string;
}): Promise<{ success: boolean; error?: string; user?: any }> {
  try {
    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        action: 'bootstrap',
        ...payload
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to initialize Super Admin account.' };
    }

    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during Super Admin initialization.' };
  }
}

/**
 * List all users with profiles & auth status (Super Admin only)
 */
export async function listCorporateUsers(): Promise<{ success: boolean; users?: AdminUserRecord[]; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'list-users' })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to list corporate users.' };
    }

    return { success: true, users: data.users || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error fetching users.' };
  }
}

/**
 * Create a new user with verified role and password (Super Admin only)
 */
export async function createCorporateUser(payload: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
}): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'create-user',
        ...payload
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to provision user.' };
    }

    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error provisioning user.' };
  }
}

/**
 * Update user details (Name, Role, Department)
 */
export async function updateCorporateUser(payload: {
  userId: string;
  fullName?: string;
  role?: UserRole;
  department?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'update-user',
        ...payload
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to update user.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating user.' };
  }
}

/**
 * Activate or Deactivate a user account
 */
export async function toggleUserActive(
  userId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'toggle-active',
        userId,
        isActive
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to update user status.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating user status.' };
  }
}

/**
 * Reset a user's password directly
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'reset-password',
        userId,
        newPassword
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to reset password.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error resetting password.' };
  }
}

/**
 * Delete a user permanently
 */
export async function deleteCorporateUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'delete-user',
        userId
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to delete user.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error deleting user.' };
  }
}

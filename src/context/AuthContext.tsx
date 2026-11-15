import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Profile, SystemRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { NavItemKey } from '../components/layout/Sidebar';
import {
  canAccessNavTab,
  evaluateRolePermission,
  isViewerRole,
  normalizeRole,
  ROLE_DEFINITIONS,
} from '../lib/rbac';

interface AuthContextType {
  // Authentication states
  isAuthenticated: boolean;
  isLoading: boolean;
  loginError: string | null;
  clearError: () => void;

  // Profiles & Roles (6 System Roles)
  currentProfile: Profile;
  activeRole: SystemRole;
  isReadOnly: boolean;
  hasPermission: (allowedRoles: UserRole[]) => boolean;
  canAccessTab: (tab: NavItemKey) => boolean;

  // Actions
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const defaultProfile: Profile = {
  id: '',
  email: '',
  full_name: 'Authorized Staff',
  role: 'VIEWER',
  department: 'Operations',
  is_active: true,
  created_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<SystemRole>('VIEWER');
  const [currentProfile, setCurrentProfile] = useState<Profile>(defaultProfile);

  // Fetch verified user profile from Supabase profiles table
  const fetchVerifiedProfile = async (
    userId: string,
    email: string,
    userMeta: any
  ): Promise<{ profile: Profile; deactivated: boolean }> => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, phone, role, department, is_active, created_at')
          .eq('id', userId)
          .maybeSingle();

        if (!error && data) {
          if (data.is_active === false) {
            return { profile: defaultProfile, deactivated: true };
          }

          const verifiedRole = normalizeRole(data.role || userMeta?.role);
          const roleMeta = ROLE_DEFINITIONS[verifiedRole];

          return {
            profile: {
              id: data.id,
              email: data.email || email,
              full_name: data.full_name || email.split('@')[0],
              phone: data.phone || userMeta?.phone || '',
              role: verifiedRole,
              department: data.department || roleMeta.defaultDepartment,
              is_active: data.is_active ?? true,
              created_at: data.created_at || new Date().toISOString(),
            },
            deactivated: false,
          };
        }
      }
    } catch (err) {
      console.warn('[Security] Could not query profiles table, falling back to verified JWT metadata:', err);
    }

    const metaRole = normalizeRole(userMeta?.role);
    const roleMeta = ROLE_DEFINITIONS[metaRole];

    return {
      profile: {
        id: userId,
        email,
        full_name: userMeta?.full_name || email.split('@')[0].replace(/[._]/g, ' '),
        phone: userMeta?.phone || '',
        role: metaRole,
        department: userMeta?.department || roleMeta.defaultDepartment,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      deactivated: false,
    };
  };

  const handleAuthenticatedUser = async (user: any): Promise<boolean> => {
    const email = user.email || '';
    const { profile, deactivated } = await fetchVerifiedProfile(user.id, email, user.user_metadata);

    if (deactivated) {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setCurrentProfile(defaultProfile);
      setActiveRole('VIEWER');
      setLoginError('Your account has been deactivated by an administrator. Please contact Super Admin.');
      return false;
    }

    setCurrentProfile(profile);
    setActiveRole(normalizeRole(profile.role));
    setIsAuthenticated(true);
    return true;
  };

  // Initialize session on mount strictly using Supabase verified session
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        if (isSupabaseConfigured) {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();
          if (!error && session?.user) {
            if (mounted) {
              await handleAuthenticatedUser(session.user);
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error('[Security] Error restoring Supabase session:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await handleAuthenticatedUser(session.user);
        } else if (_event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setCurrentProfile(defaultProfile);
          setActiveRole('VIEWER');
        }
      });
      subscription = data.subscription;
    }

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const clearError = () => {
    setLoginError(null);
  };

  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setLoginError(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      const msg = 'Please enter both your corporate email and password.';
      setLoginError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase authentication is not configured. Please contact the system administrator.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.user) {
        const errorMsg =
          'Invalid email or password. Please verify your credentials or contact your administrator.';
        setLoginError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }

      const ok = await handleAuthenticatedUser(data.user);
      setIsLoading(false);
      if (!ok) {
        return {
          success: false,
          error: 'Your account has been deactivated by an administrator. Please contact Super Admin.',
        };
      }
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Authentication error. Please check your network and credentials.';
      setLoginError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setLoginError(null);

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Single Sign-On is not configured.');
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Corporate Google SSO sign-in failed.';
      setLoginError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('[Security] Supabase sign-out warning:', err);
    } finally {
      setIsAuthenticated(false);
      setCurrentProfile(defaultProfile);
      setActiveRole('VIEWER');
      setLoginError(null);
      setIsLoading(false);
    }
  };

  const hasPermission = (allowedRoles: UserRole[]): boolean => {
    if (!isAuthenticated || currentProfile.is_active === false) return false;
    return evaluateRolePermission(activeRole, allowedRoles);
  };

  const canAccessTab = (tab: NavItemKey): boolean => {
    if (!isAuthenticated || currentProfile.is_active === false) return false;
    return canAccessNavTab(activeRole, tab);
  };

  const isReadOnly = isViewerRole(activeRole);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        loginError,
        clearError,
        currentProfile,
        activeRole,
        isReadOnly,
        hasPermission,
        canAccessTab,
        signInWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

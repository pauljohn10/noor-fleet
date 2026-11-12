import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Profile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  // Authentication states
  isAuthenticated: boolean;
  isLoading: boolean;
  loginError: string | null;
  clearError: () => void;

  // Profiles & Roles (Strictly 3 roles)
  currentProfile: Profile;
  activeRole: UserRole;
  hasPermission: (allowedRoles: UserRole[]) => boolean;

  // Actions
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const defaultProfile: Profile = {
  id: '',
  email: '',
  full_name: 'Authorized Staff',
  role: 'MANAGEMENT',
  department: 'Operations',
  is_active: true,
  created_at: new Date().toISOString()
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('MANAGEMENT');
  const [currentProfile, setCurrentProfile] = useState<Profile>(defaultProfile);

  // Helper to fetch verified user profile from Supabase profiles table
  const fetchVerifiedProfile = async (userId: string, email: string, userMeta: any): Promise<Profile> => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, department, is_active, created_at')
          .eq('id', userId)
          .maybeSingle();

        if (!error && data) {
          const verifiedRole: UserRole =
            data.role === 'SUPER_ADMIN' || data.role === 'FLEET_MANAGER'
              ? data.role
              : 'MANAGEMENT';

          return {
            id: data.id,
            email: data.email || email,
            full_name: data.full_name || email.split('@')[0],
            role: verifiedRole,
            department: data.department || (verifiedRole === 'SUPER_ADMIN' ? 'Executive Management' : 'Fleet Operations'),
            is_active: data.is_active ?? true,
            created_at: data.created_at || new Date().toISOString()
          };
        }
      }
    } catch (err) {
      console.warn('[Security] Could not query profiles table, falling back to verified JWT metadata:', err);
    }

    // Fallback strictly to cryptographic JWT metadata (assigned during Supabase user provisioning)
    const metaRole: UserRole =
      userMeta?.role === 'SUPER_ADMIN' || userMeta?.role === 'FLEET_MANAGER'
        ? userMeta.role
        : 'MANAGEMENT';

    return {
      id: userId,
      email: email,
      full_name: userMeta?.full_name || email.split('@')[0].replace(/[._]/g, ' '),
      role: metaRole,
      department: userMeta?.department || (metaRole === 'SUPER_ADMIN' ? 'Executive Management' : 'Fleet Operations'),
      is_active: true,
      created_at: new Date().toISOString()
    };
  };

  const handleAuthenticatedUser = async (user: any) => {
    const email = user.email || '';
    const profile = await fetchVerifiedProfile(user.id, email, user.user_metadata);
    setCurrentProfile(profile);
    setActiveRole(profile.role);
    setIsAuthenticated(true);
  };

  // Initialize session on mount strictly using Supabase verified session
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: { session }, error } = await supabase.auth.getSession();
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

    // Listen for real-time Supabase auth state changes
    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await handleAuthenticatedUser(session.user);
        } else if (_event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setCurrentProfile(defaultProfile);
          setActiveRole('MANAGEMENT');
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

  // Secure real login with Supabase password verification
  const signInWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
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
        password: password
      });

      if (error || !data.user) {
        const errorMsg = 'Invalid email or password. Please verify your credentials or contact your administrator.';
        setLoginError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }

      await handleAuthenticatedUser(data.user);
      setIsLoading(false);
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
          redirectTo: window.location.origin
        }
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
      setActiveRole('MANAGEMENT');
      setLoginError(null);
      setIsLoading(false);
    }
  };

  const hasPermission = (allowedRoles: UserRole[]): boolean => {
    if (activeRole === 'SUPER_ADMIN') return true;
    return allowedRoles.includes(activeRole);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        loginError,
        clearError,
        currentProfile,
        activeRole,
        hasPermission,
        signInWithEmail,
        signInWithGoogle,
        signOut
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

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
  setPersonaRole: (role: UserRole) => void;
  hasPermission: (allowedRoles: UserRole[]) => boolean;

  // Actions
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithPersona: (role: UserRole) => void;
  signOut: () => Promise<void>;
}

const personaProfiles: Record<UserRole, Profile> = {
  SUPER_ADMIN: {
    id: 'p1111111-1111-1111-1111-111111111111',
    email: 'admin@alnoortransport.com',
    full_name: 'Rashid Al-Mansoor',
    role: 'SUPER_ADMIN',
    department: 'Executive Management',
    is_active: true,
    created_at: new Date().toISOString()
  },
  FLEET_MANAGER: {
    id: 'p2222222-2222-2222-2222-222222222222',
    email: 'fleet.manager@alnoortransport.com',
    full_name: 'Tariq Al-Ghamdi',
    role: 'FLEET_MANAGER',
    department: 'Fleet Operations & Workshop',
    is_active: true,
    created_at: new Date().toISOString()
  },
  MANAGEMENT: {
    id: 'p7777777-7777-7777-7777-777777777777',
    email: 'management@alnoortransport.com',
    full_name: 'Fahad Al-Subaie',
    role: 'MANAGEMENT',
    department: 'Operations Audit & Executive Board',
    is_active: true,
    created_at: new Date().toISOString()
  }
};

const AUTH_STORAGE_KEY = 'noor_fleet_auth_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('SUPER_ADMIN');
  const [customProfile, setCustomProfile] = useState<Profile | null>(null);

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // 1. Check Supabase session if configured
        if (isSupabaseConfigured) {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (!error && session?.user) {
            if (mounted) {
              mapSupabaseUserToState(session.user);
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
            }
          }
        }

        // 2. Check local persisted session
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.isAuthenticated) {
            const restoredRole: UserRole =
              parsed.role === 'FLEET_MANAGER' || parsed.role === 'MANAGEMENT'
                ? parsed.role
                : 'SUPER_ADMIN';
            setActiveRole(restoredRole);
            if (parsed.customProfile) {
              setCustomProfile(parsed.customProfile);
            }
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.error('Error restoring Noor Fleet session:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for Supabase auth state changes
    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          mapSupabaseUserToState(session.user);
          setIsAuthenticated(true);
        } else if (_event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setCustomProfile(null);
          localStorage.removeItem(AUTH_STORAGE_KEY);
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

  const mapSupabaseUserToState = (user: any) => {
    const email = user.email || '';
    const userRole = (user.user_metadata?.role as UserRole) || determineRoleFromEmail(email);
    setActiveRole(userRole);

    const profile: Profile = {
      id: user.id,
      email: email,
      full_name: user.user_metadata?.full_name || email.split('@')[0].replace(/[._]/g, ' '),
      role: userRole,
      department: user.user_metadata?.department || (userRole === 'MANAGEMENT' ? 'Executive Board' : 'Fleet Operations'),
      is_active: true,
      created_at: user.created_at || new Date().toISOString()
    };
    setCustomProfile(profile);

    // Persist session locally
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      isAuthenticated: true,
      role: userRole,
      email: email,
      customProfile: profile
    }));
  };

  const determineRoleFromEmail = (email: string): UserRole => {
    const lower = email.toLowerCase();
    if (lower.includes('admin') || lower.includes('super')) return 'SUPER_ADMIN';
    if (lower.includes('fleet') || lower.includes('ops') || lower.includes('operations')) return 'FLEET_MANAGER';
    return 'MANAGEMENT';
  };

  const clearError = () => {
    setLoginError(null);
  };

  const signInWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setLoginError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Try real Supabase auth if configured
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (error) {
          const isDemoEmail = Object.values(personaProfiles).some(p => p.email.toLowerCase() === cleanEmail);

          if (!isDemoEmail) {
            setLoginError(error.message);
            setIsLoading(false);
            return { success: false, error: error.message };
          }
          // If demo email, proceed to local demo sign-in fallback below
        } else if (data.user) {
          mapSupabaseUserToState(data.user);
          setIsAuthenticated(true);
          setIsLoading(false);
          return { success: true };
        }
      }

      // 2. Demo & Local Authentication Fallback
      const targetRole: UserRole = determineRoleFromEmail(cleanEmail);
      setActiveRole(targetRole);

      const matchedPersona = Object.values(personaProfiles).find(p => p.email.toLowerCase() === cleanEmail);
      const profileToUse: Profile = matchedPersona || {
        id: `usr_${Date.now()}`,
        email: cleanEmail,
        full_name: cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        role: targetRole,
        department: targetRole === 'SUPER_ADMIN' ? 'Executive Management' : targetRole === 'FLEET_MANAGER' ? 'Fleet Operations' : 'Management & Audit',
        is_active: true,
        created_at: new Date().toISOString()
      };

      setCustomProfile(profileToUse);
      setIsAuthenticated(true);

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        isAuthenticated: true,
        role: targetRole,
        email: cleanEmail,
        customProfile: profileToUse
      }));

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
      if (isSupabaseConfigured) {
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
      } else {
        const googleProfile: Profile = {
          id: 'google-user-1234',
          email: 'google.executive@alnoortransport.com',
          full_name: 'Executive Board Member (Google SSO)',
          role: 'MANAGEMENT',
          department: 'Executive Board',
          is_active: true,
          created_at: new Date().toISOString()
        };
        setCustomProfile(googleProfile);
        setActiveRole('MANAGEMENT');
        setIsAuthenticated(true);

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
          isAuthenticated: true,
          role: 'MANAGEMENT',
          email: googleProfile.email,
          customProfile: googleProfile
        }));

        setIsLoading(false);
        return { success: true };
      }
    } catch (err: any) {
      const msg = err?.message || 'Google authentication failed.';
      setLoginError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  const signInWithPersona = (role: UserRole) => {
    setActiveRole(role);
    setCustomProfile(null);
    setIsAuthenticated(true);
    setLoginError(null);

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      isAuthenticated: true,
      role: role
    }));
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Supabase sign-out warning:', err);
    } finally {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setIsAuthenticated(false);
      setCustomProfile(null);
      setLoginError(null);
      setIsLoading(false);
    }
  };

  const setPersonaRole = (role: UserRole) => {
    setActiveRole(role);
    if (isAuthenticated) {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.role = role;
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
        } catch {
          // ignore
        }
      }
    }
  };

  const hasPermission = (allowedRoles: UserRole[]): boolean => {
    if (activeRole === 'SUPER_ADMIN') return true;
    return allowedRoles.includes(activeRole);
  };

  const currentProfile = customProfile || personaProfiles[activeRole];

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        loginError,
        clearError,
        currentProfile,
        activeRole,
        setPersonaRole,
        hasPermission,
        signInWithEmail,
        signInWithGoogle,
        signInWithPersona,
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

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  timezone: string;
  notification_preferences?: Record<string, unknown>;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'tech_support' | 'agency_owner' | 'company_owner' | 'developer' | 'call_center';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  permissions: string[];
  loading: boolean;
  hasRole: (role: 'admin' | 'tech_support' | 'agency_owner' | 'company_owner' | 'developer' | 'call_center') => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  getRoleLevel: () => number;
  canManageUser: (targetUserId: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch profile and roles after state is set
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setPermissions([]);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      if (profileData) {
        setProfile({
          ...profileData,
          notification_preferences: profileData.notification_preferences as Record<string, unknown>
        });
      }

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        // Don't throw - allow user to continue with limited functionality
        setRoles([]);
      } else {
        // The database has new role names but TypeScript hasn't caught up yet
        setRoles((rolesData as unknown as UserRole[]) || []);
      }

      // Fetch permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .rpc('get_user_permissions', { _user_id: userId });

      if (permissionsError) {
        console.error('Error fetching user permissions:', permissionsError);
        // Don't throw - allow user to continue with limited functionality
        setPermissions([]);
      } else {
        const userPermissions = permissionsData?.map((p: { permission_name: string }) => p.permission_name) || [];
        setPermissions(userPermissions);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Silent fail - user will see limited functionality
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: 'admin' | 'tech_support' | 'agency_owner' | 'company_owner' | 'developer' | 'call_center') => {
    return roles.some(r => r.role === role);
  };

  const getRoleLevel = () => {
    const levels = {
      admin: 1,
      tech_support: 2,
      agency_owner: 3,
      company_owner: 4,
      developer: 5,
      call_center: 6
    };
    const userLevel = Math.min(...roles.map(r => levels[r.role] || 999));
    return userLevel;
  };

  const canManageUser = async (targetUserId: string) => {
    if (!user) return false;
    const userLevel = getRoleLevel();

    const { data: targetRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId);

    if (!targetRoles || targetRoles.length === 0) return false;

    const levels = {
      admin: 1,
      tech_support: 2,
      agency_owner: 3,
      company_owner: 4,
      developer: 5,
      call_center: 6
    };
    const targetLevel = Math.min(...targetRoles.map((r: { role: string }) => levels[r.role as keyof typeof levels] || 999));

    return userLevel < targetLevel;
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some(perm => permissions.includes(perm));
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setPermissions([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        permissions,
        loading,
        hasRole,
        hasPermission,
        hasAnyPermission,
        getRoleLevel,
        canManageUser,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

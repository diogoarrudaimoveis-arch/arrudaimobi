import { useState, useEffect, createContext, useContext, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { normalizeRole, canAccessAdmin, FULL_ACCESS_ROLES, type AppRole } from "@/lib/adminPermissions";

export interface UserProfile {
  id: string;
  user_id: string;
  tenant_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  role?: any;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isReady: boolean;
  isProfileLoading: boolean;
  tenantId: string | null;
  userRole: string | null;
  normalizedRole: AppRole;
  profile: UserProfile | null;
  isAdmin: boolean;
  isDeveloper: boolean;
  isAgent: boolean;
  isUser: boolean;
  canAccessAdmin: boolean;
  canAccessTechMenus: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isReady: false,
  isProfileLoading: true,
  tenantId: null,
  userRole: null,
  normalizedRole: "user",
  profile: null,
  isAdmin: false,
  isDeveloper: false,
  isAgent: false,
  isUser: true,
  canAccessAdmin: false,
  canAccessTechMenus: false,
  signOut: async () => { },
  refreshProfile: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Derived role values
  const normalizedRole = useMemo(() => normalizeRole(userRole), [userRole]);
  const isAdmin = normalizedRole === "admin";
  const isDeveloper = normalizedRole === "developer";
  const isAgent = normalizedRole === "agent";
  const isUser = normalizedRole === "user";
  const _canAccessAdmin = canAccessAdmin(userRole);
  const _canAccessTechMenus = canAccessAdmin(userRole); // same as admin for now

  const seedDefaultData = async (tid: string) => {
    try {
      const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/submit-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed-defaults", tenant_id: tid }),
      });
    } catch (err) {
      console.error("Seed error:", err);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      setIsProfileLoading(true);
      console.log('[Auth] fetchProfile start, userId:', userId);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      console.log('[Auth] profile result:', profileData ? 'found' : 'null', 'error:', profileError);

      if (profileData) {
        setProfile(profileData as UserProfile);
        setTenantId(profileData.tenant_id);
        console.log('[Auth] tenantId set to:', profileData.tenant_id);
      } else {
        console.log('[Auth] NO PROFILE DATA - RLS deny or missing row');
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("tenant_id", profileData?.tenant_id)
        .maybeSingle();

      console.log('[Auth] role result:', roleData, 'error:', roleError);

      if (roleData) {
        setUserRole(roleData.role);
        console.log('[Auth] userRole set to:', roleData.role);
        // Auto-seed default data for admin users
        if (roleData.role === "admin" && profileData?.tenant_id) {
          seedDefaultData(profileData.tenant_id);
        }
      } else {
        // No role found - default to "user" instead of null
        console.log('[Auth] NO ROLE DATA - defaulting to "user"');
        setUserRole("user");
      }
    } catch (err) {
      console.error('[Auth] fetchProfile EXCEPTION:', err);
      // On error, default to user instead of null to prevent redirect loops
      setUserRole("user");
    } finally {
      setIsProfileLoading(false);
      console.log('[Auth] fetchProfile done, isProfileLoading=false');
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // Safety timeout: if profile loading takes > 15s, force it to false
    const timeout = setTimeout(() => {
      setIsProfileLoading((prev) => {
        if (prev) {
          console.warn('[Auth] TIMEOUT 15s — forcing isProfileLoading=false');
          return false;
        }
        return prev;
      });
    }, 15000);

    // Set up listener BEFORE getSession to avoid race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        console.log('[Auth] onAuthStateChange event:', _event, 'hasUser:', !!s?.user);
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          fetchProfile(s.user.id);
        } else {
          setProfile(null);
          setTenantId(null);
          setUserRole(null);
          setIsProfileLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log('[Auth] getSession result, hasUser:', !!s?.user);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setIsProfileLoading(false);
      }
      setIsReady(true);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setTenantId(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isReady,
        isProfileLoading,
        tenantId,
        userRole,
        normalizedRole,
        profile,
        isAdmin,
        isDeveloper,
        isAgent,
        isUser,
        canAccessAdmin: _canAccessAdmin,
        canAccessTechMenus: _canAccessTechMenus,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

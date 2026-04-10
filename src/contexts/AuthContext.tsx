import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

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
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isReady: boolean;
  tenantId: string | null;
  userRole: string | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isAgent: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isReady: false,
  tenantId: null,
  userRole: null,
  profile: null,
  isAdmin: false,
  isAgent: false,
  signOut: async () => { },
  refreshProfile: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

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
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as UserProfile);
        setTenantId(profileData.tenant_id);
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("tenant_id", profileData?.tenant_id)
        .maybeSingle();

      if (roleData) {
        setUserRole(roleData.role);
        // Auto-seed default data for admin users
        if (roleData.role === "admin" && profileData?.tenant_id) {
          seedDefaultData(profileData.tenant_id);
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // Set up listener BEFORE getSession to avoid race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          fetchProfile(s.user.id);
        } else {
          setProfile(null);
          setTenantId(null);
          setUserRole(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      }
      setIsReady(true);
    });

    return () => subscription.unsubscribe();
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
        tenantId,
        userRole,
        profile,
        isAdmin: userRole === "admin",
        isAgent: userRole === "agent",
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

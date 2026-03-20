/**
 * iOPEX AI FrontDoor — AuthContext
 * Provides auth session + employee profile app-wide.
 * Wraps Supabase auth state — single source of truth.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface EmployeeProfile {
  user_id:     string;
  tenant_id:   string;
  full_name:   string;
  first_name:  string;
  email:       string;
  department:  string;
  role:        string;
  manager:     string;
  location:    string;
  tenure:      string;
  pto_balance: number;
  cost_center: string;
  avatar:      string;   // initials
}

interface AuthContextValue {
  session:  Session | null;
  user:     User | null;
  profile:  EmployeeProfile | null;
  loading:  boolean;
  signOut:  () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null, user: null, profile: null, loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,  setSession]  = useState<Session | null>(null);
  const [user,     setUser]     = useState<User | null>(null);
  const [profile,  setProfile]  = useState<EmployeeProfile | null>(null);
  const [loading,  setLoading]  = useState(true);

  async function loadProfile(userId: string, email: string) {
    const { data } = await supabase
      .from("employee_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setProfile(data as EmployeeProfile);
    } else {
      // Auto-create a profile from auth metadata on first login
      const meta = (await supabase.auth.getUser()).data.user?.user_metadata || {};
      const fullName = (meta.full_name || meta.name || email.split("@")[0]) as string;
      const firstName = fullName.split(" ")[0];
      const avatar = fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

      const newProfile: Partial<EmployeeProfile> = {
        user_id:     userId,
        tenant_id:   "demo",
        full_name:   fullName,
        first_name:  firstName,
        email,
        department:  meta.department || "General",
        role:        meta.role || "Employee",
        manager:     meta.manager || "",
        location:    meta.location || "",
        tenure:      "",
        pto_balance: 15,
        cost_center: "",
        avatar,
      };

      const { data: created } = await supabase
        .from("employee_profiles")
        .insert(newProfile)
        .select()
        .single();

      if (created) setProfile(created as EmployeeProfile);
      else setProfile({ ...newProfile, user_id: userId, tenant_id: "demo" } as EmployeeProfile);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id, session.user.email || "").finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id, session.user.email || "").finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

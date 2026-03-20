/**
 * iOPEX AI FrontDoor — TenantContext
 * Loads the current user's tenant branding from the tenants table.
 * Must be nested inside AuthProvider so profile.tenant_id is available.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TenantBranding {
  slug:          string;
  name:          string;
  domain:        string | null;
  logo_url:      string | null;
  primary_color: string;
}

const DEFAULT_TENANT: TenantBranding = {
  slug:          "demo",
  name:          "Acme Corporation",
  domain:        "acmecorp.com",
  logo_url:      null,
  primary_color: "#E8A020",
};

interface TenantContextValue {
  tenant:  TenantBranding;
  loading: boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: DEFAULT_TENANT,
  loading: false,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [tenant,  setTenant]  = useState<TenantBranding>(DEFAULT_TENANT);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const slug = profile?.tenant_id ?? null;
    if (!slug) { setTenant(DEFAULT_TENANT); return; }

    setLoading(true);
    supabase
      .from("tenants")
      .select("slug, name, domain, logo_url, primary_color")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTenant(data as TenantBranding);
        else setTenant(DEFAULT_TENANT);
      })
      .finally(() => setLoading(false));
  }, [profile?.tenant_id]);

  return (
    <TenantContext.Provider value={{ tenant, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}

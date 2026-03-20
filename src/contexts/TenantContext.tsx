/**
 * iOPEX FrontDoor — TenantContext (customer branch version)
 * Uses static customer.ts config — no DB lookup needed for standalone deployments.
 */
import { createContext, useContext, ReactNode } from "react";
import { CUSTOMER } from "@/config/customer";

export interface TenantBranding {
  slug:          string;
  name:          string;
  domain:        string | null;
  logo_url:      string | null;
  primary_color: string;
}

interface TenantContextValue {
  tenant:  TenantBranding;
  loading: boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenant:  { ...CUSTOMER, domain: CUSTOMER.domain, logo_url: CUSTOMER.logo_url },
  loading: false,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const tenant: TenantBranding = {
    slug:          CUSTOMER.slug,
    name:          CUSTOMER.name,
    domain:        CUSTOMER.domain,
    logo_url:      CUSTOMER.logo_url,
    primary_color: CUSTOMER.primary_color,
  };

  return (
    <TenantContext.Provider value={{ tenant, loading: false }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}

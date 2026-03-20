-- ============================================================
-- iOPEX AI FrontDoor — Phase 2: Employee Profiles + Tenants
-- Replaces hardcoded EMP object with real per-user data.
-- ============================================================

-- ── TENANTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text        NOT NULL UNIQUE,   -- 'acme-corp'
  name          text        NOT NULL,          -- 'Acme Corporation'
  domain        text,                          -- 'acmecorp.com'
  logo_url      text,
  primary_color text        NOT NULL DEFAULT '#E8A020',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT WITH CHECK (true);

-- Seed demo tenant
INSERT INTO public.tenants (slug, name, domain, primary_color)
VALUES ('demo', 'Acme Corporation', 'acmecorp.com', '#E8A020')
ON CONFLICT (slug) DO NOTHING;

-- ── EMPLOYEE PROFILES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_profiles (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     text        NOT NULL DEFAULT 'demo',
  full_name     text        NOT NULL DEFAULT '',
  first_name    text        NOT NULL DEFAULT '',
  email         text        NOT NULL DEFAULT '',
  department    text        NOT NULL DEFAULT 'General',
  role          text        NOT NULL DEFAULT 'Employee',
  manager       text        NOT NULL DEFAULT '',
  location      text        NOT NULL DEFAULT '',
  tenure        text        NOT NULL DEFAULT '',
  pto_balance   int         NOT NULL DEFAULT 15,
  cost_center   text        NOT NULL DEFAULT '',
  avatar        text        NOT NULL DEFAULT '',  -- initials
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS employee_profiles_user_id_idx
  ON public.employee_profiles (user_id);

CREATE INDEX IF NOT EXISTS employee_profiles_tenant_id_idx
  ON public.employee_profiles (tenant_id);

ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;

-- Employees can read and update their own profile
CREATE POLICY "employee_profiles_select"
  ON public.employee_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "employee_profiles_insert"
  ON public.employee_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "employee_profiles_update"
  ON public.employee_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can read all (for edge functions)
CREATE POLICY "employee_profiles_service_select"
  ON public.employee_profiles FOR SELECT
  USING (auth.role() = 'service_role');

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS employee_profiles_updated_at ON public.employee_profiles;
CREATE TRIGGER employee_profiles_updated_at
  BEFORE UPDATE ON public.employee_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

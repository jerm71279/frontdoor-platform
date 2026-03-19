-- ============================================================
-- iOPEX AI FrontDoor Platform — Base Schema (idempotent)
-- Safe to run on a project with existing schema
-- ============================================================

-- ── Shared utility function ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── app_role type (skip if exists) ───────────────────────────
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── user_roles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- ── has_role function ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ── customers (tenants) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'trial')),
  plan_type TEXT NOT NULL DEFAULT 'starter' CHECK (plan_type IN ('starter', 'professional', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own customer record" ON public.customers;
CREATE POLICY "Users can view their own customer record"
ON public.customers FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own customer record" ON public.customers;
CREATE POLICY "Users can update their own customer record"
ON public.customers FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all customers" ON public.customers;
CREATE POLICY "Admins can manage all customers"
ON public.customers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DO $$ BEGIN
  CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── customer_branding ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#2563EB',
  secondary_color TEXT NOT NULL DEFAULT '#1E40AF',
  accent_color TEXT NOT NULL DEFAULT '#3B82F6',
  company_display_name TEXT,
  portal_tagline TEXT DEFAULT 'How can we help you today?',
  custom_domain TEXT,
  favicon_url TEXT,
  welcome_message TEXT DEFAULT 'Welcome! Describe what you need and our AI will handle the rest.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (customer_id)
);

ALTER TABLE public.customer_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their own branding" ON public.customer_branding;
CREATE POLICY "Customers can view their own branding"
ON public.customer_branding FOR SELECT
USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all branding" ON public.customer_branding;
CREATE POLICY "Admins can manage all branding"
ON public.customer_branding FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DO $$ BEGIN
  CREATE TRIGGER update_customer_branding_updated_at
  BEFORE UPDATE ON public.customer_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── service_catalog ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'layers',
  color TEXT DEFAULT '#2563EB',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active catalog categories" ON public.service_catalog;
CREATE POLICY "Users can view active catalog categories"
ON public.service_catalog FOR SELECT
USING (is_active = true AND customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all catalog categories" ON public.service_catalog;
CREATE POLICY "Admins can manage all catalog categories"
ON public.service_catalog FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DO $$ BEGIN
  CREATE TRIGGER update_service_catalog_updated_at
  BEFORE UPDATE ON public.service_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── catalog_items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  catalog_id UUID NOT NULL REFERENCES public.service_catalog(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'file-text',
  estimated_sla_hours INTEGER DEFAULT 24,
  intent_keywords TEXT[],
  target_workflow_id UUID,
  target_system TEXT,
  required_fields JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active catalog items" ON public.catalog_items;
CREATE POLICY "Users can view active catalog items"
ON public.catalog_items FOR SELECT
USING (is_active = true AND customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all catalog items" ON public.catalog_items;
CREATE POLICY "Admins can manage all catalog items"
ON public.catalog_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DO $$ BEGIN
  CREATE TRIGGER update_catalog_items_updated_at
  BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── ai_routing_log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_routing_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  raw_input TEXT NOT NULL,
  context_snapshot JSONB DEFAULT '{}',
  classified_domain TEXT,
  classified_intent TEXT,
  confidence_score NUMERIC(4,3),
  routing_target TEXT,
  suggested_workflow_id UUID,
  model_used TEXT DEFAULT 'gemini-2.0-flash',
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  latency_ms INTEGER,
  escalated_to_human BOOLEAN NOT NULL DEFAULT false,
  escalation_reason TEXT,
  employee_request_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_routing_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own routing logs" ON public.ai_routing_log;
CREATE POLICY "Users can view their own routing logs"
ON public.ai_routing_log FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all routing logs" ON public.ai_routing_log;
CREATE POLICY "Admins can view all routing logs"
ON public.ai_routing_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can insert routing logs" ON public.ai_routing_log;
CREATE POLICY "Anyone can insert routing logs"
ON public.ai_routing_log FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_routing_log_customer ON public.ai_routing_log(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_routing_log_user ON public.ai_routing_log(user_id, created_at DESC);

-- ── request_status type ───────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM (
    'submitted', 'ai_routing', 'pending_human_review', 'in_progress',
    'pending_approval', 'completed', 'cancelled', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── employee_requests ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  catalog_item_id UUID REFERENCES public.catalog_items(id),
  domain TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status public.request_status NOT NULL DEFAULT 'submitted',
  ai_routing_log_id UUID REFERENCES public.ai_routing_log(id),
  workflow_execution_id UUID,
  external_ticket_ref TEXT,
  external_system TEXT,
  sla_due_at TIMESTAMP WITH TIME ZONE,
  sla_breached BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_note TEXT,
  request_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own requests" ON public.employee_requests;
CREATE POLICY "Users can view their own requests"
ON public.employee_requests FOR SELECT USING (submitted_by = auth.uid());

DROP POLICY IF EXISTS "Users can create requests" ON public.employee_requests;
CREATE POLICY "Users can create requests"
ON public.employee_requests FOR INSERT WITH CHECK (submitted_by = auth.uid());

DROP POLICY IF EXISTS "Admins can view all requests" ON public.employee_requests;
CREATE POLICY "Admins can view all requests"
ON public.employee_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all requests" ON public.employee_requests;
CREATE POLICY "Admins can update all requests"
ON public.employee_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

DO $$ BEGIN
  CREATE TRIGGER update_employee_requests_updated_at
  BEFORE UPDATE ON public.employee_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_employee_requests_user ON public.employee_requests(submitted_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_requests_status ON public.employee_requests(status, sla_due_at);

-- ── seed_default_catalog ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.seed_default_catalog(p_customer_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  it_id UUID; hr_id UUID; fin_id UUID; ops_id UUID;
BEGIN
  INSERT INTO public.service_catalog (customer_id, name, description, icon, color, sort_order)
  VALUES (p_customer_id, 'IT & Technology', 'Hardware, software, access, and infrastructure requests', 'monitor', '#2563EB', 1)
  RETURNING id INTO it_id;

  INSERT INTO public.service_catalog (customer_id, name, description, icon, color, sort_order)
  VALUES (p_customer_id, 'Human Resources', 'PTO, benefits, onboarding, offboarding, and HR lifecycle', 'users', '#7C3AED', 2)
  RETURNING id INTO hr_id;

  INSERT INTO public.service_catalog (customer_id, name, description, icon, color, sort_order)
  VALUES (p_customer_id, 'Finance & Procurement', 'Purchase requests, expense reports, and approvals', 'dollar-sign', '#059669', 3)
  RETURNING id INTO fin_id;

  INSERT INTO public.service_catalog (customer_id, name, description, icon, color, sort_order)
  VALUES (p_customer_id, 'Operations', 'Facilities, travel, general requests, and cross-team coordination', 'settings', '#D97706', 4)
  RETURNING id INTO ops_id;

  INSERT INTO public.catalog_items (customer_id, catalog_id, name, description, icon, estimated_sla_hours, intent_keywords, target_system, sort_order) VALUES
    (p_customer_id, it_id, 'New Laptop / Hardware', 'Request new hardware or replacement equipment', 'laptop', 72, ARRAY['laptop','hardware','computer','equipment','device'], 'servicenow', 1),
    (p_customer_id, it_id, 'Software Access', 'Request access to a software application or license', 'key', 24, ARRAY['software','access','app','license','tool','application'], 'servicenow', 2),
    (p_customer_id, it_id, 'Password Reset', 'Reset a password or unlock an account', 'lock', 4, ARRAY['password','reset','locked','unlock','account'], 'servicenow', 3),
    (p_customer_id, it_id, 'VPN / Remote Access', 'Set up or troubleshoot VPN and remote access', 'shield', 8, ARRAY['vpn','remote','access','connect','network'], 'servicenow', 4),
    (p_customer_id, it_id, 'IT Support / Incident', 'Report a technical issue or service disruption', 'alert-triangle', 8, ARRAY['broken','not working','issue','error','incident','support','help'], 'servicenow', 5),
    (p_customer_id, hr_id, 'Time Off Request', 'Request vacation, sick leave, or personal days', 'calendar', 24, ARRAY['pto','vacation','time off','leave','holiday','sick'], 'workday', 1),
    (p_customer_id, hr_id, 'Benefits Enrollment', 'Enroll in or update health, dental, or other benefits', 'heart', 48, ARRAY['benefits','health','insurance','dental','enrollment'], 'workday', 2),
    (p_customer_id, hr_id, 'Personal Info Update', 'Update address, phone, emergency contact, or direct deposit', 'user', 24, ARRAY['address','phone','contact','direct deposit','update personal'], 'workday', 3),
    (p_customer_id, hr_id, 'New Hire Onboarding', 'Initiate onboarding for a new team member', 'user-plus', 48, ARRAY['new hire','onboard','start','joining','new employee'], 'workday', 4),
    (p_customer_id, hr_id, 'Offboarding', 'Initiate offboarding for a departing employee', 'user-minus', 24, ARRAY['offboard','leaving','departure','terminate','last day'], 'workday', 5),
    (p_customer_id, fin_id, 'Purchase Request', 'Request approval to purchase goods or services', 'shopping-cart', 48, ARRAY['purchase','buy','order','procurement','vendor','spend'], 'sap', 1),
    (p_customer_id, fin_id, 'Expense Report', 'Submit expenses for reimbursement', 'receipt', 72, ARRAY['expense','reimbursement','receipt','travel expense','claim'], 'sap', 2),
    (p_customer_id, fin_id, 'Budget Inquiry', 'Check budget availability or request budget information', 'bar-chart', 24, ARRAY['budget','spend','allocation','forecast','cost center'], 'sap', 3),
    (p_customer_id, ops_id, 'Facilities Request', 'Request desk moves, office supplies, or facilities support', 'building', 48, ARRAY['desk','office','facilities','move','supplies','room','parking'], 'servicenow', 1),
    (p_customer_id, ops_id, 'Travel Booking', 'Request travel arrangements and approvals', 'plane', 48, ARRAY['travel','flight','hotel','trip','booking','conference'], 'servicenow', 2),
    (p_customer_id, ops_id, 'General Request', 'Submit a general request or question', 'message-circle', 48, ARRAY['general','other','help','question','request'], 'servicenow', 3);
END;
$$;

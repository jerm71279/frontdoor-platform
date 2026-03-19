-- ============================================================
-- iOPEX AI FrontDoor Platform — Phase 1 Foundation Migration
-- ============================================================
-- Adds: customer_branding, service_catalog, catalog_items,
--        ai_routing_log, employee_requests
-- All tables are tenant-scoped via customer_id (existing tenants)
-- ============================================================

-- ── 1. CUSTOMER BRANDING ─────────────────────────────────────
-- White-label configuration per iOPEX customer tenant
CREATE TABLE public.customer_branding (
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

CREATE POLICY "Customers can view their own branding"
ON public.customer_branding FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all branding"
ON public.customer_branding FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_customer_branding_updated_at
BEFORE UPDATE ON public.customer_branding
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 2. SERVICE CATALOG ───────────────────────────────────────
-- Top-level request categories (IT, HR, Finance, Operations)
CREATE TABLE public.service_catalog (
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

CREATE POLICY "Users can view active catalog categories for their tenant"
ON public.service_catalog FOR SELECT
USING (
  is_active = true AND
  customer_id IN (
    SELECT id FROM public.customers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all catalog categories"
ON public.service_catalog FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_service_catalog_updated_at
BEFORE UPDATE ON public.service_catalog
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 3. CATALOG ITEMS ─────────────────────────────────────────
-- Individual request types within a catalog category
CREATE TABLE public.catalog_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  catalog_id UUID NOT NULL REFERENCES public.service_catalog(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'file-text',
  estimated_sla_hours INTEGER DEFAULT 24,
  -- AI routing hints
  intent_keywords TEXT[],           -- keywords for Signal Engine matching
  target_workflow_id UUID,          -- auto-trigger this workflow on submission
  target_system TEXT,               -- e.g., 'servicenow', 'workday', 'jira'
  required_fields JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active catalog items for their tenant"
ON public.catalog_items FOR SELECT
USING (
  is_active = true AND
  customer_id IN (
    SELECT id FROM public.customers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all catalog items"
ON public.catalog_items FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_catalog_items_updated_at
BEFORE UPDATE ON public.catalog_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 4. AI ROUTING LOG ────────────────────────────────────────
-- Immutable audit of every Signal Engine decision (TrustCore)
CREATE TABLE public.ai_routing_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  -- Input
  raw_input TEXT NOT NULL,
  context_snapshot JSONB DEFAULT '{}',  -- user entitlements, org data at time of request
  -- Signal Engine output
  classified_domain TEXT,               -- 'IT' | 'HR' | 'Finance' | 'Operations' | 'Unknown'
  classified_intent TEXT,
  confidence_score NUMERIC(4,3),        -- 0.000 to 1.000
  routing_target TEXT,                  -- catalog_item id or 'human_review'
  suggested_workflow_id UUID,
  -- Execution metadata
  model_used TEXT DEFAULT 'gemini-2.5-flash',
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  latency_ms INTEGER,
  escalated_to_human BOOLEAN NOT NULL DEFAULT false,
  escalation_reason TEXT,
  -- Linked request (if auto-created)
  employee_request_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Immutable — no UPDATE or DELETE for non-admins
ALTER TABLE public.ai_routing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own routing logs"
ON public.ai_routing_log FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all routing logs"
ON public.ai_routing_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert routing logs"
ON public.ai_routing_log FOR INSERT
WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_ai_routing_log_customer ON public.ai_routing_log(customer_id, created_at DESC);
CREATE INDEX idx_ai_routing_log_user ON public.ai_routing_log(user_id, created_at DESC);

-- ── 5. EMPLOYEE REQUESTS ─────────────────────────────────────
-- The core request tracking table (what employees submit)
CREATE TYPE public.request_status AS ENUM (
  'submitted',
  'ai_routing',
  'pending_human_review',
  'in_progress',
  'pending_approval',
  'completed',
  'cancelled',
  'failed'
);

CREATE TABLE public.employee_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  -- Request details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  catalog_item_id UUID REFERENCES public.catalog_items(id),
  domain TEXT,                        -- IT | HR | Finance | Operations
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status public.request_status NOT NULL DEFAULT 'submitted',
  -- AI routing info
  ai_routing_log_id UUID REFERENCES public.ai_routing_log(id),
  -- Workflow execution (links to existing workflow_executions)
  workflow_execution_id UUID,
  -- External ticket (e.g., ServiceNow ticket number)
  external_ticket_ref TEXT,
  external_system TEXT,
  -- SLA tracking
  sla_due_at TIMESTAMP WITH TIME ZONE,
  sla_breached BOOLEAN NOT NULL DEFAULT false,
  -- Resolution
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_note TEXT,
  -- Additional fields submitted by user
  request_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
ON public.employee_requests FOR SELECT
USING (submitted_by = auth.uid());

CREATE POLICY "Users can create requests"
ON public.employee_requests FOR INSERT
WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Admins can view all requests"
ON public.employee_requests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all requests"
ON public.employee_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_employee_requests_updated_at
BEFORE UPDATE ON public.employee_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_employee_requests_customer ON public.employee_requests(customer_id, created_at DESC);
CREATE INDEX idx_employee_requests_user ON public.employee_requests(submitted_by, created_at DESC);
CREATE INDEX idx_employee_requests_status ON public.employee_requests(status, sla_due_at);

-- ── 6. SEED: DEFAULT CATALOG for new tenants ─────────────────
-- iOPEX admins can call this function during customer onboarding
CREATE OR REPLACE FUNCTION public.seed_default_catalog(p_customer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it_id UUID;
  hr_id UUID;
  fin_id UUID;
  ops_id UUID;
BEGIN
  -- Categories
  INSERT INTO public.service_catalog (customer_id, name, description, icon, color, sort_order)
  VALUES
    (p_customer_id, 'IT & Technology', 'Hardware, software, access, and infrastructure requests', 'monitor', '#2563EB', 1)
  RETURNING id INTO it_id;

  INSERT INTO public.service_catalog (customer_id, name, description, icon, color, sort_order)
  VALUES
    (p_customer_id, 'Human Resources', 'PTO, benefits, onboarding, offboarding, and HR lifecycle', 'users', '#7C3AED', 2)
  RETURNING id INTO hr_id;

  INSERT INTO public.service_catalog (customer_id, name, description, icon, color, sort_order)
  VALUES
    (p_customer_id, 'Finance & Procurement', 'Purchase requests, expense reports, and approvals', 'dollar-sign', '#059669', 3)
  RETURNING id INTO fin_id;

  INSERT INTO public.service_catalog (customer_id, name, description, icon, color, sort_order)
  VALUES
    (p_customer_id, 'Operations', 'Facilities, travel, general requests, and cross-team coordination', 'settings', '#D97706', 4)
  RETURNING id INTO ops_id;

  -- IT items
  INSERT INTO public.catalog_items (customer_id, catalog_id, name, description, icon, estimated_sla_hours, intent_keywords, target_system, sort_order)
  VALUES
    (p_customer_id, it_id, 'New Laptop / Hardware', 'Request new hardware or replacement equipment', 'laptop', 72, ARRAY['laptop','hardware','computer','equipment','device'], 'servicenow', 1),
    (p_customer_id, it_id, 'Software Access', 'Request access to a software application or license', 'key', 24, ARRAY['software','access','app','license','tool','application'], 'servicenow', 2),
    (p_customer_id, it_id, 'Password Reset', 'Reset a password or unlock an account', 'lock', 4, ARRAY['password','reset','locked','unlock','account'], 'servicenow', 3),
    (p_customer_id, it_id, 'VPN / Remote Access', 'Set up or troubleshoot VPN and remote access', 'shield', 8, ARRAY['vpn','remote','access','connect','network'], 'servicenow', 4),
    (p_customer_id, it_id, 'IT Support / Incident', 'Report a technical issue or service disruption', 'alert-triangle', 8, ARRAY['broken','not working','issue','error','incident','support','help'], 'servicenow', 5);

  -- HR items
  INSERT INTO public.catalog_items (customer_id, catalog_id, name, description, icon, estimated_sla_hours, intent_keywords, target_system, sort_order)
  VALUES
    (p_customer_id, hr_id, 'Time Off Request', 'Request vacation, sick leave, or personal days', 'calendar', 24, ARRAY['pto','vacation','time off','leave','holiday','sick'], 'workday', 1),
    (p_customer_id, hr_id, 'Benefits Enrollment', 'Enroll in or update health, dental, or other benefits', 'heart', 48, ARRAY['benefits','health','insurance','dental','enrollment','open enrollment'], 'workday', 2),
    (p_customer_id, hr_id, 'Personal Info Update', 'Update address, phone, emergency contact, or direct deposit', 'user', 24, ARRAY['address','phone','contact','direct deposit','update personal'], 'workday', 3),
    (p_customer_id, hr_id, 'New Hire Onboarding', 'Initiate onboarding for a new team member', 'user-plus', 48, ARRAY['new hire','onboard','start','joining','new employee'], 'workday', 4),
    (p_customer_id, hr_id, 'Offboarding', 'Initiate offboarding for a departing employee', 'user-minus', 24, ARRAY['offboard','leaving','departure','terminate','last day'], 'workday', 5);

  -- Finance items
  INSERT INTO public.catalog_items (customer_id, catalog_id, name, description, icon, estimated_sla_hours, intent_keywords, target_system, sort_order)
  VALUES
    (p_customer_id, fin_id, 'Purchase Request', 'Request approval to purchase goods or services', 'shopping-cart', 48, ARRAY['purchase','buy','order','procurement','vendor','spend'], 'sap', 1),
    (p_customer_id, fin_id, 'Expense Report', 'Submit expenses for reimbursement', 'receipt', 72, ARRAY['expense','reimbursement','receipt','travel expense','claim'], 'sap', 2),
    (p_customer_id, fin_id, 'Budget Inquiry', 'Check budget availability or request budget information', 'bar-chart', 24, ARRAY['budget','spend','allocation','forecast','cost center'], 'sap', 3);

  -- Ops items
  INSERT INTO public.catalog_items (customer_id, catalog_id, name, description, icon, estimated_sla_hours, intent_keywords, target_system, sort_order)
  VALUES
    (p_customer_id, ops_id, 'Facilities Request', 'Request desk moves, office supplies, or facilities support', 'building', 48, ARRAY['desk','office','facilities','move','supplies','room','parking'], 'servicenow', 1),
    (p_customer_id, ops_id, 'Travel Booking', 'Request travel arrangements and approvals', 'plane', 48, ARRAY['travel','flight','hotel','trip','booking','conference'], 'servicenow', 2),
    (p_customer_id, ops_id, 'General Request', 'Submit a general request or question', 'message-circle', 48, ARRAY['general','other','help','question','request'], 'servicenow', 3);
END;
$$;

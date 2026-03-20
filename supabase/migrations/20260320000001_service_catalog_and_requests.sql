-- ============================================================
-- iOPEX AI FrontDoor — Service Catalog + Workflow Requests
-- ============================================================

-- ── SERVICE CATALOG ITEMS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_catalog_items (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        text        NOT NULL DEFAULT 'demo',
  domain           text        NOT NULL,
  name             text        NOT NULL,
  description      text        NOT NULL DEFAULT '',
  icon             text        NOT NULL DEFAULT '⚙',
  sla_label        text        NOT NULL DEFAULT '1-2 business days',
  requires_approval boolean    NOT NULL DEFAULT false,
  approver_type    text        NOT NULL DEFAULT 'manager',
    -- 'manager' | 'it_manager' | 'hr_bp' | 'auto'
  display_order    int         NOT NULL DEFAULT 0,
  active           boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_catalog_items_tenant_domain_idx
  ON public.service_catalog_items (tenant_id, domain);

ALTER TABLE public.service_catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_select" ON public.service_catalog_items FOR SELECT USING (true);
CREATE POLICY "catalog_insert" ON public.service_catalog_items FOR INSERT WITH CHECK (true);

-- ── SEED: 10 Catalog Items (Acme Inc demo) ────────────────────
INSERT INTO public.service_catalog_items
  (tenant_id, domain, name, description, icon, sla_label, requires_approval, approver_type, display_order)
VALUES
  -- IT
  ('demo','IT','New Laptop Request',
   'Request a new or replacement corporate laptop. Includes MDM enrollment and app provisioning.',
   '💻','3-5 business days',true,'it_manager',1),
  ('demo','IT','Software Access Request',
   'Request a new software license or access to an existing application.',
   '🔐','Same day',false,'auto',2),
  ('demo','IT','VPN Setup',
   'Install and configure Cisco AnyConnect VPN for remote access to corporate systems.',
   '🌐','Same day',false,'auto',3),
  ('demo','IT','Password Reset',
   'Reset your corporate account password or unlock a locked account.',
   '🔑','< 1 hour',false,'auto',4),

  -- HR
  ('demo','HR','PTO Request',
   'Submit a paid time off request. Requires manager approval. Balance checked automatically.',
   '🏖','1 business day',true,'manager',1),
  ('demo','HR','Address Change',
   'Update your home address for payroll, tax withholding, and benefits.',
   '📬','1-2 business days',false,'auto',2),
  ('demo','HR','Benefits Enrollment',
   'Enroll in or change health, dental, vision, or 401(k) benefits during open enrollment or a life event.',
   '❤️','2-3 business days',false,'auto',3),

  -- Finance
  ('demo','Finance','Expense Report',
   'Submit business expenses for reimbursement. Attach receipts. Manager approval required for amounts over $500.',
   '🧾','3-5 business days',true,'manager',1),
  ('demo','Finance','Purchase Request',
   'Request approval to purchase software, hardware, or services. Requires cost center and business justification.',
   '🛒','3-5 business days',true,'manager',2),

  -- Facilities
  ('demo','Facilities','Ergonomic Assessment',
   'Schedule a workstation ergonomic assessment. Equipment (standing desk, keyboard, monitor riser) provided if approved.',
   '🪑','3-5 business days',false,'auto',1)
ON CONFLICT DO NOTHING;

-- ── WORKFLOW REQUESTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflow_requests (
  id               text        PRIMARY KEY,  -- 'REQ-XXXX'
  tenant_id        text        NOT NULL DEFAULT 'demo',
  user_id          uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  catalog_item_id  uuid        REFERENCES public.service_catalog_items(id),
  domain           text        NOT NULL,
  title            text        NOT NULL,
  description      text        NOT NULL DEFAULT '',
  status           text        NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','routing','in_progress','pending','approved','completed','cancelled')),
  approval_token   uuid        NOT NULL DEFAULT gen_random_uuid(),
  approver_email   text        NOT NULL DEFAULT '',
  approved_by      text,
  approved_at      timestamptz,
  rejection_reason text,
  steps            jsonb       NOT NULL DEFAULT '[]',
  metadata         jsonb       NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_requests_user_id_idx
  ON public.workflow_requests (user_id);
CREATE INDEX IF NOT EXISTS workflow_requests_tenant_status_idx
  ON public.workflow_requests (tenant_id, status);
CREATE INDEX IF NOT EXISTS workflow_requests_approval_token_idx
  ON public.workflow_requests (approval_token);

ALTER TABLE public.workflow_requests ENABLE ROW LEVEL SECURITY;

-- Users see their own requests
CREATE POLICY "workflow_requests_select_own"
  ON public.workflow_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "workflow_requests_insert_own"
  ON public.workflow_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workflow_requests_update_own"
  ON public.workflow_requests FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role (edge functions) can read/update all
CREATE POLICY "workflow_requests_service_all"
  ON public.workflow_requests FOR ALL
  USING (auth.role() = 'service_role');

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────
DROP TRIGGER IF EXISTS workflow_requests_updated_at ON public.workflow_requests;
CREATE TRIGGER workflow_requests_updated_at
  BEFORE UPDATE ON public.workflow_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

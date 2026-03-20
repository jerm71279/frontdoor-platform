-- ============================================================
-- iOPEX AI FrontDoor — Connectors Registry
-- Stores connector configs, status, and last sync time.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.connectors (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     text        NOT NULL DEFAULT 'demo',
  type          text        NOT NULL,  -- 'servicenow' | 'workday' | 'jira' | 'teams' | 'sharepoint'
  name          text        NOT NULL,
  status        text        NOT NULL DEFAULT 'mock',  -- 'live' | 'mock' | 'error' | 'disconnected'
  base_url      text,
  last_sync_at  timestamptz,
  metadata      jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, type)
);

ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connectors_select" ON public.connectors FOR SELECT USING (true);
CREATE POLICY "connectors_service_role" ON public.connectors FOR ALL USING (true);

-- Seed demo tenant connectors
INSERT INTO public.connectors (tenant_id, type, name, status, metadata) VALUES
  ('demo', 'servicenow', 'ServiceNow ITSM',       'mock', '{"icon":"🔧","color":"#81B5A1","description":"IT service management, incidents, change requests"}'),
  ('demo', 'workday',    'Workday HCM',            'mock', '{"icon":"◎","color":"#F87171","description":"HR data, org chart, employee lifecycle"}'),
  ('demo', 'jira',       'Jira Software',          'mock', '{"icon":"◈","color":"#60A5FA","description":"Engineering & project request tracking"}'),
  ('demo', 'teams',      'Microsoft Teams',        'mock', '{"icon":"⬡","color":"#818CF8","description":"Notifications, approvals, conversational interface"}'),
  ('demo', 'sharepoint', 'SharePoint Online',      'mock', '{"icon":"⊡","color":"#34D399","description":"Document management, knowledge base sync"}')
ON CONFLICT (tenant_id, type) DO NOTHING;

-- Seed iopex tenant connectors
INSERT INTO public.connectors (tenant_id, type, name, status, metadata)
SELECT 'iopex', type, name, 'mock', metadata
FROM public.connectors WHERE tenant_id = 'demo'
ON CONFLICT (tenant_id, type) DO NOTHING;

-- Seed cisco tenant connectors
INSERT INTO public.connectors (tenant_id, type, name, status, metadata)
SELECT 'cisco', type, name, 'mock', metadata
FROM public.connectors WHERE tenant_id = 'demo'
ON CONFLICT (tenant_id, type) DO NOTHING;

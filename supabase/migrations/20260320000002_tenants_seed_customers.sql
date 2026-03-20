-- ============================================================
-- iOPEX AI FrontDoor — Multi-Tenant Demo Seed
-- Adds iOPEX and Cisco tenant rows + duplicates service catalog
-- ============================================================

-- Additional tenants
INSERT INTO public.tenants (slug, name, domain, primary_color)
VALUES
  ('iopex', 'iOPEX Technologies', 'iopex.com',  '#06B6D4'),
  ('cisco', 'Cisco Systems',      'cisco.com',  '#1BA0D7')
ON CONFLICT (slug) DO NOTHING;

-- Duplicate catalog for iopex tenant
INSERT INTO public.service_catalog_items
  (tenant_id, domain, name, description, icon, sla_label, requires_approval, approver_type, display_order, active)
SELECT
  'iopex', domain, name, description, icon, sla_label, requires_approval, approver_type, display_order, active
FROM public.service_catalog_items
WHERE tenant_id = 'demo'
ON CONFLICT DO NOTHING;

-- Duplicate catalog for cisco tenant
INSERT INTO public.service_catalog_items
  (tenant_id, domain, name, description, icon, sla_label, requires_approval, approver_type, display_order, active)
SELECT
  'cisco', domain, name, description, icon, sla_label, requires_approval, approver_type, display_order, active
FROM public.service_catalog_items
WHERE tenant_id = 'demo'
ON CONFLICT DO NOTHING;

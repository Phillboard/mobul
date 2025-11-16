-- Add gift_cards.purchase permission
INSERT INTO public.permissions (name, module, description)
VALUES ('gift_cards.purchase', 'gift_cards', 'Purchase gift cards in bulk');

-- Grant purchase permission to platform_admin role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'platform_admin', id FROM public.permissions WHERE name = 'gift_cards.purchase'
ON CONFLICT DO NOTHING;

-- Grant purchase permission to org_admin role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'org_admin', id FROM public.permissions WHERE name = 'gift_cards.purchase'
ON CONFLICT DO NOTHING;
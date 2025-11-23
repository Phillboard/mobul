-- Phase 2: Add Missing Permissions
-- Add new permissions for consolidated menu structure

-- Contacts permissions
INSERT INTO permissions (name, description, module) VALUES
  ('contacts.view', 'View contacts', 'contacts'),
  ('contacts.create', 'Create contacts', 'contacts'),
  ('contacts.edit', 'Edit contacts', 'contacts'),
  ('contacts.delete', 'Delete contacts', 'contacts'),
  ('contacts.export', 'Export contacts', 'contacts'),
  ('contacts.import', 'Import contacts', 'contacts')
ON CONFLICT (name) DO NOTHING;

-- Companies permissions
INSERT INTO permissions (name, description, module) VALUES
  ('companies.view', 'View companies', 'companies'),
  ('companies.create', 'Create companies', 'companies'),
  ('companies.edit', 'Edit companies', 'companies'),
  ('companies.delete', 'Delete companies', 'companies')
ON CONFLICT (name) DO NOTHING;

-- Deals permissions
INSERT INTO permissions (name, description, module) VALUES
  ('deals.view', 'View deals', 'deals'),
  ('deals.create', 'Create deals', 'deals'),
  ('deals.edit', 'Edit deals', 'deals'),
  ('deals.delete', 'Delete deals', 'deals')
ON CONFLICT (name) DO NOTHING;

-- Activities permissions
INSERT INTO permissions (name, description, module) VALUES
  ('activities.view', 'View activities', 'activities'),
  ('activities.create', 'Create activities', 'activities')
ON CONFLICT (name) DO NOTHING;

-- Tasks permissions
INSERT INTO permissions (name, description, module) VALUES
  ('tasks.view', 'View tasks', 'tasks'),
  ('tasks.create', 'Create tasks', 'tasks'),
  ('tasks.edit', 'Edit tasks', 'tasks'),
  ('tasks.complete', 'Complete tasks', 'tasks')
ON CONFLICT (name) DO NOTHING;

-- Gift Cards admin permission
INSERT INTO permissions (name, description, module) VALUES
  ('giftcards.admin_view', 'View admin gift card marketplace', 'gift_cards')
ON CONFLICT (name) DO NOTHING;
-- Create 3 new agencies
INSERT INTO organizations (id, name, type, settings_json) VALUES
('a1a1a1a1-0001-0001-0001-000000000001', 'Apex Marketing Group', 'agency', '{"primary_color": "#FF6B35"}'),
('a2a2a2a2-0002-0002-0002-000000000002', 'Catalyst Direct Solutions', 'agency', '{"primary_color": "#6A4C93"}'),
('a3a3a3a3-0003-0003-0003-000000000003', 'Pinnacle Engagement Partners', 'agency', '{"primary_color": "#06A77D"}')
ON CONFLICT (id) DO NOTHING;

-- Create additional clients for new agencies
INSERT INTO clients (id, org_id, name, industry, credits, timezone) VALUES
('c1c1c1c1-0001-0001-0001-000000000001', 'a1a1a1a1-0001-0001-0001-000000000001', 'Skyline Automotive Group', 'auto_service', 5000, 'America/New_York'),
('c1c1c1c1-0001-0001-0001-000000000002', 'a1a1a1a1-0001-0001-0001-000000000001', 'Wellness Dental Partners', 'dental', 3500, 'America/Chicago'),
('c1c1c1c1-0001-0001-0001-000000000003', 'a1a1a1a1-0001-0001-0001-000000000001', 'Peak Performance Gyms', 'fitness_gym', 4200, 'America/Los_Angeles'),
('c2c2c2c2-0002-0002-0002-000000000001', 'a2a2a2a2-0002-0002-0002-000000000002', 'Guardian Insurance Agency', 'insurance', 6000, 'America/New_York'),
('c2c2c2c2-0002-0002-0002-000000000002', 'a2a2a2a2-0002-0002-0002-000000000002', 'Heritage Law Firm', 'legal_services', 4800, 'America/Chicago'),
('c2c2c2c2-0002-0002-0002-000000000003', 'a2a2a2a2-0002-0002-0002-000000000002', 'Summit Moving Services', 'moving_company', 3200, 'America/Denver'),
('c2c2c2c2-0002-0002-0002-000000000004', 'a2a2a2a2-0002-0002-0002-000000000002', 'Precision Home Services', 'home_services', 3800, 'America/Phoenix'),
('c3c3c3c3-0003-0003-0003-000000000001', 'a3a3a3a3-0003-0003-0003-000000000003', 'GreenScape Landscaping', 'landscaping', 2900, 'America/Los_Angeles'),
('c3c3c3c3-0003-0003-0003-000000000002', 'a3a3a3a3-0003-0003-0003-000000000003', 'Elite Roofing Pros', 'roofing_services', 5500, 'America/New_York'),
('c3c3c3c3-0003-0003-0003-000000000003', 'a3a3a3a3-0003-0003-0003-000000000003', 'Happy Paws Veterinary', 'veterinary', 3100, 'America/Chicago')
ON CONFLICT (id) DO NOTHING;
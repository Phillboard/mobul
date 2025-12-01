-- Enhanced Campaign System - PART 3: Admin Notifications Table
-- Split from original migration for CLI compatibility

-- ============================================================================
-- Create admin notification table for pool empty alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'resolved')),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES gift_card_pools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON admin_notifications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_client ON admin_notifications(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(notification_type, status);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all notifications" ON admin_notifications;
CREATE POLICY "Admins can view all notifications"
  ON admin_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view notifications for accessible clients" ON admin_notifications;
CREATE POLICY "Users can view notifications for accessible clients"
  ON admin_notifications FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "System can create notifications" ON admin_notifications;
CREATE POLICY "System can create notifications"
  ON admin_notifications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can acknowledge notifications for accessible clients" ON admin_notifications;
CREATE POLICY "Users can acknowledge notifications for accessible clients"
  ON admin_notifications FOR UPDATE
  USING (user_can_access_client(auth.uid(), client_id))
  WITH CHECK (user_can_access_client(auth.uid(), client_id));


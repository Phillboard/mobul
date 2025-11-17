-- RLS Policies for zapier_connections
CREATE POLICY "Users can view zapier connections for their client"
  ON zapier_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_users
      WHERE client_users.client_id = zapier_connections.client_id
      AND client_users.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can create zapier connections for their client"
  ON zapier_connections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_users
      WHERE client_users.client_id = zapier_connections.client_id
      AND client_users.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can update zapier connections for their client"
  ON zapier_connections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM client_users
      WHERE client_users.client_id = zapier_connections.client_id
      AND client_users.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can delete zapier connections for their client"
  ON zapier_connections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM client_users
      WHERE client_users.client_id = zapier_connections.client_id
      AND client_users.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for zapier_trigger_logs
CREATE POLICY "Users can view trigger logs for their client connections"
  ON zapier_trigger_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM zapier_connections zc
      JOIN client_users cu ON cu.client_id = zc.client_id
      WHERE zc.id = zapier_trigger_logs.zapier_connection_id
      AND cu.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
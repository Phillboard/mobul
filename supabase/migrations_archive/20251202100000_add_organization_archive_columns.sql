-- Add archive functionality to organizations and clients tables
-- This allows soft-delete (archiving) instead of permanent deletion

-- Add archived_at column to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add archived_at column to clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN public.organizations.archived_at IS 'Timestamp when the organization was archived. NULL means active.';
COMMENT ON COLUMN public.clients.archived_at IS 'Timestamp when the client was archived. NULL means active.';

-- Create indexes for faster filtering of active records
CREATE INDEX IF NOT EXISTS idx_organizations_archived 
ON public.organizations(archived_at) WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_archived 
ON public.clients(archived_at) WHERE archived_at IS NULL;

-- Create helper function to archive an organization and its clients
CREATE OR REPLACE FUNCTION archive_organization(p_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_archived_count INTEGER;
BEGIN
  -- Archive the organization
  UPDATE public.organizations
  SET archived_at = NOW()
  WHERE id = p_org_id AND archived_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Archive all clients under this organization
  UPDATE public.clients
  SET archived_at = NOW()
  WHERE org_id = p_org_id AND archived_at IS NULL;
  
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to restore an archived organization
CREATE OR REPLACE FUNCTION restore_organization(p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Restore the organization
  UPDATE public.organizations
  SET archived_at = NULL
  WHERE id = p_org_id AND archived_at IS NOT NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Also restore all clients under this organization
  UPDATE public.clients
  SET archived_at = NULL
  WHERE org_id = p_org_id AND archived_at IS NOT NULL;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to archive a single client
CREATE OR REPLACE FUNCTION archive_client(p_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.clients
  SET archived_at = NOW()
  WHERE id = p_client_id AND archived_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to restore an archived client
CREATE OR REPLACE FUNCTION restore_client(p_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.clients
  SET archived_at = NULL
  WHERE id = p_client_id AND archived_at IS NOT NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION archive_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION archive_client(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_client(UUID) TO authenticated;


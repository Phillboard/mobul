/**
 * User Management Type Definitions
 */

import { Database } from "@/integrations/supabase/types";

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

export type UserRole = Tables<'user_roles'>;
export type ClientUser = Tables<'client_users'>;
export type UserInvitation = Tables<'user_invitations'>;

export interface UserWithRole {
  id: string;
  email: string;
  role: string;
  assigned_at?: string;
}

export interface UserWithClients extends UserWithRole {
  clients: ClientAssignment[];
}

export interface ClientAssignment {
  client_id: string;
  client_name?: string;
  assigned_at: string;
}

export interface ManageableUser {
  id: string;
  email?: string;
  role?: string;
  client_ids?: string[];
  created_at?: string;
}


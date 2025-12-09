/**
 * User Management Type Definitions
 * 
 * Defines user roles and permissions across the platform hierarchy.
 * 
 * **Roles per PLATFORM_DICTIONARY.md:**
 * - `admin` - Platform Admin: ACE Engage staff with full system access
 * - `tech_support` - Tech Support: ACE support staff (view only, assist users)
 * - `agency_owner` - Agency Owner: Manages all clients under their agency
 * - `company_owner` - Client Owner: Manages their company's campaigns, contacts, users
 * - `call_center` - Agent: Call center user who processes redemptions
 * - `developer` - Developer: API user with programmatic access
 * 
 * @see PLATFORM_DICTIONARY.md for complete role definitions
 * @see src/lib/terminology.ts for role constants
 */

import { Database } from "@/integrations/supabase/types";

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/**
 * User role assignment from database
 */
export type UserRole = Tables<'user_roles'>;

/**
 * Client-user relationship (links users to specific clients)
 */
export type ClientUser = Tables<'client_users'>;

/**
 * User invitation record
 */
export type UserInvitation = Tables<'user_invitations'>;

/**
 * User with their assigned role
 */
export interface UserWithRole {
  id: string;
  email: string;
  /** Role: admin, tech_support, agency_owner, company_owner, call_center, developer */
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


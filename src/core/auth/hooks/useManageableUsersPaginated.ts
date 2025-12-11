import { useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { AppRole } from "@/core/auth/roleUtils";

export interface PaginatedUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  is_active: boolean;
  roles: AppRole[];
  org_ids: string[];
  org_names: string[];
  client_ids: string[];
  client_names: string[];
}

interface UseManageableUsersPaginatedParams {
  search?: string;
  roleFilter?: AppRole | null;
  orgFilter?: string | null;
  clientFilter?: string | null;
  showInactive?: boolean;
  page?: number;
  pageSize?: number;
}

interface PaginatedResponse {
  users: PaginatedUser[];
  totalCount: number;
  totalPages: number;
}

export function useManageableUsersPaginated({
  search = "",
  roleFilter = null,
  orgFilter = null,
  clientFilter = null,
  showInactive = false,
  page = 1,
  pageSize = 20,
}: UseManageableUsersPaginatedParams = {}) {
  return useQuery<PaginatedResponse>({
    queryKey: [
      "manageableUsersPaginated",
      search,
      roleFilter,
      orgFilter,
      clientFilter,
      showInactive,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { users: [], totalCount: 0, totalPages: 0 };
      }

      const offset = (page - 1) * pageSize;

      const { data, error } = await supabase.rpc(
        "get_manageable_users_paginated",
        {
          _requesting_user_id: user.id,
          _search: search || null,
          _role_filter: roleFilter,
          _org_filter: orgFilter,
          _client_filter: clientFilter,
          _show_inactive: showInactive,
          _limit: pageSize,
          _offset: offset,
        }
      );

      if (error) {
          console.error("Error fetching paginated users:", error);
        throw error;
      }

      const totalCount = data && data.length > 0 ? Number(data[0].total_count) : 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      const users: PaginatedUser[] = (data || []).map((row) => ({
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        created_at: row.created_at,
        is_active: row.is_active,
        roles: row.roles || [],
        org_ids: row.org_ids || [],
        org_names: row.org_names || [],
        client_ids: row.client_ids || [],
        client_names: row.client_names || [],
      }));

      return { users, totalCount, totalPages };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

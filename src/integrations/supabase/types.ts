export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audiences: {
        Row: {
          client_id: string
          created_at: string | null
          hygiene_json: Json | null
          id: string
          invalid_count: number | null
          name: string
          source: Database["public"]["Enums"]["audience_source"]
          status: Database["public"]["Enums"]["audience_status"] | null
          suppressed_json: Json | null
          total_count: number | null
          valid_count: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          hygiene_json?: Json | null
          id?: string
          invalid_count?: number | null
          name: string
          source?: Database["public"]["Enums"]["audience_source"]
          status?: Database["public"]["Enums"]["audience_status"] | null
          suppressed_json?: Json | null
          total_count?: number | null
          valid_count?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          hygiene_json?: Json | null
          id?: string
          invalid_count?: number | null
          name?: string
          source?: Database["public"]["Enums"]["audience_source"]
          status?: Database["public"]["Enums"]["audience_status"] | null
          suppressed_json?: Json | null
          total_count?: number | null
          valid_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audiences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience_id: string | null
          base_lp_url: string | null
          client_id: string
          created_at: string | null
          created_by_user_id: string | null
          id: string
          lp_mode: Database["public"]["Enums"]["lp_mode"] | null
          mail_date: string | null
          name: string
          postage: Database["public"]["Enums"]["postage_class"] | null
          size: Database["public"]["Enums"]["template_size"]
          status: Database["public"]["Enums"]["campaign_status"] | null
          template_id: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          vendor: string | null
        }
        Insert: {
          audience_id?: string | null
          base_lp_url?: string | null
          client_id: string
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          lp_mode?: Database["public"]["Enums"]["lp_mode"] | null
          mail_date?: string | null
          name: string
          postage?: Database["public"]["Enums"]["postage_class"] | null
          size: Database["public"]["Enums"]["template_size"]
          status?: Database["public"]["Enums"]["campaign_status"] | null
          template_id?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vendor?: string | null
        }
        Update: {
          audience_id?: string | null
          base_lp_url?: string | null
          client_id?: string
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          lp_mode?: Database["public"]["Enums"]["lp_mode"] | null
          mail_date?: string | null
          name?: string
          postage?: Database["public"]["Enums"]["postage_class"] | null
          size?: Database["public"]["Enums"]["template_size"]
          status?: Database["public"]["Enums"]["campaign_status"] | null
          template_id?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          api_key_hash: string | null
          brand_colors_json: Json | null
          created_at: string | null
          id: string
          industry: Database["public"]["Enums"]["industry_type"]
          logo_url: string | null
          name: string
          org_id: string
          timezone: string | null
        }
        Insert: {
          api_key_hash?: string | null
          brand_colors_json?: Json | null
          created_at?: string | null
          id?: string
          industry: Database["public"]["Enums"]["industry_type"]
          logo_url?: string | null
          name: string
          org_id: string
          timezone?: string | null
        }
        Update: {
          api_key_hash?: string | null
          brand_colors_json?: Json | null
          created_at?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"]
          logo_url?: string | null
          name?: string
          org_id?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          settings_json: Json | null
          type: Database["public"]["Enums"]["org_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          settings_json?: Json | null
          type?: Database["public"]["Enums"]["org_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          settings_json?: Json | null
          type?: Database["public"]["Enums"]["org_type"]
        }
        Relationships: []
      }
      print_batches: {
        Row: {
          batch_number: number
          campaign_id: string
          created_at: string | null
          id: string
          pdf_url: string | null
          recipient_count: number | null
          status: Database["public"]["Enums"]["batch_status"] | null
          updated_at: string | null
          vendor: string
        }
        Insert: {
          batch_number: number
          campaign_id: string
          created_at?: string | null
          id?: string
          pdf_url?: string | null
          recipient_count?: number | null
          status?: Database["public"]["Enums"]["batch_status"] | null
          updated_at?: string | null
          vendor: string
        }
        Update: {
          batch_number?: number
          campaign_id?: string
          created_at?: string | null
          id?: string
          pdf_url?: string | null
          recipient_count?: number | null
          status?: Database["public"]["Enums"]["batch_status"] | null
          updated_at?: string | null
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_batches_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          timezone: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          timezone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      recipients: {
        Row: {
          address1: string
          address2: string | null
          audience_id: string
          city: string
          company: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          geocode_json: Json | null
          id: string
          last_name: string | null
          phone: string | null
          state: string
          token: string
          validation_details_json: Json | null
          validation_status:
            | Database["public"]["Enums"]["validation_status"]
            | null
          zip: string
          zip4: string | null
        }
        Insert: {
          address1: string
          address2?: string | null
          audience_id: string
          city: string
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          geocode_json?: Json | null
          id?: string
          last_name?: string | null
          phone?: string | null
          state: string
          token: string
          validation_details_json?: Json | null
          validation_status?:
            | Database["public"]["Enums"]["validation_status"]
            | null
          zip: string
          zip4?: string | null
        }
        Update: {
          address1?: string
          address2?: string | null
          audience_id?: string
          city?: string
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          geocode_json?: Json | null
          id?: string
          last_name?: string | null
          phone?: string | null
          state?: string
          token?: string
          validation_details_json?: Json | null
          validation_status?:
            | Database["public"]["Enums"]["validation_status"]
            | null
          zip?: string
          zip4?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipients_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audiences"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          industry_vertical: Database["public"]["Enums"]["industry_type"] | null
          is_favorite: boolean | null
          json_layers: Json | null
          name: string
          size: Database["public"]["Enums"]["template_size"]
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          industry_vertical?:
            | Database["public"]["Enums"]["industry_type"]
            | null
          is_favorite?: boolean | null
          json_layers?: Json | null
          name: string
          size: Database["public"]["Enums"]["template_size"]
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          industry_vertical?:
            | Database["public"]["Enums"]["industry_type"]
            | null
          is_favorite?: boolean | null
          json_layers?: Json | null
          name?: string
          size?: Database["public"]["Enums"]["template_size"]
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_recipient_token: { Args: never; Returns: string }
      get_audience_geo_distribution: {
        Args: { audience_id_param: string }
        Returns: {
          count: number
          state: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_can_access_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_client_access: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_org_access: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "org_admin" | "agency_admin" | "client_user"
      audience_source: "import" | "purchase" | "manual"
      audience_status: "processing" | "ready" | "failed"
      batch_status: "pending" | "printing" | "mailed" | "delivered"
      campaign_status:
        | "draft"
        | "proofed"
        | "in_production"
        | "mailed"
        | "completed"
      industry_type:
        | "roofing"
        | "rei"
        | "auto_service"
        | "auto_warranty"
        | "auto_buyback"
      lp_mode: "bridge" | "redirect"
      org_type: "internal" | "agency"
      postage_class: "first_class" | "standard"
      template_size: "4x6" | "6x9" | "6x11" | "letter" | "trifold"
      validation_status: "valid" | "invalid" | "suppressed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["org_admin", "agency_admin", "client_user"],
      audience_source: ["import", "purchase", "manual"],
      audience_status: ["processing", "ready", "failed"],
      batch_status: ["pending", "printing", "mailed", "delivered"],
      campaign_status: [
        "draft",
        "proofed",
        "in_production",
        "mailed",
        "completed",
      ],
      industry_type: [
        "roofing",
        "rei",
        "auto_service",
        "auto_warranty",
        "auto_buyback",
      ],
      lp_mode: ["bridge", "redirect"],
      org_type: ["internal", "agency"],
      postage_class: ["first_class", "standard"],
      template_size: ["4x6", "6x9", "6x11", "letter", "trifold"],
      validation_status: ["valid", "invalid", "suppressed"],
    },
  },
} as const

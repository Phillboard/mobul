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
      campaign_approvals: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          notes?: string | null
          status: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_comments: {
        Row: {
          campaign_id: string
          comment_text: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          comment_text: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          comment_text?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_drafts: {
        Row: {
          client_id: string
          created_at: string
          current_step: number
          draft_name: string
          form_data_json: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          current_step?: number
          draft_name: string
          form_data_json?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          current_step?: number
          draft_name?: string
          form_data_json?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_prototypes: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          prototype_config_json: Json
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          prototype_config_json?: Json
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          prototype_config_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      campaign_versions: {
        Row: {
          campaign_id: string
          change_description: string | null
          created_at: string
          created_by_user_id: string
          id: string
          snapshot_json: Json
          version_number: number
        }
        Insert: {
          campaign_id: string
          change_description?: string | null
          created_at?: string
          created_by_user_id: string
          id?: string
          snapshot_json: Json
          version_number: number
        }
        Update: {
          campaign_id?: string
          change_description?: string | null
          created_at?: string
          created_by_user_id?: string
          id?: string
          snapshot_json?: Json
          version_number?: number
        }
        Relationships: []
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
          credits: number | null
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
          credits?: number | null
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
          credits?: number | null
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
      events: {
        Row: {
          campaign_id: string
          created_at: string | null
          event_data_json: Json | null
          event_type: string
          id: string
          occurred_at: string | null
          recipient_id: string
          source: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          event_data_json?: Json | null
          event_type: string
          id?: string
          occurred_at?: string | null
          recipient_id: string
          source: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          event_data_json?: Json | null
          event_type?: string
          id?: string
          occurred_at?: string | null
          recipient_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_filter_presets: {
        Row: {
          created_at: string | null
          filters_json: Json | null
          id: string
          preset_name: string
          vertical: string
        }
        Insert: {
          created_at?: string | null
          filters_json?: Json | null
          id?: string
          preset_name: string
          vertical: string
        }
        Update: {
          created_at?: string | null
          filters_json?: Json | null
          id?: string
          preset_name?: string
          vertical?: string
        }
        Relationships: []
      }
      lead_purchases: {
        Row: {
          audience_id: string | null
          client_id: string
          created_at: string | null
          expires_at: string | null
          filter_json: Json | null
          id: string
          lead_source_id: string | null
          license_terms: string | null
          payment_status: string | null
          price_cents: number
          purchased_at: string | null
          quantity: number
          stripe_payment_id: string | null
        }
        Insert: {
          audience_id?: string | null
          client_id: string
          created_at?: string | null
          expires_at?: string | null
          filter_json?: Json | null
          id?: string
          lead_source_id?: string | null
          license_terms?: string | null
          payment_status?: string | null
          price_cents: number
          purchased_at?: string | null
          quantity: number
          stripe_payment_id?: string | null
        }
        Update: {
          audience_id?: string | null
          client_id?: string
          created_at?: string | null
          expires_at?: string | null
          filter_json?: Json | null
          id?: string
          lead_source_id?: string | null
          license_terms?: string | null
          payment_status?: string | null
          price_cents?: number
          purchased_at?: string | null
          quantity?: number
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_purchases_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          active: boolean | null
          adapter_type: string | null
          api_endpoint: string | null
          available_filters_json: Json | null
          created_at: string | null
          id: string
          pricing_json: Json | null
          vendor_name: string
        }
        Insert: {
          active?: boolean | null
          adapter_type?: string | null
          api_endpoint?: string | null
          available_filters_json?: Json | null
          created_at?: string | null
          id?: string
          pricing_json?: Json | null
          vendor_name: string
        }
        Update: {
          active?: boolean | null
          adapter_type?: string | null
          api_endpoint?: string | null
          available_filters_json?: Json | null
          created_at?: string | null
          id?: string
          pricing_json?: Json | null
          vendor_name?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          appointment_requested: boolean | null
          campaign_id: string
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          message: string | null
          phone: string | null
          recipient_id: string
          submitted_at: string | null
        }
        Insert: {
          appointment_requested?: boolean | null
          campaign_id: string
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          message?: string | null
          phone?: string | null
          recipient_id: string
          submitted_at?: string | null
        }
        Update: {
          appointment_requested?: boolean | null
          campaign_id?: string
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          message?: string | null
          phone?: string | null
          recipient_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
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
      preview_links: {
        Row: {
          campaign_id: string
          created_at: string
          created_by_user_id: string
          expires_at: string
          id: string
          max_views: number | null
          password_hash: string | null
          token: string
          views_count: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          created_by_user_id: string
          expires_at: string
          id?: string
          max_views?: number | null
          password_hash?: string | null
          token: string
          views_count?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          created_by_user_id?: string
          expires_at?: string
          id?: string
          max_views?: number | null
          password_hash?: string | null
          token?: string
          views_count?: number
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
      qr_code_configs: {
        Row: {
          background_color: string | null
          base_url: string
          created_at: string | null
          custom_utm_1: string | null
          custom_utm_2: string | null
          custom_utm_3: string | null
          foreground_color: string | null
          id: string
          layer_id: string
          size: number | null
          template_id: string
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          background_color?: string | null
          base_url: string
          created_at?: string | null
          custom_utm_1?: string | null
          custom_utm_2?: string | null
          custom_utm_3?: string | null
          foreground_color?: string | null
          id?: string
          layer_id: string
          size?: number | null
          template_id: string
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          background_color?: string | null
          base_url?: string
          created_at?: string | null
          custom_utm_1?: string | null
          custom_utm_2?: string | null
          custom_utm_3?: string | null
          foreground_color?: string | null
          id?: string
          layer_id?: string
          size?: number | null
          template_id?: string
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_code_configs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_tracking_events: {
        Row: {
          campaign_id: string
          created_at: string | null
          device_type: string | null
          event_type: string
          id: string
          ip_address: string | null
          location_data: Json | null
          recipient_id: string
          scanned_at: string
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          device_type?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          location_data?: Json | null
          recipient_id: string
          scanned_at?: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          device_type?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          location_data?: Json | null
          recipient_id?: string
          scanned_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_tracking_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_tracking_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      recipients: {
        Row: {
          address1: string
          address2: string | null
          audience_id: string
          city: string
          company: string | null
          created_at: string | null
          delivery_status: string | null
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
          delivery_status?: string | null
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
          delivery_status?: string | null
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
      suppressed_addresses: {
        Row: {
          address1: string
          city: string
          client_id: string
          created_at: string | null
          id: string
          notes: string | null
          reason: string
          state: string
          suppressed_at: string | null
          zip: string
        }
        Insert: {
          address1: string
          city: string
          client_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          reason: string
          state: string
          suppressed_at?: string | null
          zip: string
        }
        Update: {
          address1?: string
          city?: string
          client_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          reason?: string
          state?: string
          suppressed_at?: string | null
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppressed_addresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      vendors: {
        Row: {
          active: boolean | null
          api_endpoint: string | null
          api_key_secret_name: string | null
          capabilities_json: Json | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          api_endpoint?: string | null
          api_key_secret_name?: string | null
          capabilities_json?: Json | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          api_endpoint?: string | null
          api_key_secret_name?: string | null
          capabilities_json?: Json | null
          created_at?: string | null
          id?: string
          name?: string
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
        | "approved"
      industry_type:
        | "roofing"
        | "rei"
        | "auto_service"
        | "auto_warranty"
        | "auto_buyback"
        | "retail_promo"
        | "restaurant_promo"
        | "healthcare_checkup"
        | "legal_services"
        | "financial_advisor"
        | "fitness_gym"
        | "roofing_services"
        | "rei_postcard"
        | "landscaping"
        | "moving_company"
        | "realtor_listing"
        | "dental"
        | "veterinary"
        | "insurance"
        | "home_services"
        | "event_invite"
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
        "approved",
      ],
      industry_type: [
        "roofing",
        "rei",
        "auto_service",
        "auto_warranty",
        "auto_buyback",
        "retail_promo",
        "restaurant_promo",
        "healthcare_checkup",
        "legal_services",
        "financial_advisor",
        "fitness_gym",
        "roofing_services",
        "rei_postcard",
        "landscaping",
        "moving_company",
        "realtor_listing",
        "dental",
        "veterinary",
        "insurance",
        "home_services",
        "event_invite",
      ],
      lp_mode: ["bridge", "redirect"],
      org_type: ["internal", "agency"],
      postage_class: ["first_class", "standard"],
      template_size: ["4x6", "6x9", "6x11", "letter", "trifold"],
      validation_status: ["valid", "invalid", "suppressed"],
    },
  },
} as const

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
      ace_form_submissions: {
        Row: {
          contact_id: string | null
          enrichment_status: string | null
          form_id: string
          gift_card_id: string | null
          id: string
          ip_address: string | null
          recipient_id: string | null
          redemption_token: string | null
          submission_data: Json
          submitted_at: string | null
          user_agent: string | null
        }
        Insert: {
          contact_id?: string | null
          enrichment_status?: string | null
          form_id: string
          gift_card_id?: string | null
          id?: string
          ip_address?: string | null
          recipient_id?: string | null
          redemption_token?: string | null
          submission_data?: Json
          submitted_at?: string | null
          user_agent?: string | null
        }
        Update: {
          contact_id?: string | null
          enrichment_status?: string | null
          form_id?: string
          gift_card_id?: string | null
          id?: string
          ip_address?: string | null
          recipient_id?: string | null
          redemption_token?: string | null
          submission_data?: Json
          submitted_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ace_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "ace_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ace_form_submissions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ace_form_submissions_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      ace_forms: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          form_config: Json
          id: string
          is_active: boolean | null
          is_draft: boolean | null
          last_auto_save: string | null
          name: string
          template_id: string | null
          total_submissions: number | null
          total_views: number | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          form_config?: Json
          id?: string
          is_active?: boolean | null
          is_draft?: boolean | null
          last_auto_save?: string | null
          name: string
          template_id?: string | null
          total_submissions?: number | null
          total_views?: number | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          form_config?: Json
          id?: string
          is_active?: boolean | null
          is_draft?: boolean | null
          last_auto_save?: string | null
          name?: string
          template_id?: string | null
          total_submissions?: number | null
          total_views?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ace_forms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_card_sales: {
        Row: {
          buyer_client_id: string | null
          buyer_pool_id: string | null
          cost_per_card: number | null
          created_at: string | null
          id: string
          master_pool_id: string | null
          notes: string | null
          price_per_card: number
          profit: number | null
          quantity: number
          sale_date: string | null
          sold_by_user_id: string | null
          total_amount: number
        }
        Insert: {
          buyer_client_id?: string | null
          buyer_pool_id?: string | null
          cost_per_card?: number | null
          created_at?: string | null
          id?: string
          master_pool_id?: string | null
          notes?: string | null
          price_per_card: number
          profit?: number | null
          quantity: number
          sale_date?: string | null
          sold_by_user_id?: string | null
          total_amount: number
        }
        Update: {
          buyer_client_id?: string | null
          buyer_pool_id?: string | null
          cost_per_card?: number | null
          created_at?: string | null
          id?: string
          master_pool_id?: string | null
          notes?: string | null
          price_per_card?: number
          profit?: number | null
          quantity?: number
          sale_date?: string | null
          sold_by_user_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_card_sales_buyer_client_id_fkey"
            columns: ["buyer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_card_sales_buyer_pool_id_fkey"
            columns: ["buyer_pool_id"]
            isOneToOne: false
            referencedRelation: "gift_card_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_card_sales_master_pool_id_fkey"
            columns: ["master_pool_id"]
            isOneToOne: false
            referencedRelation: "gift_card_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_gift_card_inventory: {
        Row: {
          brand_id: string | null
          cost_per_card: number
          created_at: string | null
          created_by_user_id: string | null
          id: string
          notes: string | null
          purchase_date: string | null
          quantity: number
          supplier_name: string | null
          supplier_reference: string | null
          total_cost: number
        }
        Insert: {
          brand_id?: string | null
          cost_per_card: number
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          purchase_date?: string | null
          quantity: number
          supplier_name?: string | null
          supplier_reference?: string | null
          total_cost: number
        }
        Update: {
          brand_id?: string | null
          cost_per_card?: number
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          purchase_date?: string | null
          quantity?: number
          supplier_name?: string | null
          supplier_reference?: string | null
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_gift_card_inventory_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "gift_card_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_impersonations: {
        Row: {
          admin_user_id: string
          created_at: string | null
          ended_at: string | null
          id: string
          impersonated_user_id: string
          ip_address: string | null
          reason: string | null
          started_at: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          impersonated_user_id: string
          ip_address?: string | null
          reason?: string | null
          started_at?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          impersonated_user_id?: string
          ip_address?: string | null
          reason?: string | null
          started_at?: string | null
        }
        Relationships: []
      }
      agency_client_assignments: {
        Row: {
          agency_org_id: string
          client_id: string
          created_at: string | null
          created_by_user_id: string | null
          id: string
        }
        Insert: {
          agency_org_id: string
          client_id: string
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
        }
        Update: {
          agency_org_id?: string
          client_id?: string
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_client_assignments_agency_org_id_fkey"
            columns: ["agency_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_design_sessions: {
        Row: {
          design_id: string
          design_type: string
          ended_at: string | null
          id: string
          iterations_count: number | null
          session_outcome: string | null
          started_at: string | null
          switched_to_manual: boolean | null
          switched_to_manual_at: string | null
          total_ai_cost_usd: number | null
          total_ai_messages: number | null
          total_ai_tokens: number | null
          total_duration_seconds: number | null
          user_id: string
          user_satisfaction_score: number | null
        }
        Insert: {
          design_id: string
          design_type: string
          ended_at?: string | null
          id?: string
          iterations_count?: number | null
          session_outcome?: string | null
          started_at?: string | null
          switched_to_manual?: boolean | null
          switched_to_manual_at?: string | null
          total_ai_cost_usd?: number | null
          total_ai_messages?: number | null
          total_ai_tokens?: number | null
          total_duration_seconds?: number | null
          user_id: string
          user_satisfaction_score?: number | null
        }
        Update: {
          design_id?: string
          design_type?: string
          ended_at?: string | null
          id?: string
          iterations_count?: number | null
          session_outcome?: string | null
          started_at?: string | null
          switched_to_manual?: boolean | null
          switched_to_manual_at?: string | null
          total_ai_cost_usd?: number | null
          total_ai_messages?: number | null
          total_ai_tokens?: number | null
          total_duration_seconds?: number | null
          user_id?: string
          user_satisfaction_score?: number | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked: boolean | null
          revoked_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked?: boolean | null
          revoked_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked?: boolean | null
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
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
      brand_kits: {
        Row: {
          client_id: string
          colors: Json
          created_at: string | null
          design_style: string | null
          fonts: Json
          icon_url: string | null
          id: string
          is_default: boolean | null
          logo_urls: Json | null
          name: string
          tagline: string | null
          updated_at: string | null
          value_propositions: Json | null
        }
        Insert: {
          client_id: string
          colors?: Json
          created_at?: string | null
          design_style?: string | null
          fonts?: Json
          icon_url?: string | null
          id?: string
          is_default?: boolean | null
          logo_urls?: Json | null
          name: string
          tagline?: string | null
          updated_at?: string | null
          value_propositions?: Json | null
        }
        Update: {
          client_id?: string
          colors?: Json
          created_at?: string | null
          design_style?: string | null
          fonts?: Json
          icon_url?: string | null
          id?: string
          is_default?: boolean | null
          logo_urls?: Json | null
          name?: string
          tagline?: string | null
          updated_at?: string | null
          value_propositions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_code_uploads: {
        Row: {
          audience_id: string | null
          campaign_id: string | null
          client_id: string
          created_at: string | null
          duplicate_codes: number
          error_codes: number
          error_log: Json | null
          file_name: string
          id: string
          successful_codes: number
          total_codes: number
          upload_status: string
          uploaded_by_user_id: string
        }
        Insert: {
          audience_id?: string | null
          campaign_id?: string | null
          client_id: string
          created_at?: string | null
          duplicate_codes?: number
          error_codes?: number
          error_log?: Json | null
          file_name: string
          id?: string
          successful_codes?: number
          total_codes?: number
          upload_status?: string
          uploaded_by_user_id: string
        }
        Update: {
          audience_id?: string | null
          campaign_id?: string | null
          client_id?: string
          created_at?: string | null
          duplicate_codes?: number
          error_codes?: number
          error_log?: Json | null
          file_name?: string
          id?: string
          successful_codes?: number
          total_codes?: number
          upload_status?: string
          uploaded_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_code_uploads_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_code_uploads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_code_uploads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      call_conditions_met: {
        Row: {
          call_session_id: string
          campaign_id: string
          condition_number: number
          created_at: string
          delivery_status: string | null
          gift_card_id: string | null
          id: string
          met_at: string
          met_by_agent_id: string | null
          notes: string | null
          recipient_id: string
        }
        Insert: {
          call_session_id: string
          campaign_id: string
          condition_number: number
          created_at?: string
          delivery_status?: string | null
          gift_card_id?: string | null
          id?: string
          met_at?: string
          met_by_agent_id?: string | null
          notes?: string | null
          recipient_id: string
        }
        Update: {
          call_session_id?: string
          campaign_id?: string
          condition_number?: number
          created_at?: string
          delivery_status?: string | null
          gift_card_id?: string | null
          id?: string
          met_at?: string
          met_by_agent_id?: string | null
          notes?: string | null
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_conditions_met_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_conditions_met_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_conditions_met_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_conditions_met_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          agent_user_id: string | null
          call_answered_at: string | null
          call_duration_seconds: number | null
          call_ended_at: string | null
          call_started_at: string
          call_status: string
          caller_phone: string
          campaign_id: string
          created_at: string
          forward_to_number: string | null
          id: string
          match_status: string
          notes: string | null
          recipient_id: string | null
          recording_duration: number | null
          recording_sid: string | null
          recording_url: string | null
          tracked_number_id: string
          twilio_call_sid: string | null
        }
        Insert: {
          agent_user_id?: string | null
          call_answered_at?: string | null
          call_duration_seconds?: number | null
          call_ended_at?: string | null
          call_started_at?: string
          call_status?: string
          caller_phone: string
          campaign_id: string
          created_at?: string
          forward_to_number?: string | null
          id?: string
          match_status?: string
          notes?: string | null
          recipient_id?: string | null
          recording_duration?: number | null
          recording_sid?: string | null
          recording_url?: string | null
          tracked_number_id: string
          twilio_call_sid?: string | null
        }
        Update: {
          agent_user_id?: string | null
          call_answered_at?: string | null
          call_duration_seconds?: number | null
          call_ended_at?: string | null
          call_started_at?: string
          call_status?: string
          caller_phone?: string
          campaign_id?: string
          created_at?: string
          forward_to_number?: string | null
          id?: string
          match_status?: string
          notes?: string | null
          recipient_id?: string | null
          recording_duration?: number | null
          recording_sid?: string | null
          recording_url?: string | null
          tracked_number_id?: string
          twilio_call_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_tracked_number_id_fkey"
            columns: ["tracked_number_id"]
            isOneToOne: false
            referencedRelation: "tracked_phone_numbers"
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
      campaign_conditions: {
        Row: {
          campaign_id: string
          condition_name: string
          condition_number: number
          created_at: string
          crm_event_name: string | null
          id: string
          is_active: boolean
          time_delay_hours: number | null
          trigger_type: string
        }
        Insert: {
          campaign_id: string
          condition_name: string
          condition_number: number
          created_at?: string
          crm_event_name?: string | null
          id?: string
          is_active?: boolean
          time_delay_hours?: number | null
          trigger_type?: string
        }
        Update: {
          campaign_id?: string
          condition_name?: string
          condition_number?: number
          created_at?: string
          crm_event_name?: string | null
          id?: string
          is_active?: boolean
          time_delay_hours?: number | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_conditions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
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
      campaign_reward_configs: {
        Row: {
          campaign_id: string
          condition_number: number
          created_at: string | null
          gift_card_pool_id: string | null
          id: string
          reward_description: string | null
          sms_template: string | null
        }
        Insert: {
          campaign_id: string
          condition_number: number
          created_at?: string | null
          gift_card_pool_id?: string | null
          id?: string
          reward_description?: string | null
          sms_template?: string | null
        }
        Update: {
          campaign_id?: string
          condition_number?: number
          created_at?: string | null
          gift_card_pool_id?: string | null
          id?: string
          reward_description?: string | null
          sms_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_reward_configs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_reward_configs_gift_card_pool_id_fkey"
            columns: ["gift_card_pool_id"]
            isOneToOne: false
            referencedRelation: "gift_card_pools"
            referencedColumns: ["id"]
          },
        ]
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
          landing_page_id: string | null
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
          landing_page_id?: string | null
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
          landing_page_id?: string | null
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
            foreignKeyName: "campaigns_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
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
          font_preferences: Json | null
          id: string
          industry: Database["public"]["Enums"]["industry_type"]
          logo_url: string | null
          name: string
          org_id: string
          tagline: string | null
          timezone: string | null
          website_url: string | null
        }
        Insert: {
          api_key_hash?: string | null
          brand_colors_json?: Json | null
          created_at?: string | null
          credits?: number | null
          font_preferences?: Json | null
          id?: string
          industry: Database["public"]["Enums"]["industry_type"]
          logo_url?: string | null
          name: string
          org_id: string
          tagline?: string | null
          timezone?: string | null
          website_url?: string | null
        }
        Update: {
          api_key_hash?: string | null
          brand_colors_json?: Json | null
          created_at?: string | null
          credits?: number | null
          font_preferences?: Json | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"]
          logo_url?: string | null
          name?: string
          org_id?: string
          tagline?: string | null
          timezone?: string | null
          website_url?: string | null
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
      crm_events: {
        Row: {
          call_session_id: string | null
          campaign_id: string | null
          condition_triggered: number | null
          created_at: string | null
          crm_integration_id: string
          error_message: string | null
          event_type: string
          id: string
          matched: boolean | null
          processed: boolean | null
          processed_at: string | null
          raw_payload: Json
          recipient_id: string | null
        }
        Insert: {
          call_session_id?: string | null
          campaign_id?: string | null
          condition_triggered?: number | null
          created_at?: string | null
          crm_integration_id: string
          error_message?: string | null
          event_type: string
          id?: string
          matched?: boolean | null
          processed?: boolean | null
          processed_at?: string | null
          raw_payload: Json
          recipient_id?: string | null
        }
        Update: {
          call_session_id?: string | null
          campaign_id?: string | null
          condition_triggered?: number | null
          created_at?: string | null
          crm_integration_id?: string
          error_message?: string | null
          event_type?: string
          id?: string
          matched?: boolean | null
          processed?: boolean | null
          processed_at?: string | null
          raw_payload?: Json
          recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_events_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_events_crm_integration_id_fkey"
            columns: ["crm_integration_id"]
            isOneToOne: false
            referencedRelation: "crm_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_integrations: {
        Row: {
          api_credentials_encrypted: Json | null
          campaign_id: string | null
          client_id: string
          created_at: string | null
          crm_provider: string
          event_mappings: Json
          field_mappings: Json
          id: string
          is_active: boolean | null
          last_event_at: string | null
          updated_at: string | null
          webhook_secret: string
          webhook_url: string
        }
        Insert: {
          api_credentials_encrypted?: Json | null
          campaign_id?: string | null
          client_id: string
          created_at?: string | null
          crm_provider: string
          event_mappings?: Json
          field_mappings?: Json
          id?: string
          is_active?: boolean | null
          last_event_at?: string | null
          updated_at?: string | null
          webhook_secret: string
          webhook_url: string
        }
        Update: {
          api_credentials_encrypted?: Json | null
          campaign_id?: string | null
          client_id?: string
          created_at?: string | null
          crm_provider?: string
          event_mappings?: Json
          field_mappings?: Json
          id?: string
          is_active?: boolean | null
          last_event_at?: string | null
          updated_at?: string | null
          webhook_secret?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_integrations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_integrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      design_versions: {
        Row: {
          ai_prompt: string | null
          change_description: string | null
          change_type: string
          created_at: string | null
          created_by_user_id: string | null
          design_id: string
          design_type: string
          grapesjs_snapshot: Json
          id: string
          performance_score: Json | null
          thumbnail_url: string | null
          version_name: string | null
          version_number: number
        }
        Insert: {
          ai_prompt?: string | null
          change_description?: string | null
          change_type: string
          created_at?: string | null
          created_by_user_id?: string | null
          design_id: string
          design_type: string
          grapesjs_snapshot: Json
          id?: string
          performance_score?: Json | null
          thumbnail_url?: string | null
          version_name?: string | null
          version_number: number
        }
        Update: {
          ai_prompt?: string | null
          change_description?: string | null
          change_type?: string
          created_at?: string | null
          created_by_user_id?: string | null
          design_id?: string
          design_type?: string
          grapesjs_snapshot?: Json
          id?: string
          performance_score?: Json | null
          thumbnail_url?: string | null
          version_name?: string | null
          version_number?: number
        }
        Relationships: []
      }
      dr_phillip_chats: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          messages: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          messages?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dr_phillip_chats_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      gift_card_api_providers: {
        Row: {
          api_endpoint: string
          auth_type: string
          config_schema: Json
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          provider_name: string
          supported_brands: Json | null
        }
        Insert: {
          api_endpoint: string
          auth_type: string
          config_schema: Json
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          provider_name: string
          supported_brands?: Json | null
        }
        Update: {
          api_endpoint?: string
          auth_type?: string
          config_schema?: Json
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          provider_name?: string
          supported_brands?: Json | null
        }
        Relationships: []
      }
      gift_card_api_purchases: {
        Row: {
          api_provider: string
          api_response: Json | null
          api_transaction_id: string | null
          card_value: number
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          pool_id: string | null
          quantity: number
          status: string | null
          total_cost_cents: number
        }
        Insert: {
          api_provider: string
          api_response?: Json | null
          api_transaction_id?: string | null
          card_value: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          pool_id?: string | null
          quantity: number
          status?: string | null
          total_cost_cents: number
        }
        Update: {
          api_provider?: string
          api_response?: Json | null
          api_transaction_id?: string | null
          card_value?: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          pool_id?: string | null
          quantity?: number
          status?: string | null
          total_cost_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_api_purchases_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "gift_card_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      gift_card_balance_history: {
        Row: {
          change_amount: number | null
          check_method: string | null
          checked_at: string | null
          error_message: string | null
          gift_card_id: string
          id: string
          new_balance: number | null
          previous_balance: number | null
          status: string | null
        }
        Insert: {
          change_amount?: number | null
          check_method?: string | null
          checked_at?: string | null
          error_message?: string | null
          gift_card_id: string
          id?: string
          new_balance?: number | null
          previous_balance?: number | null
          status?: string | null
        }
        Update: {
          change_amount?: number | null
          check_method?: string | null
          checked_at?: string | null
          error_message?: string | null
          gift_card_id?: string
          id?: string
          new_balance?: number | null
          previous_balance?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_balance_history_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_brands: {
        Row: {
          balance_check_enabled: boolean | null
          balance_check_url: string | null
          brand_code: string
          brand_color: string | null
          brand_name: string
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          provider: string
          redemption_instructions: string | null
          store_url: string | null
          typical_denominations: Json | null
          usage_restrictions: Json | null
        }
        Insert: {
          balance_check_enabled?: boolean | null
          balance_check_url?: string | null
          brand_code: string
          brand_color?: string | null
          brand_name: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          provider?: string
          redemption_instructions?: string | null
          store_url?: string | null
          typical_denominations?: Json | null
          usage_restrictions?: Json | null
        }
        Update: {
          balance_check_enabled?: boolean | null
          balance_check_url?: string | null
          brand_code?: string
          brand_color?: string | null
          brand_name?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          provider?: string
          redemption_instructions?: string | null
          store_url?: string | null
          typical_denominations?: Json | null
          usage_restrictions?: Json | null
        }
        Relationships: []
      }
      gift_card_deliveries: {
        Row: {
          call_session_id: string | null
          campaign_id: string
          condition_number: number
          created_at: string | null
          delivered_at: string | null
          delivery_address: string
          delivery_method: string
          delivery_status: string | null
          error_message: string | null
          gift_card_id: string
          id: string
          recipient_id: string
          retry_count: number | null
          sms_error_message: string | null
          sms_message: string | null
          sms_sent_at: string | null
          sms_status: string | null
          twilio_message_sid: string | null
        }
        Insert: {
          call_session_id?: string | null
          campaign_id: string
          condition_number: number
          created_at?: string | null
          delivered_at?: string | null
          delivery_address: string
          delivery_method: string
          delivery_status?: string | null
          error_message?: string | null
          gift_card_id: string
          id?: string
          recipient_id: string
          retry_count?: number | null
          sms_error_message?: string | null
          sms_message?: string | null
          sms_sent_at?: string | null
          sms_status?: string | null
          twilio_message_sid?: string | null
        }
        Update: {
          call_session_id?: string | null
          campaign_id?: string
          condition_number?: number
          created_at?: string | null
          delivered_at?: string | null
          delivery_address?: string
          delivery_method?: string
          delivery_status?: string | null
          error_message?: string | null
          gift_card_id?: string
          id?: string
          recipient_id?: string
          retry_count?: number | null
          sms_error_message?: string | null
          sms_message?: string | null
          sms_sent_at?: string | null
          sms_status?: string | null
          twilio_message_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_deliveries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_deliveries_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_deliveries_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_pools: {
        Row: {
          api_config: Json | null
          api_provider: string | null
          auto_balance_check: boolean | null
          available_cards: number | null
          available_for_purchase: boolean | null
          balance_check_frequency_hours: number | null
          brand_id: string | null
          card_value: number
          claimed_cards: number | null
          client_id: string | null
          created_at: string | null
          delivered_cards: number | null
          failed_cards: number | null
          id: string
          is_master_pool: boolean | null
          last_auto_balance_check: string | null
          low_stock_threshold: number | null
          markup_percentage: number | null
          min_purchase_quantity: number | null
          pool_name: string
          provider: string | null
          purchase_method: string | null
          sale_price_per_card: number | null
          total_cards: number | null
          updated_at: string | null
        }
        Insert: {
          api_config?: Json | null
          api_provider?: string | null
          auto_balance_check?: boolean | null
          available_cards?: number | null
          available_for_purchase?: boolean | null
          balance_check_frequency_hours?: number | null
          brand_id?: string | null
          card_value: number
          claimed_cards?: number | null
          client_id?: string | null
          created_at?: string | null
          delivered_cards?: number | null
          failed_cards?: number | null
          id?: string
          is_master_pool?: boolean | null
          last_auto_balance_check?: string | null
          low_stock_threshold?: number | null
          markup_percentage?: number | null
          min_purchase_quantity?: number | null
          pool_name: string
          provider?: string | null
          purchase_method?: string | null
          sale_price_per_card?: number | null
          total_cards?: number | null
          updated_at?: string | null
        }
        Update: {
          api_config?: Json | null
          api_provider?: string | null
          auto_balance_check?: boolean | null
          available_cards?: number | null
          available_for_purchase?: boolean | null
          balance_check_frequency_hours?: number | null
          brand_id?: string | null
          card_value?: number
          claimed_cards?: number | null
          client_id?: string | null
          created_at?: string | null
          delivered_cards?: number | null
          failed_cards?: number | null
          id?: string
          is_master_pool?: boolean | null
          last_auto_balance_check?: string | null
          low_stock_threshold?: number | null
          markup_percentage?: number | null
          min_purchase_quantity?: number | null
          pool_name?: string
          provider?: string | null
          purchase_method?: string | null
          sale_price_per_card?: number | null
          total_cards?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_pools_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "gift_card_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_pools_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_redemptions: {
        Row: {
          approved_by_user_id: string | null
          campaign_id: string
          code_entered: string
          created_at: string | null
          gift_card_delivery_id: string | null
          id: string
          recipient_id: string
          redemption_ip: string | null
          redemption_status: string
          redemption_user_agent: string | null
          rejection_reason: string | null
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          approved_by_user_id?: string | null
          campaign_id: string
          code_entered: string
          created_at?: string | null
          gift_card_delivery_id?: string | null
          id?: string
          recipient_id: string
          redemption_ip?: string | null
          redemption_status?: string
          redemption_user_agent?: string | null
          rejection_reason?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          approved_by_user_id?: string | null
          campaign_id?: string
          code_entered?: string
          created_at?: string | null
          gift_card_delivery_id?: string | null
          id?: string
          recipient_id?: string
          redemption_ip?: string | null
          redemption_status?: string
          redemption_user_agent?: string | null
          rejection_reason?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_redemptions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_redemptions_gift_card_delivery_id_fkey"
            columns: ["gift_card_delivery_id"]
            isOneToOne: false
            referencedRelation: "gift_card_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_redemptions_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_sales: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          notes: string | null
          pool_id: string
          price_per_card: number
          quantity: number
          sold_by_user_id: string | null
          total_amount: number
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          pool_id: string
          price_per_card: number
          quantity: number
          sold_by_user_id?: string | null
          total_amount: number
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          pool_id?: string
          price_per_card?: number
          quantity?: number
          sold_by_user_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_sales_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "gift_card_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          balance_check_status: string | null
          brand_id: string | null
          card_code: string
          card_number: string | null
          claimed_at: string | null
          claimed_by_call_session_id: string | null
          claimed_by_recipient_id: string | null
          created_at: string | null
          current_balance: number | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_method: string | null
          expiration_date: string | null
          id: string
          last_balance_check: string | null
          notes: string | null
          pool_id: string
          status: string | null
          tags: Json | null
        }
        Insert: {
          balance_check_status?: string | null
          brand_id?: string | null
          card_code: string
          card_number?: string | null
          claimed_at?: string | null
          claimed_by_call_session_id?: string | null
          claimed_by_recipient_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_method?: string | null
          expiration_date?: string | null
          id?: string
          last_balance_check?: string | null
          notes?: string | null
          pool_id: string
          status?: string | null
          tags?: Json | null
        }
        Update: {
          balance_check_status?: string | null
          brand_id?: string | null
          card_code?: string
          card_number?: string | null
          claimed_at?: string | null
          claimed_by_call_session_id?: string | null
          claimed_by_recipient_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_method?: string | null
          expiration_date?: string | null
          id?: string
          last_balance_check?: string | null
          notes?: string | null
          pool_id?: string
          status?: string | null
          tags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "gift_card_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_claimed_by_recipient_id_fkey"
            columns: ["claimed_by_recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "gift_card_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_versions: {
        Row: {
          change_description: string | null
          content_json: Json
          created_at: string | null
          created_by_user_id: string | null
          html_content: string | null
          id: string
          landing_page_id: string
          version_number: number
        }
        Insert: {
          change_description?: string | null
          content_json: Json
          created_at?: string | null
          created_by_user_id?: string | null
          html_content?: string | null
          id?: string
          landing_page_id: string
          version_number: number
        }
        Update: {
          change_description?: string | null
          content_json?: Json
          created_at?: string | null
          created_by_user_id?: string | null
          html_content?: string | null
          id?: string
          landing_page_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_versions_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          ai_chat_history: Json | null
          ai_generated: boolean | null
          ai_prompt: string | null
          client_id: string
          content_json: Json
          created_at: string | null
          created_by_user_id: string | null
          css_content: string | null
          design_iterations: number | null
          design_metadata: Json | null
          editor_state: string | null
          editor_type: string | null
          first_manual_edit_at: string | null
          grapesjs_project: Json | null
          html_content: string | null
          id: string
          last_ai_edit_at: string | null
          manual_edits_count: number | null
          meta_description: string | null
          meta_title: string | null
          name: string
          og_image_url: string | null
          published: boolean | null
          slug: string
          updated_at: string | null
          version_number: number | null
        }
        Insert: {
          ai_chat_history?: Json | null
          ai_generated?: boolean | null
          ai_prompt?: string | null
          client_id: string
          content_json?: Json
          created_at?: string | null
          created_by_user_id?: string | null
          css_content?: string | null
          design_iterations?: number | null
          design_metadata?: Json | null
          editor_state?: string | null
          editor_type?: string | null
          first_manual_edit_at?: string | null
          grapesjs_project?: Json | null
          html_content?: string | null
          id?: string
          last_ai_edit_at?: string | null
          manual_edits_count?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          og_image_url?: string | null
          published?: boolean | null
          slug: string
          updated_at?: string | null
          version_number?: number | null
        }
        Update: {
          ai_chat_history?: Json | null
          ai_generated?: boolean | null
          ai_prompt?: string | null
          client_id?: string
          content_json?: Json
          created_at?: string | null
          created_by_user_id?: string | null
          css_content?: string | null
          design_iterations?: number | null
          design_metadata?: Json | null
          editor_state?: string | null
          editor_type?: string | null
          first_manual_edit_at?: string | null
          grapesjs_project?: Json | null
          html_content?: string | null
          id?: string
          last_ai_edit_at?: string | null
          manual_edits_count?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          og_image_url?: string | null
          published?: boolean | null
          slug?: string
          updated_at?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      login_history: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      org_members: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
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
      permission_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          permissions?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          module: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          name?: string
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
          notification_preferences: Json | null
          phone: string | null
          timezone: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          notification_preferences?: Json | null
          phone?: string | null
          timezone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          notification_preferences?: Json | null
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
      recipient_audit_log: {
        Row: {
          action: string
          call_session_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          performed_by_user_id: string | null
          recipient_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          call_session_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          performed_by_user_id?: string | null
          recipient_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          call_session_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          performed_by_user_id?: string | null
          recipient_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipient_audit_log_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipient_audit_log_recipient_id_fkey"
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
          approval_status: string | null
          approved_at: string | null
          approved_by_user_id: string | null
          approved_call_session_id: string | null
          audience_id: string
          city: string
          company: string | null
          created_at: string | null
          delivery_status: string | null
          email: string | null
          first_name: string | null
          geocode_json: Json | null
          gift_card_assigned_id: string | null
          id: string
          last_name: string | null
          phone: string | null
          redemption_code: string | null
          redemption_completed_at: string | null
          redemption_ip: string | null
          redemption_user_agent: string | null
          rejection_reason: string | null
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
          approval_status?: string | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          approved_call_session_id?: string | null
          audience_id: string
          city: string
          company?: string | null
          created_at?: string | null
          delivery_status?: string | null
          email?: string | null
          first_name?: string | null
          geocode_json?: Json | null
          gift_card_assigned_id?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          redemption_code?: string | null
          redemption_completed_at?: string | null
          redemption_ip?: string | null
          redemption_user_agent?: string | null
          rejection_reason?: string | null
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
          approval_status?: string | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          approved_call_session_id?: string | null
          audience_id?: string
          city?: string
          company?: string | null
          created_at?: string | null
          delivery_status?: string | null
          email?: string | null
          first_name?: string | null
          geocode_json?: Json | null
          gift_card_assigned_id?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          redemption_code?: string | null
          redemption_completed_at?: string | null
          redemption_ip?: string | null
          redemption_user_agent?: string | null
          rejection_reason?: string | null
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
            foreignKeyName: "recipients_approved_call_session_id_fkey"
            columns: ["approved_call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipients_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipients_gift_card_assigned_id_fkey"
            columns: ["gift_card_assigned_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      role_hierarchy: {
        Row: {
          can_manage_roles: Database["public"]["Enums"]["app_role"][]
          description: string | null
          level: number
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_manage_roles: Database["public"]["Enums"]["app_role"][]
          description?: string | null
          level: number
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_manage_roles?: Database["public"]["Enums"]["app_role"][]
          description?: string | null
          level?: number
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          ai_chat_history: Json | null
          back_grapesjs_project: Json | null
          client_id: string
          created_at: string | null
          design_iterations: number | null
          design_metadata: Json | null
          editor_state: string | null
          first_manual_edit_at: string | null
          grapesjs_project: Json | null
          has_back_design: boolean | null
          id: string
          industry_vertical: Database["public"]["Enums"]["industry_type"] | null
          is_favorite: boolean | null
          json_layers: Json | null
          last_ai_edit_at: string | null
          manual_edits_count: number | null
          name: string
          print_specifications: Json | null
          size: Database["public"]["Enums"]["template_size"]
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          ai_chat_history?: Json | null
          back_grapesjs_project?: Json | null
          client_id: string
          created_at?: string | null
          design_iterations?: number | null
          design_metadata?: Json | null
          editor_state?: string | null
          first_manual_edit_at?: string | null
          grapesjs_project?: Json | null
          has_back_design?: boolean | null
          id?: string
          industry_vertical?:
            | Database["public"]["Enums"]["industry_type"]
            | null
          is_favorite?: boolean | null
          json_layers?: Json | null
          last_ai_edit_at?: string | null
          manual_edits_count?: number | null
          name: string
          print_specifications?: Json | null
          size: Database["public"]["Enums"]["template_size"]
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_chat_history?: Json | null
          back_grapesjs_project?: Json | null
          client_id?: string
          created_at?: string | null
          design_iterations?: number | null
          design_metadata?: Json | null
          editor_state?: string | null
          first_manual_edit_at?: string | null
          grapesjs_project?: Json | null
          has_back_design?: boolean | null
          id?: string
          industry_vertical?:
            | Database["public"]["Enums"]["industry_type"]
            | null
          is_favorite?: boolean | null
          json_layers?: Json | null
          last_ai_edit_at?: string | null
          manual_edits_count?: number | null
          name?: string
          print_specifications?: Json | null
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
      tracked_phone_numbers: {
        Row: {
          assigned_at: string | null
          campaign_id: string | null
          client_id: string
          created_at: string
          forward_to_number: string | null
          friendly_name: string | null
          id: string
          monthly_cost: number | null
          phone_number: string
          purchased_at: string | null
          recording_enabled: boolean | null
          status: string
          twilio_sid: string | null
        }
        Insert: {
          assigned_at?: string | null
          campaign_id?: string | null
          client_id: string
          created_at?: string
          forward_to_number?: string | null
          friendly_name?: string | null
          id?: string
          monthly_cost?: number | null
          phone_number: string
          purchased_at?: string | null
          recording_enabled?: boolean | null
          status?: string
          twilio_sid?: string | null
        }
        Update: {
          assigned_at?: string | null
          campaign_id?: string | null
          client_id?: string
          created_at?: string
          forward_to_number?: string | null
          friendly_name?: string | null
          id?: string
          monthly_cost?: number | null
          phone_number?: string
          purchased_at?: string | null
          recording_enabled?: boolean | null
          status?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracked_phone_numbers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_phone_numbers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          client_id: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          metadata: Json | null
          org_id: string | null
          status: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          metadata?: Json | null
          org_id?: string | null
          status?: string | null
          token?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          metadata?: Json | null
          org_id?: string | null
          status?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string | null
          granted: boolean | null
          id: string
          permission_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted?: boolean | null
          id?: string
          permission_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted?: boolean | null
          id?: string
          permission_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
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
      webhook_logs: {
        Row: {
          created_at: string | null
          error: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          webhook_id: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          active: boolean | null
          client_id: string
          created_at: string | null
          events: string[]
          failure_count: number | null
          id: string
          integration_type: string | null
          last_triggered_at: string | null
          name: string
          secret: string
          updated_at: string | null
          url: string
          zapier_metadata: Json | null
        }
        Insert: {
          active?: boolean | null
          client_id: string
          created_at?: string | null
          events: string[]
          failure_count?: number | null
          id?: string
          integration_type?: string | null
          last_triggered_at?: string | null
          name: string
          secret: string
          updated_at?: string | null
          url: string
          zapier_metadata?: Json | null
        }
        Update: {
          active?: boolean | null
          client_id?: string
          created_at?: string | null
          events?: string[]
          failure_count?: number | null
          id?: string
          integration_type?: string | null
          last_triggered_at?: string | null
          name?: string
          secret?: string
          updated_at?: string | null
          url?: string
          zapier_metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      zapier_connections: {
        Row: {
          client_id: string
          connection_name: string
          created_at: string | null
          description: string | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          success_count: number | null
          trigger_events: string[]
          updated_at: string | null
          zap_webhook_url: string
        }
        Insert: {
          client_id: string
          connection_name: string
          created_at?: string | null
          description?: string | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          success_count?: number | null
          trigger_events?: string[]
          updated_at?: string | null
          zap_webhook_url: string
        }
        Update: {
          client_id?: string
          connection_name?: string
          created_at?: string | null
          description?: string | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          success_count?: number | null
          trigger_events?: string[]
          updated_at?: string | null
          zap_webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "zapier_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      zapier_trigger_logs: {
        Row: {
          error: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          triggered_at: string | null
          zapier_connection_id: string
        }
        Insert: {
          error?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          triggered_at?: string | null
          zapier_connection_id: string
        }
        Update: {
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          triggered_at?: string | null
          zapier_connection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zapier_trigger_logs_zapier_connection_id_fkey"
            columns: ["zapier_connection_id"]
            isOneToOne: false
            referencedRelation: "zapier_connections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_available_card: {
        Args: {
          p_call_session_id?: string
          p_pool_id: string
          p_recipient_id: string
        }
        Returns: {
          card_code: string
          card_id: string
          card_number: string
          card_value: number
          provider: string
          provisioned_via_api: boolean
        }[]
      }
      expire_old_invitations: { Args: never; Returns: undefined }
      generate_recipient_token: { Args: never; Returns: string }
      generate_redemption_code: { Args: never; Returns: string }
      get_audience_geo_distribution: {
        Args: { audience_id_param: string }
        Returns: {
          count: number
          state: string
        }[]
      }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          permission_name: string
        }[]
      }
      get_user_role_level: { Args: { _user_id: string }; Returns: number }
      has_permission: {
        Args: { _permission_name: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_form_stat: {
        Args: { form_id: string; stat_name: string }
        Returns: undefined
      }
      platform_admin_exists: { Args: never; Returns: boolean }
      user_can_access_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_manage_role: {
        Args: {
          _target_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
      app_role:
        | "admin"
        | "tech_support"
        | "agency_owner"
        | "company_owner"
        | "developer"
        | "call_center"
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
      app_role: [
        "admin",
        "tech_support",
        "agency_owner",
        "company_owner",
        "developer",
        "call_center",
      ],
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

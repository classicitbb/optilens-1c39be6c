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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abandoned_cart_alerts: {
        Row: {
          cart_snapshot: Json
          cutoff_hours: number
          email_outbox_id: string | null
          first_detected_at: string
          helpdesk_ticket_id: string | null
          id: string
          last_detected_at: string
          notification_id: string | null
          status: string
          total_amount: number
          total_items: number
          user_id: string
        }
        Insert: {
          cart_snapshot?: Json
          cutoff_hours?: number
          email_outbox_id?: string | null
          first_detected_at?: string
          helpdesk_ticket_id?: string | null
          id?: string
          last_detected_at?: string
          notification_id?: string | null
          status?: string
          total_amount?: number
          total_items?: number
          user_id: string
        }
        Update: {
          cart_snapshot?: Json
          cutoff_hours?: number
          email_outbox_id?: string | null
          first_detected_at?: string
          helpdesk_ticket_id?: string | null
          id?: string
          last_detected_at?: string
          notification_id?: string | null
          status?: string
          total_amount?: number
          total_items?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_cart_alerts_email_outbox_id_fkey"
            columns: ["email_outbox_id"]
            isOneToOne: false
            referencedRelation: "customer_automation_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_cart_alerts_helpdesk_ticket_id_fkey"
            columns: ["helpdesk_ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_cart_alerts_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "admin_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      account_payments: {
        Row: {
          account_number: string | null
          amount: number
          amount_bbd: number | null
          bank_reference: string | null
          card_saved_at: string | null
          confirmed_at: string | null
          created_at: string
          crm_customer_id: number | null
          currency: string
          fx_rate_bbd_per_usd: number | null
          gateway_fail_rc: string | null
          gateway_oid: string | null
          gateway_response_code: string | null
          id: string
          provider: string
          saved_payment_method_id: string | null
          statement_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          amount: number
          amount_bbd?: number | null
          bank_reference?: string | null
          card_saved_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          crm_customer_id?: number | null
          currency?: string
          fx_rate_bbd_per_usd?: number | null
          gateway_fail_rc?: string | null
          gateway_oid?: string | null
          gateway_response_code?: string | null
          id?: string
          provider?: string
          saved_payment_method_id?: string | null
          statement_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          amount?: number
          amount_bbd?: number | null
          bank_reference?: string | null
          card_saved_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          crm_customer_id?: number | null
          currency?: string
          fx_rate_bbd_per_usd?: number | null
          gateway_fail_rc?: string | null
          gateway_oid?: string | null
          gateway_response_code?: string | null
          id?: string
          provider?: string
          saved_payment_method_id?: string | null
          statement_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_payments_saved_payment_method_id_fkey"
            columns: ["saved_payment_method_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          activity_type: string | null
          completed_at: string | null
          contact_id: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          due_at: string | null
          id: string
          opportunity_id: string | null
          owner_id: string | null
          priority: string
          status: string | null
          task_channel: Database["public"]["Enums"]["activity_task_channel"]
          type: string
          updated_at: string
        }
        Insert: {
          activity_type?: string | null
          completed_at?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          due_at?: string | null
          id?: string
          opportunity_id?: string | null
          owner_id?: string | null
          priority?: string
          status?: string | null
          task_channel?: Database["public"]["Enums"]["activity_task_channel"]
          type?: string
          updated_at?: string
        }
        Update: {
          activity_type?: string | null
          completed_at?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          due_at?: string | null
          id?: string
          opportunity_id?: string | null
          owner_id?: string | null
          priority?: string
          status?: string | null
          task_channel?: Database["public"]["Enums"]["activity_task_channel"]
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_automation_runs: {
        Row: {
          activity_id: string
          approved_at: string | null
          approved_by: string | null
          automation_id: string
          created_at: string
          error: string | null
          executed_at: string | null
          id: string
          idempotency_key: string
          proposed_action: Json
          result: Json | null
          status: string
          trigger_state: string
        }
        Insert: {
          activity_id: string
          approved_at?: string | null
          approved_by?: string | null
          automation_id: string
          created_at?: string
          error?: string | null
          executed_at?: string | null
          id?: string
          idempotency_key: string
          proposed_action: Json
          result?: Json | null
          status?: string
          trigger_state: string
        }
        Update: {
          activity_id?: string
          approved_at?: string | null
          approved_by?: string | null
          automation_id?: string
          created_at?: string
          error?: string | null
          executed_at?: string | null
          id?: string
          idempotency_key?: string
          proposed_action?: Json
          result?: Json | null
          status?: string
          trigger_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_automation_runs_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "activity_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_automations: {
        Row: {
          activity_id: string
          config: Json
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          recipe: string
          trigger_state: string
        }
        Insert: {
          activity_id: string
          config?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          recipe: string
          trigger_state?: string
        }
        Update: {
          activity_id?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          recipe?: string
          trigger_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_automations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_participants: {
        Row: {
          activity_id: string
          added_by: string | null
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          activity_id: string
          added_by?: string | null
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          activity_id?: string
          added_by?: string | null
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_participants_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_clash_rules: {
        Row: {
          addon_id_a: string
          addon_id_b: string
          created_at: string
          created_by: string | null
          id: string
          reason: string
        }
        Insert: {
          addon_id_a: string
          addon_id_b: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason: string
        }
        Update: {
          addon_id_a?: string
          addon_id_b?: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_clash_rules_addon_id_a_fkey"
            columns: ["addon_id_a"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_clash_rules_addon_id_a_fkey"
            columns: ["addon_id_a"]
            isOneToOne: false
            referencedRelation: "addons_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_clash_rules_addon_id_b_fkey"
            columns: ["addon_id_b"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_clash_rules_addon_id_b_fkey"
            columns: ["addon_id_b"]
            isOneToOne: false
            referencedRelation: "addons_public"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_pricing_sheets: {
        Row: {
          addon_id: string
          created_at: string
          id: string
          price_override: number | null
          pricing_sheet_id: string
        }
        Insert: {
          addon_id: string
          created_at?: string
          id?: string
          price_override?: number | null
          pricing_sheet_id: string
        }
        Update: {
          addon_id?: string
          created_at?: string
          id?: string
          price_override?: number | null
          pricing_sheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_pricing_sheets_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_pricing_sheets_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_pricing_sheets_pricing_sheet_id_fkey"
            columns: ["pricing_sheet_id"]
            isOneToOne: false
            referencedRelation: "pricing_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      addons: {
        Row: {
          auto_rule: Json | null
          category: string
          cost: number
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_auto: boolean
          name: string
          price: number
          show_on_website: boolean
          sku: string
          sort_order: number
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          auto_rule?: Json | null
          category?: string
          cost?: number
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_auto?: boolean
          name: string
          price?: number
          show_on_website?: boolean
          sku?: string
          sort_order?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_rule?: Json | null
          category?: string
          cost?: number
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_auto?: boolean
          name?: string
          price?: number
          show_on_website?: boolean
          sku?: string
          sort_order?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addons_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notification_receipts: {
        Row: {
          created_at: string
          dismissed_at: string | null
          id: string
          notification_id: string
          read_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          notification_id: string
          read_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          notification_id?: string
          read_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notification_receipts_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "admin_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          created_at: string
          event_type: string
          href: string | null
          id: string
          message: string
          metadata: Json
          related_ticket_id: string | null
          related_user_id: string | null
          severity: string
          title: string
        }
        Insert: {
          created_at?: string
          event_type: string
          href?: string | null
          id?: string
          message: string
          metadata?: Json
          related_ticket_id?: string | null
          related_user_id?: string | null
          severity?: string
          title: string
        }
        Update: {
          created_at?: string
          event_type?: string
          href?: string | null
          id?: string
          message?: string
          metadata?: Json
          related_ticket_id?: string | null
          related_user_id?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_related_ticket_id_fkey"
            columns: ["related_ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_secrets: {
        Row: {
          encrypted_secret: string
          settings_id: string
          updated_at: string
        }
        Insert: {
          encrypted_secret: string
          settings_id: string
          updated_at?: string
        }
        Update: {
          encrypted_secret?: string
          settings_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_secrets_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: true
            referencedRelation: "ai_agent_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_settings: {
        Row: {
          created_at: string
          enabled: boolean
          has_secret: boolean
          id: string
          last_error: string | null
          last_tested_at: string | null
          model: string | null
          provider: string
          status: string
          tenant_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          has_secret?: boolean
          id?: string
          last_error?: string | null
          last_tested_at?: string | null
          model?: string | null
          provider: string
          status?: string
          tenant_key?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          has_secret?: boolean
          id?: string
          last_error?: string | null
          last_tested_at?: string | null
          model?: string | null
          provider?: string
          status?: string
          tenant_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_audit_log: {
        Row: {
          api_key_id: string | null
          created_at: string
          id: string
          ip: string | null
          method: string
          request_summary: Json | null
          resource: string
          resource_id: string | null
          response_summary: Json | null
          status: number
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          method: string
          request_summary?: Json | null
          resource: string
          resource_id?: string | null
          response_summary?: Json | null
          status: number
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          method?: string
          request_summary?: Json | null
          resource?: string
          resource_id?: string | null
          response_summary?: Json | null
          status?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_audit_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          draft_pricelist_version_id: number | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          draft_pricelist_version_id?: number | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          draft_pricelist_version_id?: number | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_draft_pricelist_version_id_fkey"
            columns: ["draft_pricelist_version_id"]
            isOneToOne: false
            referencedRelation: "pricelist_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_conversations: {
        Row: {
          audience: string
          context: Json
          created_at: string
          id: string
          is_archived: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audience?: string
          context?: Json
          created_at?: string
          id?: string
          is_archived?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string
          context?: Json
          created_at?: string
          id?: string
          is_archived?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assistant_editorial_opportunities: {
        Row: {
          agent_activity_id: string | null
          audience: string
          created_at: string
          editorial_activity_id: string | null
          first_observed_at: string
          id: string
          last_observed_at: string
          route: string
          source_count: number
          topic_key: string
          updated_at: string
        }
        Insert: {
          agent_activity_id?: string | null
          audience: string
          created_at?: string
          editorial_activity_id?: string | null
          first_observed_at: string
          id?: string
          last_observed_at: string
          route: string
          source_count?: number
          topic_key: string
          updated_at?: string
        }
        Update: {
          agent_activity_id?: string | null
          audience?: string
          created_at?: string
          editorial_activity_id?: string | null
          first_observed_at?: string
          id?: string
          last_observed_at?: string
          route?: string
          source_count?: number
          topic_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_editorial_opportunities_agent_activity_id_fkey"
            columns: ["agent_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_editorial_opportunities_editorial_activity_id_fkey"
            columns: ["editorial_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_editorial_signals: {
        Row: {
          audience: string
          id: string
          occurred_at: string
          outcome: string
          route: string
          session_hash: string
          topic_key: string
        }
        Insert: {
          audience: string
          id?: string
          occurred_at?: string
          outcome: string
          route: string
          session_hash: string
          topic_key: string
        }
        Update: {
          audience?: string
          id?: string
          occurred_at?: string
          outcome?: string
          route?: string
          session_hash?: string
          topic_key?: string
        }
        Relationships: []
      }
      assistant_feedback: {
        Row: {
          anonymous_session_id: string | null
          answer_mode: string | null
          audience: string
          citation_ids: Json
          comment: string | null
          confidence: string | null
          conversation_id: string | null
          created_at: string
          feedback_key: string
          id: string
          intent: string | null
          message_id: string | null
          route: string | null
          source_ids: Json
          updated_at: string
          user_id: string | null
          vote: string
        }
        Insert: {
          anonymous_session_id?: string | null
          answer_mode?: string | null
          audience?: string
          citation_ids?: Json
          comment?: string | null
          confidence?: string | null
          conversation_id?: string | null
          created_at?: string
          feedback_key: string
          id?: string
          intent?: string | null
          message_id?: string | null
          route?: string | null
          source_ids?: Json
          updated_at?: string
          user_id?: string | null
          vote: string
        }
        Update: {
          anonymous_session_id?: string | null
          answer_mode?: string | null
          audience?: string
          citation_ids?: Json
          comment?: string | null
          confidence?: string | null
          conversation_id?: string | null
          created_at?: string
          feedback_key?: string
          id?: string
          intent?: string | null
          message_id?: string | null
          route?: string | null
          source_ids?: Json
          updated_at?: string
          user_id?: string | null
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          change_summary: Json | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          reason: string | null
          record_id: string
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          change_summary?: Json | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          reason?: string | null
          record_id: string
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          change_summary?: Json | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          reason?: string | null
          record_id?: string
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      balances: {
        Row: {
          account_number: string | null
          credit_limit: number | null
          current_balance: number | null
          customer_id: number | null
          innovations_customer_id: number
          last_payment_amount: number | null
          last_payment_date: string | null
          last_statement_amount: number | null
          last_statement_date: string | null
          synced_at: string
        }
        Insert: {
          account_number?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          customer_id?: number | null
          innovations_customer_id: number
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_statement_amount?: number | null
          last_statement_date?: string | null
          synced_at?: string
        }
        Update: {
          account_number?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          customer_id?: number | null
          innovations_customer_id?: number
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_statement_amount?: number | null
          last_statement_date?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "balances_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "balances_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balances_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      bank_payment_portals: {
        Row: {
          bank_name: string
          innovations_eft_institution_id: number | null
          notes: string | null
          portal_url: string | null
          updated_at: string
        }
        Insert: {
          bank_name: string
          innovations_eft_institution_id?: number | null
          notes?: string | null
          portal_url?: string | null
          updated_at?: string
        }
        Update: {
          bank_name?: string
          innovations_eft_institution_id?: number | null
          notes?: string | null
          portal_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          body_json: Json | null
          category: string | null
          content: string
          cover_image_alt: string | null
          cover_image_url: string | null
          created_at: string
          entry_type: string
          excerpt: string | null
          id: string
          is_featured: boolean
          published_at: string | null
          related_post_slugs: string[]
          seo_description: string | null
          seo_title: string | null
          slug: string | null
          source_url: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body_json?: Json | null
          category?: string | null
          content?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          entry_type?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          related_post_slugs?: string[]
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          source_url?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body_json?: Json | null
          category?: string | null
          content?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          entry_type?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          related_post_slugs?: string[]
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          source_url?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          abbrev: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cadence_enrollments: {
        Row: {
          cadence_id: string
          completed_at: string | null
          contact_id: string
          current_step: number
          enrolled_at: string
          id: string
          next_step_due_at: string | null
          status: string
        }
        Insert: {
          cadence_id: string
          completed_at?: string | null
          contact_id: string
          current_step?: number
          enrolled_at?: string
          id?: string
          next_step_due_at?: string | null
          status?: string
        }
        Update: {
          cadence_id?: string
          completed_at?: string | null
          contact_id?: string
          current_step?: number
          enrolled_at?: string
          id?: string
          next_step_due_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadence_enrollments_cadence_id_fkey"
            columns: ["cadence_id"]
            isOneToOne: false
            referencedRelation: "cadences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      cadence_steps: {
        Row: {
          body_template: string | null
          cadence_id: string
          channel: string
          delay_days: number
          id: string
          step_order: number
          subject: string | null
        }
        Insert: {
          body_template?: string | null
          cadence_id: string
          channel: string
          delay_days?: number
          id?: string
          step_order: number
          subject?: string | null
        }
        Update: {
          body_template?: string | null
          cadence_id?: string
          channel?: string
          delay_days?: number
          id?: string
          step_order?: number
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cadence_steps_cadence_id_fkey"
            columns: ["cadence_id"]
            isOneToOne: false
            referencedRelation: "cadences"
            referencedColumns: ["id"]
          },
        ]
      }
      cadences: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          pipeline: string
          target_stage: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          pipeline: string
          target_stage?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          pipeline?: string
          target_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cadences_pipeline_fkey"
            columns: ["pipeline"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["key"]
          },
        ]
      }
      cart_drafts: {
        Row: {
          created_at: string
          id: string
          items: Json
          name: string
          note: string | null
          total_amount: number
          total_items: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          name: string
          note?: string | null
          total_amount?: number
          total_items?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          name?: string
          note?: string | null
          total_amount?: number
          total_items?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          opc_code: string | null
          product_id: number
          product_name: string
          product_price: number
          product_type: string
          quantity: number
          sku: string | null
          updated_at: string
          user_id: string
          variant_id: string | null
          variant_label: string | null
          variant_metadata: Json
          variant_opc_code: string | null
          variant_sku: string | null
          variant_snapshot: Json
        }
        Insert: {
          created_at?: string
          id?: string
          opc_code?: string | null
          product_id: number
          product_name: string
          product_price: number
          product_type?: string
          quantity?: number
          sku?: string | null
          updated_at?: string
          user_id: string
          variant_id?: string | null
          variant_label?: string | null
          variant_metadata?: Json
          variant_opc_code?: string | null
          variant_sku?: string | null
          variant_snapshot?: Json
        }
        Update: {
          created_at?: string
          id?: string
          opc_code?: string | null
          product_id?: number
          product_name?: string
          product_price?: number
          product_type?: string
          quantity?: number
          sku?: string | null
          updated_at?: string
          user_id?: string
          variant_id?: string | null
          variant_label?: string | null
          variant_metadata?: Json
          variant_opc_code?: string | null
          variant_sku?: string | null
          variant_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_assignments: {
        Row: {
          assigned_at: string | null
          catalog_template_id: number | null
          customer_id: number | null
          id: number
        }
        Insert: {
          assigned_at?: string | null
          catalog_template_id?: number | null
          customer_id?: number | null
          id?: number
        }
        Update: {
          assigned_at?: string | null
          catalog_template_id?: number | null
          customer_id?: number | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalog_assignments_catalog_template_id_fkey"
            columns: ["catalog_template_id"]
            isOneToOne: false
            referencedRelation: "catalog_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "catalog_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      catalog_page_objects: {
        Row: {
          content: Json
          created_at: string
          height: number | null
          id: string
          is_locked: boolean
          is_visible: boolean
          label: string | null
          object_type: string
          page_id: string
          rotation: number
          style: Json
          updated_at: string
          width: number
          x: number
          y: number
          z_index: number
        }
        Insert: {
          content?: Json
          created_at?: string
          height?: number | null
          id?: string
          is_locked?: boolean
          is_visible?: boolean
          label?: string | null
          object_type?: string
          page_id: string
          rotation?: number
          style?: Json
          updated_at?: string
          width?: number
          x?: number
          y?: number
          z_index?: number
        }
        Update: {
          content?: Json
          created_at?: string
          height?: number | null
          id?: string
          is_locked?: boolean
          is_visible?: boolean
          label?: string | null
          object_type?: string
          page_id?: string
          rotation?: number
          style?: Json
          updated_at?: string
          width?: number
          x?: number
          y?: number
          z_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalog_page_objects_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "catalog_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_pages: {
        Row: {
          catalog_template_id: number
          created_at: string
          id: string
          page_number: number
          page_settings: Json
          updated_at: string
        }
        Insert: {
          catalog_template_id: number
          created_at?: string
          id?: string
          page_number?: number
          page_settings?: Json
          updated_at?: string
        }
        Update: {
          catalog_template_id?: number
          created_at?: string
          id?: string
          page_number?: number
          page_settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_pages_catalog_template_id_fkey"
            columns: ["catalog_template_id"]
            isOneToOne: false
            referencedRelation: "catalog_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_sections: {
        Row: {
          article_id: string | null
          catalog_template_id: number | null
          custom_title: string | null
          format_choice: string | null
          id: number
          is_included: boolean | null
          pricelist_version_id: number | null
          section_type: string
          sort_order: number | null
        }
        Insert: {
          article_id?: string | null
          catalog_template_id?: number | null
          custom_title?: string | null
          format_choice?: string | null
          id?: number
          is_included?: boolean | null
          pricelist_version_id?: number | null
          section_type: string
          sort_order?: number | null
        }
        Update: {
          article_id?: string | null
          catalog_template_id?: number | null
          custom_title?: string | null
          format_choice?: string | null
          id?: number
          is_included?: boolean | null
          pricelist_version_id?: number | null
          section_type?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_sections_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_sections_catalog_template_id_fkey"
            columns: ["catalog_template_id"]
            isOneToOne: false
            referencedRelation: "catalog_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_sections_pricelist_version_id_fkey"
            columns: ["pricelist_version_id"]
            isOneToOne: false
            referencedRelation: "pricelist_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_templates: {
        Row: {
          cover_subtitle: string | null
          cover_title: string | null
          created_at: string | null
          created_by: string | null
          gradient_color_end: string | null
          gradient_color_start: string | null
          id: number
          name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          cover_subtitle?: string | null
          cover_title?: string | null
          created_at?: string | null
          created_by?: string | null
          gradient_color_end?: string | null
          gradient_color_start?: string | null
          id?: number
          name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          cover_subtitle?: string | null
          cover_title?: string | null
          created_at?: string | null
          created_by?: string | null
          gradient_color_end?: string | null
          gradient_color_start?: string | null
          id?: number
          name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      charge_types: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          bank_account_name: string
          bank_account_no: string
          bank_branch: string
          bank_name: string
          bank_note: string
          bank_swift: string
          base_currency: string
          bill_city: string
          bill_country: string
          bill_county: string
          bill_line1: string
          bill_line2: string
          bill_postcode: string
          bill_state: string
          bill_use_physical: boolean
          business_calendar: string
          company_name: string
          company_reg_no: string
          default_due_days: number
          default_paper_size: string
          default_vat: number
          email: string
          fax: string
          feedback_email: string
          frames_duty: number
          id: string
          import_duty: number
          import_multiple: number
          labour_percent: number
          logo_file_name: string | null
          logo_url: string | null
          pdf_footer_html: string
          pdf_header_html: string
          physical_city: string
          physical_country: string
          physical_county: string
          physical_line1: string
          physical_line2: string
          physical_postcode: string
          physical_state: string
          primary_contact: string
          profit_percent: number
          ship_city: string
          ship_country: string
          ship_county: string
          ship_line1: string
          ship_line2: string
          ship_postcode: string
          ship_state: string
          ship_use_physical: boolean
          slogan: string
          tax_tin: string
          tel: string
          updated_at: string
          wholesale_stock_percentage: number
        }
        Insert: {
          bank_account_name?: string
          bank_account_no?: string
          bank_branch?: string
          bank_name?: string
          bank_note?: string
          bank_swift?: string
          base_currency?: string
          bill_city?: string
          bill_country?: string
          bill_county?: string
          bill_line1?: string
          bill_line2?: string
          bill_postcode?: string
          bill_state?: string
          bill_use_physical?: boolean
          business_calendar?: string
          company_name?: string
          company_reg_no?: string
          default_due_days?: number
          default_paper_size?: string
          default_vat?: number
          email?: string
          fax?: string
          feedback_email?: string
          frames_duty?: number
          id?: string
          import_duty?: number
          import_multiple?: number
          labour_percent?: number
          logo_file_name?: string | null
          logo_url?: string | null
          pdf_footer_html?: string
          pdf_header_html?: string
          physical_city?: string
          physical_country?: string
          physical_county?: string
          physical_line1?: string
          physical_line2?: string
          physical_postcode?: string
          physical_state?: string
          primary_contact?: string
          profit_percent?: number
          ship_city?: string
          ship_country?: string
          ship_county?: string
          ship_line1?: string
          ship_line2?: string
          ship_postcode?: string
          ship_state?: string
          ship_use_physical?: boolean
          slogan?: string
          tax_tin?: string
          tel?: string
          updated_at?: string
          wholesale_stock_percentage?: number
        }
        Update: {
          bank_account_name?: string
          bank_account_no?: string
          bank_branch?: string
          bank_name?: string
          bank_note?: string
          bank_swift?: string
          base_currency?: string
          bill_city?: string
          bill_country?: string
          bill_county?: string
          bill_line1?: string
          bill_line2?: string
          bill_postcode?: string
          bill_state?: string
          bill_use_physical?: boolean
          business_calendar?: string
          company_name?: string
          company_reg_no?: string
          default_due_days?: number
          default_paper_size?: string
          default_vat?: number
          email?: string
          fax?: string
          feedback_email?: string
          frames_duty?: number
          id?: string
          import_duty?: number
          import_multiple?: number
          labour_percent?: number
          logo_file_name?: string | null
          logo_url?: string | null
          pdf_footer_html?: string
          pdf_header_html?: string
          physical_city?: string
          physical_country?: string
          physical_county?: string
          physical_line1?: string
          physical_line2?: string
          physical_postcode?: string
          physical_state?: string
          primary_contact?: string
          profit_percent?: number
          ship_city?: string
          ship_country?: string
          ship_county?: string
          ship_line1?: string
          ship_line2?: string
          ship_postcode?: string
          ship_state?: string
          ship_use_physical?: boolean
          slogan?: string
          tax_tin?: string
          tel?: string
          updated_at?: string
          wholesale_stock_percentage?: number
        }
        Relationships: []
      }
      contact_enrichment_attempts: {
        Row: {
          attempted_at: string
          batch_id: string | null
          contact_id: string
          error: string | null
          id: string
          match_confidence: number | null
          outcome: string
          place_id: string | null
          provider: string
          trigger_source: string
        }
        Insert: {
          attempted_at?: string
          batch_id?: string | null
          contact_id: string
          error?: string | null
          id?: string
          match_confidence?: number | null
          outcome: string
          place_id?: string | null
          provider?: string
          trigger_source: string
        }
        Update: {
          attempted_at?: string
          batch_id?: string | null
          contact_id?: string
          error?: string | null
          id?: string
          match_confidence?: number | null
          outcome?: string
          place_id?: string | null
          provider?: string
          trigger_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_enrichment_attempts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_enrichment_attempts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      contact_enrichment_findings: {
        Row: {
          action_id: string | null
          applied_at: string | null
          attempt_id: string
          confidence: number
          contact_id: string
          created_at: string
          disposition: string
          field: string
          id: string
          new_value: string
          old_value: string | null
          retrieved_at: string
          source: string
          source_url: string | null
        }
        Insert: {
          action_id?: string | null
          applied_at?: string | null
          attempt_id: string
          confidence: number
          contact_id: string
          created_at?: string
          disposition: string
          field: string
          id?: string
          new_value: string
          old_value?: string | null
          retrieved_at?: string
          source: string
          source_url?: string | null
        }
        Update: {
          action_id?: string | null
          applied_at?: string | null
          attempt_id?: string
          confidence?: number
          contact_id?: string
          created_at?: string
          disposition?: string
          field?: string
          id?: string
          new_value?: string
          old_value?: string | null
          retrieved_at?: string
          source?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_enrichment_findings_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "copilot_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_enrichment_findings_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "contact_enrichment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_enrichment_findings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_enrichment_findings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      contact_sync_dead_letters: {
        Row: {
          attempt_count: number
          created_at: string
          error_payload: Json
          external_id: string | null
          id: string
          integration_connection_id: string
          last_error: string | null
          local_contact_id: string | null
          next_retry_at: string | null
          provider: string
          source_payload: Json
          status: string
          sync_direction: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_payload?: Json
          external_id?: string | null
          id?: string
          integration_connection_id: string
          last_error?: string | null
          local_contact_id?: string | null
          next_retry_at?: string | null
          provider?: string
          source_payload?: Json
          status?: string
          sync_direction: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_payload?: Json
          external_id?: string | null
          id?: string
          integration_connection_id?: string
          last_error?: string | null
          local_contact_id?: string | null
          next_retry_at?: string | null
          provider?: string
          source_payload?: Json
          status?: string
          sync_direction?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_sync_dead_letters_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_sync_dead_letters_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_health_metrics_dashboard"
            referencedColumns: ["integration_connection_id"]
          },
          {
            foreignKeyName: "contact_sync_dead_letters_local_contact_id_fkey"
            columns: ["local_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_sync_dead_letters_local_contact_id_fkey"
            columns: ["local_contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      contact_sync_manual_review_queue: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          integration_connection_id: string
          local_contact_id: string | null
          local_payload: Json
          provider: string
          reason: string
          remote_payload: Json
          resolution_note: string | null
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          integration_connection_id: string
          local_contact_id?: string | null
          local_payload?: Json
          provider?: string
          reason: string
          remote_payload?: Json
          resolution_note?: string | null
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          integration_connection_id?: string
          local_contact_id?: string | null
          local_payload?: Json
          provider?: string
          reason?: string
          remote_payload?: Json
          resolution_note?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_sync_manual_review_queue_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_sync_manual_review_queue_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_health_metrics_dashboard"
            referencedColumns: ["integration_connection_id"]
          },
          {
            foreignKeyName: "contact_sync_manual_review_queue_local_contact_id_fkey"
            columns: ["local_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_sync_manual_review_queue_local_contact_id_fkey"
            columns: ["local_contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      contact_sync_runs: {
        Row: {
          created_at: string
          cursor_advanced: boolean
          duration_ms: number | null
          error_summary: string | null
          failure_count: number
          finished_at: string | null
          id: string
          integration_connection_id: string
          metadata: Json
          provider: string
          pull_records_processed: number
          push_records_processed: number
          run_type: string
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          cursor_advanced?: boolean
          duration_ms?: number | null
          error_summary?: string | null
          failure_count?: number
          finished_at?: string | null
          id?: string
          integration_connection_id: string
          metadata?: Json
          provider?: string
          pull_records_processed?: number
          push_records_processed?: number
          run_type: string
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          cursor_advanced?: boolean
          duration_ms?: number | null
          error_summary?: string | null
          failure_count?: number
          finished_at?: string | null
          id?: string
          integration_connection_id?: string
          metadata?: Json
          provider?: string
          pull_records_processed?: number
          push_records_processed?: number
          run_type?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_sync_runs_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_sync_runs_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_health_metrics_dashboard"
            referencedColumns: ["integration_connection_id"]
          },
        ]
      }
      contact_tag_links: {
        Row: {
          contact_id: string
          id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          id?: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tag_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tag_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "contact_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          category: string
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          ai_intent_score: number | null
          avatar_url: string | null
          business_card_file_name: string | null
          business_card_image_url: string | null
          business_card_uploaded_at: string | null
          business_name: string | null
          city: string | null
          country: string
          country_code: string | null
          created_at: string
          email: string | null
          facebook_page_id: string | null
          google_place_id: string | null
          google_rating: number | null
          google_reviews_count: number | null
          id: string
          industry_id: string | null
          innovations_contact_id: number | null
          innovations_parent_customer_id: number | null
          instagram_handle: string | null
          is_archived: boolean
          is_company: boolean
          is_customer: boolean
          lead_score: number
          lead_source: string
          linked_customer_id: number | null
          name: string
          next_action_at: string | null
          notes: string | null
          parent_id: string | null
          phone: string | null
          pipeline: string | null
          pipeline_stage: string
          salesperson: string | null
          stage: string | null
          stage_entered_at: string | null
          state: string | null
          status: string
          street: string | null
          street2: string | null
          tax_id: string | null
          type: string
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          ai_intent_score?: number | null
          avatar_url?: string | null
          business_card_file_name?: string | null
          business_card_image_url?: string | null
          business_card_uploaded_at?: string | null
          business_name?: string | null
          city?: string | null
          country?: string
          country_code?: string | null
          created_at?: string
          email?: string | null
          facebook_page_id?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          id?: string
          industry_id?: string | null
          innovations_contact_id?: number | null
          innovations_parent_customer_id?: number | null
          instagram_handle?: string | null
          is_archived?: boolean
          is_company?: boolean
          is_customer?: boolean
          lead_score?: number
          lead_source?: string
          linked_customer_id?: number | null
          name: string
          next_action_at?: string | null
          notes?: string | null
          parent_id?: string | null
          phone?: string | null
          pipeline?: string | null
          pipeline_stage?: string
          salesperson?: string | null
          stage?: string | null
          stage_entered_at?: string | null
          state?: string | null
          status?: string
          street?: string | null
          street2?: string | null
          tax_id?: string | null
          type?: string
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          ai_intent_score?: number | null
          avatar_url?: string | null
          business_card_file_name?: string | null
          business_card_image_url?: string | null
          business_card_uploaded_at?: string | null
          business_name?: string | null
          city?: string | null
          country?: string
          country_code?: string | null
          created_at?: string
          email?: string | null
          facebook_page_id?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          id?: string
          industry_id?: string | null
          innovations_contact_id?: number | null
          innovations_parent_customer_id?: number | null
          instagram_handle?: string | null
          is_archived?: boolean
          is_company?: boolean
          is_customer?: boolean
          lead_score?: number
          lead_source?: string
          linked_customer_id?: number | null
          name?: string
          next_action_at?: string | null
          notes?: string | null
          parent_id?: string | null
          phone?: string | null
          pipeline?: string | null
          pipeline_stage?: string
          salesperson?: string | null
          stage?: string | null
          stage_entered_at?: string | null
          state?: string | null
          status?: string
          street?: string | null
          street2?: string | null
          tax_id?: string | null
          type?: string
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_linked_customer_id_fkey"
            columns: ["linked_customer_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "contacts_linked_customer_id_fkey"
            columns: ["linked_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_linked_customer_id_fkey"
            columns: ["linked_customer_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "contacts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contacts_pipeline_fkey"
            columns: ["pipeline"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["key"]
          },
        ]
      }
      copilot_actions: {
        Row: {
          action_type: string
          approved_at: string | null
          approved_by: string | null
          contact_id: string | null
          created_at: string
          customer_id: number | null
          executed_at: string | null
          id: string
          idempotency_key: string
          last_error: string | null
          payload: Json
          result: Json | null
          retry_count: number
          risk_level: number
          run_id: string
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          action_type: string
          approved_at?: string | null
          approved_by?: string | null
          contact_id?: string | null
          created_at?: string
          customer_id?: number | null
          executed_at?: string | null
          id?: string
          idempotency_key: string
          last_error?: string | null
          payload?: Json
          result?: Json | null
          retry_count?: number
          risk_level: number
          run_id: string
          status?: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          approved_by?: string | null
          contact_id?: string | null
          created_at?: string
          customer_id?: number | null
          executed_at?: string | null
          id?: string
          idempotency_key?: string
          last_error?: string | null
          payload?: Json
          result?: Json | null
          retry_count?: number
          risk_level?: number
          run_id?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_actions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_actions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "copilot_actions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "copilot_actions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_actions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "copilot_actions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "copilot_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_audit_events: {
        Row: {
          action_id: string | null
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          run_id: string | null
          transcript: string | null
        }
        Insert: {
          action_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          run_id?: string | null
          transcript?: string | null
        }
        Update: {
          action_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          run_id?: string | null
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "copilot_audit_events_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "copilot_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_audit_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "copilot_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      copilot_messages: {
        Row: {
          attachments: Json
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          attachments?: Json
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          attachments?: Json
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "copilot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_runs: {
        Row: {
          autonomy_level: number
          command_text: string
          conversation_id: string | null
          created_at: string
          id: string
          input_mode: string
          requested_by: string
          source_snapshot_at: string
          source_system: string
          status: string
          summary: Json
          transcript: string | null
          transcript_confirmed: boolean
          updated_at: string
          workflow: string
        }
        Insert: {
          autonomy_level?: number
          command_text: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          input_mode?: string
          requested_by: string
          source_snapshot_at?: string
          source_system?: string
          status?: string
          summary?: Json
          transcript?: string | null
          transcript_confirmed?: boolean
          updated_at?: string
          workflow: string
        }
        Update: {
          autonomy_level?: number
          command_text?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          input_mode?: string
          requested_by?: string
          source_snapshot_at?: string
          source_system?: string
          status?: string
          summary?: Json
          transcript?: string | null
          transcript_confirmed?: boolean
          updated_at?: string
          workflow?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_runs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "copilot_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_runs_workflow_fkey"
            columns: ["workflow"]
            isOneToOne: false
            referencedRelation: "copilot_workflow_settings"
            referencedColumns: ["workflow"]
          },
        ]
      }
      copilot_workflow_settings: {
        Row: {
          created_at: string
          email_subject_pattern: string
          email_template_key: string
          email_template_name: string
          model: string | null
          provider: string
          updated_at: string
          updated_by: string | null
          workflow: string
        }
        Insert: {
          created_at?: string
          email_subject_pattern: string
          email_template_key: string
          email_template_name: string
          model?: string | null
          provider?: string
          updated_at?: string
          updated_by?: string | null
          workflow: string
        }
        Update: {
          created_at?: string
          email_subject_pattern?: string
          email_template_key?: string
          email_template_name?: string
          model?: string | null
          provider?: string
          updated_at?: string
          updated_by?: string | null
          workflow?: string
        }
        Relationships: []
      }
      crm_pipelines: {
        Row: {
          created_at: string
          is_active: boolean
          key: string
          label: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          key: string
          label: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          key?: string
          label?: string
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          id: string
          is_default_billing: boolean
          is_default_shipping: boolean
          label: string
          line1: string
          line2: string
          postal_code: string
          recipient: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_default_billing?: boolean
          is_default_shipping?: boolean
          label?: string
          line1?: string
          line2?: string
          postal_code?: string
          recipient?: string
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_default_billing?: boolean
          is_default_shipping?: boolean
          label?: string
          line1?: string
          line2?: string
          postal_code?: string
          recipient?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_automation_outbox: {
        Row: {
          channel: string
          created_at: string
          id: string
          payload: Json
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          template_key: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          payload?: Json
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
          template_key: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          payload?: Json
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template_key?: string
        }
        Relationships: []
      }
      customer_payment_methods: {
        Row: {
          brand: string
          cardholder_name: string
          created_at: string
          expiry_month: number
          expiry_year: number
          id: string
          is_default: boolean
          is_demo: boolean
          last4: string
          payment_token: string
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string
          cardholder_name?: string
          created_at?: string
          expiry_month?: number
          expiry_year?: number
          id?: string
          is_default?: boolean
          is_demo?: boolean
          last4?: string
          payment_token: string
          provider?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string
          cardholder_name?: string
          created_at?: string
          expiry_month?: number
          expiry_year?: number
          id?: string
          is_default?: boolean
          is_demo?: boolean
          last4?: string
          payment_token?: string
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_portal_feature_overrides: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_pricing_access: {
        Row: {
          created_at: string
          id: string
          pricing_sheet_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pricing_sheet_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pricing_sheet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_pricing_access_pricing_sheet_id_fkey"
            columns: ["pricing_sheet_id"]
            isOneToOne: false
            referencedRelation: "pricing_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          account_number: string | null
          address: string | null
          assigned_pricelist_id: number | null
          contact_id: string | null
          country_code: string | null
          created_at: string | null
          credit_limit: number | null
          default_payment_type: number | null
          eft_institution_name: string | null
          email: string | null
          id: number
          innovations_customer_id: number | null
          name: string
          notes: string | null
          pay_by_card: boolean | null
          pay_by_eft: boolean | null
          phone: string | null
          pipeline_stage: string | null
          portal_orders_use_bill_to_account: boolean
          type: string | null
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          assigned_pricelist_id?: number | null
          contact_id?: string | null
          country_code?: string | null
          created_at?: string | null
          credit_limit?: number | null
          default_payment_type?: number | null
          eft_institution_name?: string | null
          email?: string | null
          id?: number
          innovations_customer_id?: number | null
          name: string
          notes?: string | null
          pay_by_card?: boolean | null
          pay_by_eft?: boolean | null
          phone?: string | null
          pipeline_stage?: string | null
          portal_orders_use_bill_to_account?: boolean
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          address?: string | null
          assigned_pricelist_id?: number | null
          contact_id?: string | null
          country_code?: string | null
          created_at?: string | null
          credit_limit?: number | null
          default_payment_type?: number | null
          eft_institution_name?: string | null
          email?: string | null
          id?: number
          innovations_customer_id?: number | null
          name?: string
          notes?: string | null
          pay_by_card?: boolean | null
          pay_by_eft?: boolean | null
          phone?: string | null
          pipeline_stage?: string | null
          portal_orders_use_bill_to_account?: boolean
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_assigned_pricelist_id_fkey"
            columns: ["assigned_pricelist_id"]
            isOneToOne: false
            referencedRelation: "pricelist_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      dhl_express_secrets: {
        Row: {
          encrypted_password: string
          encrypted_username: string
          settings_id: string
          updated_at: string
        }
        Insert: {
          encrypted_password: string
          encrypted_username: string
          settings_id: string
          updated_at?: string
        }
        Update: {
          encrypted_password?: string
          encrypted_username?: string
          settings_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dhl_express_secrets_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: true
            referencedRelation: "dhl_express_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      dhl_express_settings: {
        Row: {
          account_number: string | null
          created_at: string
          enabled: boolean
          environment: string
          has_credentials: boolean
          id: string
          last_error: string | null
          last_tested_at: string | null
          status: string
          tenant_key: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          created_at?: string
          enabled?: boolean
          environment?: string
          has_credentials?: boolean
          id?: string
          last_error?: string | null
          last_tested_at?: string | null
          status?: string
          tenant_key?: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          created_at?: string
          enabled?: boolean
          environment?: string
          has_credentials?: boolean
          id?: string
          last_error?: string | null
          last_tested_at?: string | null
          status?: string
          tenant_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      docstudio_billing_documents: {
        Row: {
          autosave_content: Json | null
          autosave_rendered_html: string | null
          autosave_totals: Json | null
          billing_number: string | null
          content: Json
          created_at: string
          created_by_copilot: boolean
          customer_account: string | null
          customer_company: string | null
          customer_name: string | null
          deleted_at: string | null
          document_name: string
          document_type: string
          id: string
          latest_autosave_at: string | null
          owner_user_id: string
          paper_size: string
          rendered_html: string
          source_document_id: string | null
          source_document_type: string | null
          status: string
          totals: Json
          updated_at: string
          version: string
        }
        Insert: {
          autosave_content?: Json | null
          autosave_rendered_html?: string | null
          autosave_totals?: Json | null
          billing_number?: string | null
          content?: Json
          created_at?: string
          created_by_copilot?: boolean
          customer_account?: string | null
          customer_company?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          document_name: string
          document_type: string
          id?: string
          latest_autosave_at?: string | null
          owner_user_id: string
          paper_size?: string
          rendered_html?: string
          source_document_id?: string | null
          source_document_type?: string | null
          status?: string
          totals?: Json
          updated_at?: string
          version: string
        }
        Update: {
          autosave_content?: Json | null
          autosave_rendered_html?: string | null
          autosave_totals?: Json | null
          billing_number?: string | null
          content?: Json
          created_at?: string
          created_by_copilot?: boolean
          customer_account?: string | null
          customer_company?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          document_name?: string
          document_type?: string
          id?: string
          latest_autosave_at?: string | null
          owner_user_id?: string
          paper_size?: string
          rendered_html?: string
          source_document_id?: string | null
          source_document_type?: string | null
          status?: string
          totals?: Json
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      docstudio_billing_sequences: {
        Row: {
          document_type: string
          next_value: number
          updated_at: string
        }
        Insert: {
          document_type: string
          next_value?: number
          updated_at?: string
        }
        Update: {
          document_type?: string
          next_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      docstudio_files: {
        Row: {
          autosave_content: Json | null
          autosave_rendered_html: string | null
          content: Json
          created_at: string
          customer_account: string | null
          customer_name: string | null
          deleted_at: string | null
          file_name: string
          file_type: string
          id: string
          latest_autosave_at: string | null
          metadata: Json
          owner_user_id: string
          rendered_html: string
          updated_at: string
          version: string
        }
        Insert: {
          autosave_content?: Json | null
          autosave_rendered_html?: string | null
          content?: Json
          created_at?: string
          customer_account?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          file_name: string
          file_type: string
          id?: string
          latest_autosave_at?: string | null
          metadata?: Json
          owner_user_id: string
          rendered_html?: string
          updated_at?: string
          version: string
        }
        Update: {
          autosave_content?: Json | null
          autosave_rendered_html?: string | null
          content?: Json
          created_at?: string
          customer_account?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          file_name?: string
          file_type?: string
          id?: string
          latest_autosave_at?: string | null
          metadata?: Json
          owner_user_id?: string
          rendered_html?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      edge_function_health: {
        Row: {
          checked_at: string
          consecutive_failures: number
          function_name: string
          is_healthy: boolean
          last_error: string | null
          last_failure_at: string | null
          last_healthy_at: string | null
          last_run_id: string | null
        }
        Insert: {
          checked_at: string
          consecutive_failures?: number
          function_name: string
          is_healthy: boolean
          last_error?: string | null
          last_failure_at?: string | null
          last_healthy_at?: string | null
          last_run_id?: string | null
        }
        Update: {
          checked_at?: string
          consecutive_failures?: number
          function_name?: string
          is_healthy?: boolean
          last_error?: string | null
          last_failure_at?: string | null
          last_healthy_at?: string | null
          last_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edge_function_health_last_run_id_fkey"
            columns: ["last_run_id"]
            isOneToOne: false
            referencedRelation: "edge_function_health_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_health_runs: {
        Row: {
          checks: Json
          created_at: string
          failed_count: number
          function_count: number
          id: string
          is_healthy: boolean
          release_sha: string | null
          source: string
        }
        Insert: {
          checks?: Json
          created_at?: string
          failed_count?: number
          function_count?: number
          id?: string
          is_healthy: boolean
          release_sha?: string | null
          source: string
        }
        Update: {
          checks?: Json
          created_at?: string
          failed_count?: number
          function_count?: number
          id?: string
          is_healthy?: boolean
          release_sha?: string | null
          source?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      finishtypes: {
        Row: {
          abbrev: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      gatekeeper_contract_secrets: {
        Row: {
          contract_id: string
          encrypted_hash_routing: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          encrypted_hash_routing: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          encrypted_hash_routing?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gatekeeper_contract_secrets_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "gatekeeper_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      gatekeeper_contracts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          origin_lab_id: string
          origin_retailer_name: string
          origin_type: string | null
          receiver_lab_id: string
          receiver_retailer_name: string
          receiver_type: string | null
          settings_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          origin_lab_id: string
          origin_retailer_name: string
          origin_type?: string | null
          receiver_lab_id: string
          receiver_retailer_name: string
          receiver_type?: string | null
          settings_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          origin_lab_id?: string
          origin_retailer_name?: string
          origin_type?: string | null
          receiver_lab_id?: string
          receiver_retailer_name?: string
          receiver_type?: string | null
          settings_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gatekeeper_contracts_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: false
            referencedRelation: "gatekeeper_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      gatekeeper_dispatch_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          duration_ms: number | null
          endpoint: string | null
          error_message: string | null
          http_method: string | null
          http_status: number | null
          id: string
          order_kind: string | null
          phase: string
          request_snapshot: Json
          response_snapshot: Json
          submission_id: string | null
          success: boolean
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint?: string | null
          error_message?: string | null
          http_method?: string | null
          http_status?: number | null
          id?: string
          order_kind?: string | null
          phase?: string
          request_snapshot?: Json
          response_snapshot?: Json
          submission_id?: string | null
          success?: boolean
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint?: string | null
          error_message?: string | null
          http_method?: string | null
          http_status?: number | null
          id?: string
          order_kind?: string | null
          phase?: string
          request_snapshot?: Json
          response_snapshot?: Json
          submission_id?: string | null
          success?: boolean
        }
        Relationships: []
      }
      gatekeeper_secrets: {
        Row: {
          auth_token_expires_at: string | null
          encrypted_auth_token: string | null
          encrypted_jwt_key: string
          encrypted_jwt_secret: string
          settings_id: string
          updated_at: string
        }
        Insert: {
          auth_token_expires_at?: string | null
          encrypted_auth_token?: string | null
          encrypted_jwt_key: string
          encrypted_jwt_secret: string
          settings_id: string
          updated_at?: string
        }
        Update: {
          auth_token_expires_at?: string | null
          encrypted_auth_token?: string | null
          encrypted_jwt_key?: string
          encrypted_jwt_secret?: string
          settings_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gatekeeper_secrets_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: true
            referencedRelation: "gatekeeper_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      gatekeeper_settings: {
        Row: {
          created_at: string
          enabled: boolean
          environment: string
          has_credentials: boolean
          id: string
          lab_name: string
          last_auth_refresh_at: string | null
          last_connected_at: string | null
          last_error: string | null
          last_receipt_at: string | null
          last_status_pull_at: string | null
          origin_lab_id: string
          status: string
          status_pull_token: string | null
          tenant_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          environment?: string
          has_credentials?: boolean
          id?: string
          lab_name: string
          last_auth_refresh_at?: string | null
          last_connected_at?: string | null
          last_error?: string | null
          last_receipt_at?: string | null
          last_status_pull_at?: string | null
          origin_lab_id: string
          status?: string
          status_pull_token?: string | null
          tenant_key?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          environment?: string
          has_credentials?: boolean
          id?: string
          lab_name?: string
          last_auth_refresh_at?: string | null
          last_connected_at?: string | null
          last_error?: string | null
          last_receipt_at?: string | null
          last_status_pull_at?: string | null
          origin_lab_id?: string
          status?: string
          status_pull_token?: string | null
          tenant_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      help_article_contexts: {
        Row: {
          article_id: string
          context_slug: string
          id: string
        }
        Insert: {
          article_id: string
          context_slug: string
          id?: string
        }
        Update: {
          article_id?: string
          context_slug?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_article_contexts_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          author_id: string | null
          body_html: string | null
          body_json: Json | null
          category: string
          content: string
          content_type: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_public: boolean | null
          last_edited_by: string | null
          page_slug: string
          parent_id: string | null
          published_at: string | null
          section_id: string | null
          slug: string | null
          sort_order: number
          status: string
          summary: string
          title: string
          updated_at: string
          version_number: number
          visibility: string
        }
        Insert: {
          author_id?: string | null
          body_html?: string | null
          body_json?: Json | null
          category?: string
          content?: string
          content_type?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_public?: boolean | null
          last_edited_by?: string | null
          page_slug: string
          parent_id?: string | null
          published_at?: string | null
          section_id?: string | null
          slug?: string | null
          sort_order?: number
          status?: string
          summary?: string
          title: string
          updated_at?: string
          version_number?: number
          visibility?: string
        }
        Update: {
          author_id?: string | null
          body_html?: string | null
          body_json?: Json | null
          category?: string
          content?: string
          content_type?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_public?: boolean | null
          last_edited_by?: string | null
          page_slug?: string
          parent_id?: string | null
          published_at?: string | null
          section_id?: string | null
          slug?: string | null
          sort_order?: number
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          version_number?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_articles_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_feedback: {
        Row: {
          article_id: string
          created_at: string
          feedback_type: string
          id: string
          page_slug: string | null
          suggestion_text: string | null
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          feedback_type: string
          id?: string
          page_slug?: string | null
          suggestion_text?: string | null
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          feedback_type?: string
          id?: string
          page_slug?: string | null
          suggestion_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_followup_queue: {
        Row: {
          cancelled_at: string | null
          created_at: string
          followup_type: string
          id: string
          scheduled_for: string
          sent_at: string | null
          ticket_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          followup_type: string
          id?: string
          scheduled_for: string
          sent_at?: string | null
          ticket_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          followup_type?: string
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_followup_queue_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_inbound_email_log: {
        Row: {
          created_at: string
          from_address: string | null
          id: string
          mailbox: string
          message_id: string
          subject: string | null
          ticket_id: string | null
        }
        Insert: {
          created_at?: string
          from_address?: string | null
          id?: string
          mailbox?: string
          message_id: string
          subject?: string | null
          ticket_id?: string | null
        }
        Update: {
          created_at?: string
          from_address?: string | null
          id?: string
          mailbox?: string
          message_id?: string
          subject?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_inbound_email_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_priorities: {
        Row: {
          color: string
          created_at: string | null
          id: string
          is_active: boolean
          label: string
          level: number
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          label: string
          level: number
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          label?: string
          level?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      helpdesk_sla_policies: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          priority_filter: number | null
          target_hours: number
          target_stage_id: string | null
          team_id: string | null
          tenant_key: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          priority_filter?: number | null
          target_hours?: number
          target_stage_id?: string | null
          team_id?: string | null
          tenant_key?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          priority_filter?: number | null
          target_hours?: number
          target_stage_id?: string | null
          team_id?: string | null
          tenant_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_sla_policies_target_stage_id_fkey"
            columns: ["target_stage_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_ticket_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_sla_policies_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_team_members: {
        Row: {
          created_at: string
          id: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_teams: {
        Row: {
          assignment_mode: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_key: string
          updated_at: string
          visibility: string
        }
        Insert: {
          assignment_mode?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_key?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          assignment_mode?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_key?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      helpdesk_ticket_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          ticket_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          ticket_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_ticket_messages: {
        Row: {
          body: string
          client_message_id: string
          created_at: string
          direction: string
          id: string
          is_automated: boolean
          sender_email: string | null
          sender_name: string | null
          sender_user_id: string | null
          sent_at: string
          ticket_id: string
        }
        Insert: {
          body: string
          client_message_id: string
          created_at?: string
          direction: string
          id?: string
          is_automated?: boolean
          sender_email?: string | null
          sender_name?: string | null
          sender_user_id?: string | null
          sent_at?: string
          ticket_id: string
        }
        Update: {
          body?: string
          client_message_id?: string
          created_at?: string
          direction?: string
          id?: string
          is_automated?: boolean
          sender_email?: string | null
          sender_name?: string | null
          sender_user_id?: string | null
          sent_at?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_ticket_review_queue_items: {
        Row: {
          created_at: string
          id: string
          queue_name: string
          resolved_at: string | null
          resolved_by: string | null
          source_reference: string | null
          source_signal: string | null
          status: string
          tenant_key: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          queue_name: string
          resolved_at?: string | null
          resolved_by?: string | null
          source_reference?: string | null
          source_signal?: string | null
          status?: string
          tenant_key?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          queue_name?: string
          resolved_at?: string | null
          resolved_by?: string | null
          source_reference?: string | null
          source_signal?: string | null
          status?: string
          tenant_key?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_ticket_review_queue_items_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_ticket_sla_status: {
        Row: {
          created_at: string
          deadline_at: string | null
          id: string
          reached_at: string | null
          sla_policy_id: string
          status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline_at?: string | null
          id?: string
          reached_at?: string | null
          sla_policy_id: string
          status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline_at?: string | null
          id?: string
          reached_at?: string | null
          sla_policy_id?: string
          status?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_ticket_sla_status_sla_policy_id_fkey"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_sla_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_ticket_sla_status_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_ticket_stages: {
        Row: {
          created_at: string
          id: string
          is_closed: boolean
          is_folded: boolean
          name: string
          sequence: number
          tenant_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_closed?: boolean
          is_folded?: boolean
          name: string
          sequence?: number
          tenant_key?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_closed?: boolean
          is_folded?: boolean
          name?: string
          sequence?: number
          tenant_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      helpdesk_ticket_tag_rel: {
        Row: {
          id: string
          tag_id: string
          ticket_id: string
        }
        Insert: {
          id?: string
          tag_id: string
          ticket_id: string
        }
        Update: {
          id?: string
          tag_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_ticket_tag_rel_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_ticket_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_ticket_tag_rel_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_ticket_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          tenant_key: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          tenant_key?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          tenant_key?: string
        }
        Relationships: []
      }
      helpdesk_ticket_types: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          tenant_key: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          tenant_key?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      helpdesk_ticket_watchers: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          is_permanent: boolean
          staff_email: string | null
          staff_name: string | null
          ticket_id: string
          user_id: string | null
          watcher_type: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          is_permanent?: boolean
          staff_email?: string | null
          staff_name?: string | null
          ticket_id: string
          user_id?: string | null
          watcher_type: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          is_permanent?: boolean
          staff_email?: string | null
          staff_name?: string | null
          ticket_id?: string
          user_id?: string | null
          watcher_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_ticket_watchers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_tickets: {
        Row: {
          assigned_at: string | null
          closed_at: string | null
          contact_token: string
          created_at: string
          customer_email: string | null
          deadline: string | null
          description: string
          first_response_at: string | null
          id: string
          opened_at: string | null
          owner_user_id: string | null
          partner_contact_id: string | null
          priority: number
          sla_paused_at: string | null
          sla_paused_duration_seconds: number
          source_authentication_required: boolean | null
          source_channel: string
          source_metadata: Json | null
          source_role_mode: string | null
          source_route_context: string | null
          source_session_id: string | null
          stage_id: string | null
          team_id: string | null
          tenant_key: string
          ticket_number: string
          ticket_type_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          closed_at?: string | null
          contact_token?: string
          created_at?: string
          customer_email?: string | null
          deadline?: string | null
          description?: string
          first_response_at?: string | null
          id?: string
          opened_at?: string | null
          owner_user_id?: string | null
          partner_contact_id?: string | null
          priority?: number
          sla_paused_at?: string | null
          sla_paused_duration_seconds?: number
          source_authentication_required?: boolean | null
          source_channel?: string
          source_metadata?: Json | null
          source_role_mode?: string | null
          source_route_context?: string | null
          source_session_id?: string | null
          stage_id?: string | null
          team_id?: string | null
          tenant_key?: string
          ticket_number: string
          ticket_type_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          closed_at?: string | null
          contact_token?: string
          created_at?: string
          customer_email?: string | null
          deadline?: string | null
          description?: string
          first_response_at?: string | null
          id?: string
          opened_at?: string | null
          owner_user_id?: string | null
          partner_contact_id?: string | null
          priority?: number
          sla_paused_at?: string | null
          sla_paused_duration_seconds?: number
          source_authentication_required?: boolean | null
          source_channel?: string
          source_metadata?: Json | null
          source_role_mode?: string | null
          source_route_context?: string | null
          source_session_id?: string | null
          stage_id?: string | null
          team_id?: string | null
          tenant_key?: string
          ticket_number?: string
          ticket_type_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_tickets_partner_contact_id_fkey"
            columns: ["partner_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_tickets_partner_contact_id_fkey"
            columns: ["partner_contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "helpdesk_tickets_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_ticket_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_tickets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string
          error_count: number
          file_name: string
          id: string
          status: string
          success_count: number
          total_rows: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_count?: number
          file_name: string
          id?: string
          status?: string
          success_count?: number
          total_rows?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_count?: number
          file_name?: string
          id?: string
          status?: string
          success_count?: number
          total_rows?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      import_ref_mappings: {
        Row: {
          created_at: string
          csv_value: string
          id: string
          mapped_id: string
          ref_table: string
        }
        Insert: {
          created_at?: string
          csv_value: string
          id?: string
          mapped_id: string
          ref_table: string
        }
        Update: {
          created_at?: string
          csv_value?: string
          id?: string
          mapped_id?: string
          ref_table?: string
        }
        Relationships: []
      }
      industries: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      innovations_lens_aliases: {
        Row: {
          alias: string
          category: string
          color_code: string
          color_description: string
          is_active: boolean
          material_code: string
          material_description: string
          mf_type: string
          pricing_key: string
          style_code: string
          style_description: string
          suppliers: string[]
          synced_at: string
        }
        Insert: {
          alias: string
          category?: string
          color_code: string
          color_description: string
          is_active?: boolean
          material_code: string
          material_description: string
          mf_type?: string
          pricing_key?: string
          style_code: string
          style_description: string
          suppliers?: string[]
          synced_at?: string
        }
        Update: {
          alias?: string
          category?: string
          color_code?: string
          color_description?: string
          is_active?: boolean
          material_code?: string
          material_description?: string
          mf_type?: string
          pricing_key?: string
          style_code?: string
          style_description?: string
          suppliers?: string[]
          synced_at?: string
        }
        Relationships: []
      }
      innovations_store_lens_power_rows: {
        Row: {
          add: number | null
          base: number | null
          cylinder: number | null
          diameter: number | null
          id: string
          innovations_lens_id: string
          innovations_power_row_id: string
          left_opc: string | null
          right_opc: string | null
          sphere: number | null
          stock_on_hand: number
          synced_at: string
        }
        Insert: {
          add?: number | null
          base?: number | null
          cylinder?: number | null
          diameter?: number | null
          id?: string
          innovations_lens_id: string
          innovations_power_row_id: string
          left_opc?: string | null
          right_opc?: string | null
          sphere?: number | null
          stock_on_hand?: number
          synced_at?: string
        }
        Update: {
          add?: number | null
          base?: number | null
          cylinder?: number | null
          diameter?: number | null
          id?: string
          innovations_lens_id?: string
          innovations_power_row_id?: string
          left_opc?: string | null
          right_opc?: string | null
          sphere?: number | null
          stock_on_hand?: number
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "innovations_store_lens_power_rows_innovations_lens_id_fkey"
            columns: ["innovations_lens_id"]
            isOneToOne: false
            referencedRelation: "innovations_store_lenses"
            referencedColumns: ["innovations_lens_id"]
          },
        ]
      }
      innovations_store_lenses: {
        Row: {
          finish_type: string | null
          id: string
          innovations_lens_id: string
          is_enabled: boolean
          lens_state: string
          lens_type: string | null
          manufacturer: string | null
          material: string | null
          material_group: string | null
          mf_type: string | null
          name: string
          option_name: string | null
          synced_at: string
        }
        Insert: {
          finish_type?: string | null
          id?: string
          innovations_lens_id: string
          is_enabled?: boolean
          lens_state: string
          lens_type?: string | null
          manufacturer?: string | null
          material?: string | null
          material_group?: string | null
          mf_type?: string | null
          name: string
          option_name?: string | null
          synced_at?: string
        }
        Update: {
          finish_type?: string | null
          id?: string
          innovations_lens_id?: string
          is_enabled?: boolean
          lens_state?: string
          lens_type?: string | null
          manufacturer?: string | null
          material?: string | null
          material_group?: string | null
          mf_type?: string | null
          name?: string
          option_name?: string | null
          synced_at?: string
        }
        Relationships: []
      }
      innovations_sync_dead_letters: {
        Row: {
          api_key_id: string | null
          created_at: string
          entity: string
          external_id: string | null
          id: string
          last_error: string | null
          source_payload: Json
          status: string
          updated_at: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          entity: string
          external_id?: string | null
          id?: string
          last_error?: string | null
          source_payload?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          entity?: string
          external_id?: string | null
          id?: string
          last_error?: string | null
          source_payload?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      innovations_sync_requests: {
        Row: {
          claimed_at: string | null
          created_at: string
          entities: string[]
          finished_at: string | null
          id: string
          requested_at: string
          requested_by: string | null
          result: Json | null
          status: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          entities?: string[]
          finished_at?: string | null
          id?: string
          requested_at?: string
          requested_by?: string | null
          result?: Json | null
          status?: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          entities?: string[]
          finished_at?: string | null
          id?: string
          requested_at?: string
          requested_by?: string | null
          result?: Json | null
          status?: string
        }
        Relationships: []
      }
      innovations_sync_runs: {
        Row: {
          api_key_id: string | null
          created_at: string
          dry_run: boolean
          entity: string
          error_summary: string | null
          failed: number
          finished_at: string
          id: string
          received: number
          started_at: string
          status: string
          upserted: number
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          dry_run?: boolean
          entity: string
          error_summary?: string | null
          failed?: number
          finished_at?: string
          id?: string
          received?: number
          started_at?: string
          status?: string
          upserted?: number
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          dry_run?: boolean
          entity?: string
          error_summary?: string | null
          failed?: number
          finished_at?: string
          id?: string
          received?: number
          started_at?: string
          status?: string
          upserted?: number
        }
        Relationships: []
      }
      integration_audit_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_payload: Json
          event_type: string
          id: string
          integration_connection_id: string
          provider: string
          tenant_key: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_payload?: Json
          event_type: string
          id?: string
          integration_connection_id: string
          provider: string
          tenant_key: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_payload?: Json
          event_type?: string
          id?: string
          integration_connection_id?: string
          provider?: string
          tenant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_audit_events_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_audit_events_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_health_metrics_dashboard"
            referencedColumns: ["integration_connection_id"]
          },
        ]
      }
      integration_conflict_queue: {
        Row: {
          conflict_payload: Json
          created_at: string
          id: string
          integration_connection_id: string
          local_identifier: string | null
          overridden_at: string | null
          overridden_by: string | null
          provider: string
          resolution_status: string
          resolution_winner: string | null
          source_identifier: string
          source_model: string
          tenant_key: string
          updated_at: string
        }
        Insert: {
          conflict_payload?: Json
          created_at?: string
          id?: string
          integration_connection_id: string
          local_identifier?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          provider: string
          resolution_status?: string
          resolution_winner?: string | null
          source_identifier: string
          source_model: string
          tenant_key: string
          updated_at?: string
        }
        Update: {
          conflict_payload?: Json
          created_at?: string
          id?: string
          integration_connection_id?: string
          local_identifier?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          provider?: string
          resolution_status?: string
          resolution_winner?: string | null
          source_identifier?: string
          source_model?: string
          tenant_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_conflict_queue_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_conflict_queue_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_health_metrics_dashboard"
            referencedColumns: ["integration_connection_id"]
          },
        ]
      }
      integration_connection_secrets: {
        Row: {
          created_at: string
          encrypted_secret: string
          id: string
          integration_connection_id: string
          key_version: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_secret: string
          id?: string
          integration_connection_id: string
          key_version?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_secret?: string
          id?: string
          integration_connection_id?: string
          key_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connection_secrets_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: true
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connection_secrets_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: true
            referencedRelation: "integration_health_metrics_dashboard"
            referencedColumns: ["integration_connection_id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          auth_mode: string
          base_url: string
          conflict_policy: string
          created_at: string
          database_name: string
          dry_run_enabled: boolean
          environment: string
          id: string
          incremental_enabled: boolean
          last_health_check_at: string | null
          last_sync_cursor_at: string | null
          last_sync_export_count: number
          last_sync_failure_count: number
          last_sync_finished_at: string | null
          last_sync_import_count: number
          last_sync_started_at: string | null
          provider: string
          pull_cursor: string | null
          push_cursor: string | null
          retry_state: string | null
          status: string
          sync_batch_size: number
          sync_direction: string
          sync_interval_minutes: number
          tenant_key: string
          updated_at: string
          user_identifier: string | null
        }
        Insert: {
          auth_mode?: string
          base_url?: string
          conflict_policy?: string
          created_at?: string
          database_name?: string
          dry_run_enabled?: boolean
          environment?: string
          id?: string
          incremental_enabled?: boolean
          last_health_check_at?: string | null
          last_sync_cursor_at?: string | null
          last_sync_export_count?: number
          last_sync_failure_count?: number
          last_sync_finished_at?: string | null
          last_sync_import_count?: number
          last_sync_started_at?: string | null
          provider: string
          pull_cursor?: string | null
          push_cursor?: string | null
          retry_state?: string | null
          status?: string
          sync_batch_size?: number
          sync_direction?: string
          sync_interval_minutes?: number
          tenant_key?: string
          updated_at?: string
          user_identifier?: string | null
        }
        Update: {
          auth_mode?: string
          base_url?: string
          conflict_policy?: string
          created_at?: string
          database_name?: string
          dry_run_enabled?: boolean
          environment?: string
          id?: string
          incremental_enabled?: boolean
          last_health_check_at?: string | null
          last_sync_cursor_at?: string | null
          last_sync_export_count?: number
          last_sync_failure_count?: number
          last_sync_finished_at?: string | null
          last_sync_import_count?: number
          last_sync_started_at?: string | null
          provider?: string
          pull_cursor?: string | null
          push_cursor?: string | null
          retry_state?: string | null
          status?: string
          sync_batch_size?: number
          sync_direction?: string
          sync_interval_minutes?: number
          tenant_key?: string
          updated_at?: string
          user_identifier?: string | null
        }
        Relationships: []
      }
      integration_structured_logs: {
        Row: {
          created_at: string
          event_name: string
          id: string
          integration_connection_id: string | null
          log_level: string
          payload: Json
          provider: string
          redacted_payload: Json
          tenant_key: string
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          integration_connection_id?: string | null
          log_level: string
          payload?: Json
          provider: string
          redacted_payload?: Json
          tenant_key: string
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          integration_connection_id?: string | null
          log_level?: string
          payload?: Json
          provider?: string
          redacted_payload?: Json
          tenant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_structured_logs_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_structured_logs_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_health_metrics_dashboard"
            referencedColumns: ["integration_connection_id"]
          },
        ]
      }
      integration_sync_errors: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string
          error_payload: Json
          first_seen_at: string
          id: string
          integration_connection_id: string
          last_seen_at: string
          local_identifier: string | null
          provider: string
          redacted_payload: Json
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number
          source_identifier: string
          source_model: string
          status: string
          sync_job_id: string | null
          tenant_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message: string
          error_payload?: Json
          first_seen_at?: string
          id?: string
          integration_connection_id: string
          last_seen_at?: string
          local_identifier?: string | null
          provider: string
          redacted_payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number
          source_identifier: string
          source_model?: string
          status?: string
          sync_job_id?: string | null
          tenant_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string
          error_payload?: Json
          first_seen_at?: string
          id?: string
          integration_connection_id?: string
          last_seen_at?: string
          local_identifier?: string | null
          provider?: string
          redacted_payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number
          source_identifier?: string
          source_model?: string
          status?: string
          sync_job_id?: string | null
          tenant_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_errors_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_errors_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_health_metrics_dashboard"
            referencedColumns: ["integration_connection_id"]
          },
          {
            foreignKeyName: "integration_sync_errors_local_identifier_fkey"
            columns: ["local_identifier"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_errors_local_identifier_fkey"
            columns: ["local_identifier"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "integration_sync_errors_sync_job_id_fkey"
            columns: ["sync_job_id"]
            isOneToOne: false
            referencedRelation: "integration_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          integration_connection_id: string
          provider: string
          requested_at: string
          requested_by: string
          started_at: string | null
          status: string
          sync_kind: string
          tenant_key: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          integration_connection_id: string
          provider: string
          requested_at?: string
          requested_by: string
          started_at?: string | null
          status?: string
          sync_kind: string
          tenant_key: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          integration_connection_id?: string
          provider?: string
          requested_at?: string
          requested_by?: string
          started_at?: string | null
          status?: string
          sync_kind?: string
          tenant_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_jobs_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_jobs_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_health_metrics_dashboard"
            referencedColumns: ["integration_connection_id"]
          },
        ]
      }
      integration_sync_run_metrics: {
        Row: {
          created_at: string
          error_rate: number | null
          id: string
          integration_connection_id: string
          provider: string
          records_failed: number
          records_processed: number
          run_completed_at: string | null
          run_started_at: string
          source_cursor_at: string | null
          source_lag_seconds: number | null
          success: boolean
          sync_job_id: string | null
          tenant_key: string
        }
        Insert: {
          created_at?: string
          error_rate?: number | null
          id?: string
          integration_connection_id: string
          provider: string
          records_failed?: number
          records_processed?: number
          run_completed_at?: string | null
          run_started_at: string
          source_cursor_at?: string | null
          source_lag_seconds?: number | null
          success?: boolean
          sync_job_id?: string | null
          tenant_key: string
        }
        Update: {
          created_at?: string
          error_rate?: number | null
          id?: string
          integration_connection_id?: string
          provider?: string
          records_failed?: number
          records_processed?: number
          run_completed_at?: string | null
          run_started_at?: string
          source_cursor_at?: string | null
          source_lag_seconds?: number | null
          success?: boolean
          sync_job_id?: string | null
          tenant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_run_metrics_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_run_metrics_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_health_metrics_dashboard"
            referencedColumns: ["integration_connection_id"]
          },
          {
            foreignKeyName: "integration_sync_run_metrics_sync_job_id_fkey"
            columns: ["sync_job_id"]
            isOneToOne: false
            referencedRelation: "integration_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_audits: {
        Row: {
          contact_id: string
          generated_at: string | null
          id: string
          pdf_url: string | null
          raw_data: Json | null
          summary: string | null
        }
        Insert: {
          contact_id: string
          generated_at?: string | null
          id?: string
          pdf_url?: string | null
          raw_data?: Json | null
          summary?: string | null
        }
        Update: {
          contact_id?: string
          generated_at?: string | null
          id?: string
          pdf_url?: string | null
          raw_data?: Json | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_audits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_audits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      lead_provider_credentials: {
        Row: {
          created_at: string
          credential: string
          id: string
          provider: string
          tenant_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential?: string
          id?: string
          provider: string
          tenant_key?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential?: string
          id?: string
          provider?: string
          tenant_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      legacy_rates: {
        Row: {
          created_at: string
          currency: string | null
          description: string
          effective_date: string | null
          id: string
          is_active: boolean
          rate_code: string
          updated_at: string
          value: number
          value_type: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string
          effective_date?: string | null
          id?: string
          is_active?: boolean
          rate_code: string
          updated_at?: string
          value?: number
          value_type?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string
          effective_date?: string | null
          id?: string
          is_active?: boolean
          rate_code?: string
          updated_at?: string
          value?: number
          value_type?: string
        }
        Relationships: []
      }
      lens_alias_map: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          innovations_alias: string
          is_primary: boolean
          lens_id: string
          lens_option_id: string | null
          match_confidence: number | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          innovations_alias: string
          is_primary?: boolean
          lens_id: string
          lens_option_id?: string | null
          match_confidence?: number | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          innovations_alias?: string
          is_primary?: boolean
          lens_id?: string
          lens_option_id?: string | null
          match_confidence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lens_alias_map_innovations_alias_fkey"
            columns: ["innovations_alias"]
            isOneToOne: false
            referencedRelation: "innovations_lens_aliases"
            referencedColumns: ["alias"]
          },
          {
            foreignKeyName: "lens_alias_map_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_alias_map_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_alias_map_lens_option_id_fkey"
            columns: ["lens_option_id"]
            isOneToOne: false
            referencedRelation: "lens_options"
            referencedColumns: ["id"]
          },
        ]
      }
      lens_lens_options: {
        Row: {
          extra_cost: number
          id: string
          lens_id: string
          lens_option_id: string
        }
        Insert: {
          extra_cost?: number
          id?: string
          lens_id: string
          lens_option_id: string
        }
        Update: {
          extra_cost?: number
          id?: string
          lens_id?: string
          lens_option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lens_lens_options_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_lens_options_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_lens_options_lens_option_id_fkey"
            columns: ["lens_option_id"]
            isOneToOne: false
            referencedRelation: "lens_options"
            referencedColumns: ["id"]
          },
        ]
      }
      lens_options: {
        Row: {
          abbrev: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      lens_recommendation_rule_sets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          published_at: string | null
          published_by: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      lens_recommendation_rules: {
        Row: {
          coating: string | null
          conditions: Json
          created_at: string
          id: string
          priority: number
          product_id: string
          reasons: string[]
          rule_set_id: string
          tier: string
          turnaround_max_days: number | null
          turnaround_min_days: number | null
          updated_at: string
          warnings: string[]
        }
        Insert: {
          coating?: string | null
          conditions?: Json
          created_at?: string
          id?: string
          priority?: number
          product_id: string
          reasons?: string[]
          rule_set_id: string
          tier: string
          turnaround_max_days?: number | null
          turnaround_min_days?: number | null
          updated_at?: string
          warnings?: string[]
        }
        Update: {
          coating?: string | null
          conditions?: Json
          created_at?: string
          id?: string
          priority?: number
          product_id?: string
          reasons?: string[]
          rule_set_id?: string
          tier?: string
          turnaround_max_days?: number | null
          turnaround_min_days?: number | null
          updated_at?: string
          warnings?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "lens_recommendation_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_recommendation_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "lenses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_recommendation_rules_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "lens_recommendation_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      lenses: {
        Row: {
          add_max: number | null
          add_min: number | null
          base_price: number
          brand_id: string
          created_at: string
          cyl_max: number
          cyl_min: number
          excluded_at: string | null
          excluded_by: string | null
          excluded_from_anchor: boolean
          excluded_reason: string | null
          finishtype_id: string | null
          full_lab: boolean
          id: string
          index_value: number
          is_active: boolean
          lenstype_id: string
          material_id: string
          mftype_id: string
          name: string
          notes: string | null
          pricing_category: string | null
          pricing_index: string | null
          sell_price: number
          show_in_pricelist: boolean
          show_in_ws_pricelist: boolean
          show_on_website: boolean
          sph_max: number
          sph_min: number
          supplier_id: string
          updated_at: string
        }
        Insert: {
          add_max?: number | null
          add_min?: number | null
          base_price: number
          brand_id: string
          created_at?: string
          cyl_max: number
          cyl_min: number
          excluded_at?: string | null
          excluded_by?: string | null
          excluded_from_anchor?: boolean
          excluded_reason?: string | null
          finishtype_id?: string | null
          full_lab?: boolean
          id?: string
          index_value: number
          is_active?: boolean
          lenstype_id: string
          material_id: string
          mftype_id: string
          name: string
          notes?: string | null
          pricing_category?: string | null
          pricing_index?: string | null
          sell_price: number
          show_in_pricelist?: boolean
          show_in_ws_pricelist?: boolean
          show_on_website?: boolean
          sph_max: number
          sph_min: number
          supplier_id: string
          updated_at?: string
        }
        Update: {
          add_max?: number | null
          add_min?: number | null
          base_price?: number
          brand_id?: string
          created_at?: string
          cyl_max?: number
          cyl_min?: number
          excluded_at?: string | null
          excluded_by?: string | null
          excluded_from_anchor?: boolean
          excluded_reason?: string | null
          finishtype_id?: string | null
          full_lab?: boolean
          id?: string
          index_value?: number
          is_active?: boolean
          lenstype_id?: string
          material_id?: string
          mftype_id?: string
          name?: string
          notes?: string | null
          pricing_category?: string | null
          pricing_index?: string | null
          sell_price?: number
          show_in_pricelist?: boolean
          show_in_ws_pricelist?: boolean
          show_on_website?: boolean
          sph_max?: number
          sph_min?: number
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lenses_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_finishtype_id_fkey"
            columns: ["finishtype_id"]
            isOneToOne: false
            referencedRelation: "finishtypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_lenstype_id_fkey"
            columns: ["lenstype_id"]
            isOneToOne: false
            referencedRelation: "lenstypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_mftype_id_fkey"
            columns: ["mftype_id"]
            isOneToOne: false
            referencedRelation: "mftypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      lenstypes: {
        Row: {
          abbrev: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_data_gateway_agents: {
        Row: {
          agent_name: string
          agent_version: string | null
          api_key_id: string
          capabilities: string[]
          connected_at: string
          last_error: string | null
          last_seen_at: string
        }
        Insert: {
          agent_name?: string
          agent_version?: string | null
          api_key_id: string
          capabilities?: string[]
          connected_at?: string
          last_error?: string | null
          last_seen_at?: string
        }
        Update: {
          agent_name?: string
          agent_version?: string | null
          api_key_id?: string
          capabilities?: string[]
          connected_at?: string
          last_error?: string | null
          last_seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_data_gateway_agents_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: true
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      live_data_gateway_request_log: {
        Row: {
          action: string
          created_at: string
          id: number
          latency_ms: number
          operation: string | null
          status_code: number
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          latency_ms: number
          operation?: string | null
          status_code: number
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          latency_ms?: number
          operation?: string | null
          status_code?: number
        }
        Relationships: []
      }
      live_data_gateway_requests: {
        Row: {
          arguments: Json
          claimed_at: string | null
          claimed_by: string | null
          completed_at: string | null
          consumed_at: string | null
          error_code: string | null
          error_message: string | null
          expires_at: string
          id: string
          operation: string
          purge_after: string
          requested_at: string
          requested_by: string
          response_payload: Json | null
          source: string
          status: string
          target: Json
          website_customer_id: number
        }
        Insert: {
          arguments?: Json
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          consumed_at?: string | null
          error_code?: string | null
          error_message?: string | null
          expires_at?: string
          id?: string
          operation: string
          purge_after?: string
          requested_at?: string
          requested_by: string
          response_payload?: Json | null
          source: string
          status?: string
          target?: Json
          website_customer_id: number
        }
        Update: {
          arguments?: Json
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          consumed_at?: string | null
          error_code?: string | null
          error_message?: string | null
          expires_at?: string
          id?: string
          operation?: string
          purge_after?: string
          requested_at?: string
          requested_by?: string
          response_payload?: Json | null
          source?: string
          status?: string
          target?: Json
          website_customer_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_data_gateway_requests_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_data_gateway_requests_website_customer_id_fkey"
            columns: ["website_customer_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "live_data_gateway_requests_website_customer_id_fkey"
            columns: ["website_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_data_gateway_requests_website_customer_id_fkey"
            columns: ["website_customer_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      material_upgrades: {
        Row: {
          delta_bbd: number | null
          full_price_bbd: number | null
          id: number
          material: string
          notes: string | null
          updated_at: string | null
          upgrade_name: string
        }
        Insert: {
          delta_bbd?: number | null
          full_price_bbd?: number | null
          id?: number
          material: string
          notes?: string | null
          updated_at?: string | null
          upgrade_name: string
        }
        Update: {
          delta_bbd?: number | null
          full_price_bbd?: number | null
          id?: number
          material?: string
          notes?: string | null
          updated_at?: string | null
          upgrade_name?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          abbrev: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      matrix_allocations: {
        Row: {
          allocated_price_bbd: number | null
          category: string
          id: number
          is_active: boolean | null
          lens_id: string | null
          material_index: string
          pricelist_version_id: number | null
          treatment_type: string
          updated_at: string | null
        }
        Insert: {
          allocated_price_bbd?: number | null
          category: string
          id?: number
          is_active?: boolean | null
          lens_id?: string | null
          material_index: string
          pricelist_version_id?: number | null
          treatment_type: string
          updated_at?: string | null
        }
        Update: {
          allocated_price_bbd?: number | null
          category?: string
          id?: number
          is_active?: boolean | null
          lens_id?: string | null
          material_index?: string
          pricelist_version_id?: number | null
          treatment_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matrix_allocations_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matrix_allocations_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matrix_allocations_pricelist_version_id_fkey"
            columns: ["pricelist_version_id"]
            isOneToOne: false
            referencedRelation: "pricelist_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      mftypes: {
        Row: {
          abbrev: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          contact_id: string
          content: string
          created_at: string | null
          id: string
          is_ai_generated: boolean | null
        }
        Insert: {
          contact_id: string
          content: string
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
        }
        Update: {
          contact_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      nps_responses: {
        Row: {
          comment: string | null
          contact_email: string | null
          created_at: string
          id: string
          metadata: Json | null
          score: number
          source_id: string | null
          source_label: string | null
          trigger_context: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          score: number
          source_id?: string | null
          source_label?: string | null
          trigger_context: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          score?: number
          source_id?: string | null
          source_label?: string | null
          trigger_context?: string
          user_id?: string | null
        }
        Relationships: []
      }
      operator_attention_snoozes: {
        Row: {
          snoozed_until: string
          updated_at: string
          user_id: string
        }
        Insert: {
          snoozed_until: string
          updated_at?: string
          user_id: string
        }
        Update: {
          snoozed_until?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          audit_pdf_url: string | null
          close_date: string | null
          contact_id: string
          country: string | null
          created_at: string | null
          estimated_value: number | null
          expected_value: number | null
          id: string
          source: string | null
          stage: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          volume_tier: string | null
        }
        Insert: {
          audit_pdf_url?: string | null
          close_date?: string | null
          contact_id: string
          country?: string | null
          created_at?: string | null
          estimated_value?: number | null
          expected_value?: number | null
          id?: string
          source?: string | null
          stage?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          volume_tier?: string | null
        }
        Update: {
          audit_pdf_url?: string | null
          close_date?: string | null
          contact_id?: string
          country?: string | null
          created_at?: string | null
          estimated_value?: number | null
          expected_value?: number | null
          id?: string
          source?: string | null
          stage?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          volume_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      order_activity: {
        Row: {
          avg_gap_days: number | null
          contact_id: string | null
          innovations_customer_id: number
          last_order_date: string | null
          orders_last_30_days: number
          orders_last_7_days: number
          orders_last_90_days: number
          synced_at: string
        }
        Insert: {
          avg_gap_days?: number | null
          contact_id?: string | null
          innovations_customer_id: number
          last_order_date?: string | null
          orders_last_30_days?: number
          orders_last_7_days?: number
          orders_last_90_days?: number
          synced_at?: string
        }
        Update: {
          avg_gap_days?: number | null
          contact_id?: string | null
          innovations_customer_id?: number
          last_order_date?: string | null
          orders_last_30_days?: number
          orders_last_7_days?: number
          orders_last_90_days?: number
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_activity_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          opc_code: string | null
          order_id: string
          product_id: number
          product_name: string
          product_price: number
          product_type: string
          quantity: number
          sku: string | null
          unit_price_snapshot: number
          variant_id: string | null
          variant_label: string | null
          variant_metadata: Json
          variant_opc_code: string | null
          variant_sku: string | null
          variant_snapshot: Json
        }
        Insert: {
          created_at?: string
          id?: string
          opc_code?: string | null
          order_id: string
          product_id: number
          product_name: string
          product_price: number
          product_type?: string
          quantity?: number
          sku?: string | null
          unit_price_snapshot?: number
          variant_id?: string | null
          variant_label?: string | null
          variant_metadata?: Json
          variant_opc_code?: string | null
          variant_sku?: string | null
          variant_snapshot?: Json
        }
        Update: {
          created_at?: string
          id?: string
          opc_code?: string | null
          order_id?: string
          product_id?: number
          product_name?: string
          product_price?: number
          product_type?: string
          quantity?: number
          sku?: string | null
          unit_price_snapshot?: number
          variant_id?: string | null
          variant_label?: string | null
          variant_metadata?: Json
          variant_opc_code?: string | null
          variant_sku?: string | null
          variant_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payment_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          payment_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          payment_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "order_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payment_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          order_id: string
          status: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          order_id: string
          status?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string
          status?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payment_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount: number
          card_brand: string | null
          card_last4: string | null
          created_at: string
          gateway_fail_rc: string | null
          gateway_hosteddataid: string | null
          gateway_oid: string | null
          gateway_response_code: string | null
          id: string
          metadata: Json
          order_id: string
          payment_method_id: string | null
          payment_token: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          gateway_fail_rc?: string | null
          gateway_hosteddataid?: string | null
          gateway_oid?: string | null
          gateway_response_code?: string | null
          id?: string
          metadata?: Json
          order_id: string
          payment_method_id?: string | null
          payment_token?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          gateway_fail_rc?: string | null
          gateway_hosteddataid?: string | null
          gateway_oid?: string | null
          gateway_response_code?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          payment_method_id?: string | null
          payment_token?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      order_revisions: {
        Row: {
          actor_user_id: string | null
          after_snapshot: Json
          before_snapshot: Json
          created_at: string
          customer_note: string | null
          id: string
          internal_note: string | null
          order_id: string
          revision_type: string
        }
        Insert: {
          actor_user_id?: string | null
          after_snapshot?: Json
          before_snapshot?: Json
          created_at?: string
          customer_note?: string | null
          id?: string
          internal_note?: string | null
          order_id: string
          revision_type: string
        }
        Update: {
          actor_user_id?: string | null
          after_snapshot?: Json
          before_snapshot?: Json
          created_at?: string
          customer_note?: string | null
          id?: string
          internal_note?: string | null
          order_id?: string
          revision_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_revisions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          checkout_method: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          customer_name: string | null
          id: string
          shipping_address: Json | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address?: Json | null
          checkout_method?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          shipping_address?: Json | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address?: Json | null
          checkout_method?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          shipping_address?: Json | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      outreach_outbox: {
        Row: {
          approved_at: string | null
          attachments: Json
          body: string | null
          channel: string
          contact_id: string
          created_at: string
          enrollment_id: string | null
          error: string | null
          generated_by: string
          id: string
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          approved_at?: string | null
          attachments?: Json
          body?: string | null
          channel: string
          contact_id: string
          created_at?: string
          enrollment_id?: string | null
          error?: string | null
          generated_by?: string
          id?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          approved_at?: string | null
          attachments?: Json
          body?: string | null
          channel?: string
          contact_id?: string
          created_at?: string
          enrollment_id?: string | null
          error?: string | null
          generated_by?: string
          id?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_outbox_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_outbox_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "outreach_outbox_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "cadence_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_secrets: {
        Row: {
          encrypted_secret: string
          settings_id: string
          updated_at: string
        }
        Insert: {
          encrypted_secret: string
          settings_id: string
          updated_at?: string
        }
        Update: {
          encrypted_secret?: string
          settings_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateway_secrets_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: true
            referencedRelation: "payment_gateway_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_settings: {
        Row: {
          created_at: string
          currency: string
          enabled: boolean
          environment: string
          has_secret: boolean
          id: string
          last_tested_at: string | null
          provider: string
          status: string
          store_id: string | null
          tenant_key: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          enabled?: boolean
          environment?: string
          has_secret?: boolean
          id?: string
          last_tested_at?: string | null
          provider?: string
          status?: string
          store_id?: string | null
          tenant_key?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          enabled?: boolean
          environment?: string
          has_secret?: boolean
          id?: string
          last_tested_at?: string | null
          provider?: string
          status?: string
          store_id?: string | null
          tenant_key?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      portal_account_audit_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          customer_id: number
          event_type: string
          id: string
          membership_id: string | null
          metadata: Json
          subject_user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          customer_id: number
          event_type: string
          id?: string
          membership_id?: string | null
          metadata?: Json
          subject_user_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          customer_id?: number
          event_type?: string
          id?: string
          membership_id?: string | null
          metadata?: Json
          subject_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_account_audit_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "portal_account_audit_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_account_audit_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "portal_account_audit_events_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "portal_account_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_account_memberships: {
        Row: {
          access_role: string
          approved_at: string | null
          approved_by: string | null
          contact_id: string
          created_at: string
          customer_id: number
          id: string
          is_default: boolean
          revoked_at: string | null
          source: string
          status: string
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_role?: string
          approved_at?: string | null
          approved_by?: string | null
          contact_id: string
          created_at?: string
          customer_id: number
          id?: string
          is_default?: boolean
          revoked_at?: string | null
          source?: string
          status?: string
          suspended_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_role?: string
          approved_at?: string | null
          approved_by?: string | null
          contact_id?: string
          created_at?: string
          customer_id?: number
          id?: string
          is_default?: boolean
          revoked_at?: string | null
          source?: string
          status?: string
          suspended_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_account_memberships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_account_memberships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_order_health"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "portal_account_memberships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "portal_account_memberships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_account_memberships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      portal_membership_feature_overrides: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          membership_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled: boolean
          feature_key: string
          id?: string
          membership_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          membership_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_membership_feature_overrides_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "portal_account_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      price_catalog: {
        Row: {
          id: string
          product_id: string | null
          web_enabled: boolean | null
          web_price: number | null
          wspl_enabled: boolean | null
        }
        Insert: {
          id: string
          product_id?: string | null
          web_enabled?: boolean | null
          web_price?: number | null
          wspl_enabled?: boolean | null
        }
        Update: {
          id?: string
          product_id?: string | null
          web_enabled?: boolean | null
          web_price?: number | null
          wspl_enabled?: boolean | null
        }
        Relationships: []
      }
      price_matrix: {
        Row: {
          category: string
          created_at: string | null
          id: number
          index_1_50: number | null
          index_1_53: number | null
          index_1_59: number | null
          index_1_60: number | null
          index_1_67: number | null
          index_1_74: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: number
          index_1_50?: number | null
          index_1_53?: number | null
          index_1_59?: number | null
          index_1_60?: number | null
          index_1_67?: number | null
          index_1_74?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: number
          index_1_50?: number | null
          index_1_53?: number | null
          index_1_59?: number | null
          index_1_60?: number | null
          index_1_67?: number | null
          index_1_74?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pricelist_catalog_rows: {
        Row: {
          bbd_price: number | null
          catalog_type: string
          created_at: string
          display_description: string
          id: string
          item_id: string | null
          pricelist_version_id: number
          row_key: string
          row_type: string
          section: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          bbd_price?: number | null
          catalog_type?: string
          created_at?: string
          display_description?: string
          id?: string
          item_id?: string | null
          pricelist_version_id: number
          row_key: string
          row_type: string
          section: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bbd_price?: number | null
          catalog_type?: string
          created_at?: string
          display_description?: string
          id?: string
          item_id?: string | null
          pricelist_version_id?: number
          row_key?: string
          row_type?: string
          section?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricelist_catalog_rows_pricelist_version_id_fkey"
            columns: ["pricelist_version_id"]
            isOneToOne: false
            referencedRelation: "pricelist_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricelist_child_sections: {
        Row: {
          child_discount_percent: number | null
          child_markup_percent: number | null
          created_at: string | null
          id: number
          pricelist_version_id: number | null
          section_type: string
          updated_at: string | null
        }
        Insert: {
          child_discount_percent?: number | null
          child_markup_percent?: number | null
          created_at?: string | null
          id?: number
          pricelist_version_id?: number | null
          section_type: string
          updated_at?: string | null
        }
        Update: {
          child_discount_percent?: number | null
          child_markup_percent?: number | null
          created_at?: string | null
          id?: number
          pricelist_version_id?: number | null
          section_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricelist_child_sections_pricelist_version_id_fkey"
            columns: ["pricelist_version_id"]
            isOneToOne: false
            referencedRelation: "pricelist_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricelist_line_overrides: {
        Row: {
          child_section_id: number | null
          id: number
          overridden_price_bbd: number | null
          reason: string | null
          reference_id: string
          reference_type: string
          updated_at: string | null
        }
        Insert: {
          child_section_id?: number | null
          id?: number
          overridden_price_bbd?: number | null
          reason?: string | null
          reference_id: string
          reference_type: string
          updated_at?: string | null
        }
        Update: {
          child_section_id?: number | null
          id?: number
          overridden_price_bbd?: number | null
          reason?: string | null
          reference_id?: string
          reference_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricelist_line_overrides_child_section_id_fkey"
            columns: ["child_section_id"]
            isOneToOne: false
            referencedRelation: "pricelist_child_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      pricelist_lines: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          custom_price: number
          id: string
          item_ref: string
          pricelist_id: string
          reason: string | null
          source: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          custom_price: number
          id?: string
          item_ref: string
          pricelist_id: string
          reason?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          custom_price?: number
          id?: string
          item_ref?: string
          pricelist_id?: string
          reason?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricelist_lines_item_ref_fkey"
            columns: ["item_ref"]
            isOneToOne: false
            referencedRelation: "pricing_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricelist_lines_pricelist_id_fkey"
            columns: ["pricelist_id"]
            isOneToOne: false
            referencedRelation: "pricelists"
            referencedColumns: ["id"]
          },
        ]
      }
      pricelist_notes: {
        Row: {
          content: string | null
          id: number
          section: string | null
          sort_order: number | null
        }
        Insert: {
          content?: string | null
          id?: number
          section?: string | null
          sort_order?: number | null
        }
        Update: {
          content?: string | null
          id?: number
          section?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      pricelist_overrides: {
        Row: {
          category: string | null
          created_at: string | null
          id: number
          index_column: string | null
          overridden_price: number | null
          pricelist_version_id: number | null
          reason: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: number
          index_column?: string | null
          overridden_price?: number | null
          pricelist_version_id?: number | null
          reason?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: number
          index_column?: string | null
          overridden_price?: number | null
          pricelist_version_id?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricelist_overrides_pricelist_version_id_fkey"
            columns: ["pricelist_version_id"]
            isOneToOne: false
            referencedRelation: "pricelist_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricelist_versions: {
        Row: {
          base_currency: string | null
          created_at: string | null
          discount_percent: number | null
          format_type: string | null
          id: number
          is_template: boolean | null
          markup_percent: number | null
          master_discount_percent: number | null
          master_markup_percent: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_currency?: string | null
          created_at?: string | null
          discount_percent?: number | null
          format_type?: string | null
          id?: number
          is_template?: boolean | null
          markup_percent?: number | null
          master_discount_percent?: number | null
          master_markup_percent?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_currency?: string | null
          created_at?: string | null
          discount_percent?: number | null
          format_type?: string | null
          id?: number
          is_template?: boolean | null
          markup_percent?: number | null
          master_discount_percent?: number | null
          master_markup_percent?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pricelists: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: number | null
          id: string
          kind: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: number | null
          id?: string
          kind: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: number | null
          id?: string
          kind?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricelists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "pricelists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricelists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      pricing_audit: {
        Row: {
          action: string
          actor: string | null
          after: Json | null
          at: string
          before: Json | null
          entity: string
          entity_id: string
          id: string
        }
        Insert: {
          action: string
          actor?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity: string
          entity_id: string
          id?: string
        }
        Update: {
          action?: string
          actor?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity?: string
          entity_id?: string
          id?: string
        }
        Relationships: []
      }
      pricing_input_rows: {
        Row: {
          batch_id: string
          created_at: string
          error_messages: string[]
          id: string
          lens_id: string | null
          raw_data: Json
          resolved_data: Json | null
          row_number: number
          status: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          error_messages?: string[]
          id?: string
          lens_id?: string | null
          raw_data: Json
          resolved_data?: Json | null
          row_number: number
          status?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          error_messages?: string[]
          id?: string
          lens_id?: string | null
          raw_data?: Json
          resolved_data?: Json | null
          row_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_input_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_input_rows_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_input_rows_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_items: {
        Row: {
          created_at: string
          id: string
          material: string
          tier: string
          treatment: string
        }
        Insert: {
          created_at?: string
          id?: string
          material: string
          tier: string
          treatment: string
        }
        Update: {
          created_at?: string
          id?: string
          material?: string
          tier?: string
          treatment?: string
        }
        Relationships: []
      }
      pricing_settings: {
        Row: {
          avg_days_in_stock: number
          base_currency: string
          block_below_floor: boolean
          block_loss: boolean
          brokerage_fee: number
          category_margin_floors: Json
          category_target_margins: Json
          cost_of_capital: number
          created_at: string
          created_by: string | null
          duty_rates: Json
          freight_method: string
          fx_rates: Json
          fx_risk_buffer: number
          id: string
          import_costing_fx_rates: Json
          insurance_percent: number
          inventory_holding: number
          is_active: boolean
          label: string | null
          max_price_increase: number
          overhead_percent: number
          port_charges: number
          price_reduction_threshold: number
          psychological_rounding: boolean
          require_concession_reason: boolean
          rounding_rule: number
          shrinkage_percent: number
          target_margin: number
          vat_rate: number
          version: number
        }
        Insert: {
          avg_days_in_stock?: number
          base_currency?: string
          block_below_floor?: boolean
          block_loss?: boolean
          brokerage_fee?: number
          category_margin_floors?: Json
          category_target_margins?: Json
          cost_of_capital?: number
          created_at?: string
          created_by?: string | null
          duty_rates?: Json
          freight_method?: string
          fx_rates?: Json
          fx_risk_buffer?: number
          id?: string
          import_costing_fx_rates?: Json
          insurance_percent?: number
          inventory_holding?: number
          is_active?: boolean
          label?: string | null
          max_price_increase?: number
          overhead_percent?: number
          port_charges?: number
          price_reduction_threshold?: number
          psychological_rounding?: boolean
          require_concession_reason?: boolean
          rounding_rule?: number
          shrinkage_percent?: number
          target_margin?: number
          vat_rate?: number
          version?: number
        }
        Update: {
          avg_days_in_stock?: number
          base_currency?: string
          block_below_floor?: boolean
          block_loss?: boolean
          brokerage_fee?: number
          category_margin_floors?: Json
          category_target_margins?: Json
          cost_of_capital?: number
          created_at?: string
          created_by?: string | null
          duty_rates?: Json
          freight_method?: string
          fx_rates?: Json
          fx_risk_buffer?: number
          id?: string
          import_costing_fx_rates?: Json
          insurance_percent?: number
          inventory_holding?: number
          is_active?: boolean
          label?: string | null
          max_price_increase?: number
          overhead_percent?: number
          port_charges?: number
          price_reduction_threshold?: number
          psychological_rounding?: boolean
          require_concession_reason?: boolean
          rounding_rule?: number
          shrinkage_percent?: number
          target_margin?: number
          vat_rate?: number
          version?: number
        }
        Relationships: []
      }
      pricing_sheets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_variant_configs: {
        Row: {
          attributes: Json
          created_at: string
          id: string
          opc_template: string | null
          product_id: string
          product_type: string
          settings: Json
          sku_template: string | null
          updated_at: string
          variant_mode: string
        }
        Insert: {
          attributes?: Json
          created_at?: string
          id?: string
          opc_template?: string | null
          product_id: string
          product_type: string
          settings?: Json
          sku_template?: string | null
          updated_at?: string
          variant_mode?: string
        }
        Update: {
          attributes?: Json
          created_at?: string
          id?: string
          opc_template?: string | null
          product_id?: string
          product_type?: string
          settings?: Json
          sku_template?: string | null
          updated_at?: string
          variant_mode?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          allow_backorder: boolean
          attribute_values: Json
          cost: number | null
          created_at: string
          display_label: string | null
          id: string
          is_active: boolean
          low_stock_threshold: number
          metadata: Json
          opc_code: string | null
          price: number
          product_id: string
          product_type: string
          sku: string | null
          sort_order: number
          stock_qty: number | null
          title: string
          updated_at: string
          variant_key: string
          variant_mode: string
        }
        Insert: {
          allow_backorder?: boolean
          attribute_values?: Json
          cost?: number | null
          created_at?: string
          display_label?: string | null
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          metadata?: Json
          opc_code?: string | null
          price?: number
          product_id: string
          product_type: string
          sku?: string | null
          sort_order?: number
          stock_qty?: number | null
          title: string
          updated_at?: string
          variant_key: string
          variant_mode?: string
        }
        Update: {
          allow_backorder?: boolean
          attribute_values?: Json
          cost?: number | null
          created_at?: string
          display_label?: string | null
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          metadata?: Json
          opc_code?: string | null
          price?: number
          product_id?: string
          product_type?: string
          sku?: string | null
          sort_order?: number
          stock_qty?: number | null
          title?: string
          updated_at?: string
          variant_key?: string
          variant_mode?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          audience: string | null
          avatar_url: string | null
          billing_address: Json | null
          bio: string | null
          claimed_account_number: string | null
          created_at: string
          crm_contact_id: string | null
          crm_customer_id: number | null
          display_name: string | null
          email: string | null
          email_verified_at: string | null
          full_name: string | null
          id: string
          interest_intent: string | null
          last_portal_login_at: string | null
          onboarding_completed_at: string | null
          organization_name: string | null
          phone: string | null
          portal_access_approved_at: string | null
          portal_access_approved_by: string | null
          portal_access_approved_note: string | null
          portal_access_approved_override: boolean
          portal_access_note: string | null
          portal_access_status: string | null
          portal_invite_email_sent_at: string | null
          portal_invite_email_sent_by: string | null
          profile_completed_at: string | null
          shipping_address: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          audience?: string | null
          avatar_url?: string | null
          billing_address?: Json | null
          bio?: string | null
          claimed_account_number?: string | null
          created_at?: string
          crm_contact_id?: string | null
          crm_customer_id?: number | null
          display_name?: string | null
          email?: string | null
          email_verified_at?: string | null
          full_name?: string | null
          id?: string
          interest_intent?: string | null
          last_portal_login_at?: string | null
          onboarding_completed_at?: string | null
          organization_name?: string | null
          phone?: string | null
          portal_access_approved_at?: string | null
          portal_access_approved_by?: string | null
          portal_access_approved_note?: string | null
          portal_access_approved_override?: boolean
          portal_access_note?: string | null
          portal_access_status?: string | null
          portal_invite_email_sent_at?: string | null
          portal_invite_email_sent_by?: string | null
          profile_completed_at?: string | null
          shipping_address?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          audience?: string | null
          avatar_url?: string | null
          billing_address?: Json | null
          bio?: string | null
          claimed_account_number?: string | null
          created_at?: string
          crm_contact_id?: string | null
          crm_customer_id?: number | null
          display_name?: string | null
          email?: string | null
          email_verified_at?: string | null
          full_name?: string | null
          id?: string
          interest_intent?: string | null
          last_portal_login_at?: string | null
          onboarding_completed_at?: string | null
          organization_name?: string | null
          phone?: string | null
          portal_access_approved_at?: string | null
          portal_access_approved_by?: string | null
          portal_access_approved_note?: string | null
          portal_access_approved_override?: boolean
          portal_access_note?: string | null
          portal_access_status?: string | null
          portal_invite_email_sent_at?: string | null
          portal_invite_email_sent_by?: string | null
          profile_completed_at?: string | null
          shipping_address?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_inquiries: {
        Row: {
          business_name: string | null
          created_at: string
          email: string
          honeypot: string | null
          id: string
          inquiry_type: string
          ip_hint: string | null
          message: string | null
          name: string
          notes: string | null
          page_slug: string | null
          phone: string | null
          source_channel: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email: string
          honeypot?: string | null
          id?: string
          inquiry_type?: string
          ip_hint?: string | null
          message?: string | null
          name: string
          notes?: string | null
          page_slug?: string | null
          phone?: string | null
          source_channel?: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string
          honeypot?: string | null
          id?: string
          inquiry_type?: string
          ip_hint?: string | null
          message?: string | null
          name?: string
          notes?: string | null
          page_slug?: string | null
          phone?: string | null
          source_channel?: string
        }
        Relationships: []
      }
      qbo_gateway_rate_limits: {
        Row: {
          bucket_key: string
          request_count: number
          updated_at: string
          window_started_at: string
        }
        Insert: {
          bucket_key: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          bucket_key?: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      qbo_integration_commands: {
        Row: {
          claimed_at: string | null
          command: string
          completed_at: string | null
          environment: string
          error_message_sanitized: string | null
          id: string
          requested_at: string
          requested_by: string
          result_sanitized: Json | null
          status: string
        }
        Insert: {
          claimed_at?: string | null
          command: string
          completed_at?: string | null
          environment?: string
          error_message_sanitized?: string | null
          id?: string
          requested_at?: string
          requested_by: string
          result_sanitized?: Json | null
          status?: string
        }
        Update: {
          claimed_at?: string | null
          command?: string
          completed_at?: string | null
          environment?: string
          error_message_sanitized?: string | null
          id?: string
          requested_at?: string
          requested_by?: string
          result_sanitized?: Json | null
          status?: string
        }
        Relationships: []
      }
      qbo_integration_state: {
        Row: {
          company_name: string | null
          connected_at: string | null
          created_by: string | null
          environment: string
          last_error_code: string | null
          last_error_message_sanitized: string | null
          last_reconciliation_at: string | null
          last_reconciliation_status: string | null
          last_refresh_at: string | null
          provider: string
          realm_id_masked: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          connected_at?: string | null
          created_by?: string | null
          environment?: string
          last_error_code?: string | null
          last_error_message_sanitized?: string | null
          last_reconciliation_at?: string | null
          last_reconciliation_status?: string | null
          last_refresh_at?: string | null
          provider?: string
          realm_id_masked?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          connected_at?: string | null
          created_by?: string | null
          environment?: string
          last_error_code?: string | null
          last_error_message_sanitized?: string | null
          last_reconciliation_at?: string | null
          last_reconciliation_status?: string | null
          last_refresh_at?: string | null
          provider?: string
          realm_id_masked?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      qbo_oauth_transactions: {
        Row: {
          authorization_code_ciphertext: string | null
          callback_received_at: string | null
          claimed_at: string | null
          claimed_by: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          environment: string
          expires_at: string
          failure_code: string | null
          failure_message_sanitized: string | null
          id: string
          realm_id_masked: string | null
          redirect_uri: string
          state_hash: string
        }
        Insert: {
          authorization_code_ciphertext?: string | null
          callback_received_at?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          environment?: string
          expires_at: string
          failure_code?: string | null
          failure_message_sanitized?: string | null
          id?: string
          realm_id_masked?: string | null
          redirect_uri: string
          state_hash: string
        }
        Update: {
          authorization_code_ciphertext?: string | null
          callback_received_at?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          environment?: string
          expires_at?: string
          failure_code?: string | null
          failure_message_sanitized?: string | null
          id?: string
          realm_id_masked?: string | null
          redirect_uri?: string
          state_hash?: string
        }
        Relationships: []
      }
      quote_frame_details: {
        Row: {
          a_mm: number | null
          b_mm: number | null
          brand: string | null
          bridge_mm: number | null
          created_at: string
          dbl_mm: number | null
          ed_mm: number | null
          id: string
          is_uncut: boolean
          job_scope: string
          model_colour: string | null
          quote_id: string
          shape_source_file: string | null
          shape_traced_axis: number | null
          shape_traced_ed: number | null
          standard_shape_id: string | null
          trace_geometry: Json | null
          uncut_price: number | null
          updated_at: string
        }
        Insert: {
          a_mm?: number | null
          b_mm?: number | null
          brand?: string | null
          bridge_mm?: number | null
          created_at?: string
          dbl_mm?: number | null
          ed_mm?: number | null
          id?: string
          is_uncut?: boolean
          job_scope?: string
          model_colour?: string | null
          quote_id: string
          shape_source_file?: string | null
          shape_traced_axis?: number | null
          shape_traced_ed?: number | null
          standard_shape_id?: string | null
          trace_geometry?: Json | null
          uncut_price?: number | null
          updated_at?: string
        }
        Update: {
          a_mm?: number | null
          b_mm?: number | null
          brand?: string | null
          bridge_mm?: number | null
          created_at?: string
          dbl_mm?: number | null
          ed_mm?: number | null
          id?: string
          is_uncut?: boolean
          job_scope?: string
          model_colour?: string | null
          quote_id?: string
          shape_source_file?: string | null
          shape_traced_axis?: number | null
          shape_traced_ed?: number | null
          standard_shape_id?: string | null
          trace_geometry?: Json | null
          uncut_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_frame_details_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_frame_details_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "quotes_customer"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          assistance_note: string | null
          created_at: string
          description_override: string | null
          gp_amount: number
          gp_percent: number
          group_key: string | null
          id: string
          innovations_alias: string | null
          item_name: string
          line_note: string | null
          line_type: string
          needs_assistance: boolean
          override_note: string | null
          override_reason: string | null
          parent_line_id: string | null
          price_override: boolean
          product_id: string | null
          profit_status: string
          qty: number
          quote_id: string
          sku: string
          sort_order: number
          threshold_percent: number
          threshold_status: string
          unit_base_price_bbd: number
          unit_cost_landed_bbd: number
          unit_sell_price_bbd: number
          updated_at: string
        }
        Insert: {
          assistance_note?: string | null
          created_at?: string
          description_override?: string | null
          gp_amount?: number
          gp_percent?: number
          group_key?: string | null
          id?: string
          innovations_alias?: string | null
          item_name?: string
          line_note?: string | null
          line_type?: string
          needs_assistance?: boolean
          override_note?: string | null
          override_reason?: string | null
          parent_line_id?: string | null
          price_override?: boolean
          product_id?: string | null
          profit_status?: string
          qty?: number
          quote_id: string
          sku?: string
          sort_order?: number
          threshold_percent?: number
          threshold_status?: string
          unit_base_price_bbd?: number
          unit_cost_landed_bbd?: number
          unit_sell_price_bbd?: number
          updated_at?: string
        }
        Update: {
          assistance_note?: string | null
          created_at?: string
          description_override?: string | null
          gp_amount?: number
          gp_percent?: number
          group_key?: string | null
          id?: string
          innovations_alias?: string | null
          item_name?: string
          line_note?: string | null
          line_type?: string
          needs_assistance?: boolean
          override_note?: string | null
          override_reason?: string | null
          parent_line_id?: string | null
          price_override?: boolean
          product_id?: string | null
          profit_status?: string
          qty?: number
          quote_id?: string
          sku?: string
          sort_order?: number
          threshold_percent?: number
          threshold_status?: string
          unit_base_price_bbd?: number
          unit_cost_landed_bbd?: number
          unit_sell_price_bbd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_innovations_alias_fkey"
            columns: ["innovations_alias"]
            isOneToOne: false
            referencedRelation: "innovations_lens_aliases"
            referencedColumns: ["alias"]
          },
          {
            foreignKeyName: "quote_lines_parent_line_id_fkey"
            columns: ["parent_line_id"]
            isOneToOne: false
            referencedRelation: "quote_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_parent_line_id_fkey"
            columns: ["parent_line_id"]
            isOneToOne: false
            referencedRelation: "quote_lines_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_customer"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          account_id: number | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          currency: string
          customer_name: string
          gp_amount: number
          gp_percent: number
          grand_total: number
          helpdesk_ticket_id: string | null
          id: string
          lead_time_days: number | null
          notes_customer: string | null
          notes_internal: string | null
          price_profile_id: string | null
          quote_number: string
          quote_type: string
          status: string
          subtotal_sell: number
          total_landed_cost: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          account_id?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          currency?: string
          customer_name?: string
          gp_amount?: number
          gp_percent?: number
          grand_total?: number
          helpdesk_ticket_id?: string | null
          id?: string
          lead_time_days?: number | null
          notes_customer?: string | null
          notes_internal?: string | null
          price_profile_id?: string | null
          quote_number: string
          quote_type: string
          status?: string
          subtotal_sell?: number
          total_landed_cost?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          account_id?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          customer_name?: string
          gp_amount?: number
          gp_percent?: number
          grand_total?: number
          helpdesk_ticket_id?: string | null
          id?: string
          lead_time_days?: number | null
          notes_customer?: string | null
          notes_internal?: string | null
          price_profile_id?: string | null
          quote_number?: string
          quote_type?: string
          status?: string
          subtotal_sell?: number
          total_landed_cost?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quotes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "quotes_helpdesk_ticket_id_fkey"
            columns: ["helpdesk_ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          feature: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          feature: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          feature?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      runtime_error_events: {
        Row: {
          browser: string | null
          component_stack: string | null
          created_at: string
          detail: string | null
          id: string
          release_version: string | null
          route: string | null
          source: string
          title: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          component_stack?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          release_version?: string | null
          route?: string | null
          source: string
          title: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          component_stack?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          release_version?: string | null
          route?: string | null
          source?: string
          title?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rx_details: {
        Row: {
          created_at: string
          fitting_height: string | null
          id: string
          od_add: number | null
          od_axis: number | null
          od_bc: number | null
          od_cyl: number | null
          od_ercd: number | null
          od_eye_level: number | null
          od_face_form_angle: number | null
          od_fpd: number | null
          od_inset: number | null
          od_npd: number | null
          od_object_distance: number | null
          od_oc: number | null
          od_panto: number | null
          od_prism_dir: string | null
          od_prism_value: number | null
          od_prism2_dir: string | null
          od_prism2_value: number | null
          od_slab_off: number | null
          od_special_thickness: string | null
          od_sph: number | null
          od_vertex_fitted: number | null
          od_vertex_refracted: number | null
          os_add: number | null
          os_axis: number | null
          os_bc: number | null
          os_cyl: number | null
          os_ercd: number | null
          os_eye_level: number | null
          os_face_form_angle: number | null
          os_fpd: number | null
          os_inset: number | null
          os_npd: number | null
          os_object_distance: number | null
          os_oc: number | null
          os_panto: number | null
          os_prism_dir: string | null
          os_prism_value: number | null
          os_prism2_dir: string | null
          os_prism2_value: number | null
          os_slab_off: number | null
          os_special_thickness: string | null
          os_sph: number | null
          os_vertex_fitted: number | null
          os_vertex_refracted: number | null
          pd: string | null
          quote_line_id: string
          rx_notes: string | null
          seg_height: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fitting_height?: string | null
          id?: string
          od_add?: number | null
          od_axis?: number | null
          od_bc?: number | null
          od_cyl?: number | null
          od_ercd?: number | null
          od_eye_level?: number | null
          od_face_form_angle?: number | null
          od_fpd?: number | null
          od_inset?: number | null
          od_npd?: number | null
          od_object_distance?: number | null
          od_oc?: number | null
          od_panto?: number | null
          od_prism_dir?: string | null
          od_prism_value?: number | null
          od_prism2_dir?: string | null
          od_prism2_value?: number | null
          od_slab_off?: number | null
          od_special_thickness?: string | null
          od_sph?: number | null
          od_vertex_fitted?: number | null
          od_vertex_refracted?: number | null
          os_add?: number | null
          os_axis?: number | null
          os_bc?: number | null
          os_cyl?: number | null
          os_ercd?: number | null
          os_eye_level?: number | null
          os_face_form_angle?: number | null
          os_fpd?: number | null
          os_inset?: number | null
          os_npd?: number | null
          os_object_distance?: number | null
          os_oc?: number | null
          os_panto?: number | null
          os_prism_dir?: string | null
          os_prism_value?: number | null
          os_prism2_dir?: string | null
          os_prism2_value?: number | null
          os_slab_off?: number | null
          os_special_thickness?: string | null
          os_sph?: number | null
          os_vertex_fitted?: number | null
          os_vertex_refracted?: number | null
          pd?: string | null
          quote_line_id: string
          rx_notes?: string | null
          seg_height?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fitting_height?: string | null
          id?: string
          od_add?: number | null
          od_axis?: number | null
          od_bc?: number | null
          od_cyl?: number | null
          od_ercd?: number | null
          od_eye_level?: number | null
          od_face_form_angle?: number | null
          od_fpd?: number | null
          od_inset?: number | null
          od_npd?: number | null
          od_object_distance?: number | null
          od_oc?: number | null
          od_panto?: number | null
          od_prism_dir?: string | null
          od_prism_value?: number | null
          od_prism2_dir?: string | null
          od_prism2_value?: number | null
          od_slab_off?: number | null
          od_special_thickness?: string | null
          od_sph?: number | null
          od_vertex_fitted?: number | null
          od_vertex_refracted?: number | null
          os_add?: number | null
          os_axis?: number | null
          os_bc?: number | null
          os_cyl?: number | null
          os_ercd?: number | null
          os_eye_level?: number | null
          os_face_form_angle?: number | null
          os_fpd?: number | null
          os_inset?: number | null
          os_npd?: number | null
          os_object_distance?: number | null
          os_oc?: number | null
          os_panto?: number | null
          os_prism_dir?: string | null
          os_prism_value?: number | null
          os_prism2_dir?: string | null
          os_prism2_value?: number | null
          os_slab_off?: number | null
          os_special_thickness?: string | null
          os_sph?: number | null
          os_vertex_fitted?: number | null
          os_vertex_refracted?: number | null
          pd?: string | null
          quote_line_id?: string
          rx_notes?: string | null
          seg_height?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rx_details_quote_line_id_fkey"
            columns: ["quote_line_id"]
            isOneToOne: true
            referencedRelation: "quote_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rx_details_quote_line_id_fkey"
            columns: ["quote_line_id"]
            isOneToOne: true
            referencedRelation: "quote_lines_customer"
            referencedColumns: ["id"]
          },
        ]
      }
      rx_order_drafts: {
        Row: {
          created_at: string
          id: string
          input_payload: Json
          name: string
          patient_reference: string | null
          recommendation_snapshot: Json | null
          rule_set_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_payload?: Json
          name: string
          patient_reference?: string | null
          recommendation_snapshot?: Json | null
          rule_set_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_payload?: Json
          name?: string
          patient_reference?: string | null
          recommendation_snapshot?: Json | null
          rule_set_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rx_order_drafts_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "lens_recommendation_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      rx_order_submissions: {
        Row: {
          account_id: number | null
          approved_at: string | null
          approved_by: string | null
          attempts: number
          claimed_at: string | null
          created_at: string
          dispatch_provider: string
          gatekeeper_order_id: number
          id: string
          lab_status: string | null
          lab_status_at: string | null
          lab_status_detail: string | null
          last_error: string | null
          mode: number
          order_id: string | null
          payload: Json
          quote_id: string
          result_code: number | null
          result_message: string | null
          rxt_data: string | null
          status: string
          submitted_at: string | null
          transport: string | null
          updated_at: string
        }
        Insert: {
          account_id?: number | null
          approved_at?: string | null
          approved_by?: string | null
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          dispatch_provider?: string
          gatekeeper_order_id?: number
          id?: string
          lab_status?: string | null
          lab_status_at?: string | null
          lab_status_detail?: string | null
          last_error?: string | null
          mode?: number
          order_id?: string | null
          payload?: Json
          quote_id: string
          result_code?: number | null
          result_message?: string | null
          rxt_data?: string | null
          status?: string
          submitted_at?: string | null
          transport?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: number | null
          approved_at?: string | null
          approved_by?: string | null
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          dispatch_provider?: string
          gatekeeper_order_id?: number
          id?: string
          lab_status?: string | null
          lab_status_at?: string | null
          lab_status_detail?: string | null
          last_error?: string | null
          mode?: number
          order_id?: string | null
          payload?: Json
          quote_id?: string
          result_code?: number | null
          result_message?: string | null
          rxt_data?: string | null
          status?: string
          submitted_at?: string | null
          transport?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rx_order_submissions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rx_order_submissions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rx_order_submissions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "rx_order_submissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rx_order_submissions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rx_order_submissions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "quotes_customer"
            referencedColumns: ["id"]
          },
        ]
      }
      rx_price_categories: {
        Row: {
          created_at: string
          default_name: string
          grouping_id: number
          id: number
          is_active: boolean
          key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_name: string
          grouping_id: number
          id?: number
          is_active?: boolean
          key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_name?: string
          grouping_id?: number
          id?: number
          is_active?: boolean
          key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rx_price_categories_grouping_id_fkey"
            columns: ["grouping_id"]
            isOneToOne: false
            referencedRelation: "rx_price_groupings"
            referencedColumns: ["id"]
          },
        ]
      }
      rx_price_category_versions: {
        Row: {
          category_id: number
          created_at: string
          display_name: string | null
          id: number
          is_enabled: boolean
          pricelist_version_id: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category_id: number
          created_at?: string
          display_name?: string | null
          id?: number
          is_enabled?: boolean
          pricelist_version_id: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: number
          created_at?: string
          display_name?: string | null
          id?: number
          is_enabled?: boolean
          pricelist_version_id?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rx_price_category_versions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "rx_price_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rx_price_category_versions_pricelist_version_id_fkey"
            columns: ["pricelist_version_id"]
            isOneToOne: false
            referencedRelation: "pricelist_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      rx_price_grouping_versions: {
        Row: {
          created_at: string
          display_name: string | null
          grouping_id: number
          id: number
          is_enabled: boolean
          pricelist_version_id: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          grouping_id: number
          id?: number
          is_enabled?: boolean
          pricelist_version_id: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          grouping_id?: number
          id?: number
          is_enabled?: boolean
          pricelist_version_id?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rx_price_grouping_versions_grouping_id_fkey"
            columns: ["grouping_id"]
            isOneToOne: false
            referencedRelation: "rx_price_groupings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rx_price_grouping_versions_pricelist_version_id_fkey"
            columns: ["pricelist_version_id"]
            isOneToOne: false
            referencedRelation: "pricelist_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      rx_price_groupings: {
        Row: {
          created_at: string
          default_name: string
          id: number
          is_active: boolean
          key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_name: string
          id?: number
          is_active?: boolean
          key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_name?: string
          id?: number
          is_active?: boolean
          key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      scotia_gateway_events: {
        Row: {
          amount: number | null
          approval_code: string | null
          approved: boolean | null
          association_response_code: string | null
          created_at: string
          currency: string | null
          endpoint_url: string | null
          env: string | null
          fail_rc: string | null
          fail_reason: string | null
          http_status: number | null
          id: string
          kind: string
          notes: string | null
          oid: string | null
          outcome: string
          request_params: Json | null
          response_params: Json | null
          store_id: string | null
          terminal_id: string | null
        }
        Insert: {
          amount?: number | null
          approval_code?: string | null
          approved?: boolean | null
          association_response_code?: string | null
          created_at?: string
          currency?: string | null
          endpoint_url?: string | null
          env?: string | null
          fail_rc?: string | null
          fail_reason?: string | null
          http_status?: number | null
          id?: string
          kind: string
          notes?: string | null
          oid?: string | null
          outcome: string
          request_params?: Json | null
          response_params?: Json | null
          store_id?: string | null
          terminal_id?: string | null
        }
        Update: {
          amount?: number | null
          approval_code?: string | null
          approved?: boolean | null
          association_response_code?: string | null
          created_at?: string
          currency?: string | null
          endpoint_url?: string | null
          env?: string | null
          fail_rc?: string | null
          fail_reason?: string | null
          http_status?: number | null
          id?: string
          kind?: string
          notes?: string | null
          oid?: string | null
          outcome?: string
          request_params?: Json | null
          response_params?: Json | null
          store_id?: string | null
          terminal_id?: string | null
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          dedupe_key: string
          details: Json
          first_seen_at: string
          id: string
          last_seen_at: string
          occurrence_count: number
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          state: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          dedupe_key: string
          details?: Json
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          occurrence_count?: number
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          state?: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          dedupe_key?: string
          details?: Json
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          occurrence_count?: number
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          state?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_events: {
        Row: {
          actor_role: string | null
          actor_user_id: string | null
          category: string
          created_at: string
          event_type: string
          id: string
          ip_hint: string | null
          occurred_at: string
          payload: Json
          redacted_payload: Json
          request_id: string | null
          severity: string
          source_function: string | null
          source_path: string | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          actor_role?: string | null
          actor_user_id?: string | null
          category: string
          created_at?: string
          event_type: string
          id?: string
          ip_hint?: string | null
          occurred_at?: string
          payload?: Json
          redacted_payload?: Json
          request_id?: string | null
          severity?: string
          source_function?: string | null
          source_path?: string | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          actor_role?: string | null
          actor_user_id?: string | null
          category?: string
          created_at?: string
          event_type?: string
          id?: string
          ip_hint?: string | null
          occurred_at?: string
          payload?: Json
          redacted_payload?: Json
          request_id?: string | null
          severity?: string
          source_function?: string | null
          source_path?: string | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      shipment_charges: {
        Row: {
          amount_bbd: number
          charge_type: string
          created_at: string
          duty_bbd: number | null
          id: string
          notes: string | null
          shipment_id: string
          sort_order: number
          updated_at: string
          vat_bbd: number | null
          vat_reclaimable: boolean | null
        }
        Insert: {
          amount_bbd?: number
          charge_type: string
          created_at?: string
          duty_bbd?: number | null
          id?: string
          notes?: string | null
          shipment_id: string
          sort_order?: number
          updated_at?: string
          vat_bbd?: number | null
          vat_reclaimable?: boolean | null
        }
        Update: {
          amount_bbd?: number
          charge_type?: string
          created_at?: string
          duty_bbd?: number | null
          id?: string
          notes?: string | null
          shipment_id?: string
          sort_order?: number
          updated_at?: string
          vat_bbd?: number | null
          vat_reclaimable?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_charges_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_lines: {
        Row: {
          addon_id: string | null
          created_at: string
          description: string
          id: string
          lens_id: string | null
          line_fob_foreign: number
          markup_percent: number
          product_type: string
          quantity: number
          shipment_id: string
          sort_order: number
          supply_id: string | null
          unit_fob_foreign: number
          updated_at: string
        }
        Insert: {
          addon_id?: string | null
          created_at?: string
          description?: string
          id?: string
          lens_id?: string | null
          line_fob_foreign?: number
          markup_percent?: number
          product_type?: string
          quantity?: number
          shipment_id: string
          sort_order?: number
          supply_id?: string | null
          unit_fob_foreign?: number
          updated_at?: string
        }
        Update: {
          addon_id?: string | null
          created_at?: string
          description?: string
          id?: string
          lens_id?: string | null
          line_fob_foreign?: number
          markup_percent?: number
          product_type?: string
          quantity?: number
          shipment_id?: string
          sort_order?: number
          supply_id?: string | null
          unit_fob_foreign?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_lines_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lines_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lines_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lines_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lines_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lines_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lines_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_types: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          commodity: string
          created_at: string
          created_by: string
          currency: string
          date_ordered: string | null
          date_received: string
          exchange_rate: number
          fob_foreign: number
          freight_provider: string
          id: string
          invoice_date: string
          invoice_number: string
          invoice_total_foreign: number
          parent_id: string | null
          po_ref: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          supplier_id: string
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          commodity?: string
          created_at?: string
          created_by: string
          currency?: string
          date_ordered?: string | null
          date_received: string
          exchange_rate?: number
          fob_foreign?: number
          freight_provider?: string
          id?: string
          invoice_date: string
          invoice_number: string
          invoice_total_foreign?: number
          parent_id?: string | null
          po_ref?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          supplier_id: string
          type: string
          updated_at?: string
          version?: number
        }
        Update: {
          commodity?: string
          created_at?: string
          created_by?: string
          currency?: string
          date_ordered?: string | null
          date_received?: string
          exchange_rate?: number
          fob_foreign?: number
          freight_provider?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_total_foreign?: number
          parent_id?: string | null
          po_ref?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          supplier_id?: string
          type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_public_cards: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          email: string | null
          is_published: boolean
          linkedin_url: string | null
          organization_name: string | null
          phone: string | null
          skills: string[]
          slug: string
          title: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          is_published?: boolean
          linkedin_url?: string | null
          organization_name?: string | null
          phone?: string | null
          skills?: string[]
          slug: string
          title?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          is_published?: boolean
          linkedin_url?: string | null
          organization_name?: string | null
          phone?: string | null
          skills?: string[]
          slug?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      statement_document_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          discovered_at: string
          email_message_id: string | null
          email_status: string
          emailed_at: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          idempotency_key: string
          innovations_statement_id: number
          locked_at: string | null
          locked_by: string | null
          max_retries: number
          next_retry_at: string
          one_drive_drive_id: string | null
          one_drive_item_id: string | null
          one_drive_path: string | null
          one_drive_url: string | null
          pdf_bytes: number | null
          pdf_filename: string | null
          pdf_template_version: string
          retry_count: number
          skip_reason: string | null
          statement_id: number | null
          status: string
          updated_at: string
          upload_status: string
          uploaded_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          discovered_at?: string
          email_message_id?: string | null
          email_status?: string
          emailed_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          idempotency_key: string
          innovations_statement_id: number
          locked_at?: string | null
          locked_by?: string | null
          max_retries?: number
          next_retry_at?: string
          one_drive_drive_id?: string | null
          one_drive_item_id?: string | null
          one_drive_path?: string | null
          one_drive_url?: string | null
          pdf_bytes?: number | null
          pdf_filename?: string | null
          pdf_template_version?: string
          retry_count?: number
          skip_reason?: string | null
          statement_id?: number | null
          status?: string
          updated_at?: string
          upload_status?: string
          uploaded_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          discovered_at?: string
          email_message_id?: string | null
          email_status?: string
          emailed_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          idempotency_key?: string
          innovations_statement_id?: number
          locked_at?: string | null
          locked_by?: string | null
          max_retries?: number
          next_retry_at?: string
          one_drive_drive_id?: string | null
          one_drive_item_id?: string | null
          one_drive_path?: string | null
          one_drive_url?: string | null
          pdf_bytes?: number | null
          pdf_filename?: string | null
          pdf_template_version?: string
          retry_count?: number
          skip_reason?: string | null
          statement_id?: number | null
          status?: string
          updated_at?: string
          upload_status?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "statement_document_jobs_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          },
        ]
      }
      statement_lines: {
        Row: {
          amount: number | null
          created_at: string
          id: number
          innovations_statement_id: number
          innovations_statement_item_id: number
          invoice_id: number | null
          order_id: number | null
          order_type: number | null
          order_type_name: string | null
          patient: string | null
          payment_method: string | null
          post_date: string | null
          reference: string | null
          synced_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: never
          innovations_statement_id: number
          innovations_statement_item_id: number
          invoice_id?: number | null
          order_id?: number | null
          order_type?: number | null
          order_type_name?: string | null
          patient?: string | null
          payment_method?: string | null
          post_date?: string | null
          reference?: string | null
          synced_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: never
          innovations_statement_id?: number
          innovations_statement_item_id?: number
          invoice_id?: number | null
          order_id?: number | null
          order_type?: number | null
          order_type_name?: string | null
          patient?: string | null
          payment_method?: string | null
          post_date?: string | null
          reference?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "statement_lines_innovations_statement_id_fkey"
            columns: ["innovations_statement_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["innovations_statement_id"]
          },
        ]
      }
      statements: {
        Row: {
          account_number: string | null
          aging_amount_1: number | null
          aging_amount_2: number | null
          aging_amount_3: number | null
          aging_amount_4: number | null
          allowance: number | null
          closing_balance: number | null
          created_at: string
          customer_id: number | null
          discount: number | null
          due_date: string | null
          finance_charges: number | null
          from_date: string | null
          id: number
          innovations_customer_id: number
          innovations_emailed: boolean
          innovations_statement_id: number
          opening_balance: number | null
          payments: number | null
          portal_emailed_at: string | null
          printed: boolean
          statement_date: string | null
          status: number | null
          synced_at: string
          to_date: string | null
          transactions: number | null
          void: boolean
          volume_discount: number | null
        }
        Insert: {
          account_number?: string | null
          aging_amount_1?: number | null
          aging_amount_2?: number | null
          aging_amount_3?: number | null
          aging_amount_4?: number | null
          allowance?: number | null
          closing_balance?: number | null
          created_at?: string
          customer_id?: number | null
          discount?: number | null
          due_date?: string | null
          finance_charges?: number | null
          from_date?: string | null
          id?: never
          innovations_customer_id: number
          innovations_emailed?: boolean
          innovations_statement_id: number
          opening_balance?: number | null
          payments?: number | null
          portal_emailed_at?: string | null
          printed?: boolean
          statement_date?: string | null
          status?: number | null
          synced_at?: string
          to_date?: string | null
          transactions?: number | null
          void?: boolean
          volume_discount?: number | null
        }
        Update: {
          account_number?: string | null
          aging_amount_1?: number | null
          aging_amount_2?: number | null
          aging_amount_3?: number | null
          aging_amount_4?: number | null
          allowance?: number | null
          closing_balance?: number | null
          created_at?: string
          customer_id?: number | null
          discount?: number | null
          due_date?: string | null
          finance_charges?: number | null
          from_date?: string | null
          id?: never
          innovations_customer_id?: number
          innovations_emailed?: boolean
          innovations_statement_id?: number
          opening_balance?: number | null
          payments?: number | null
          portal_emailed_at?: string | null
          printed?: boolean
          statement_date?: string | null
          status?: number | null
          synced_at?: string
          to_date?: string | null
          transactions?: number | null
          void?: boolean
          volume_discount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "statements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "statements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      stock_order_submissions: {
        Row: {
          account_id: number
          approved_at: string | null
          approved_by: string | null
          attempts: number
          claimed_at: string | null
          created_at: string
          created_by: string | null
          dispatch_provider: string
          docstudio_document_id: string | null
          filename: string | null
          gatekeeper_order_id: number
          id: string
          lab_status: string | null
          lab_status_at: string | null
          lab_status_detail: string | null
          last_error: string | null
          order_reference: string | null
          payload: Json
          po_number: string | null
          quote_id: string | null
          receipt: Json | null
          released_at: string | null
          status: string
          transport: string | null
          updated_at: string
        }
        Insert: {
          account_id: number
          approved_at?: string | null
          approved_by?: string | null
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          created_by?: string | null
          dispatch_provider?: string
          docstudio_document_id?: string | null
          filename?: string | null
          gatekeeper_order_id?: number
          id?: string
          lab_status?: string | null
          lab_status_at?: string | null
          lab_status_detail?: string | null
          last_error?: string | null
          order_reference?: string | null
          payload?: Json
          po_number?: string | null
          quote_id?: string | null
          receipt?: Json | null
          released_at?: string | null
          status?: string
          transport?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: number
          approved_at?: string | null
          approved_by?: string | null
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          created_by?: string | null
          dispatch_provider?: string
          docstudio_document_id?: string | null
          filename?: string | null
          gatekeeper_order_id?: number
          id?: string
          lab_status?: string | null
          lab_status_at?: string | null
          lab_status_detail?: string | null
          last_error?: string | null
          order_reference?: string | null
          payload?: Json
          po_number?: string | null
          quote_id?: string | null
          receipt?: Json | null
          released_at?: string | null
          status?: string
          transport?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_order_submissions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "stock_order_submissions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_order_submissions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "stock_order_submissions_docstudio_document_id_fkey"
            columns: ["docstudio_document_id"]
            isOneToOne: false
            referencedRelation: "docstudio_billing_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_order_submissions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_order_submissions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_customer"
            referencedColumns: ["id"]
          },
        ]
      }
      store_product_media: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          product_id: string
          product_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          product_id: string
          product_type: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          product_id?: string
          product_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_product_overrides: {
        Row: {
          created_at: string
          id: string
          is_published: boolean | null
          is_vat_taxable: boolean
          product_id: string
          product_type: string
          quantity_label: string | null
          updated_at: string
          website_badges: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean | null
          is_vat_taxable?: boolean
          product_id: string
          product_type: string
          quantity_label?: string | null
          updated_at?: string
          website_badges?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean | null
          is_vat_taxable?: boolean
          product_id?: string
          product_type?: string
          quantity_label?: string | null
          updated_at?: string
          website_badges?: Json
        }
        Relationships: []
      }
      store_product_variant_settings: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          id: string
          opc_template: string | null
          product_id: string
          product_type: string
          sku_template: string | null
          updated_at: string
          updated_by: string | null
          variant_mode: Database["public"]["Enums"]["store_variant_mode"]
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          opc_template?: string | null
          product_id: string
          product_type: string
          sku_template?: string | null
          updated_at?: string
          updated_by?: string | null
          variant_mode?: Database["public"]["Enums"]["store_variant_mode"]
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          opc_template?: string | null
          product_id?: string
          product_type?: string
          sku_template?: string | null
          updated_at?: string
          updated_by?: string | null
          variant_mode?: Database["public"]["Enums"]["store_variant_mode"]
        }
        Relationships: []
      }
      store_product_variants: {
        Row: {
          allow_backorder: boolean
          attributes: Json
          cost: number | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          low_stock_threshold: number
          metadata: Json
          opc_code: string | null
          price: number
          product_id: string
          product_type: string
          reserved_qty: number
          sku: string | null
          sort_order: number
          stock_qty: number
          title: string
          updated_at: string
          updated_by: string | null
          variant_key: string
        }
        Insert: {
          allow_backorder?: boolean
          attributes?: Json
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          metadata?: Json
          opc_code?: string | null
          price?: number
          product_id: string
          product_type: string
          reserved_qty?: number
          sku?: string | null
          sort_order?: number
          stock_qty?: number
          title: string
          updated_at?: string
          updated_by?: string | null
          variant_key: string
        }
        Update: {
          allow_backorder?: boolean
          attributes?: Json
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          metadata?: Json
          opc_code?: string | null
          price?: number
          product_id?: string
          product_type?: string
          reserved_qty?: number
          sku?: string | null
          sort_order?: number
          stock_qty?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
          variant_key?: string
        }
        Relationships: []
      }
      store_variant_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          variant_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          variant_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_variant_audit_logs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_variant_audit_logs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          abbrev: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplies: {
        Row: {
          base_price: number
          bb_item: boolean
          bin: string
          brand_id: string | null
          category: string
          created_at: string
          currency: string
          description: string
          detail: string
          duty_added: boolean
          id: string
          image_url: string | null
          innovations_misc_item_id: number | null
          inventory_qty: number | null
          is_active: boolean
          labour_added: boolean
          last_synced_at: string | null
          name: string
          notes: string | null
          preferred: boolean
          quantity_per_unit: number
          sell_price: number
          show_in_pricelist: boolean
          show_on_website: boolean
          sku: string | null
          source: string
          stk_wspl: boolean
          stocked: boolean
          supplier_id: string | null
          unit: string
          updated_at: string
          vat_paid: boolean
        }
        Insert: {
          base_price?: number
          bb_item?: boolean
          bin?: string
          brand_id?: string | null
          category?: string
          created_at?: string
          currency?: string
          description?: string
          detail?: string
          duty_added?: boolean
          id?: string
          image_url?: string | null
          innovations_misc_item_id?: number | null
          inventory_qty?: number | null
          is_active?: boolean
          labour_added?: boolean
          last_synced_at?: string | null
          name: string
          notes?: string | null
          preferred?: boolean
          quantity_per_unit?: number
          sell_price?: number
          show_in_pricelist?: boolean
          show_on_website?: boolean
          sku?: string | null
          source?: string
          stk_wspl?: boolean
          stocked?: boolean
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          vat_paid?: boolean
        }
        Update: {
          base_price?: number
          bb_item?: boolean
          bin?: string
          brand_id?: string | null
          category?: string
          created_at?: string
          currency?: string
          description?: string
          detail?: string
          duty_added?: boolean
          id?: string
          image_url?: string | null
          innovations_misc_item_id?: number | null
          inventory_qty?: number | null
          is_active?: boolean
          labour_added?: boolean
          last_synced_at?: string | null
          name?: string
          notes?: string | null
          preferred?: boolean
          quantity_per_unit?: number
          sell_price?: number
          show_in_pricelist?: boolean
          show_on_website?: boolean
          sku?: string | null
          source?: string
          stk_wspl?: boolean
          stocked?: boolean
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          vat_paid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "supplies_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplies_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_categories: {
        Row: {
          abbrev: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          abbrev?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_currency_preferences: {
        Row: {
          currency_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          currency_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          currency_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          availability_mode: string
          last_heartbeat_at: string
          last_seen_at: string
          role_scope: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_mode?: string
          last_heartbeat_at?: string
          last_seen_at?: string
          role_scope?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_mode?: string
          last_heartbeat_at?: string
          last_seen_at?: string
          role_scope?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_price_overrides: {
        Row: {
          created_at: string
          currency_code: string
          custom_price: number
          id: string
          row_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          custom_price: number
          id?: string
          row_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          custom_price?: number
          id?: string
          row_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      walk_in_payments: {
        Row: {
          amount: number
          card_brand: string | null
          card_last4: string | null
          created_at: string
          created_by: string
          currency: string
          customer_email: string | null
          customer_name: string
          gateway_fail_rc: string | null
          gateway_oid: string | null
          gateway_response_code: string | null
          gateway_transaction_id: string | null
          id: string
          order_reference: string | null
          paid_at: string | null
          payment_reference: string
          provider: string
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          created_by: string
          currency?: string
          customer_email?: string | null
          customer_name: string
          gateway_fail_rc?: string | null
          gateway_oid?: string | null
          gateway_response_code?: string | null
          gateway_transaction_id?: string | null
          id?: string
          order_reference?: string | null
          paid_at?: string | null
          payment_reference: string
          provider?: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string
          gateway_fail_rc?: string | null
          gateway_oid?: string | null
          gateway_response_code?: string | null
          gateway_transaction_id?: string | null
          id?: string
          order_reference?: string | null
          paid_at?: string | null
          payment_reference?: string
          provider?: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      website_analytics_pageviews: {
        Row: {
          device_type: string
          id: number
          occurred_at: string
          pathname: string
          referrer_host: string
          session_id: string
          visitor_id: string
        }
        Insert: {
          device_type?: string
          id?: number
          occurred_at?: string
          pathname: string
          referrer_host?: string
          session_id: string
          visitor_id: string
        }
        Update: {
          device_type?: string
          id?: number
          occurred_at?: string
          pathname?: string
          referrer_host?: string
          session_id?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_analytics_pageviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "website_analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      website_analytics_sessions: {
        Row: {
          created_at: string
          device_type: string
          duration_seconds: number
          engaged: boolean
          id: string
          is_returning_visitor: boolean
          landing_path: string
          last_seen_at: string
          pageview_count: number
          referrer_host: string
          started_at: string
          updated_at: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string
          duration_seconds?: number
          engaged?: boolean
          id?: string
          is_returning_visitor?: boolean
          landing_path?: string
          last_seen_at?: string
          pageview_count?: number
          referrer_host?: string
          started_at?: string
          updated_at?: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          device_type?: string
          duration_seconds?: number
          engaged?: boolean
          id?: string
          is_returning_visitor?: boolean
          landing_path?: string
          last_seen_at?: string
          pageview_count?: number
          referrer_host?: string
          started_at?: string
          updated_at?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      website_analytics_web_vitals: {
        Row: {
          device_type: string
          id: number
          metric_delta: number
          metric_id: string
          metric_name: string
          metric_rating: string
          metric_value: number
          occurred_at: string
          pathname: string
          session_id: string
          visitor_id: string
        }
        Insert: {
          device_type?: string
          id?: number
          metric_delta?: number
          metric_id: string
          metric_name: string
          metric_rating?: string
          metric_value: number
          occurred_at?: string
          pathname: string
          session_id: string
          visitor_id: string
        }
        Update: {
          device_type?: string
          id?: number
          metric_delta?: number
          metric_id?: string
          metric_name?: string
          metric_rating?: string
          metric_value?: number
          occurred_at?: string
          pathname?: string
          session_id?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_analytics_web_vitals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "website_analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      website_features: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          label: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          label: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          label?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wholesale_inquiries: {
        Row: {
          business_name: string
          business_type: string
          comments: string | null
          contact_name: string
          created_at: string
          email: string
          id: string
          location: string | null
          monthly_volume: string | null
          phone: string | null
          referral_source: string | null
          status: string
        }
        Insert: {
          business_name: string
          business_type?: string
          comments?: string | null
          contact_name: string
          created_at?: string
          email: string
          id?: string
          location?: string | null
          monthly_volume?: string | null
          phone?: string | null
          referral_source?: string | null
          status?: string
        }
        Update: {
          business_name?: string
          business_type?: string
          comments?: string | null
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          location?: string | null
          monthly_volume?: string | null
          phone?: string | null
          referral_source?: string | null
          status?: string
        }
        Relationships: []
      }
      wiki_headings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      addons_public: {
        Row: {
          auto_rule: Json | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          is_auto: boolean | null
          name: string | null
          price: number | null
          show_on_website: boolean | null
          sku: string | null
          sort_order: number | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          auto_rule?: Json | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_auto?: boolean | null
          name?: string | null
          price?: number | null
          show_on_website?: boolean | null
          sku?: string | null
          sort_order?: number | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_rule?: Json | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_auto?: boolean | null
          name?: string | null
          price?: number | null
          show_on_website?: boolean | null
          sku?: string | null
          sort_order?: number | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addons_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      balances_public: {
        Row: {
          account_number: string | null
          credit_limit: number | null
          current_balance: number | null
          customer_id: number | null
          last_payment_amount: number | null
          last_payment_date: string | null
          last_statement_amount: number | null
          last_statement_date: string | null
          synced_at: string | null
        }
        Insert: {
          account_number?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          customer_id?: number | null
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_statement_amount?: number | null
          last_statement_date?: string | null
          synced_at?: string | null
        }
        Update: {
          account_number?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          customer_id?: number | null
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_statement_amount?: number | null
          last_statement_date?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "balances_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "balances_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balances_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      catalog_live: {
        Row: {
          category: string | null
          cost: number | null
          created_at: string | null
          currency: string | null
          id: string | null
          is_active: boolean | null
          lenstype: string | null
          material: string | null
          mftype: string | null
          name: string | null
          product_id: string | null
          product_type: string | null
          sell_price: number | null
          sku: string | null
          supplier_id: string | null
          supplier_name: string | null
          updated_at: string | null
          web_enabled: boolean | null
          wspl_enabled: boolean | null
        }
        Relationships: []
      }
      customer_account_number_duplicates: {
        Row: {
          account_number: string | null
          customer_contact_ids: string[] | null
          customer_ids: number[] | null
          customer_is_erp: boolean[] | null
          customer_names: string[] | null
          duplicate_count: number | null
        }
        Relationships: []
      }
      customer_order_health: {
        Row: {
          avg_gap_days: number | null
          contact_id: string | null
          health: string | null
          last_order_date: string | null
          name: string | null
          orders_last_30_days: number | null
          pipeline: string | null
          quiet_days: number | null
          stage: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_pipeline_fkey"
            columns: ["pipeline"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["key"]
          },
        ]
      }
      customer_payment_profile_public: {
        Row: {
          account_number: string | null
          customer_id: number | null
          default_payment_type: number | null
          eft_institution_name: string | null
          name: string | null
          pay_by_card: boolean | null
          pay_by_eft: boolean | null
        }
        Insert: {
          account_number?: string | null
          customer_id?: number | null
          default_payment_type?: number | null
          eft_institution_name?: string | null
          name?: string | null
          pay_by_card?: boolean | null
          pay_by_eft?: boolean | null
        }
        Update: {
          account_number?: string | null
          customer_id?: number | null
          default_payment_type?: number | null
          eft_institution_name?: string | null
          name?: string | null
          pay_by_card?: boolean | null
          pay_by_eft?: boolean | null
        }
        Relationships: []
      }
      integration_health_metrics_dashboard: {
        Row: {
          error_rate: number | null
          integration_connection_id: string | null
          lag_behind_source_seconds: number | null
          last_successful_run_at: string | null
          provider: string | null
          records_processed_per_run: number | null
          tenant_key: string | null
        }
        Relationships: []
      }
      lenses_public: {
        Row: {
          id: string | null
          is_active: boolean | null
          lenstype_id: string | null
          material_id: string | null
          mftype_id: string | null
          name: string | null
          notes: string | null
          sell_price: number | null
          show_on_website: boolean | null
        }
        Insert: {
          id?: string | null
          is_active?: boolean | null
          lenstype_id?: string | null
          material_id?: string | null
          mftype_id?: string | null
          name?: string | null
          notes?: string | null
          sell_price?: number | null
          show_on_website?: boolean | null
        }
        Update: {
          id?: string | null
          is_active?: boolean | null
          lenstype_id?: string | null
          material_id?: string | null
          mftype_id?: string | null
          name?: string | null
          notes?: string | null
          sell_price?: number | null
          show_on_website?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "lenses_lenstype_id_fkey"
            columns: ["lenstype_id"]
            isOneToOne: false
            referencedRelation: "lenstypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_mftype_id_fkey"
            columns: ["mftype_id"]
            isOneToOne: false
            referencedRelation: "mftypes"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_score_summary: {
        Row: {
          detractors: number | null
          nps_score: number | null
          passives: number | null
          promoters: number | null
          total_responses: number | null
          trigger_context: string | null
        }
        Relationships: []
      }
      pricelist_variance: {
        Row: {
          custom_price: number | null
          customer_id: number | null
          delta: number | null
          item_ref: string | null
          master_price: number | null
          pct: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pricelist_lines_item_ref_fkey"
            columns: ["item_ref"]
            isOneToOne: false
            referencedRelation: "pricing_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricelists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "pricelists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricelists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      quote_lines_customer: {
        Row: {
          created_at: string | null
          description_override: string | null
          group_key: string | null
          id: string | null
          item_name: string | null
          line_note: string | null
          line_type: string | null
          parent_line_id: string | null
          product_id: string | null
          qty: number | null
          quote_id: string | null
          sku: string | null
          sort_order: number | null
          unit_sell_price_bbd: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_override?: string | null
          group_key?: string | null
          id?: string | null
          item_name?: string | null
          line_note?: string | null
          line_type?: string | null
          parent_line_id?: string | null
          product_id?: string | null
          qty?: number | null
          quote_id?: string | null
          sku?: string | null
          sort_order?: number | null
          unit_sell_price_bbd?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_override?: string | null
          group_key?: string | null
          id?: string | null
          item_name?: string | null
          line_note?: string | null
          line_type?: string | null
          parent_line_id?: string | null
          product_id?: string | null
          qty?: number | null
          quote_id?: string | null
          sku?: string | null
          sort_order?: number | null
          unit_sell_price_bbd?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_parent_line_id_fkey"
            columns: ["parent_line_id"]
            isOneToOne: false
            referencedRelation: "quote_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_parent_line_id_fkey"
            columns: ["parent_line_id"]
            isOneToOne: false
            referencedRelation: "quote_lines_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_customer"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes_customer: {
        Row: {
          account_id: number | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_name: string | null
          grand_total: number | null
          helpdesk_ticket_id: string | null
          id: string | null
          lead_time_days: number | null
          notes_customer: string | null
          quote_number: string | null
          quote_type: string | null
          status: string | null
          subtotal_sell: number | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          account_id?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_name?: string | null
          grand_total?: number | null
          helpdesk_ticket_id?: string | null
          id?: string | null
          lead_time_days?: number | null
          notes_customer?: string | null
          quote_number?: string | null
          quote_type?: string | null
          status?: string | null
          subtotal_sell?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          account_id?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_name?: string | null
          grand_total?: number | null
          helpdesk_ticket_id?: string | null
          id?: string | null
          lead_time_days?: number | null
          notes_customer?: string | null
          quote_number?: string | null
          quote_type?: string | null
          status?: string | null
          subtotal_sell?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quotes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "quotes_helpdesk_ticket_id_fkey"
            columns: ["helpdesk_ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      scotia_payment_activity: {
        Row: {
          amount: number | null
          currency: string | null
          occurred_at: string | null
          payment_reference: string | null
          status: string | null
          transaction_type: string | null
        }
        Relationships: []
      }
      statement_lines_public: {
        Row: {
          account_number: string | null
          amount: number | null
          customer_id: number | null
          id: number | null
          invoice_id: number | null
          order_type: number | null
          patient: string | null
          post_date: string | null
          reference: string | null
          statement_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "statements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "statements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      statements_public: {
        Row: {
          account_number: string | null
          closing_balance: number | null
          customer_id: number | null
          discount: number | null
          due_date: string | null
          finance_charges: number | null
          id: string | null
          innovations_emailed: boolean | null
          opening_balance: number | null
          payments: number | null
          period_end: string | null
          period_start: string | null
          portal_emailed_at: string | null
          printed: boolean | null
          status: number | null
          synced_at: string | null
          void: boolean | null
        }
        Insert: {
          account_number?: string | null
          closing_balance?: number | null
          customer_id?: number | null
          discount?: number | null
          due_date?: string | null
          finance_charges?: number | null
          id?: never
          innovations_emailed?: boolean | null
          opening_balance?: number | null
          payments?: number | null
          period_end?: string | null
          period_start?: string | null
          portal_emailed_at?: string | null
          printed?: boolean | null
          status?: number | null
          synced_at?: string | null
          void?: boolean | null
        }
        Update: {
          account_number?: string | null
          closing_balance?: number | null
          customer_id?: number | null
          discount?: number | null
          due_date?: string | null
          finance_charges?: number | null
          id?: never
          innovations_emailed?: boolean | null
          opening_balance?: number | null
          payments?: number | null
          period_end?: string | null
          period_start?: string | null
          portal_emailed_at?: string | null
          printed?: boolean | null
          status?: number | null
          synced_at?: string | null
          void?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "statements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_profile_public"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "statements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "stock_lens_eligible_accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      stock_lens_eligible_accounts: {
        Row: {
          account_id: number | null
          pricelist_version_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_assigned_pricelist_id_fkey"
            columns: ["pricelist_version_id"]
            isOneToOne: false
            referencedRelation: "pricelist_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      store_product_variant_summary: {
        Row: {
          active_variants: number | null
          low_stock_variants: number | null
          max_price: number | null
          min_price: number | null
          product_id: string | null
          product_type: string | null
          total_variants: number | null
        }
        Relationships: []
      }
      store_product_variants_public: {
        Row: {
          attributes: Json | null
          id: string | null
          low_stock_threshold: number | null
          metadata: Json | null
          opc_code: string | null
          price: number | null
          product_id: string | null
          product_type: string | null
          sku: string | null
          stock_qty: number | null
          title: string | null
          variant_key: string | null
        }
        Insert: {
          attributes?: Json | null
          id?: string | null
          low_stock_threshold?: number | null
          metadata?: Json | null
          opc_code?: string | null
          price?: number | null
          product_id?: string | null
          product_type?: string | null
          sku?: string | null
          stock_qty?: number | null
          title?: string | null
          variant_key?: string | null
        }
        Update: {
          attributes?: Json | null
          id?: string | null
          low_stock_threshold?: number | null
          metadata?: Json | null
          opc_code?: string | null
          price?: number | null
          product_id?: string | null
          product_type?: string | null
          sku?: string | null
          stock_qty?: number | null
          title?: string | null
          variant_key?: string | null
        }
        Relationships: []
      }
      supplies_public: {
        Row: {
          category: string | null
          description: string | null
          id: string | null
          image_url: string | null
          name: string | null
          quantity_per_unit: number | null
          sell_price: number | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          quantity_per_unit?: number | null
          sell_price?: number | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          quantity_per_unit?: number | null
          sell_price?: number | null
          unit?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _price_stock_order_items: {
        Args: { p_items: Json; p_pricelist_version_id: number }
        Returns: {
          order_total: number
          priced_items: Json
        }[]
      }
      add_variant_items_to_cart: {
        Args: { p_items: Json; p_target_user_id?: string }
        Returns: number
      }
      api_get_or_create_catalog_draft: {
        Args: { p_api_key_id: string }
        Returns: number
      }
      apply_contact_enrichment: {
        Args: { p_contact_id: string; p_finding_ids: string[] }
        Returns: number
      }
      approve_pending_payment: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      approve_rx_submission: {
        Args: { p_dispatch_provider?: string; p_id: string }
        Returns: undefined
      }
      assign_customer_account_number: {
        Args: { p_account_number: string; p_customer_id: number }
        Returns: {
          account_number: string
          conflict_account_number: string
          conflict_customer_id: number
          conflict_customer_name: string
          customer_id: number
          message: string
          ok: boolean
          status: string
        }[]
      }
      audit_product_cost_rls: {
        Args: never
        Returns: {
          issue: string
          object_name: string
          object_type: string
        }[]
      }
      begin_gatekeeper_status_pull: {
        Args: { p_force?: boolean }
        Returns: boolean
      }
      build_rx_submission_payload: {
        Args: { p_quote_id: string }
        Returns: Json
      }
      bulk_toggle_anchor_exclusion: {
        Args: { p_excluded: boolean; p_lens_ids: string[]; p_reason?: string }
        Returns: number
      }
      cache_gatekeeper_auth_token: {
        Args: { p_actor_user_id?: string; p_auth_token: string }
        Returns: undefined
      }
      can_access_customer_lab_pricing: {
        Args: { p_customer_id?: number; p_user_id?: string }
        Returns: boolean
      }
      can_access_customer_portal_feature: {
        Args: { p_feature_key?: string; p_user_id?: string }
        Returns: boolean
      }
      can_access_customer_pricing: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      can_access_customer_statement: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      can_access_financial_data: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      can_access_portal_account: {
        Args: { p_customer_id: number; p_user_id?: string }
        Returns: boolean
      }
      can_access_portal_account_feature: {
        Args: {
          p_customer_id: number
          p_feature_key: string
          p_user_id?: string
        }
        Returns: boolean
      }
      cancel_integration_sync_job: {
        Args: { p_sync_job_id: string }
        Returns: undefined
      }
      cancel_order: {
        Args: { p_order_id: string; p_reason: string }
        Returns: undefined
      }
      cancel_rx_submission: { Args: { p_id: string }; Returns: undefined }
      cancel_stock_order_submission: {
        Args: { p_id: string }
        Returns: undefined
      }
      claim_live_data_gateway_request: {
        Args: { p_agent_key_id: string }
        Returns: {
          arguments: Json
          expires_at: string
          id: string
          operation: string
          source: string
          target: Json
        }[]
      }
      close_helpdesk_ticket_by_token: {
        Args: { p_token: string }
        Returns: boolean
      }
      close_helpdesk_ticket_for_participant: {
        Args: { p_ticket_id: string }
        Returns: boolean
      }
      confirm_account_payment: {
        Args: { p_bank_reference?: string; p_payment_id: string }
        Returns: string
      }
      create_api_key: {
        Args: { p_expires_at?: string; p_name: string; p_scopes: string[] }
        Returns: Json
      }
      create_pending_statement_payment: {
        Args: {
          p_account_number?: string
          p_actor_user_id?: string
          p_amount: number
          p_crm_customer_id?: number
          p_statement_id?: string
        }
        Returns: {
          amount_bbd: number
          amount_usd: number
          fx_rate_bbd_per_usd: number
          payment_id: string
        }[]
      }
      create_walk_in_payment: {
        Args: {
          p_amount: number
          p_customer_email?: string
          p_customer_name: string
          p_order_reference?: string
          p_reason?: string
        }
        Returns: string
      }
      crm_dashboard_kpis: {
        Args: { p_end_date?: string; p_period?: string; p_start_date?: string }
        Returns: {
          avg_markup: number
          contacts_count: number
          landed_costing_total: number
          open_opportunities: number
          overdue_activities: number
          period_end: string
          period_start: string
          price_items_count: number
          quote_acceptance_rate: number
        }[]
      }
      delete_ai_agent_settings: {
        Args: { p_actor_user_id?: string; p_provider: string }
        Returns: undefined
      }
      effective_price: {
        Args: { p_customer_id: number; p_item_ref: string }
        Returns: number
      }
      effective_prices_for_customer: {
        Args: { p_customer_id: number }
        Returns: {
          item_ref: string
          material: string
          price: number
          tier: string
          treatment: string
        }[]
      }
      enqueue_due_odoo_sync_jobs: { Args: never; Returns: number }
      find_customer_by_account_number: {
        Args: { p_account_number: string }
        Returns: {
          account_number: string
          id: number
          innovations_customer_id: number
          name: string
        }[]
      }
      get_active_usd_fx_rate: { Args: never; Returns: number }
      get_addons_safe: {
        Args: never
        Returns: {
          auto_rule: Json
          category: string
          cost: number
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_auto: boolean
          name: string
          price: number
          show_on_website: boolean
          sku: string
          sort_order: number
          supplier_id: string
          updated_at: string
        }[]
      }
      get_ai_agent_credentials: {
        Args: { p_provider: string }
        Returns: {
          api_key: string
          enabled: boolean
          model: string
        }[]
      }
      get_all_orders_admin: {
        Args: { p_limit?: number; p_offset?: number; p_status_filter?: string }
        Returns: {
          checkout_method: string
          contact_email: string
          contact_phone: string
          created_at: string
          customer_name: string
          id: string
          payment_provider: string
          payment_status: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }[]
      }
      get_customer_command_center: {
        Args: { p_customer_id?: number }
        Returns: Json
      }
      get_customer_payment_profile: {
        Args: { p_customer_id?: number }
        Returns: {
          account_number: string
          customer_id: number
          default_payment_type: string
          eft_institution_name: string
          name: string
          pay_by_card: boolean
          pay_by_eft: boolean
        }[]
      }
      get_customer_quote_lines: {
        Args: { p_quote_id: string }
        Returns: {
          assistance_note: string
          created_at: string
          description_override: string
          group_key: string
          id: string
          innovations_alias: string
          item_name: string
          line_note: string
          line_type: string
          needs_assistance: boolean
          parent_line_id: string
          product_id: string
          qty: number
          quote_id: string
          sku: string
          sort_order: number
          unit_sell_price_bbd: number
          updated_at: string
        }[]
      }
      get_dhl_express_credentials: {
        Args: never
        Returns: {
          account_number: string
          api_password: string
          api_username: string
          enabled: boolean
          environment: string
        }[]
      }
      get_gatekeeper_connection_credentials: {
        Args: never
        Returns: {
          auth_token: string
          auth_token_expires_at: string
          environment: string
          jwt_key: string
          jwt_secret: string
          lab_name: string
          last_auth_refresh_at: string
          origin_lab_id: string
        }[]
      }
      get_gatekeeper_credentials: {
        Args: never
        Returns: {
          auth_token: string
          auth_token_expires_at: string
          contract_id: string
          enabled: boolean
          environment: string
          hash_routing: string
          jwt_key: string
          jwt_secret: string
          last_auth_refresh_at: string
          receiver_lab_id: string
          receiver_retailer_name: string
        }[]
      }
      get_integration_connection_secret: {
        Args: { p_connection_id: string }
        Returns: string
      }
      get_lead_provider_credentials: {
        Args: { p_tenant_key?: string }
        Returns: Json
      }
      get_lenses_safe: {
        Args: never
        Returns: {
          add_max: number
          add_min: number
          base_price: number
          brand_id: string
          created_at: string
          cyl_max: number
          cyl_min: number
          finishtype_id: string
          full_lab: boolean
          id: string
          index_value: number
          is_active: boolean
          lenstype_id: string
          material_id: string
          mftype_id: string
          name: string
          notes: string
          sell_price: number
          show_in_pricelist: boolean
          show_in_ws_pricelist: boolean
          show_on_website: boolean
          sph_max: number
          sph_min: number
          supplier_id: string
          updated_at: string
        }[]
      }
      get_portal_account_memberships: {
        Args: { p_user_id?: string }
        Returns: {
          access_role: string
          account_number: string
          assigned_pricelist_id: number
          can_access_pricing: boolean
          can_access_statements: boolean
          contact_id: string
          customer_id: number
          customer_name: string
          feature_overrides: Json
          is_default: boolean
          membership_id: string
          membership_status: string
          payment_terms: string
          portal_orders_use_bill_to_account: boolean
        }[]
      }
      get_portal_erp_account_number: { Args: never; Returns: string }
      get_portal_erp_order_lookup: {
        Args: never
        Returns: {
          account_number: string
          portal_orders_use_bill_to_account: boolean
        }[]
      }
      get_quote_lines_safe: {
        Args: { p_quote_id: string }
        Returns: {
          created_at: string
          description_override: string
          gp_amount: number
          gp_percent: number
          group_key: string
          id: string
          item_name: string
          line_type: string
          override_note: string
          override_reason: string
          parent_line_id: string
          price_override: boolean
          product_id: string
          profit_status: string
          qty: number
          quote_id: string
          sku: string
          sort_order: number
          threshold_percent: number
          threshold_status: string
          unit_base_price_bbd: number
          unit_cost_landed_bbd: number
          unit_sell_price_bbd: number
          updated_at: string
        }[]
      }
      get_scotia_credentials: {
        Args: never
        Returns: {
          currency: string
          enabled: boolean
          environment: string
          shared_secret: string
          store_id: string
          timezone: string
        }[]
      }
      get_stock_order_catalog: {
        Args: { p_account_id: number }
        Returns: {
          category: string
          has_variants: boolean
          name: string
          price_source: string
          product_id: string
          product_type: string
          sku: string
          source_trail: Json
          unit_cost: number
          unit_price: number
        }[]
      }
      get_store_product_variants_public: {
        Args: { p_product_id: string; p_product_type: string }
        Returns: {
          allow_backorder: boolean
          attributes: Json
          id: string
          is_active: boolean
          low_stock_threshold: number
          metadata: Json
          opc_code: string
          price: number
          product_id: string
          product_type: string
          reserved_qty: number
          sku: string
          sort_order: number
          stock_qty: number
          title: string
          variant_key: string
        }[]
      }
      get_supplies_safe: {
        Args: never
        Returns: {
          base_price: number
          bb_item: boolean
          bin: string
          brand_id: string
          category: string
          created_at: string
          currency: string
          description: string
          detail: string
          duty_added: boolean
          id: string
          image_url: string
          is_active: boolean
          labour_added: boolean
          name: string
          notes: string
          preferred: boolean
          quantity_per_unit: number
          sell_price: number
          show_in_pricelist: boolean
          show_on_website: boolean
          sku: string
          stk_wspl: boolean
          stocked: boolean
          supplier_id: string
          unit: string
          updated_at: string
          vat_paid: boolean
        }[]
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_edit_role: { Args: { _user_id: string }; Returns: boolean }
      has_restricted_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_staff_role: { Args: { _user_id: string }; Returns: boolean }
      insert_helpdesk_ticket_autoresponse: {
        Args: { p_ticket_id: string }
        Returns: undefined
      }
      integration_secret_encryption_key: { Args: never; Returns: string }
      is_credit_approved_portal_user: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      list_lead_provider_credentials_status: {
        Args: { p_tenant_key?: string }
        Returns: {
          configured: boolean
          provider: string
          updated_at: string
        }[]
      }
      list_staff_names: {
        Args: never
        Returns: {
          name: string
          user_id: string
        }[]
      }
      log_gatekeeper_dispatch: {
        Args: {
          p_action: string
          p_actor_user_id?: string
          p_alert?: boolean
          p_duration_ms?: number
          p_endpoint?: string
          p_error_message?: string
          p_http_method?: string
          p_http_status?: number
          p_order_kind?: string
          p_phase?: string
          p_request?: Json
          p_response?: Json
          p_submission_id?: string
          p_success: boolean
        }
        Returns: string
      }
      log_integration_event: {
        Args: {
          p_event_name: string
          p_integration_connection_id: string
          p_log_level: string
          p_payload?: Json
          p_provider: string
          p_tenant_key: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_actor_role?: string
          p_actor_user_id?: string
          p_category: string
          p_event_type: string
          p_ip_hint?: string
          p_occurred_at?: string
          p_payload?: Json
          p_request_id?: string
          p_severity?: string
          p_source_function?: string
          p_source_path?: string
          p_status_code?: number
          p_user_agent?: string
        }
        Returns: string
      }
      manage_integration_sync_error: {
        Args: { p_action: string; p_error_id: string }
        Returns: undefined
      }
      next_billing_number: {
        Args: { p_document_type: string }
        Returns: string
      }
      normalized_customer_account_number: {
        Args: { p_account_number: string }
        Returns: string
      }
      payment_secret_encryption_key: { Args: never; Returns: string }
      place_customer_order: {
        Args: {
          p_actor_user_id?: string
          p_checkout?: Json
          p_items: Json
          p_target_user_id: string
        }
        Returns: string
      }
      place_customer_order_v2: {
        Args: {
          p_actor_user_id?: string
          p_checkout?: Json
          p_items: Json
          p_target_user_id: string
        }
        Returns: string
      }
      place_customer_order_with_shipping: {
        Args: {
          p_actor_user_id?: string
          p_checkout?: Json
          p_items: Json
          p_shipping_amount?: number
          p_target_user_id: string
        }
        Returns: string
      }
      place_rx_order_direct: {
        Args: { p_checkout?: Json; p_items: Json }
        Returns: string
      }
      portal_assigned_pricelist_addons: {
        Args: { p_customer_id?: number }
        Returns: {
          bbd_price: number
          catalog_type: string
          display_description: string
          item_id: string
          row_key: string
          row_type: string
          section: string
          sort_order: number
        }[]
      }
      portal_assigned_pricelist_catalog: {
        Args: { p_catalog_type: string; p_customer_id?: number }
        Returns: {
          bbd_price: number
          catalog_type: string
          display_description: string
          item_id: string
          row_key: string
          row_type: string
          section: string
          sort_order: number
        }[]
      }
      portal_assigned_pricelist_details: {
        Args: { p_customer_id?: number }
        Returns: {
          name: string
          updated_at: string
        }[]
      }
      portal_assigned_pricelist_matrix: {
        Args: { p_customer_id?: number }
        Returns: {
          allocated_price_bbd: number
          category: string
          material_index: string
          treatment_type: string
        }[]
      }
      portal_assigned_pricelist_updated_at: {
        Args: { p_customer_id?: number }
        Returns: string
      }
      portal_membership_has_contact_tag: {
        Args: {
          p_customer_id: number
          p_tag_names: string[]
          p_user_id: string
        }
        Returns: boolean
      }
      portal_pricing_currency_settings: {
        Args: never
        Returns: {
          bbd_per_unit: number
          currency_code: string
          is_default: boolean
        }[]
      }
      portal_rx_pricing_structure: {
        Args: { p_customer_id?: number }
        Returns: Json
      }
      profile_privileged_fields_match: {
        Args: {
          _crm_contact_id: string
          _crm_customer_id: number
          _id: string
          _portal_access_approved_override: boolean
          _portal_access_status: string
          _user_id: string
        }
        Returns: boolean
      }
      publish_lens_recommendation_rule_set: {
        Args: { p_rule_set_id: string }
        Returns: undefined
      }
      qbo_consume_rate_limit: {
        Args: {
          p_bucket_key: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      queue_abandoned_cart_alerts: {
        Args: { p_cutoff_hours?: number }
        Returns: Json
      }
      queue_account_payment_receipt: {
        Args: { p_kind: string; p_payment_id: string }
        Returns: undefined
      }
      recommend_lenses: { Args: { p_input: Json }; Returns: Json }
      record_ai_agent_test: {
        Args: {
          p_actor_user_id?: string
          p_error_message?: string
          p_provider: string
          p_success: boolean
        }
        Returns: undefined
      }
      record_assistant_editorial_signal: {
        Args: {
          p_audience: string
          p_outcome: string
          p_route: string
          p_session_hash: string
          p_topic_key: string
        }
        Returns: {
          agent_activity_id: string
          editorial_activity_id: string
          qualified: boolean
          source_count: number
        }[]
      }
      record_customer_portal_login: { Args: never; Returns: string }
      record_dhl_express_test: {
        Args: {
          p_actor_user_id?: string
          p_error_message?: string
          p_success: boolean
        }
        Returns: undefined
      }
      record_edge_function_health: {
        Args: { p_checks: Json; p_release_sha: string; p_source: string }
        Returns: string
      }
      record_gatekeeper_result: {
        Args: {
          p_error_message?: string
          p_order_kind?: string
          p_receipt?: Json
          p_submission_id: string
          p_success: boolean
        }
        Returns: undefined
      }
      record_gatekeeper_status: {
        Args: {
          p_detail?: string
          p_order_kind: string
          p_status: string
          p_submission_id: string
        }
        Returns: undefined
      }
      record_incident_runbook_execution: {
        Args: {
          p_completed_at?: string
          p_executed_by: string
          p_incident_key: string
          p_notes?: string
          p_runbook_name: string
          p_started_at?: string
          p_status?: string
        }
        Returns: string
      }
      record_payment_gateway_test: {
        Args: { p_actor_user_id?: string; p_success: boolean }
        Returns: undefined
      }
      redact_pii_jsonb: { Args: { p_payload: Json }; Returns: Json }
      redact_security_payload: { Args: { p_payload: Json }; Returns: Json }
      release_stock_order_submission: {
        Args: { p_dispatch_provider?: string; p_id: string }
        Returns: undefined
      }
      replace_gatekeeper_contracts: {
        Args: { p_actor_user_id?: string; p_contracts: Json }
        Returns: undefined
      }
      resolve_contact_customer_links: { Args: never; Returns: number }
      resolve_non_erp_duplicate_account_link: {
        Args: { p_account_number: string }
        Returns: {
          account_number: string
          canonical_customer_id: number
          cleared_customer_ids: number[]
          message: string
          ok: boolean
          status: string
        }[]
      }
      resolve_stock_order_price: {
        Args: {
          p_account_id: number
          p_manual_price?: number
          p_manual_reason?: string
          p_product_id: string
          p_product_type: string
        }
        Returns: {
          price_source: string
          source_trail: Json
          unit_cost: number
          unit_price: number
        }[]
      }
      revert_account_to_master: {
        Args: { p_customer_id: number }
        Returns: undefined
      }
      revert_line_to_master: {
        Args: { p_customer_id: number; p_item_ref: string }
        Returns: undefined
      }
      revert_on_account_order_to_draft: {
        Args: { p_order_id: string }
        Returns: string
      }
      revoke_api_key: { Args: { p_id: string }; Returns: undefined }
      save_stock_order_as_quote: {
        Args: { p_submission_id: string }
        Returns: {
          docstudio_document_id: string
          quote_id: string
          quote_number: string
        }[]
      }
      save_stock_order_draft: {
        Args: {
          p_account_id?: number
          p_instructions?: string
          p_items?: Json
          p_order_reference?: string
          p_po_number?: string
          p_submission_id?: string
        }
        Returns: {
          order_total: number
          submission_id: string
        }[]
      }
      select_contacts_for_enrichment: {
        Args: { p_limit?: number; p_mode?: string }
        Returns: {
          business_name: string
          city: string
          country: string
          country_code: string
          google_place_id: string
          id: string
          innovations_contact_id: number
          name: string
          phone: string
          state: string
          street: string
          website: string
          zip: string
        }[]
      }
      send_helpdesk_ticket_message: {
        Args: {
          p_body: string
          p_client_message_id: string
          p_internal_note?: boolean
          p_ticket_id: string
        }
        Returns: {
          body: string
          client_message_id: string
          created_at: string
          direction: string
          id: string
          sender_email: string
          sender_name: string
          sender_user_id: string
          sent_at: string
          ticket_id: string
        }[]
      }
      set_custom_price: {
        Args: {
          p_customer_id: number
          p_item_ref: string
          p_price: number
          p_reason?: string
          p_source?: string
        }
        Returns: undefined
      }
      set_gatekeeper_delivery_route: {
        Args: {
          p_actor_user_id?: string
          p_contract_id: string
          p_enabled: boolean
        }
        Returns: undefined
      }
      set_master_price: {
        Args: { p_item_ref: string; p_price: number }
        Returns: undefined
      }
      settle_scotia_payment: {
        Args: { p_actor_user_id?: string; p_gateway?: Json; p_order_id: string }
        Returns: string
      }
      settle_statement_payment: {
        Args: { p_gateway?: Json; p_payment_id: string }
        Returns: string
      }
      settle_walk_in_payment: {
        Args: { p_gateway?: Json; p_payment_id: string }
        Returns: string
      }
      stage_stock_order_submission: {
        Args: {
          p_account_id: number
          p_instructions: string
          p_items: Json
          p_order_reference: string
          p_po_number: string
        }
        Returns: {
          order_total: number
          submission_id: string
        }[]
      }
      store_gatekeeper_connection: {
        Args: {
          p_actor_user_id?: string
          p_auth_token: string
          p_contracts: Json
          p_environment: string
          p_jwt_key: string
          p_jwt_secret: string
          p_lab_name: string
          p_origin_lab_id: string
        }
        Returns: undefined
      }
      submit_customer_quote_request: {
        Args: {
          p_account_id?: number
          p_customer_name: string
          p_request_details: string
        }
        Returns: {
          quote_id: string
          quote_number: string
          ticket_id: string
          ticket_number: string
        }[]
      }
      sync_customer_portal_identity: {
        Args: { p_user_id?: string }
        Returns: {
          assigned_pricelist_id: number
          crm_contact_id: string
          crm_customer_id: number
          customer_name: string
          email_verified: boolean
          organization_name: string
          payment_terms: string
          portal_access_note: string
          portal_access_status: string
          profile_completed: boolean
          profile_id: string
        }[]
      }
      timeout_stale_integration_sync_jobs: { Args: never; Returns: number }
      toggle_anchor_exclusion: {
        Args: { p_excluded: boolean; p_lens_id: string; p_reason?: string }
        Returns: undefined
      }
      transition_crm_activity: {
        Args: {
          p_activity_id: string
          p_due_at?: string
          p_state: string
          p_update_due?: boolean
        }
        Returns: {
          activity_id: string
          approved_at: string | null
          approved_by: string | null
          automation_id: string
          created_at: string
          error: string | null
          executed_at: string | null
          id: string
          idempotency_key: string
          proposed_action: Json
          result: Json | null
          status: string
          trigger_state: string
        }[]
        SetofOptions: {
          from: "*"
          to: "activity_automation_runs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      trigger_integration_sync_job: {
        Args: { p_provider: string; p_sync_kind: string; p_tenant_key: string }
        Returns: string
      }
      update_api_key_scopes: {
        Args: { p_id: string; p_scopes: string[] }
        Returns: undefined
      }
      upsert_ai_agent_settings: {
        Args: {
          p_actor_user_id?: string
          p_api_key?: string
          p_enabled?: boolean
          p_model?: string
          p_provider: string
        }
        Returns: string
      }
      upsert_dhl_express_settings: {
        Args: {
          p_account_number: string
          p_actor_user_id?: string
          p_api_password?: string
          p_api_username?: string
          p_enabled?: boolean
          p_environment?: string
        }
        Returns: string
      }
      upsert_integration_connection:
        | {
            Args: {
              p_auth_mode: string
              p_base_url: string
              p_conflict_policy: string
              p_credential_value: string
              p_database_name: string
              p_dry_run_enabled: boolean
              p_environment: string
              p_incremental_enabled: boolean
              p_provider: string
              p_sync_direction: string
              p_tenant_key: string
              p_user_identifier: string
            }
            Returns: string
          }
        | {
            Args: {
              p_auth_mode: string
              p_base_url: string
              p_conflict_policy: string
              p_credential_value: string
              p_database_name: string
              p_dry_run_enabled: boolean
              p_environment: string
              p_incremental_enabled: boolean
              p_provider: string
              p_sync_direction: string
              p_tenant_key: string
              p_test_connection?: boolean
              p_user_identifier: string
            }
            Returns: string
          }
      upsert_integration_connection_with_secret:
        | {
            Args: {
              p_auth_mode: string
              p_base_url: string
              p_conflict_policy: string
              p_credential_value: string
              p_database_name: string
              p_dry_run_enabled: boolean
              p_environment: string
              p_incremental_enabled: boolean
              p_provider: string
              p_sync_direction: string
              p_tenant_key: string
              p_user_identifier: string
            }
            Returns: string
          }
        | {
            Args: {
              p_auth_mode: string
              p_base_url: string
              p_conflict_policy: string
              p_credential_value: string
              p_database_name: string
              p_dry_run_enabled: boolean
              p_environment: string
              p_incremental_enabled: boolean
              p_provider: string
              p_sync_direction: string
              p_tenant_key: string
              p_test_connection?: boolean
              p_user_identifier: string
            }
            Returns: string
          }
      upsert_lead_provider_credential: {
        Args: {
          p_credential: string
          p_provider: string
          p_tenant_key?: string
        }
        Returns: undefined
      }
      upsert_payment_gateway_settings: {
        Args: {
          p_actor_user_id?: string
          p_currency?: string
          p_enabled?: boolean
          p_environment?: string
          p_shared_secret?: string
          p_store_id: string
          p_timezone?: string
        }
        Returns: string
      }
      upsert_presence_heartbeat: {
        Args: { p_role_scope?: string; p_status?: string }
        Returns: undefined
      }
      upsert_security_alert: {
        Args: {
          p_alert_type: string
          p_dedupe_key: string
          p_details?: Json
          p_severity: string
          p_title: string
        }
        Returns: string
      }
      upsert_website_analytics_session: {
        Args: { p_session: Json }
        Returns: undefined
      }
      verify_api_key: {
        Args: { p_token: string }
        Returns: {
          id: string
          name: string
          scopes: string[]
        }[]
      }
      verify_gatekeeper_status_pull_token: {
        Args: { p_token: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_task_channel: "todo" | "agent_todo"
      app_role: "admin" | "operator" | "viewer" | "customer"
      shipment_status: "draft" | "reviewed" | "locked"
      store_variant_mode:
        | "none"
        | "lens_grid"
        | "standard_options"
        | "service_config"
        | "generic_matrix"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      activity_task_channel: ["todo", "agent_todo"],
      app_role: ["admin", "operator", "viewer", "customer"],
      shipment_status: ["draft", "reviewed", "locked"],
      store_variant_mode: [
        "none",
        "lens_grid",
        "standard_options",
        "service_config",
        "generic_matrix",
      ],
    },
  },
} as const

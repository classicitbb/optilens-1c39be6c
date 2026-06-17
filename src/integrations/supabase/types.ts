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
    PostgrestVersion: "14.1"
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
      activities: {
        Row: {
          activity_type: string | null
          contact_id: string
          content: string | null
          created_at: string | null
          created_by: string | null
          due_at: string | null
          id: string
          opportunity_id: string | null
          status: string | null
          type: string
        }
        Insert: {
          activity_type?: string | null
          contact_id: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          due_at?: string | null
          id?: string
          opportunity_id?: string | null
          status?: string | null
          type: string
        }
        Update: {
          activity_type?: string | null
          contact_id?: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          due_at?: string | null
          id?: string
          opportunity_id?: string | null
          status?: string | null
          type?: string
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
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
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
            referencedRelation: "customers"
            referencedColumns: ["id"]
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
          instagram_handle: string | null
          is_archived: boolean
          is_company: boolean
          is_customer: boolean
          lead_score: number
          lead_source: string
          name: string
          notes: string | null
          parent_id: string | null
          phone: string | null
          pipeline_stage: string
          salesperson: string | null
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
          instagram_handle?: string | null
          is_archived?: boolean
          is_company?: boolean
          is_customer?: boolean
          lead_score?: number
          lead_source?: string
          name: string
          notes?: string | null
          parent_id?: string | null
          phone?: string | null
          pipeline_stage?: string
          salesperson?: string | null
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
          instagram_handle?: string | null
          is_archived?: boolean
          is_company?: boolean
          is_customer?: boolean
          lead_score?: number
          lead_source?: string
          name?: string
          notes?: string | null
          parent_id?: string | null
          phone?: string | null
          pipeline_stage?: string
          salesperson?: string | null
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
            foreignKeyName: "contacts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
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
          address: string | null
          assigned_pricelist_id: number | null
          contact_id: string | null
          created_at: string | null
          email: string | null
          id: number
          name: string
          notes: string | null
          phone: string | null
          pipeline_stage: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          assigned_pricelist_id?: number | null
          contact_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          name: string
          notes?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          assigned_pricelist_id?: number | null
          contact_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          name?: string
          notes?: string | null
          phone?: string | null
          pipeline_stage?: string | null
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
        ]
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
          category: string
          content: string
          content_type: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_public: boolean | null
          page_slug: string
          slug: string | null
          sort_order: number
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          category?: string
          content?: string
          content_type?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_public?: boolean | null
          page_slug: string
          slug?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          category?: string
          content?: string
          content_type?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_public?: boolean | null
          page_slug?: string
          slug?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
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
          created_at: string
          direction: string
          id: string
          sender_email: string | null
          sender_name: string | null
          sender_user_id: string | null
          sent_at: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          direction: string
          id?: string
          sender_email?: string | null
          sender_name?: string | null
          sender_user_id?: string | null
          sent_at?: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          direction?: string
          id?: string
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
      lenses: {
        Row: {
          add_max: number | null
          add_min: number | null
          base_price: number
          brand_id: string
          created_at: string
          cyl_max: number
          cyl_min: number
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
        ]
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
          avatar_url: string | null
          billing_address: Json | null
          bio: string | null
          created_at: string
          crm_contact_id: string | null
          crm_customer_id: number | null
          display_name: string | null
          email: string | null
          email_verified_at: string | null
          full_name: string | null
          id: string
          organization_name: string | null
          phone: string | null
          portal_access_note: string | null
          portal_access_status: string | null
          profile_completed_at: string | null
          shipping_address: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          billing_address?: Json | null
          bio?: string | null
          created_at?: string
          crm_contact_id?: string | null
          crm_customer_id?: number | null
          display_name?: string | null
          email?: string | null
          email_verified_at?: string | null
          full_name?: string | null
          id?: string
          organization_name?: string | null
          phone?: string | null
          portal_access_note?: string | null
          portal_access_status?: string | null
          profile_completed_at?: string | null
          shipping_address?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          billing_address?: Json | null
          bio?: string | null
          created_at?: string
          crm_contact_id?: string | null
          crm_customer_id?: number | null
          display_name?: string | null
          email?: string | null
          email_verified_at?: string | null
          full_name?: string | null
          id?: string
          organization_name?: string | null
          phone?: string | null
          portal_access_note?: string | null
          portal_access_status?: string | null
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
      quote_lines: {
        Row: {
          created_at: string
          description_override: string | null
          gp_amount: number
          gp_percent: number
          group_key: string | null
          id: string
          item_name: string
          line_note: string | null
          line_type: string
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
          created_at?: string
          description_override?: string | null
          gp_amount?: number
          gp_percent?: number
          group_key?: string | null
          id?: string
          item_name?: string
          line_note?: string | null
          line_type?: string
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
          created_at?: string
          description_override?: string | null
          gp_amount?: number
          gp_percent?: number
          group_key?: string | null
          id?: string
          item_name?: string
          line_note?: string | null
          line_type?: string
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
          account_id: string | null
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
          account_id?: string | null
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
          account_id?: string | null
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
        Relationships: []
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
          is_active: boolean
          labour_added: boolean
          name: string
          notes: string | null
          preferred: boolean
          quantity_per_unit: number
          sell_price: number
          show_in_pricelist: boolean
          show_on_website: boolean
          sku: string | null
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
          is_active?: boolean
          labour_added?: boolean
          name: string
          notes?: string | null
          preferred?: boolean
          quantity_per_unit?: number
          sell_price?: number
          show_in_pricelist?: boolean
          show_on_website?: boolean
          sku?: string | null
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
          is_active?: boolean
          labour_added?: boolean
          name?: string
          notes?: string | null
          preferred?: boolean
          quantity_per_unit?: number
          sell_price?: number
          show_in_pricelist?: boolean
          show_on_website?: boolean
          sku?: string | null
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
          account_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_name: string | null
          grand_total: number | null
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
          account_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_name?: string | null
          grand_total?: number | null
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
          account_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_name?: string | null
          grand_total?: number | null
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
        Relationships: []
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
          allow_backorder: boolean | null
          attributes: Json | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          low_stock_threshold: number | null
          metadata: Json | null
          opc_code: string | null
          price: number | null
          product_id: string | null
          product_type: string | null
          reserved_qty: number | null
          sku: string | null
          sort_order: number | null
          stock_qty: number | null
          title: string | null
          updated_at: string | null
          variant_key: string | null
        }
        Insert: {
          allow_backorder?: boolean | null
          attributes?: Json | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          metadata?: Json | null
          opc_code?: string | null
          price?: number | null
          product_id?: string | null
          product_type?: string | null
          reserved_qty?: number | null
          sku?: string | null
          sort_order?: number | null
          stock_qty?: number | null
          title?: string | null
          updated_at?: string | null
          variant_key?: string | null
        }
        Update: {
          allow_backorder?: boolean | null
          attributes?: Json | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          metadata?: Json | null
          opc_code?: string | null
          price?: number | null
          product_id?: string | null
          product_type?: string | null
          reserved_qty?: number | null
          sku?: string | null
          sort_order?: number | null
          stock_qty?: number | null
          title?: string | null
          updated_at?: string | null
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
      add_variant_items_to_cart: {
        Args: { p_items: Json; p_target_user_id?: string }
        Returns: number
      }
      approve_pending_payment: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      can_access_customer_portal_feature: {
        Args: { p_feature_key?: string; p_user_id?: string }
        Returns: boolean
      }
      cancel_integration_sync_job: {
        Args: { p_sync_job_id: string }
        Returns: undefined
      }
      close_helpdesk_ticket_by_token: {
        Args: { p_token: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_due_odoo_sync_jobs: { Args: never; Returns: number }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
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
      integration_secret_encryption_key: { Args: never; Returns: string }
      list_lead_provider_credentials_status: {
        Args: { p_tenant_key?: string }
        Returns: {
          configured: boolean
          provider: string
          updated_at: string
        }[]
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
      manage_integration_sync_error: {
        Args: { p_action: string; p_error_id: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
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
      queue_abandoned_cart_alerts: {
        Args: { p_cutoff_hours?: number }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      redact_pii_jsonb: { Args: { p_payload: Json }; Returns: Json }
      sync_customer_portal_identity: {
        Args: { p_user_id?: string }
        Returns: {
          assigned_pricelist_id: number
          crm_contact_id: string
          crm_customer_id: number
          customer_name: string
          email_verified: boolean
          organization_name: string
          portal_access_note: string
          portal_access_status: string
          profile_completed: boolean
          profile_id: string
        }[]
      }
      timeout_stale_integration_sync_jobs: { Args: never; Returns: number }
      trigger_integration_sync_job: {
        Args: { p_provider: string; p_sync_kind: string; p_tenant_key: string }
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
      upsert_presence_heartbeat: {
        Args: { p_role_scope?: string; p_status?: string }
        Returns: undefined
      }
    }
    Enums: {
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

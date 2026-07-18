# Datamation Supabase Schema Inventory

Source file: `tmp/datamation-schema-inventory.json`
Generated: 2026-07-16T21:15:19.319Z

## Summary

| Item |Count |
| --- |--- |
| relations |234 |
| columns |2506 |
| constraints |2076 |
| foreign keys |175 |
| indexes |493 |
| RLS policies |518 |
| triggers |88 |
| functions |240 |
| enum types |16 |
| extensions |8 |
| publications |1 |
| storage buckets |6 |

## Relation Summary

| Relation |Type |RLS |Estimated rows |Columns |Constraints |Indexes |Policies |
| --- |--- |--- |--- |--- |--- |--- |--- |
| auth.audit_log_entries |table |yes |0 |5 |3 |2 |0 |
| auth.custom_oauth_providers |table |no |0 |25 |37 |6 |0 |
| auth.flow_state |table |yes |0 |17 |5 |4 |0 |
| auth.identities |table |yes |0 |9 |8 |4 |0 |
| auth.instances |table |yes |0 |5 |2 |1 |0 |
| auth.mfa_amr_claims |table |yes |0 |5 |8 |2 |0 |
| auth.mfa_challenges |table |yes |0 |7 |6 |2 |0 |
| auth.mfa_factors |table |yes |0 |13 |9 |6 |0 |
| auth.oauth_authorizations |table |no |0 |17 |22 |4 |0 |
| auth.oauth_client_states |table |no |0 |4 |4 |2 |0 |
| auth.oauth_clients |table |no |0 |13 |13 |2 |0 |
| auth.oauth_consents |table |no |0 |6 |12 |5 |0 |
| auth.one_time_tokens |table |yes |0 |7 |10 |4 |0 |
| auth.refresh_tokens |table |yes |0 |9 |4 |7 |0 |
| auth.saml_providers |table |yes |0 |9 |10 |3 |0 |
| auth.saml_relay_states |table |yes |0 |8 |7 |4 |0 |
| auth.schema_migrations |table |yes |77 |1 |0 |1 |0 |
| auth.sessions |table |yes |0 |15 |6 |5 |0 |
| auth.sso_domains |table |yes |0 |5 |6 |3 |0 |
| auth.sso_providers |table |yes |0 |5 |3 |3 |0 |
| auth.users |table |yes |0 |35 |6 |15 |0 |
| auth.webauthn_challenges |table |no |0 |6 |8 |3 |0 |
| auth.webauthn_credentials |table |no |0 |14 |14 |3 |0 |
| cron.job |table |yes |0 |9 |0 |2 |1 |
| cron.job_run_details |table |yes |0 |10 |2 |1 |1 |
| extensions.pg_stat_statements |view |no |-1 |49 |0 |0 |0 |
| extensions.pg_stat_statements_info |view |no |-1 |2 |0 |0 |0 |
| net._http_response |table |no |0 |8 |1 |1 |0 |
| net.http_request_queue |table |no |0 |6 |4 |0 |0 |
| pgmq.a_auth_emails |table |no |0 |7 |6 |2 |0 |
| pgmq.a_auth_emails_dlq |table |no |0 |7 |6 |2 |0 |
| pgmq.a_transactional_emails |table |no |0 |7 |6 |2 |0 |
| pgmq.a_transactional_emails_dlq |table |no |0 |7 |6 |2 |0 |
| pgmq.meta |table |no |4 |4 |5 |1 |0 |
| pgmq.q_auth_emails |table |no |0 |6 |5 |2 |0 |
| pgmq.q_auth_emails_dlq |table |no |0 |6 |5 |2 |0 |
| pgmq.q_transactional_emails |table |no |0 |6 |5 |2 |0 |
| pgmq.q_transactional_emails_dlq |table |no |0 |6 |5 |2 |0 |
| public.abandoned_cart_alerts |table |yes |0 |12 |15 |2 |2 |
| public.activities |table |yes |0 |13 |9 |4 |4 |
| public.addon_pricing_sheets |table |yes |0 |5 |8 |2 |4 |
| public.addons |table |yes |0 |15 |15 |1 |5 |
| public.admin_notification_receipts |table |yes |0 |7 |9 |2 |2 |
| public.admin_notifications |table |yes |0 |10 |11 |3 |2 |
| public.analytics_crm_funnel_by_stage_period |view |no |-1 |7 |0 |0 |0 |
| public.analytics_daily_kpi |view |no |-1 |9 |0 |0 |0 |
| public.analytics_quote_costing_period |view |no |-1 |9 |0 |0 |0 |
| public.api_audit_log |table |yes |0 |10 |7 |1 |1 |
| public.api_keys |table |yes |0 |12 |11 |2 |1 |
| public.audit_log |table |yes |0 |10 |7 |4 |3 |
| public.balances |table |yes |0 |10 |4 |2 |2 |
| public.balances_public |view |no |-1 |9 |0 |0 |0 |
| public.bank_payment_portals |table |yes |0 |5 |4 |2 |2 |
| public.blog_posts |table |yes |0 |22 |14 |6 |2 |
| public.brands |table |yes |0 |7 |9 |2 |5 |
| public.cadence_enrollments |table |yes |0 |8 |9 |1 |2 |
| public.cadence_steps |table |yes |0 |7 |8 |2 |2 |
| public.cadences |table |yes |0 |7 |7 |1 |2 |
| public.campaign_activation_performance |table |yes |0 |18 |20 |2 |2 |
| public.campaign_activation_profiles |table |yes |0 |14 |16 |3 |2 |
| public.cart_drafts |table |yes |0 |9 |10 |2 |4 |
| public.cart_items |table |yes |0 |17 |13 |2 |4 |
| public.catalog_assignments |table |yes |0 |4 |3 |1 |3 |
| public.catalog_live |view |no |-1 |19 |0 |0 |0 |
| public.catalog_page_objects |table |yes |0 |16 |16 |1 |2 |
| public.catalog_pages |table |yes |0 |6 |9 |2 |2 |
| public.catalog_sections |table |yes |0 |9 |6 |1 |3 |
| public.catalog_templates |table |yes |0 |10 |4 |1 |3 |
| public.charge_types |table |yes |9 |6 |8 |2 |4 |
| public.company_settings |table |yes |1 |46 |45 |1 |2 |
| public.contact_external_links |table |yes |0 |14 |14 |4 |4 |
| public.contact_field_mappings |table |yes |18 |11 |13 |2 |4 |
| public.contact_sync_dead_letters |table |yes |0 |14 |15 |2 |1 |
| public.contact_sync_manual_review_queue |table |yes |0 |11 |10 |1 |1 |
| public.contact_sync_runs |table |yes |0 |15 |16 |1 |1 |
| public.contact_sync_states |table |yes |0 |13 |16 |3 |4 |
| public.contact_tag_links |table |yes |0 |3 |7 |2 |3 |
| public.contact_tags |table |yes |0 |6 |7 |1 |4 |
| public.contacts |table |yes |0 |49 |10 |8 |5 |
| public.crm_pipelines |table |yes |0 |4 |5 |1 |2 |
| public.customer_account_number_duplicates |view |no |-1 |4 |0 |0 |0 |
| public.customer_addresses |table |yes |0 |14 |16 |2 |4 |
| public.customer_automation_outbox |table |yes |0 |9 |11 |1 |1 |
| public.customer_order_health |view |no |-1 |9 |0 |0 |0 |
| public.customer_payment_methods |table |yes |0 |14 |21 |3 |4 |
| public.customer_payment_profile_public |view |no |-1 |7 |0 |0 |0 |
| public.customer_portal_feature_overrides |table |yes |0 |6 |10 |2 |2 |
| public.customer_pricing_access |table |yes |0 |4 |7 |2 |2 |
| public.customers |table |yes |0 |20 |7 |4 |4 |
| public.docstudio_billing_documents |table |yes |0 |21 |15 |2 |2 |
| public.docstudio_files |table |yes |0 |16 |12 |2 |2 |
| public.edge_function_health |table |yes |0 |8 |6 |2 |1 |
| public.edge_function_health_runs |table |yes |0 |8 |9 |2 |1 |
| public.email_send_log |table |yes |0 |8 |7 |5 |3 |
| public.email_send_state |table |yes |1 |7 |8 |1 |1 |
| public.email_unsubscribe_tokens |table |yes |0 |5 |7 |4 |3 |
| public.finishtypes |table |yes |0 |7 |9 |2 |5 |
| public.help_article_contexts |table |yes |0 |3 |6 |2 |4 |
| public.help_article_versions |table |yes |0 |8 |8 |1 |3 |
| public.help_articles |table |yes |0 |24 |18 |8 |5 |
| public.help_feedback |table |yes |0 |7 |8 |1 |3 |
| public.helpdesk_followup_queue |table |yes |0 |7 |8 |2 |6 |
| public.helpdesk_inbound_email_log |table |yes |0 |7 |7 |2 |1 |
| public.helpdesk_priorities |table |yes |6 |7 |7 |2 |2 |
| public.helpdesk_sla_policies |table |yes |0 |11 |10 |1 |4 |
| public.helpdesk_team_members |table |yes |0 |5 |8 |2 |2 |
| public.helpdesk_teams |table |yes |0 |9 |10 |2 |4 |
| public.helpdesk_ticket_events |table |yes |0 |6 |6 |4 |4 |
| public.helpdesk_ticket_messages |table |yes |0 |9 |10 |2 |4 |
| public.helpdesk_ticket_review_queue_items |table |yes |0 |12 |13 |3 |3 |
| public.helpdesk_ticket_sla_status |table |yes |0 |8 |10 |2 |3 |
| public.helpdesk_ticket_stages |table |yes |5 |8 |10 |2 |4 |
| public.helpdesk_ticket_tag_rel |table |yes |0 |3 |7 |2 |2 |
| public.helpdesk_ticket_tags |table |yes |0 |5 |7 |2 |2 |
| public.helpdesk_ticket_types |table |yes |7 |9 |10 |3 |2 |
| public.helpdesk_ticket_watchers |table |yes |0 |10 |11 |3 |6 |
| public.helpdesk_tickets |table |yes |0 |28 |21 |9 |4 |
| public.import_batches |table |yes |0 |9 |10 |1 |4 |
| public.import_ref_mappings |table |yes |0 |5 |7 |2 |4 |
| public.industries |table |yes |10 |6 |7 |1 |4 |
| public.innovations_sync_dead_letters |table |yes |0 |9 |8 |1 |1 |
| public.innovations_sync_requests |table |yes |0 |9 |7 |2 |1 |
| public.innovations_sync_runs |table |yes |0 |12 |12 |1 |1 |
| public.integration_audit_events |table |yes |0 |8 |8 |2 |1 |
| public.integration_conflict_queue |table |yes |0 |14 |13 |2 |1 |
| public.integration_sync_run_metrics |table |yes |0 |14 |10 |2 |1 |
| public.lead_audits |table |yes |0 |13 |10 |3 |4 |
| public.lead_events |table |yes |0 |7 |9 |5 |2 |
| public.lead_provider_credentials |table |yes |0 |6 |8 |2 |1 |
| public.lead_scoring_outcomes |table |yes |0 |8 |8 |1 |2 |
| public.lead_scoring_weights |table |yes |7 |6 |9 |2 |1 |
| public.lead_search_runs |table |yes |0 |12 |12 |4 |2 |
| public.lead_search_strategies |table |yes |4 |10 |11 |3 |2 |
| public.legacy_rates |table |yes |0 |10 |11 |2 |2 |
| public.lens_lens_options |table |yes |0 |4 |8 |2 |4 |
| public.lens_options |table |yes |0 |7 |9 |2 |4 |
| public.lenses |table |yes |0 |31 |29 |1 |5 |
| public.lenstypes |table |yes |0 |7 |9 |2 |5 |
| public.live_data_gateway_agents |table |yes |0 |7 |7 |1 |0 |
| public.live_data_gateway_requests |table |yes |0 |18 |15 |2 |0 |
| public.material_upgrades |table |yes |0 |7 |4 |1 |4 |
| public.materials |table |yes |0 |7 |9 |2 |5 |
| public.matrix_allocations |table |yes |0 |9 |8 |2 |3 |
| public.mftypes |table |yes |0 |7 |9 |2 |5 |
| public.moonshot_backups |table |yes |0 |7 |7 |1 |2 |
| public.moonshot_business_plan |table |yes |0 |4 |5 |1 |2 |
| public.moonshot_issues |table |yes |0 |11 |14 |1 |2 |
| public.moonshot_meeting_agenda_sections |table |yes |0 |7 |9 |1 |2 |
| public.moonshot_meetings |table |yes |0 |14 |17 |1 |2 |
| public.moonshot_metric_points |table |yes |0 |5 |8 |2 |2 |
| public.moonshot_metrics |table |yes |0 |10 |14 |1 |2 |
| public.moonshot_rocks |table |yes |0 |10 |12 |1 |2 |
| public.moonshot_todos |table |yes |0 |8 |9 |1 |2 |
| public.notes |table |yes |0 |9 |8 |3 |4 |
| public.opportunities |table |yes |0 |17 |8 |6 |5 |
| public.opportunity_attachments |table |yes |0 |6 |7 |2 |2 |
| public.order_activity |table |yes |0 |8 |7 |1 |2 |
| public.order_items |table |yes |0 |17 |13 |1 |3 |
| public.order_payment_events |table |yes |0 |5 |7 |2 |2 |
| public.order_payments |table |yes |0 |17 |15 |4 |3 |
| public.orders |table |yes |0 |12 |8 |1 |3 |
| public.outreach_outbox |table |yes |0 |13 |10 |1 |2 |
| public.payment_gateway_secrets |table |yes |0 |3 |5 |1 |1 |
| public.payment_gateway_settings |table |yes |0 |13 |15 |2 |2 |
| public.price_catalog |table |yes |0 |13 |7 |4 |6 |
| public.price_matrix |table |yes |0 |10 |4 |2 |3 |
| public.pricelist_catalog_rows |table |yes |0 |12 |13 |2 |2 |
| public.pricelist_child_sections |table |yes |0 |7 |4 |1 |4 |
| public.pricelist_line_overrides |table |yes |0 |7 |5 |1 |4 |
| public.pricelist_lines |table |yes |0 |10 |13 |2 |1 |
| public.pricelist_notes |table |yes |0 |4 |2 |1 |4 |
| public.pricelist_overrides |table |yes |0 |7 |3 |1 |4 |
| public.pricelist_versions |table |yes |0 |11 |3 |1 |3 |
| public.pricelists |table |yes |0 |7 |7 |1 |1 |
| public.pricing_audit |table |yes |0 |8 |6 |1 |1 |
| public.pricing_input_rows |table |yes |0 |9 |10 |1 |4 |
| public.pricing_items |table |yes |0 |5 |7 |2 |3 |
| public.pricing_settings |table |yes |1 |30 |30 |1 |5 |
| public.pricing_sheets |table |yes |0 |7 |7 |1 |4 |
| public.product_variants |table |yes |0 |20 |17 |2 |1 |
| public.profiles |table |yes |0 |24 |9 |2 |6 |
| public.public_inquiries |table |yes |0 |13 |7 |1 |2 |
| public.quote_lines |table |yes |0 |25 |25 |2 |6 |
| public.quotes |table |yes |0 |23 |18 |4 |6 |
| public.role_permissions |table |yes |100 |7 |9 |2 |2 |
| public.rx_details |table |yes |0 |52 |7 |2 |5 |
| public.rx_price_categories |table |yes |0 |8 |11 |2 |4 |
| public.rx_price_category_versions |table |yes |0 |8 |10 |2 |4 |
| public.rx_price_grouping_versions |table |yes |0 |8 |10 |2 |4 |
| public.rx_price_groupings |table |yes |0 |7 |9 |2 |4 |
| public.security_alerts |table |yes |0 |16 |17 |3 |1 |
| public.security_audit_events |table |yes |0 |16 |11 |5 |2 |
| public.shipment_charges |table |yes |0 |11 |9 |1 |5 |
| public.shipment_lines |table |yes |0 |14 |17 |1 |5 |
| public.shipment_types |table |yes |2 |7 |10 |3 |4 |
| public.shipments |table |yes |0 |20 |21 |1 |5 |
| public.statement_lines |table |yes |0 |14 |8 |2 |3 |
| public.statement_lines_public |view |no |-1 |10 |0 |0 |0 |
| public.statements |table |yes |0 |28 |11 |3 |2 |
| public.statements_public |view |no |-1 |17 |0 |0 |0 |
| public.store_product_media |table |yes |0 |8 |9 |1 |2 |
| public.store_product_overrides |table |yes |0 |8 |9 |2 |2 |
| public.store_product_variant_settings |table |yes |0 |11 |10 |2 |1 |
| public.store_product_variant_summary |view |no |-1 |7 |0 |0 |0 |
| public.store_product_variants |table |yes |0 |21 |19 |4 |3 |
| public.store_product_variants_public |view |no |-1 |18 |0 |0 |0 |
| public.store_variant_audit_logs |table |yes |0 |7 |5 |2 |2 |
| public.suppliers |table |yes |0 |7 |9 |2 |5 |
| public.supplies |table |yes |0 |28 |26 |1 |5 |
| public.supplies_public |view |no |-1 |8 |0 |0 |0 |
| public.supply_categories |table |yes |3 |7 |8 |1 |4 |
| public.suppressed_emails |table |yes |0 |5 |7 |3 |2 |
| public.user_presence |table |yes |0 |7 |11 |1 |2 |
| public.user_roles |table |yes |0 |3 |6 |2 |5 |
| public.website_analytics_pageviews |table |yes |0 |7 |9 |3 |3 |
| public.website_analytics_sessions |table |yes |0 |14 |16 |3 |3 |
| public.website_analytics_web_vitals |table |yes |0 |11 |13 |3 |3 |
| public.website_features |table |yes |3 |6 |5 |1 |2 |
| public.wholesale_inquiries |table |yes |0 |12 |14 |1 |3 |
| public.wiki_headings |table |yes |0 |7 |9 |2 |4 |
| realtime.messages |partitioned table |yes |0 |9 |7 |2 |0 |
| realtime.schema_migrations |table |no |81 |2 |0 |1 |0 |
| realtime.subscription |table |no |0 |9 |9 |3 |0 |
| storage.buckets |table |yes |6 |11 |4 |2 |0 |
| storage.buckets_analytics |table |yes |0 |7 |7 |2 |0 |
| storage.buckets_vectors |table |yes |0 |4 |0 |1 |0 |
| storage.migrations |table |yes |61 |4 |0 |2 |0 |
| storage.objects |table |yes |0 |12 |3 |5 |25 |
| storage.s3_multipart_uploads |table |yes |0 |10 |9 |2 |0 |
| storage.s3_multipart_uploads_parts |table |yes |0 |10 |12 |1 |0 |
| storage.vector_indexes |table |yes |0 |9 |0 |2 |0 |
| supabase_migrations.schema_migrations |table |no |239 |6 |3 |2 |0 |
| vault.decrypted_secrets |view |no |-1 |9 |0 |0 |0 |
| vault.secrets |table |no |0 |8 |6 |2 |0 |

## Storage Buckets

| Bucket |Public |File size limit |Allowed MIME types |
| --- |--- |--- |--- |
| catalog-assets |true | | |
| data-files |false | | |
| docs |false | | |
| product-images |true | | |
| video |true | | |
| zenvue-branding |true | | |

## Storage Object Counts

_None._

## auth.audit_log_entries

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |instance_id |uuid |YES | |NO |NEVER |
| 2 |id |uuid |NO | |NO |NEVER |
| 3 |payload |json |YES | |NO |NEVER |
| 4 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 5 |ip_address |character varying(64) |NO |''::character varying |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16529_2_not_null |CHECK | | | |
| 16498_16529_5_not_null |CHECK | | | |
| audit_log_entries_pkey |PRIMARY KEY |id | | |

### Indexes

| Name |Definition |
| --- |--- |
| audit_log_entries_pkey |CREATE UNIQUE INDEX audit_log_entries_pkey ON auth.audit_log_entries USING btree (id) |
| audit_logs_instance_id_idx |CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id) |

### RLS Policies

_None._

### Triggers

_None._

## auth.custom_oauth_providers

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |provider_type |text |NO | |NO |NEVER |
| 3 |identifier |text |NO | |NO |NEVER |
| 4 |name |text |NO | |NO |NEVER |
| 5 |client_id |text |NO | |NO |NEVER |
| 6 |client_secret |text |NO | |NO |NEVER |
| 7 |acceptable_client_ids |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 8 |scopes |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 9 |pkce_enabled |boolean |NO |true |NO |NEVER |
| 10 |attribute_mapping |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 11 |authorization_params |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 12 |enabled |boolean |NO |true |NO |NEVER |
| 13 |email_optional |boolean |NO |false |NO |NEVER |
| 14 |issuer |text |YES | |NO |NEVER |
| 15 |discovery_url |text |YES | |NO |NEVER |
| 16 |skip_nonce_check |boolean |NO |false |NO |NEVER |
| 17 |cached_discovery |jsonb |YES | |NO |NEVER |
| 18 |discovery_cached_at |timestamp with time zone |YES | |NO |NEVER |
| 19 |authorization_url |text |YES | |NO |NEVER |
| 20 |token_url |text |YES | |NO |NEVER |
| 21 |userinfo_url |text |YES | |NO |NEVER |
| 22 |jwks_uri |text |YES | |NO |NEVER |
| 23 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 24 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 25 |custom_claims_allowlist |ARRAY |NO |'{}'::text[] |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_17084_10_not_null |CHECK | | | |
| 16498_17084_11_not_null |CHECK | | | |
| 16498_17084_12_not_null |CHECK | | | |
| 16498_17084_13_not_null |CHECK | | | |
| 16498_17084_16_not_null |CHECK | | | |
| 16498_17084_1_not_null |CHECK | | | |
| 16498_17084_23_not_null |CHECK | | | |
| 16498_17084_24_not_null |CHECK | | | |
| 16498_17084_25_not_null |CHECK | | | |
| 16498_17084_2_not_null |CHECK | | | |
| 16498_17084_3_not_null |CHECK | | | |
| 16498_17084_4_not_null |CHECK | | | |
| 16498_17084_5_not_null |CHECK | | | |
| 16498_17084_6_not_null |CHECK | | | |
| 16498_17084_7_not_null |CHECK | | | |
| 16498_17084_8_not_null |CHECK | | | |
| 16498_17084_9_not_null |CHECK | | | |
| custom_oauth_providers_authorization_url_https |CHECK | | | |
| custom_oauth_providers_authorization_url_length |CHECK | | | |
| custom_oauth_providers_client_id_length |CHECK | | | |
| custom_oauth_providers_discovery_url_length |CHECK | | | |
| custom_oauth_providers_identifier_format |CHECK | | | |
| custom_oauth_providers_identifier_key |UNIQUE |identifier | | |
| custom_oauth_providers_issuer_length |CHECK | | | |
| custom_oauth_providers_jwks_uri_https |CHECK | | | |
| custom_oauth_providers_jwks_uri_length |CHECK | | | |
| custom_oauth_providers_name_length |CHECK | | | |
| custom_oauth_providers_oauth2_requires_endpoints |CHECK | | | |
| custom_oauth_providers_oidc_discovery_url_https |CHECK | | | |
| custom_oauth_providers_oidc_issuer_https |CHECK | | | |
| custom_oauth_providers_oidc_requires_issuer |CHECK | | | |
| custom_oauth_providers_pkey |PRIMARY KEY |id | | |
| custom_oauth_providers_provider_type_check |CHECK | | | |
| custom_oauth_providers_token_url_https |CHECK | | | |
| custom_oauth_providers_token_url_length |CHECK | | | |
| custom_oauth_providers_userinfo_url_https |CHECK | | | |
| custom_oauth_providers_userinfo_url_length |CHECK | | | |

### Indexes

| Name |Definition |
| --- |--- |
| custom_oauth_providers_created_at_idx |CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at) |
| custom_oauth_providers_enabled_idx |CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled) |
| custom_oauth_providers_identifier_idx |CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier) |
| custom_oauth_providers_identifier_key |CREATE UNIQUE INDEX custom_oauth_providers_identifier_key ON auth.custom_oauth_providers USING btree (identifier) |
| custom_oauth_providers_pkey |CREATE UNIQUE INDEX custom_oauth_providers_pkey ON auth.custom_oauth_providers USING btree (id) |
| custom_oauth_providers_provider_type_idx |CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type) |

### RLS Policies

_None._

### Triggers

_None._

## auth.flow_state

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 2 |user_id |uuid |YES | |NO |NEVER |
| 3 |auth_code |text |YES | |NO |NEVER |
| 4 |code_challenge_method |auth.code_challenge_method |YES | |NO |NEVER |
| 5 |code_challenge |text |YES | |NO |NEVER |
| 6 |provider_type |text |NO | |NO |NEVER |
| 7 |provider_access_token |text |YES | |NO |NEVER |
| 8 |provider_refresh_token |text |YES | |NO |NEVER |
| 9 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 10 |updated_at |timestamp with time zone |YES | |NO |NEVER |
| 11 |authentication_method |text |NO | |NO |NEVER |
| 12 |auth_code_issued_at |timestamp with time zone |YES | |NO |NEVER |
| 13 |invite_token |text |YES | |NO |NEVER |
| 14 |referrer |text |YES | |NO |NEVER |
| 15 |oauth_client_state_id |uuid |YES | |NO |NEVER |
| 16 |linking_target_id |uuid |YES | |NO |NEVER |
| 17 |email_optional |boolean |NO |false |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16889_11_not_null |CHECK | | | |
| 16498_16889_17_not_null |CHECK | | | |
| 16498_16889_1_not_null |CHECK | | | |
| 16498_16889_6_not_null |CHECK | | | |
| flow_state_pkey |PRIMARY KEY |id | | |

### Indexes

| Name |Definition |
| --- |--- |
| flow_state_created_at_idx |CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC) |
| flow_state_pkey |CREATE UNIQUE INDEX flow_state_pkey ON auth.flow_state USING btree (id) |
| idx_auth_code |CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code) |
| idx_user_id_auth_method |CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method) |

### RLS Policies

_None._

### Triggers

_None._

## auth.identities

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |provider_id |text |NO | |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |identity_data |jsonb |NO | |NO |NEVER |
| 4 |provider |text |NO | |NO |NEVER |
| 5 |last_sign_in_at |timestamp with time zone |YES | |NO |NEVER |
| 6 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 7 |updated_at |timestamp with time zone |YES | |NO |NEVER |
| 8 |email |text |YES | |NO |ALWAYS |
| 9 |id |uuid |NO |gen_random_uuid() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16686_1_not_null |CHECK | | | |
| 16498_16686_2_not_null |CHECK | | | |
| 16498_16686_3_not_null |CHECK | | | |
| 16498_16686_4_not_null |CHECK | | | |
| 16498_16686_9_not_null |CHECK | | | |
| identities_pkey |PRIMARY KEY |id | | |
| identities_provider_id_provider_unique |UNIQUE |provider_id, provider | | |
| identities_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| identities_email_idx |CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops) |
| identities_pkey |CREATE UNIQUE INDEX identities_pkey ON auth.identities USING btree (id) |
| identities_provider_id_provider_unique |CREATE UNIQUE INDEX identities_provider_id_provider_unique ON auth.identities USING btree (provider_id, provider) |
| identities_user_id_idx |CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id) |

### RLS Policies

_None._

### Triggers

_None._

## auth.instances

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 2 |uuid |uuid |YES | |NO |NEVER |
| 3 |raw_base_config |text |YES | |NO |NEVER |
| 4 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 5 |updated_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16522_1_not_null |CHECK | | | |
| instances_pkey |PRIMARY KEY |id | | |

### Indexes

| Name |Definition |
| --- |--- |
| instances_pkey |CREATE UNIQUE INDEX instances_pkey ON auth.instances USING btree (id) |

### RLS Policies

_None._

### Triggers

_None._

## auth.mfa_amr_claims

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |session_id |uuid |NO | |NO |NEVER |
| 2 |created_at |timestamp with time zone |NO | |NO |NEVER |
| 3 |updated_at |timestamp with time zone |NO | |NO |NEVER |
| 4 |authentication_method |text |NO | |NO |NEVER |
| 5 |id |uuid |NO | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16776_1_not_null |CHECK | | | |
| 16498_16776_2_not_null |CHECK | | | |
| 16498_16776_3_not_null |CHECK | | | |
| 16498_16776_4_not_null |CHECK | | | |
| 16498_16776_5_not_null |CHECK | | | |
| amr_id_pk |PRIMARY KEY |id | | |
| mfa_amr_claims_session_id_authentication_method_pkey |UNIQUE |session_id, authentication_method | | |
| mfa_amr_claims_session_id_fkey |FOREIGN KEY |session_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| amr_id_pk |CREATE UNIQUE INDEX amr_id_pk ON auth.mfa_amr_claims USING btree (id) |
| mfa_amr_claims_session_id_authentication_method_pkey |CREATE UNIQUE INDEX mfa_amr_claims_session_id_authentication_method_pkey ON auth.mfa_amr_claims USING btree (session_id, authentication_method) |

### RLS Policies

_None._

### Triggers

_None._

## auth.mfa_challenges

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 2 |factor_id |uuid |NO | |NO |NEVER |
| 3 |created_at |timestamp with time zone |NO | |NO |NEVER |
| 4 |verified_at |timestamp with time zone |YES | |NO |NEVER |
| 5 |ip_address |inet |NO | |NO |NEVER |
| 6 |otp_code |text |YES | |NO |NEVER |
| 7 |web_authn_session_data |jsonb |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16764_1_not_null |CHECK | | | |
| 16498_16764_2_not_null |CHECK | | | |
| 16498_16764_3_not_null |CHECK | | | |
| 16498_16764_5_not_null |CHECK | | | |
| mfa_challenges_auth_factor_id_fkey |FOREIGN KEY |factor_id | | |
| mfa_challenges_pkey |PRIMARY KEY |id | | |

### Indexes

| Name |Definition |
| --- |--- |
| mfa_challenge_created_at_idx |CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC) |
| mfa_challenges_pkey |CREATE UNIQUE INDEX mfa_challenges_pkey ON auth.mfa_challenges USING btree (id) |

### RLS Policies

_None._

### Triggers

_None._

## auth.mfa_factors

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |friendly_name |text |YES | |NO |NEVER |
| 4 |factor_type |auth.factor_type |NO | |NO |NEVER |
| 5 |status |auth.factor_status |NO | |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO | |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO | |NO |NEVER |
| 8 |secret |text |YES | |NO |NEVER |
| 9 |phone |text |YES | |NO |NEVER |
| 10 |last_challenged_at |timestamp with time zone |YES | |NO |NEVER |
| 11 |web_authn_credential |jsonb |YES | |NO |NEVER |
| 12 |web_authn_aaguid |uuid |YES | |NO |NEVER |
| 13 |last_webauthn_challenge_data |jsonb |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16751_1_not_null |CHECK | | | |
| 16498_16751_2_not_null |CHECK | | | |
| 16498_16751_4_not_null |CHECK | | | |
| 16498_16751_5_not_null |CHECK | | | |
| 16498_16751_6_not_null |CHECK | | | |
| 16498_16751_7_not_null |CHECK | | | |
| mfa_factors_last_challenged_at_key |UNIQUE |last_challenged_at | | |
| mfa_factors_pkey |PRIMARY KEY |id | | |
| mfa_factors_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| factor_id_created_at_idx |CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at) |
| mfa_factors_last_challenged_at_key |CREATE UNIQUE INDEX mfa_factors_last_challenged_at_key ON auth.mfa_factors USING btree (last_challenged_at) |
| mfa_factors_pkey |CREATE UNIQUE INDEX mfa_factors_pkey ON auth.mfa_factors USING btree (id) |
| mfa_factors_user_friendly_name_unique |CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text) |
| mfa_factors_user_id_idx |CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id) |
| unique_phone_factor_per_user |CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone) |

### RLS Policies

_None._

### Triggers

_None._

## auth.oauth_authorizations

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 2 |authorization_id |text |NO | |NO |NEVER |
| 3 |client_id |uuid |NO | |NO |NEVER |
| 4 |user_id |uuid |YES | |NO |NEVER |
| 5 |redirect_uri |text |NO | |NO |NEVER |
| 6 |scope |text |NO | |NO |NEVER |
| 7 |state |text |YES | |NO |NEVER |
| 8 |resource |text |YES | |NO |NEVER |
| 9 |code_challenge |text |YES | |NO |NEVER |
| 10 |code_challenge_method |auth.code_challenge_method |YES | |NO |NEVER |
| 11 |response_type |auth.oauth_response_type |NO |'code'::auth.oauth_response_type |NO |NEVER |
| 12 |status |auth.oauth_authorization_status |NO |'pending'::auth.oauth_authorization_status |NO |NEVER |
| 13 |authorization_code |text |YES | |NO |NEVER |
| 14 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 15 |expires_at |timestamp with time zone |NO |(now() + '00:03:00'::interval) |NO |NEVER |
| 16 |approved_at |timestamp with time zone |YES | |NO |NEVER |
| 17 |nonce |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_17001_11_not_null |CHECK | | | |
| 16498_17001_12_not_null |CHECK | | | |
| 16498_17001_14_not_null |CHECK | | | |
| 16498_17001_15_not_null |CHECK | | | |
| 16498_17001_1_not_null |CHECK | | | |
| 16498_17001_2_not_null |CHECK | | | |
| 16498_17001_3_not_null |CHECK | | | |
| 16498_17001_5_not_null |CHECK | | | |
| 16498_17001_6_not_null |CHECK | | | |
| oauth_authorizations_authorization_code_key |UNIQUE |authorization_code | | |
| oauth_authorizations_authorization_code_length |CHECK | | | |
| oauth_authorizations_authorization_id_key |UNIQUE |authorization_id | | |
| oauth_authorizations_client_id_fkey |FOREIGN KEY |client_id | | |
| oauth_authorizations_code_challenge_length |CHECK | | | |
| oauth_authorizations_expires_at_future |CHECK | | | |
| oauth_authorizations_nonce_length |CHECK | | | |
| oauth_authorizations_pkey |PRIMARY KEY |id | | |
| oauth_authorizations_redirect_uri_length |CHECK | | | |
| oauth_authorizations_resource_length |CHECK | | | |
| oauth_authorizations_scope_length |CHECK | | | |
| oauth_authorizations_state_length |CHECK | | | |
| oauth_authorizations_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| oauth_auth_pending_exp_idx |CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status) |
| oauth_authorizations_authorization_code_key |CREATE UNIQUE INDEX oauth_authorizations_authorization_code_key ON auth.oauth_authorizations USING btree (authorization_code) |
| oauth_authorizations_authorization_id_key |CREATE UNIQUE INDEX oauth_authorizations_authorization_id_key ON auth.oauth_authorizations USING btree (authorization_id) |
| oauth_authorizations_pkey |CREATE UNIQUE INDEX oauth_authorizations_pkey ON auth.oauth_authorizations USING btree (id) |

### RLS Policies

_None._

### Triggers

_None._

## auth.oauth_client_states

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 2 |provider_type |text |NO | |NO |NEVER |
| 3 |code_verifier |text |YES | |NO |NEVER |
| 4 |created_at |timestamp with time zone |NO | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_17074_1_not_null |CHECK | | | |
| 16498_17074_2_not_null |CHECK | | | |
| 16498_17074_4_not_null |CHECK | | | |
| oauth_client_states_pkey |PRIMARY KEY |id | | |

### Indexes

| Name |Definition |
| --- |--- |
| idx_oauth_client_states_created_at |CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at) |
| oauth_client_states_pkey |CREATE UNIQUE INDEX oauth_client_states_pkey ON auth.oauth_client_states USING btree (id) |

### RLS Policies

_None._

### Triggers

_None._

## auth.oauth_clients

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 3 |client_secret_hash |text |YES | |NO |NEVER |
| 4 |registration_type |auth.oauth_registration_type |NO | |NO |NEVER |
| 5 |redirect_uris |text |NO | |NO |NEVER |
| 6 |grant_types |text |NO | |NO |NEVER |
| 7 |client_name |text |YES | |NO |NEVER |
| 8 |client_uri |text |YES | |NO |NEVER |
| 9 |logo_uri |text |YES | |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 12 |deleted_at |timestamp with time zone |YES | |NO |NEVER |
| 13 |client_type |auth.oauth_client_type |NO |'confidential'::auth.oauth_client_type |NO |NEVER |
| 14 |token_endpoint_auth_method |text |NO | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16971_10_not_null |CHECK | | | |
| 16498_16971_11_not_null |CHECK | | | |
| 16498_16971_13_not_null |CHECK | | | |
| 16498_16971_14_not_null |CHECK | | | |
| 16498_16971_1_not_null |CHECK | | | |
| 16498_16971_4_not_null |CHECK | | | |
| 16498_16971_5_not_null |CHECK | | | |
| 16498_16971_6_not_null |CHECK | | | |
| oauth_clients_client_name_length |CHECK | | | |
| oauth_clients_client_uri_length |CHECK | | | |
| oauth_clients_logo_uri_length |CHECK | | | |
| oauth_clients_pkey |PRIMARY KEY |id | | |
| oauth_clients_token_endpoint_auth_method_check |CHECK | | | |

### Indexes

| Name |Definition |
| --- |--- |
| oauth_clients_deleted_at_idx |CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at) |
| oauth_clients_pkey |CREATE UNIQUE INDEX oauth_clients_pkey ON auth.oauth_clients USING btree (id) |

### RLS Policies

_None._

### Triggers

_None._

## auth.oauth_consents

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |client_id |uuid |NO | |NO |NEVER |
| 4 |scopes |text |NO | |NO |NEVER |
| 5 |granted_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |revoked_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_17034_1_not_null |CHECK | | | |
| 16498_17034_2_not_null |CHECK | | | |
| 16498_17034_3_not_null |CHECK | | | |
| 16498_17034_4_not_null |CHECK | | | |
| 16498_17034_5_not_null |CHECK | | | |
| oauth_consents_client_id_fkey |FOREIGN KEY |client_id | | |
| oauth_consents_pkey |PRIMARY KEY |id | | |
| oauth_consents_revoked_after_granted |CHECK | | | |
| oauth_consents_scopes_length |CHECK | | | |
| oauth_consents_scopes_not_empty |CHECK | | | |
| oauth_consents_user_client_unique |UNIQUE |user_id, client_id | | |
| oauth_consents_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| oauth_consents_active_client_idx |CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL) |
| oauth_consents_active_user_client_idx |CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL) |
| oauth_consents_pkey |CREATE UNIQUE INDEX oauth_consents_pkey ON auth.oauth_consents USING btree (id) |
| oauth_consents_user_client_unique |CREATE UNIQUE INDEX oauth_consents_user_client_unique ON auth.oauth_consents USING btree (user_id, client_id) |
| oauth_consents_user_order_idx |CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC) |

### RLS Policies

_None._

### Triggers

_None._

## auth.one_time_tokens

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |token_type |auth.one_time_token_type |NO | |NO |NEVER |
| 4 |token_hash |text |NO | |NO |NEVER |
| 5 |relates_to |text |NO | |NO |NEVER |
| 6 |created_at |timestamp without time zone |NO |now() |NO |NEVER |
| 7 |updated_at |timestamp without time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16939_1_not_null |CHECK | | | |
| 16498_16939_2_not_null |CHECK | | | |
| 16498_16939_3_not_null |CHECK | | | |
| 16498_16939_4_not_null |CHECK | | | |
| 16498_16939_5_not_null |CHECK | | | |
| 16498_16939_6_not_null |CHECK | | | |
| 16498_16939_7_not_null |CHECK | | | |
| one_time_tokens_pkey |PRIMARY KEY |id | | |
| one_time_tokens_token_hash_check |CHECK | | | |
| one_time_tokens_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| one_time_tokens_pkey |CREATE UNIQUE INDEX one_time_tokens_pkey ON auth.one_time_tokens USING btree (id) |
| one_time_tokens_relates_to_hash_idx |CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to) |
| one_time_tokens_token_hash_hash_idx |CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash) |
| one_time_tokens_user_id_token_type_key |CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type) |

### RLS Policies

_None._

### Triggers

_None._

## auth.refresh_tokens

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |instance_id |uuid |YES | |NO |NEVER |
| 2 |id |bigint(64,0) |NO |nextval('auth.refresh_tokens_id_seq'::regclass) |NO |NEVER |
| 3 |token |character varying(255) |YES | |NO |NEVER |
| 4 |user_id |character varying(255) |YES | |NO |NEVER |
| 5 |revoked |boolean |YES | |NO |NEVER |
| 6 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 7 |updated_at |timestamp with time zone |YES | |NO |NEVER |
| 8 |parent |character varying(255) |YES | |NO |NEVER |
| 9 |session_id |uuid |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16511_2_not_null |CHECK | | | |
| refresh_tokens_pkey |PRIMARY KEY |id | | |
| refresh_tokens_session_id_fkey |FOREIGN KEY |session_id | | |
| refresh_tokens_token_unique |UNIQUE |token | | |

### Indexes

| Name |Definition |
| --- |--- |
| refresh_tokens_instance_id_idx |CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id) |
| refresh_tokens_instance_id_user_id_idx |CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id) |
| refresh_tokens_parent_idx |CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent) |
| refresh_tokens_pkey |CREATE UNIQUE INDEX refresh_tokens_pkey ON auth.refresh_tokens USING btree (id) |
| refresh_tokens_session_id_revoked_idx |CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked) |
| refresh_tokens_token_unique |CREATE UNIQUE INDEX refresh_tokens_token_unique ON auth.refresh_tokens USING btree (token) |
| refresh_tokens_updated_at_idx |CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC) |

### RLS Policies

_None._

### Triggers

_None._

## auth.saml_providers

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 2 |sso_provider_id |uuid |NO | |NO |NEVER |
| 3 |entity_id |text |NO | |NO |NEVER |
| 4 |metadata_xml |text |NO | |NO |NEVER |
| 5 |metadata_url |text |YES | |NO |NEVER |
| 6 |attribute_mapping |jsonb |YES | |NO |NEVER |
| 7 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 8 |updated_at |timestamp with time zone |YES | |NO |NEVER |
| 9 |name_id_format |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16818_1_not_null |CHECK | | | |
| 16498_16818_2_not_null |CHECK | | | |
| 16498_16818_3_not_null |CHECK | | | |
| 16498_16818_4_not_null |CHECK | | | |
| entity_id not empty |CHECK | | | |
| metadata_url not empty |CHECK | | | |
| metadata_xml not empty |CHECK | | | |
| saml_providers_entity_id_key |UNIQUE |entity_id | | |
| saml_providers_pkey |PRIMARY KEY |id | | |
| saml_providers_sso_provider_id_fkey |FOREIGN KEY |sso_provider_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| saml_providers_entity_id_key |CREATE UNIQUE INDEX saml_providers_entity_id_key ON auth.saml_providers USING btree (entity_id) |
| saml_providers_pkey |CREATE UNIQUE INDEX saml_providers_pkey ON auth.saml_providers USING btree (id) |
| saml_providers_sso_provider_id_idx |CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id) |

### RLS Policies

_None._

### Triggers

_None._

## auth.saml_relay_states

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 2 |sso_provider_id |uuid |NO | |NO |NEVER |
| 3 |request_id |text |NO | |NO |NEVER |
| 4 |for_email |text |YES | |NO |NEVER |
| 5 |redirect_to |text |YES | |NO |NEVER |
| 7 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 8 |updated_at |timestamp with time zone |YES | |NO |NEVER |
| 9 |flow_state_id |uuid |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16836_1_not_null |CHECK | | | |
| 16498_16836_2_not_null |CHECK | | | |
| 16498_16836_3_not_null |CHECK | | | |
| request_id not empty |CHECK | | | |
| saml_relay_states_flow_state_id_fkey |FOREIGN KEY |flow_state_id | | |
| saml_relay_states_pkey |PRIMARY KEY |id | | |
| saml_relay_states_sso_provider_id_fkey |FOREIGN KEY |sso_provider_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| saml_relay_states_created_at_idx |CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC) |
| saml_relay_states_for_email_idx |CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email) |
| saml_relay_states_pkey |CREATE UNIQUE INDEX saml_relay_states_pkey ON auth.saml_relay_states USING btree (id) |
| saml_relay_states_sso_provider_id_idx |CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id) |

### RLS Policies

_None._

### Triggers

_None._

## auth.schema_migrations

Type: table
RLS enabled: yes
Estimated rows: 77

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |version |character varying(255) |NO | |NO |NEVER |

### Constraints

_None._

### Indexes

| Name |Definition |
| --- |--- |
| schema_migrations_pkey |CREATE UNIQUE INDEX schema_migrations_pkey ON auth.schema_migrations USING btree (version) |

### RLS Policies

_None._

### Triggers

_None._

## auth.sessions

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 4 |updated_at |timestamp with time zone |YES | |NO |NEVER |
| 5 |factor_id |uuid |YES | |NO |NEVER |
| 6 |aal |auth.aal_level |YES | |NO |NEVER |
| 7 |not_after |timestamp with time zone |YES | |NO |NEVER |
| 8 |refreshed_at |timestamp without time zone |YES | |NO |NEVER |
| 9 |user_agent |text |YES | |NO |NEVER |
| 10 |ip |inet |YES | |NO |NEVER |
| 11 |tag |text |YES | |NO |NEVER |
| 12 |oauth_client_id |uuid |YES | |NO |NEVER |
| 13 |refresh_token_hmac_key |text |YES | |NO |NEVER |
| 14 |refresh_token_counter |bigint(64,0) |YES | |NO |NEVER |
| 15 |scopes |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16716_1_not_null |CHECK | | | |
| 16498_16716_2_not_null |CHECK | | | |
| sessions_oauth_client_id_fkey |FOREIGN KEY |oauth_client_id | | |
| sessions_pkey |PRIMARY KEY |id | | |
| sessions_scopes_length |CHECK | | | |
| sessions_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| sessions_not_after_idx |CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC) |
| sessions_oauth_client_id_idx |CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id) |
| sessions_pkey |CREATE UNIQUE INDEX sessions_pkey ON auth.sessions USING btree (id) |
| sessions_user_id_idx |CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id) |
| user_id_created_at_idx |CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at) |

### RLS Policies

_None._

### Triggers

_None._

## auth.sso_domains

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 2 |sso_provider_id |uuid |NO | |NO |NEVER |
| 3 |domain |text |NO | |NO |NEVER |
| 4 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 5 |updated_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16803_1_not_null |CHECK | | | |
| 16498_16803_2_not_null |CHECK | | | |
| 16498_16803_3_not_null |CHECK | | | |
| domain not empty |CHECK | | | |
| sso_domains_pkey |PRIMARY KEY |id | | |
| sso_domains_sso_provider_id_fkey |FOREIGN KEY |sso_provider_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| sso_domains_domain_idx |CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain)) |
| sso_domains_pkey |CREATE UNIQUE INDEX sso_domains_pkey ON auth.sso_domains USING btree (id) |
| sso_domains_sso_provider_id_idx |CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id) |

### RLS Policies

_None._

### Triggers

_None._

## auth.sso_providers

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 2 |resource_id |text |YES | |NO |NEVER |
| 3 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 4 |updated_at |timestamp with time zone |YES | |NO |NEVER |
| 5 |disabled |boolean |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16794_1_not_null |CHECK | | | |
| resource_id not empty |CHECK | | | |
| sso_providers_pkey |PRIMARY KEY |id | | |

### Indexes

| Name |Definition |
| --- |--- |
| sso_providers_pkey |CREATE UNIQUE INDEX sso_providers_pkey ON auth.sso_providers USING btree (id) |
| sso_providers_resource_id_idx |CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id)) |
| sso_providers_resource_id_pattern_idx |CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops) |

### RLS Policies

_None._

### Triggers

_None._

## auth.users

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |instance_id |uuid |YES | |NO |NEVER |
| 2 |id |uuid |NO | |NO |NEVER |
| 3 |aud |character varying(255) |YES | |NO |NEVER |
| 4 |role |character varying(255) |YES | |NO |NEVER |
| 5 |email |character varying(255) |YES | |NO |NEVER |
| 6 |encrypted_password |character varying(255) |YES | |NO |NEVER |
| 7 |email_confirmed_at |timestamp with time zone |YES | |NO |NEVER |
| 8 |invited_at |timestamp with time zone |YES | |NO |NEVER |
| 9 |confirmation_token |character varying(255) |YES | |NO |NEVER |
| 10 |confirmation_sent_at |timestamp with time zone |YES | |NO |NEVER |
| 11 |recovery_token |character varying(255) |YES | |NO |NEVER |
| 12 |recovery_sent_at |timestamp with time zone |YES | |NO |NEVER |
| 13 |email_change_token_new |character varying(255) |YES | |NO |NEVER |
| 14 |email_change |character varying(255) |YES | |NO |NEVER |
| 15 |email_change_sent_at |timestamp with time zone |YES | |NO |NEVER |
| 16 |last_sign_in_at |timestamp with time zone |YES | |NO |NEVER |
| 17 |raw_app_meta_data |jsonb |YES | |NO |NEVER |
| 18 |raw_user_meta_data |jsonb |YES | |NO |NEVER |
| 19 |is_super_admin |boolean |YES | |NO |NEVER |
| 20 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 21 |updated_at |timestamp with time zone |YES | |NO |NEVER |
| 22 |phone |text |YES |NULL::character varying |NO |NEVER |
| 23 |phone_confirmed_at |timestamp with time zone |YES | |NO |NEVER |
| 24 |phone_change |text |YES |''::character varying |NO |NEVER |
| 25 |phone_change_token |character varying(255) |YES |''::character varying |NO |NEVER |
| 26 |phone_change_sent_at |timestamp with time zone |YES | |NO |NEVER |
| 27 |confirmed_at |timestamp with time zone |YES | |NO |ALWAYS |
| 28 |email_change_token_current |character varying(255) |YES |''::character varying |NO |NEVER |
| 29 |email_change_confirm_status |smallint(16,0) |YES |0 |NO |NEVER |
| 30 |banned_until |timestamp with time zone |YES | |NO |NEVER |
| 31 |reauthentication_token |character varying(255) |YES |''::character varying |NO |NEVER |
| 32 |reauthentication_sent_at |timestamp with time zone |YES | |NO |NEVER |
| 33 |is_sso_user |boolean |NO |false |NO |NEVER |
| 34 |deleted_at |timestamp with time zone |YES | |NO |NEVER |
| 35 |is_anonymous |boolean |NO |false |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_16499_2_not_null |CHECK | | | |
| 16498_16499_33_not_null |CHECK | | | |
| 16498_16499_35_not_null |CHECK | | | |
| users_email_change_confirm_status_check |CHECK | | | |
| users_phone_key |UNIQUE |phone | | |
| users_pkey |PRIMARY KEY |id | | |

### Indexes

| Name |Definition |
| --- |--- |
| confirmation_token_idx |CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text) |
| email_change_token_current_idx |CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text) |
| email_change_token_new_idx |CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text) |
| idx_users_created_at_desc |CREATE INDEX idx_users_created_at_desc ON auth.users USING btree (created_at DESC) |
| idx_users_email |CREATE INDEX idx_users_email ON auth.users USING btree (email) |
| idx_users_last_sign_in_at_desc |CREATE INDEX idx_users_last_sign_in_at_desc ON auth.users USING btree (last_sign_in_at DESC) |
| idx_users_name |CREATE INDEX idx_users_name ON auth.users USING btree (((raw_user_meta_data ->> 'name'::text))) WHERE ((raw_user_meta_data ->> 'name'::text) IS NOT NULL) |
| reauthentication_token_idx |CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text) |
| recovery_token_idx |CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text) |
| users_email_partial_key |CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false) |
| users_instance_id_email_idx |CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text)) |
| users_instance_id_idx |CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id) |
| users_is_anonymous_idx |CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous) |
| users_phone_key |CREATE UNIQUE INDEX users_phone_key ON auth.users USING btree (phone) |
| users_pkey |CREATE UNIQUE INDEX users_pkey ON auth.users USING btree (id) |

### RLS Policies

_None._

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| on_auth_user_created |AFTER |INSERT |ROW |EXECUTE FUNCTION handle_new_user() |

## auth.webauthn_challenges

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |YES | |NO |NEVER |
| 3 |challenge_type |text |NO | |NO |NEVER |
| 4 |session_data |jsonb |NO | |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |expires_at |timestamp with time zone |NO | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_17149_1_not_null |CHECK | | | |
| 16498_17149_3_not_null |CHECK | | | |
| 16498_17149_4_not_null |CHECK | | | |
| 16498_17149_5_not_null |CHECK | | | |
| 16498_17149_6_not_null |CHECK | | | |
| webauthn_challenges_challenge_type_check |CHECK | | | |
| webauthn_challenges_pkey |PRIMARY KEY |id | | |
| webauthn_challenges_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| webauthn_challenges_expires_at_idx |CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at) |
| webauthn_challenges_pkey |CREATE UNIQUE INDEX webauthn_challenges_pkey ON auth.webauthn_challenges USING btree (id) |
| webauthn_challenges_user_id_idx |CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id) |

### RLS Policies

_None._

### Triggers

_None._

## auth.webauthn_credentials

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |credential_id |bytea |NO | |NO |NEVER |
| 4 |public_key |bytea |NO | |NO |NEVER |
| 5 |attestation_type |text |NO |''::text |NO |NEVER |
| 6 |aaguid |uuid |YES | |NO |NEVER |
| 7 |sign_count |bigint(64,0) |NO |0 |NO |NEVER |
| 8 |transports |jsonb |NO |'[]'::jsonb |NO |NEVER |
| 9 |backup_eligible |boolean |NO |false |NO |NEVER |
| 10 |backed_up |boolean |NO |false |NO |NEVER |
| 11 |friendly_name |text |NO |''::text |NO |NEVER |
| 12 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 13 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 14 |last_used_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16498_17126_10_not_null |CHECK | | | |
| 16498_17126_11_not_null |CHECK | | | |
| 16498_17126_12_not_null |CHECK | | | |
| 16498_17126_13_not_null |CHECK | | | |
| 16498_17126_1_not_null |CHECK | | | |
| 16498_17126_2_not_null |CHECK | | | |
| 16498_17126_3_not_null |CHECK | | | |
| 16498_17126_4_not_null |CHECK | | | |
| 16498_17126_5_not_null |CHECK | | | |
| 16498_17126_7_not_null |CHECK | | | |
| 16498_17126_8_not_null |CHECK | | | |
| 16498_17126_9_not_null |CHECK | | | |
| webauthn_credentials_pkey |PRIMARY KEY |id | | |
| webauthn_credentials_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| webauthn_credentials_credential_id_key |CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id) |
| webauthn_credentials_pkey |CREATE UNIQUE INDEX webauthn_credentials_pkey ON auth.webauthn_credentials USING btree (id) |
| webauthn_credentials_user_id_idx |CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id) |

### RLS Policies

_None._

### Triggers

_None._

## cron.job

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |jobid |bigint(64,0) |NO |nextval('cron.jobid_seq'::regclass) |NO |NEVER |
| 2 |schedule |text |NO | |NO |NEVER |
| 3 |command |text |NO | |NO |NEVER |
| 4 |nodename |text |NO |'localhost'::text |NO |NEVER |
| 5 |nodeport |integer(32,0) |NO |inet_server_port() |NO |NEVER |
| 6 |database |text |NO |current_database() |NO |NEVER |
| 7 |username |text |NO |CURRENT_USER |NO |NEVER |
| 8 |active |boolean |NO |true |NO |NEVER |
| 9 |jobname |text |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

| Name |Definition |
| --- |--- |
| job_pkey |CREATE UNIQUE INDEX job_pkey ON cron.job USING btree (jobid) |
| jobname_username_uniq |CREATE UNIQUE INDEX jobname_username_uniq ON cron.job USING btree (jobname, username) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| cron_job_policy |ALL |public |(username = CURRENT_USER) | |

### Triggers

_None._

## cron.job_run_details

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |jobid |bigint(64,0) |YES | |NO |NEVER |
| 2 |runid |bigint(64,0) |NO |nextval('cron.runid_seq'::regclass) |NO |NEVER |
| 3 |job_pid |integer(32,0) |YES | |NO |NEVER |
| 4 |database |text |YES | |NO |NEVER |
| 5 |username |text |YES | |NO |NEVER |
| 6 |command |text |YES | |NO |NEVER |
| 7 |status |text |YES | |NO |NEVER |
| 8 |return_message |text |YES | |NO |NEVER |
| 9 |start_time |timestamp with time zone |YES | |NO |NEVER |
| 10 |end_time |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 20048_20069_2_not_null |CHECK | | | |
| job_run_details_pkey |PRIMARY KEY |runid | | |

### Indexes

| Name |Definition |
| --- |--- |
| job_run_details_pkey |CREATE UNIQUE INDEX job_run_details_pkey ON cron.job_run_details USING btree (runid) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| cron_job_run_details_policy |ALL |public |(username = CURRENT_USER) | |

### Triggers

_None._

## extensions.pg_stat_statements

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |userid |oid |YES | |NO |NEVER |
| 2 |dbid |oid |YES | |NO |NEVER |
| 3 |toplevel |boolean |YES | |NO |NEVER |
| 4 |queryid |bigint(64,0) |YES | |NO |NEVER |
| 5 |query |text |YES | |NO |NEVER |
| 6 |plans |bigint(64,0) |YES | |NO |NEVER |
| 7 |total_plan_time |double precision |YES | |NO |NEVER |
| 8 |min_plan_time |double precision |YES | |NO |NEVER |
| 9 |max_plan_time |double precision |YES | |NO |NEVER |
| 10 |mean_plan_time |double precision |YES | |NO |NEVER |
| 11 |stddev_plan_time |double precision |YES | |NO |NEVER |
| 12 |calls |bigint(64,0) |YES | |NO |NEVER |
| 13 |total_exec_time |double precision |YES | |NO |NEVER |
| 14 |min_exec_time |double precision |YES | |NO |NEVER |
| 15 |max_exec_time |double precision |YES | |NO |NEVER |
| 16 |mean_exec_time |double precision |YES | |NO |NEVER |
| 17 |stddev_exec_time |double precision |YES | |NO |NEVER |
| 18 |rows |bigint(64,0) |YES | |NO |NEVER |
| 19 |shared_blks_hit |bigint(64,0) |YES | |NO |NEVER |
| 20 |shared_blks_read |bigint(64,0) |YES | |NO |NEVER |
| 21 |shared_blks_dirtied |bigint(64,0) |YES | |NO |NEVER |
| 22 |shared_blks_written |bigint(64,0) |YES | |NO |NEVER |
| 23 |local_blks_hit |bigint(64,0) |YES | |NO |NEVER |
| 24 |local_blks_read |bigint(64,0) |YES | |NO |NEVER |
| 25 |local_blks_dirtied |bigint(64,0) |YES | |NO |NEVER |
| 26 |local_blks_written |bigint(64,0) |YES | |NO |NEVER |
| 27 |temp_blks_read |bigint(64,0) |YES | |NO |NEVER |
| 28 |temp_blks_written |bigint(64,0) |YES | |NO |NEVER |
| 29 |shared_blk_read_time |double precision |YES | |NO |NEVER |
| 30 |shared_blk_write_time |double precision |YES | |NO |NEVER |
| 31 |local_blk_read_time |double precision |YES | |NO |NEVER |
| 32 |local_blk_write_time |double precision |YES | |NO |NEVER |
| 33 |temp_blk_read_time |double precision |YES | |NO |NEVER |
| 34 |temp_blk_write_time |double precision |YES | |NO |NEVER |
| 35 |wal_records |bigint(64,0) |YES | |NO |NEVER |
| 36 |wal_fpi |bigint(64,0) |YES | |NO |NEVER |
| 37 |wal_bytes |numeric |YES | |NO |NEVER |
| 38 |jit_functions |bigint(64,0) |YES | |NO |NEVER |
| 39 |jit_generation_time |double precision |YES | |NO |NEVER |
| 40 |jit_inlining_count |bigint(64,0) |YES | |NO |NEVER |
| 41 |jit_inlining_time |double precision |YES | |NO |NEVER |
| 42 |jit_optimization_count |bigint(64,0) |YES | |NO |NEVER |
| 43 |jit_optimization_time |double precision |YES | |NO |NEVER |
| 44 |jit_emission_count |bigint(64,0) |YES | |NO |NEVER |
| 45 |jit_emission_time |double precision |YES | |NO |NEVER |
| 46 |jit_deform_count |bigint(64,0) |YES | |NO |NEVER |
| 47 |jit_deform_time |double precision |YES | |NO |NEVER |
| 48 |stats_since |timestamp with time zone |YES | |NO |NEVER |
| 49 |minmax_stats_since |timestamp with time zone |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## extensions.pg_stat_statements_info

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |dealloc |bigint(64,0) |YES | |NO |NEVER |
| 2 |stats_reset |timestamp with time zone |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## net._http_response

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |bigint(64,0) |YES | |NO |NEVER |
| 2 |status_code |integer(32,0) |YES | |NO |NEVER |
| 3 |content_type |text |YES | |NO |NEVER |
| 4 |headers |jsonb |YES | |NO |NEVER |
| 5 |content |text |YES | |NO |NEVER |
| 6 |timed_out |boolean |YES | |NO |NEVER |
| 7 |error_msg |text |YES | |NO |NEVER |
| 8 |created |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 20099_20111_8_not_null |CHECK | | | |

### Indexes

| Name |Definition |
| --- |--- |
| _http_response_created_idx |CREATE INDEX _http_response_created_idx ON net._http_response USING btree (created) |

### RLS Policies

_None._

### Triggers

_None._

## net.http_request_queue

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |bigint(64,0) |NO |nextval('net.http_request_queue_id_seq'::regclass) |NO |NEVER |
| 2 |method |text |NO | |NO |NEVER |
| 3 |url |text |NO | |NO |NEVER |
| 4 |headers |jsonb |YES | |NO |NEVER |
| 5 |body |bytea |YES | |NO |NEVER |
| 6 |timeout_milliseconds |integer(32,0) |NO | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 20099_20104_1_not_null |CHECK | | | |
| 20099_20104_2_not_null |CHECK | | | |
| 20099_20104_3_not_null |CHECK | | | |
| 20099_20104_6_not_null |CHECK | | | |

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## pgmq.a_auth_emails

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |msg_id |bigint(64,0) |NO | |NO |NEVER |
| 2 |read_ct |integer(32,0) |NO |0 |NO |NEVER |
| 3 |enqueued_at |timestamp with time zone |NO |now() |NO |NEVER |
| 4 |archived_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |vt |timestamp with time zone |NO | |NO |NEVER |
| 6 |message |jsonb |YES | |NO |NEVER |
| 7 |headers |jsonb |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 21043_21115_1_not_null |CHECK | | | |
| 21043_21115_2_not_null |CHECK | | | |
| 21043_21115_3_not_null |CHECK | | | |
| 21043_21115_4_not_null |CHECK | | | |
| 21043_21115_5_not_null |CHECK | | | |
| a_auth_emails_pkey |PRIMARY KEY |msg_id |pgmq.a_auth_emails |msg_id |

### Indexes

| Name |Definition |
| --- |--- |
| a_auth_emails_pkey |CREATE UNIQUE INDEX a_auth_emails_pkey ON pgmq.a_auth_emails USING btree (msg_id) |
| archived_at_idx_auth_emails |CREATE INDEX archived_at_idx_auth_emails ON pgmq.a_auth_emails USING btree (archived_at) |

### RLS Policies

_None._

### Triggers

_None._

## pgmq.a_auth_emails_dlq

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |msg_id |bigint(64,0) |NO | |NO |NEVER |
| 2 |read_ct |integer(32,0) |NO |0 |NO |NEVER |
| 3 |enqueued_at |timestamp with time zone |NO |now() |NO |NEVER |
| 4 |archived_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |vt |timestamp with time zone |NO | |NO |NEVER |
| 6 |message |jsonb |YES | |NO |NEVER |
| 7 |headers |jsonb |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 21043_21159_1_not_null |CHECK | | | |
| 21043_21159_2_not_null |CHECK | | | |
| 21043_21159_3_not_null |CHECK | | | |
| 21043_21159_4_not_null |CHECK | | | |
| 21043_21159_5_not_null |CHECK | | | |
| a_auth_emails_dlq_pkey |PRIMARY KEY |msg_id |pgmq.a_auth_emails_dlq |msg_id |

### Indexes

| Name |Definition |
| --- |--- |
| a_auth_emails_dlq_pkey |CREATE UNIQUE INDEX a_auth_emails_dlq_pkey ON pgmq.a_auth_emails_dlq USING btree (msg_id) |
| archived_at_idx_auth_emails_dlq |CREATE INDEX archived_at_idx_auth_emails_dlq ON pgmq.a_auth_emails_dlq USING btree (archived_at) |

### RLS Policies

_None._

### Triggers

_None._

## pgmq.a_transactional_emails

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |msg_id |bigint(64,0) |NO | |NO |NEVER |
| 2 |read_ct |integer(32,0) |NO |0 |NO |NEVER |
| 3 |enqueued_at |timestamp with time zone |NO |now() |NO |NEVER |
| 4 |archived_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |vt |timestamp with time zone |NO | |NO |NEVER |
| 6 |message |jsonb |YES | |NO |NEVER |
| 7 |headers |jsonb |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 21043_21137_1_not_null |CHECK | | | |
| 21043_21137_2_not_null |CHECK | | | |
| 21043_21137_3_not_null |CHECK | | | |
| 21043_21137_4_not_null |CHECK | | | |
| 21043_21137_5_not_null |CHECK | | | |
| a_transactional_emails_pkey |PRIMARY KEY |msg_id |pgmq.a_transactional_emails |msg_id |

### Indexes

| Name |Definition |
| --- |--- |
| a_transactional_emails_pkey |CREATE UNIQUE INDEX a_transactional_emails_pkey ON pgmq.a_transactional_emails USING btree (msg_id) |
| archived_at_idx_transactional_emails |CREATE INDEX archived_at_idx_transactional_emails ON pgmq.a_transactional_emails USING btree (archived_at) |

### RLS Policies

_None._

### Triggers

_None._

## pgmq.a_transactional_emails_dlq

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |msg_id |bigint(64,0) |NO | |NO |NEVER |
| 2 |read_ct |integer(32,0) |NO |0 |NO |NEVER |
| 3 |enqueued_at |timestamp with time zone |NO |now() |NO |NEVER |
| 4 |archived_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |vt |timestamp with time zone |NO | |NO |NEVER |
| 6 |message |jsonb |YES | |NO |NEVER |
| 7 |headers |jsonb |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 21043_21181_1_not_null |CHECK | | | |
| 21043_21181_2_not_null |CHECK | | | |
| 21043_21181_3_not_null |CHECK | | | |
| 21043_21181_4_not_null |CHECK | | | |
| 21043_21181_5_not_null |CHECK | | | |
| a_transactional_emails_dlq_pkey |PRIMARY KEY |msg_id |pgmq.a_transactional_emails_dlq |msg_id |

### Indexes

| Name |Definition |
| --- |--- |
| a_transactional_emails_dlq_pkey |CREATE UNIQUE INDEX a_transactional_emails_dlq_pkey ON pgmq.a_transactional_emails_dlq USING btree (msg_id) |
| archived_at_idx_transactional_emails_dlq |CREATE INDEX archived_at_idx_transactional_emails_dlq ON pgmq.a_transactional_emails_dlq USING btree (archived_at) |

### RLS Policies

_None._

### Triggers

_None._

## pgmq.meta

Type: table
RLS enabled: no
Estimated rows: 4

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |queue_name |character varying |NO | |NO |NEVER |
| 2 |is_partitioned |boolean |NO | |NO |NEVER |
| 3 |is_unlogged |boolean |NO | |NO |NEVER |
| 4 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 21043_21045_1_not_null |CHECK | | | |
| 21043_21045_2_not_null |CHECK | | | |
| 21043_21045_3_not_null |CHECK | | | |
| 21043_21045_4_not_null |CHECK | | | |
| meta_queue_name_key |UNIQUE |queue_name |pgmq.meta |queue_name |

### Indexes

| Name |Definition |
| --- |--- |
| meta_queue_name_key |CREATE UNIQUE INDEX meta_queue_name_key ON pgmq.meta USING btree (queue_name) |

### RLS Policies

_None._

### Triggers

_None._

## pgmq.q_auth_emails

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |msg_id |bigint(64,0) |NO | |YES |NEVER |
| 2 |read_ct |integer(32,0) |NO |0 |NO |NEVER |
| 3 |enqueued_at |timestamp with time zone |NO |now() |NO |NEVER |
| 4 |vt |timestamp with time zone |NO | |NO |NEVER |
| 5 |message |jsonb |YES | |NO |NEVER |
| 6 |headers |jsonb |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 21043_21106_1_not_null |CHECK | | | |
| 21043_21106_2_not_null |CHECK | | | |
| 21043_21106_3_not_null |CHECK | | | |
| 21043_21106_4_not_null |CHECK | | | |
| q_auth_emails_pkey |PRIMARY KEY |msg_id |pgmq.q_auth_emails |msg_id |

### Indexes

| Name |Definition |
| --- |--- |
| q_auth_emails_pkey |CREATE UNIQUE INDEX q_auth_emails_pkey ON pgmq.q_auth_emails USING btree (msg_id) |
| q_auth_emails_vt_idx |CREATE INDEX q_auth_emails_vt_idx ON pgmq.q_auth_emails USING btree (vt) |

### RLS Policies

_None._

### Triggers

_None._

## pgmq.q_auth_emails_dlq

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |msg_id |bigint(64,0) |NO | |YES |NEVER |
| 2 |read_ct |integer(32,0) |NO |0 |NO |NEVER |
| 3 |enqueued_at |timestamp with time zone |NO |now() |NO |NEVER |
| 4 |vt |timestamp with time zone |NO | |NO |NEVER |
| 5 |message |jsonb |YES | |NO |NEVER |
| 6 |headers |jsonb |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 21043_21150_1_not_null |CHECK | | | |
| 21043_21150_2_not_null |CHECK | | | |
| 21043_21150_3_not_null |CHECK | | | |
| 21043_21150_4_not_null |CHECK | | | |
| q_auth_emails_dlq_pkey |PRIMARY KEY |msg_id |pgmq.q_auth_emails_dlq |msg_id |

### Indexes

| Name |Definition |
| --- |--- |
| q_auth_emails_dlq_pkey |CREATE UNIQUE INDEX q_auth_emails_dlq_pkey ON pgmq.q_auth_emails_dlq USING btree (msg_id) |
| q_auth_emails_dlq_vt_idx |CREATE INDEX q_auth_emails_dlq_vt_idx ON pgmq.q_auth_emails_dlq USING btree (vt) |

### RLS Policies

_None._

### Triggers

_None._

## pgmq.q_transactional_emails

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |msg_id |bigint(64,0) |NO | |YES |NEVER |
| 2 |read_ct |integer(32,0) |NO |0 |NO |NEVER |
| 3 |enqueued_at |timestamp with time zone |NO |now() |NO |NEVER |
| 4 |vt |timestamp with time zone |NO | |NO |NEVER |
| 5 |message |jsonb |YES | |NO |NEVER |
| 6 |headers |jsonb |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 21043_21128_1_not_null |CHECK | | | |
| 21043_21128_2_not_null |CHECK | | | |
| 21043_21128_3_not_null |CHECK | | | |
| 21043_21128_4_not_null |CHECK | | | |
| q_transactional_emails_pkey |PRIMARY KEY |msg_id |pgmq.q_transactional_emails |msg_id |

### Indexes

| Name |Definition |
| --- |--- |
| q_transactional_emails_pkey |CREATE UNIQUE INDEX q_transactional_emails_pkey ON pgmq.q_transactional_emails USING btree (msg_id) |
| q_transactional_emails_vt_idx |CREATE INDEX q_transactional_emails_vt_idx ON pgmq.q_transactional_emails USING btree (vt) |

### RLS Policies

_None._

### Triggers

_None._

## pgmq.q_transactional_emails_dlq

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |msg_id |bigint(64,0) |NO | |YES |NEVER |
| 2 |read_ct |integer(32,0) |NO |0 |NO |NEVER |
| 3 |enqueued_at |timestamp with time zone |NO |now() |NO |NEVER |
| 4 |vt |timestamp with time zone |NO | |NO |NEVER |
| 5 |message |jsonb |YES | |NO |NEVER |
| 6 |headers |jsonb |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 21043_21172_1_not_null |CHECK | | | |
| 21043_21172_2_not_null |CHECK | | | |
| 21043_21172_3_not_null |CHECK | | | |
| 21043_21172_4_not_null |CHECK | | | |
| q_transactional_emails_dlq_pkey |PRIMARY KEY |msg_id |pgmq.q_transactional_emails_dlq |msg_id |

### Indexes

| Name |Definition |
| --- |--- |
| q_transactional_emails_dlq_pkey |CREATE UNIQUE INDEX q_transactional_emails_dlq_pkey ON pgmq.q_transactional_emails_dlq USING btree (msg_id) |
| q_transactional_emails_dlq_vt_idx |CREATE INDEX q_transactional_emails_dlq_vt_idx ON pgmq.q_transactional_emails_dlq USING btree (vt) |

### RLS Policies

_None._

### Triggers

_None._

## public.abandoned_cart_alerts

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |cart_snapshot |jsonb |NO |'[]'::jsonb |NO |NEVER |
| 4 |total_items |integer(32,0) |NO |0 |NO |NEVER |
| 5 |total_amount |numeric |NO |0 |NO |NEVER |
| 6 |status |text |NO |'open'::text |NO |NEVER |
| 7 |cutoff_hours |integer(32,0) |NO |24 |NO |NEVER |
| 8 |first_detected_at |timestamp with time zone |NO |now() |NO |NEVER |
| 9 |last_detected_at |timestamp with time zone |NO |now() |NO |NEVER |
| 10 |helpdesk_ticket_id |uuid |YES | |NO |NEVER |
| 11 |notification_id |uuid |YES | |NO |NEVER |
| 12 |email_outbox_id |uuid |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20458_1_not_null |CHECK | | | |
| 2200_20458_2_not_null |CHECK | | | |
| 2200_20458_3_not_null |CHECK | | | |
| 2200_20458_4_not_null |CHECK | | | |
| 2200_20458_5_not_null |CHECK | | | |
| 2200_20458_6_not_null |CHECK | | | |
| 2200_20458_7_not_null |CHECK | | | |
| 2200_20458_8_not_null |CHECK | | | |
| 2200_20458_9_not_null |CHECK | | | |
| abandoned_cart_alerts_email_outbox_id_fkey |FOREIGN KEY |email_outbox_id |public.customer_automation_outbox |id |
| abandoned_cart_alerts_helpdesk_ticket_id_fkey |FOREIGN KEY |helpdesk_ticket_id |public.helpdesk_tickets |id |
| abandoned_cart_alerts_notification_id_fkey |FOREIGN KEY |notification_id |public.admin_notifications |id |
| abandoned_cart_alerts_pkey |PRIMARY KEY |id |public.abandoned_cart_alerts |id |
| abandoned_cart_alerts_status_check |CHECK | |public.abandoned_cart_alerts |status |
| abandoned_cart_alerts_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| abandoned_cart_alerts_pkey |CREATE UNIQUE INDEX abandoned_cart_alerts_pkey ON public.abandoned_cart_alerts USING btree (id) |
| abandoned_cart_alerts_user_open_idx |CREATE UNIQUE INDEX abandoned_cart_alerts_user_open_idx ON public.abandoned_cart_alerts USING btree (user_id) WHERE (status = 'open'::text) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can manage abandoned cart alerts |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Users can view their own abandoned cart alerts |SELECT |authenticated |((auth.uid() = user_id) OR has_edit_role(auth.uid())) | |

### Triggers

_None._

## public.activities

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |contact_id |uuid |YES | |NO |NEVER |
| 3 |opportunity_id |uuid |YES | |NO |NEVER |
| 4 |activity_type |text |NO | |NO |NEVER |
| 5 |status |text |NO |'open'::text |NO |NEVER |
| 6 |due_at |timestamp with time zone |YES | |NO |NEVER |
| 7 |completed_at |timestamp with time zone |YES | |NO |NEVER |
| 8 |payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 9 |created_by |uuid |YES | |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 12 |type |text |YES | |NO |NEVER |
| 13 |content |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18809_10_not_null |CHECK | | | |
| 2200_18809_11_not_null |CHECK | | | |
| 2200_18809_1_not_null |CHECK | | | |
| 2200_18809_4_not_null |CHECK | | | |
| 2200_18809_5_not_null |CHECK | | | |
| 2200_18809_8_not_null |CHECK | | | |
| activities_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| activities_opportunity_id_fkey |FOREIGN KEY |opportunity_id |public.opportunities |id |
| activities_pkey |PRIMARY KEY |id |public.activities |id |

### Indexes

| Name |Definition |
| --- |--- |
| activities_contact_id_idx |CREATE INDEX activities_contact_id_idx ON public.activities USING btree (contact_id) |
| activities_due_at_idx |CREATE INDEX activities_due_at_idx ON public.activities USING btree (due_at) |
| activities_opportunity_id_idx |CREATE INDEX activities_opportunity_id_idx ON public.activities USING btree (opportunity_id) |
| activities_pkey |CREATE UNIQUE INDEX activities_pkey ON public.activities USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete activities |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert activities |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update activities |UPDATE |public |has_edit_role(auth.uid()) | |
| Staff can view activities |SELECT |authenticated |has_staff_role(auth.uid()) | |

### Triggers

_None._

## public.addon_pricing_sheets

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |addon_id |uuid |NO | |NO |NEVER |
| 3 |pricing_sheet_id |uuid |NO | |NO |NEVER |
| 4 |price_override |numeric |YES | |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18052_1_not_null |CHECK | | | |
| 2200_18052_2_not_null |CHECK | | | |
| 2200_18052_3_not_null |CHECK | | | |
| 2200_18052_5_not_null |CHECK | | | |
| addon_pricing_sheets_addon_id_fkey |FOREIGN KEY |addon_id |public.addons |id |
| addon_pricing_sheets_addon_id_pricing_sheet_id_key |UNIQUE |addon_id, addon_id, pricing_sheet_id, pricing_sheet_id |public.addon_pricing_sheets |addon_id, pricing_sheet_id, addon_id, pricing_sheet_id |
| addon_pricing_sheets_pkey |PRIMARY KEY |id |public.addon_pricing_sheets |id |
| addon_pricing_sheets_pricing_sheet_id_fkey |FOREIGN KEY |pricing_sheet_id |public.pricing_sheets |id |

### Indexes

| Name |Definition |
| --- |--- |
| addon_pricing_sheets_addon_id_pricing_sheet_id_key |CREATE UNIQUE INDEX addon_pricing_sheets_addon_id_pricing_sheet_id_key ON public.addon_pricing_sheets USING btree (addon_id, pricing_sheet_id) |
| addon_pricing_sheets_pkey |CREATE UNIQUE INDEX addon_pricing_sheets_pkey ON public.addon_pricing_sheets USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete addon_pricing_sheets |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert addon_pricing_sheets |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update addon_pricing_sheets |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select addon_pricing_sheets |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.addons

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |category |text |NO |'other'::text |NO |NEVER |
| 4 |description |text |NO |''::text |NO |NEVER |
| 5 |price |numeric |NO |0 |NO |NEVER |
| 6 |is_auto |boolean |NO |false |NO |NEVER |
| 7 |auto_rule |jsonb |YES | |NO |NEVER |
| 8 |is_active |boolean |NO |true |NO |NEVER |
| 9 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 12 |sku |text |NO |''::text |NO |NEVER |
| 13 |show_on_website |boolean |NO |false |NO |NEVER |
| 14 |supplier_id |uuid |YES | |NO |NEVER |
| 15 |cost |numeric |NO |0 |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18029_10_not_null |CHECK | | | |
| 2200_18029_11_not_null |CHECK | | | |
| 2200_18029_12_not_null |CHECK | | | |
| 2200_18029_13_not_null |CHECK | | | |
| 2200_18029_15_not_null |CHECK | | | |
| 2200_18029_1_not_null |CHECK | | | |
| 2200_18029_2_not_null |CHECK | | | |
| 2200_18029_3_not_null |CHECK | | | |
| 2200_18029_4_not_null |CHECK | | | |
| 2200_18029_5_not_null |CHECK | | | |
| 2200_18029_6_not_null |CHECK | | | |
| 2200_18029_8_not_null |CHECK | | | |
| 2200_18029_9_not_null |CHECK | | | |
| addons_pkey |PRIMARY KEY |id |public.addons |id |
| addons_supplier_id_fkey |FOREIGN KEY |supplier_id |public.suppliers |id |

### Indexes

| Name |Definition |
| --- |--- |
| addons_pkey |CREATE UNIQUE INDEX addons_pkey ON public.addons USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Anon can view website addons |SELECT |anon |((show_on_website = true) AND (is_active = true)) | |
| Editors can delete addons |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert addons |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update addons |UPDATE |public |has_edit_role(auth.uid()) | |
| Staff can select addons |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_addons_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.admin_notification_receipts

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |notification_id |uuid |NO | |NO |NEVER |
| 4 |read_at |timestamp with time zone |YES | |NO |NEVER |
| 5 |dismissed_at |timestamp with time zone |YES | |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20722_1_not_null |CHECK | | | |
| 2200_20722_2_not_null |CHECK | | | |
| 2200_20722_3_not_null |CHECK | | | |
| 2200_20722_6_not_null |CHECK | | | |
| 2200_20722_7_not_null |CHECK | | | |
| admin_notification_receipts_notification_id_fkey |FOREIGN KEY |notification_id |public.admin_notifications |id |
| admin_notification_receipts_pkey |PRIMARY KEY |id |public.admin_notification_receipts |id |
| admin_notification_receipts_user_id_fkey |FOREIGN KEY |user_id | | |
| admin_notification_receipts_user_id_notification_id_key |UNIQUE |user_id, user_id, notification_id, notification_id |public.admin_notification_receipts |notification_id, user_id, notification_id, user_id |

### Indexes

| Name |Definition |
| --- |--- |
| admin_notification_receipts_pkey |CREATE UNIQUE INDEX admin_notification_receipts_pkey ON public.admin_notification_receipts USING btree (id) |
| admin_notification_receipts_user_id_notification_id_key |CREATE UNIQUE INDEX admin_notification_receipts_user_id_notification_id_key ON public.admin_notification_receipts USING btree (user_id, notification_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Users can view own notification receipts |SELECT |authenticated |(user_id = auth.uid()) | |
| Users can write own notification receipts |ALL |authenticated |(user_id = auth.uid()) |(user_id = auth.uid()) |

### Triggers

_None._

## public.admin_notifications

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |event_type |text |NO | |NO |NEVER |
| 3 |severity |text |NO |'info'::text |NO |NEVER |
| 4 |title |text |NO | |NO |NEVER |
| 5 |message |text |NO | |NO |NEVER |
| 6 |href |text |YES | |NO |NEVER |
| 7 |metadata |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 8 |related_user_id |uuid |YES | |NO |NEVER |
| 9 |related_ticket_id |uuid |YES | |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20417_10_not_null |CHECK | | | |
| 2200_20417_1_not_null |CHECK | | | |
| 2200_20417_2_not_null |CHECK | | | |
| 2200_20417_3_not_null |CHECK | | | |
| 2200_20417_4_not_null |CHECK | | | |
| 2200_20417_5_not_null |CHECK | | | |
| 2200_20417_7_not_null |CHECK | | | |
| admin_notifications_pkey |PRIMARY KEY |id |public.admin_notifications |id |
| admin_notifications_related_ticket_id_fkey |FOREIGN KEY |related_ticket_id |public.helpdesk_tickets |id |
| admin_notifications_related_user_id_fkey |FOREIGN KEY |related_user_id | | |
| admin_notifications_severity_check |CHECK | |public.admin_notifications |severity |

### Indexes

| Name |Definition |
| --- |--- |
| admin_notifications_created_at_idx |CREATE INDEX admin_notifications_created_at_idx ON public.admin_notifications USING btree (created_at DESC) |
| admin_notifications_event_type_idx |CREATE INDEX admin_notifications_event_type_idx ON public.admin_notifications USING btree (event_type, created_at DESC) |
| admin_notifications_pkey |CREATE UNIQUE INDEX admin_notifications_pkey ON public.admin_notifications USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can create admin notifications |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Staff can read admin notifications |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.analytics_crm_funnel_by_stage_period

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |period_granularity |text |YES | |NO |NEVER |
| 2 |period_start |date |YES | |NO |NEVER |
| 3 |stage |text |YES | |NO |NEVER |
| 4 |opportunity_count |bigint(64,0) |YES | |NO |NEVER |
| 5 |pipeline_value |numeric |YES | |NO |NEVER |
| 6 |weighted_pipeline_value |numeric |YES | |NO |NEVER |
| 7 |avg_close_probability |numeric |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.analytics_daily_kpi

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |kpi_date |date |YES | |NO |NEVER |
| 2 |quotes_created |bigint(64,0) |YES | |NO |NEVER |
| 3 |quotes_accepted |bigint(64,0) |YES | |NO |NEVER |
| 4 |quote_acceptance_rate |numeric |YES | |NO |NEVER |
| 5 |quoted_revenue |numeric |YES | |NO |NEVER |
| 6 |accepted_revenue |numeric |YES | |NO |NEVER |
| 7 |quoted_cost |numeric |YES | |NO |NEVER |
| 8 |quoted_margin_amount |numeric |YES | |NO |NEVER |
| 9 |quoted_margin_rate |numeric |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.analytics_quote_costing_period

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |period_start |date |YES | |NO |NEVER |
| 2 |status |text |YES | |NO |NEVER |
| 3 |quote_count |bigint(64,0) |YES | |NO |NEVER |
| 4 |sell_total |numeric |YES | |NO |NEVER |
| 5 |cost_total |numeric |YES | |NO |NEVER |
| 6 |margin_total |numeric |YES | |NO |NEVER |
| 7 |margin_rate |numeric |YES | |NO |NEVER |
| 8 |accepted_quotes |bigint(64,0) |YES | |NO |NEVER |
| 9 |acceptance_rate |numeric |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.api_audit_log

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |api_key_id |uuid |YES | |NO |NEVER |
| 3 |method |text |NO | |NO |NEVER |
| 4 |resource |text |NO | |NO |NEVER |
| 5 |resource_id |text |YES | |NO |NEVER |
| 6 |status |integer(32,0) |NO | |NO |NEVER |
| 7 |request_summary |jsonb |YES |'{}'::jsonb |NO |NEVER |
| 8 |response_summary |jsonb |YES |'{}'::jsonb |NO |NEVER |
| 9 |ip |text |YES | |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22239_10_not_null |CHECK | | | |
| 2200_22239_1_not_null |CHECK | | | |
| 2200_22239_3_not_null |CHECK | | | |
| 2200_22239_4_not_null |CHECK | | | |
| 2200_22239_6_not_null |CHECK | | | |
| api_audit_log_api_key_id_fkey |FOREIGN KEY |api_key_id |public.api_keys |id |
| api_audit_log_pkey |PRIMARY KEY |id |public.api_audit_log |id |

### Indexes

| Name |Definition |
| --- |--- |
| api_audit_log_pkey |CREATE UNIQUE INDEX api_audit_log_pkey ON public.api_audit_log USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins read API audit log |SELECT |authenticated |has_role(auth.uid(), 'admin'::app_role) | |

### Triggers

_None._

## public.api_keys

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |key_prefix |text |NO | |NO |NEVER |
| 4 |key_hash |text |NO | |NO |NEVER |
| 5 |scopes |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 6 |created_by |uuid |YES | |NO |NEVER |
| 7 |last_used_at |timestamp with time zone |YES | |NO |NEVER |
| 8 |expires_at |timestamp with time zone |YES | |NO |NEVER |
| 9 |revoked_at |timestamp with time zone |YES | |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 12 |draft_pricelist_version_id |integer(32,0) |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22216_10_not_null |CHECK | | | |
| 2200_22216_11_not_null |CHECK | | | |
| 2200_22216_1_not_null |CHECK | | | |
| 2200_22216_2_not_null |CHECK | | | |
| 2200_22216_3_not_null |CHECK | | | |
| 2200_22216_4_not_null |CHECK | | | |
| 2200_22216_5_not_null |CHECK | | | |
| api_keys_created_by_fkey |FOREIGN KEY |created_by | | |
| api_keys_draft_pricelist_version_id_fkey |FOREIGN KEY |draft_pricelist_version_id |public.pricelist_versions |id |
| api_keys_key_hash_key |UNIQUE |key_hash |public.api_keys |key_hash |
| api_keys_pkey |PRIMARY KEY |id |public.api_keys |id |

### Indexes

| Name |Definition |
| --- |--- |
| api_keys_key_hash_key |CREATE UNIQUE INDEX api_keys_key_hash_key ON public.api_keys USING btree (key_hash) |
| api_keys_pkey |CREATE UNIQUE INDEX api_keys_pkey ON public.api_keys USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins manage API keys |ALL |authenticated |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

_None._

## public.audit_log

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |table_name |text |NO | |NO |NEVER |
| 3 |record_id |uuid |NO | |NO |NEVER |
| 4 |action |text |NO | |NO |NEVER |
| 5 |user_id |uuid |NO | |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |old_data |jsonb |YES | |NO |NEVER |
| 8 |new_data |jsonb |YES | |NO |NEVER |
| 9 |change_summary |jsonb |YES | |NO |NEVER |
| 10 |reason |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18169_1_not_null |CHECK | | | |
| 2200_18169_2_not_null |CHECK | | | |
| 2200_18169_3_not_null |CHECK | | | |
| 2200_18169_4_not_null |CHECK | | | |
| 2200_18169_5_not_null |CHECK | | | |
| 2200_18169_6_not_null |CHECK | | | |
| audit_log_pkey |PRIMARY KEY |id |public.audit_log |id |

### Indexes

| Name |Definition |
| --- |--- |
| audit_log_pkey |CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id) |
| idx_audit_log_created_at |CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC) |
| idx_audit_log_record_id |CREATE INDEX idx_audit_log_record_id ON public.audit_log USING btree (record_id) |
| idx_audit_log_table_name |CREATE INDEX idx_audit_log_table_name ON public.audit_log USING btree (table_name) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can select audit_log |SELECT |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert audit_log |INSERT |public | |has_edit_role(auth.uid()) |
| Staff can select audit_log |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.balances

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |innovations_customer_id |integer(32,0) |NO | |NO |NEVER |
| 2 |customer_id |integer(32,0) |YES | |NO |NEVER |
| 3 |account_number |text |YES | |NO |NEVER |
| 4 |credit_limit |numeric |YES | |NO |NEVER |
| 5 |current_balance |numeric |YES | |NO |NEVER |
| 6 |last_statement_amount |numeric |YES | |NO |NEVER |
| 7 |last_statement_date |date |YES | |NO |NEVER |
| 8 |last_payment_amount |numeric |YES | |NO |NEVER |
| 9 |last_payment_date |date |YES | |NO |NEVER |
| 10 |synced_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22156_10_not_null |CHECK | | | |
| 2200_22156_1_not_null |CHECK | | | |
| balances_customer_id_fkey |FOREIGN KEY |customer_id |public.customers |id |
| balances_pkey |PRIMARY KEY |innovations_customer_id |public.balances |innovations_customer_id |

### Indexes

| Name |Definition |
| --- |--- |
| balances_customer_id_idx |CREATE INDEX balances_customer_id_idx ON public.balances USING btree (customer_id) |
| balances_pkey |CREATE UNIQUE INDEX balances_pkey ON public.balances USING btree (innovations_customer_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Customers read own balance |SELECT |authenticated |(can_access_customer_portal_feature(auth.uid(), 'statements'::text) AND (customer_id IN ( SELECT profiles.crm_customer_id<br>   FROM profiles<br>  WHERE (profiles.user_id = auth.uid())))) | |
| Staff read balances |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.balances_public

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |customer_id |integer(32,0) |YES | |NO |NEVER |
| 2 |account_number |text |YES | |NO |NEVER |
| 3 |credit_limit |numeric |YES | |NO |NEVER |
| 4 |current_balance |numeric |YES | |NO |NEVER |
| 5 |last_statement_amount |numeric |YES | |NO |NEVER |
| 6 |last_statement_date |date |YES | |NO |NEVER |
| 7 |last_payment_amount |numeric |YES | |NO |NEVER |
| 8 |last_payment_date |date |YES | |NO |NEVER |
| 9 |synced_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.bank_payment_portals

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |bank_name |text |NO | |NO |NEVER |
| 2 |portal_url |text |YES | |NO |NEVER |
| 3 |notes |text |YES | |NO |NEVER |
| 4 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |innovations_eft_institution_id |bigint(64,0) |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22170_1_not_null |CHECK | | | |
| 2200_22170_4_not_null |CHECK | | | |
| bank_payment_portals_innovations_eft_institution_id_key |UNIQUE |innovations_eft_institution_id |public.bank_payment_portals |innovations_eft_institution_id |
| bank_payment_portals_pkey |PRIMARY KEY |bank_name |public.bank_payment_portals |bank_name |

### Indexes

| Name |Definition |
| --- |--- |
| bank_payment_portals_innovations_eft_institution_id_key |CREATE UNIQUE INDEX bank_payment_portals_innovations_eft_institution_id_key ON public.bank_payment_portals USING btree (innovations_eft_institution_id) |
| bank_payment_portals_pkey |CREATE UNIQUE INDEX bank_payment_portals_pkey ON public.bank_payment_portals USING btree (bank_name) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated read bank payment portals |SELECT |authenticated |true | |
| Staff write bank payment portals |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.blog_posts

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |title |text |NO | |NO |NEVER |
| 3 |slug |text |YES | |NO |NEVER |
| 4 |content |text |NO |''::text |NO |NEVER |
| 5 |excerpt |text |YES |''::text |NO |NEVER |
| 6 |status |text |NO |'draft'::text |NO |NEVER |
| 7 |author_id |uuid |YES | |NO |NEVER |
| 8 |cover_image_url |text |YES | |NO |NEVER |
| 9 |published_at |timestamp with time zone |YES | |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 12 |body_json |jsonb |YES | |NO |NEVER |
| 13 |entry_type |text |NO |'blog_post'::text |NO |NEVER |
| 14 |author_name |text |YES | |NO |NEVER |
| 15 |cover_image_alt |text |YES | |NO |NEVER |
| 16 |category |text |YES | |NO |NEVER |
| 17 |tags |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 18 |related_post_slugs |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 19 |seo_title |text |YES | |NO |NEVER |
| 20 |seo_description |text |YES | |NO |NEVER |
| 21 |source_url |text |YES | |NO |NEVER |
| 22 |is_featured |boolean |NO |false |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19745_10_not_null |CHECK | | | |
| 2200_19745_11_not_null |CHECK | | | |
| 2200_19745_13_not_null |CHECK | | | |
| 2200_19745_17_not_null |CHECK | | | |
| 2200_19745_18_not_null |CHECK | | | |
| 2200_19745_1_not_null |CHECK | | | |
| 2200_19745_22_not_null |CHECK | | | |
| 2200_19745_2_not_null |CHECK | | | |
| 2200_19745_4_not_null |CHECK | | | |
| 2200_19745_6_not_null |CHECK | | | |
| blog_posts_entry_type_check |CHECK | |public.blog_posts |entry_type |
| blog_posts_pkey |PRIMARY KEY |id |public.blog_posts |id |
| blog_posts_slug_key |UNIQUE |slug |public.blog_posts |slug |
| blog_posts_status_check |CHECK | |public.blog_posts |status |

### Indexes

| Name |Definition |
| --- |--- |
| blog_posts_pkey |CREATE UNIQUE INDEX blog_posts_pkey ON public.blog_posts USING btree (id) |
| blog_posts_slug_key |CREATE UNIQUE INDEX blog_posts_slug_key ON public.blog_posts USING btree (slug) |
| idx_blog_posts_category |CREATE INDEX idx_blog_posts_category ON public.blog_posts USING btree (category) |
| idx_blog_posts_entry_type |CREATE INDEX idx_blog_posts_entry_type ON public.blog_posts USING btree (entry_type) |
| idx_blog_posts_is_featured |CREATE INDEX idx_blog_posts_is_featured ON public.blog_posts USING btree (is_featured) |
| idx_blog_posts_tags |CREATE INDEX idx_blog_posts_tags ON public.blog_posts USING gin (tags) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage blog posts |ALL |authenticated |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |
| Anyone can read published blog posts |SELECT |public |(status = 'published'::text) | |

### Triggers

_None._

## public.brands

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |is_active |boolean |NO |true |NO |NEVER |
| 4 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |abbrev |text |NO |''::text |NO |NEVER |
| 7 |code |text |NO |''::text |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17742_1_not_null |CHECK | | | |
| 2200_17742_2_not_null |CHECK | | | |
| 2200_17742_3_not_null |CHECK | | | |
| 2200_17742_4_not_null |CHECK | | | |
| 2200_17742_5_not_null |CHECK | | | |
| 2200_17742_6_not_null |CHECK | | | |
| 2200_17742_7_not_null |CHECK | | | |
| brands_name_key |UNIQUE |name |public.brands |name |
| brands_pkey |PRIMARY KEY |id |public.brands |id |

### Indexes

| Name |Definition |
| --- |--- |
| brands_name_key |CREATE UNIQUE INDEX brands_name_key ON public.brands USING btree (name) |
| brands_pkey |CREATE UNIQUE INDEX brands_pkey ON public.brands USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Anon can view brands |SELECT |anon |true | |
| Editors can delete brands |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert brands |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update brands |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Role users can select brands |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_brands_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.cadence_enrollments

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |contact_id |uuid |NO | |NO |NEVER |
| 3 |cadence_id |uuid |NO | |NO |NEVER |
| 4 |status |text |NO |'active'::text |NO |NEVER |
| 5 |current_step |integer(32,0) |NO |0 |NO |NEVER |
| 6 |next_step_due_at |timestamp with time zone |YES | |NO |NEVER |
| 7 |enrolled_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |completed_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22379_1_not_null |CHECK | | | |
| 2200_22379_2_not_null |CHECK | | | |
| 2200_22379_3_not_null |CHECK | | | |
| 2200_22379_4_not_null |CHECK | | | |
| 2200_22379_5_not_null |CHECK | | | |
| 2200_22379_7_not_null |CHECK | | | |
| cadence_enrollments_cadence_id_fkey |FOREIGN KEY |cadence_id |public.cadences |id |
| cadence_enrollments_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| cadence_enrollments_pkey |PRIMARY KEY |id |public.cadence_enrollments |id |

### Indexes

| Name |Definition |
| --- |--- |
| cadence_enrollments_pkey |CREATE UNIQUE INDEX cadence_enrollments_pkey ON public.cadence_enrollments USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Role users can select cadence enrollments |SELECT |authenticated |has_any_role(auth.uid()) | |
| Staff manage CRM enrollments |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.cadence_steps

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |cadence_id |uuid |NO | |NO |NEVER |
| 3 |step_order |integer(32,0) |NO | |NO |NEVER |
| 4 |channel |text |NO | |NO |NEVER |
| 5 |delay_days |integer(32,0) |NO |0 |NO |NEVER |
| 6 |subject |text |YES | |NO |NEVER |
| 7 |body_template |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22363_1_not_null |CHECK | | | |
| 2200_22363_2_not_null |CHECK | | | |
| 2200_22363_3_not_null |CHECK | | | |
| 2200_22363_4_not_null |CHECK | | | |
| 2200_22363_5_not_null |CHECK | | | |
| cadence_steps_cadence_id_fkey |FOREIGN KEY |cadence_id |public.cadences |id |
| cadence_steps_cadence_id_step_order_key |UNIQUE |cadence_id, cadence_id, step_order, step_order |public.cadence_steps |cadence_id, step_order, cadence_id, step_order |
| cadence_steps_pkey |PRIMARY KEY |id |public.cadence_steps |id |

### Indexes

| Name |Definition |
| --- |--- |
| cadence_steps_cadence_id_step_order_key |CREATE UNIQUE INDEX cadence_steps_cadence_id_step_order_key ON public.cadence_steps USING btree (cadence_id, step_order) |
| cadence_steps_pkey |CREATE UNIQUE INDEX cadence_steps_pkey ON public.cadence_steps USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Role users can select cadence steps |SELECT |authenticated |has_any_role(auth.uid()) | |
| Staff manage CRM cadence steps |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.cadences

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |pipeline |text |NO | |NO |NEVER |
| 4 |target_stage |text |YES | |NO |NEVER |
| 5 |description |text |YES | |NO |NEVER |
| 6 |is_active |boolean |NO |true |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22348_1_not_null |CHECK | | | |
| 2200_22348_2_not_null |CHECK | | | |
| 2200_22348_3_not_null |CHECK | | | |
| 2200_22348_6_not_null |CHECK | | | |
| 2200_22348_7_not_null |CHECK | | | |
| cadences_pipeline_fkey |FOREIGN KEY |pipeline |public.crm_pipelines |key |
| cadences_pkey |PRIMARY KEY |id |public.cadences |id |

### Indexes

| Name |Definition |
| --- |--- |
| cadences_pkey |CREATE UNIQUE INDEX cadences_pkey ON public.cadences USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Role users can select cadences |SELECT |authenticated |has_any_role(auth.uid()) | |
| Staff manage CRM cadences |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.campaign_activation_performance

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |profile_id |uuid |YES | |NO |NEVER |
| 3 |contact_id |uuid |YES | |NO |NEVER |
| 4 |opportunity_id |uuid |YES | |NO |NEVER |
| 5 |lead_source |text |NO | |NO |NEVER |
| 6 |lead_segment |text |NO | |NO |NEVER |
| 7 |channel |text |NO | |NO |NEVER |
| 8 |campaign_name |text |NO | |NO |NEVER |
| 9 |impressions |integer(32,0) |NO |0 |NO |NEVER |
| 10 |clicks |integer(32,0) |NO |0 |NO |NEVER |
| 11 |qualified_leads |integer(32,0) |NO |0 |NO |NEVER |
| 12 |conversions |integer(32,0) |NO |0 |NO |NEVER |
| 13 |spend |numeric(12,2) |NO |0 |NO |NEVER |
| 14 |revenue |numeric(12,2) |NO |0 |NO |NEVER |
| 15 |event_date |date |NO |CURRENT_DATE |NO |NEVER |
| 16 |metadata |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 17 |created_by |uuid |NO |auth.uid() |NO |NEVER |
| 18 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19708_10_not_null |CHECK | | | |
| 2200_19708_11_not_null |CHECK | | | |
| 2200_19708_12_not_null |CHECK | | | |
| 2200_19708_13_not_null |CHECK | | | |
| 2200_19708_14_not_null |CHECK | | | |
| 2200_19708_15_not_null |CHECK | | | |
| 2200_19708_16_not_null |CHECK | | | |
| 2200_19708_17_not_null |CHECK | | | |
| 2200_19708_18_not_null |CHECK | | | |
| 2200_19708_1_not_null |CHECK | | | |
| 2200_19708_5_not_null |CHECK | | | |
| 2200_19708_6_not_null |CHECK | | | |
| 2200_19708_7_not_null |CHECK | | | |
| 2200_19708_8_not_null |CHECK | | | |
| 2200_19708_9_not_null |CHECK | | | |
| campaign_activation_performance_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| campaign_activation_performance_lead_segment_check |CHECK | |public.campaign_activation_performance |lead_segment |
| campaign_activation_performance_opportunity_id_fkey |FOREIGN KEY |opportunity_id |public.opportunities |id |
| campaign_activation_performance_pkey |PRIMARY KEY |id |public.campaign_activation_performance |id |
| campaign_activation_performance_profile_id_fkey |FOREIGN KEY |profile_id |public.campaign_activation_profiles |id |

### Indexes

| Name |Definition |
| --- |--- |
| campaign_activation_performance_pkey |CREATE UNIQUE INDEX campaign_activation_performance_pkey ON public.campaign_activation_performance USING btree (id) |
| campaign_activation_performance_rollup_idx |CREATE INDEX campaign_activation_performance_rollup_idx ON public.campaign_activation_performance USING btree (event_date DESC, lead_source, lead_segment, channel) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| campaign_activation_performance_select_auth |SELECT |public |has_any_role(auth.uid()) | |
| campaign_activation_performance_write_editors |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.campaign_activation_profiles

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |contact_id |uuid |YES | |NO |NEVER |
| 3 |opportunity_id |uuid |YES | |NO |NEVER |
| 4 |lead_source |text |NO |'unknown'::text |NO |NEVER |
| 5 |lead_segment |text |NO | |NO |NEVER |
| 6 |audience_hypotheses |jsonb |NO |'[]'::jsonb |NO |NEVER |
| 7 |creative_angles |jsonb |NO |'[]'::jsonb |NO |NEVER |
| 8 |channel_recommendations |jsonb |NO |'[]'::jsonb |NO |NEVER |
| 9 |meta_audience_definitions |jsonb |NO |'[]'::jsonb |NO |NEVER |
| 10 |meta_messaging_variants |jsonb |NO |'[]'::jsonb |NO |NEVER |
| 11 |packet |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 12 |created_by |uuid |NO |auth.uid() |NO |NEVER |
| 13 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 14 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19675_10_not_null |CHECK | | | |
| 2200_19675_11_not_null |CHECK | | | |
| 2200_19675_12_not_null |CHECK | | | |
| 2200_19675_13_not_null |CHECK | | | |
| 2200_19675_14_not_null |CHECK | | | |
| 2200_19675_1_not_null |CHECK | | | |
| 2200_19675_4_not_null |CHECK | | | |
| 2200_19675_5_not_null |CHECK | | | |
| 2200_19675_6_not_null |CHECK | | | |
| 2200_19675_7_not_null |CHECK | | | |
| 2200_19675_8_not_null |CHECK | | | |
| 2200_19675_9_not_null |CHECK | | | |
| campaign_activation_profiles_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| campaign_activation_profiles_lead_segment_check |CHECK | |public.campaign_activation_profiles |lead_segment |
| campaign_activation_profiles_opportunity_id_fkey |FOREIGN KEY |opportunity_id |public.opportunities |id |
| campaign_activation_profiles_pkey |PRIMARY KEY |id |public.campaign_activation_profiles |id |

### Indexes

| Name |Definition |
| --- |--- |
| campaign_activation_profiles_contact_idx |CREATE INDEX campaign_activation_profiles_contact_idx ON public.campaign_activation_profiles USING btree (contact_id, created_at DESC) |
| campaign_activation_profiles_pkey |CREATE UNIQUE INDEX campaign_activation_profiles_pkey ON public.campaign_activation_profiles USING btree (id) |
| campaign_activation_profiles_segment_idx |CREATE INDEX campaign_activation_profiles_segment_idx ON public.campaign_activation_profiles USING btree (lead_segment, lead_source, created_at DESC) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| campaign_activation_profiles_select_auth |SELECT |public |has_any_role(auth.uid()) | |
| campaign_activation_profiles_write_editors |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.cart_drafts

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |name |text |NO | |NO |NEVER |
| 4 |note |text |YES | |NO |NEVER |
| 5 |items |jsonb |NO |'[]'::jsonb |NO |NEVER |
| 6 |total_items |integer(32,0) |NO |0 |NO |NEVER |
| 7 |total_amount |numeric(12,2) |NO |0 |NO |NEVER |
| 8 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 9 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21353_1_not_null |CHECK | | | |
| 2200_21353_2_not_null |CHECK | | | |
| 2200_21353_3_not_null |CHECK | | | |
| 2200_21353_5_not_null |CHECK | | | |
| 2200_21353_6_not_null |CHECK | | | |
| 2200_21353_7_not_null |CHECK | | | |
| 2200_21353_8_not_null |CHECK | | | |
| 2200_21353_9_not_null |CHECK | | | |
| cart_drafts_pkey |PRIMARY KEY |id |public.cart_drafts |id |
| cart_drafts_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| cart_drafts_pkey |CREATE UNIQUE INDEX cart_drafts_pkey ON public.cart_drafts USING btree (id) |
| cart_drafts_user_id_updated_at_idx |CREATE INDEX cart_drafts_user_id_updated_at_idx ON public.cart_drafts USING btree (user_id, updated_at DESC) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Users can create their own cart drafts |INSERT |authenticated | |(auth.uid() = user_id) |
| Users can delete their own cart drafts |DELETE |authenticated |(auth.uid() = user_id) | |
| Users can update their own cart drafts |UPDATE |authenticated |(auth.uid() = user_id) |(auth.uid() = user_id) |
| Users can view their own cart drafts |SELECT |authenticated |(auth.uid() = user_id) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_cart_drafts_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.cart_items

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |product_id |integer(32,0) |NO | |NO |NEVER |
| 4 |product_name |text |NO | |NO |NEVER |
| 5 |product_price |numeric(10,2) |NO | |NO |NEVER |
| 6 |quantity |integer(32,0) |NO |1 |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 9 |product_type |text |NO |'lens'::text |NO |NEVER |
| 10 |variant_id |uuid |YES | |NO |NEVER |
| 11 |variant_label |text |YES | |NO |NEVER |
| 12 |variant_sku |text |YES | |NO |NEVER |
| 13 |variant_opc_code |text |YES | |NO |NEVER |
| 14 |variant_metadata |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 15 |sku |text |YES | |NO |NEVER |
| 16 |opc_code |text |YES | |NO |NEVER |
| 17 |variant_snapshot |jsonb |YES |'{}'::jsonb |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17654_14_not_null |CHECK | | | |
| 2200_17654_1_not_null |CHECK | | | |
| 2200_17654_2_not_null |CHECK | | | |
| 2200_17654_3_not_null |CHECK | | | |
| 2200_17654_4_not_null |CHECK | | | |
| 2200_17654_5_not_null |CHECK | | | |
| 2200_17654_6_not_null |CHECK | | | |
| 2200_17654_7_not_null |CHECK | | | |
| 2200_17654_8_not_null |CHECK | | | |
| 2200_17654_9_not_null |CHECK | | | |
| cart_items_pkey |PRIMARY KEY |id |public.cart_items |id |
| cart_items_quantity_positive |CHECK | |public.cart_items |quantity |
| cart_items_variant_id_fkey |FOREIGN KEY |variant_id |public.store_product_variants |id |

### Indexes

| Name |Definition |
| --- |--- |
| cart_items_pkey |CREATE UNIQUE INDEX cart_items_pkey ON public.cart_items USING btree (id) |
| cart_items_user_variant_unique_idx |CREATE UNIQUE INDEX cart_items_user_variant_unique_idx ON public.cart_items USING btree (user_id, product_type, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Users can add to their own cart |INSERT |public | |(auth.uid() = user_id) |
| Users can delete their own cart items |DELETE |public |(auth.uid() = user_id) | |
| Users can update their own cart items |UPDATE |public |(auth.uid() = user_id) | |
| Users can view their own cart items |SELECT |public |(auth.uid() = user_id) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_cart_items_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.catalog_assignments

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |catalog_template_id |integer(32,0) |YES | |NO |NEVER |
| 3 |customer_id |integer(32,0) |YES | |NO |NEVER |
| 4 |assigned_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21879_1_not_null |CHECK | | | |
| catalog_assignments_catalog_template_id_fkey |FOREIGN KEY |catalog_template_id |public.catalog_templates |id |
| catalog_assignments_pkey |PRIMARY KEY |id |public.catalog_assignments |id |

### Indexes

| Name |Definition |
| --- |--- |
| catalog_assignments_pkey |CREATE UNIQUE INDEX catalog_assignments_pkey ON public.catalog_assignments USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete catalog_assignments |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Role users can select catalog_assignments |SELECT |authenticated |has_any_role(auth.uid()) | |
| Staff manage catalog assignments |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.catalog_live

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |YES | |NO |NEVER |
| 2 |product_type |text |YES | |NO |NEVER |
| 3 |product_id |uuid |YES | |NO |NEVER |
| 4 |sku |text |YES | |NO |NEVER |
| 5 |name |text |YES | |NO |NEVER |
| 6 |category |text |YES | |NO |NEVER |
| 7 |supplier_id |uuid |YES | |NO |NEVER |
| 8 |supplier_name |text |YES | |NO |NEVER |
| 9 |cost |numeric |YES | |NO |NEVER |
| 10 |sell_price |numeric |YES | |NO |NEVER |
| 11 |currency |text |YES | |NO |NEVER |
| 12 |web_enabled |boolean |YES | |NO |NEVER |
| 13 |wspl_enabled |boolean |YES | |NO |NEVER |
| 14 |is_active |boolean |YES | |NO |NEVER |
| 15 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 16 |updated_at |timestamp with time zone |YES | |NO |NEVER |
| 17 |lenstype |text |YES | |NO |NEVER |
| 18 |material |text |YES | |NO |NEVER |
| 19 |mftype |text |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.catalog_page_objects

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |page_id |uuid |NO | |NO |NEVER |
| 3 |object_type |text |NO |'text'::text |NO |NEVER |
| 4 |x |numeric |NO |0 |NO |NEVER |
| 5 |y |numeric |NO |0 |NO |NEVER |
| 6 |width |numeric |NO |200 |NO |NEVER |
| 7 |height |numeric |YES | |NO |NEVER |
| 8 |rotation |numeric |NO |0 |NO |NEVER |
| 9 |z_index |integer(32,0) |NO |0 |NO |NEVER |
| 10 |content |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 11 |style |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 12 |is_locked |boolean |NO |false |NO |NEVER |
| 13 |is_visible |boolean |NO |true |NO |NEVER |
| 14 |label |text |YES | |NO |NEVER |
| 15 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 16 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21909_10_not_null |CHECK | | | |
| 2200_21909_11_not_null |CHECK | | | |
| 2200_21909_12_not_null |CHECK | | | |
| 2200_21909_13_not_null |CHECK | | | |
| 2200_21909_15_not_null |CHECK | | | |
| 2200_21909_16_not_null |CHECK | | | |
| 2200_21909_1_not_null |CHECK | | | |
| 2200_21909_2_not_null |CHECK | | | |
| 2200_21909_3_not_null |CHECK | | | |
| 2200_21909_4_not_null |CHECK | | | |
| 2200_21909_5_not_null |CHECK | | | |
| 2200_21909_6_not_null |CHECK | | | |
| 2200_21909_8_not_null |CHECK | | | |
| 2200_21909_9_not_null |CHECK | | | |
| catalog_page_objects_page_id_fkey |FOREIGN KEY |page_id |public.catalog_pages |id |
| catalog_page_objects_pkey |PRIMARY KEY |id |public.catalog_page_objects |id |

### Indexes

| Name |Definition |
| --- |--- |
| catalog_page_objects_pkey |CREATE UNIQUE INDEX catalog_page_objects_pkey ON public.catalog_page_objects USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can read catalog page objects |SELECT |authenticated |true | |
| Staff manage catalog page objects |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.catalog_pages

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |catalog_template_id |integer(32,0) |NO | |NO |NEVER |
| 3 |page_number |integer(32,0) |NO |1 |NO |NEVER |
| 4 |page_settings |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21890_1_not_null |CHECK | | | |
| 2200_21890_2_not_null |CHECK | | | |
| 2200_21890_3_not_null |CHECK | | | |
| 2200_21890_4_not_null |CHECK | | | |
| 2200_21890_5_not_null |CHECK | | | |
| 2200_21890_6_not_null |CHECK | | | |
| catalog_pages_catalog_template_id_fkey |FOREIGN KEY |catalog_template_id |public.catalog_templates |id |
| catalog_pages_catalog_template_id_page_number_key |UNIQUE |catalog_template_id, catalog_template_id, page_number, page_number |public.catalog_pages |catalog_template_id, page_number, catalog_template_id, page_number |
| catalog_pages_pkey |PRIMARY KEY |id |public.catalog_pages |id |

### Indexes

| Name |Definition |
| --- |--- |
| catalog_pages_catalog_template_id_page_number_key |CREATE UNIQUE INDEX catalog_pages_catalog_template_id_page_number_key ON public.catalog_pages USING btree (catalog_template_id, page_number) |
| catalog_pages_pkey |CREATE UNIQUE INDEX catalog_pages_pkey ON public.catalog_pages USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can read catalog pages |SELECT |authenticated |true | |
| Staff manage catalog pages |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.catalog_sections

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |catalog_template_id |integer(32,0) |YES | |NO |NEVER |
| 3 |section_type |text |NO | |NO |NEVER |
| 4 |pricelist_version_id |integer(32,0) |YES | |NO |NEVER |
| 5 |format_choice |text |YES |'list'::text |NO |NEVER |
| 6 |article_id |uuid |YES | |NO |NEVER |
| 7 |sort_order |integer(32,0) |YES | |NO |NEVER |
| 8 |is_included |boolean |YES |true |NO |NEVER |
| 9 |custom_title |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21854_1_not_null |CHECK | | | |
| 2200_21854_3_not_null |CHECK | | | |
| catalog_sections_article_id_fkey |FOREIGN KEY |article_id |public.help_articles |id |
| catalog_sections_catalog_template_id_fkey |FOREIGN KEY |catalog_template_id |public.catalog_templates |id |
| catalog_sections_pkey |PRIMARY KEY |id |public.catalog_sections |id |
| catalog_sections_pricelist_version_id_fkey |FOREIGN KEY |pricelist_version_id |public.pricelist_versions |id |

### Indexes

| Name |Definition |
| --- |--- |
| catalog_sections_pkey |CREATE UNIQUE INDEX catalog_sections_pkey ON public.catalog_sections USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete catalog_sections |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Role users can select catalog_sections |SELECT |authenticated |has_any_role(auth.uid()) | |
| Staff manage catalog sections |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.catalog_templates

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |created_by |text |YES | |NO |NEVER |
| 4 |cover_title |text |YES | |NO |NEVER |
| 5 |cover_subtitle |text |YES | |NO |NEVER |
| 6 |gradient_color_start |text |YES |'#1e4db7'::text |NO |NEVER |
| 7 |gradient_color_end |text |YES |'#0f2a5e'::text |NO |NEVER |
| 8 |created_at |timestamp with time zone |YES |now() |NO |NEVER |
| 9 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |
| 10 |status |text |NO |'draft'::text |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21824_10_not_null |CHECK | | | |
| 2200_21824_1_not_null |CHECK | | | |
| 2200_21824_2_not_null |CHECK | | | |
| catalog_templates_pkey |PRIMARY KEY |id |public.catalog_templates |id |

### Indexes

| Name |Definition |
| --- |--- |
| catalog_templates_pkey |CREATE UNIQUE INDEX catalog_templates_pkey ON public.catalog_templates USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete catalog_templates |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Role users can select catalog_templates |SELECT |authenticated |has_any_role(auth.uid()) | |
| Staff manage catalog templates |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.charge_types

Type: table
RLS enabled: yes
Estimated rows: 9

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 4 |is_active |boolean |NO |true |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18719_1_not_null |CHECK | | | |
| 2200_18719_2_not_null |CHECK | | | |
| 2200_18719_3_not_null |CHECK | | | |
| 2200_18719_4_not_null |CHECK | | | |
| 2200_18719_5_not_null |CHECK | | | |
| 2200_18719_6_not_null |CHECK | | | |
| charge_types_name_key |UNIQUE |name |public.charge_types |name |
| charge_types_pkey |PRIMARY KEY |id |public.charge_types |id |

### Indexes

| Name |Definition |
| --- |--- |
| charge_types_name_key |CREATE UNIQUE INDEX charge_types_name_key ON public.charge_types USING btree (name) |
| charge_types_pkey |CREATE UNIQUE INDEX charge_types_pkey ON public.charge_types USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Allow edit role to delete charge_types |DELETE |authenticated |has_edit_role(auth.uid()) | |
| Allow edit role to insert charge_types |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Allow edit role to update charge_types |UPDATE |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Authenticated users can read charge_types |SELECT |public |(auth.uid() IS NOT NULL) | |

### Triggers

_None._

## public.company_settings

Type: table
RLS enabled: yes
Estimated rows: 1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |import_duty |numeric |NO |0 |NO |NEVER |
| 3 |frames_duty |numeric |NO |0 |NO |NEVER |
| 4 |default_vat |numeric |NO |0 |NO |NEVER |
| 5 |labour_percent |numeric |NO |0 |NO |NEVER |
| 6 |profit_percent |numeric |NO |0 |NO |NEVER |
| 7 |import_multiple |numeric |NO |1 |NO |NEVER |
| 8 |wholesale_stock_percentage |numeric |NO |0 |NO |NEVER |
| 9 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 10 |company_name |text |NO |'Classic Visions'::text |NO |NEVER |
| 11 |primary_contact |text |NO |'Randall Hunte'::text |NO |NEVER |
| 12 |email |text |NO |'info@classicvisions.net'::text |NO |NEVER |
| 13 |tel |text |NO |'246-433-4928'::text |NO |NEVER |
| 14 |fax |text |NO |'246-433-4927'::text |NO |NEVER |
| 15 |tax_tin |text |NO |'1000006494000'::text |NO |NEVER |
| 16 |base_currency |text |NO |'BBD'::text |NO |NEVER |
| 17 |business_calendar |text |NO |'Business HRS'::text |NO |NEVER |
| 18 |slogan |text |NO |'Helping people see better'::text |NO |NEVER |
| 19 |logo_file_name |text |YES | |NO |NEVER |
| 20 |logo_url |text |YES | |NO |NEVER |
| 21 |physical_country |text |NO |'Barbados'::text |NO |NEVER |
| 22 |physical_state |text |NO |'St John'::text |NO |NEVER |
| 23 |physical_county |text |NO |'Uplands'::text |NO |NEVER |
| 24 |physical_line1 |text |NO |'Uplands'::text |NO |NEVER |
| 25 |physical_line2 |text |NO |'St. John'::text |NO |NEVER |
| 26 |physical_city |text |NO |'Bridgetown'::text |NO |NEVER |
| 27 |physical_postcode |text |NO |'BB20031'::text |NO |NEVER |
| 28 |bill_use_physical |boolean |NO |true |NO |NEVER |
| 29 |bill_country |text |NO |'Barbados'::text |NO |NEVER |
| 30 |bill_state |text |NO |'St John'::text |NO |NEVER |
| 31 |bill_county |text |NO |'Uplands'::text |NO |NEVER |
| 32 |bill_line1 |text |NO |'Uplands'::text |NO |NEVER |
| 33 |bill_line2 |text |NO |'St. John'::text |NO |NEVER |
| 34 |bill_city |text |NO |'Bridgetown'::text |NO |NEVER |
| 35 |bill_postcode |text |NO |'BB20031'::text |NO |NEVER |
| 36 |ship_use_physical |boolean |NO |true |NO |NEVER |
| 37 |ship_country |text |NO |'Barbados'::text |NO |NEVER |
| 38 |ship_state |text |NO |'St John'::text |NO |NEVER |
| 39 |ship_county |text |NO |'Uplands'::text |NO |NEVER |
| 40 |ship_line1 |text |NO |'Uplands'::text |NO |NEVER |
| 41 |ship_line2 |text |NO |'St. John'::text |NO |NEVER |
| 42 |ship_city |text |NO |'Bridgetown'::text |NO |NEVER |
| 43 |ship_postcode |text |NO |'BB20031'::text |NO |NEVER |
| 44 |pdf_header_html |text |NO |''::text |NO |NEVER |
| 45 |pdf_footer_html |text |NO |''::text |NO |NEVER |
| 46 |feedback_email |text |NO |''::text |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18090_10_not_null |CHECK | | | |
| 2200_18090_11_not_null |CHECK | | | |
| 2200_18090_12_not_null |CHECK | | | |
| 2200_18090_13_not_null |CHECK | | | |
| 2200_18090_14_not_null |CHECK | | | |
| 2200_18090_15_not_null |CHECK | | | |
| 2200_18090_16_not_null |CHECK | | | |
| 2200_18090_17_not_null |CHECK | | | |
| 2200_18090_18_not_null |CHECK | | | |
| 2200_18090_1_not_null |CHECK | | | |
| 2200_18090_21_not_null |CHECK | | | |
| 2200_18090_22_not_null |CHECK | | | |
| 2200_18090_23_not_null |CHECK | | | |
| 2200_18090_24_not_null |CHECK | | | |
| 2200_18090_25_not_null |CHECK | | | |
| 2200_18090_26_not_null |CHECK | | | |
| 2200_18090_27_not_null |CHECK | | | |
| 2200_18090_28_not_null |CHECK | | | |
| 2200_18090_29_not_null |CHECK | | | |
| 2200_18090_2_not_null |CHECK | | | |
| 2200_18090_30_not_null |CHECK | | | |
| 2200_18090_31_not_null |CHECK | | | |
| 2200_18090_32_not_null |CHECK | | | |
| 2200_18090_33_not_null |CHECK | | | |
| 2200_18090_34_not_null |CHECK | | | |
| 2200_18090_35_not_null |CHECK | | | |
| 2200_18090_36_not_null |CHECK | | | |
| 2200_18090_37_not_null |CHECK | | | |
| 2200_18090_38_not_null |CHECK | | | |
| 2200_18090_39_not_null |CHECK | | | |
| 2200_18090_3_not_null |CHECK | | | |
| 2200_18090_40_not_null |CHECK | | | |
| 2200_18090_41_not_null |CHECK | | | |
| 2200_18090_42_not_null |CHECK | | | |
| 2200_18090_43_not_null |CHECK | | | |
| 2200_18090_44_not_null |CHECK | | | |
| 2200_18090_45_not_null |CHECK | | | |
| 2200_18090_46_not_null |CHECK | | | |
| 2200_18090_4_not_null |CHECK | | | |
| 2200_18090_5_not_null |CHECK | | | |
| 2200_18090_6_not_null |CHECK | | | |
| 2200_18090_7_not_null |CHECK | | | |
| 2200_18090_8_not_null |CHECK | | | |
| 2200_18090_9_not_null |CHECK | | | |
| company_settings_pkey |PRIMARY KEY |id |public.company_settings |id |

### Indexes

| Name |Definition |
| --- |--- |
| company_settings_pkey |CREATE UNIQUE INDEX company_settings_pkey ON public.company_settings USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can select company_settings |SELECT |public |has_role(auth.uid(), 'admin'::app_role) | |
| Admins can update company_settings |UPDATE |public |has_role(auth.uid(), 'admin'::app_role) | |

### Triggers

_None._

## public.contact_external_links

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |local_contact_id |uuid |NO | |NO |NEVER |
| 3 |provider |text |NO |'odoo'::text |NO |NEVER |
| 4 |external_model |text |NO |'res.partner'::text |NO |NEVER |
| 5 |external_id |text |NO | |NO |NEVER |
| 6 |external_company_id |text |NO | |NO |NEVER |
| 7 |external_payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 8 |etag |text |YES | |NO |NEVER |
| 9 |payload_hash |text |YES | |NO |NEVER |
| 10 |last_pulled_at |timestamp with time zone |YES | |NO |NEVER |
| 11 |last_pushed_at |timestamp with time zone |YES | |NO |NEVER |
| 12 |last_remote_write_date |timestamp with time zone |YES | |NO |NEVER |
| 13 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 14 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19497_13_not_null |CHECK | | | |
| 2200_19497_14_not_null |CHECK | | | |
| 2200_19497_1_not_null |CHECK | | | |
| 2200_19497_2_not_null |CHECK | | | |
| 2200_19497_3_not_null |CHECK | | | |
| 2200_19497_4_not_null |CHECK | | | |
| 2200_19497_5_not_null |CHECK | | | |
| 2200_19497_6_not_null |CHECK | | | |
| 2200_19497_7_not_null |CHECK | | | |
| contact_external_links_external_model_check |CHECK | |public.contact_external_links |external_model |
| contact_external_links_local_contact_id_fkey |FOREIGN KEY |local_contact_id |public.contacts |id |
| contact_external_links_pkey |PRIMARY KEY |id |public.contact_external_links |id |
| contact_external_links_provider_check |CHECK | |public.contact_external_links |provider |
| contact_external_links_provider_external_model_external_id__key |UNIQUE |provider, provider, provider, provider, external_model, external_model, external_model, external_model, external_id, external_id, external_id, external_id, external_company_id, external_company_id, external_company_id, external_company_id |public.contact_external_links |provider, external_model, external_id, external_company_id, external_company_id, external_id, external_model, provider, external_company_id, provider, external_model, external_id, external_company_id, external_id, external_model, provider |

### Indexes

| Name |Definition |
| --- |--- |
| contact_external_links_pkey |CREATE UNIQUE INDEX contact_external_links_pkey ON public.contact_external_links USING btree (id) |
| contact_external_links_provider_external_model_external_id__key |CREATE UNIQUE INDEX contact_external_links_provider_external_model_external_id__key ON public.contact_external_links USING btree (provider, external_model, external_id, external_company_id) |
| idx_contact_external_links_local_contact_id |CREATE INDEX idx_contact_external_links_local_contact_id ON public.contact_external_links USING btree (local_contact_id) |
| idx_contact_external_links_sync_timestamps |CREATE INDEX idx_contact_external_links_sync_timestamps ON public.contact_external_links USING btree (last_pulled_at, last_pushed_at, last_remote_write_date) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete contact_external_links |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert contact_external_links |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update contact_external_links |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select contact_external_links |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.contact_field_mappings

Type: table
RLS enabled: yes
Estimated rows: 18

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |provider |text |NO |'odoo'::text |NO |NEVER |
| 3 |external_model |text |NO |'res.partner'::text |NO |NEVER |
| 4 |external_field |text |NO | |NO |NEVER |
| 5 |local_field |text |YES | |NO |NEVER |
| 6 |sync_direction |text |NO |'bidirectional'::text |NO |NEVER |
| 7 |is_required |boolean |NO |false |NO |NEVER |
| 8 |transform_rule |text |YES | |NO |NEVER |
| 9 |notes |text |YES | |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19555_10_not_null |CHECK | | | |
| 2200_19555_11_not_null |CHECK | | | |
| 2200_19555_1_not_null |CHECK | | | |
| 2200_19555_2_not_null |CHECK | | | |
| 2200_19555_3_not_null |CHECK | | | |
| 2200_19555_4_not_null |CHECK | | | |
| 2200_19555_6_not_null |CHECK | | | |
| 2200_19555_7_not_null |CHECK | | | |
| contact_field_mappings_external_model_check |CHECK | |public.contact_field_mappings |external_model |
| contact_field_mappings_pkey |PRIMARY KEY |id |public.contact_field_mappings |id |
| contact_field_mappings_provider_check |CHECK | |public.contact_field_mappings |provider |
| contact_field_mappings_provider_external_model_external_fie_key |UNIQUE |provider, provider, provider, external_model, external_model, external_model, external_field, external_field, external_field |public.contact_field_mappings |external_field, provider, external_model, provider, external_field, external_model, external_field, provider, external_model |
| contact_field_mappings_sync_direction_check |CHECK | |public.contact_field_mappings |sync_direction |

### Indexes

| Name |Definition |
| --- |--- |
| contact_field_mappings_pkey |CREATE UNIQUE INDEX contact_field_mappings_pkey ON public.contact_field_mappings USING btree (id) |
| contact_field_mappings_provider_external_model_external_fie_key |CREATE UNIQUE INDEX contact_field_mappings_provider_external_model_external_fie_key ON public.contact_field_mappings USING btree (provider, external_model, external_field) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete contact_field_mappings |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert contact_field_mappings |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update contact_field_mappings |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select contact_field_mappings |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.contact_sync_dead_letters

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |integration_connection_id |uuid |NO | |NO |NEVER |
| 3 |provider |text |NO |'odoo'::text |NO |NEVER |
| 4 |sync_direction |text |NO | |NO |NEVER |
| 5 |external_id |text |YES | |NO |NEVER |
| 6 |local_contact_id |uuid |YES | |NO |NEVER |
| 7 |attempt_count |integer(32,0) |NO |0 |NO |NEVER |
| 8 |next_retry_at |timestamp with time zone |YES | |NO |NEVER |
| 9 |status |text |NO |'pending'::text |NO |NEVER |
| 10 |last_error |text |YES | |NO |NEVER |
| 11 |error_payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 12 |source_payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 13 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 14 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19231_11_not_null |CHECK | | | |
| 2200_19231_12_not_null |CHECK | | | |
| 2200_19231_13_not_null |CHECK | | | |
| 2200_19231_14_not_null |CHECK | | | |
| 2200_19231_1_not_null |CHECK | | | |
| 2200_19231_2_not_null |CHECK | | | |
| 2200_19231_3_not_null |CHECK | | | |
| 2200_19231_4_not_null |CHECK | | | |
| 2200_19231_7_not_null |CHECK | | | |
| 2200_19231_9_not_null |CHECK | | | |
| contact_sync_dead_letters_local_contact_id_fkey |FOREIGN KEY |local_contact_id |public.contacts |id |
| contact_sync_dead_letters_pkey |PRIMARY KEY |id |public.contact_sync_dead_letters |id |
| contact_sync_dead_letters_provider_check |CHECK | |public.contact_sync_dead_letters |provider |
| contact_sync_dead_letters_status_check |CHECK | |public.contact_sync_dead_letters |status |
| contact_sync_dead_letters_sync_direction_check |CHECK | |public.contact_sync_dead_letters |sync_direction |

### Indexes

| Name |Definition |
| --- |--- |
| contact_sync_dead_letters_pkey |CREATE UNIQUE INDEX contact_sync_dead_letters_pkey ON public.contact_sync_dead_letters USING btree (id) |
| idx_contact_sync_dead_letters_retry |CREATE INDEX idx_contact_sync_dead_letters_retry ON public.contact_sync_dead_letters USING btree (status, next_retry_at) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage contact_sync_dead_letters |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_contact_sync_dead_letters_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.contact_sync_manual_review_queue

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |integration_connection_id |uuid |NO | |NO |NEVER |
| 3 |provider |text |NO |'odoo'::text |NO |NEVER |
| 4 |external_id |text |YES | |NO |NEVER |
| 5 |local_contact_id |uuid |YES | |NO |NEVER |
| 6 |reason |text |NO | |NO |NEVER |
| 7 |remote_payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 8 |local_payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 9 |resolved_at |timestamp with time zone |YES | |NO |NEVER |
| 10 |resolution_note |text |YES | |NO |NEVER |
| 11 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19259_11_not_null |CHECK | | | |
| 2200_19259_1_not_null |CHECK | | | |
| 2200_19259_2_not_null |CHECK | | | |
| 2200_19259_3_not_null |CHECK | | | |
| 2200_19259_6_not_null |CHECK | | | |
| 2200_19259_7_not_null |CHECK | | | |
| 2200_19259_8_not_null |CHECK | | | |
| contact_sync_manual_review_queue_local_contact_id_fkey |FOREIGN KEY |local_contact_id |public.contacts |id |
| contact_sync_manual_review_queue_pkey |PRIMARY KEY |id |public.contact_sync_manual_review_queue |id |
| contact_sync_manual_review_queue_provider_check |CHECK | |public.contact_sync_manual_review_queue |provider |

### Indexes

| Name |Definition |
| --- |--- |
| contact_sync_manual_review_queue_pkey |CREATE UNIQUE INDEX contact_sync_manual_review_queue_pkey ON public.contact_sync_manual_review_queue USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage contact_sync_manual_review_queue |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

_None._

## public.contact_sync_runs

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |integration_connection_id |uuid |NO | |NO |NEVER |
| 3 |provider |text |NO |'odoo'::text |NO |NEVER |
| 4 |run_type |text |NO | |NO |NEVER |
| 5 |started_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |finished_at |timestamp with time zone |YES | |NO |NEVER |
| 7 |duration_ms |integer(32,0) |YES | |NO |NEVER |
| 8 |pull_records_processed |integer(32,0) |NO |0 |NO |NEVER |
| 9 |push_records_processed |integer(32,0) |NO |0 |NO |NEVER |
| 10 |failure_count |integer(32,0) |NO |0 |NO |NEVER |
| 11 |cursor_advanced |boolean |NO |false |NO |NEVER |
| 12 |status |text |NO |'running'::text |NO |NEVER |
| 13 |metadata |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 14 |error_summary |text |YES | |NO |NEVER |
| 15 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19206_10_not_null |CHECK | | | |
| 2200_19206_11_not_null |CHECK | | | |
| 2200_19206_12_not_null |CHECK | | | |
| 2200_19206_13_not_null |CHECK | | | |
| 2200_19206_15_not_null |CHECK | | | |
| 2200_19206_1_not_null |CHECK | | | |
| 2200_19206_2_not_null |CHECK | | | |
| 2200_19206_3_not_null |CHECK | | | |
| 2200_19206_4_not_null |CHECK | | | |
| 2200_19206_5_not_null |CHECK | | | |
| 2200_19206_8_not_null |CHECK | | | |
| 2200_19206_9_not_null |CHECK | | | |
| contact_sync_runs_pkey |PRIMARY KEY |id |public.contact_sync_runs |id |
| contact_sync_runs_provider_check |CHECK | |public.contact_sync_runs |provider |
| contact_sync_runs_run_type_check |CHECK | |public.contact_sync_runs |run_type |
| contact_sync_runs_status_check |CHECK | |public.contact_sync_runs |status |

### Indexes

| Name |Definition |
| --- |--- |
| contact_sync_runs_pkey |CREATE UNIQUE INDEX contact_sync_runs_pkey ON public.contact_sync_runs USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage contact_sync_runs |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

_None._

## public.contact_sync_states

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |local_contact_id |uuid |NO | |NO |NEVER |
| 3 |provider |text |NO |'odoo'::text |NO |NEVER |
| 4 |external_model |text |NO |'res.partner'::text |NO |NEVER |
| 5 |external_company_id |text |NO | |NO |NEVER |
| 6 |local_version |bigint(64,0) |NO |0 |NO |NEVER |
| 7 |remote_version |bigint(64,0) |NO |0 |NO |NEVER |
| 8 |local_field_checksums |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 9 |remote_field_checksums |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 10 |diff_checksum |text |YES | |NO |NEVER |
| 11 |last_compared_at |timestamp with time zone |YES | |NO |NEVER |
| 12 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 13 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19525_12_not_null |CHECK | | | |
| 2200_19525_13_not_null |CHECK | | | |
| 2200_19525_1_not_null |CHECK | | | |
| 2200_19525_2_not_null |CHECK | | | |
| 2200_19525_3_not_null |CHECK | | | |
| 2200_19525_4_not_null |CHECK | | | |
| 2200_19525_5_not_null |CHECK | | | |
| 2200_19525_6_not_null |CHECK | | | |
| 2200_19525_7_not_null |CHECK | | | |
| 2200_19525_8_not_null |CHECK | | | |
| 2200_19525_9_not_null |CHECK | | | |
| contact_sync_states_external_model_check |CHECK | |public.contact_sync_states |external_model |
| contact_sync_states_local_contact_id_fkey |FOREIGN KEY |local_contact_id |public.contacts |id |
| contact_sync_states_local_contact_id_provider_external_mode_key |UNIQUE |local_contact_id, local_contact_id, local_contact_id, local_contact_id, provider, provider, provider, provider, external_model, external_model, external_model, external_model, external_company_id, external_company_id, external_company_id, external_company_id |public.contact_sync_states |external_company_id, external_model, local_contact_id, provider, provider, external_company_id, external_model, local_contact_id, external_company_id, external_model, local_contact_id, provider, external_company_id, external_model, local_contact_id, provider |
| contact_sync_states_pkey |PRIMARY KEY |id |public.contact_sync_states |id |
| contact_sync_states_provider_check |CHECK | |public.contact_sync_states |provider |

### Indexes

| Name |Definition |
| --- |--- |
| contact_sync_states_local_contact_id_provider_external_mode_key |CREATE UNIQUE INDEX contact_sync_states_local_contact_id_provider_external_mode_key ON public.contact_sync_states USING btree (local_contact_id, provider, external_model, external_company_id) |
| contact_sync_states_pkey |CREATE UNIQUE INDEX contact_sync_states_pkey ON public.contact_sync_states USING btree (id) |
| idx_contact_sync_states_updated_at |CREATE INDEX idx_contact_sync_states_updated_at ON public.contact_sync_states USING btree (updated_at) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete contact_sync_states |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert contact_sync_states |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update contact_sync_states |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select contact_sync_states |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.contact_tag_links

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |contact_id |uuid |NO | |NO |NEVER |
| 3 |tag_id |uuid |NO | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18689_1_not_null |CHECK | | | |
| 2200_18689_2_not_null |CHECK | | | |
| 2200_18689_3_not_null |CHECK | | | |
| contact_tag_links_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| contact_tag_links_contact_id_tag_id_key |UNIQUE |contact_id, contact_id, tag_id, tag_id |public.contact_tag_links |contact_id, tag_id, contact_id, tag_id |
| contact_tag_links_pkey |PRIMARY KEY |id |public.contact_tag_links |id |
| contact_tag_links_tag_id_fkey |FOREIGN KEY |tag_id |public.contact_tags |id |

### Indexes

| Name |Definition |
| --- |--- |
| contact_tag_links_contact_id_tag_id_key |CREATE UNIQUE INDEX contact_tag_links_contact_id_tag_id_key ON public.contact_tag_links USING btree (contact_id, tag_id) |
| contact_tag_links_pkey |CREATE UNIQUE INDEX contact_tag_links_pkey ON public.contact_tag_links USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete contact_tag_links |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert contact_tag_links |INSERT |public | |has_edit_role(auth.uid()) |
| Role users can select contact_tag_links |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.contact_tags

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |color |text |NO |'#14b8a6'::text |NO |NEVER |
| 4 |category |text |NO |''::text |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18634_1_not_null |CHECK | | | |
| 2200_18634_2_not_null |CHECK | | | |
| 2200_18634_3_not_null |CHECK | | | |
| 2200_18634_4_not_null |CHECK | | | |
| 2200_18634_5_not_null |CHECK | | | |
| 2200_18634_6_not_null |CHECK | | | |
| contact_tags_pkey |PRIMARY KEY |id |public.contact_tags |id |

### Indexes

| Name |Definition |
| --- |--- |
| contact_tags_pkey |CREATE UNIQUE INDEX contact_tags_pkey ON public.contact_tags USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete contact_tags |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert contact_tags |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update contact_tags |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select contact_tags |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.contacts

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |is_company |boolean |NO |true |NO |NEVER |
| 4 |parent_id |uuid |YES | |NO |NEVER |
| 5 |email |text |YES |''::text |NO |NEVER |
| 6 |phone |text |YES |''::text |NO |NEVER |
| 7 |street |text |YES |''::text |NO |NEVER |
| 8 |street2 |text |YES |''::text |NO |NEVER |
| 9 |city |text |YES |''::text |NO |NEVER |
| 10 |state |text |YES |''::text |NO |NEVER |
| 11 |zip |text |YES |''::text |NO |NEVER |
| 12 |country_code |text |YES |''::text |NO |NEVER |
| 13 |tax_id |text |YES |''::text |NO |NEVER |
| 14 |website |text |YES |''::text |NO |NEVER |
| 15 |industry_id |uuid |YES | |NO |NEVER |
| 16 |notes |text |YES |''::text |NO |NEVER |
| 17 |salesperson |text |YES |''::text |NO |NEVER |
| 18 |is_archived |boolean |NO |false |NO |NEVER |
| 19 |avatar_url |text |YES |''::text |NO |NEVER |
| 20 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 21 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 22 |country |text |YES | |NO |NEVER |
| 23 |status |text |YES |'lead'::text |NO |NEVER |
| 24 |instagram_handle |text |YES | |NO |NEVER |
| 25 |facebook_page |text |YES | |NO |NEVER |
| 26 |google_place_id |text |YES | |NO |NEVER |
| 27 |google_rating |numeric |YES | |NO |NEVER |
| 28 |google_reviews_count |integer(32,0) |YES | |NO |NEVER |
| 29 |ai_intent_score |integer(32,0) |YES | |NO |NEVER |
| 30 |mobile |text |YES | |NO |NEVER |
| 31 |lead_segment |text |YES | |NO |NEVER |
| 32 |business_card_image_url |text |YES | |NO |NEVER |
| 33 |business_card_uploaded_at |timestamp with time zone |YES | |NO |NEVER |
| 34 |business_card_file_name |text |YES | |NO |NEVER |
| 35 |is_customer |boolean |YES | |NO |NEVER |
| 36 |lead_source |text |YES | |NO |NEVER |
| 37 |pipeline_stage |text |YES | |NO |NEVER |
| 38 |type |text |YES | |NO |NEVER |
| 39 |business_name |text |YES | |NO |NEVER |
| 40 |address |text |YES | |NO |NEVER |
| 41 |facebook_page_id |text |YES | |NO |NEVER |
| 42 |lead_score |integer(32,0) |YES | |NO |NEVER |
| 43 |innovations_contact_id |bigint(64,0) |YES | |NO |NEVER |
| 44 |innovations_parent_customer_id |bigint(64,0) |YES | |NO |NEVER |
| 45 |linked_customer_id |bigint(64,0) |YES | |NO |NEVER |
| 46 |pipeline |text |YES | |NO |NEVER |
| 47 |stage |text |YES | |NO |NEVER |
| 48 |stage_entered_at |timestamp with time zone |YES | |NO |NEVER |
| 49 |next_action_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18650_18_not_null |CHECK | | | |
| 2200_18650_1_not_null |CHECK | | | |
| 2200_18650_20_not_null |CHECK | | | |
| 2200_18650_21_not_null |CHECK | | | |
| 2200_18650_2_not_null |CHECK | | | |
| 2200_18650_3_not_null |CHECK | | | |
| contacts_industry_id_fkey |FOREIGN KEY |industry_id |public.industries |id |
| contacts_lead_segment_check |CHECK | |public.contacts |lead_segment |
| contacts_parent_id_fkey |FOREIGN KEY |parent_id |public.contacts |id |
| contacts_pkey |PRIMARY KEY |id |public.contacts |id |

### Indexes

| Name |Definition |
| --- |--- |
| contacts_created_at_idx |CREATE INDEX contacts_created_at_idx ON public.contacts USING btree (created_at) |
| contacts_name_key |CREATE UNIQUE INDEX contacts_name_key ON public.contacts USING btree (name) |
| contacts_pkey |CREATE UNIQUE INDEX contacts_pkey ON public.contacts USING btree (id) |
| contacts_status_created_at_idx |CREATE INDEX contacts_status_created_at_idx ON public.contacts USING btree (status, created_at) |
| idx_contacts_country |CREATE INDEX idx_contacts_country ON public.contacts USING btree (country) |
| idx_contacts_parent_id |CREATE INDEX idx_contacts_parent_id ON public.contacts USING btree (parent_id) |
| idx_contacts_status |CREATE INDEX idx_contacts_status ON public.contacts USING btree (status) |
| idx_contacts_updated_at |CREATE INDEX idx_contacts_updated_at ON public.contacts USING btree (updated_at) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete contacts |DELETE |authenticated |has_edit_role(auth.uid()) | |
| Editors can insert contacts |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update contacts |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Staff can view contacts |SELECT |authenticated |has_staff_role(auth.uid()) | |
| contacts_select_authenticated_analytics |SELECT |authenticated |true | |

### Triggers

_None._

## public.crm_pipelines

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |key |text |NO | |NO |NEVER |
| 2 |label |text |NO | |NO |NEVER |
| 3 |is_active |boolean |NO |true |NO |NEVER |
| 4 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22339_1_not_null |CHECK | | | |
| 2200_22339_2_not_null |CHECK | | | |
| 2200_22339_3_not_null |CHECK | | | |
| 2200_22339_4_not_null |CHECK | | | |
| crm_pipelines_pkey |PRIMARY KEY |key |public.crm_pipelines |key |

### Indexes

| Name |Definition |
| --- |--- |
| crm_pipelines_pkey |CREATE UNIQUE INDEX crm_pipelines_pkey ON public.crm_pipelines USING btree (key) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can manage crm pipelines |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can select crm pipelines |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.customer_account_number_duplicates

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |account_number |text |YES | |NO |NEVER |
| 2 |duplicate_count |bigint(64,0) |YES | |NO |NEVER |
| 3 |customer_ids |ARRAY |YES | |NO |NEVER |
| 4 |customer_names |ARRAY |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.customer_addresses

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |label |text |NO |'Address'::text |NO |NEVER |
| 4 |recipient |text |NO |''::text |NO |NEVER |
| 5 |line1 |text |NO |''::text |NO |NEVER |
| 6 |line2 |text |NO |''::text |NO |NEVER |
| 7 |city |text |NO |''::text |NO |NEVER |
| 8 |state |text |NO |''::text |NO |NEVER |
| 9 |postal_code |text |NO |''::text |NO |NEVER |
| 10 |country |text |NO |''::text |NO |NEVER |
| 11 |is_default_shipping |boolean |NO |false |NO |NEVER |
| 12 |is_default_billing |boolean |NO |false |NO |NEVER |
| 13 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 14 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20272_10_not_null |CHECK | | | |
| 2200_20272_11_not_null |CHECK | | | |
| 2200_20272_12_not_null |CHECK | | | |
| 2200_20272_13_not_null |CHECK | | | |
| 2200_20272_14_not_null |CHECK | | | |
| 2200_20272_1_not_null |CHECK | | | |
| 2200_20272_2_not_null |CHECK | | | |
| 2200_20272_3_not_null |CHECK | | | |
| 2200_20272_4_not_null |CHECK | | | |
| 2200_20272_5_not_null |CHECK | | | |
| 2200_20272_6_not_null |CHECK | | | |
| 2200_20272_7_not_null |CHECK | | | |
| 2200_20272_8_not_null |CHECK | | | |
| 2200_20272_9_not_null |CHECK | | | |
| customer_addresses_pkey |PRIMARY KEY |id |public.customer_addresses |id |
| customer_addresses_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| customer_addresses_pkey |CREATE UNIQUE INDEX customer_addresses_pkey ON public.customer_addresses USING btree (id) |
| customer_addresses_user_id_idx |CREATE INDEX customer_addresses_user_id_idx ON public.customer_addresses USING btree (user_id, created_at DESC) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Users can delete their own customer addresses |DELETE |authenticated |((auth.uid() = user_id) OR has_edit_role(auth.uid())) | |
| Users can insert their own customer addresses |INSERT |authenticated | |((auth.uid() = user_id) OR has_edit_role(auth.uid())) |
| Users can update their own customer addresses |UPDATE |authenticated |((auth.uid() = user_id) OR has_edit_role(auth.uid())) |((auth.uid() = user_id) OR has_edit_role(auth.uid())) |
| Users can view their own customer addresses |SELECT |authenticated |((auth.uid() = user_id) OR has_edit_role(auth.uid())) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| customer_addresses_enforce_limit_trigger |BEFORE |INSERT |ROW |EXECUTE FUNCTION enforce_customer_address_limit() |
| customer_addresses_normalize_defaults_trigger |BEFORE |UPDATE |ROW |EXECUTE FUNCTION normalize_customer_address_defaults() |
| customer_addresses_normalize_defaults_trigger |BEFORE |INSERT |ROW |EXECUTE FUNCTION normalize_customer_address_defaults() |

## public.customer_automation_outbox

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |channel |text |NO |'email'::text |NO |NEVER |
| 3 |template_key |text |NO | |NO |NEVER |
| 4 |recipient_email |text |NO | |NO |NEVER |
| 5 |subject |text |NO | |NO |NEVER |
| 6 |payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 7 |status |text |NO |'queued'::text |NO |NEVER |
| 8 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 9 |sent_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20443_1_not_null |CHECK | | | |
| 2200_20443_2_not_null |CHECK | | | |
| 2200_20443_3_not_null |CHECK | | | |
| 2200_20443_4_not_null |CHECK | | | |
| 2200_20443_5_not_null |CHECK | | | |
| 2200_20443_6_not_null |CHECK | | | |
| 2200_20443_7_not_null |CHECK | | | |
| 2200_20443_8_not_null |CHECK | | | |
| customer_automation_outbox_channel_check |CHECK | |public.customer_automation_outbox |channel |
| customer_automation_outbox_pkey |PRIMARY KEY |id |public.customer_automation_outbox |id |
| customer_automation_outbox_status_check |CHECK | |public.customer_automation_outbox |status |

### Indexes

| Name |Definition |
| --- |--- |
| customer_automation_outbox_pkey |CREATE UNIQUE INDEX customer_automation_outbox_pkey ON public.customer_automation_outbox USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can manage automation outbox |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.customer_order_health

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |contact_id |uuid |YES | |NO |NEVER |
| 2 |name |text |YES | |NO |NEVER |
| 3 |pipeline |text |YES | |NO |NEVER |
| 4 |stage |text |YES | |NO |NEVER |
| 5 |last_order_date |date |YES | |NO |NEVER |
| 6 |quiet_days |integer(32,0) |YES | |NO |NEVER |
| 7 |avg_gap_days |numeric |YES | |NO |NEVER |
| 8 |orders_last_30_days |integer(32,0) |YES | |NO |NEVER |
| 9 |health |text |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.customer_payment_methods

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |provider |text |NO |'demo'::text |NO |NEVER |
| 4 |payment_token |text |NO | |NO |NEVER |
| 5 |cardholder_name |text |NO |''::text |NO |NEVER |
| 6 |brand |text |NO |'Visa'::text |NO |NEVER |
| 7 |last4 |text |NO |'0000'::text |NO |NEVER |
| 8 |expiry_month |integer(32,0) |NO |1 |NO |NEVER |
| 9 |expiry_year |integer(32,0) |NO |(EXTRACT(year FROM now()))::integer |NO |NEVER |
| 10 |is_default |boolean |NO |false |NO |NEVER |
| 11 |is_demo |boolean |NO |true |NO |NEVER |
| 12 |status |text |NO |'active'::text |NO |NEVER |
| 13 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 14 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20306_10_not_null |CHECK | | | |
| 2200_20306_11_not_null |CHECK | | | |
| 2200_20306_12_not_null |CHECK | | | |
| 2200_20306_13_not_null |CHECK | | | |
| 2200_20306_14_not_null |CHECK | | | |
| 2200_20306_1_not_null |CHECK | | | |
| 2200_20306_2_not_null |CHECK | | | |
| 2200_20306_3_not_null |CHECK | | | |
| 2200_20306_4_not_null |CHECK | | | |
| 2200_20306_5_not_null |CHECK | | | |
| 2200_20306_6_not_null |CHECK | | | |
| 2200_20306_7_not_null |CHECK | | | |
| 2200_20306_8_not_null |CHECK | | | |
| 2200_20306_9_not_null |CHECK | | | |
| customer_payment_methods_expiry_month_check |CHECK | |public.customer_payment_methods |expiry_month |
| customer_payment_methods_last4_check |CHECK | |public.customer_payment_methods |last4 |
| customer_payment_methods_payment_token_key |UNIQUE |payment_token |public.customer_payment_methods |payment_token |
| customer_payment_methods_pkey |PRIMARY KEY |id |public.customer_payment_methods |id |
| customer_payment_methods_provider_check |CHECK | |public.customer_payment_methods |provider |
| customer_payment_methods_status_check |CHECK | |public.customer_payment_methods |status |
| customer_payment_methods_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| customer_payment_methods_payment_token_key |CREATE UNIQUE INDEX customer_payment_methods_payment_token_key ON public.customer_payment_methods USING btree (payment_token) |
| customer_payment_methods_pkey |CREATE UNIQUE INDEX customer_payment_methods_pkey ON public.customer_payment_methods USING btree (id) |
| customer_payment_methods_user_id_idx |CREATE INDEX customer_payment_methods_user_id_idx ON public.customer_payment_methods USING btree (user_id, created_at DESC) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Users can delete their own payment methods |DELETE |authenticated |((auth.uid() = user_id) OR has_edit_role(auth.uid())) | |
| Users can insert their own payment methods |INSERT |authenticated | |((auth.uid() = user_id) OR has_edit_role(auth.uid())) |
| Users can update their own payment methods |UPDATE |authenticated |((auth.uid() = user_id) OR has_edit_role(auth.uid())) |((auth.uid() = user_id) OR has_edit_role(auth.uid())) |
| Users can view their own payment methods |SELECT |authenticated |((auth.uid() = user_id) OR has_edit_role(auth.uid())) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| customer_payment_methods_normalize_default_trigger |BEFORE |UPDATE |ROW |EXECUTE FUNCTION normalize_customer_payment_default() |
| customer_payment_methods_normalize_default_trigger |BEFORE |INSERT |ROW |EXECUTE FUNCTION normalize_customer_payment_default() |
| update_customer_payment_methods_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.customer_payment_profile_public

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |customer_id |integer(32,0) |YES | |NO |NEVER |
| 2 |account_number |text |YES | |NO |NEVER |
| 3 |name |text |YES | |NO |NEVER |
| 4 |pay_by_card |boolean |YES | |NO |NEVER |
| 5 |pay_by_eft |boolean |YES | |NO |NEVER |
| 6 |eft_institution_name |text |YES | |NO |NEVER |
| 7 |default_payment_type |smallint(16,0) |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.customer_portal_feature_overrides

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |feature_key |text |NO | |NO |NEVER |
| 4 |enabled |boolean |NO |true |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20396_1_not_null |CHECK | | | |
| 2200_20396_2_not_null |CHECK | | | |
| 2200_20396_3_not_null |CHECK | | | |
| 2200_20396_4_not_null |CHECK | | | |
| 2200_20396_5_not_null |CHECK | | | |
| 2200_20396_6_not_null |CHECK | | | |
| customer_portal_feature_overrides_feature_key_check |CHECK | |public.customer_portal_feature_overrides |feature_key |
| customer_portal_feature_overrides_pkey |PRIMARY KEY |id |public.customer_portal_feature_overrides |id |
| customer_portal_feature_overrides_user_id_feature_key_key |UNIQUE |user_id, user_id, feature_key, feature_key |public.customer_portal_feature_overrides |feature_key, user_id, feature_key, user_id |
| customer_portal_feature_overrides_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| customer_portal_feature_overrides_pkey |CREATE UNIQUE INDEX customer_portal_feature_overrides_pkey ON public.customer_portal_feature_overrides USING btree (id) |
| customer_portal_feature_overrides_user_id_feature_key_key |CREATE UNIQUE INDEX customer_portal_feature_overrides_user_id_feature_key_key ON public.customer_portal_feature_overrides USING btree (user_id, feature_key) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage portal feature overrides |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Users can view their own portal feature overrides |SELECT |authenticated |((auth.uid() = user_id) OR has_edit_role(auth.uid())) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_customer_portal_feature_overrides_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.customer_pricing_access

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |pricing_sheet_id |uuid |NO | |NO |NEVER |
| 4 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18233_1_not_null |CHECK | | | |
| 2200_18233_2_not_null |CHECK | | | |
| 2200_18233_3_not_null |CHECK | | | |
| 2200_18233_4_not_null |CHECK | | | |
| customer_pricing_access_pkey |PRIMARY KEY |id |public.customer_pricing_access |id |
| customer_pricing_access_pricing_sheet_id_fkey |FOREIGN KEY |pricing_sheet_id |public.pricing_sheets |id |
| customer_pricing_access_user_id_pricing_sheet_id_key |UNIQUE |user_id, user_id, pricing_sheet_id, pricing_sheet_id |public.customer_pricing_access |pricing_sheet_id, user_id, pricing_sheet_id, user_id |

### Indexes

| Name |Definition |
| --- |--- |
| customer_pricing_access_pkey |CREATE UNIQUE INDEX customer_pricing_access_pkey ON public.customer_pricing_access USING btree (id) |
| customer_pricing_access_user_id_pricing_sheet_id_key |CREATE UNIQUE INDEX customer_pricing_access_user_id_pricing_sheet_id_key ON public.customer_pricing_access USING btree (user_id, pricing_sheet_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage customer_pricing_access |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |
| Users can view their own pricing access |SELECT |public |(auth.uid() = user_id) | |

### Triggers

_None._

## public.customers

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |type |text |YES |'Customer'::text |NO |NEVER |
| 4 |address |text |YES | |NO |NEVER |
| 5 |email |text |YES | |NO |NEVER |
| 6 |phone |text |YES | |NO |NEVER |
| 7 |assigned_pricelist_id |integer(32,0) |YES | |NO |NEVER |
| 8 |pipeline_stage |text |YES |'Prospect'::text |NO |NEVER |
| 9 |notes |text |YES | |NO |NEVER |
| 10 |created_at |timestamp with time zone |YES |now() |NO |NEVER |
| 11 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |
| 12 |contact_id |uuid |YES | |NO |NEVER |
| 13 |innovations_customer_id |bigint(64,0) |YES | |NO |NEVER |
| 14 |account_number |text |YES | |NO |NEVER |
| 15 |country_code |text |YES | |NO |NEVER |
| 16 |credit_limit |numeric |YES | |NO |NEVER |
| 17 |pay_by_card |boolean |YES | |NO |NEVER |
| 18 |pay_by_eft |boolean |YES | |NO |NEVER |
| 19 |eft_institution_name |text |YES | |NO |NEVER |
| 20 |default_payment_type |smallint(16,0) |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22130_1_not_null |CHECK | | | |
| 2200_22130_2_not_null |CHECK | | | |
| customers_assigned_pricelist_id_fkey |FOREIGN KEY |assigned_pricelist_id |public.pricelist_versions |id |
| customers_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| customers_email_key |UNIQUE |email |public.customers |email |
| customers_innovations_customer_id_key |UNIQUE |innovations_customer_id |public.customers |innovations_customer_id |
| customers_pkey |PRIMARY KEY |id |public.customers |id |

### Indexes

| Name |Definition |
| --- |--- |
| customers_account_number_key |CREATE UNIQUE INDEX customers_account_number_key ON public.customers USING btree (account_number) WHERE ((account_number IS NOT NULL) AND (account_number <> ''::text)) |
| customers_email_key |CREATE UNIQUE INDEX customers_email_key ON public.customers USING btree (email) |
| customers_innovations_customer_id_key |CREATE UNIQUE INDEX customers_innovations_customer_id_key ON public.customers USING btree (innovations_customer_id) |
| customers_pkey |CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete customers |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert customers |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update customers |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Staff can select customers |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.docstudio_billing_documents

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |owner_user_id |uuid |NO | |NO |NEVER |
| 3 |document_type |text |NO | |NO |NEVER |
| 4 |document_name |text |NO | |NO |NEVER |
| 5 |billing_number |text |YES | |NO |NEVER |
| 6 |customer_name |text |YES | |NO |NEVER |
| 7 |customer_company |text |YES | |NO |NEVER |
| 8 |customer_account |text |YES | |NO |NEVER |
| 9 |paper_size |text |NO |'letter'::text |NO |NEVER |
| 10 |status |text |NO |'saved'::text |NO |NEVER |
| 11 |content |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 12 |rendered_html |text |NO |''::text |NO |NEVER |
| 13 |totals |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 14 |autosave_content |jsonb |YES | |NO |NEVER |
| 15 |autosave_rendered_html |text |YES | |NO |NEVER |
| 16 |autosave_totals |jsonb |YES | |NO |NEVER |
| 17 |latest_autosave_at |timestamp with time zone |YES | |NO |NEVER |
| 18 |version |text |NO | |NO |NEVER |
| 19 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 20 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 21 |deleted_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21697_10_not_null |CHECK | | | |
| 2200_21697_11_not_null |CHECK | | | |
| 2200_21697_12_not_null |CHECK | | | |
| 2200_21697_13_not_null |CHECK | | | |
| 2200_21697_18_not_null |CHECK | | | |
| 2200_21697_19_not_null |CHECK | | | |
| 2200_21697_1_not_null |CHECK | | | |
| 2200_21697_20_not_null |CHECK | | | |
| 2200_21697_2_not_null |CHECK | | | |
| 2200_21697_3_not_null |CHECK | | | |
| 2200_21697_4_not_null |CHECK | | | |
| 2200_21697_9_not_null |CHECK | | | |
| docstudio_billing_documents_document_type_check |CHECK | |public.docstudio_billing_documents |document_type |
| docstudio_billing_documents_paper_size_check |CHECK | |public.docstudio_billing_documents |paper_size |
| docstudio_billing_documents_pkey |PRIMARY KEY |id |public.docstudio_billing_documents |id |

### Indexes

| Name |Definition |
| --- |--- |
| docstudio_billing_documents_pkey |CREATE UNIQUE INDEX docstudio_billing_documents_pkey ON public.docstudio_billing_documents USING btree (id) |
| docstudio_billing_type_idx |CREATE INDEX docstudio_billing_type_idx ON public.docstudio_billing_documents USING btree (document_type) WHERE (deleted_at IS NULL) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can manage docstudio billing |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can select docstudio billing |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.docstudio_files

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |owner_user_id |uuid |NO | |NO |NEVER |
| 3 |file_type |text |NO | |NO |NEVER |
| 4 |file_name |text |NO | |NO |NEVER |
| 5 |customer_name |text |YES | |NO |NEVER |
| 6 |customer_account |text |YES | |NO |NEVER |
| 7 |metadata |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 8 |content |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 9 |rendered_html |text |NO |''::text |NO |NEVER |
| 10 |autosave_content |jsonb |YES | |NO |NEVER |
| 11 |autosave_rendered_html |text |YES | |NO |NEVER |
| 12 |latest_autosave_at |timestamp with time zone |YES | |NO |NEVER |
| 13 |version |text |NO | |NO |NEVER |
| 14 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 15 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 16 |deleted_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21682_13_not_null |CHECK | | | |
| 2200_21682_14_not_null |CHECK | | | |
| 2200_21682_15_not_null |CHECK | | | |
| 2200_21682_1_not_null |CHECK | | | |
| 2200_21682_2_not_null |CHECK | | | |
| 2200_21682_3_not_null |CHECK | | | |
| 2200_21682_4_not_null |CHECK | | | |
| 2200_21682_7_not_null |CHECK | | | |
| 2200_21682_8_not_null |CHECK | | | |
| 2200_21682_9_not_null |CHECK | | | |
| docstudio_files_file_type_check |CHECK | |public.docstudio_files |file_type |
| docstudio_files_pkey |PRIMARY KEY |id |public.docstudio_files |id |

### Indexes

| Name |Definition |
| --- |--- |
| docstudio_files_pkey |CREATE UNIQUE INDEX docstudio_files_pkey ON public.docstudio_files USING btree (id) |
| docstudio_files_type_idx |CREATE INDEX docstudio_files_type_idx ON public.docstudio_files USING btree (file_type) WHERE (deleted_at IS NULL) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can manage docstudio files |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can select docstudio files |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.edge_function_health

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |function_name |text |NO | |NO |NEVER |
| 2 |is_healthy |boolean |NO | |NO |NEVER |
| 3 |last_error |text |YES | |NO |NEVER |
| 4 |checked_at |timestamp with time zone |NO | |NO |NEVER |
| 5 |consecutive_failures |integer(32,0) |NO |0 |NO |NEVER |
| 6 |last_healthy_at |timestamp with time zone |YES | |NO |NEVER |
| 7 |last_failure_at |timestamp with time zone |YES | |NO |NEVER |
| 8 |last_run_id |uuid |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21743_1_not_null |CHECK | | | |
| 2200_21743_2_not_null |CHECK | | | |
| 2200_21743_4_not_null |CHECK | | | |
| 2200_21743_5_not_null |CHECK | | | |
| edge_function_health_last_run_id_fkey |FOREIGN KEY |last_run_id |public.edge_function_health_runs |id |
| edge_function_health_pkey |PRIMARY KEY |function_name |public.edge_function_health |function_name |

### Indexes

| Name |Definition |
| --- |--- |
| edge_function_health_checked_at_idx |CREATE INDEX edge_function_health_checked_at_idx ON public.edge_function_health USING btree (checked_at DESC) |
| edge_function_health_pkey |CREATE UNIQUE INDEX edge_function_health_pkey ON public.edge_function_health USING btree (function_name) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can read edge function health |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.edge_function_health_runs

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |source |text |NO | |NO |NEVER |
| 3 |release_sha |text |YES | |NO |NEVER |
| 4 |is_healthy |boolean |NO | |NO |NEVER |
| 5 |function_count |integer(32,0) |NO |0 |NO |NEVER |
| 6 |failed_count |integer(32,0) |NO |0 |NO |NEVER |
| 7 |checks |jsonb |NO |'[]'::jsonb |NO |NEVER |
| 8 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21730_1_not_null |CHECK | | | |
| 2200_21730_2_not_null |CHECK | | | |
| 2200_21730_4_not_null |CHECK | | | |
| 2200_21730_5_not_null |CHECK | | | |
| 2200_21730_6_not_null |CHECK | | | |
| 2200_21730_7_not_null |CHECK | | | |
| 2200_21730_8_not_null |CHECK | | | |
| edge_function_health_runs_pkey |PRIMARY KEY |id |public.edge_function_health_runs |id |
| edge_function_health_runs_source_check |CHECK | |public.edge_function_health_runs |source |

### Indexes

| Name |Definition |
| --- |--- |
| edge_function_health_runs_created_at_idx |CREATE INDEX edge_function_health_runs_created_at_idx ON public.edge_function_health_runs USING btree (created_at DESC) |
| edge_function_health_runs_pkey |CREATE UNIQUE INDEX edge_function_health_runs_pkey ON public.edge_function_health_runs USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can read edge function health runs |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.email_send_log

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |message_id |text |YES | |NO |NEVER |
| 3 |template_name |text |NO | |NO |NEVER |
| 4 |recipient_email |text |NO | |NO |NEVER |
| 5 |status |text |NO | |NO |NEVER |
| 6 |error_message |text |YES | |NO |NEVER |
| 7 |metadata |jsonb |YES | |NO |NEVER |
| 8 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21193_1_not_null |CHECK | | | |
| 2200_21193_3_not_null |CHECK | | | |
| 2200_21193_4_not_null |CHECK | | | |
| 2200_21193_5_not_null |CHECK | | | |
| 2200_21193_8_not_null |CHECK | | | |
| email_send_log_pkey |PRIMARY KEY |id |public.email_send_log |id |
| email_send_log_status_check |CHECK | |public.email_send_log |status |

### Indexes

| Name |Definition |
| --- |--- |
| email_send_log_pkey |CREATE UNIQUE INDEX email_send_log_pkey ON public.email_send_log USING btree (id) |
| idx_email_send_log_created |CREATE INDEX idx_email_send_log_created ON public.email_send_log USING btree (created_at DESC) |
| idx_email_send_log_message |CREATE INDEX idx_email_send_log_message ON public.email_send_log USING btree (message_id) |
| idx_email_send_log_message_sent_unique |CREATE UNIQUE INDEX idx_email_send_log_message_sent_unique ON public.email_send_log USING btree (message_id) WHERE (status = 'sent'::text) |
| idx_email_send_log_recipient |CREATE INDEX idx_email_send_log_recipient ON public.email_send_log USING btree (recipient_email) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Service role can insert send log |INSERT |public | |(auth.role() = 'service_role'::text) |
| Service role can read send log |SELECT |public |(auth.role() = 'service_role'::text) | |
| Service role can update send log |UPDATE |public |(auth.role() = 'service_role'::text) |(auth.role() = 'service_role'::text) |

### Triggers

_None._

## public.email_send_state

Type: table
RLS enabled: yes
Estimated rows: 1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO |1 |NO |NEVER |
| 2 |retry_after_until |timestamp with time zone |YES | |NO |NEVER |
| 3 |batch_size |integer(32,0) |NO |10 |NO |NEVER |
| 4 |send_delay_ms |integer(32,0) |NO |200 |NO |NEVER |
| 5 |auth_email_ttl_minutes |integer(32,0) |NO |15 |NO |NEVER |
| 6 |transactional_email_ttl_minutes |integer(32,0) |NO |60 |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21211_1_not_null |CHECK | | | |
| 2200_21211_3_not_null |CHECK | | | |
| 2200_21211_4_not_null |CHECK | | | |
| 2200_21211_5_not_null |CHECK | | | |
| 2200_21211_6_not_null |CHECK | | | |
| 2200_21211_7_not_null |CHECK | | | |
| email_send_state_id_check |CHECK | |public.email_send_state |id |
| email_send_state_pkey |PRIMARY KEY |id |public.email_send_state |id |

### Indexes

| Name |Definition |
| --- |--- |
| email_send_state_pkey |CREATE UNIQUE INDEX email_send_state_pkey ON public.email_send_state USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Service role can manage send state |ALL |public |(auth.role() = 'service_role'::text) |(auth.role() = 'service_role'::text) |

### Triggers

_None._

## public.email_unsubscribe_tokens

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |token |text |NO | |NO |NEVER |
| 3 |email |text |NO | |NO |NEVER |
| 4 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |used_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21243_1_not_null |CHECK | | | |
| 2200_21243_2_not_null |CHECK | | | |
| 2200_21243_3_not_null |CHECK | | | |
| 2200_21243_4_not_null |CHECK | | | |
| email_unsubscribe_tokens_email_key |UNIQUE |email |public.email_unsubscribe_tokens |email |
| email_unsubscribe_tokens_pkey |PRIMARY KEY |id |public.email_unsubscribe_tokens |id |
| email_unsubscribe_tokens_token_key |UNIQUE |token |public.email_unsubscribe_tokens |token |

### Indexes

| Name |Definition |
| --- |--- |
| email_unsubscribe_tokens_email_key |CREATE UNIQUE INDEX email_unsubscribe_tokens_email_key ON public.email_unsubscribe_tokens USING btree (email) |
| email_unsubscribe_tokens_pkey |CREATE UNIQUE INDEX email_unsubscribe_tokens_pkey ON public.email_unsubscribe_tokens USING btree (id) |
| email_unsubscribe_tokens_token_key |CREATE UNIQUE INDEX email_unsubscribe_tokens_token_key ON public.email_unsubscribe_tokens USING btree (token) |
| idx_unsubscribe_tokens_token |CREATE INDEX idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens USING btree (token) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Service role can insert tokens |INSERT |public | |(auth.role() = 'service_role'::text) |
| Service role can mark tokens as used |UPDATE |public |(auth.role() = 'service_role'::text) |(auth.role() = 'service_role'::text) |
| Service role can read tokens |SELECT |public |(auth.role() = 'service_role'::text) | |

### Triggers

_None._

## public.finishtypes

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |is_active |boolean |NO |true |NO |NEVER |
| 4 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |abbrev |text |NO |''::text |NO |NEVER |
| 7 |code |text |NO |''::text |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17895_1_not_null |CHECK | | | |
| 2200_17895_2_not_null |CHECK | | | |
| 2200_17895_3_not_null |CHECK | | | |
| 2200_17895_4_not_null |CHECK | | | |
| 2200_17895_5_not_null |CHECK | | | |
| 2200_17895_6_not_null |CHECK | | | |
| 2200_17895_7_not_null |CHECK | | | |
| finishtypes_name_key |UNIQUE |name |public.finishtypes |name |
| finishtypes_pkey |PRIMARY KEY |id |public.finishtypes |id |

### Indexes

| Name |Definition |
| --- |--- |
| finishtypes_name_key |CREATE UNIQUE INDEX finishtypes_name_key ON public.finishtypes USING btree (name) |
| finishtypes_pkey |CREATE UNIQUE INDEX finishtypes_pkey ON public.finishtypes USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Anon can view finishtypes |SELECT |anon |true | |
| Editors can delete finishtypes |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert finishtypes |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update finishtypes |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select finishtypes |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_finishtypes_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.help_article_contexts

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |article_id |uuid |NO | |NO |NEVER |
| 3 |context_slug |text |NO | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18972_1_not_null |CHECK | | | |
| 2200_18972_2_not_null |CHECK | | | |
| 2200_18972_3_not_null |CHECK | | | |
| help_article_contexts_article_id_context_slug_key |UNIQUE |article_id, article_id, context_slug, context_slug |public.help_article_contexts |article_id, context_slug, article_id, context_slug |
| help_article_contexts_article_id_fkey |FOREIGN KEY |article_id |public.help_articles |id |
| help_article_contexts_pkey |PRIMARY KEY |id |public.help_article_contexts |id |

### Indexes

| Name |Definition |
| --- |--- |
| help_article_contexts_article_id_context_slug_key |CREATE UNIQUE INDEX help_article_contexts_article_id_context_slug_key ON public.help_article_contexts USING btree (article_id, context_slug) |
| help_article_contexts_pkey |CREATE UNIQUE INDEX help_article_contexts_pkey ON public.help_article_contexts USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete help_article_contexts |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert help_article_contexts |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update help_article_contexts |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select help_article_contexts |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.help_article_versions

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |version_id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |article_id |uuid |NO | |NO |NEVER |
| 3 |title_snapshot |text |NO | |NO |NEVER |
| 4 |body_snapshot |jsonb |NO | |NO |NEVER |
| 5 |saved_by |uuid |YES | |NO |NEVER |
| 6 |saved_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |change_note |text |YES | |NO |NEVER |
| 8 |version_number |integer(32,0) |NO | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20029_1_not_null |CHECK | | | |
| 2200_20029_2_not_null |CHECK | | | |
| 2200_20029_3_not_null |CHECK | | | |
| 2200_20029_4_not_null |CHECK | | | |
| 2200_20029_6_not_null |CHECK | | | |
| 2200_20029_8_not_null |CHECK | | | |
| help_article_versions_article_id_fkey |FOREIGN KEY |article_id |public.help_articles |id |
| help_article_versions_pkey |PRIMARY KEY |version_id |public.help_article_versions |version_id |

### Indexes

| Name |Definition |
| --- |--- |
| help_article_versions_pkey |CREATE UNIQUE INDEX help_article_versions_pkey ON public.help_article_versions USING btree (version_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete help_article_versions |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert help_article_versions |INSERT |public | |has_edit_role(auth.uid()) |
| Role users can select help_article_versions |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.help_articles

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |title |text |NO | |NO |NEVER |
| 3 |content |text |NO |''::text |NO |NEVER |
| 4 |page_slug |text |NO | |NO |NEVER |
| 5 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 6 |is_active |boolean |NO |true |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 9 |visibility |text |NO |'internal'::text |NO |NEVER |
| 10 |content_type |text |NO |'wiki'::text |NO |NEVER |
| 11 |category |text |NO |''::text |NO |NEVER |
| 12 |description |text |NO |''::text |NO |NEVER |
| 13 |slug |text |YES | |NO |NEVER |
| 14 |section_id |text |YES | |NO |NEVER |
| 15 |parent_id |uuid |YES | |NO |NEVER |
| 16 |summary |text |NO |''::text |NO |NEVER |
| 17 |body_json |jsonb |YES | |NO |NEVER |
| 18 |body_html |text |YES | |NO |NEVER |
| 19 |status |text |NO |'published'::text |NO |NEVER |
| 20 |author_id |uuid |YES | |NO |NEVER |
| 21 |last_edited_by |uuid |YES | |NO |NEVER |
| 22 |published_at |timestamp with time zone |YES | |NO |NEVER |
| 23 |version_number |integer(32,0) |NO |1 |NO |NEVER |
| 24 |is_public |boolean |YES |false |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18575_10_not_null |CHECK | | | |
| 2200_18575_11_not_null |CHECK | | | |
| 2200_18575_12_not_null |CHECK | | | |
| 2200_18575_16_not_null |CHECK | | | |
| 2200_18575_19_not_null |CHECK | | | |
| 2200_18575_1_not_null |CHECK | | | |
| 2200_18575_23_not_null |CHECK | | | |
| 2200_18575_2_not_null |CHECK | | | |
| 2200_18575_3_not_null |CHECK | | | |
| 2200_18575_4_not_null |CHECK | | | |
| 2200_18575_5_not_null |CHECK | | | |
| 2200_18575_6_not_null |CHECK | | | |
| 2200_18575_7_not_null |CHECK | | | |
| 2200_18575_8_not_null |CHECK | | | |
| 2200_18575_9_not_null |CHECK | | | |
| help_articles_parent_id_fkey |FOREIGN KEY |parent_id |public.help_articles |id |
| help_articles_pkey |PRIMARY KEY |id |public.help_articles |id |
| help_articles_status_check |CHECK | |public.help_articles |status |

### Indexes

| Name |Definition |
| --- |--- |
| help_articles_pkey |CREATE UNIQUE INDEX help_articles_pkey ON public.help_articles USING btree (id) |
| idx_help_articles_content_type |CREATE INDEX idx_help_articles_content_type ON public.help_articles USING btree (content_type) |
| idx_help_articles_parent_id |CREATE INDEX idx_help_articles_parent_id ON public.help_articles USING btree (parent_id) |
| idx_help_articles_search |CREATE INDEX idx_help_articles_search ON public.help_articles USING gin (to_tsvector('english'::regconfig, ((((COALESCE(title, ''::text) \|\| ' '::text) \|\| COALESCE(content, ''::text)) \|\| ' '::text) \|\| COALESCE(summary, ''::text)))) |
| idx_help_articles_section_id |CREATE INDEX idx_help_articles_section_id ON public.help_articles USING btree (section_id) |
| idx_help_articles_slug_unique |CREATE UNIQUE INDEX idx_help_articles_slug_unique ON public.help_articles USING btree (slug) WHERE (slug IS NOT NULL) |
| idx_help_articles_status |CREATE INDEX idx_help_articles_status ON public.help_articles USING btree (status) |
| idx_help_articles_visibility |CREATE INDEX idx_help_articles_visibility ON public.help_articles USING btree (visibility) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete help_articles |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Anyone authenticated can read public articles |SELECT |public |(visibility = 'public'::text) | |
| Editors can insert help_articles |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update help_articles |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select help_articles |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_help_articles_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.help_feedback

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |article_id |uuid |NO | |NO |NEVER |
| 3 |user_id |uuid |NO | |NO |NEVER |
| 4 |feedback_type |text |NO | |NO |NEVER |
| 5 |suggestion_text |text |YES | |NO |NEVER |
| 6 |page_slug |text |YES | |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18592_1_not_null |CHECK | | | |
| 2200_18592_2_not_null |CHECK | | | |
| 2200_18592_3_not_null |CHECK | | | |
| 2200_18592_4_not_null |CHECK | | | |
| 2200_18592_7_not_null |CHECK | | | |
| help_feedback_article_id_fkey |FOREIGN KEY |article_id |public.help_articles |id |
| help_feedback_feedback_type_check |CHECK | |public.help_feedback |feedback_type |
| help_feedback_pkey |PRIMARY KEY |id |public.help_feedback |id |

### Indexes

| Name |Definition |
| --- |--- |
| help_feedback_pkey |CREATE UNIQUE INDEX help_feedback_pkey ON public.help_feedback USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can insert help_feedback |INSERT |public | |(auth.uid() = user_id) |
| Editors can select help_feedback |SELECT |public |has_edit_role(auth.uid()) | |
| Users can view own feedback |SELECT |public |(auth.uid() = user_id) | |

### Triggers

_None._

## public.helpdesk_followup_queue

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |ticket_id |uuid |NO | |NO |NEVER |
| 3 |followup_type |text |NO | |NO |NEVER |
| 4 |scheduled_for |timestamp with time zone |NO | |NO |NEVER |
| 5 |sent_at |timestamp with time zone |YES | |NO |NEVER |
| 6 |cancelled_at |timestamp with time zone |YES | |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21008_1_not_null |CHECK | | | |
| 2200_21008_2_not_null |CHECK | | | |
| 2200_21008_3_not_null |CHECK | | | |
| 2200_21008_4_not_null |CHECK | | | |
| 2200_21008_7_not_null |CHECK | | | |
| helpdesk_followup_queue_pkey |PRIMARY KEY |id |public.helpdesk_followup_queue |id |
| helpdesk_followup_queue_ticket_id_fkey |FOREIGN KEY |ticket_id |public.helpdesk_tickets |id |
| helpdesk_followup_queue_type_check |CHECK | |public.helpdesk_followup_queue |followup_type |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_followup_queue_pkey |CREATE UNIQUE INDEX helpdesk_followup_queue_pkey ON public.helpdesk_followup_queue USING btree (id) |
| helpdesk_followup_queue_scheduled_idx |CREATE INDEX helpdesk_followup_queue_scheduled_idx ON public.helpdesk_followup_queue USING btree (scheduled_for) WHERE ((sent_at IS NULL) AND (cancelled_at IS NULL)) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can view helpdesk followup queue |SELECT |authenticated |has_any_role(auth.uid()) | |
| Editors can manage helpdesk followup queue |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Staff can delete followup queue |DELETE |authenticated |has_edit_role(auth.uid()) | |
| Staff can insert followup queue |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Staff can update followup queue |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Staff can view followup queue |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.helpdesk_inbound_email_log

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |message_id |text |NO | |NO |NEVER |
| 3 |mailbox |text |NO |'INBOX'::text |NO |NEVER |
| 4 |from_address |text |YES | |NO |NEVER |
| 5 |subject |text |YES | |NO |NEVER |
| 6 |ticket_id |uuid |YES | |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21302_1_not_null |CHECK | | | |
| 2200_21302_2_not_null |CHECK | | | |
| 2200_21302_3_not_null |CHECK | | | |
| 2200_21302_7_not_null |CHECK | | | |
| helpdesk_inbound_email_log_message_id_mailbox_key |UNIQUE |message_id, message_id, mailbox, mailbox |public.helpdesk_inbound_email_log |mailbox, message_id, mailbox, message_id |
| helpdesk_inbound_email_log_pkey |PRIMARY KEY |id |public.helpdesk_inbound_email_log |id |
| helpdesk_inbound_email_log_ticket_id_fkey |FOREIGN KEY |ticket_id |public.helpdesk_tickets |id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_inbound_email_log_message_id_mailbox_key |CREATE UNIQUE INDEX helpdesk_inbound_email_log_message_id_mailbox_key ON public.helpdesk_inbound_email_log USING btree (message_id, mailbox) |
| helpdesk_inbound_email_log_pkey |CREATE UNIQUE INDEX helpdesk_inbound_email_log_pkey ON public.helpdesk_inbound_email_log USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins and operators can view inbound email log |SELECT |authenticated |(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role)) | |

### Triggers

_None._

## public.helpdesk_priorities

Type: table
RLS enabled: yes
Estimated rows: 6

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |level |integer(32,0) |NO | |NO |NEVER |
| 3 |label |text |NO | |NO |NEVER |
| 4 |color |text |NO |'#6b7280'::text |NO |NEVER |
| 5 |is_active |boolean |NO |true |NO |NEVER |
| 6 |created_at |timestamp with time zone |YES |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20163_1_not_null |CHECK | | | |
| 2200_20163_2_not_null |CHECK | | | |
| 2200_20163_3_not_null |CHECK | | | |
| 2200_20163_4_not_null |CHECK | | | |
| 2200_20163_5_not_null |CHECK | | | |
| helpdesk_priorities_level_key |UNIQUE |level |public.helpdesk_priorities |level |
| helpdesk_priorities_pkey |PRIMARY KEY |id |public.helpdesk_priorities |id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_priorities_level_key |CREATE UNIQUE INDEX helpdesk_priorities_level_key ON public.helpdesk_priorities USING btree (level) |
| helpdesk_priorities_pkey |CREATE UNIQUE INDEX helpdesk_priorities_pkey ON public.helpdesk_priorities USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can view priorities |SELECT |authenticated |true | |
| Editors can manage priorities |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.helpdesk_sla_policies

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |tenant_key |text |NO |'default'::text |NO |NEVER |
| 3 |name |text |NO | |NO |NEVER |
| 4 |team_id |uuid |YES | |NO |NEVER |
| 5 |target_stage_id |uuid |YES | |NO |NEVER |
| 6 |target_hours |numeric |NO |24 |NO |NEVER |
| 7 |priority_filter |integer(32,0) |YES | |NO |NEVER |
| 8 |active |boolean |NO |true |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 10 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |description |text |YES |''::text |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19770_10_not_null |CHECK | | | |
| 2200_19770_1_not_null |CHECK | | | |
| 2200_19770_2_not_null |CHECK | | | |
| 2200_19770_3_not_null |CHECK | | | |
| 2200_19770_6_not_null |CHECK | | | |
| 2200_19770_8_not_null |CHECK | | | |
| 2200_19770_9_not_null |CHECK | | | |
| helpdesk_sla_policies_pkey |PRIMARY KEY |id |public.helpdesk_sla_policies |id |
| helpdesk_sla_policies_target_stage_id_fkey |FOREIGN KEY |target_stage_id |public.helpdesk_ticket_stages |id |
| helpdesk_sla_policies_team_id_fkey |FOREIGN KEY |team_id |public.helpdesk_teams |id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_sla_policies_pkey |CREATE UNIQUE INDEX helpdesk_sla_policies_pkey ON public.helpdesk_sla_policies USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete SLA policies |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Authenticated users can view SLA policies |SELECT |authenticated |has_any_role(auth.uid()) | |
| Editors can insert SLA policies |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update SLA policies |UPDATE |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.helpdesk_team_members

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |team_id |uuid |NO | |NO |NEVER |
| 3 |user_id |uuid |NO | |NO |NEVER |
| 4 |role |text |NO |'member'::text |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20144_1_not_null |CHECK | | | |
| 2200_20144_2_not_null |CHECK | | | |
| 2200_20144_3_not_null |CHECK | | | |
| 2200_20144_4_not_null |CHECK | | | |
| 2200_20144_5_not_null |CHECK | | | |
| helpdesk_team_members_pkey |PRIMARY KEY |id |public.helpdesk_team_members |id |
| helpdesk_team_members_team_id_fkey |FOREIGN KEY |team_id |public.helpdesk_teams |id |
| helpdesk_team_members_team_id_user_id_key |UNIQUE |team_id, team_id, user_id, user_id |public.helpdesk_team_members |team_id, user_id, team_id, user_id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_team_members_pkey |CREATE UNIQUE INDEX helpdesk_team_members_pkey ON public.helpdesk_team_members USING btree (id) |
| helpdesk_team_members_team_id_user_id_key |CREATE UNIQUE INDEX helpdesk_team_members_team_id_user_id_key ON public.helpdesk_team_members USING btree (team_id, user_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins and operators can manage team members |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Authenticated users can view team members |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.helpdesk_teams

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |tenant_key |text |NO |'default'::text |NO |NEVER |
| 3 |name |text |NO | |NO |NEVER |
| 4 |description |text |YES | |NO |NEVER |
| 5 |is_active |boolean |NO |true |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |assignment_mode |text |NO |'manual'::text |NO |NEVER |
| 9 |visibility |text |NO |'internal'::text |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19323_1_not_null |CHECK | | | |
| 2200_19323_2_not_null |CHECK | | | |
| 2200_19323_3_not_null |CHECK | | | |
| 2200_19323_5_not_null |CHECK | | | |
| 2200_19323_6_not_null |CHECK | | | |
| 2200_19323_7_not_null |CHECK | | | |
| 2200_19323_8_not_null |CHECK | | | |
| 2200_19323_9_not_null |CHECK | | | |
| helpdesk_teams_pkey |PRIMARY KEY |id |public.helpdesk_teams |id |
| helpdesk_teams_tenant_name_key |UNIQUE |tenant_key, tenant_key, name, name |public.helpdesk_teams |name, tenant_key, name, tenant_key |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_teams_pkey |CREATE UNIQUE INDEX helpdesk_teams_pkey ON public.helpdesk_teams USING btree (id) |
| helpdesk_teams_tenant_name_key |CREATE UNIQUE INDEX helpdesk_teams_tenant_name_key ON public.helpdesk_teams USING btree (tenant_key, name) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete helpdesk teams |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Authenticated users can view helpdesk teams |SELECT |authenticated |has_any_role(auth.uid()) | |
| Editors can insert helpdesk teams |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update helpdesk teams |UPDATE |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_helpdesk_teams_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.helpdesk_ticket_events

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |ticket_id |uuid |NO | |NO |NEVER |
| 3 |event_type |text |NO | |NO |NEVER |
| 4 |actor_user_id |uuid |YES | |NO |NEVER |
| 5 |payload |jsonb |YES |'{}'::jsonb |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19436_1_not_null |CHECK | | | |
| 2200_19436_2_not_null |CHECK | | | |
| 2200_19436_3_not_null |CHECK | | | |
| 2200_19436_6_not_null |CHECK | | | |
| helpdesk_ticket_events_pkey |PRIMARY KEY |id |public.helpdesk_ticket_events |id |
| helpdesk_ticket_events_ticket_id_fkey |FOREIGN KEY |ticket_id |public.helpdesk_tickets |id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_ticket_events_event_type_idx |CREATE INDEX helpdesk_ticket_events_event_type_idx ON public.helpdesk_ticket_events USING btree (event_type) |
| helpdesk_ticket_events_pkey |CREATE UNIQUE INDEX helpdesk_ticket_events_pkey ON public.helpdesk_ticket_events USING btree (id) |
| helpdesk_ticket_events_ticket_id_created_at_idx |CREATE INDEX helpdesk_ticket_events_ticket_id_created_at_idx ON public.helpdesk_ticket_events USING btree (ticket_id, created_at DESC) |
| helpdesk_ticket_events_ticket_id_idx |CREATE INDEX helpdesk_ticket_events_ticket_id_idx ON public.helpdesk_ticket_events USING btree (ticket_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can create ticket events |INSERT |authenticated | |(has_edit_role(auth.uid()) OR (EXISTS ( SELECT 1<br>   FROM helpdesk_tickets t<br>  WHERE ((t.id = helpdesk_ticket_events.ticket_id) AND (t.owner_user_id = auth.uid()))))) |
| Customers can view own helpdesk ticket events |SELECT |authenticated |(can_access_customer_portal_feature(auth.uid(), 'helpdesk'::text) AND (EXISTS ( SELECT 1<br>   FROM helpdesk_tickets t<br>  WHERE ((t.id = helpdesk_ticket_events.ticket_id) AND ((t.owner_user_id = auth.uid()) OR (t.partner_contact_id IN ( SELECT p.crm_contact_id<br>           FROM profiles p<br>          WHERE ((p.user_id = auth.uid()) AND (p.crm_contact_id IS NOT NULL))))))))) | |
| Editors can insert helpdesk ticket events |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Staff can view all helpdesk ticket events |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.helpdesk_ticket_messages

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |ticket_id |uuid |NO | |NO |NEVER |
| 3 |direction |text |NO | |NO |NEVER |
| 4 |body |text |NO | |NO |NEVER |
| 5 |sender_user_id |uuid |YES | |NO |NEVER |
| 6 |sender_name |text |YES | |NO |NEVER |
| 7 |sender_email |text |YES | |NO |NEVER |
| 8 |sent_at |timestamp with time zone |NO |now() |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20961_1_not_null |CHECK | | | |
| 2200_20961_2_not_null |CHECK | | | |
| 2200_20961_3_not_null |CHECK | | | |
| 2200_20961_4_not_null |CHECK | | | |
| 2200_20961_8_not_null |CHECK | | | |
| 2200_20961_9_not_null |CHECK | | | |
| helpdesk_ticket_messages_direction_check |CHECK | |public.helpdesk_ticket_messages |direction |
| helpdesk_ticket_messages_pkey |PRIMARY KEY |id |public.helpdesk_ticket_messages |id |
| helpdesk_ticket_messages_sender_user_id_fkey |FOREIGN KEY |sender_user_id | | |
| helpdesk_ticket_messages_ticket_id_fkey |FOREIGN KEY |ticket_id |public.helpdesk_tickets |id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_ticket_messages_pkey |CREATE UNIQUE INDEX helpdesk_ticket_messages_pkey ON public.helpdesk_ticket_messages USING btree (id) |
| helpdesk_ticket_messages_ticket_sent_at_idx |CREATE INDEX helpdesk_ticket_messages_ticket_sent_at_idx ON public.helpdesk_ticket_messages USING btree (ticket_id, sent_at) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can view helpdesk ticket messages |SELECT |authenticated |has_any_role(auth.uid()) | |
| Editors can manage helpdesk ticket messages |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Ticket owners can create messages |INSERT |authenticated | |(EXISTS ( SELECT 1<br>   FROM helpdesk_tickets t<br>  WHERE ((t.id = helpdesk_ticket_messages.ticket_id) AND (t.owner_user_id = auth.uid())))) |
| Ticket participants can read messages |SELECT |authenticated |(EXISTS ( SELECT 1<br>   FROM helpdesk_tickets t<br>  WHERE ((t.id = helpdesk_ticket_messages.ticket_id) AND ((t.owner_user_id = auth.uid()) OR (t.partner_contact_id IN ( SELECT p.crm_contact_id<br>           FROM profiles p<br>          WHERE ((p.user_id = auth.uid()) AND (p.crm_contact_id IS NOT NULL)))))))) | |

### Triggers

_None._

## public.helpdesk_ticket_review_queue_items

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |tenant_key |text |NO |'default'::text |NO |NEVER |
| 3 |ticket_id |uuid |NO | |NO |NEVER |
| 4 |queue_name |text |NO | |NO |NEVER |
| 5 |status |text |NO |'pending'::text |NO |NEVER |
| 6 |source_signal |text |YES | |NO |NEVER |
| 7 |source_reference |text |YES | |NO |NEVER |
| 8 |article_id |uuid |YES | |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 10 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |resolved_at |timestamp with time zone |YES | |NO |NEVER |
| 12 |resolved_by |uuid |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20207_10_not_null |CHECK | | | |
| 2200_20207_1_not_null |CHECK | | | |
| 2200_20207_2_not_null |CHECK | | | |
| 2200_20207_3_not_null |CHECK | | | |
| 2200_20207_4_not_null |CHECK | | | |
| 2200_20207_5_not_null |CHECK | | | |
| 2200_20207_9_not_null |CHECK | | | |
| helpdesk_ticket_review_queue_items_article_id_fkey |FOREIGN KEY |article_id |public.help_articles |id |
| helpdesk_ticket_review_queue_items_pkey |PRIMARY KEY |id |public.helpdesk_ticket_review_queue_items |id |
| helpdesk_ticket_review_queue_items_queue_name_check |CHECK | |public.helpdesk_ticket_review_queue_items |queue_name |
| helpdesk_ticket_review_queue_items_status_check |CHECK | |public.helpdesk_ticket_review_queue_items |status |
| helpdesk_ticket_review_queue_items_ticket_id_fkey |FOREIGN KEY |ticket_id |public.helpdesk_tickets |id |
| helpdesk_ticket_review_queue_items_ticket_queue_unique |UNIQUE |ticket_id, ticket_id, queue_name, queue_name |public.helpdesk_ticket_review_queue_items |queue_name, ticket_id, queue_name, ticket_id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_ticket_review_queue_items_pkey |CREATE UNIQUE INDEX helpdesk_ticket_review_queue_items_pkey ON public.helpdesk_ticket_review_queue_items USING btree (id) |
| helpdesk_ticket_review_queue_items_queue_status_idx |CREATE INDEX helpdesk_ticket_review_queue_items_queue_status_idx ON public.helpdesk_ticket_review_queue_items USING btree (queue_name, status, created_at DESC) |
| helpdesk_ticket_review_queue_items_ticket_queue_unique |CREATE UNIQUE INDEX helpdesk_ticket_review_queue_items_ticket_queue_unique ON public.helpdesk_ticket_review_queue_items USING btree (ticket_id, queue_name) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage review queue |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Authenticated users can view helpdesk ticket review queue items |SELECT |authenticated |has_any_role(auth.uid()) | |
| Editors can manage helpdesk ticket review queue items |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_helpdesk_ticket_review_queue_items_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.helpdesk_ticket_sla_status

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |ticket_id |uuid |NO | |NO |NEVER |
| 3 |sla_policy_id |uuid |NO | |NO |NEVER |
| 4 |deadline_at |timestamp with time zone |YES | |NO |NEVER |
| 5 |reached_at |timestamp with time zone |YES | |NO |NEVER |
| 6 |status |text |NO |'in_progress'::text |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19797_1_not_null |CHECK | | | |
| 2200_19797_2_not_null |CHECK | | | |
| 2200_19797_3_not_null |CHECK | | | |
| 2200_19797_6_not_null |CHECK | | | |
| 2200_19797_7_not_null |CHECK | | | |
| 2200_19797_8_not_null |CHECK | | | |
| helpdesk_ticket_sla_status_pkey |PRIMARY KEY |id |public.helpdesk_ticket_sla_status |id |
| helpdesk_ticket_sla_status_sla_policy_id_fkey |FOREIGN KEY |sla_policy_id |public.helpdesk_sla_policies |id |
| helpdesk_ticket_sla_status_ticket_id_fkey |FOREIGN KEY |ticket_id |public.helpdesk_tickets |id |
| helpdesk_ticket_sla_status_ticket_id_sla_policy_id_key |UNIQUE |ticket_id, ticket_id, sla_policy_id, sla_policy_id |public.helpdesk_ticket_sla_status |sla_policy_id, ticket_id, sla_policy_id, ticket_id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_ticket_sla_status_pkey |CREATE UNIQUE INDEX helpdesk_ticket_sla_status_pkey ON public.helpdesk_ticket_sla_status USING btree (id) |
| helpdesk_ticket_sla_status_ticket_id_sla_policy_id_key |CREATE UNIQUE INDEX helpdesk_ticket_sla_status_ticket_id_sla_policy_id_key ON public.helpdesk_ticket_sla_status USING btree (ticket_id, sla_policy_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can view SLA status |SELECT |authenticated |has_any_role(auth.uid()) | |
| Editors can insert SLA status |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update SLA status |UPDATE |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.helpdesk_ticket_stages

Type: table
RLS enabled: yes
Estimated rows: 5

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |tenant_key |text |NO |'default'::text |NO |NEVER |
| 3 |name |text |NO | |NO |NEVER |
| 4 |sequence |integer(32,0) |NO |10 |NO |NEVER |
| 5 |is_closed |boolean |NO |false |NO |NEVER |
| 6 |is_folded |boolean |NO |false |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19341_1_not_null |CHECK | | | |
| 2200_19341_2_not_null |CHECK | | | |
| 2200_19341_3_not_null |CHECK | | | |
| 2200_19341_4_not_null |CHECK | | | |
| 2200_19341_5_not_null |CHECK | | | |
| 2200_19341_6_not_null |CHECK | | | |
| 2200_19341_7_not_null |CHECK | | | |
| 2200_19341_8_not_null |CHECK | | | |
| helpdesk_ticket_stages_pkey |PRIMARY KEY |id |public.helpdesk_ticket_stages |id |
| helpdesk_ticket_stages_tenant_name_key |UNIQUE |tenant_key, tenant_key, name, name |public.helpdesk_ticket_stages |name, tenant_key, name, tenant_key |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_ticket_stages_pkey |CREATE UNIQUE INDEX helpdesk_ticket_stages_pkey ON public.helpdesk_ticket_stages USING btree (id) |
| helpdesk_ticket_stages_tenant_name_key |CREATE UNIQUE INDEX helpdesk_ticket_stages_tenant_name_key ON public.helpdesk_ticket_stages USING btree (tenant_key, name) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete helpdesk ticket stages |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Authenticated users can view helpdesk ticket stages |SELECT |authenticated |has_any_role(auth.uid()) | |
| Editors can manage helpdesk ticket stages |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update helpdesk ticket stages |UPDATE |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_helpdesk_ticket_stages_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.helpdesk_ticket_tag_rel

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |ticket_id |uuid |NO | |NO |NEVER |
| 3 |tag_id |uuid |NO | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19454_1_not_null |CHECK | | | |
| 2200_19454_2_not_null |CHECK | | | |
| 2200_19454_3_not_null |CHECK | | | |
| helpdesk_ticket_tag_rel_pkey |PRIMARY KEY |id |public.helpdesk_ticket_tag_rel |id |
| helpdesk_ticket_tag_rel_tag_id_fkey |FOREIGN KEY |tag_id |public.helpdesk_ticket_tags |id |
| helpdesk_ticket_tag_rel_ticket_id_fkey |FOREIGN KEY |ticket_id |public.helpdesk_tickets |id |
| helpdesk_ticket_tag_rel_unique |UNIQUE |ticket_id, ticket_id, tag_id, tag_id |public.helpdesk_ticket_tag_rel |tag_id, ticket_id, tag_id, ticket_id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_ticket_tag_rel_pkey |CREATE UNIQUE INDEX helpdesk_ticket_tag_rel_pkey ON public.helpdesk_ticket_tag_rel USING btree (id) |
| helpdesk_ticket_tag_rel_unique |CREATE UNIQUE INDEX helpdesk_ticket_tag_rel_unique ON public.helpdesk_ticket_tag_rel USING btree (ticket_id, tag_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can view helpdesk ticket tag rel |SELECT |authenticated |has_any_role(auth.uid()) | |
| Editors can manage helpdesk ticket tag rel |ALL |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.helpdesk_ticket_tags

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |tenant_key |text |NO |'default'::text |NO |NEVER |
| 3 |name |text |NO | |NO |NEVER |
| 4 |color |text |NO |'#6366f1'::text |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19377_1_not_null |CHECK | | | |
| 2200_19377_2_not_null |CHECK | | | |
| 2200_19377_3_not_null |CHECK | | | |
| 2200_19377_4_not_null |CHECK | | | |
| 2200_19377_5_not_null |CHECK | | | |
| helpdesk_ticket_tags_pkey |PRIMARY KEY |id |public.helpdesk_ticket_tags |id |
| helpdesk_ticket_tags_tenant_name_key |UNIQUE |tenant_key, tenant_key, name, name |public.helpdesk_ticket_tags |name, tenant_key, name, tenant_key |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_ticket_tags_pkey |CREATE UNIQUE INDEX helpdesk_ticket_tags_pkey ON public.helpdesk_ticket_tags USING btree (id) |
| helpdesk_ticket_tags_tenant_name_key |CREATE UNIQUE INDEX helpdesk_ticket_tags_tenant_name_key ON public.helpdesk_ticket_tags USING btree (tenant_key, name) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can view helpdesk ticket tags |SELECT |authenticated |has_any_role(auth.uid()) | |
| Editors can manage helpdesk ticket tags |ALL |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.helpdesk_ticket_types

Type: table
RLS enabled: yes
Estimated rows: 7

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |tenant_key |text |NO |'default'::text |NO |NEVER |
| 3 |name |text |NO | |NO |NEVER |
| 4 |is_active |boolean |NO |true |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |code |text |YES | |NO |NEVER |
| 8 |description |text |YES | |NO |NEVER |
| 9 |operations_lane |text |NO |'support'::text |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19361_1_not_null |CHECK | | | |
| 2200_19361_2_not_null |CHECK | | | |
| 2200_19361_3_not_null |CHECK | | | |
| 2200_19361_4_not_null |CHECK | | | |
| 2200_19361_5_not_null |CHECK | | | |
| 2200_19361_6_not_null |CHECK | | | |
| 2200_19361_9_not_null |CHECK | | | |
| helpdesk_ticket_types_operations_lane_check |CHECK | |public.helpdesk_ticket_types |operations_lane |
| helpdesk_ticket_types_pkey |PRIMARY KEY |id |public.helpdesk_ticket_types |id |
| helpdesk_ticket_types_tenant_name_key |UNIQUE |tenant_key, tenant_key, name, name |public.helpdesk_ticket_types |name, tenant_key, name, tenant_key |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_ticket_types_pkey |CREATE UNIQUE INDEX helpdesk_ticket_types_pkey ON public.helpdesk_ticket_types USING btree (id) |
| helpdesk_ticket_types_tenant_code_key |CREATE UNIQUE INDEX helpdesk_ticket_types_tenant_code_key ON public.helpdesk_ticket_types USING btree (tenant_key, code) WHERE (code IS NOT NULL) |
| helpdesk_ticket_types_tenant_name_key |CREATE UNIQUE INDEX helpdesk_ticket_types_tenant_name_key ON public.helpdesk_ticket_types USING btree (tenant_key, name) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can view helpdesk ticket types |SELECT |authenticated |has_any_role(auth.uid()) | |
| Editors can manage helpdesk ticket types |ALL |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_helpdesk_ticket_types_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.helpdesk_ticket_watchers

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |ticket_id |uuid |NO | |NO |NEVER |
| 3 |watcher_type |text |NO | |NO |NEVER |
| 4 |user_id |uuid |YES | |NO |NEVER |
| 5 |staff_name |text |YES | |NO |NEVER |
| 6 |staff_email |text |YES | |NO |NEVER |
| 7 |contact_email |text |YES | |NO |NEVER |
| 8 |contact_name |text |YES | |NO |NEVER |
| 9 |is_permanent |boolean |NO |false |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20983_10_not_null |CHECK | | | |
| 2200_20983_1_not_null |CHECK | | | |
| 2200_20983_2_not_null |CHECK | | | |
| 2200_20983_3_not_null |CHECK | | | |
| 2200_20983_9_not_null |CHECK | | | |
| helpdesk_ticket_watchers_pkey |PRIMARY KEY |id |public.helpdesk_ticket_watchers |id |
| helpdesk_ticket_watchers_ticket_id_fkey |FOREIGN KEY |ticket_id |public.helpdesk_tickets |id |
| helpdesk_ticket_watchers_type_check |CHECK | |public.helpdesk_ticket_watchers |watcher_type |
| helpdesk_ticket_watchers_type_fields |CHECK | |public.helpdesk_ticket_watchers |contact_email, staff_email, user_id, watcher_type |
| helpdesk_ticket_watchers_unique_user |UNIQUE |ticket_id, ticket_id, user_id, user_id |public.helpdesk_ticket_watchers |ticket_id, user_id, ticket_id, user_id |
| helpdesk_ticket_watchers_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_ticket_watchers_pkey |CREATE UNIQUE INDEX helpdesk_ticket_watchers_pkey ON public.helpdesk_ticket_watchers USING btree (id) |
| helpdesk_ticket_watchers_ticket_id_idx |CREATE INDEX helpdesk_ticket_watchers_ticket_id_idx ON public.helpdesk_ticket_watchers USING btree (ticket_id) |
| helpdesk_ticket_watchers_unique_user |CREATE UNIQUE INDEX helpdesk_ticket_watchers_unique_user ON public.helpdesk_ticket_watchers USING btree (ticket_id, user_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can view helpdesk ticket watchers |SELECT |authenticated |has_any_role(auth.uid()) | |
| Editors can manage helpdesk ticket watchers |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Staff can add ticket watchers |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Staff can delete ticket watchers |DELETE |authenticated |has_edit_role(auth.uid()) | |
| Staff can update ticket watchers |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Staff can view ticket watchers |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.helpdesk_tickets

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |tenant_key |text |NO |'default'::text |NO |NEVER |
| 3 |ticket_number |text |NO | |NO |NEVER |
| 4 |title |text |NO | |NO |NEVER |
| 5 |description |text |NO |''::text |NO |NEVER |
| 6 |priority |integer(32,0) |NO |1 |NO |NEVER |
| 7 |team_id |uuid |YES | |NO |NEVER |
| 8 |stage_id |uuid |YES | |NO |NEVER |
| 9 |ticket_type_id |uuid |YES | |NO |NEVER |
| 10 |partner_contact_id |uuid |YES | |NO |NEVER |
| 11 |owner_user_id |uuid |YES | |NO |NEVER |
| 12 |deadline |timestamp with time zone |YES | |NO |NEVER |
| 13 |opened_at |timestamp with time zone |YES | |NO |NEVER |
| 14 |assigned_at |timestamp with time zone |YES | |NO |NEVER |
| 15 |closed_at |timestamp with time zone |YES | |NO |NEVER |
| 16 |source_channel |text |NO |'manual'::text |NO |NEVER |
| 17 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 18 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 19 |source_session_id |text |YES | |NO |NEVER |
| 20 |source_role_mode |text |YES | |NO |NEVER |
| 21 |source_route_context |text |YES | |NO |NEVER |
| 22 |source_authentication_required |boolean |NO |false |NO |NEVER |
| 23 |source_metadata |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 24 |contact_token |uuid |NO |gen_random_uuid() |NO |NEVER |
| 25 |customer_email |text |YES | |NO |NEVER |
| 26 |first_response_at |timestamp with time zone |YES | |NO |NEVER |
| 27 |sla_paused_at |timestamp with time zone |YES | |NO |NEVER |
| 28 |sla_paused_duration_seconds |integer(32,0) |NO |0 |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19392_16_not_null |CHECK | | | |
| 2200_19392_17_not_null |CHECK | | | |
| 2200_19392_18_not_null |CHECK | | | |
| 2200_19392_1_not_null |CHECK | | | |
| 2200_19392_22_not_null |CHECK | | | |
| 2200_19392_23_not_null |CHECK | | | |
| 2200_19392_24_not_null |CHECK | | | |
| 2200_19392_28_not_null |CHECK | | | |
| 2200_19392_2_not_null |CHECK | | | |
| 2200_19392_3_not_null |CHECK | | | |
| 2200_19392_4_not_null |CHECK | | | |
| 2200_19392_5_not_null |CHECK | | | |
| 2200_19392_6_not_null |CHECK | | | |
| helpdesk_tickets_partner_contact_id_fkey |FOREIGN KEY |partner_contact_id |public.contacts |id |
| helpdesk_tickets_pkey |PRIMARY KEY |id |public.helpdesk_tickets |id |
| helpdesk_tickets_priority_check |CHECK | |public.helpdesk_tickets |priority |
| helpdesk_tickets_source_channel_check |CHECK | |public.helpdesk_tickets |source_channel |
| helpdesk_tickets_stage_id_fkey |FOREIGN KEY |stage_id |public.helpdesk_ticket_stages |id |
| helpdesk_tickets_team_id_fkey |FOREIGN KEY |team_id |public.helpdesk_teams |id |
| helpdesk_tickets_tenant_number_key |UNIQUE |tenant_key, tenant_key, ticket_number, ticket_number |public.helpdesk_tickets |tenant_key, ticket_number, tenant_key, ticket_number |
| helpdesk_tickets_ticket_type_id_fkey |FOREIGN KEY |ticket_type_id |public.helpdesk_ticket_types |id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_tickets_contact_token_idx |CREATE UNIQUE INDEX helpdesk_tickets_contact_token_idx ON public.helpdesk_tickets USING btree (contact_token) |
| helpdesk_tickets_customer_email_idx |CREATE INDEX helpdesk_tickets_customer_email_idx ON public.helpdesk_tickets USING btree (customer_email) WHERE (customer_email IS NOT NULL) |
| helpdesk_tickets_owner_user_id_idx |CREATE INDEX helpdesk_tickets_owner_user_id_idx ON public.helpdesk_tickets USING btree (owner_user_id) |
| helpdesk_tickets_pkey |CREATE UNIQUE INDEX helpdesk_tickets_pkey ON public.helpdesk_tickets USING btree (id) |
| helpdesk_tickets_source_channel_idx |CREATE INDEX helpdesk_tickets_source_channel_idx ON public.helpdesk_tickets USING btree (source_channel) |
| helpdesk_tickets_source_session_idx |CREATE INDEX helpdesk_tickets_source_session_idx ON public.helpdesk_tickets USING btree (source_session_id) WHERE (source_session_id IS NOT NULL) |
| helpdesk_tickets_stage_id_idx |CREATE INDEX helpdesk_tickets_stage_id_idx ON public.helpdesk_tickets USING btree (stage_id) |
| helpdesk_tickets_team_id_idx |CREATE INDEX helpdesk_tickets_team_id_idx ON public.helpdesk_tickets USING btree (team_id) |
| helpdesk_tickets_tenant_number_key |CREATE UNIQUE INDEX helpdesk_tickets_tenant_number_key ON public.helpdesk_tickets USING btree (tenant_key, ticket_number) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete helpdesk tickets |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can update helpdesk tickets |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Users can create authorized helpdesk tickets |INSERT |authenticated | |(has_edit_role(auth.uid()) OR (can_access_customer_portal_feature(auth.uid(), 'helpdesk'::text) AND (owner_user_id = auth.uid()))) |
| Users can read authorized helpdesk tickets |SELECT |authenticated |(has_edit_role(auth.uid()) OR (can_access_customer_portal_feature(auth.uid(), 'helpdesk'::text) AND ((owner_user_id = auth.uid()) OR (partner_contact_id IN ( SELECT profiles.crm_contact_id<br>   FROM profiles<br>  WHERE ((profiles.user_id = auth.uid()) AND (profiles.crm_contact_id IS NOT NULL))))))) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| helpdesk_sla_pause_trigger |BEFORE |UPDATE |ROW |EXECUTE FUNCTION helpdesk_manage_sla_pause() |
| update_helpdesk_tickets_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.import_batches

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |file_name |text |NO | |NO |NEVER |
| 4 |status |text |NO |'pending'::text |NO |NEVER |
| 5 |total_rows |integer(32,0) |NO |0 |NO |NEVER |
| 6 |success_count |integer(32,0) |NO |0 |NO |NEVER |
| 7 |error_count |integer(32,0) |NO |0 |NO |NEVER |
| 8 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 9 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17937_1_not_null |CHECK | | | |
| 2200_17937_2_not_null |CHECK | | | |
| 2200_17937_3_not_null |CHECK | | | |
| 2200_17937_4_not_null |CHECK | | | |
| 2200_17937_5_not_null |CHECK | | | |
| 2200_17937_6_not_null |CHECK | | | |
| 2200_17937_7_not_null |CHECK | | | |
| 2200_17937_8_not_null |CHECK | | | |
| 2200_17937_9_not_null |CHECK | | | |
| import_batches_pkey |PRIMARY KEY |id |public.import_batches |id |

### Indexes

| Name |Definition |
| --- |--- |
| import_batches_pkey |CREATE UNIQUE INDEX import_batches_pkey ON public.import_batches USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete import_batches |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert import_batches |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can select import_batches |SELECT |public |has_edit_role(auth.uid()) | |
| Editors can update import_batches |UPDATE |public |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_import_batches_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.import_ref_mappings

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |ref_table |text |NO | |NO |NEVER |
| 3 |csv_value |text |NO | |NO |NEVER |
| 4 |mapped_id |uuid |NO | |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18200_1_not_null |CHECK | | | |
| 2200_18200_2_not_null |CHECK | | | |
| 2200_18200_3_not_null |CHECK | | | |
| 2200_18200_4_not_null |CHECK | | | |
| 2200_18200_5_not_null |CHECK | | | |
| import_ref_mappings_pkey |PRIMARY KEY |id |public.import_ref_mappings |id |
| import_ref_mappings_ref_table_csv_value_key |UNIQUE |ref_table, ref_table, csv_value, csv_value |public.import_ref_mappings |csv_value, ref_table, csv_value, ref_table |

### Indexes

| Name |Definition |
| --- |--- |
| import_ref_mappings_pkey |CREATE UNIQUE INDEX import_ref_mappings_pkey ON public.import_ref_mappings USING btree (id) |
| import_ref_mappings_ref_table_csv_value_key |CREATE UNIQUE INDEX import_ref_mappings_ref_table_csv_value_key ON public.import_ref_mappings USING btree (ref_table, csv_value) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete import_ref_mappings |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert import_ref_mappings |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can select import_ref_mappings |SELECT |public |has_edit_role(auth.uid()) | |
| Editors can update import_ref_mappings |UPDATE |public |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.industries

Type: table
RLS enabled: yes
Estimated rows: 10

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |full_name |text |NO |''::text |NO |NEVER |
| 4 |is_active |boolean |NO |true |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18618_1_not_null |CHECK | | | |
| 2200_18618_2_not_null |CHECK | | | |
| 2200_18618_3_not_null |CHECK | | | |
| 2200_18618_4_not_null |CHECK | | | |
| 2200_18618_5_not_null |CHECK | | | |
| 2200_18618_6_not_null |CHECK | | | |
| industries_pkey |PRIMARY KEY |id |public.industries |id |

### Indexes

| Name |Definition |
| --- |--- |
| industries_pkey |CREATE UNIQUE INDEX industries_pkey ON public.industries USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete industries |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert industries |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update industries |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select industries |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.innovations_sync_dead_letters

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |entity |text |NO | |NO |NEVER |
| 3 |external_id |text |YES | |NO |NEVER |
| 4 |api_key_id |uuid |YES | |NO |NEVER |
| 5 |last_error |text |YES | |NO |NEVER |
| 6 |source_payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 7 |status |text |NO |'pending'::text |NO |NEVER |
| 8 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 9 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22322_1_not_null |CHECK | | | |
| 2200_22322_2_not_null |CHECK | | | |
| 2200_22322_6_not_null |CHECK | | | |
| 2200_22322_7_not_null |CHECK | | | |
| 2200_22322_8_not_null |CHECK | | | |
| 2200_22322_9_not_null |CHECK | | | |
| innovations_sync_dead_letters_api_key_id_fkey |FOREIGN KEY |api_key_id |public.api_keys |id |
| innovations_sync_dead_letters_pkey |PRIMARY KEY |id |public.innovations_sync_dead_letters |id |

### Indexes

| Name |Definition |
| --- |--- |
| innovations_sync_dead_letters_pkey |CREATE UNIQUE INDEX innovations_sync_dead_letters_pkey ON public.innovations_sync_dead_letters USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins manage innovations_sync_dead_letters |ALL |authenticated |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

_None._

## public.innovations_sync_requests

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |entities |ARRAY |NO |ARRAY['customers'::text, 'contacts'::text] |NO |NEVER |
| 3 |status |text |NO |'pending'::text |NO |NEVER |
| 4 |requested_by |uuid |YES | |NO |NEVER |
| 5 |requested_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |claimed_at |timestamp with time zone |YES | |NO |NEVER |
| 7 |finished_at |timestamp with time zone |YES | |NO |NEVER |
| 8 |result |jsonb |YES | |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21488_1_not_null |CHECK | | | |
| 2200_21488_2_not_null |CHECK | | | |
| 2200_21488_3_not_null |CHECK | | | |
| 2200_21488_5_not_null |CHECK | | | |
| 2200_21488_9_not_null |CHECK | | | |
| innovations_sync_requests_pkey |PRIMARY KEY |id |public.innovations_sync_requests |id |
| innovations_sync_requests_status_check |CHECK | |public.innovations_sync_requests |status |

### Indexes

| Name |Definition |
| --- |--- |
| idx_innovations_sync_requests_status |CREATE INDEX idx_innovations_sync_requests_status ON public.innovations_sync_requests USING btree (status, requested_at) |
| innovations_sync_requests_pkey |CREATE UNIQUE INDEX innovations_sync_requests_pkey ON public.innovations_sync_requests USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins manage innovations_sync_requests |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

_None._

## public.innovations_sync_runs

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |entity |text |NO | |NO |NEVER |
| 3 |api_key_id |uuid |YES | |NO |NEVER |
| 4 |dry_run |boolean |NO |true |NO |NEVER |
| 5 |received |integer(32,0) |NO |0 |NO |NEVER |
| 6 |upserted |integer(32,0) |NO |0 |NO |NEVER |
| 7 |failed |integer(32,0) |NO |0 |NO |NEVER |
| 8 |status |text |NO |'success'::text |NO |NEVER |
| 9 |error_summary |text |YES | |NO |NEVER |
| 10 |started_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |finished_at |timestamp with time zone |NO |now() |NO |NEVER |
| 12 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22301_10_not_null |CHECK | | | |
| 2200_22301_11_not_null |CHECK | | | |
| 2200_22301_12_not_null |CHECK | | | |
| 2200_22301_1_not_null |CHECK | | | |
| 2200_22301_2_not_null |CHECK | | | |
| 2200_22301_4_not_null |CHECK | | | |
| 2200_22301_5_not_null |CHECK | | | |
| 2200_22301_6_not_null |CHECK | | | |
| 2200_22301_7_not_null |CHECK | | | |
| 2200_22301_8_not_null |CHECK | | | |
| innovations_sync_runs_api_key_id_fkey |FOREIGN KEY |api_key_id |public.api_keys |id |
| innovations_sync_runs_pkey |PRIMARY KEY |id |public.innovations_sync_runs |id |

### Indexes

| Name |Definition |
| --- |--- |
| innovations_sync_runs_pkey |CREATE UNIQUE INDEX innovations_sync_runs_pkey ON public.innovations_sync_runs USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins manage innovations_sync_runs |ALL |authenticated |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

_None._

## public.integration_audit_events

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |integration_connection_id |uuid |NO | |NO |NEVER |
| 3 |tenant_key |text |NO | |NO |NEVER |
| 4 |provider |text |NO | |NO |NEVER |
| 5 |event_type |text |NO | |NO |NEVER |
| 6 |actor_user_id |uuid |YES | |NO |NEVER |
| 7 |event_payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 8 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19098_1_not_null |CHECK | | | |
| 2200_19098_2_not_null |CHECK | | | |
| 2200_19098_3_not_null |CHECK | | | |
| 2200_19098_4_not_null |CHECK | | | |
| 2200_19098_5_not_null |CHECK | | | |
| 2200_19098_7_not_null |CHECK | | | |
| 2200_19098_8_not_null |CHECK | | | |
| integration_audit_events_pkey |PRIMARY KEY |id |public.integration_audit_events |id |

### Indexes

| Name |Definition |
| --- |--- |
| idx_integration_audit_events_connection_created |CREATE INDEX idx_integration_audit_events_connection_created ON public.integration_audit_events USING btree (integration_connection_id, created_at DESC) |
| integration_audit_events_pkey |CREATE UNIQUE INDEX integration_audit_events_pkey ON public.integration_audit_events USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage integration_audit_events |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

_None._

## public.integration_conflict_queue

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |integration_connection_id |uuid |NO | |NO |NEVER |
| 3 |tenant_key |text |NO | |NO |NEVER |
| 4 |provider |text |NO | |NO |NEVER |
| 5 |source_model |text |NO | |NO |NEVER |
| 6 |source_identifier |text |NO | |NO |NEVER |
| 7 |local_identifier |uuid |YES | |NO |NEVER |
| 8 |conflict_payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 9 |resolution_status |text |NO |'pending'::text |NO |NEVER |
| 10 |resolution_winner |text |YES | |NO |NEVER |
| 11 |overridden_by |uuid |YES | |NO |NEVER |
| 12 |overridden_at |timestamp with time zone |YES | |NO |NEVER |
| 13 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 14 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19130_13_not_null |CHECK | | | |
| 2200_19130_14_not_null |CHECK | | | |
| 2200_19130_1_not_null |CHECK | | | |
| 2200_19130_2_not_null |CHECK | | | |
| 2200_19130_3_not_null |CHECK | | | |
| 2200_19130_4_not_null |CHECK | | | |
| 2200_19130_5_not_null |CHECK | | | |
| 2200_19130_6_not_null |CHECK | | | |
| 2200_19130_8_not_null |CHECK | | | |
| 2200_19130_9_not_null |CHECK | | | |
| integration_conflict_queue_pkey |PRIMARY KEY |id |public.integration_conflict_queue |id |
| integration_conflict_queue_resolution_status_check |CHECK | |public.integration_conflict_queue |resolution_status |
| integration_conflict_queue_resolution_winner_check |CHECK | |public.integration_conflict_queue |resolution_winner |

### Indexes

| Name |Definition |
| --- |--- |
| idx_integration_conflict_queue_status |CREATE INDEX idx_integration_conflict_queue_status ON public.integration_conflict_queue USING btree (tenant_key, provider, resolution_status, created_at DESC) |
| integration_conflict_queue_pkey |CREATE UNIQUE INDEX integration_conflict_queue_pkey ON public.integration_conflict_queue USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage integration_conflict_queue |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_integration_conflict_queue_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.integration_sync_run_metrics

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |integration_connection_id |uuid |NO | |NO |NEVER |
| 3 |sync_job_id |uuid |YES | |NO |NEVER |
| 4 |tenant_key |text |NO | |NO |NEVER |
| 5 |provider |text |NO | |NO |NEVER |
| 6 |run_started_at |timestamp with time zone |NO | |NO |NEVER |
| 7 |run_completed_at |timestamp with time zone |YES | |NO |NEVER |
| 8 |success |boolean |NO |false |NO |NEVER |
| 9 |source_cursor_at |timestamp with time zone |YES | |NO |NEVER |
| 10 |records_processed |integer(32,0) |NO |0 |NO |NEVER |
| 11 |records_failed |integer(32,0) |NO |0 |NO |NEVER |
| 12 |source_lag_seconds |integer(32,0) |YES | |NO |NEVER |
| 13 |error_rate |numeric(8,4) |YES | |NO |ALWAYS |
| 14 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19149_10_not_null |CHECK | | | |
| 2200_19149_11_not_null |CHECK | | | |
| 2200_19149_14_not_null |CHECK | | | |
| 2200_19149_1_not_null |CHECK | | | |
| 2200_19149_2_not_null |CHECK | | | |
| 2200_19149_4_not_null |CHECK | | | |
| 2200_19149_5_not_null |CHECK | | | |
| 2200_19149_6_not_null |CHECK | | | |
| 2200_19149_8_not_null |CHECK | | | |
| integration_sync_run_metrics_pkey |PRIMARY KEY |id |public.integration_sync_run_metrics |id |

### Indexes

| Name |Definition |
| --- |--- |
| idx_integration_sync_run_metrics_connection_started |CREATE INDEX idx_integration_sync_run_metrics_connection_started ON public.integration_sync_run_metrics USING btree (integration_connection_id, run_started_at DESC) |
| integration_sync_run_metrics_pkey |CREATE UNIQUE INDEX integration_sync_run_metrics_pkey ON public.integration_sync_run_metrics USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage integration_sync_run_metrics |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

_None._

## public.lead_audits

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |contact_id |uuid |NO | |NO |NEVER |
| 3 |opportunity_id |uuid |YES | |NO |NEVER |
| 4 |score |integer(32,0) |NO |0 |NO |NEVER |
| 5 |score_breakdown |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 6 |raw_data |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 7 |ai_summary |text |YES | |NO |NEVER |
| 8 |generated_pdf_url |text |YES | |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 10 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |generated_at |timestamp with time zone |YES | |NO |NEVER |
| 12 |pdf_url |text |YES | |NO |NEVER |
| 13 |summary |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18784_10_not_null |CHECK | | | |
| 2200_18784_1_not_null |CHECK | | | |
| 2200_18784_2_not_null |CHECK | | | |
| 2200_18784_4_not_null |CHECK | | | |
| 2200_18784_5_not_null |CHECK | | | |
| 2200_18784_6_not_null |CHECK | | | |
| 2200_18784_9_not_null |CHECK | | | |
| lead_audits_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| lead_audits_opportunity_id_fkey |FOREIGN KEY |opportunity_id |public.opportunities |id |
| lead_audits_pkey |PRIMARY KEY |id |public.lead_audits |id |

### Indexes

| Name |Definition |
| --- |--- |
| lead_audits_contact_id_idx |CREATE INDEX lead_audits_contact_id_idx ON public.lead_audits USING btree (contact_id) |
| lead_audits_opportunity_id_idx |CREATE INDEX lead_audits_opportunity_id_idx ON public.lead_audits USING btree (opportunity_id) |
| lead_audits_pkey |CREATE UNIQUE INDEX lead_audits_pkey ON public.lead_audits USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete lead_audits |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert lead_audits |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update lead_audits |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Staff can view lead_audits |SELECT |authenticated |has_staff_role(auth.uid()) | |

### Triggers

_None._

## public.lead_events

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |event_type |text |NO | |NO |NEVER |
| 3 |contact_id |uuid |YES | |NO |NEVER |
| 4 |opportunity_id |uuid |YES | |NO |NEVER |
| 5 |user_id |uuid |NO |auth.uid() |NO |NEVER |
| 6 |provider_diagnostics_summary |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18937_1_not_null |CHECK | | | |
| 2200_18937_2_not_null |CHECK | | | |
| 2200_18937_5_not_null |CHECK | | | |
| 2200_18937_6_not_null |CHECK | | | |
| 2200_18937_7_not_null |CHECK | | | |
| lead_events_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| lead_events_event_type_check |CHECK | |public.lead_events |event_type |
| lead_events_opportunity_id_fkey |FOREIGN KEY |opportunity_id |public.opportunities |id |
| lead_events_pkey |PRIMARY KEY |id |public.lead_events |id |

### Indexes

| Name |Definition |
| --- |--- |
| lead_events_contact_id_idx |CREATE INDEX lead_events_contact_id_idx ON public.lead_events USING btree (contact_id) |
| lead_events_created_at_idx |CREATE INDEX lead_events_created_at_idx ON public.lead_events USING btree (created_at DESC) |
| lead_events_event_type_idx |CREATE INDEX lead_events_event_type_idx ON public.lead_events USING btree (event_type) |
| lead_events_opportunity_id_idx |CREATE INDEX lead_events_opportunity_id_idx ON public.lead_events USING btree (opportunity_id) |
| lead_events_pkey |CREATE UNIQUE INDEX lead_events_pkey ON public.lead_events USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can insert lead events |INSERT |public | |(has_edit_role(auth.uid()) AND (user_id = auth.uid())) |
| Role users can select lead events |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.lead_provider_credentials

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |provider |text |NO | |NO |NEVER |
| 3 |credential |text |NO |''::text |NO |NEVER |
| 4 |tenant_key |text |NO |'default'::text |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19009_1_not_null |CHECK | | | |
| 2200_19009_2_not_null |CHECK | | | |
| 2200_19009_3_not_null |CHECK | | | |
| 2200_19009_4_not_null |CHECK | | | |
| 2200_19009_5_not_null |CHECK | | | |
| 2200_19009_6_not_null |CHECK | | | |
| lead_provider_credentials_pkey |PRIMARY KEY |id |public.lead_provider_credentials |id |
| lead_provider_credentials_provider_tenant_key_key |UNIQUE |provider, provider, tenant_key, tenant_key |public.lead_provider_credentials |provider, tenant_key, provider, tenant_key |

### Indexes

| Name |Definition |
| --- |--- |
| lead_provider_credentials_pkey |CREATE UNIQUE INDEX lead_provider_credentials_pkey ON public.lead_provider_credentials USING btree (id) |
| lead_provider_credentials_provider_tenant_key_key |CREATE UNIQUE INDEX lead_provider_credentials_provider_tenant_key_key ON public.lead_provider_credentials USING btree (provider, tenant_key) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage lead_provider_credentials |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

_None._

## public.lead_scoring_outcomes

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |contact_id |uuid |YES | |NO |NEVER |
| 3 |opportunity_id |uuid |YES | |NO |NEVER |
| 4 |outcome_stage |text |NO | |NO |NEVER |
| 5 |model_score |integer(32,0) |YES | |NO |NEVER |
| 6 |score_breakdown |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 7 |metadata |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 8 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19649_1_not_null |CHECK | | | |
| 2200_19649_4_not_null |CHECK | | | |
| 2200_19649_6_not_null |CHECK | | | |
| 2200_19649_7_not_null |CHECK | | | |
| 2200_19649_8_not_null |CHECK | | | |
| lead_scoring_outcomes_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| lead_scoring_outcomes_opportunity_id_fkey |FOREIGN KEY |opportunity_id |public.opportunities |id |
| lead_scoring_outcomes_pkey |PRIMARY KEY |id |public.lead_scoring_outcomes |id |

### Indexes

| Name |Definition |
| --- |--- |
| lead_scoring_outcomes_pkey |CREATE UNIQUE INDEX lead_scoring_outcomes_pkey ON public.lead_scoring_outcomes USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated can insert lead scoring outcomes |INSERT |authenticated | |true |
| Authenticated can read lead scoring outcomes |SELECT |authenticated |true | |

### Triggers

_None._

## public.lead_scoring_weights

Type: table
RLS enabled: yes
Estimated rows: 7

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |factor |text |NO | |NO |NEVER |
| 3 |weight |numeric |NO | |NO |NEVER |
| 4 |is_active |boolean |NO |true |NO |NEVER |
| 5 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |updated_by |uuid |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19630_1_not_null |CHECK | | | |
| 2200_19630_2_not_null |CHECK | | | |
| 2200_19630_3_not_null |CHECK | | | |
| 2200_19630_4_not_null |CHECK | | | |
| 2200_19630_5_not_null |CHECK | | | |
| lead_scoring_weights_factor_key |UNIQUE |factor |public.lead_scoring_weights |factor |
| lead_scoring_weights_pkey |PRIMARY KEY |id |public.lead_scoring_weights |id |
| lead_scoring_weights_updated_by_fkey |FOREIGN KEY |updated_by | | |
| lead_scoring_weights_weight_check |CHECK | |public.lead_scoring_weights |weight |

### Indexes

| Name |Definition |
| --- |--- |
| lead_scoring_weights_factor_key |CREATE UNIQUE INDEX lead_scoring_weights_factor_key ON public.lead_scoring_weights USING btree (factor) |
| lead_scoring_weights_pkey |CREATE UNIQUE INDEX lead_scoring_weights_pkey ON public.lead_scoring_weights USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated can read lead scoring weights |SELECT |authenticated |true | |

### Triggers

_None._

## public.lead_search_runs

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO |auth.uid() |NO |NEVER |
| 3 |mode |text |NO | |NO |NEVER |
| 4 |query_input |text |YES | |NO |NEVER |
| 5 |strategy_constraints |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 6 |strategy_ranked_intents |jsonb |NO |'[]'::jsonb |NO |NEVER |
| 7 |selected_intent |jsonb |YES | |NO |NEVER |
| 8 |provider_scope |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 9 |providers_used |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 10 |provider_telemetry |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 11 |leads_count |integer(32,0) |NO |0 |NO |NEVER |
| 12 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19599_10_not_null |CHECK | | | |
| 2200_19599_11_not_null |CHECK | | | |
| 2200_19599_12_not_null |CHECK | | | |
| 2200_19599_1_not_null |CHECK | | | |
| 2200_19599_2_not_null |CHECK | | | |
| 2200_19599_3_not_null |CHECK | | | |
| 2200_19599_5_not_null |CHECK | | | |
| 2200_19599_6_not_null |CHECK | | | |
| 2200_19599_8_not_null |CHECK | | | |
| 2200_19599_9_not_null |CHECK | | | |
| lead_search_runs_mode_check |CHECK | |public.lead_search_runs |mode |
| lead_search_runs_pkey |PRIMARY KEY |id |public.lead_search_runs |id |

### Indexes

| Name |Definition |
| --- |--- |
| lead_search_runs_created_at_idx |CREATE INDEX lead_search_runs_created_at_idx ON public.lead_search_runs USING btree (created_at DESC) |
| lead_search_runs_mode_idx |CREATE INDEX lead_search_runs_mode_idx ON public.lead_search_runs USING btree (mode) |
| lead_search_runs_pkey |CREATE UNIQUE INDEX lead_search_runs_pkey ON public.lead_search_runs USING btree (id) |
| lead_search_runs_user_id_idx |CREATE INDEX lead_search_runs_user_id_idx ON public.lead_search_runs USING btree (user_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| lead_search_runs_insert_editors |INSERT |authenticated | |(has_edit_role(auth.uid()) AND (user_id = auth.uid())) |
| lead_search_runs_select_auth |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.lead_search_strategies

Type: table
RLS enabled: yes
Estimated rows: 4

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |industry |text |NO | |NO |NEVER |
| 3 |subsegments |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 4 |buyer_roles |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 5 |exclusions |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 6 |keyword_clusters |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 7 |channel_hints |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 8 |is_active |boolean |NO |true |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 10 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19579_10_not_null |CHECK | | | |
| 2200_19579_1_not_null |CHECK | | | |
| 2200_19579_2_not_null |CHECK | | | |
| 2200_19579_3_not_null |CHECK | | | |
| 2200_19579_4_not_null |CHECK | | | |
| 2200_19579_5_not_null |CHECK | | | |
| 2200_19579_6_not_null |CHECK | | | |
| 2200_19579_7_not_null |CHECK | | | |
| 2200_19579_8_not_null |CHECK | | | |
| 2200_19579_9_not_null |CHECK | | | |
| lead_search_strategies_pkey |PRIMARY KEY |id |public.lead_search_strategies |id |

### Indexes

| Name |Definition |
| --- |--- |
| lead_search_strategies_active_idx |CREATE INDEX lead_search_strategies_active_idx ON public.lead_search_strategies USING btree (is_active) |
| lead_search_strategies_industry_idx |CREATE INDEX lead_search_strategies_industry_idx ON public.lead_search_strategies USING btree (industry) |
| lead_search_strategies_pkey |CREATE UNIQUE INDEX lead_search_strategies_pkey ON public.lead_search_strategies USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| lead_search_strategies_select_auth |SELECT |authenticated |has_any_role(auth.uid()) | |
| lead_search_strategies_write_editors |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.legacy_rates

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |rate_code |text |NO | |NO |NEVER |
| 3 |description |text |NO |''::text |NO |NEVER |
| 4 |value_type |text |NO |'percent'::text |NO |NEVER |
| 5 |value |numeric |NO |0 |NO |NEVER |
| 6 |currency |text |YES | |NO |NEVER |
| 7 |effective_date |date |YES | |NO |NEVER |
| 8 |is_active |boolean |NO |true |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 10 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18520_10_not_null |CHECK | | | |
| 2200_18520_1_not_null |CHECK | | | |
| 2200_18520_2_not_null |CHECK | | | |
| 2200_18520_3_not_null |CHECK | | | |
| 2200_18520_4_not_null |CHECK | | | |
| 2200_18520_5_not_null |CHECK | | | |
| 2200_18520_8_not_null |CHECK | | | |
| 2200_18520_9_not_null |CHECK | | | |
| legacy_rates_pkey |PRIMARY KEY |id |public.legacy_rates |id |
| legacy_rates_rate_code_key |UNIQUE |rate_code |public.legacy_rates |rate_code |
| legacy_rates_value_type_check |CHECK | |public.legacy_rates |value_type |

### Indexes

| Name |Definition |
| --- |--- |
| legacy_rates_pkey |CREATE UNIQUE INDEX legacy_rates_pkey ON public.legacy_rates USING btree (id) |
| legacy_rates_rate_code_key |CREATE UNIQUE INDEX legacy_rates_rate_code_key ON public.legacy_rates USING btree (rate_code) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage legacy_rates |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |
| Role users can select legacy_rates |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_legacy_rates_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.lens_lens_options

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |lens_id |uuid |NO | |NO |NEVER |
| 3 |lens_option_id |uuid |NO | |NO |NEVER |
| 4 |extra_cost |numeric(10,2) |NO |0 |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17868_1_not_null |CHECK | | | |
| 2200_17868_2_not_null |CHECK | | | |
| 2200_17868_3_not_null |CHECK | | | |
| 2200_17868_4_not_null |CHECK | | | |
| lens_lens_options_lens_id_fkey |FOREIGN KEY |lens_id |public.lenses |id |
| lens_lens_options_lens_id_lens_option_id_key |UNIQUE |lens_id, lens_id, lens_option_id, lens_option_id |public.lens_lens_options |lens_id, lens_option_id, lens_id, lens_option_id |
| lens_lens_options_lens_option_id_fkey |FOREIGN KEY |lens_option_id |public.lens_options |id |
| lens_lens_options_pkey |PRIMARY KEY |id |public.lens_lens_options |id |

### Indexes

| Name |Definition |
| --- |--- |
| lens_lens_options_lens_id_lens_option_id_key |CREATE UNIQUE INDEX lens_lens_options_lens_id_lens_option_id_key ON public.lens_lens_options USING btree (lens_id, lens_option_id) |
| lens_lens_options_pkey |CREATE UNIQUE INDEX lens_lens_options_pkey ON public.lens_lens_options USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete lens_lens_options |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert lens_lens_options |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update lens_lens_options |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select lens_lens_options |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.lens_options

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |is_active |boolean |NO |true |NO |NEVER |
| 4 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |abbrev |text |NO |''::text |NO |NEVER |
| 7 |code |text |NO |''::text |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17794_1_not_null |CHECK | | | |
| 2200_17794_2_not_null |CHECK | | | |
| 2200_17794_3_not_null |CHECK | | | |
| 2200_17794_4_not_null |CHECK | | | |
| 2200_17794_5_not_null |CHECK | | | |
| 2200_17794_6_not_null |CHECK | | | |
| 2200_17794_7_not_null |CHECK | | | |
| lens_options_name_key |UNIQUE |name |public.lens_options |name |
| lens_options_pkey |PRIMARY KEY |id |public.lens_options |id |

### Indexes

| Name |Definition |
| --- |--- |
| lens_options_name_key |CREATE UNIQUE INDEX lens_options_name_key ON public.lens_options USING btree (name) |
| lens_options_pkey |CREATE UNIQUE INDEX lens_options_pkey ON public.lens_options USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete lens_options |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert lens_options |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update lens_options |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Role users can select lens_options |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_lens_options_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.lenses

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |supplier_id |uuid |NO | |NO |NEVER |
| 3 |brand_id |uuid |NO | |NO |NEVER |
| 4 |material_id |uuid |NO | |NO |NEVER |
| 5 |mftype_id |uuid |NO | |NO |NEVER |
| 6 |lenstype_id |uuid |NO | |NO |NEVER |
| 7 |name |text |NO | |NO |NEVER |
| 8 |index_value |numeric(3,2) |NO | |NO |NEVER |
| 9 |base_price |numeric(10,2) |NO | |NO |NEVER |
| 10 |sell_price |numeric(10,2) |NO | |NO |NEVER |
| 11 |sph_min |numeric(5,2) |NO | |NO |NEVER |
| 12 |sph_max |numeric(5,2) |NO | |NO |NEVER |
| 13 |cyl_min |numeric(5,2) |NO | |NO |NEVER |
| 14 |cyl_max |numeric(5,2) |NO | |NO |NEVER |
| 15 |add_min |numeric(5,2) |YES | |NO |NEVER |
| 16 |add_max |numeric(5,2) |YES | |NO |NEVER |
| 17 |is_active |boolean |NO |true |NO |NEVER |
| 18 |notes |text |YES | |NO |NEVER |
| 19 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 20 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 21 |show_in_pricelist |boolean |NO |true |NO |NEVER |
| 22 |full_lab |boolean |NO |false |NO |NEVER |
| 23 |show_in_ws_pricelist |boolean |NO |false |NO |NEVER |
| 24 |show_on_website |boolean |NO |false |NO |NEVER |
| 25 |finishtype_id |uuid |YES | |NO |NEVER |
| 26 |excluded_from_anchor |boolean |NO |false |NO |NEVER |
| 27 |excluded_reason |text |YES | |NO |NEVER |
| 28 |excluded_by |uuid |YES | |NO |NEVER |
| 29 |excluded_at |timestamp with time zone |YES | |NO |NEVER |
| 30 |pricing_category |text |YES | |NO |NEVER |
| 31 |pricing_index |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17832_10_not_null |CHECK | | | |
| 2200_17832_11_not_null |CHECK | | | |
| 2200_17832_12_not_null |CHECK | | | |
| 2200_17832_13_not_null |CHECK | | | |
| 2200_17832_14_not_null |CHECK | | | |
| 2200_17832_17_not_null |CHECK | | | |
| 2200_17832_19_not_null |CHECK | | | |
| 2200_17832_1_not_null |CHECK | | | |
| 2200_17832_20_not_null |CHECK | | | |
| 2200_17832_21_not_null |CHECK | | | |
| 2200_17832_22_not_null |CHECK | | | |
| 2200_17832_23_not_null |CHECK | | | |
| 2200_17832_24_not_null |CHECK | | | |
| 2200_17832_26_not_null |CHECK | | | |
| 2200_17832_2_not_null |CHECK | | | |
| 2200_17832_3_not_null |CHECK | | | |
| 2200_17832_4_not_null |CHECK | | | |
| 2200_17832_5_not_null |CHECK | | | |
| 2200_17832_6_not_null |CHECK | | | |
| 2200_17832_7_not_null |CHECK | | | |
| 2200_17832_8_not_null |CHECK | | | |
| 2200_17832_9_not_null |CHECK | | | |
| lenses_brand_id_fkey |FOREIGN KEY |brand_id |public.brands |id |
| lenses_finishtype_id_fkey |FOREIGN KEY |finishtype_id |public.finishtypes |id |
| lenses_lenstype_id_fkey |FOREIGN KEY |lenstype_id |public.lenstypes |id |
| lenses_material_id_fkey |FOREIGN KEY |material_id |public.materials |id |
| lenses_mftype_id_fkey |FOREIGN KEY |mftype_id |public.mftypes |id |
| lenses_pkey |PRIMARY KEY |id |public.lenses |id |
| lenses_supplier_id_fkey |FOREIGN KEY |supplier_id |public.suppliers |id |

### Indexes

| Name |Definition |
| --- |--- |
| lenses_pkey |CREATE UNIQUE INDEX lenses_pkey ON public.lenses USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Anon can view website lenses |SELECT |anon |((show_on_website = true) AND (is_active = true)) | |
| Editors can delete lenses |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert lenses |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update lenses |UPDATE |public |has_edit_role(auth.uid()) | |
| Staff can select lenses |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_lenses_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.lenstypes

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |is_active |boolean |NO |true |NO |NEVER |
| 4 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |abbrev |text |NO |''::text |NO |NEVER |
| 7 |code |text |NO |''::text |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17781_1_not_null |CHECK | | | |
| 2200_17781_2_not_null |CHECK | | | |
| 2200_17781_3_not_null |CHECK | | | |
| 2200_17781_4_not_null |CHECK | | | |
| 2200_17781_5_not_null |CHECK | | | |
| 2200_17781_6_not_null |CHECK | | | |
| 2200_17781_7_not_null |CHECK | | | |
| lenstypes_name_key |UNIQUE |name |public.lenstypes |name |
| lenstypes_pkey |PRIMARY KEY |id |public.lenstypes |id |

### Indexes

| Name |Definition |
| --- |--- |
| lenstypes_name_key |CREATE UNIQUE INDEX lenstypes_name_key ON public.lenstypes USING btree (name) |
| lenstypes_pkey |CREATE UNIQUE INDEX lenstypes_pkey ON public.lenstypes USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Anon can view lenstypes |SELECT |anon |true | |
| Editors can delete lenstypes |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert lenstypes |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update lenstypes |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Role users can select lenstypes |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_lenstypes_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.live_data_gateway_agents

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |api_key_id |uuid |NO | |NO |NEVER |
| 2 |agent_name |text |NO |'OptiLens Local'::text |NO |NEVER |
| 3 |agent_version |text |YES | |NO |NEVER |
| 4 |capabilities |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 5 |connected_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |last_seen_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |last_error |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22255_1_not_null |CHECK | | | |
| 2200_22255_2_not_null |CHECK | | | |
| 2200_22255_4_not_null |CHECK | | | |
| 2200_22255_5_not_null |CHECK | | | |
| 2200_22255_6_not_null |CHECK | | | |
| live_data_gateway_agents_api_key_id_fkey |FOREIGN KEY |api_key_id |public.api_keys |id |
| live_data_gateway_agents_pkey |PRIMARY KEY |api_key_id |public.live_data_gateway_agents |api_key_id |

### Indexes

| Name |Definition |
| --- |--- |
| live_data_gateway_agents_pkey |CREATE UNIQUE INDEX live_data_gateway_agents_pkey ON public.live_data_gateway_agents USING btree (api_key_id) |

### RLS Policies

_None._

### Triggers

_None._

## public.live_data_gateway_requests

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |requested_by |uuid |NO | |NO |NEVER |
| 3 |website_customer_id |bigint(64,0) |NO | |NO |NEVER |
| 4 |source |text |NO | |NO |NEVER |
| 5 |operation |text |NO | |NO |NEVER |
| 6 |target |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 7 |arguments |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 8 |status |text |NO |'pending'::text |NO |NEVER |
| 9 |claimed_by |uuid |YES | |NO |NEVER |
| 10 |response_payload |jsonb |YES | |NO |NEVER |
| 11 |error_code |text |YES | |NO |NEVER |
| 12 |error_message |text |YES | |NO |NEVER |
| 13 |requested_at |timestamp with time zone |NO |now() |NO |NEVER |
| 14 |claimed_at |timestamp with time zone |YES | |NO |NEVER |
| 15 |completed_at |timestamp with time zone |YES | |NO |NEVER |
| 16 |consumed_at |timestamp with time zone |YES | |NO |NEVER |
| 17 |expires_at |timestamp with time zone |NO |(now() + '00:00:30'::interval) |NO |NEVER |
| 18 |purge_after |timestamp with time zone |NO |(now() + '00:05:00'::interval) |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22271_13_not_null |CHECK | | | |
| 2200_22271_17_not_null |CHECK | | | |
| 2200_22271_18_not_null |CHECK | | | |
| 2200_22271_1_not_null |CHECK | | | |
| 2200_22271_2_not_null |CHECK | | | |
| 2200_22271_3_not_null |CHECK | | | |
| 2200_22271_4_not_null |CHECK | | | |
| 2200_22271_5_not_null |CHECK | | | |
| 2200_22271_6_not_null |CHECK | | | |
| 2200_22271_7_not_null |CHECK | | | |
| 2200_22271_8_not_null |CHECK | | | |
| live_data_gateway_requests_claimed_by_fkey |FOREIGN KEY |claimed_by |public.api_keys |id |
| live_data_gateway_requests_pkey |PRIMARY KEY |id |public.live_data_gateway_requests |id |
| live_data_gateway_requests_requested_by_fkey |FOREIGN KEY |requested_by | | |
| live_data_gateway_requests_website_customer_id_fkey |FOREIGN KEY |website_customer_id |public.customers |id |

### Indexes

| Name |Definition |
| --- |--- |
| live_data_gateway_requests_pending_idx |CREATE INDEX live_data_gateway_requests_pending_idx ON public.live_data_gateway_requests USING btree (status, requested_at) WHERE (status = 'pending'::text) |
| live_data_gateway_requests_pkey |CREATE UNIQUE INDEX live_data_gateway_requests_pkey ON public.live_data_gateway_requests USING btree (id) |

### RLS Policies

_None._

### Triggers

_None._

## public.material_upgrades

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |upgrade_name |text |NO | |NO |NEVER |
| 3 |material |text |NO | |NO |NEVER |
| 4 |full_price_bbd |numeric |YES | |NO |NEVER |
| 5 |delta_bbd |numeric |YES | |NO |NEVER |
| 6 |notes |text |YES | |NO |NEVER |
| 7 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21935_1_not_null |CHECK | | | |
| 2200_21935_2_not_null |CHECK | | | |
| 2200_21935_3_not_null |CHECK | | | |
| material_upgrades_pkey |PRIMARY KEY |id |public.material_upgrades |id |

### Indexes

| Name |Definition |
| --- |--- |
| material_upgrades_pkey |CREATE UNIQUE INDEX material_upgrades_pkey ON public.material_upgrades USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete material_upgrades |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert material_upgrades |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update material_upgrades |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Role users can select material_upgrades |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.materials

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |is_active |boolean |NO |true |NO |NEVER |
| 4 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |abbrev |text |NO |''::text |NO |NEVER |
| 7 |code |text |NO |''::text |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17755_1_not_null |CHECK | | | |
| 2200_17755_2_not_null |CHECK | | | |
| 2200_17755_3_not_null |CHECK | | | |
| 2200_17755_4_not_null |CHECK | | | |
| 2200_17755_5_not_null |CHECK | | | |
| 2200_17755_6_not_null |CHECK | | | |
| 2200_17755_7_not_null |CHECK | | | |
| materials_name_key |UNIQUE |name |public.materials |name |
| materials_pkey |PRIMARY KEY |id |public.materials |id |

### Indexes

| Name |Definition |
| --- |--- |
| materials_name_key |CREATE UNIQUE INDEX materials_name_key ON public.materials USING btree (name) |
| materials_pkey |CREATE UNIQUE INDEX materials_pkey ON public.materials USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Anon can view materials |SELECT |anon |true | |
| Editors can delete materials |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert materials |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update materials |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Role users can select materials |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_materials_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.matrix_allocations

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |pricelist_version_id |integer(32,0) |YES | |NO |NEVER |
| 3 |treatment_type |text |NO | |NO |NEVER |
| 4 |category |text |NO | |NO |NEVER |
| 5 |material_index |text |NO | |NO |NEVER |
| 6 |lens_id |uuid |YES | |NO |NEVER |
| 7 |allocated_price_bbd |numeric |YES | |NO |NEVER |
| 8 |is_active |boolean |YES |true |NO |NEVER |
| 9 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21944_1_not_null |CHECK | | | |
| 2200_21944_3_not_null |CHECK | | | |
| 2200_21944_4_not_null |CHECK | | | |
| 2200_21944_5_not_null |CHECK | | | |
| matrix_allocations_lens_id_fkey |FOREIGN KEY |lens_id |public.lenses |id |
| matrix_allocations_pkey |PRIMARY KEY |id |public.matrix_allocations |id |
| matrix_allocations_pricelist_version_id_category_material_i_key |UNIQUE |pricelist_version_id, pricelist_version_id, pricelist_version_id, pricelist_version_id, category, category, category, category, material_index, material_index, material_index, material_index, treatment_type, treatment_type, treatment_type, treatment_type |public.matrix_allocations |category, material_index, pricelist_version_id, treatment_type, treatment_type, category, material_index, pricelist_version_id, category, material_index, pricelist_version_id, treatment_type, category, material_index, pricelist_version_id, treatment_type |
| matrix_allocations_pricelist_version_id_fkey |FOREIGN KEY |pricelist_version_id |public.pricelist_versions |id |

### Indexes

| Name |Definition |
| --- |--- |
| matrix_allocations_pkey |CREATE UNIQUE INDEX matrix_allocations_pkey ON public.matrix_allocations USING btree (id) |
| matrix_allocations_pricelist_version_id_category_material_i_key |CREATE UNIQUE INDEX matrix_allocations_pricelist_version_id_category_material_i_key ON public.matrix_allocations USING btree (pricelist_version_id, category, material_index, treatment_type) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete matrix_allocations |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Role users can select matrix_allocations |SELECT |authenticated |has_any_role(auth.uid()) | |
| Staff manage pricing matrix |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.mftypes

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |is_active |boolean |NO |true |NO |NEVER |
| 4 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |abbrev |text |NO |''::text |NO |NEVER |
| 7 |code |text |NO |''::text |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17768_1_not_null |CHECK | | | |
| 2200_17768_2_not_null |CHECK | | | |
| 2200_17768_3_not_null |CHECK | | | |
| 2200_17768_4_not_null |CHECK | | | |
| 2200_17768_5_not_null |CHECK | | | |
| 2200_17768_6_not_null |CHECK | | | |
| 2200_17768_7_not_null |CHECK | | | |
| mftypes_name_key |UNIQUE |name |public.mftypes |name |
| mftypes_pkey |PRIMARY KEY |id |public.mftypes |id |

### Indexes

| Name |Definition |
| --- |--- |
| mftypes_name_key |CREATE UNIQUE INDEX mftypes_name_key ON public.mftypes USING btree (name) |
| mftypes_pkey |CREATE UNIQUE INDEX mftypes_pkey ON public.mftypes USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Anon can view mftypes |SELECT |anon |true | |
| Editors can delete mftypes |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert mftypes |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update mftypes |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Role users can select mftypes |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_mftypes_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.moonshot_backups

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |source_table |text |NO | |NO |NEVER |
| 3 |source_id |uuid |YES | |NO |NEVER |
| 4 |operation |text |NO | |NO |NEVER |
| 5 |snapshot |jsonb |NO | |NO |NEVER |
| 6 |changed_by |uuid |YES | |NO |NEVER |
| 7 |changed_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19969_1_not_null |CHECK | | | |
| 2200_19969_2_not_null |CHECK | | | |
| 2200_19969_4_not_null |CHECK | | | |
| 2200_19969_5_not_null |CHECK | | | |
| 2200_19969_7_not_null |CHECK | | | |
| moonshot_backups_operation_check |CHECK | |public.moonshot_backups |operation |
| moonshot_backups_pkey |PRIMARY KEY |id |public.moonshot_backups |id |

### Indexes

| Name |Definition |
| --- |--- |
| moonshot_backups_pkey |CREATE UNIQUE INDEX moonshot_backups_pkey ON public.moonshot_backups USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can read moonshot backups |SELECT |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert moonshot backups |INSERT |public | |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.moonshot_business_plan

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |payload |jsonb |NO | |NO |NEVER |
| 3 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 4 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19959_1_not_null |CHECK | | | |
| 2200_19959_2_not_null |CHECK | | | |
| 2200_19959_3_not_null |CHECK | | | |
| 2200_19959_4_not_null |CHECK | | | |
| moonshot_business_plan_pkey |PRIMARY KEY |id |public.moonshot_business_plan |id |

### Indexes

| Name |Definition |
| --- |--- |
| moonshot_business_plan_pkey |CREATE UNIQUE INDEX moonshot_business_plan_pkey ON public.moonshot_business_plan USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can write moonshot business plan |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can read moonshot business plan |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| moonshot_business_plan_sanitize_payload |BEFORE |UPDATE |ROW |EXECUTE FUNCTION moonshot_sanitize_business_plan_payload() |
| moonshot_business_plan_sanitize_payload |BEFORE |INSERT |ROW |EXECUTE FUNCTION moonshot_sanitize_business_plan_payload() |
| moonshot_business_plan_touch_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION moonshot_touch_updated_at() |
| moonshot_business_plan_write_backup |AFTER |UPDATE |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_business_plan_write_backup |AFTER |INSERT |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_business_plan_write_backup |AFTER |DELETE |ROW |EXECUTE FUNCTION moonshot_write_backup() |

## public.moonshot_issues

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |title |text |NO | |NO |NEVER |
| 3 |owner_name |text |NO | |NO |NEVER |
| 4 |priority |text |NO | |NO |NEVER |
| 5 |status |text |NO | |NO |NEVER |
| 6 |identified |text |NO |''::text |NO |NEVER |
| 7 |discussed |text |NO |''::text |NO |NEVER |
| 8 |solved |text |NO |''::text |NO |NEVER |
| 9 |meeting_id |uuid |YES | |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19939_10_not_null |CHECK | | | |
| 2200_19939_11_not_null |CHECK | | | |
| 2200_19939_1_not_null |CHECK | | | |
| 2200_19939_2_not_null |CHECK | | | |
| 2200_19939_3_not_null |CHECK | | | |
| 2200_19939_4_not_null |CHECK | | | |
| 2200_19939_5_not_null |CHECK | | | |
| 2200_19939_6_not_null |CHECK | | | |
| 2200_19939_7_not_null |CHECK | | | |
| 2200_19939_8_not_null |CHECK | | | |
| moonshot_issues_meeting_id_fkey |FOREIGN KEY |meeting_id |public.moonshot_meetings |id |
| moonshot_issues_pkey |PRIMARY KEY |id |public.moonshot_issues |id |
| moonshot_issues_priority_check |CHECK | |public.moonshot_issues |priority |
| moonshot_issues_status_check |CHECK | |public.moonshot_issues |status |

### Indexes

| Name |Definition |
| --- |--- |
| moonshot_issues_pkey |CREATE UNIQUE INDEX moonshot_issues_pkey ON public.moonshot_issues USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can write moonshot issues |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can read moonshot issues |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| moonshot_issues_touch_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION moonshot_touch_updated_at() |
| moonshot_issues_write_backup |AFTER |DELETE |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_issues_write_backup |AFTER |INSERT |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_issues_write_backup |AFTER |UPDATE |ROW |EXECUTE FUNCTION moonshot_write_backup() |

## public.moonshot_meeting_agenda_sections

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |meeting_id |uuid |NO | |NO |NEVER |
| 3 |title |text |NO | |NO |NEVER |
| 4 |minutes |integer(32,0) |NO |5 |NO |NEVER |
| 5 |section_order |integer(32,0) |NO |0 |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19855_1_not_null |CHECK | | | |
| 2200_19855_2_not_null |CHECK | | | |
| 2200_19855_3_not_null |CHECK | | | |
| 2200_19855_4_not_null |CHECK | | | |
| 2200_19855_5_not_null |CHECK | | | |
| 2200_19855_6_not_null |CHECK | | | |
| 2200_19855_7_not_null |CHECK | | | |
| moonshot_meeting_agenda_sections_meeting_id_fkey |FOREIGN KEY |meeting_id |public.moonshot_meetings |id |
| moonshot_meeting_agenda_sections_pkey |PRIMARY KEY |id |public.moonshot_meeting_agenda_sections |id |

### Indexes

| Name |Definition |
| --- |--- |
| moonshot_meeting_agenda_sections_pkey |CREATE UNIQUE INDEX moonshot_meeting_agenda_sections_pkey ON public.moonshot_meeting_agenda_sections USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can write moonshot agenda |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can read moonshot agenda |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| moonshot_agenda_touch_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION moonshot_touch_updated_at() |
| moonshot_agenda_write_backup |AFTER |DELETE |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_agenda_write_backup |AFTER |INSERT |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_agenda_write_backup |AFTER |UPDATE |ROW |EXECUTE FUNCTION moonshot_write_backup() |

## public.moonshot_meetings

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |title |text |NO | |NO |NEVER |
| 3 |owner_name |text |NO | |NO |NEVER |
| 4 |meeting_date |date |NO | |NO |NEVER |
| 5 |status |text |NO | |NO |NEVER |
| 6 |notes |text |NO |''::text |NO |NEVER |
| 7 |frequency |text |NO | |NO |NEVER |
| 8 |duration_minutes |integer(32,0) |NO |90 |NO |NEVER |
| 9 |attendee_ids |jsonb |NO |'[]'::jsonb |NO |NEVER |
| 10 |check_in_prompt |text |NO |'Share good news...'::text |NO |NEVER |
| 11 |check_in_response |text |NO |''::text |NO |NEVER |
| 12 |summary |text |NO |''::text |NO |NEVER |
| 13 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 14 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19837_10_not_null |CHECK | | | |
| 2200_19837_11_not_null |CHECK | | | |
| 2200_19837_12_not_null |CHECK | | | |
| 2200_19837_13_not_null |CHECK | | | |
| 2200_19837_14_not_null |CHECK | | | |
| 2200_19837_1_not_null |CHECK | | | |
| 2200_19837_2_not_null |CHECK | | | |
| 2200_19837_3_not_null |CHECK | | | |
| 2200_19837_4_not_null |CHECK | | | |
| 2200_19837_5_not_null |CHECK | | | |
| 2200_19837_6_not_null |CHECK | | | |
| 2200_19837_7_not_null |CHECK | | | |
| 2200_19837_8_not_null |CHECK | | | |
| 2200_19837_9_not_null |CHECK | | | |
| moonshot_meetings_frequency_check |CHECK | |public.moonshot_meetings |frequency |
| moonshot_meetings_pkey |PRIMARY KEY |id |public.moonshot_meetings |id |
| moonshot_meetings_status_check |CHECK | |public.moonshot_meetings |status |

### Indexes

| Name |Definition |
| --- |--- |
| moonshot_meetings_pkey |CREATE UNIQUE INDEX moonshot_meetings_pkey ON public.moonshot_meetings USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can write moonshot meetings |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can read moonshot meetings |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| moonshot_meetings_touch_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION moonshot_touch_updated_at() |
| moonshot_meetings_write_backup |AFTER |DELETE |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_meetings_write_backup |AFTER |INSERT |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_meetings_write_backup |AFTER |UPDATE |ROW |EXECUTE FUNCTION moonshot_write_backup() |

## public.moonshot_metric_points

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |metric_id |uuid |NO | |NO |NEVER |
| 3 |point_date |date |NO | |NO |NEVER |
| 4 |point_value |numeric |NO |0 |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19888_1_not_null |CHECK | | | |
| 2200_19888_2_not_null |CHECK | | | |
| 2200_19888_3_not_null |CHECK | | | |
| 2200_19888_4_not_null |CHECK | | | |
| 2200_19888_5_not_null |CHECK | | | |
| moonshot_metric_points_metric_id_fkey |FOREIGN KEY |metric_id |public.moonshot_metrics |id |
| moonshot_metric_points_metric_id_point_date_key |UNIQUE |metric_id, metric_id, point_date, point_date |public.moonshot_metric_points |metric_id, point_date, metric_id, point_date |
| moonshot_metric_points_pkey |PRIMARY KEY |id |public.moonshot_metric_points |id |

### Indexes

| Name |Definition |
| --- |--- |
| moonshot_metric_points_metric_id_point_date_key |CREATE UNIQUE INDEX moonshot_metric_points_metric_id_point_date_key ON public.moonshot_metric_points USING btree (metric_id, point_date) |
| moonshot_metric_points_pkey |CREATE UNIQUE INDEX moonshot_metric_points_pkey ON public.moonshot_metric_points USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can write moonshot metric points |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can read moonshot metric points |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| moonshot_metric_points_write_backup |AFTER |INSERT |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_metric_points_write_backup |AFTER |DELETE |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_metric_points_write_backup |AFTER |UPDATE |ROW |EXECUTE FUNCTION moonshot_write_backup() |

## public.moonshot_metrics

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |owner_name |text |NO | |NO |NEVER |
| 3 |metric_name |text |NO | |NO |NEVER |
| 4 |goal_value |numeric |NO |0 |NO |NEVER |
| 5 |actual_value |numeric |NO |0 |NO |NEVER |
| 6 |trend |text |NO |'flat'::text |NO |NEVER |
| 7 |frequency |text |NO | |NO |NEVER |
| 8 |unit |text |NO | |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 10 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19872_10_not_null |CHECK | | | |
| 2200_19872_1_not_null |CHECK | | | |
| 2200_19872_2_not_null |CHECK | | | |
| 2200_19872_3_not_null |CHECK | | | |
| 2200_19872_4_not_null |CHECK | | | |
| 2200_19872_5_not_null |CHECK | | | |
| 2200_19872_6_not_null |CHECK | | | |
| 2200_19872_7_not_null |CHECK | | | |
| 2200_19872_8_not_null |CHECK | | | |
| 2200_19872_9_not_null |CHECK | | | |
| moonshot_metrics_frequency_check |CHECK | |public.moonshot_metrics |frequency |
| moonshot_metrics_pkey |PRIMARY KEY |id |public.moonshot_metrics |id |
| moonshot_metrics_trend_check |CHECK | |public.moonshot_metrics |trend |
| moonshot_metrics_unit_check |CHECK | |public.moonshot_metrics |unit |

### Indexes

| Name |Definition |
| --- |--- |
| moonshot_metrics_pkey |CREATE UNIQUE INDEX moonshot_metrics_pkey ON public.moonshot_metrics USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can write moonshot metrics |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can read moonshot metrics |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| moonshot_metrics_touch_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION moonshot_touch_updated_at() |
| moonshot_metrics_write_backup |AFTER |UPDATE |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_metrics_write_backup |AFTER |INSERT |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_metrics_write_backup |AFTER |DELETE |ROW |EXECUTE FUNCTION moonshot_write_backup() |

## public.moonshot_rocks

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |title |text |NO | |NO |NEVER |
| 3 |owner_name |text |NO | |NO |NEVER |
| 4 |due_date |date |NO | |NO |NEVER |
| 5 |status |text |NO | |NO |NEVER |
| 6 |percent_complete |integer(32,0) |NO |0 |NO |NEVER |
| 7 |notes |text |NO |''::text |NO |NEVER |
| 8 |meeting_id |uuid |YES | |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 10 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19905_10_not_null |CHECK | | | |
| 2200_19905_1_not_null |CHECK | | | |
| 2200_19905_2_not_null |CHECK | | | |
| 2200_19905_3_not_null |CHECK | | | |
| 2200_19905_4_not_null |CHECK | | | |
| 2200_19905_5_not_null |CHECK | | | |
| 2200_19905_6_not_null |CHECK | | | |
| 2200_19905_7_not_null |CHECK | | | |
| 2200_19905_9_not_null |CHECK | | | |
| moonshot_rocks_meeting_id_fkey |FOREIGN KEY |meeting_id |public.moonshot_meetings |id |
| moonshot_rocks_pkey |PRIMARY KEY |id |public.moonshot_rocks |id |
| moonshot_rocks_status_check |CHECK | |public.moonshot_rocks |status |

### Indexes

| Name |Definition |
| --- |--- |
| moonshot_rocks_pkey |CREATE UNIQUE INDEX moonshot_rocks_pkey ON public.moonshot_rocks USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can write moonshot rocks |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can read moonshot rocks |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| moonshot_rocks_touch_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION moonshot_touch_updated_at() |
| moonshot_rocks_write_backup |AFTER |INSERT |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_rocks_write_backup |AFTER |DELETE |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_rocks_write_backup |AFTER |UPDATE |ROW |EXECUTE FUNCTION moonshot_write_backup() |

## public.moonshot_todos

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |title |text |NO | |NO |NEVER |
| 3 |owner_name |text |NO | |NO |NEVER |
| 4 |due_date |date |NO | |NO |NEVER |
| 5 |completed |boolean |NO |false |NO |NEVER |
| 6 |meeting_id |uuid |YES | |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_19923_1_not_null |CHECK | | | |
| 2200_19923_2_not_null |CHECK | | | |
| 2200_19923_3_not_null |CHECK | | | |
| 2200_19923_4_not_null |CHECK | | | |
| 2200_19923_5_not_null |CHECK | | | |
| 2200_19923_7_not_null |CHECK | | | |
| 2200_19923_8_not_null |CHECK | | | |
| moonshot_todos_meeting_id_fkey |FOREIGN KEY |meeting_id |public.moonshot_meetings |id |
| moonshot_todos_pkey |PRIMARY KEY |id |public.moonshot_todos |id |

### Indexes

| Name |Definition |
| --- |--- |
| moonshot_todos_pkey |CREATE UNIQUE INDEX moonshot_todos_pkey ON public.moonshot_todos USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can write moonshot todos |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can read moonshot todos |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| moonshot_todos_touch_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION moonshot_touch_updated_at() |
| moonshot_todos_write_backup |AFTER |INSERT |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_todos_write_backup |AFTER |UPDATE |ROW |EXECUTE FUNCTION moonshot_write_backup() |
| moonshot_todos_write_backup |AFTER |DELETE |ROW |EXECUTE FUNCTION moonshot_write_backup() |

## public.notes

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |contact_id |uuid |YES | |NO |NEVER |
| 3 |opportunity_id |uuid |YES | |NO |NEVER |
| 4 |source |text |NO |'manual'::text |NO |NEVER |
| 5 |content |text |NO | |NO |NEVER |
| 6 |created_by |uuid |YES | |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 9 |is_ai_generated |boolean |YES |false |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18834_1_not_null |CHECK | | | |
| 2200_18834_4_not_null |CHECK | | | |
| 2200_18834_5_not_null |CHECK | | | |
| 2200_18834_7_not_null |CHECK | | | |
| 2200_18834_8_not_null |CHECK | | | |
| notes_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| notes_opportunity_id_fkey |FOREIGN KEY |opportunity_id |public.opportunities |id |
| notes_pkey |PRIMARY KEY |id |public.notes |id |

### Indexes

| Name |Definition |
| --- |--- |
| notes_contact_id_idx |CREATE INDEX notes_contact_id_idx ON public.notes USING btree (contact_id) |
| notes_opportunity_id_idx |CREATE INDEX notes_opportunity_id_idx ON public.notes USING btree (opportunity_id) |
| notes_pkey |CREATE UNIQUE INDEX notes_pkey ON public.notes USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete notes |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert notes |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update notes |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Staff can view notes |SELECT |authenticated |has_staff_role(auth.uid()) | |

### Triggers

_None._

## public.opportunities

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |contact_id |uuid |NO | |NO |NEVER |
| 3 |title |text |NO | |NO |NEVER |
| 4 |stage |text |NO |'new'::text |NO |NEVER |
| 5 |country |text |YES | |NO |NEVER |
| 6 |volume_tier |text |YES | |NO |NEVER |
| 7 |selected_product_ids |ARRAY |YES |'{}'::uuid[] |NO |NEVER |
| 8 |estimated_value |numeric |YES | |NO |NEVER |
| 9 |close_probability |integer(32,0) |YES | |NO |NEVER |
| 10 |owner_user_id |uuid |YES | |NO |NEVER |
| 11 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 12 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 13 |status |text |YES | |NO |NEVER |
| 14 |expected_value |numeric |YES | |NO |NEVER |
| 15 |close_date |date |YES | |NO |NEVER |
| 16 |source |text |YES | |NO |NEVER |
| 17 |audit_pdf_url |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18765_11_not_null |CHECK | | | |
| 2200_18765_12_not_null |CHECK | | | |
| 2200_18765_1_not_null |CHECK | | | |
| 2200_18765_2_not_null |CHECK | | | |
| 2200_18765_3_not_null |CHECK | | | |
| 2200_18765_4_not_null |CHECK | | | |
| opportunities_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| opportunities_pkey |PRIMARY KEY |id |public.opportunities |id |

### Indexes

| Name |Definition |
| --- |--- |
| opportunities_contact_id_idx |CREATE INDEX opportunities_contact_id_idx ON public.opportunities USING btree (contact_id) |
| opportunities_contact_id_title_key |CREATE UNIQUE INDEX opportunities_contact_id_title_key ON public.opportunities USING btree (contact_id, title) |
| opportunities_created_at_idx |CREATE INDEX opportunities_created_at_idx ON public.opportunities USING btree (created_at) |
| opportunities_pkey |CREATE UNIQUE INDEX opportunities_pkey ON public.opportunities USING btree (id) |
| opportunities_stage_created_at_idx |CREATE INDEX opportunities_stage_created_at_idx ON public.opportunities USING btree (stage, created_at) |
| opportunities_stage_idx |CREATE INDEX opportunities_stage_idx ON public.opportunities USING btree (stage) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete opportunities |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert opportunities |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update opportunities |UPDATE |public |has_edit_role(auth.uid()) | |
| Staff can view opportunities |SELECT |authenticated |has_staff_role(auth.uid()) | |
| opportunities_select_authenticated_analytics |SELECT |authenticated |true | |

### Triggers

_None._

## public.opportunity_attachments

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |opportunity_id |uuid |NO | |NO |NEVER |
| 3 |attachment_type |text |NO | |NO |NEVER |
| 4 |payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 5 |created_by |uuid |YES | |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18872_1_not_null |CHECK | | | |
| 2200_18872_2_not_null |CHECK | | | |
| 2200_18872_3_not_null |CHECK | | | |
| 2200_18872_4_not_null |CHECK | | | |
| 2200_18872_6_not_null |CHECK | | | |
| opportunity_attachments_opportunity_id_fkey |FOREIGN KEY |opportunity_id |public.opportunities |id |
| opportunity_attachments_pkey |PRIMARY KEY |id |public.opportunity_attachments |id |

### Indexes

| Name |Definition |
| --- |--- |
| opportunity_attachments_opportunity_id_idx |CREATE INDEX opportunity_attachments_opportunity_id_idx ON public.opportunity_attachments USING btree (opportunity_id) |
| opportunity_attachments_pkey |CREATE UNIQUE INDEX opportunity_attachments_pkey ON public.opportunity_attachments USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| opportunity_attachments_select_auth |SELECT |authenticated |true | |
| opportunity_attachments_write_auth |ALL |authenticated |true |true |

### Triggers

_None._

## public.order_activity

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |innovations_customer_id |bigint(64,0) |NO | |NO |NEVER |
| 2 |contact_id |uuid |YES | |NO |NEVER |
| 3 |last_order_date |date |YES | |NO |NEVER |
| 4 |orders_last_7_days |integer(32,0) |NO |0 |NO |NEVER |
| 5 |orders_last_30_days |integer(32,0) |NO |0 |NO |NEVER |
| 6 |orders_last_90_days |integer(32,0) |NO |0 |NO |NEVER |
| 7 |avg_gap_days |numeric |YES | |NO |NEVER |
| 8 |synced_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22400_1_not_null |CHECK | | | |
| 2200_22400_4_not_null |CHECK | | | |
| 2200_22400_5_not_null |CHECK | | | |
| 2200_22400_6_not_null |CHECK | | | |
| 2200_22400_8_not_null |CHECK | | | |
| order_activity_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| order_activity_pkey |PRIMARY KEY |innovations_customer_id |public.order_activity |innovations_customer_id |

### Indexes

| Name |Definition |
| --- |--- |
| order_activity_pkey |CREATE UNIQUE INDEX order_activity_pkey ON public.order_activity USING btree (innovations_customer_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can manage order activity |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can select order activity |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.order_items

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |order_id |uuid |NO | |NO |NEVER |
| 3 |product_id |integer(32,0) |NO | |NO |NEVER |
| 4 |product_name |text |NO | |NO |NEVER |
| 5 |product_price |numeric |NO | |NO |NEVER |
| 6 |quantity |integer(32,0) |NO |1 |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |product_type |text |NO |'lens'::text |NO |NEVER |
| 9 |variant_id |uuid |YES | |NO |NEVER |
| 10 |variant_label |text |YES | |NO |NEVER |
| 11 |variant_sku |text |YES | |NO |NEVER |
| 12 |variant_opc_code |text |YES | |NO |NEVER |
| 13 |variant_metadata |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 14 |unit_price_snapshot |numeric(12,2) |NO |0 |NO |NEVER |
| 15 |sku |text |YES | |NO |NEVER |
| 16 |opc_code |text |YES | |NO |NEVER |
| 17 |variant_snapshot |jsonb |YES |'{}'::jsonb |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17684_13_not_null |CHECK | | | |
| 2200_17684_14_not_null |CHECK | | | |
| 2200_17684_1_not_null |CHECK | | | |
| 2200_17684_2_not_null |CHECK | | | |
| 2200_17684_3_not_null |CHECK | | | |
| 2200_17684_4_not_null |CHECK | | | |
| 2200_17684_5_not_null |CHECK | | | |
| 2200_17684_6_not_null |CHECK | | | |
| 2200_17684_7_not_null |CHECK | | | |
| 2200_17684_8_not_null |CHECK | | | |
| order_items_order_id_fkey |FOREIGN KEY |order_id |public.orders |id |
| order_items_pkey |PRIMARY KEY |id |public.order_items |id |
| order_items_variant_id_fkey |FOREIGN KEY |variant_id |public.store_product_variants |id |

### Indexes

| Name |Definition |
| --- |--- |
| order_items_pkey |CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can view all order items |SELECT |public |has_role(auth.uid(), 'admin'::app_role) | |
| Users can insert their own order items |INSERT |public | |(EXISTS ( SELECT 1<br>   FROM orders<br>  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))) |
| Users can view their own order items |SELECT |public |(EXISTS ( SELECT 1<br>   FROM orders<br>  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))) | |

### Triggers

_None._

## public.order_payment_events

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |payment_id |uuid |NO | |NO |NEVER |
| 3 |event_type |text |NO | |NO |NEVER |
| 4 |payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20378_1_not_null |CHECK | | | |
| 2200_20378_2_not_null |CHECK | | | |
| 2200_20378_3_not_null |CHECK | | | |
| 2200_20378_4_not_null |CHECK | | | |
| 2200_20378_5_not_null |CHECK | | | |
| order_payment_events_payment_id_fkey |FOREIGN KEY |payment_id |public.order_payments |id |
| order_payment_events_pkey |PRIMARY KEY |id |public.order_payment_events |id |

### Indexes

| Name |Definition |
| --- |--- |
| order_payment_events_payment_id_idx |CREATE INDEX order_payment_events_payment_id_idx ON public.order_payment_events USING btree (payment_id, created_at DESC) |
| order_payment_events_pkey |CREATE UNIQUE INDEX order_payment_events_pkey ON public.order_payment_events USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Users can insert their own payment events |INSERT |authenticated | |(EXISTS ( SELECT 1<br>   FROM order_payments p<br>  WHERE ((p.id = order_payment_events.payment_id) AND ((p.user_id = auth.uid()) OR has_edit_role(auth.uid()))))) |
| Users can view their own payment events |SELECT |authenticated |(EXISTS ( SELECT 1<br>   FROM order_payments p<br>  WHERE ((p.id = order_payment_events.payment_id) AND ((p.user_id = auth.uid()) OR has_edit_role(auth.uid()))))) | |

### Triggers

_None._

## public.order_payments

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |order_id |uuid |NO | |NO |NEVER |
| 3 |user_id |uuid |NO | |NO |NEVER |
| 4 |payment_method_id |uuid |YES | |NO |NEVER |
| 5 |amount |numeric |NO |0 |NO |NEVER |
| 6 |status |text |NO |'settled'::text |NO |NEVER |
| 7 |provider |text |NO |'demo'::text |NO |NEVER |
| 8 |payment_token |text |YES | |NO |NEVER |
| 9 |card_brand |text |YES | |NO |NEVER |
| 10 |card_last4 |text |YES | |NO |NEVER |
| 11 |metadata |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 12 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 13 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 14 |gateway_oid |text |YES | |NO |NEVER |
| 15 |gateway_response_code |text |YES | |NO |NEVER |
| 16 |gateway_fail_rc |text |YES | |NO |NEVER |
| 17 |gateway_hosteddataid |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20343_11_not_null |CHECK | | | |
| 2200_20343_12_not_null |CHECK | | | |
| 2200_20343_13_not_null |CHECK | | | |
| 2200_20343_1_not_null |CHECK | | | |
| 2200_20343_2_not_null |CHECK | | | |
| 2200_20343_3_not_null |CHECK | | | |
| 2200_20343_5_not_null |CHECK | | | |
| 2200_20343_6_not_null |CHECK | | | |
| 2200_20343_7_not_null |CHECK | | | |
| order_payments_order_id_fkey |FOREIGN KEY |order_id |public.orders |id |
| order_payments_payment_method_id_fkey |FOREIGN KEY |payment_method_id |public.customer_payment_methods |id |
| order_payments_pkey |PRIMARY KEY |id |public.order_payments |id |
| order_payments_provider_check |CHECK | |public.order_payments |provider |
| order_payments_status_check |CHECK | |public.order_payments |status |
| order_payments_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| order_payments_gateway_oid_idx |CREATE INDEX order_payments_gateway_oid_idx ON public.order_payments USING btree (gateway_oid) WHERE (gateway_oid IS NOT NULL) |
| order_payments_order_id_idx |CREATE INDEX order_payments_order_id_idx ON public.order_payments USING btree (order_id) |
| order_payments_pkey |CREATE UNIQUE INDEX order_payments_pkey ON public.order_payments USING btree (id) |
| order_payments_user_id_idx |CREATE INDEX order_payments_user_id_idx ON public.order_payments USING btree (user_id, created_at DESC) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Users can insert their own order payments |INSERT |authenticated | |((auth.uid() = user_id) OR has_edit_role(auth.uid())) |
| Users can update their own order payments |UPDATE |authenticated |((auth.uid() = user_id) OR has_edit_role(auth.uid())) |((auth.uid() = user_id) OR has_edit_role(auth.uid())) |
| Users can view their own order payments |SELECT |authenticated |((auth.uid() = user_id) OR has_edit_role(auth.uid())) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_order_payments_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.orders

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |total_amount |numeric |NO | |NO |NEVER |
| 4 |status |text |NO |'completed'::text |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |customer_name |text |YES | |NO |NEVER |
| 8 |contact_email |text |YES | |NO |NEVER |
| 9 |contact_phone |text |YES | |NO |NEVER |
| 10 |shipping_address |jsonb |YES | |NO |NEVER |
| 11 |billing_address |jsonb |YES | |NO |NEVER |
| 12 |checkout_method |text |NO |'manual'::text |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17673_12_not_null |CHECK | | | |
| 2200_17673_1_not_null |CHECK | | | |
| 2200_17673_2_not_null |CHECK | | | |
| 2200_17673_3_not_null |CHECK | | | |
| 2200_17673_4_not_null |CHECK | | | |
| 2200_17673_5_not_null |CHECK | | | |
| 2200_17673_6_not_null |CHECK | | | |
| orders_pkey |PRIMARY KEY |id |public.orders |id |

### Indexes

| Name |Definition |
| --- |--- |
| orders_pkey |CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can view all orders |SELECT |authenticated |has_edit_role(auth.uid()) | |
| Users can create their own orders |INSERT |public | |(auth.uid() = user_id) |
| Users can view their own orders |SELECT |public |(auth.uid() = user_id) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_orders_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.outreach_outbox

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |contact_id |uuid |NO | |NO |NEVER |
| 3 |enrollment_id |uuid |YES | |NO |NEVER |
| 4 |channel |text |NO | |NO |NEVER |
| 5 |subject |text |YES | |NO |NEVER |
| 6 |body |text |YES | |NO |NEVER |
| 7 |attachments |jsonb |NO |'[]'::jsonb |NO |NEVER |
| 8 |status |text |NO |'draft'::text |NO |NEVER |
| 9 |generated_by |text |NO |'ai'::text |NO |NEVER |
| 10 |error |text |YES | |NO |NEVER |
| 11 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 12 |approved_at |timestamp with time zone |YES | |NO |NEVER |
| 13 |sent_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22416_11_not_null |CHECK | | | |
| 2200_22416_1_not_null |CHECK | | | |
| 2200_22416_2_not_null |CHECK | | | |
| 2200_22416_4_not_null |CHECK | | | |
| 2200_22416_7_not_null |CHECK | | | |
| 2200_22416_8_not_null |CHECK | | | |
| 2200_22416_9_not_null |CHECK | | | |
| outreach_outbox_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| outreach_outbox_enrollment_id_fkey |FOREIGN KEY |enrollment_id |public.cadence_enrollments |id |
| outreach_outbox_pkey |PRIMARY KEY |id |public.outreach_outbox |id |

### Indexes

| Name |Definition |
| --- |--- |
| outreach_outbox_pkey |CREATE UNIQUE INDEX outreach_outbox_pkey ON public.outreach_outbox USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Role users can select outreach outbox |SELECT |authenticated |has_any_role(auth.uid()) | |
| Staff manage outreach outbox |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.payment_gateway_secrets

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |settings_id |uuid |NO | |NO |NEVER |
| 2 |encrypted_secret |bytea |NO | |NO |NEVER |
| 3 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21461_1_not_null |CHECK | | | |
| 2200_21461_2_not_null |CHECK | | | |
| 2200_21461_3_not_null |CHECK | | | |
| payment_gateway_secrets_pkey |PRIMARY KEY |settings_id |public.payment_gateway_secrets |settings_id |
| payment_gateway_secrets_settings_id_fkey |FOREIGN KEY |settings_id |public.payment_gateway_settings |id |

### Indexes

| Name |Definition |
| --- |--- |
| payment_gateway_secrets_pkey |CREATE UNIQUE INDEX payment_gateway_secrets_pkey ON public.payment_gateway_secrets USING btree (settings_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| No direct access to payment_gateway_secrets |ALL |public |false |false |

### Triggers

_None._

## public.payment_gateway_settings

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |tenant_key |text |NO |'default'::text |NO |NEVER |
| 3 |provider |text |NO |'scotia'::text |NO |NEVER |
| 4 |store_id |text |YES | |NO |NEVER |
| 5 |environment |text |NO |'test'::text |NO |NEVER |
| 6 |currency |text |NO |'840'::text |NO |NEVER |
| 7 |timezone |text |NO |'America/Barbados'::text |NO |NEVER |
| 8 |enabled |boolean |NO |false |NO |NEVER |
| 9 |has_secret |boolean |NO |false |NO |NEVER |
| 10 |status |text |NO |'not_configured'::text |NO |NEVER |
| 11 |last_tested_at |timestamp with time zone |YES | |NO |NEVER |
| 12 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 13 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21436_10_not_null |CHECK | | | |
| 2200_21436_12_not_null |CHECK | | | |
| 2200_21436_13_not_null |CHECK | | | |
| 2200_21436_1_not_null |CHECK | | | |
| 2200_21436_2_not_null |CHECK | | | |
| 2200_21436_3_not_null |CHECK | | | |
| 2200_21436_5_not_null |CHECK | | | |
| 2200_21436_6_not_null |CHECK | | | |
| 2200_21436_7_not_null |CHECK | | | |
| 2200_21436_8_not_null |CHECK | | | |
| 2200_21436_9_not_null |CHECK | | | |
| payment_gateway_settings_env_check |CHECK | |public.payment_gateway_settings |environment |
| payment_gateway_settings_pkey |PRIMARY KEY |id |public.payment_gateway_settings |id |
| payment_gateway_settings_status_check |CHECK | |public.payment_gateway_settings |status |
| payment_gateway_settings_tenant_key_key |UNIQUE |tenant_key |public.payment_gateway_settings |tenant_key |

### Indexes

| Name |Definition |
| --- |--- |
| payment_gateway_settings_pkey |CREATE UNIQUE INDEX payment_gateway_settings_pkey ON public.payment_gateway_settings USING btree (id) |
| payment_gateway_settings_tenant_key_key |CREATE UNIQUE INDEX payment_gateway_settings_tenant_key_key ON public.payment_gateway_settings USING btree (tenant_key) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can read payment_gateway_settings |SELECT |authenticated |has_edit_role(auth.uid()) | |
| No direct writes to payment_gateway_settings |ALL |authenticated |false |false |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_payment_gateway_settings_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.price_catalog

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |sku |text |YES | |NO |NEVER |
| 3 |name |text |NO | |NO |NEVER |
| 4 |category |text |YES | |NO |NEVER |
| 5 |description |text |YES | |NO |NEVER |
| 6 |unit_price |numeric |YES | |NO |NEVER |
| 7 |web_enabled |boolean |NO |false |NO |NEVER |
| 8 |wspl_enabled |boolean |NO |false |NO |NEVER |
| 9 |source_item_id |uuid |YES | |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 12 |product_id |uuid |YES | |NO |NEVER |
| 13 |web_price |numeric |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18857_10_not_null |CHECK | | | |
| 2200_18857_11_not_null |CHECK | | | |
| 2200_18857_1_not_null |CHECK | | | |
| 2200_18857_3_not_null |CHECK | | | |
| 2200_18857_7_not_null |CHECK | | | |
| 2200_18857_8_not_null |CHECK | | | |
| price_catalog_pkey |PRIMARY KEY |id |public.price_catalog |id |

### Indexes

| Name |Definition |
| --- |--- |
| price_catalog_name_idx |CREATE INDEX price_catalog_name_idx ON public.price_catalog USING btree (name) |
| price_catalog_pkey |CREATE UNIQUE INDEX price_catalog_pkey ON public.price_catalog USING btree (id) |
| price_catalog_web_enabled_idx |CREATE INDEX price_catalog_web_enabled_idx ON public.price_catalog USING btree (web_enabled) |
| price_catalog_wspl_enabled_idx |CREATE INDEX price_catalog_wspl_enabled_idx ON public.price_catalog USING btree (wspl_enabled) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete price_catalog |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Authenticated users can view price_catalog |SELECT |authenticated |has_any_role(auth.uid()) | |
| Editors can insert price_catalog |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update price_catalog |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| price_catalog_select_auth |SELECT |authenticated |true | |
| price_catalog_write_auth |ALL |authenticated |true |true |

### Triggers

_None._

## public.price_matrix

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |category |text |NO | |NO |NEVER |
| 3 |index_1_50 |numeric |YES | |NO |NEVER |
| 4 |index_1_53 |numeric |YES | |NO |NEVER |
| 5 |index_1_59 |numeric |YES | |NO |NEVER |
| 6 |index_1_60 |numeric |YES | |NO |NEVER |
| 7 |index_1_67 |numeric |YES | |NO |NEVER |
| 8 |index_1_74 |numeric |YES | |NO |NEVER |
| 9 |created_at |timestamp with time zone |YES |now() |NO |NEVER |
| 10 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21966_1_not_null |CHECK | | | |
| 2200_21966_2_not_null |CHECK | | | |
| price_matrix_category_key |UNIQUE |category |public.price_matrix |category |
| price_matrix_pkey |PRIMARY KEY |id |public.price_matrix |id |

### Indexes

| Name |Definition |
| --- |--- |
| price_matrix_category_key |CREATE UNIQUE INDEX price_matrix_category_key ON public.price_matrix USING btree (category) |
| price_matrix_pkey |CREATE UNIQUE INDEX price_matrix_pkey ON public.price_matrix USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete price_matrix |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Role users can select price_matrix |SELECT |authenticated |has_any_role(auth.uid()) | |
| Staff manage price matrix |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.pricelist_catalog_rows

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |pricelist_version_id |integer(32,0) |NO | |NO |NEVER |
| 3 |catalog_type |text |NO |'rx'::text |NO |NEVER |
| 4 |row_key |text |NO | |NO |NEVER |
| 5 |row_type |text |NO | |NO |NEVER |
| 6 |section |text |NO | |NO |NEVER |
| 7 |display_description |text |NO |''::text |NO |NEVER |
| 8 |bbd_price |numeric |YES | |NO |NEVER |
| 9 |item_id |uuid |YES | |NO |NEVER |
| 10 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 11 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 12 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21977_10_not_null |CHECK | | | |
| 2200_21977_11_not_null |CHECK | | | |
| 2200_21977_12_not_null |CHECK | | | |
| 2200_21977_1_not_null |CHECK | | | |
| 2200_21977_2_not_null |CHECK | | | |
| 2200_21977_3_not_null |CHECK | | | |
| 2200_21977_4_not_null |CHECK | | | |
| 2200_21977_5_not_null |CHECK | | | |
| 2200_21977_6_not_null |CHECK | | | |
| 2200_21977_7_not_null |CHECK | | | |
| pricelist_catalog_rows_pkey |PRIMARY KEY |id |public.pricelist_catalog_rows |id |
| pricelist_catalog_rows_pricelist_version_id_catalog_type_ro_key |UNIQUE |pricelist_version_id, pricelist_version_id, pricelist_version_id, catalog_type, catalog_type, catalog_type, row_key, row_key, row_key |public.pricelist_catalog_rows |catalog_type, pricelist_version_id, row_key, row_key, catalog_type, pricelist_version_id, catalog_type, pricelist_version_id, row_key |
| pricelist_catalog_rows_pricelist_version_id_fkey |FOREIGN KEY |pricelist_version_id |public.pricelist_versions |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricelist_catalog_rows_pkey |CREATE UNIQUE INDEX pricelist_catalog_rows_pkey ON public.pricelist_catalog_rows USING btree (id) |
| pricelist_catalog_rows_pricelist_version_id_catalog_type_ro_key |CREATE UNIQUE INDEX pricelist_catalog_rows_pricelist_version_id_catalog_type_ro_key ON public.pricelist_catalog_rows USING btree (pricelist_version_id, catalog_type, row_key) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Role users can select pricelist_catalog_rows |SELECT |authenticated |has_any_role(auth.uid()) | |
| Staff manage catalog pricing rows |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.pricelist_child_sections

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |pricelist_version_id |integer(32,0) |YES | |NO |NEVER |
| 3 |section_type |text |NO | |NO |NEVER |
| 4 |child_markup_percent |numeric |YES |0 |NO |NEVER |
| 5 |child_discount_percent |numeric |YES |0 |NO |NEVER |
| 6 |created_at |timestamp with time zone |YES |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21998_1_not_null |CHECK | | | |
| 2200_21998_3_not_null |CHECK | | | |
| pricelist_child_sections_pkey |PRIMARY KEY |id |public.pricelist_child_sections |id |
| pricelist_child_sections_pricelist_version_id_fkey |FOREIGN KEY |pricelist_version_id |public.pricelist_versions |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricelist_child_sections_pkey |CREATE UNIQUE INDEX pricelist_child_sections_pkey ON public.pricelist_child_sections USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete pricelist_child_sections |DELETE |authenticated |has_edit_role(auth.uid()) | |
| Editors can insert pricelist_child_sections |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update pricelist_child_sections |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Role users can select pricelist_child_sections |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.pricelist_line_overrides

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |child_section_id |integer(32,0) |YES | |NO |NEVER |
| 3 |reference_id |text |NO | |NO |NEVER |
| 4 |reference_type |text |NO | |NO |NEVER |
| 5 |overridden_price_bbd |numeric |YES | |NO |NEVER |
| 6 |reason |text |YES | |NO |NEVER |
| 7 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22015_1_not_null |CHECK | | | |
| 2200_22015_3_not_null |CHECK | | | |
| 2200_22015_4_not_null |CHECK | | | |
| pricelist_line_overrides_child_section_id_fkey |FOREIGN KEY |child_section_id |public.pricelist_child_sections |id |
| pricelist_line_overrides_pkey |PRIMARY KEY |id |public.pricelist_line_overrides |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricelist_line_overrides_pkey |CREATE UNIQUE INDEX pricelist_line_overrides_pkey ON public.pricelist_line_overrides USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete pricelist_line_overrides |DELETE |authenticated |has_edit_role(auth.uid()) | |
| Editors can insert pricelist_line_overrides |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update pricelist_line_overrides |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Role users can select pricelist_line_overrides |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.pricelist_lines

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |pricelist_id |uuid |NO | |NO |NEVER |
| 3 |item_ref |uuid |NO | |NO |NEVER |
| 4 |custom_price |numeric |NO | |NO |NEVER |
| 5 |reason |text |YES | |NO |NEVER |
| 6 |source |text |NO |'manual'::text |NO |NEVER |
| 7 |created_by |uuid |YES | |NO |NEVER |
| 8 |approved_by |uuid |YES | |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 10 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22504_10_not_null |CHECK | | | |
| 2200_22504_1_not_null |CHECK | | | |
| 2200_22504_2_not_null |CHECK | | | |
| 2200_22504_3_not_null |CHECK | | | |
| 2200_22504_4_not_null |CHECK | | | |
| 2200_22504_6_not_null |CHECK | | | |
| 2200_22504_9_not_null |CHECK | | | |
| pricelist_lines_approved_by_fkey |FOREIGN KEY |approved_by | | |
| pricelist_lines_created_by_fkey |FOREIGN KEY |created_by | | |
| pricelist_lines_item_ref_fkey |FOREIGN KEY |item_ref |public.pricing_items |id |
| pricelist_lines_pkey |PRIMARY KEY |id |public.pricelist_lines |id |
| pricelist_lines_pricelist_id_fkey |FOREIGN KEY |pricelist_id |public.pricelists |id |
| pricelist_lines_pricelist_id_item_ref_key |UNIQUE |pricelist_id, pricelist_id, item_ref, item_ref |public.pricelist_lines |item_ref, pricelist_id, item_ref, pricelist_id |

### Indexes

| Name |Definition |
| --- |--- |
| pricelist_lines_pkey |CREATE UNIQUE INDEX pricelist_lines_pkey ON public.pricelist_lines USING btree (id) |
| pricelist_lines_pricelist_id_item_ref_key |CREATE UNIQUE INDEX pricelist_lines_pricelist_id_item_ref_key ON public.pricelist_lines USING btree (pricelist_id, item_ref) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors manage pricelist lines |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.pricelist_notes

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |section |text |YES | |NO |NEVER |
| 3 |content |text |YES | |NO |NEVER |
| 4 |sort_order |integer(32,0) |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22029_1_not_null |CHECK | | | |
| pricelist_notes_pkey |PRIMARY KEY |id |public.pricelist_notes |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricelist_notes_pkey |CREATE UNIQUE INDEX pricelist_notes_pkey ON public.pricelist_notes USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete pricelist_notes |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert pricelist_notes |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update pricelist_notes |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Role users can select pricelist_notes |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.pricelist_overrides

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |pricelist_version_id |integer(32,0) |YES | |NO |NEVER |
| 3 |category |text |YES | |NO |NEVER |
| 4 |index_column |text |YES | |NO |NEVER |
| 5 |overridden_price |numeric |YES | |NO |NEVER |
| 6 |reason |text |YES | |NO |NEVER |
| 7 |created_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22037_1_not_null |CHECK | | | |
| pricelist_overrides_pkey |PRIMARY KEY |id |public.pricelist_overrides |id |
| pricelist_overrides_pricelist_version_id_fkey |FOREIGN KEY |pricelist_version_id |public.pricelist_versions |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricelist_overrides_pkey |CREATE UNIQUE INDEX pricelist_overrides_pkey ON public.pricelist_overrides USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete pricelist_overrides |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert pricelist_overrides |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update pricelist_overrides |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Role users can select pricelist_overrides |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.pricelist_versions

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |base_currency |text |YES |'BBD'::text |NO |NEVER |
| 4 |is_template |boolean |YES |false |NO |NEVER |
| 5 |markup_percent |numeric |YES |0 |NO |NEVER |
| 6 |discount_percent |numeric |YES |0 |NO |NEVER |
| 7 |created_at |timestamp with time zone |YES |now() |NO |NEVER |
| 8 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |
| 9 |format_type |text |YES |'list'::text |NO |NEVER |
| 10 |master_markup_percent |numeric |YES |0 |NO |NEVER |
| 11 |master_discount_percent |numeric |YES |0 |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21837_1_not_null |CHECK | | | |
| 2200_21837_2_not_null |CHECK | | | |
| pricelist_versions_pkey |PRIMARY KEY |id |public.pricelist_versions |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricelist_versions_pkey |CREATE UNIQUE INDEX pricelist_versions_pkey ON public.pricelist_versions USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete pricelist_versions |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Role users can select pricelist_versions |SELECT |authenticated |has_any_role(auth.uid()) | |
| Staff manage pricing reconciliation |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.pricelists

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |kind |text |NO | |NO |NEVER |
| 3 |customer_id |integer(32,0) |YES | |NO |NEVER |
| 4 |name |text |YES | |NO |NEVER |
| 5 |created_by |uuid |YES | |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22484_1_not_null |CHECK | | | |
| 2200_22484_2_not_null |CHECK | | | |
| 2200_22484_6_not_null |CHECK | | | |
| 2200_22484_7_not_null |CHECK | | | |
| pricelists_created_by_fkey |FOREIGN KEY |created_by | | |
| pricelists_customer_id_fkey |FOREIGN KEY |customer_id |public.customers |id |
| pricelists_pkey |PRIMARY KEY |id |public.pricelists |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricelists_pkey |CREATE UNIQUE INDEX pricelists_pkey ON public.pricelists USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors manage pricelists |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.pricing_audit

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |actor |uuid |YES | |NO |NEVER |
| 3 |action |text |NO | |NO |NEVER |
| 4 |entity |text |NO | |NO |NEVER |
| 5 |entity_id |text |NO | |NO |NEVER |
| 6 |before |jsonb |YES | |NO |NEVER |
| 7 |after |jsonb |YES | |NO |NEVER |
| 8 |at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21764_1_not_null |CHECK | | | |
| 2200_21764_3_not_null |CHECK | | | |
| 2200_21764_4_not_null |CHECK | | | |
| 2200_21764_5_not_null |CHECK | | | |
| 2200_21764_8_not_null |CHECK | | | |
| pricing_audit_pkey |PRIMARY KEY |id |public.pricing_audit |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricing_audit_pkey |CREATE UNIQUE INDEX pricing_audit_pkey ON public.pricing_audit USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can view pricing audit |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.pricing_input_rows

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |batch_id |uuid |NO | |NO |NEVER |
| 3 |row_number |integer(32,0) |NO | |NO |NEVER |
| 4 |raw_data |jsonb |NO | |NO |NEVER |
| 5 |status |text |NO |'pending'::text |NO |NEVER |
| 6 |error_messages |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 7 |resolved_data |jsonb |YES | |NO |NEVER |
| 8 |lens_id |uuid |YES | |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17956_1_not_null |CHECK | | | |
| 2200_17956_2_not_null |CHECK | | | |
| 2200_17956_3_not_null |CHECK | | | |
| 2200_17956_4_not_null |CHECK | | | |
| 2200_17956_5_not_null |CHECK | | | |
| 2200_17956_6_not_null |CHECK | | | |
| 2200_17956_9_not_null |CHECK | | | |
| pricing_input_rows_batch_id_fkey |FOREIGN KEY |batch_id |public.import_batches |id |
| pricing_input_rows_lens_id_fkey |FOREIGN KEY |lens_id |public.lenses |id |
| pricing_input_rows_pkey |PRIMARY KEY |id |public.pricing_input_rows |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricing_input_rows_pkey |CREATE UNIQUE INDEX pricing_input_rows_pkey ON public.pricing_input_rows USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete pricing_input_rows |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert pricing_input_rows |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can select pricing_input_rows |SELECT |public |has_edit_role(auth.uid()) | |
| Editors can update pricing_input_rows |UPDATE |public |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.pricing_items

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |treatment |text |NO | |NO |NEVER |
| 3 |tier |text |NO | |NO |NEVER |
| 4 |material |text |NO | |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21775_1_not_null |CHECK | | | |
| 2200_21775_2_not_null |CHECK | | | |
| 2200_21775_3_not_null |CHECK | | | |
| 2200_21775_4_not_null |CHECK | | | |
| 2200_21775_5_not_null |CHECK | | | |
| pricing_items_pkey |PRIMARY KEY |id |public.pricing_items |id |
| pricing_items_treatment_tier_material_key |UNIQUE |treatment, treatment, treatment, tier, tier, tier, material, material, material |public.pricing_items |material, tier, treatment, treatment, material, tier, material, tier, treatment |

### Indexes

| Name |Definition |
| --- |--- |
| pricing_items_pkey |CREATE UNIQUE INDEX pricing_items_pkey ON public.pricing_items USING btree (id) |
| pricing_items_treatment_tier_material_key |CREATE UNIQUE INDEX pricing_items_treatment_tier_material_key ON public.pricing_items USING btree (treatment, tier, material) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can view pricing items |SELECT |authenticated |true | |
| Editors can update pricing items |UPDATE |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Editors can upsert pricing items |INSERT |authenticated | |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.pricing_settings

Type: table
RLS enabled: yes
Estimated rows: 1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |version |integer(32,0) |NO |1 |NO |NEVER |
| 3 |label |text |YES | |NO |NEVER |
| 4 |is_active |boolean |NO |true |NO |NEVER |
| 5 |created_by |uuid |YES | |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |base_currency |text |NO |'BBD'::text |NO |NEVER |
| 8 |fx_rates |jsonb |NO |'{"BBD": 2, "USD": 1}'::jsonb |NO |NEVER |
| 9 |fx_risk_buffer |numeric |NO |0.02 |NO |NEVER |
| 10 |vat_rate |numeric |NO |0.175 |NO |NEVER |
| 11 |duty_rates |jsonb |NO |'{"addons": 0.15, "frames": 0.30, "lenses": 0.20, "supplies": 0.20}'::jsonb |NO |NEVER |
| 12 |brokerage_fee |numeric |NO |0 |NO |NEVER |
| 13 |port_charges |numeric |NO |0 |NO |NEVER |
| 14 |freight_method |text |NO |'per_unit'::text |NO |NEVER |
| 15 |insurance_percent |numeric |NO |0.01 |NO |NEVER |
| 16 |cost_of_capital |numeric |NO |0.08 |NO |NEVER |
| 17 |inventory_holding |numeric |NO |0.05 |NO |NEVER |
| 18 |avg_days_in_stock |integer(32,0) |NO |90 |NO |NEVER |
| 19 |overhead_percent |numeric |NO |0.10 |NO |NEVER |
| 20 |shrinkage_percent |numeric |NO |0.02 |NO |NEVER |
| 21 |target_margin |numeric |NO |0.50 |NO |NEVER |
| 22 |category_margin_floors |jsonb |NO |'{"wspl": 0.25, "addons": 0.20, "frames": 0.35, "lenses": 0.30, "supplies": 0.25}'::jsonb |NO |NEVER |
| 23 |category_target_margins |jsonb |NO |'{"wspl": 0.40, "addons": 0.40, "frames": 0.50, "lenses": 0.50, "supplies": 0.45}'::jsonb |NO |NEVER |
| 24 |max_price_increase |numeric |NO |0.10 |NO |NEVER |
| 25 |rounding_rule |numeric |NO |0.50 |NO |NEVER |
| 26 |psychological_rounding |boolean |NO |false |NO |NEVER |
| 27 |block_below_floor |boolean |NO |true |NO |NEVER |
| 28 |block_loss |boolean |NO |true |NO |NEVER |
| 29 |require_concession_reason |boolean |NO |true |NO |NEVER |
| 30 |price_reduction_threshold |numeric |NO |0.10 |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18125_10_not_null |CHECK | | | |
| 2200_18125_11_not_null |CHECK | | | |
| 2200_18125_12_not_null |CHECK | | | |
| 2200_18125_13_not_null |CHECK | | | |
| 2200_18125_14_not_null |CHECK | | | |
| 2200_18125_15_not_null |CHECK | | | |
| 2200_18125_16_not_null |CHECK | | | |
| 2200_18125_17_not_null |CHECK | | | |
| 2200_18125_18_not_null |CHECK | | | |
| 2200_18125_19_not_null |CHECK | | | |
| 2200_18125_1_not_null |CHECK | | | |
| 2200_18125_20_not_null |CHECK | | | |
| 2200_18125_21_not_null |CHECK | | | |
| 2200_18125_22_not_null |CHECK | | | |
| 2200_18125_23_not_null |CHECK | | | |
| 2200_18125_24_not_null |CHECK | | | |
| 2200_18125_25_not_null |CHECK | | | |
| 2200_18125_26_not_null |CHECK | | | |
| 2200_18125_27_not_null |CHECK | | | |
| 2200_18125_28_not_null |CHECK | | | |
| 2200_18125_29_not_null |CHECK | | | |
| 2200_18125_2_not_null |CHECK | | | |
| 2200_18125_30_not_null |CHECK | | | |
| 2200_18125_4_not_null |CHECK | | | |
| 2200_18125_6_not_null |CHECK | | | |
| 2200_18125_7_not_null |CHECK | | | |
| 2200_18125_8_not_null |CHECK | | | |
| 2200_18125_9_not_null |CHECK | | | |
| pricing_settings_created_by_fkey |FOREIGN KEY |created_by | | |
| pricing_settings_pkey |PRIMARY KEY |id |public.pricing_settings |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricing_settings_pkey |CREATE UNIQUE INDEX pricing_settings_pkey ON public.pricing_settings USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete pricing_settings |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert pricing_settings |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update pricing_settings |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select pricing_settings |SELECT |public |has_any_role(auth.uid()) | |
| Staff can select pricing_settings |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.pricing_sheets

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |description |text |YES | |NO |NEVER |
| 4 |is_active |boolean |NO |true |NO |NEVER |
| 5 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17984_1_not_null |CHECK | | | |
| 2200_17984_2_not_null |CHECK | | | |
| 2200_17984_4_not_null |CHECK | | | |
| 2200_17984_5_not_null |CHECK | | | |
| 2200_17984_6_not_null |CHECK | | | |
| 2200_17984_7_not_null |CHECK | | | |
| pricing_sheets_pkey |PRIMARY KEY |id |public.pricing_sheets |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricing_sheets_pkey |CREATE UNIQUE INDEX pricing_sheets_pkey ON public.pricing_sheets USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete pricing sheets |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert pricing sheets |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update pricing sheets |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Users with roles can view pricing sheets |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_pricing_sheets_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.product_variants

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |product_type |text |NO | |NO |NEVER |
| 3 |product_id |uuid |NO | |NO |NEVER |
| 4 |variant_mode |text |NO |'none'::text |NO |NEVER |
| 5 |variant_key |text |NO | |NO |NEVER |
| 6 |title |text |NO | |NO |NEVER |
| 7 |display_label |text |YES | |NO |NEVER |
| 8 |sku |text |YES | |NO |NEVER |
| 9 |opc_code |text |YES | |NO |NEVER |
| 10 |price |numeric |NO |0 |NO |NEVER |
| 11 |cost |numeric |YES | |NO |NEVER |
| 12 |stock_qty |integer(32,0) |YES | |NO |NEVER |
| 13 |low_stock_threshold |integer(32,0) |NO |5 |NO |NEVER |
| 14 |allow_backorder |boolean |NO |false |NO |NEVER |
| 15 |is_active |boolean |NO |true |NO |NEVER |
| 16 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 17 |attribute_values |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 18 |metadata |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 19 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 20 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22438_10_not_null |CHECK | | | |
| 2200_22438_13_not_null |CHECK | | | |
| 2200_22438_14_not_null |CHECK | | | |
| 2200_22438_15_not_null |CHECK | | | |
| 2200_22438_16_not_null |CHECK | | | |
| 2200_22438_17_not_null |CHECK | | | |
| 2200_22438_18_not_null |CHECK | | | |
| 2200_22438_19_not_null |CHECK | | | |
| 2200_22438_1_not_null |CHECK | | | |
| 2200_22438_20_not_null |CHECK | | | |
| 2200_22438_2_not_null |CHECK | | | |
| 2200_22438_3_not_null |CHECK | | | |
| 2200_22438_4_not_null |CHECK | | | |
| 2200_22438_5_not_null |CHECK | | | |
| 2200_22438_6_not_null |CHECK | | | |
| product_variants_pkey |PRIMARY KEY |id |public.product_variants |id |
| product_variants_product_type_product_id_variant_key_key |UNIQUE |product_type, product_type, product_type, product_id, product_id, product_id, variant_key, variant_key, variant_key |public.product_variants |product_id, variant_key, product_type, variant_key, product_id, product_type, product_id, variant_key, product_type |

### Indexes

| Name |Definition |
| --- |--- |
| product_variants_pkey |CREATE UNIQUE INDEX product_variants_pkey ON public.product_variants USING btree (id) |
| product_variants_product_type_product_id_variant_key_key |CREATE UNIQUE INDEX product_variants_product_type_product_id_variant_key_key ON public.product_variants USING btree (product_type, product_id, variant_key) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff manage product variants |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.profiles

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |display_name |text |YES | |NO |NEVER |
| 4 |bio |text |YES | |NO |NEVER |
| 5 |avatar_url |text |YES | |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |full_name |text |YES | |NO |NEVER |
| 9 |phone |text |YES | |NO |NEVER |
| 10 |shipping_address |jsonb |YES | |NO |NEVER |
| 11 |billing_address |jsonb |YES | |NO |NEVER |
| 12 |organization_name |text |YES |''::text |NO |NEVER |
| 13 |portal_access_status |text |YES |'pending_profile'::text |NO |NEVER |
| 14 |portal_access_note |text |YES |''::text |NO |NEVER |
| 15 |crm_contact_id |uuid |YES | |NO |NEVER |
| 16 |crm_customer_id |integer(32,0) |YES | |NO |NEVER |
| 17 |audience |text |YES | |NO |NEVER |
| 18 |interest_intent |text |YES | |NO |NEVER |
| 19 |onboarding_completed_at |timestamp with time zone |YES | |NO |NEVER |
| 20 |email |text |YES | |NO |NEVER |
| 21 |email_verified_at |timestamp with time zone |YES | |NO |NEVER |
| 22 |profile_completed_at |timestamp with time zone |YES | |NO |NEVER |
| 23 |portal_access_approved_override |boolean |YES |false |NO |NEVER |
| 24 |portal_access_approved_note |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17630_1_not_null |CHECK | | | |
| 2200_17630_2_not_null |CHECK | | | |
| 2200_17630_6_not_null |CHECK | | | |
| 2200_17630_7_not_null |CHECK | | | |
| profiles_audience_check |CHECK | |public.profiles |audience |
| profiles_interest_intent_check |CHECK | |public.profiles |interest_intent |
| profiles_pkey |PRIMARY KEY |id |public.profiles |id |
| profiles_user_id_fkey |FOREIGN KEY |user_id | | |
| profiles_user_id_key |UNIQUE |user_id |public.profiles |user_id |

### Indexes

| Name |Definition |
| --- |--- |
| profiles_pkey |CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id) |
| profiles_user_id_key |CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can insert any profile |INSERT |authenticated | |has_role(auth.uid(), 'admin'::app_role) |
| Admins can update any profile |UPDATE |authenticated |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |
| Admins can view all profiles |SELECT |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Users can insert their own profile |INSERT |authenticated | |(auth.uid() = user_id) |
| Users can update their own profile |UPDATE |authenticated |(auth.uid() = user_id) | |
| Users can view their own profile |SELECT |authenticated |(auth.uid() = user_id) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_profiles_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.public_inquiries

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |inquiry_type |text |NO |'contact'::text |NO |NEVER |
| 3 |name |text |NO | |NO |NEVER |
| 4 |email |text |NO | |NO |NEVER |
| 5 |phone |text |YES | |NO |NEVER |
| 6 |business_name |text |YES | |NO |NEVER |
| 7 |message |text |YES | |NO |NEVER |
| 8 |notes |text |YES | |NO |NEVER |
| 9 |page_slug |text |YES | |NO |NEVER |
| 10 |source_channel |text |NO |'website'::text |NO |NEVER |
| 11 |honeypot |text |YES | |NO |NEVER |
| 12 |ip_hint |text |YES | |NO |NEVER |
| 13 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20244_10_not_null |CHECK | | | |
| 2200_20244_13_not_null |CHECK | | | |
| 2200_20244_1_not_null |CHECK | | | |
| 2200_20244_2_not_null |CHECK | | | |
| 2200_20244_3_not_null |CHECK | | | |
| 2200_20244_4_not_null |CHECK | | | |
| public_inquiries_pkey |PRIMARY KEY |id |public.public_inquiries |id |

### Indexes

| Name |Definition |
| --- |--- |
| public_inquiries_pkey |CREATE UNIQUE INDEX public_inquiries_pkey ON public.public_inquiries USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can read inquiries |SELECT |authenticated |has_edit_role(auth.uid()) | |
| Anyone can submit inquiries |INSERT |anon, authenticated | |((inquiry_type IS NOT NULL) AND (inquiry_type <> ''::text)) |

### Triggers

_None._

## public.quote_lines

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |quote_id |uuid |NO | |NO |NEVER |
| 3 |line_type |text |NO |'Stock'::text |NO |NEVER |
| 4 |product_id |uuid |YES | |NO |NEVER |
| 5 |sku |text |NO |''::text |NO |NEVER |
| 6 |item_name |text |NO |''::text |NO |NEVER |
| 7 |description_override |text |YES | |NO |NEVER |
| 8 |qty |numeric |NO |1 |NO |NEVER |
| 9 |unit_cost_landed_bbd |numeric |NO |0 |NO |NEVER |
| 10 |unit_base_price_bbd |numeric |NO |0 |NO |NEVER |
| 11 |unit_sell_price_bbd |numeric |NO |0 |NO |NEVER |
| 12 |price_override |boolean |NO |false |NO |NEVER |
| 13 |override_reason |text |YES | |NO |NEVER |
| 14 |override_note |text |YES | |NO |NEVER |
| 15 |profit_status |text |NO |'NoCost'::text |NO |NEVER |
| 16 |threshold_percent |numeric |NO |28 |NO |NEVER |
| 17 |threshold_status |text |NO |'NoCost'::text |NO |NEVER |
| 18 |gp_amount |numeric |NO |0 |NO |NEVER |
| 19 |gp_percent |numeric |NO |0 |NO |NEVER |
| 20 |group_key |text |YES | |NO |NEVER |
| 21 |parent_line_id |uuid |YES | |NO |NEVER |
| 22 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 23 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 24 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 25 |line_note |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18422_10_not_null |CHECK | | | |
| 2200_18422_11_not_null |CHECK | | | |
| 2200_18422_12_not_null |CHECK | | | |
| 2200_18422_15_not_null |CHECK | | | |
| 2200_18422_16_not_null |CHECK | | | |
| 2200_18422_17_not_null |CHECK | | | |
| 2200_18422_18_not_null |CHECK | | | |
| 2200_18422_19_not_null |CHECK | | | |
| 2200_18422_1_not_null |CHECK | | | |
| 2200_18422_22_not_null |CHECK | | | |
| 2200_18422_23_not_null |CHECK | | | |
| 2200_18422_24_not_null |CHECK | | | |
| 2200_18422_2_not_null |CHECK | | | |
| 2200_18422_3_not_null |CHECK | | | |
| 2200_18422_5_not_null |CHECK | | | |
| 2200_18422_6_not_null |CHECK | | | |
| 2200_18422_8_not_null |CHECK | | | |
| 2200_18422_9_not_null |CHECK | | | |
| quote_lines_line_type_check |CHECK | |public.quote_lines |line_type |
| quote_lines_override_reason_check |CHECK | |public.quote_lines |override_reason |
| quote_lines_parent_line_id_fkey |FOREIGN KEY |parent_line_id |public.quote_lines |id |
| quote_lines_pkey |PRIMARY KEY |id |public.quote_lines |id |
| quote_lines_profit_status_check |CHECK | |public.quote_lines |profit_status |
| quote_lines_quote_id_fkey |FOREIGN KEY |quote_id |public.quotes |id |
| quote_lines_threshold_status_check |CHECK | |public.quote_lines |threshold_status |

### Indexes

| Name |Definition |
| --- |--- |
| quote_lines_pkey |CREATE UNIQUE INDEX quote_lines_pkey ON public.quote_lines USING btree (id) |
| quote_lines_quote_id_idx |CREATE INDEX quote_lines_quote_id_idx ON public.quote_lines USING btree (quote_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete quote_lines |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert quote_lines |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update quote_lines |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select quote_lines |SELECT |public |has_any_role(auth.uid()) | |
| Staff can view all quote lines |SELECT |authenticated |has_edit_role(auth.uid()) | |
| quote_lines_select_authenticated_analytics |SELECT |authenticated |true | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_quote_lines_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.quotes

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |quote_number |text |NO | |NO |NEVER |
| 3 |quote_type |text |NO | |NO |NEVER |
| 4 |status |text |NO |'Draft'::text |NO |NEVER |
| 5 |customer_name |text |NO |''::text |NO |NEVER |
| 6 |account_id |text |YES | |NO |NEVER |
| 7 |contact_name |text |YES | |NO |NEVER |
| 8 |contact_email |text |YES | |NO |NEVER |
| 9 |contact_phone |text |YES | |NO |NEVER |
| 10 |currency |text |NO |'BBD'::text |NO |NEVER |
| 11 |price_profile_id |text |YES | |NO |NEVER |
| 12 |valid_until |date |YES | |NO |NEVER |
| 13 |lead_time_days |integer(32,0) |YES | |NO |NEVER |
| 14 |notes_customer |text |YES | |NO |NEVER |
| 15 |notes_internal |text |YES | |NO |NEVER |
| 16 |subtotal_sell |numeric |NO |0 |NO |NEVER |
| 17 |total_landed_cost |numeric |NO |0 |NO |NEVER |
| 18 |gp_amount |numeric |NO |0 |NO |NEVER |
| 19 |gp_percent |numeric |NO |0 |NO |NEVER |
| 20 |grand_total |numeric |NO |0 |NO |NEVER |
| 21 |created_by |uuid |NO | |NO |NEVER |
| 22 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 23 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18392_10_not_null |CHECK | | | |
| 2200_18392_16_not_null |CHECK | | | |
| 2200_18392_17_not_null |CHECK | | | |
| 2200_18392_18_not_null |CHECK | | | |
| 2200_18392_19_not_null |CHECK | | | |
| 2200_18392_1_not_null |CHECK | | | |
| 2200_18392_20_not_null |CHECK | | | |
| 2200_18392_21_not_null |CHECK | | | |
| 2200_18392_22_not_null |CHECK | | | |
| 2200_18392_23_not_null |CHECK | | | |
| 2200_18392_2_not_null |CHECK | | | |
| 2200_18392_3_not_null |CHECK | | | |
| 2200_18392_4_not_null |CHECK | | | |
| 2200_18392_5_not_null |CHECK | | | |
| quotes_pkey |PRIMARY KEY |id |public.quotes |id |
| quotes_quote_number_key |UNIQUE |quote_number |public.quotes |quote_number |
| quotes_quote_type_check |CHECK | |public.quotes |quote_type |
| quotes_status_check |CHECK | |public.quotes |status |

### Indexes

| Name |Definition |
| --- |--- |
| quotes_created_at_idx |CREATE INDEX quotes_created_at_idx ON public.quotes USING btree (created_at) |
| quotes_pkey |CREATE UNIQUE INDEX quotes_pkey ON public.quotes USING btree (id) |
| quotes_quote_number_key |CREATE UNIQUE INDEX quotes_quote_number_key ON public.quotes USING btree (quote_number) |
| quotes_status_created_at_idx |CREATE INDEX quotes_status_created_at_idx ON public.quotes USING btree (status, created_at) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete quotes |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can update quotes |UPDATE |public |has_edit_role(auth.uid()) | |
| Staff can read all quotes |SELECT |authenticated |has_edit_role(auth.uid()) | |
| Users can insert authorized quotes |INSERT |authenticated | |(has_edit_role(auth.uid()) OR ((created_by = auth.uid()) AND can_access_customer_portal_feature(auth.uid(), 'quotes'::text))) |
| Users can read authorized quotes |SELECT |authenticated |(has_edit_role(auth.uid()) OR ((created_by = auth.uid()) AND can_access_customer_portal_feature(auth.uid(), 'quotes'::text))) | |
| quotes_select_authenticated_analytics |SELECT |authenticated |true | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| trg_generate_quote_number |BEFORE |INSERT |ROW |EXECUTE FUNCTION generate_quote_number() |
| update_quotes_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.role_permissions

Type: table
RLS enabled: yes
Estimated rows: 100

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |role |public.app_role |NO | |NO |NEVER |
| 3 |feature |text |NO | |NO |NEVER |
| 4 |can_view |boolean |NO |false |NO |NEVER |
| 5 |can_edit |boolean |NO |false |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18217_1_not_null |CHECK | | | |
| 2200_18217_2_not_null |CHECK | | | |
| 2200_18217_3_not_null |CHECK | | | |
| 2200_18217_4_not_null |CHECK | | | |
| 2200_18217_5_not_null |CHECK | | | |
| 2200_18217_6_not_null |CHECK | | | |
| 2200_18217_7_not_null |CHECK | | | |
| role_permissions_pkey |PRIMARY KEY |id |public.role_permissions |id |
| role_permissions_role_feature_key |UNIQUE |role, role, feature, feature |public.role_permissions |feature, role, feature, role |

### Indexes

| Name |Definition |
| --- |--- |
| role_permissions_pkey |CREATE UNIQUE INDEX role_permissions_pkey ON public.role_permissions USING btree (id) |
| role_permissions_role_feature_key |CREATE UNIQUE INDEX role_permissions_role_feature_key ON public.role_permissions USING btree (role, feature) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage role_permissions |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |
| Any role user can read role_permissions |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_role_permissions_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.rx_details

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |quote_line_id |uuid |NO | |NO |NEVER |
| 3 |od_sph |numeric |YES | |NO |NEVER |
| 4 |od_cyl |numeric |YES | |NO |NEVER |
| 5 |od_axis |numeric |YES | |NO |NEVER |
| 6 |od_add |numeric |YES | |NO |NEVER |
| 7 |os_sph |numeric |YES | |NO |NEVER |
| 8 |os_cyl |numeric |YES | |NO |NEVER |
| 9 |os_axis |numeric |YES | |NO |NEVER |
| 10 |os_add |numeric |YES | |NO |NEVER |
| 11 |pd |text |YES | |NO |NEVER |
| 12 |seg_height |text |YES | |NO |NEVER |
| 13 |fitting_height |text |YES | |NO |NEVER |
| 14 |rx_notes |text |YES | |NO |NEVER |
| 15 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 16 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 17 |od_fpd |numeric |YES | |NO |NEVER |
| 18 |od_npd |numeric |YES | |NO |NEVER |
| 19 |os_fpd |numeric |YES | |NO |NEVER |
| 20 |os_npd |numeric |YES | |NO |NEVER |
| 21 |od_oc |numeric |YES | |NO |NEVER |
| 22 |os_oc |numeric |YES | |NO |NEVER |
| 23 |od_bc |numeric |YES | |NO |NEVER |
| 24 |os_bc |numeric |YES | |NO |NEVER |
| 25 |od_prism_value |numeric |YES | |NO |NEVER |
| 26 |od_prism_dir |text |YES | |NO |NEVER |
| 27 |od_prism2_value |numeric |YES | |NO |NEVER |
| 28 |od_prism2_dir |text |YES | |NO |NEVER |
| 29 |os_prism_value |numeric |YES | |NO |NEVER |
| 30 |os_prism_dir |text |YES | |NO |NEVER |
| 31 |os_prism2_value |numeric |YES | |NO |NEVER |
| 32 |os_prism2_dir |text |YES | |NO |NEVER |
| 33 |od_slab_off |numeric |YES | |NO |NEVER |
| 34 |os_slab_off |numeric |YES | |NO |NEVER |
| 35 |od_special_thickness |text |YES | |NO |NEVER |
| 36 |os_special_thickness |text |YES | |NO |NEVER |
| 37 |od_face_form_angle |numeric |YES | |NO |NEVER |
| 38 |od_panto |numeric |YES | |NO |NEVER |
| 39 |od_object_distance |numeric |YES | |NO |NEVER |
| 40 |od_vertex_refracted |numeric |YES | |NO |NEVER |
| 41 |od_vertex_fitted |numeric |YES | |NO |NEVER |
| 42 |od_eye_level |numeric |YES | |NO |NEVER |
| 43 |od_inset |numeric |YES | |NO |NEVER |
| 44 |od_ercd |numeric |YES | |NO |NEVER |
| 45 |os_face_form_angle |numeric |YES | |NO |NEVER |
| 46 |os_panto |numeric |YES | |NO |NEVER |
| 47 |os_object_distance |numeric |YES | |NO |NEVER |
| 48 |os_vertex_refracted |numeric |YES | |NO |NEVER |
| 49 |os_vertex_fitted |numeric |YES | |NO |NEVER |
| 50 |os_eye_level |numeric |YES | |NO |NEVER |
| 51 |os_inset |numeric |YES | |NO |NEVER |
| 52 |os_ercd |numeric |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18465_15_not_null |CHECK | | | |
| 2200_18465_16_not_null |CHECK | | | |
| 2200_18465_1_not_null |CHECK | | | |
| 2200_18465_2_not_null |CHECK | | | |
| rx_details_pkey |PRIMARY KEY |id |public.rx_details |id |
| rx_details_quote_line_id_fkey |FOREIGN KEY |quote_line_id |public.quote_lines |id |
| rx_details_quote_line_id_key |UNIQUE |quote_line_id |public.rx_details |quote_line_id |

### Indexes

| Name |Definition |
| --- |--- |
| rx_details_pkey |CREATE UNIQUE INDEX rx_details_pkey ON public.rx_details USING btree (id) |
| rx_details_quote_line_id_key |CREATE UNIQUE INDEX rx_details_quote_line_id_key ON public.rx_details USING btree (quote_line_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Customers can view own rx details |SELECT |authenticated |(can_access_customer_portal_feature(auth.uid(), 'quotes'::text) AND (EXISTS ( SELECT 1<br>   FROM (quote_lines ql<br>     JOIN quotes q ON ((q.id = ql.quote_id)))<br>  WHERE ((ql.id = rx_details.quote_line_id) AND (q.created_by = auth.uid()))))) | |
| Editors can delete rx_details |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert rx_details |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update rx_details |UPDATE |public |has_edit_role(auth.uid()) | |
| Staff can view all rx details |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_rx_details_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.rx_price_categories

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |grouping_id |integer(32,0) |NO | |NO |NEVER |
| 3 |key |text |NO | |NO |NEVER |
| 4 |default_name |text |NO | |NO |NEVER |
| 5 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 6 |is_active |boolean |NO |true |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22065_1_not_null |CHECK | | | |
| 2200_22065_2_not_null |CHECK | | | |
| 2200_22065_3_not_null |CHECK | | | |
| 2200_22065_4_not_null |CHECK | | | |
| 2200_22065_5_not_null |CHECK | | | |
| 2200_22065_6_not_null |CHECK | | | |
| 2200_22065_7_not_null |CHECK | | | |
| 2200_22065_8_not_null |CHECK | | | |
| rx_price_categories_grouping_id_fkey |FOREIGN KEY |grouping_id |public.rx_price_groupings |id |
| rx_price_categories_grouping_id_key_key |UNIQUE |grouping_id, grouping_id, key, key |public.rx_price_categories |grouping_id, key, grouping_id, key |
| rx_price_categories_pkey |PRIMARY KEY |id |public.rx_price_categories |id |

### Indexes

| Name |Definition |
| --- |--- |
| rx_price_categories_grouping_id_key_key |CREATE UNIQUE INDEX rx_price_categories_grouping_id_key_key ON public.rx_price_categories USING btree (grouping_id, key) |
| rx_price_categories_pkey |CREATE UNIQUE INDEX rx_price_categories_pkey ON public.rx_price_categories USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can read rx_price_categories |SELECT |authenticated |true | |
| Editors can delete rx_price_categories |DELETE |authenticated |has_edit_role(auth.uid()) | |
| Editors can insert rx_price_categories |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update rx_price_categories |UPDATE |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.rx_price_category_versions

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |pricelist_version_id |integer(32,0) |NO | |NO |NEVER |
| 3 |category_id |integer(32,0) |NO | |NO |NEVER |
| 4 |display_name |text |YES | |NO |NEVER |
| 5 |sort_order |integer(32,0) |YES | |NO |NEVER |
| 6 |is_enabled |boolean |NO |true |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22107_1_not_null |CHECK | | | |
| 2200_22107_2_not_null |CHECK | | | |
| 2200_22107_3_not_null |CHECK | | | |
| 2200_22107_6_not_null |CHECK | | | |
| 2200_22107_7_not_null |CHECK | | | |
| 2200_22107_8_not_null |CHECK | | | |
| rx_price_category_versions_category_id_fkey |FOREIGN KEY |category_id |public.rx_price_categories |id |
| rx_price_category_versions_pkey |PRIMARY KEY |id |public.rx_price_category_versions |id |
| rx_price_category_versions_pricelist_version_id_category_id_key |UNIQUE |pricelist_version_id, pricelist_version_id, category_id, category_id |public.rx_price_category_versions |category_id, pricelist_version_id, category_id, pricelist_version_id |
| rx_price_category_versions_pricelist_version_id_fkey |FOREIGN KEY |pricelist_version_id |public.pricelist_versions |id |

### Indexes

| Name |Definition |
| --- |--- |
| rx_price_category_versions_pkey |CREATE UNIQUE INDEX rx_price_category_versions_pkey ON public.rx_price_category_versions USING btree (id) |
| rx_price_category_versions_pricelist_version_id_category_id_key |CREATE UNIQUE INDEX rx_price_category_versions_pricelist_version_id_category_id_key ON public.rx_price_category_versions USING btree (pricelist_version_id, category_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can read rx_price_category_versions |SELECT |authenticated |true | |
| Editors can delete rx_price_category_versions |DELETE |authenticated |has_edit_role(auth.uid()) | |
| Editors can insert rx_price_category_versions |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update rx_price_category_versions |UPDATE |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.rx_price_grouping_versions

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |pricelist_version_id |integer(32,0) |NO | |NO |NEVER |
| 3 |grouping_id |integer(32,0) |NO | |NO |NEVER |
| 4 |display_name |text |YES | |NO |NEVER |
| 5 |sort_order |integer(32,0) |YES | |NO |NEVER |
| 6 |is_enabled |boolean |NO |true |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22084_1_not_null |CHECK | | | |
| 2200_22084_2_not_null |CHECK | | | |
| 2200_22084_3_not_null |CHECK | | | |
| 2200_22084_6_not_null |CHECK | | | |
| 2200_22084_7_not_null |CHECK | | | |
| 2200_22084_8_not_null |CHECK | | | |
| rx_price_grouping_versions_grouping_id_fkey |FOREIGN KEY |grouping_id |public.rx_price_groupings |id |
| rx_price_grouping_versions_pkey |PRIMARY KEY |id |public.rx_price_grouping_versions |id |
| rx_price_grouping_versions_pricelist_version_id_fkey |FOREIGN KEY |pricelist_version_id |public.pricelist_versions |id |
| rx_price_grouping_versions_pricelist_version_id_grouping_id_key |UNIQUE |pricelist_version_id, pricelist_version_id, grouping_id, grouping_id |public.rx_price_grouping_versions |grouping_id, pricelist_version_id, grouping_id, pricelist_version_id |

### Indexes

| Name |Definition |
| --- |--- |
| rx_price_grouping_versions_pkey |CREATE UNIQUE INDEX rx_price_grouping_versions_pkey ON public.rx_price_grouping_versions USING btree (id) |
| rx_price_grouping_versions_pricelist_version_id_grouping_id_key |CREATE UNIQUE INDEX rx_price_grouping_versions_pricelist_version_id_grouping_id_key ON public.rx_price_grouping_versions USING btree (pricelist_version_id, grouping_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can read rx_price_grouping_versions |SELECT |authenticated |true | |
| Editors can delete rx_price_grouping_versions |DELETE |authenticated |has_edit_role(auth.uid()) | |
| Editors can insert rx_price_grouping_versions |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update rx_price_grouping_versions |UPDATE |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.rx_price_groupings

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |YES |NEVER |
| 2 |key |text |NO | |NO |NEVER |
| 3 |default_name |text |NO | |NO |NEVER |
| 4 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 5 |is_active |boolean |NO |true |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22051_1_not_null |CHECK | | | |
| 2200_22051_2_not_null |CHECK | | | |
| 2200_22051_3_not_null |CHECK | | | |
| 2200_22051_4_not_null |CHECK | | | |
| 2200_22051_5_not_null |CHECK | | | |
| 2200_22051_6_not_null |CHECK | | | |
| 2200_22051_7_not_null |CHECK | | | |
| rx_price_groupings_key_key |UNIQUE |key |public.rx_price_groupings |key |
| rx_price_groupings_pkey |PRIMARY KEY |id |public.rx_price_groupings |id |

### Indexes

| Name |Definition |
| --- |--- |
| rx_price_groupings_key_key |CREATE UNIQUE INDEX rx_price_groupings_key_key ON public.rx_price_groupings USING btree (key) |
| rx_price_groupings_pkey |CREATE UNIQUE INDEX rx_price_groupings_pkey ON public.rx_price_groupings USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can read rx_price_groupings |SELECT |authenticated |true | |
| Editors can delete rx_price_groupings |DELETE |authenticated |has_edit_role(auth.uid()) | |
| Editors can insert rx_price_groupings |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update rx_price_groupings |UPDATE |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.security_alerts

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |alert_type |text |NO | |NO |NEVER |
| 3 |severity |text |NO | |NO |NEVER |
| 4 |state |text |NO |'open'::text |NO |NEVER |
| 5 |dedupe_key |text |NO | |NO |NEVER |
| 6 |title |text |NO | |NO |NEVER |
| 7 |details |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 8 |first_seen_at |timestamp with time zone |NO |now() |NO |NEVER |
| 9 |last_seen_at |timestamp with time zone |NO |now() |NO |NEVER |
| 10 |occurrence_count |integer(32,0) |NO |1 |NO |NEVER |
| 11 |acknowledged_by |uuid |YES | |NO |NEVER |
| 12 |acknowledged_at |timestamp with time zone |YES | |NO |NEVER |
| 13 |resolved_by |uuid |YES | |NO |NEVER |
| 14 |resolved_at |timestamp with time zone |YES | |NO |NEVER |
| 15 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 16 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20595_10_not_null |CHECK | | | |
| 2200_20595_15_not_null |CHECK | | | |
| 2200_20595_16_not_null |CHECK | | | |
| 2200_20595_1_not_null |CHECK | | | |
| 2200_20595_2_not_null |CHECK | | | |
| 2200_20595_3_not_null |CHECK | | | |
| 2200_20595_4_not_null |CHECK | | | |
| 2200_20595_5_not_null |CHECK | | | |
| 2200_20595_6_not_null |CHECK | | | |
| 2200_20595_7_not_null |CHECK | | | |
| 2200_20595_8_not_null |CHECK | | | |
| 2200_20595_9_not_null |CHECK | | | |
| security_alerts_alert_type_check |CHECK | |public.security_alerts |alert_type |
| security_alerts_dedupe_key_unique |UNIQUE |dedupe_key |public.security_alerts |dedupe_key |
| security_alerts_pkey |PRIMARY KEY |id |public.security_alerts |id |
| security_alerts_severity_check |CHECK | |public.security_alerts |severity |
| security_alerts_state_check |CHECK | |public.security_alerts |state |

### Indexes

| Name |Definition |
| --- |--- |
| idx_security_alerts_state_severity_updated |CREATE INDEX idx_security_alerts_state_severity_updated ON public.security_alerts USING btree (state, severity, updated_at DESC) |
| security_alerts_dedupe_key_unique |CREATE UNIQUE INDEX security_alerts_dedupe_key_unique ON public.security_alerts USING btree (dedupe_key) |
| security_alerts_pkey |CREATE UNIQUE INDEX security_alerts_pkey ON public.security_alerts USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage security_alerts |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

_None._

## public.security_audit_events

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |category |text |NO | |NO |NEVER |
| 3 |event_type |text |NO | |NO |NEVER |
| 4 |severity |text |NO |'info'::text |NO |NEVER |
| 5 |status_code |integer(32,0) |YES | |NO |NEVER |
| 6 |actor_user_id |uuid |YES | |NO |NEVER |
| 7 |actor_role |text |YES | |NO |NEVER |
| 8 |source_function |text |YES | |NO |NEVER |
| 9 |source_path |text |YES | |NO |NEVER |
| 10 |request_id |text |YES | |NO |NEVER |
| 11 |ip_hint |text |YES | |NO |NEVER |
| 12 |user_agent |text |YES | |NO |NEVER |
| 13 |payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 14 |redacted_payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 15 |occurred_at |timestamp with time zone |NO |now() |NO |NEVER |
| 16 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20576_13_not_null |CHECK | | | |
| 2200_20576_14_not_null |CHECK | | | |
| 2200_20576_15_not_null |CHECK | | | |
| 2200_20576_16_not_null |CHECK | | | |
| 2200_20576_1_not_null |CHECK | | | |
| 2200_20576_2_not_null |CHECK | | | |
| 2200_20576_3_not_null |CHECK | | | |
| 2200_20576_4_not_null |CHECK | | | |
| security_audit_events_category_check |CHECK | |public.security_audit_events |category |
| security_audit_events_pkey |PRIMARY KEY |id |public.security_audit_events |id |
| security_audit_events_severity_check |CHECK | |public.security_audit_events |severity |

### Indexes

| Name |Definition |
| --- |--- |
| idx_security_audit_events_category_occurred |CREATE INDEX idx_security_audit_events_category_occurred ON public.security_audit_events USING btree (category, occurred_at DESC) |
| idx_security_audit_events_event_type_occurred |CREATE INDEX idx_security_audit_events_event_type_occurred ON public.security_audit_events USING btree (event_type, occurred_at DESC) |
| idx_security_audit_events_ip_hint_occurred |CREATE INDEX idx_security_audit_events_ip_hint_occurred ON public.security_audit_events USING btree (ip_hint, occurred_at DESC) WHERE (ip_hint IS NOT NULL) |
| idx_security_audit_events_status_code_occurred |CREATE INDEX idx_security_audit_events_status_code_occurred ON public.security_audit_events USING btree (status_code, occurred_at DESC) WHERE (status_code = ANY (ARRAY[401, 403, 429])) |
| security_audit_events_pkey |CREATE UNIQUE INDEX security_audit_events_pkey ON public.security_audit_events USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can read security_audit_events |SELECT |public |has_role(auth.uid(), 'admin'::app_role) | |
| Service role can insert security_audit_events |INSERT |public | |(auth.role() = 'service_role'::text) |

### Triggers

_None._

## public.shipment_charges

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |shipment_id |uuid |NO | |NO |NEVER |
| 3 |charge_type |text |NO | |NO |NEVER |
| 4 |amount_bbd |numeric |NO |0 |NO |NEVER |
| 5 |vat_bbd |numeric |YES |0 |NO |NEVER |
| 6 |duty_bbd |numeric |YES |0 |NO |NEVER |
| 7 |vat_reclaimable |boolean |YES |false |NO |NEVER |
| 8 |notes |text |YES |''::text |NO |NEVER |
| 9 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18322_10_not_null |CHECK | | | |
| 2200_18322_11_not_null |CHECK | | | |
| 2200_18322_1_not_null |CHECK | | | |
| 2200_18322_2_not_null |CHECK | | | |
| 2200_18322_3_not_null |CHECK | | | |
| 2200_18322_4_not_null |CHECK | | | |
| 2200_18322_9_not_null |CHECK | | | |
| shipment_charges_pkey |PRIMARY KEY |id |public.shipment_charges |id |
| shipment_charges_shipment_id_fkey |FOREIGN KEY |shipment_id |public.shipments |id |

### Indexes

| Name |Definition |
| --- |--- |
| shipment_charges_pkey |CREATE UNIQUE INDEX shipment_charges_pkey ON public.shipment_charges USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete shipment_charges |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert shipment_charges |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update shipment_charges |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select shipment_charges |SELECT |public |has_any_role(auth.uid()) | |
| Staff can select shipment_charges |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_shipment_charges_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.shipment_lines

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |shipment_id |uuid |NO | |NO |NEVER |
| 3 |product_type |text |NO |'free'::text |NO |NEVER |
| 4 |lens_id |uuid |YES | |NO |NEVER |
| 5 |supply_id |uuid |YES | |NO |NEVER |
| 6 |addon_id |uuid |YES | |NO |NEVER |
| 7 |description |text |NO |''::text |NO |NEVER |
| 8 |quantity |numeric |NO |1 |NO |NEVER |
| 9 |unit_fob_foreign |numeric |NO |0 |NO |NEVER |
| 10 |line_fob_foreign |numeric |NO |0 |NO |NEVER |
| 11 |markup_percent |numeric |NO |30 |NO |NEVER |
| 12 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 13 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 14 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18347_10_not_null |CHECK | | | |
| 2200_18347_11_not_null |CHECK | | | |
| 2200_18347_12_not_null |CHECK | | | |
| 2200_18347_13_not_null |CHECK | | | |
| 2200_18347_14_not_null |CHECK | | | |
| 2200_18347_1_not_null |CHECK | | | |
| 2200_18347_2_not_null |CHECK | | | |
| 2200_18347_3_not_null |CHECK | | | |
| 2200_18347_7_not_null |CHECK | | | |
| 2200_18347_8_not_null |CHECK | | | |
| 2200_18347_9_not_null |CHECK | | | |
| shipment_lines_addon_id_fkey |FOREIGN KEY |addon_id |public.addons |id |
| shipment_lines_lens_id_fkey |FOREIGN KEY |lens_id |public.lenses |id |
| shipment_lines_pkey |PRIMARY KEY |id |public.shipment_lines |id |
| shipment_lines_product_type_check |CHECK | |public.shipment_lines |product_type |
| shipment_lines_shipment_id_fkey |FOREIGN KEY |shipment_id |public.shipments |id |
| shipment_lines_supply_id_fkey |FOREIGN KEY |supply_id |public.supplies |id |

### Indexes

| Name |Definition |
| --- |--- |
| shipment_lines_pkey |CREATE UNIQUE INDEX shipment_lines_pkey ON public.shipment_lines USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete shipment_lines |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert shipment_lines |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update shipment_lines |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select shipment_lines |SELECT |public |has_any_role(auth.uid()) | |
| Staff can select shipment_lines |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_shipment_lines_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.shipment_types

Type: table
RLS enabled: yes
Estimated rows: 2

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |code |text |NO | |NO |NEVER |
| 4 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 5 |is_active |boolean |NO |true |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18737_1_not_null |CHECK | | | |
| 2200_18737_2_not_null |CHECK | | | |
| 2200_18737_3_not_null |CHECK | | | |
| 2200_18737_4_not_null |CHECK | | | |
| 2200_18737_5_not_null |CHECK | | | |
| 2200_18737_6_not_null |CHECK | | | |
| 2200_18737_7_not_null |CHECK | | | |
| shipment_types_code_key |UNIQUE |code |public.shipment_types |code |
| shipment_types_name_key |UNIQUE |name |public.shipment_types |name |
| shipment_types_pkey |PRIMARY KEY |id |public.shipment_types |id |

### Indexes

| Name |Definition |
| --- |--- |
| shipment_types_code_key |CREATE UNIQUE INDEX shipment_types_code_key ON public.shipment_types USING btree (code) |
| shipment_types_name_key |CREATE UNIQUE INDEX shipment_types_name_key ON public.shipment_types USING btree (name) |
| shipment_types_pkey |CREATE UNIQUE INDEX shipment_types_pkey ON public.shipment_types USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Allow edit role to delete shipment_types |DELETE |authenticated |has_edit_role(auth.uid()) | |
| Allow edit role to insert shipment_types |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Allow edit role to update shipment_types |UPDATE |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Authenticated users can read shipment_types |SELECT |public |(auth.uid() IS NOT NULL) | |

### Triggers

_None._

## public.shipments

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |type |text |NO | |NO |NEVER |
| 3 |supplier_id |uuid |NO | |NO |NEVER |
| 4 |commodity |text |NO |''::text |NO |NEVER |
| 5 |date_ordered |date |YES | |NO |NEVER |
| 6 |po_ref |text |YES |''::text |NO |NEVER |
| 7 |date_received |date |NO | |NO |NEVER |
| 8 |invoice_number |text |NO | |NO |NEVER |
| 9 |invoice_date |date |NO | |NO |NEVER |
| 10 |currency |text |NO |'USD'::text |NO |NEVER |
| 11 |exchange_rate |numeric |NO |2 |NO |NEVER |
| 12 |fob_foreign |numeric |NO |0 |NO |NEVER |
| 13 |invoice_total_foreign |numeric |NO |0 |NO |NEVER |
| 14 |status |public.shipment_status |NO |'draft'::shipment_status |NO |NEVER |
| 15 |version |integer(32,0) |NO |1 |NO |NEVER |
| 16 |parent_id |uuid |YES | |NO |NEVER |
| 17 |created_by |uuid |NO | |NO |NEVER |
| 18 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 19 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 20 |freight_provider |text |NO |'dhl'::text |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18289_10_not_null |CHECK | | | |
| 2200_18289_11_not_null |CHECK | | | |
| 2200_18289_12_not_null |CHECK | | | |
| 2200_18289_13_not_null |CHECK | | | |
| 2200_18289_14_not_null |CHECK | | | |
| 2200_18289_15_not_null |CHECK | | | |
| 2200_18289_17_not_null |CHECK | | | |
| 2200_18289_18_not_null |CHECK | | | |
| 2200_18289_19_not_null |CHECK | | | |
| 2200_18289_1_not_null |CHECK | | | |
| 2200_18289_20_not_null |CHECK | | | |
| 2200_18289_2_not_null |CHECK | | | |
| 2200_18289_3_not_null |CHECK | | | |
| 2200_18289_4_not_null |CHECK | | | |
| 2200_18289_7_not_null |CHECK | | | |
| 2200_18289_8_not_null |CHECK | | | |
| 2200_18289_9_not_null |CHECK | | | |
| shipments_freight_provider_check |CHECK | |public.shipments |freight_provider |
| shipments_parent_id_fkey |FOREIGN KEY |parent_id |public.shipments |id |
| shipments_pkey |PRIMARY KEY |id |public.shipments |id |
| shipments_supplier_id_fkey |FOREIGN KEY |supplier_id |public.suppliers |id |

### Indexes

| Name |Definition |
| --- |--- |
| shipments_pkey |CREATE UNIQUE INDEX shipments_pkey ON public.shipments USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete shipments |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert shipments |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update shipments |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select shipments |SELECT |public |has_any_role(auth.uid()) | |
| Staff can select shipments |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_shipments_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.statement_lines

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |bigint(64,0) |NO | |NO |NEVER |
| 2 |innovations_statement_item_id |integer(32,0) |NO | |NO |NEVER |
| 3 |innovations_statement_id |integer(32,0) |NO | |NO |NEVER |
| 4 |order_type |smallint(16,0) |YES | |NO |NEVER |
| 5 |invoice_id |integer(32,0) |YES | |NO |NEVER |
| 6 |reference |text |YES | |NO |NEVER |
| 7 |patient |text |YES | |NO |NEVER |
| 8 |post_date |date |YES | |NO |NEVER |
| 9 |amount |numeric |YES | |NO |NEVER |
| 10 |synced_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 12 |order_id |bigint(64,0) |YES | |NO |NEVER |
| 13 |payment_method |text |YES | |NO |NEVER |
| 14 |order_type_name |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22200_10_not_null |CHECK | | | |
| 2200_22200_11_not_null |CHECK | | | |
| 2200_22200_1_not_null |CHECK | | | |
| 2200_22200_2_not_null |CHECK | | | |
| 2200_22200_3_not_null |CHECK | | | |
| statement_lines_innovations_statement_id_fkey |FOREIGN KEY |innovations_statement_id |public.statements |innovations_statement_id |
| statement_lines_innovations_statement_item_id_key |UNIQUE |innovations_statement_item_id |public.statement_lines |innovations_statement_item_id |
| statement_lines_pkey |PRIMARY KEY |id |public.statement_lines |id |

### Indexes

| Name |Definition |
| --- |--- |
| statement_lines_innovations_statement_item_id_key |CREATE UNIQUE INDEX statement_lines_innovations_statement_item_id_key ON public.statement_lines USING btree (innovations_statement_item_id) |
| statement_lines_pkey |CREATE UNIQUE INDEX statement_lines_pkey ON public.statement_lines USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Customers read own statement lines |SELECT |authenticated |(innovations_statement_id IN ( SELECT statements.innovations_statement_id<br>   FROM statements<br>  WHERE (statements.customer_id IN ( SELECT profiles.crm_customer_id<br>           FROM profiles<br>          WHERE (profiles.user_id = auth.uid()))))) | |
| Customers read own statement_lines |SELECT |authenticated |(can_access_customer_portal_feature(auth.uid(), 'statements'::text) AND (innovations_statement_id IN ( SELECT statements.innovations_statement_id<br>   FROM statements<br>  WHERE (statements.customer_id IN ( SELECT profiles.crm_customer_id<br>           FROM profiles<br>          WHERE (profiles.user_id = auth.uid())))))) | |
| Staff read statement lines |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.statement_lines_public

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |bigint(64,0) |YES | |NO |NEVER |
| 2 |statement_id |text |YES | |NO |NEVER |
| 3 |customer_id |integer(32,0) |YES | |NO |NEVER |
| 4 |account_number |text |YES | |NO |NEVER |
| 5 |order_type |smallint(16,0) |YES | |NO |NEVER |
| 6 |invoice_id |integer(32,0) |YES | |NO |NEVER |
| 7 |reference |text |YES | |NO |NEVER |
| 8 |patient |text |YES | |NO |NEVER |
| 9 |post_date |date |YES | |NO |NEVER |
| 10 |amount |numeric |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.statements

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |bigint(64,0) |NO | |NO |NEVER |
| 2 |innovations_statement_id |integer(32,0) |NO | |NO |NEVER |
| 3 |innovations_customer_id |integer(32,0) |NO | |NO |NEVER |
| 4 |customer_id |integer(32,0) |YES | |NO |NEVER |
| 5 |account_number |text |YES | |NO |NEVER |
| 6 |from_date |date |YES | |NO |NEVER |
| 7 |to_date |date |YES | |NO |NEVER |
| 8 |statement_date |date |YES | |NO |NEVER |
| 9 |due_date |date |YES | |NO |NEVER |
| 10 |opening_balance |numeric |YES | |NO |NEVER |
| 11 |closing_balance |numeric |YES | |NO |NEVER |
| 12 |payments |numeric |YES | |NO |NEVER |
| 13 |finance_charges |numeric |YES | |NO |NEVER |
| 14 |discount |numeric |YES | |NO |NEVER |
| 15 |aging_amount_1 |numeric |YES | |NO |NEVER |
| 16 |aging_amount_2 |numeric |YES | |NO |NEVER |
| 17 |aging_amount_3 |numeric |YES | |NO |NEVER |
| 18 |aging_amount_4 |numeric |YES | |NO |NEVER |
| 19 |status |smallint(16,0) |YES | |NO |NEVER |
| 20 |void |boolean |NO |false |NO |NEVER |
| 21 |printed |boolean |NO |false |NO |NEVER |
| 22 |innovations_emailed |boolean |NO |false |NO |NEVER |
| 23 |portal_emailed_at |timestamp with time zone |YES | |NO |NEVER |
| 24 |synced_at |timestamp with time zone |NO |now() |NO |NEVER |
| 25 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 26 |transactions |numeric |YES | |NO |NEVER |
| 27 |allowance |numeric |YES | |NO |NEVER |
| 28 |volume_discount |numeric |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22180_1_not_null |CHECK | | | |
| 2200_22180_20_not_null |CHECK | | | |
| 2200_22180_21_not_null |CHECK | | | |
| 2200_22180_22_not_null |CHECK | | | |
| 2200_22180_24_not_null |CHECK | | | |
| 2200_22180_25_not_null |CHECK | | | |
| 2200_22180_2_not_null |CHECK | | | |
| 2200_22180_3_not_null |CHECK | | | |
| statements_customer_id_fkey |FOREIGN KEY |customer_id |public.customers |id |
| statements_innovations_statement_id_key |UNIQUE |innovations_statement_id |public.statements |innovations_statement_id |
| statements_pkey |PRIMARY KEY |id |public.statements |id |

### Indexes

| Name |Definition |
| --- |--- |
| statements_customer_id_idx |CREATE INDEX statements_customer_id_idx ON public.statements USING btree (customer_id) |
| statements_innovations_statement_id_key |CREATE UNIQUE INDEX statements_innovations_statement_id_key ON public.statements USING btree (innovations_statement_id) |
| statements_pkey |CREATE UNIQUE INDEX statements_pkey ON public.statements USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Customers read own statements |SELECT |authenticated |(customer_id IN ( SELECT profiles.crm_customer_id<br>   FROM profiles<br>  WHERE (profiles.user_id = auth.uid()))) | |
| Staff read statements |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.statements_public

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |text |YES | |NO |NEVER |
| 2 |customer_id |integer(32,0) |YES | |NO |NEVER |
| 3 |account_number |text |YES | |NO |NEVER |
| 4 |period_start |date |YES | |NO |NEVER |
| 5 |period_end |date |YES | |NO |NEVER |
| 6 |opening_balance |numeric |YES | |NO |NEVER |
| 7 |closing_balance |numeric |YES | |NO |NEVER |
| 8 |payments |numeric |YES | |NO |NEVER |
| 9 |finance_charges |numeric |YES | |NO |NEVER |
| 10 |discount |numeric |YES | |NO |NEVER |
| 11 |due_date |date |YES | |NO |NEVER |
| 12 |status |smallint(16,0) |YES | |NO |NEVER |
| 13 |void |boolean |YES | |NO |NEVER |
| 14 |printed |boolean |YES | |NO |NEVER |
| 15 |innovations_emailed |boolean |YES | |NO |NEVER |
| 16 |portal_emailed_at |timestamp with time zone |YES | |NO |NEVER |
| 17 |synced_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.store_product_media

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |product_type |text |NO | |NO |NEVER |
| 3 |product_id |uuid |NO | |NO |NEVER |
| 4 |image_url |text |NO | |NO |NEVER |
| 5 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 6 |is_active |boolean |NO |true |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22458_1_not_null |CHECK | | | |
| 2200_22458_2_not_null |CHECK | | | |
| 2200_22458_3_not_null |CHECK | | | |
| 2200_22458_4_not_null |CHECK | | | |
| 2200_22458_5_not_null |CHECK | | | |
| 2200_22458_6_not_null |CHECK | | | |
| 2200_22458_7_not_null |CHECK | | | |
| 2200_22458_8_not_null |CHECK | | | |
| store_product_media_pkey |PRIMARY KEY |id |public.store_product_media |id |

### Indexes

| Name |Definition |
| --- |--- |
| store_product_media_pkey |CREATE UNIQUE INDEX store_product_media_pkey ON public.store_product_media USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff manage product media |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| store_product_media_read_authenticated |SELECT |authenticated |true | |

### Triggers

_None._

## public.store_product_overrides

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |product_type |text |NO | |NO |NEVER |
| 3 |product_id |uuid |NO | |NO |NEVER |
| 4 |is_vat_taxable |boolean |NO |false |NO |NEVER |
| 5 |quantity_label |text |YES | |NO |NEVER |
| 6 |website_badges |jsonb |NO |'[]'::jsonb |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_22470_1_not_null |CHECK | | | |
| 2200_22470_2_not_null |CHECK | | | |
| 2200_22470_3_not_null |CHECK | | | |
| 2200_22470_4_not_null |CHECK | | | |
| 2200_22470_6_not_null |CHECK | | | |
| 2200_22470_7_not_null |CHECK | | | |
| 2200_22470_8_not_null |CHECK | | | |
| store_product_overrides_pkey |PRIMARY KEY |id |public.store_product_overrides |id |
| store_product_overrides_product_type_product_id_key |UNIQUE |product_type, product_type, product_id, product_id |public.store_product_overrides |product_id, product_type, product_id, product_type |

### Indexes

| Name |Definition |
| --- |--- |
| store_product_overrides_pkey |CREATE UNIQUE INDEX store_product_overrides_pkey ON public.store_product_overrides USING btree (id) |
| store_product_overrides_product_type_product_id_key |CREATE UNIQUE INDEX store_product_overrides_product_type_product_id_key ON public.store_product_overrides USING btree (product_type, product_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff manage product overrides |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| store_product_overrides_read_authenticated |SELECT |authenticated |true | |

### Triggers

_None._

## public.store_product_variant_settings

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |product_type |text |NO | |NO |NEVER |
| 3 |product_id |uuid |NO | |NO |NEVER |
| 4 |variant_mode |public.store_variant_mode |NO |'none'::store_variant_mode |NO |NEVER |
| 5 |sku_template |text |YES | |NO |NEVER |
| 6 |opc_template |text |YES | |NO |NEVER |
| 7 |config |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 8 |created_by |uuid |YES | |NO |NEVER |
| 9 |updated_by |uuid |YES | |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 11 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20759_10_not_null |CHECK | | | |
| 2200_20759_11_not_null |CHECK | | | |
| 2200_20759_1_not_null |CHECK | | | |
| 2200_20759_2_not_null |CHECK | | | |
| 2200_20759_3_not_null |CHECK | | | |
| 2200_20759_4_not_null |CHECK | | | |
| 2200_20759_7_not_null |CHECK | | | |
| store_product_variant_settings_pkey |PRIMARY KEY |id |public.store_product_variant_settings |id |
| store_product_variant_settings_product_type_check |CHECK | |public.store_product_variant_settings |product_type |
| store_product_variant_settings_product_type_product_id_key |UNIQUE |product_type, product_type, product_id, product_id |public.store_product_variant_settings |product_id, product_type, product_id, product_type |

### Indexes

| Name |Definition |
| --- |--- |
| store_product_variant_settings_pkey |CREATE UNIQUE INDEX store_product_variant_settings_pkey ON public.store_product_variant_settings USING btree (id) |
| store_product_variant_settings_product_type_product_id_key |CREATE UNIQUE INDEX store_product_variant_settings_product_type_product_id_key ON public.store_product_variant_settings USING btree (product_type, product_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can manage variant settings |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.store_product_variant_summary

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |product_type |text |YES | |NO |NEVER |
| 2 |product_id |uuid |YES | |NO |NEVER |
| 3 |total_variants |integer(32,0) |YES | |NO |NEVER |
| 4 |active_variants |integer(32,0) |YES | |NO |NEVER |
| 5 |low_stock_variants |integer(32,0) |YES | |NO |NEVER |
| 6 |min_price |numeric |YES | |NO |NEVER |
| 7 |max_price |numeric |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.store_product_variants

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |product_type |text |NO | |NO |NEVER |
| 3 |product_id |uuid |NO | |NO |NEVER |
| 4 |title |text |NO | |NO |NEVER |
| 5 |variant_key |text |NO | |NO |NEVER |
| 6 |sku |text |YES | |NO |NEVER |
| 7 |opc_code |text |YES | |NO |NEVER |
| 8 |attributes |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 9 |metadata |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 10 |price |numeric(12,2) |NO |0 |NO |NEVER |
| 11 |cost |numeric(12,2) |YES | |NO |NEVER |
| 12 |stock_qty |integer(32,0) |NO |0 |NO |NEVER |
| 13 |reserved_qty |integer(32,0) |NO |0 |NO |NEVER |
| 14 |low_stock_threshold |integer(32,0) |NO |0 |NO |NEVER |
| 15 |allow_backorder |boolean |NO |false |NO |NEVER |
| 16 |is_active |boolean |NO |true |NO |NEVER |
| 17 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 18 |created_by |uuid |YES | |NO |NEVER |
| 19 |updated_by |uuid |YES | |NO |NEVER |
| 20 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 21 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20774_10_not_null |CHECK | | | |
| 2200_20774_12_not_null |CHECK | | | |
| 2200_20774_13_not_null |CHECK | | | |
| 2200_20774_14_not_null |CHECK | | | |
| 2200_20774_15_not_null |CHECK | | | |
| 2200_20774_16_not_null |CHECK | | | |
| 2200_20774_17_not_null |CHECK | | | |
| 2200_20774_1_not_null |CHECK | | | |
| 2200_20774_20_not_null |CHECK | | | |
| 2200_20774_21_not_null |CHECK | | | |
| 2200_20774_2_not_null |CHECK | | | |
| 2200_20774_3_not_null |CHECK | | | |
| 2200_20774_4_not_null |CHECK | | | |
| 2200_20774_5_not_null |CHECK | | | |
| 2200_20774_8_not_null |CHECK | | | |
| 2200_20774_9_not_null |CHECK | | | |
| store_product_variants_pkey |PRIMARY KEY |id |public.store_product_variants |id |
| store_product_variants_product_type_check |CHECK | |public.store_product_variants |product_type |
| store_product_variants_product_type_product_id_variant_key_key |UNIQUE |product_type, product_type, product_type, product_id, product_id, product_id, variant_key, variant_key, variant_key |public.store_product_variants |product_id, product_type, variant_key, product_id, product_type, variant_key, product_id, product_type, variant_key |

### Indexes

| Name |Definition |
| --- |--- |
| store_product_variants_lookup_idx |CREATE INDEX store_product_variants_lookup_idx ON public.store_product_variants USING btree (product_type, product_id, is_active, sort_order, created_at DESC) |
| store_product_variants_pkey |CREATE UNIQUE INDEX store_product_variants_pkey ON public.store_product_variants USING btree (id) |
| store_product_variants_product_type_product_id_variant_key_key |CREATE UNIQUE INDEX store_product_variants_product_type_product_id_variant_key_key ON public.store_product_variants USING btree (product_type, product_id, variant_key) |
| store_product_variants_sku_idx |CREATE INDEX store_product_variants_sku_idx ON public.store_product_variants USING btree (sku) WHERE ((sku IS NOT NULL) AND (btrim(sku) <> ''::text)) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated staff can read store variants |SELECT |authenticated |has_edit_role(auth.uid()) | |
| Public can read active store variants |SELECT |public |(is_active = true) | |
| Staff can manage store variants |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| store_product_variants_audit_insert |AFTER |INSERT |ROW |EXECUTE FUNCTION store_product_variants_write_audit_log() |
| store_product_variants_audit_update |AFTER |UPDATE |ROW |EXECUTE FUNCTION store_product_variants_write_audit_log() |
| store_product_variants_set_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION store_product_variants_set_updated_at() |

## public.store_product_variants_public

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |YES | |NO |NEVER |
| 2 |product_type |text |YES | |NO |NEVER |
| 3 |product_id |uuid |YES | |NO |NEVER |
| 4 |title |text |YES | |NO |NEVER |
| 5 |variant_key |text |YES | |NO |NEVER |
| 6 |sku |text |YES | |NO |NEVER |
| 7 |opc_code |text |YES | |NO |NEVER |
| 8 |attributes |jsonb |YES | |NO |NEVER |
| 9 |metadata |jsonb |YES | |NO |NEVER |
| 10 |price |numeric |YES | |NO |NEVER |
| 11 |stock_qty |integer(32,0) |YES | |NO |NEVER |
| 12 |reserved_qty |integer(32,0) |YES | |NO |NEVER |
| 13 |low_stock_threshold |integer(32,0) |YES | |NO |NEVER |
| 14 |allow_backorder |boolean |YES | |NO |NEVER |
| 15 |is_active |boolean |YES | |NO |NEVER |
| 16 |sort_order |integer(32,0) |YES | |NO |NEVER |
| 17 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 18 |updated_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.store_variant_audit_logs

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |variant_id |uuid |YES | |NO |NEVER |
| 3 |action |text |NO | |NO |NEVER |
| 4 |actor_user_id |uuid |YES | |NO |NEVER |
| 5 |before_state |jsonb |YES | |NO |NEVER |
| 6 |after_state |jsonb |YES | |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20798_1_not_null |CHECK | | | |
| 2200_20798_3_not_null |CHECK | | | |
| 2200_20798_7_not_null |CHECK | | | |
| store_variant_audit_logs_pkey |PRIMARY KEY |id |public.store_variant_audit_logs |id |
| store_variant_audit_logs_variant_id_fkey |FOREIGN KEY |variant_id |public.store_product_variants |id |

### Indexes

| Name |Definition |
| --- |--- |
| store_variant_audit_logs_pkey |CREATE UNIQUE INDEX store_variant_audit_logs_pkey ON public.store_variant_audit_logs USING btree (id) |
| store_variant_audit_logs_variant_created_idx |CREATE INDEX store_variant_audit_logs_variant_created_idx ON public.store_variant_audit_logs USING btree (variant_id, created_at DESC) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can read variant audit logs |SELECT |public |has_edit_role(auth.uid()) | |
| System can insert variant audit logs |INSERT |public | |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.suppliers

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |is_active |boolean |NO |true |NO |NEVER |
| 4 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |abbrev |text |NO |''::text |NO |NEVER |
| 7 |code |text |NO |''::text |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17729_1_not_null |CHECK | | | |
| 2200_17729_2_not_null |CHECK | | | |
| 2200_17729_3_not_null |CHECK | | | |
| 2200_17729_4_not_null |CHECK | | | |
| 2200_17729_5_not_null |CHECK | | | |
| 2200_17729_6_not_null |CHECK | | | |
| 2200_17729_7_not_null |CHECK | | | |
| suppliers_name_key |UNIQUE |name |public.suppliers |name |
| suppliers_pkey |PRIMARY KEY |id |public.suppliers |id |

### Indexes

| Name |Definition |
| --- |--- |
| suppliers_name_key |CREATE UNIQUE INDEX suppliers_name_key ON public.suppliers USING btree (name) |
| suppliers_pkey |CREATE UNIQUE INDEX suppliers_pkey ON public.suppliers USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Anon can view suppliers |SELECT |anon |true | |
| Editors can delete suppliers |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert suppliers |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update suppliers |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Role users can select suppliers |SELECT |authenticated |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_suppliers_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.supplies

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |category |text |NO |'lab'::text |NO |NEVER |
| 4 |description |text |NO |''::text |NO |NEVER |
| 5 |sku |text |YES |''::text |NO |NEVER |
| 6 |base_price |numeric |NO |0 |NO |NEVER |
| 7 |sell_price |numeric |NO |0 |NO |NEVER |
| 8 |unit |text |NO |'each'::text |NO |NEVER |
| 9 |quantity_per_unit |integer(32,0) |NO |1 |NO |NEVER |
| 10 |is_active |boolean |NO |true |NO |NEVER |
| 11 |show_on_website |boolean |NO |false |NO |NEVER |
| 12 |image_url |text |YES | |NO |NEVER |
| 13 |notes |text |YES | |NO |NEVER |
| 14 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 15 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 16 |supplier_id |uuid |YES | |NO |NEVER |
| 17 |preferred |boolean |NO |false |NO |NEVER |
| 18 |stocked |boolean |NO |false |NO |NEVER |
| 19 |show_in_pricelist |boolean |NO |false |NO |NEVER |
| 20 |bin |text |NO |''::text |NO |NEVER |
| 21 |detail |text |NO |''::text |NO |NEVER |
| 22 |currency |text |NO |'USD'::text |NO |NEVER |
| 23 |bb_item |boolean |NO |false |NO |NEVER |
| 24 |duty_added |boolean |NO |false |NO |NEVER |
| 25 |vat_paid |boolean |NO |false |NO |NEVER |
| 26 |labour_added |boolean |NO |false |NO |NEVER |
| 27 |brand_id |uuid |YES | |NO |NEVER |
| 28 |stk_wspl |boolean |NO |false |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18001_10_not_null |CHECK | | | |
| 2200_18001_11_not_null |CHECK | | | |
| 2200_18001_14_not_null |CHECK | | | |
| 2200_18001_15_not_null |CHECK | | | |
| 2200_18001_17_not_null |CHECK | | | |
| 2200_18001_18_not_null |CHECK | | | |
| 2200_18001_19_not_null |CHECK | | | |
| 2200_18001_1_not_null |CHECK | | | |
| 2200_18001_20_not_null |CHECK | | | |
| 2200_18001_21_not_null |CHECK | | | |
| 2200_18001_22_not_null |CHECK | | | |
| 2200_18001_23_not_null |CHECK | | | |
| 2200_18001_24_not_null |CHECK | | | |
| 2200_18001_25_not_null |CHECK | | | |
| 2200_18001_26_not_null |CHECK | | | |
| 2200_18001_28_not_null |CHECK | | | |
| 2200_18001_2_not_null |CHECK | | | |
| 2200_18001_3_not_null |CHECK | | | |
| 2200_18001_4_not_null |CHECK | | | |
| 2200_18001_6_not_null |CHECK | | | |
| 2200_18001_7_not_null |CHECK | | | |
| 2200_18001_8_not_null |CHECK | | | |
| 2200_18001_9_not_null |CHECK | | | |
| supplies_brand_id_fkey |FOREIGN KEY |brand_id |public.brands |id |
| supplies_pkey |PRIMARY KEY |id |public.supplies |id |
| supplies_supplier_id_fkey |FOREIGN KEY |supplier_id |public.suppliers |id |

### Indexes

| Name |Definition |
| --- |--- |
| supplies_pkey |CREATE UNIQUE INDEX supplies_pkey ON public.supplies USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Anon can view website supplies |SELECT |anon |((show_on_website = true) AND (is_active = true)) | |
| Editors can delete supplies |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert supplies |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update supplies |UPDATE |public |has_edit_role(auth.uid()) | |
| Staff can select supplies |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_supplies_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.supplies_public

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |YES | |NO |NEVER |
| 2 |name |text |YES | |NO |NEVER |
| 3 |description |text |YES | |NO |NEVER |
| 4 |sell_price |numeric |YES | |NO |NEVER |
| 5 |category |text |YES | |NO |NEVER |
| 6 |unit |text |YES | |NO |NEVER |
| 7 |quantity_per_unit |integer(32,0) |YES | |NO |NEVER |
| 8 |image_url |text |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.supply_categories

Type: table
RLS enabled: yes
Estimated rows: 3

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |abbrev |text |NO |''::text |NO |NEVER |
| 4 |code |text |NO |''::text |NO |NEVER |
| 5 |is_active |boolean |NO |true |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18264_1_not_null |CHECK | | | |
| 2200_18264_2_not_null |CHECK | | | |
| 2200_18264_3_not_null |CHECK | | | |
| 2200_18264_4_not_null |CHECK | | | |
| 2200_18264_5_not_null |CHECK | | | |
| 2200_18264_6_not_null |CHECK | | | |
| 2200_18264_7_not_null |CHECK | | | |
| supply_categories_pkey |PRIMARY KEY |id |public.supply_categories |id |

### Indexes

| Name |Definition |
| --- |--- |
| supply_categories_pkey |CREATE UNIQUE INDEX supply_categories_pkey ON public.supply_categories USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete supply_categories |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert supply_categories |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update supply_categories |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select supply_categories |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.suppressed_emails

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |email |text |NO | |NO |NEVER |
| 3 |reason |text |NO | |NO |NEVER |
| 4 |metadata |jsonb |YES | |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21228_1_not_null |CHECK | | | |
| 2200_21228_2_not_null |CHECK | | | |
| 2200_21228_3_not_null |CHECK | | | |
| 2200_21228_5_not_null |CHECK | | | |
| suppressed_emails_email_key |UNIQUE |email |public.suppressed_emails |email |
| suppressed_emails_pkey |PRIMARY KEY |id |public.suppressed_emails |id |
| suppressed_emails_reason_check |CHECK | |public.suppressed_emails |reason |

### Indexes

| Name |Definition |
| --- |--- |
| idx_suppressed_emails_email |CREATE INDEX idx_suppressed_emails_email ON public.suppressed_emails USING btree (email) |
| suppressed_emails_email_key |CREATE UNIQUE INDEX suppressed_emails_email_key ON public.suppressed_emails USING btree (email) |
| suppressed_emails_pkey |CREATE UNIQUE INDEX suppressed_emails_pkey ON public.suppressed_emails USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Service role can insert suppressed emails |INSERT |public | |(auth.role() = 'service_role'::text) |
| Service role can read suppressed emails |SELECT |public |(auth.role() = 'service_role'::text) | |

### Triggers

_None._

## public.user_presence

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |user_id |uuid |NO | |NO |NEVER |
| 2 |role_scope |text |NO |'customer'::text |NO |NEVER |
| 3 |status |text |NO |'offline'::text |NO |NEVER |
| 4 |availability_mode |text |NO |'available'::text |NO |NEVER |
| 5 |last_seen_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |last_heartbeat_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20699_1_not_null |CHECK | | | |
| 2200_20699_2_not_null |CHECK | | | |
| 2200_20699_3_not_null |CHECK | | | |
| 2200_20699_4_not_null |CHECK | | | |
| 2200_20699_5_not_null |CHECK | | | |
| 2200_20699_6_not_null |CHECK | | | |
| 2200_20699_7_not_null |CHECK | | | |
| user_presence_pkey |PRIMARY KEY |user_id |public.user_presence |user_id |
| user_presence_role_scope_check |CHECK | |public.user_presence |role_scope |
| user_presence_status_check |CHECK | |public.user_presence |status |
| user_presence_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| user_presence_pkey |CREATE UNIQUE INDEX user_presence_pkey ON public.user_presence USING btree (user_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Users can read own presence |SELECT |authenticated |((user_id = auth.uid()) OR has_any_role(auth.uid())) | |
| Users can upsert own presence |ALL |authenticated |((user_id = auth.uid()) OR has_edit_role(auth.uid())) |((user_id = auth.uid()) OR has_edit_role(auth.uid())) |

### Triggers

_None._

## public.user_roles

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |role |public.app_role |NO | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_17711_1_not_null |CHECK | | | |
| 2200_17711_2_not_null |CHECK | | | |
| 2200_17711_3_not_null |CHECK | | | |
| user_roles_pkey |PRIMARY KEY |id |public.user_roles |id |
| user_roles_user_id_fkey |FOREIGN KEY |user_id | | |
| user_roles_user_id_role_key |UNIQUE |user_id, user_id, role, role |public.user_roles |role, user_id, role, user_id |

### Indexes

| Name |Definition |
| --- |--- |
| user_roles_pkey |CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id) |
| user_roles_user_id_role_key |CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage all roles |ALL |authenticated |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |
| Only admins can delete roles |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Only admins can insert roles |INSERT |authenticated | |has_role(auth.uid(), 'admin'::app_role) |
| Only admins can update roles |UPDATE |authenticated |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |
| Users can read their own roles |SELECT |authenticated |(auth.uid() = user_id) | |

### Triggers

_None._

## public.website_analytics_pageviews

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |bigint(64,0) |NO | |YES |NEVER |
| 2 |session_id |uuid |NO | |NO |NEVER |
| 3 |visitor_id |text |NO | |NO |NEVER |
| 4 |pathname |text |NO | |NO |NEVER |
| 5 |referrer_host |text |NO |'Direct'::text |NO |NEVER |
| 6 |device_type |text |NO |'desktop'::text |NO |NEVER |
| 7 |occurred_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20900_1_not_null |CHECK | | | |
| 2200_20900_2_not_null |CHECK | | | |
| 2200_20900_3_not_null |CHECK | | | |
| 2200_20900_4_not_null |CHECK | | | |
| 2200_20900_5_not_null |CHECK | | | |
| 2200_20900_6_not_null |CHECK | | | |
| 2200_20900_7_not_null |CHECK | | | |
| website_analytics_pageviews_pkey |PRIMARY KEY |id |public.website_analytics_pageviews |id |
| website_analytics_pageviews_session_id_fkey |FOREIGN KEY |session_id |public.website_analytics_sessions |id |

### Indexes

| Name |Definition |
| --- |--- |
| website_analytics_pageviews_occurred_at_idx |CREATE INDEX website_analytics_pageviews_occurred_at_idx ON public.website_analytics_pageviews USING btree (occurred_at DESC) |
| website_analytics_pageviews_pathname_idx |CREATE INDEX website_analytics_pageviews_pathname_idx ON public.website_analytics_pageviews USING btree (pathname) |
| website_analytics_pageviews_pkey |CREATE UNIQUE INDEX website_analytics_pageviews_pkey ON public.website_analytics_pageviews USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can read pageviews |SELECT |authenticated |has_edit_role(auth.uid()) | |
| website_analytics_pageviews_insert_public |INSERT |anon, authenticated | |((session_id IS NOT NULL) AND (visitor_id IS NOT NULL) AND ((char_length(visitor_id) >= 1) AND (char_length(visitor_id) <= 128)) AND (pathname IS NOT NULL) AND ((char_length(pathname) >= 1) AND (char_length(pathname) <= 512)) AND ((referrer_host IS NULL) OR (char_length(referrer_host) <= 256)) AND ((device_type IS NULL) OR (char_length(device_type) <= 32))) |
| website_analytics_pageviews_select_authenticated |SELECT |authenticated |true | |

### Triggers

_None._

## public.website_analytics_sessions

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |visitor_id |text |NO | |NO |NEVER |
| 3 |started_at |timestamp with time zone |NO |now() |NO |NEVER |
| 4 |last_seen_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |landing_path |text |NO |'/'::text |NO |NEVER |
| 6 |pageview_count |integer(32,0) |NO |1 |NO |NEVER |
| 7 |duration_seconds |integer(32,0) |NO |0 |NO |NEVER |
| 8 |engaged |boolean |NO |false |NO |NEVER |
| 9 |is_returning_visitor |boolean |NO |false |NO |NEVER |
| 10 |device_type |text |NO |'desktop'::text |NO |NEVER |
| 11 |referrer_host |text |NO |'Direct'::text |NO |NEVER |
| 12 |user_agent |text |YES | |NO |NEVER |
| 13 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 14 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20878_10_not_null |CHECK | | | |
| 2200_20878_11_not_null |CHECK | | | |
| 2200_20878_13_not_null |CHECK | | | |
| 2200_20878_14_not_null |CHECK | | | |
| 2200_20878_1_not_null |CHECK | | | |
| 2200_20878_2_not_null |CHECK | | | |
| 2200_20878_3_not_null |CHECK | | | |
| 2200_20878_4_not_null |CHECK | | | |
| 2200_20878_5_not_null |CHECK | | | |
| 2200_20878_6_not_null |CHECK | | | |
| 2200_20878_7_not_null |CHECK | | | |
| 2200_20878_8_not_null |CHECK | | | |
| 2200_20878_9_not_null |CHECK | | | |
| website_analytics_sessions_duration_seconds_check |CHECK | |public.website_analytics_sessions |duration_seconds |
| website_analytics_sessions_pageview_count_check |CHECK | |public.website_analytics_sessions |pageview_count |
| website_analytics_sessions_pkey |PRIMARY KEY |id |public.website_analytics_sessions |id |

### Indexes

| Name |Definition |
| --- |--- |
| website_analytics_sessions_pkey |CREATE UNIQUE INDEX website_analytics_sessions_pkey ON public.website_analytics_sessions USING btree (id) |
| website_analytics_sessions_started_at_idx |CREATE INDEX website_analytics_sessions_started_at_idx ON public.website_analytics_sessions USING btree (started_at DESC) |
| website_analytics_sessions_visitor_id_idx |CREATE INDEX website_analytics_sessions_visitor_id_idx ON public.website_analytics_sessions USING btree (visitor_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can read sessions |SELECT |authenticated |has_edit_role(auth.uid()) | |
| website_analytics_sessions_insert_public |INSERT |anon, authenticated | |((visitor_id IS NOT NULL) AND ((char_length(visitor_id) >= 1) AND (char_length(visitor_id) <= 128)) AND ((landing_path IS NULL) OR (char_length(landing_path) <= 512)) AND ((referrer_host IS NULL) OR (char_length(referrer_host) <= 256)) AND ((device_type IS NULL) OR (char_length(device_type) <= 32)) AND ((user_agent IS NULL) OR (char_length(user_agent) <= 512)) AND ((COALESCE(pageview_count, 0) >= 0) AND (COALESCE(pageview_count, 0) <= 10000)) AND ((COALESCE(duration_seconds, 0) >= 0) AND (COALESCE(duration_seconds, 0) <= 86400))) |
| website_analytics_sessions_select_authenticated |SELECT |authenticated |true | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| trg_restrict_analytics_session_update |BEFORE |UPDATE |ROW |EXECUTE FUNCTION restrict_analytics_session_update() |

## public.website_analytics_web_vitals

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |bigint(64,0) |NO | |YES |NEVER |
| 2 |session_id |uuid |NO | |NO |NEVER |
| 3 |visitor_id |text |NO | |NO |NEVER |
| 4 |pathname |text |NO | |NO |NEVER |
| 5 |metric_id |text |NO | |NO |NEVER |
| 6 |metric_name |text |NO | |NO |NEVER |
| 7 |metric_value |double precision |NO | |NO |NEVER |
| 8 |metric_delta |double precision |NO |0 |NO |NEVER |
| 9 |metric_rating |text |NO |'unknown'::text |NO |NEVER |
| 10 |device_type |text |NO |'desktop'::text |NO |NEVER |
| 11 |occurred_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_20916_10_not_null |CHECK | | | |
| 2200_20916_11_not_null |CHECK | | | |
| 2200_20916_1_not_null |CHECK | | | |
| 2200_20916_2_not_null |CHECK | | | |
| 2200_20916_3_not_null |CHECK | | | |
| 2200_20916_4_not_null |CHECK | | | |
| 2200_20916_5_not_null |CHECK | | | |
| 2200_20916_6_not_null |CHECK | | | |
| 2200_20916_7_not_null |CHECK | | | |
| 2200_20916_8_not_null |CHECK | | | |
| 2200_20916_9_not_null |CHECK | | | |
| website_analytics_web_vitals_pkey |PRIMARY KEY |id |public.website_analytics_web_vitals |id |
| website_analytics_web_vitals_session_id_fkey |FOREIGN KEY |session_id |public.website_analytics_sessions |id |

### Indexes

| Name |Definition |
| --- |--- |
| website_analytics_web_vitals_metric_name_idx |CREATE INDEX website_analytics_web_vitals_metric_name_idx ON public.website_analytics_web_vitals USING btree (metric_name) |
| website_analytics_web_vitals_occurred_at_idx |CREATE INDEX website_analytics_web_vitals_occurred_at_idx ON public.website_analytics_web_vitals USING btree (occurred_at DESC) |
| website_analytics_web_vitals_pkey |CREATE UNIQUE INDEX website_analytics_web_vitals_pkey ON public.website_analytics_web_vitals USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can read web_vitals |SELECT |authenticated |has_edit_role(auth.uid()) | |
| website_analytics_web_vitals_insert_public |INSERT |anon, authenticated | |((session_id IS NOT NULL) AND (visitor_id IS NOT NULL) AND ((char_length(visitor_id) >= 1) AND (char_length(visitor_id) <= 128)) AND (pathname IS NOT NULL) AND ((char_length(pathname) >= 1) AND (char_length(pathname) <= 512)) AND (metric_name IS NOT NULL) AND ((char_length(metric_name) >= 1) AND (char_length(metric_name) <= 64)) AND ((metric_id IS NULL) OR (char_length(metric_id) <= 128)) AND ((metric_rating IS NULL) OR (char_length(metric_rating) <= 32)) AND ((device_type IS NULL) OR (char_length(device_type) <= 32)) AND (metric_value IS NOT NULL) AND (metric_value >= (0)::double precision) AND (metric_value < ('1000000000'::numeric)::double precision)) |
| website_analytics_web_vitals_select_authenticated |SELECT |authenticated |true | |

### Triggers

_None._

## public.website_features

Type: table
RLS enabled: yes
Estimated rows: 3

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |key |text |NO | |NO |NEVER |
| 2 |label |text |NO | |NO |NEVER |
| 3 |description |text |YES | |NO |NEVER |
| 4 |enabled |boolean |NO |false |NO |NEVER |
| 5 |notes |text |YES | |NO |NEVER |
| 6 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_21719_1_not_null |CHECK | | | |
| 2200_21719_2_not_null |CHECK | | | |
| 2200_21719_4_not_null |CHECK | | | |
| 2200_21719_6_not_null |CHECK | | | |
| website_features_pkey |PRIMARY KEY |key |public.website_features |key |

### Indexes

| Name |Definition |
| --- |--- |
| website_features_pkey |CREATE UNIQUE INDEX website_features_pkey ON public.website_features USING btree (key) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Anyone can read website features |SELECT |public |true | |
| Editors can manage website features |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.wholesale_inquiries

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |business_name |text |NO | |NO |NEVER |
| 3 |business_type |text |NO |'other'::text |NO |NEVER |
| 4 |monthly_volume |text |YES | |NO |NEVER |
| 5 |location |text |YES | |NO |NEVER |
| 6 |contact_name |text |NO | |NO |NEVER |
| 7 |email |text |NO | |NO |NEVER |
| 8 |phone |text |YES | |NO |NEVER |
| 9 |referral_source |text |YES | |NO |NEVER |
| 10 |comments |text |YES | |NO |NEVER |
| 11 |status |text |NO |'new'::text |NO |NEVER |
| 12 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18250_11_not_null |CHECK | | | |
| 2200_18250_12_not_null |CHECK | | | |
| 2200_18250_1_not_null |CHECK | | | |
| 2200_18250_2_not_null |CHECK | | | |
| 2200_18250_3_not_null |CHECK | | | |
| 2200_18250_6_not_null |CHECK | | | |
| 2200_18250_7_not_null |CHECK | | | |
| wholesale_inquiries_business_name_length |CHECK | |public.wholesale_inquiries |business_name |
| wholesale_inquiries_comments_length |CHECK | |public.wholesale_inquiries |comments |
| wholesale_inquiries_contact_name_length |CHECK | |public.wholesale_inquiries |contact_name |
| wholesale_inquiries_email_format |CHECK | |public.wholesale_inquiries |email |
| wholesale_inquiries_location_length |CHECK | |public.wholesale_inquiries |location |
| wholesale_inquiries_phone_length |CHECK | |public.wholesale_inquiries |phone |
| wholesale_inquiries_pkey |PRIMARY KEY |id |public.wholesale_inquiries |id |

### Indexes

| Name |Definition |
| --- |--- |
| wholesale_inquiries_pkey |CREATE UNIQUE INDEX wholesale_inquiries_pkey ON public.wholesale_inquiries USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can update wholesale inquiries |UPDATE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Admins can view wholesale inquiries |SELECT |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Anyone can submit wholesale inquiry |INSERT |anon, authenticated | |true |

### Triggers

_None._

## public.wiki_headings

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |slug |text |NO | |NO |NEVER |
| 3 |title |text |NO | |NO |NEVER |
| 4 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 5 |is_active |boolean |NO |true |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18991_1_not_null |CHECK | | | |
| 2200_18991_2_not_null |CHECK | | | |
| 2200_18991_3_not_null |CHECK | | | |
| 2200_18991_4_not_null |CHECK | | | |
| 2200_18991_5_not_null |CHECK | | | |
| 2200_18991_6_not_null |CHECK | | | |
| 2200_18991_7_not_null |CHECK | | | |
| wiki_headings_pkey |PRIMARY KEY |id |public.wiki_headings |id |
| wiki_headings_slug_key |UNIQUE |slug |public.wiki_headings |slug |

### Indexes

| Name |Definition |
| --- |--- |
| wiki_headings_pkey |CREATE UNIQUE INDEX wiki_headings_pkey ON public.wiki_headings USING btree (id) |
| wiki_headings_slug_key |CREATE UNIQUE INDEX wiki_headings_slug_key ON public.wiki_headings USING btree (slug) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete wiki_headings |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert wiki_headings |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update wiki_headings |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select wiki_headings |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## realtime.messages

Type: partitioned table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 3 |topic |text |NO | |NO |NEVER |
| 4 |extension |text |NO | |NO |NEVER |
| 5 |payload |jsonb |YES | |NO |NEVER |
| 6 |event |text |YES | |NO |NEVER |
| 7 |private |boolean |YES |false |NO |NEVER |
| 8 |updated_at |timestamp without time zone |NO |now() |NO |NEVER |
| 9 |inserted_at |timestamp without time zone |NO |now() |NO |NEVER |
| 10 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 11 |binary_payload |bytea |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16559_17527_10_not_null |CHECK | | | |
| 16559_17527_3_not_null |CHECK | | | |
| 16559_17527_4_not_null |CHECK | | | |
| 16559_17527_8_not_null |CHECK | | | |
| 16559_17527_9_not_null |CHECK | | | |
| messages_payload_exclusive |CHECK | | | |
| messages_pkey |PRIMARY KEY |id, inserted_at | | |

### Indexes

| Name |Definition |
| --- |--- |
| messages_inserted_at_topic_index |CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE)) |
| messages_pkey |CREATE UNIQUE INDEX messages_pkey ON ONLY realtime.messages USING btree (id, inserted_at) |

### RLS Policies

_None._

### Triggers

_None._

## realtime.schema_migrations

Type: table
RLS enabled: no
Estimated rows: 81

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |version |bigint(64,0) |NO | |NO |NEVER |
| 2 |inserted_at |timestamp without time zone |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

| Name |Definition |
| --- |--- |
| schema_migrations_pkey |CREATE UNIQUE INDEX schema_migrations_pkey ON realtime.schema_migrations USING btree (version) |

### RLS Policies

_None._

### Triggers

_None._

## realtime.subscription

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |bigint(64,0) |NO | |YES |NEVER |
| 2 |subscription_id |uuid |NO | |NO |NEVER |
| 4 |entity |regclass |NO | |NO |NEVER |
| 5 |filters |realtime._user_defined_filter |NO |'{}'::realtime.user_defined_filter[] |NO |NEVER |
| 7 |claims |jsonb |NO | |NO |NEVER |
| 8 |claims_role |regrole |NO | |NO |ALWAYS |
| 9 |created_at |timestamp without time zone |NO |timezone('utc'::text, now()) |NO |NEVER |
| 10 |action_filter |text |YES |'*'::text |NO |NEVER |
| 11 |selected_columns |ARRAY |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16559_17387_1_not_null |CHECK | | | |
| 16559_17387_2_not_null |CHECK | | | |
| 16559_17387_4_not_null |CHECK | | | |
| 16559_17387_5_not_null |CHECK | | | |
| 16559_17387_7_not_null |CHECK | | | |
| 16559_17387_8_not_null |CHECK | | | |
| 16559_17387_9_not_null |CHECK | | | |
| pk_subscription |PRIMARY KEY |id | | |
| subscription_action_filter_check |CHECK | | | |

### Indexes

| Name |Definition |
| --- |--- |
| ix_realtime_subscription_entity |CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity) |
| pk_subscription |CREATE UNIQUE INDEX pk_subscription ON realtime.subscription USING btree (id) |
| subscription_subscription_id_entity_filters_action_filter_selec |CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_selec ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter, COALESCE(selected_columns, '{}'::text[])) |

### RLS Policies

_None._

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| tr_check_filters |BEFORE |INSERT |ROW |EXECUTE FUNCTION realtime.subscription_check_filters() |
| tr_check_filters |BEFORE |UPDATE |ROW |EXECUTE FUNCTION realtime.subscription_check_filters() |

## storage.buckets

Type: table
RLS enabled: yes
Estimated rows: 6

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |text |NO | |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |owner |uuid |YES | |NO |NEVER |
| 4 |created_at |timestamp with time zone |YES |now() |NO |NEVER |
| 5 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |
| 6 |public |boolean |YES |false |NO |NEVER |
| 7 |avif_autodetection |boolean |YES |false |NO |NEVER |
| 8 |file_size_limit |bigint(64,0) |YES | |NO |NEVER |
| 9 |allowed_mime_types |ARRAY |YES | |NO |NEVER |
| 10 |owner_id |text |YES | |NO |NEVER |
| 11 |type |storage.buckettype |NO |'STANDARD'::storage.buckettype |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16546_17181_11_not_null |CHECK | | | |
| 16546_17181_1_not_null |CHECK | | | |
| 16546_17181_2_not_null |CHECK | | | |
| buckets_pkey |PRIMARY KEY |id | | |

### Indexes

| Name |Definition |
| --- |--- |
| bname |CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name) |
| buckets_pkey |CREATE UNIQUE INDEX buckets_pkey ON storage.buckets USING btree (id) |

### RLS Policies

_None._

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| enforce_bucket_name_length_trigger |BEFORE |UPDATE |ROW |EXECUTE FUNCTION storage.enforce_bucket_name_length() |
| enforce_bucket_name_length_trigger |BEFORE |INSERT |ROW |EXECUTE FUNCTION storage.enforce_bucket_name_length() |
| protect_buckets_delete |BEFORE |DELETE |STATEMENT |EXECUTE FUNCTION storage.protect_delete() |

## storage.buckets_analytics

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |name |text |NO | |NO |NEVER |
| 2 |type |storage.buckettype |NO |'ANALYTICS'::storage.buckettype |NO |NEVER |
| 3 |format |text |NO |'ICEBERG'::text |NO |NEVER |
| 4 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 5 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 7 |deleted_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16546_17300_1_not_null |CHECK | | | |
| 16546_17300_2_not_null |CHECK | | | |
| 16546_17300_3_not_null |CHECK | | | |
| 16546_17300_4_not_null |CHECK | | | |
| 16546_17300_5_not_null |CHECK | | | |
| 16546_17300_6_not_null |CHECK | | | |
| buckets_analytics_pkey |PRIMARY KEY |id | | |

### Indexes

| Name |Definition |
| --- |--- |
| buckets_analytics_pkey |CREATE UNIQUE INDEX buckets_analytics_pkey ON storage.buckets_analytics USING btree (id) |
| buckets_analytics_unique_name_idx |CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL) |

### RLS Policies

_None._

### Triggers

_None._

## storage.buckets_vectors

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |text |NO | |NO |NEVER |
| 2 |type |storage.buckettype |NO |'VECTOR'::storage.buckettype |NO |NEVER |
| 3 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 4 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

_None._

### Indexes

| Name |Definition |
| --- |--- |
| buckets_vectors_pkey |CREATE UNIQUE INDEX buckets_vectors_pkey ON storage.buckets_vectors USING btree (id) |

### RLS Policies

_None._

### Triggers

_None._

## storage.migrations

Type: table
RLS enabled: yes
Estimated rows: 61

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO | |NO |NEVER |
| 2 |name |character varying(100) |NO | |NO |NEVER |
| 3 |hash |character varying(40) |NO | |NO |NEVER |
| 4 |executed_at |timestamp without time zone |YES |CURRENT_TIMESTAMP |NO |NEVER |

### Constraints

_None._

### Indexes

| Name |Definition |
| --- |--- |
| migrations_name_key |CREATE UNIQUE INDEX migrations_name_key ON storage.migrations USING btree (name) |
| migrations_pkey |CREATE UNIQUE INDEX migrations_pkey ON storage.migrations USING btree (id) |

### RLS Policies

_None._

### Triggers

_None._

## storage.objects

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |bucket_id |text |YES | |NO |NEVER |
| 3 |name |text |YES | |NO |NEVER |
| 4 |owner |uuid |YES | |NO |NEVER |
| 5 |created_at |timestamp with time zone |YES |now() |NO |NEVER |
| 6 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |
| 7 |last_accessed_at |timestamp with time zone |YES |now() |NO |NEVER |
| 8 |metadata |jsonb |YES | |NO |NEVER |
| 9 |path_tokens |ARRAY |YES | |NO |ALWAYS |
| 10 |version |text |YES | |NO |NEVER |
| 11 |owner_id |text |YES | |NO |NEVER |
| 12 |user_metadata |jsonb |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16546_17191_1_not_null |CHECK | | | |
| objects_bucketId_fkey |FOREIGN KEY |bucket_id | | |
| objects_pkey |PRIMARY KEY |id | | |

### Indexes

| Name |Definition |
| --- |--- |
| bucketid_objname |CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name) |
| idx_objects_bucket_id_name |CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C") |
| idx_objects_bucket_id_name_lower |CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C") |
| name_prefix_search |CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops) |
| objects_pkey |CREATE UNIQUE INDEX objects_pkey ON storage.objects USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated read access for data-files |SELECT |authenticated |(bucket_id = 'data-files'::text) | |
| Editors can delete from catalog-assets |DELETE |authenticated |((bucket_id = 'catalog-assets'::text) AND has_edit_role(auth.uid())) | |
| Editors can delete from data-files |DELETE |authenticated |((bucket_id = 'data-files'::text) AND has_edit_role(auth.uid())) | |
| Editors can delete from docs |DELETE |authenticated |((bucket_id = 'docs'::text) AND has_edit_role(auth.uid())) | |
| Editors can delete from zenvue-branding |DELETE |authenticated |((bucket_id = 'zenvue-branding'::text) AND has_edit_role(auth.uid())) | |
| Editors can read from docs |SELECT |authenticated |((bucket_id = 'docs'::text) AND has_edit_role(auth.uid())) | |
| Editors can update catalog-assets |UPDATE |authenticated |((bucket_id = 'catalog-assets'::text) AND has_edit_role(auth.uid())) | |
| Editors can update data-files |UPDATE |authenticated |((bucket_id = 'data-files'::text) AND has_edit_role(auth.uid())) | |
| Editors can update docs |UPDATE |authenticated |((bucket_id = 'docs'::text) AND has_edit_role(auth.uid())) |((bucket_id = 'docs'::text) AND has_edit_role(auth.uid())) |
| Editors can update zenvue-branding |UPDATE |authenticated |((bucket_id = 'zenvue-branding'::text) AND has_edit_role(auth.uid())) | |
| Editors can upload to catalog-assets |INSERT |authenticated | |((bucket_id = 'catalog-assets'::text) AND has_edit_role(auth.uid())) |
| Editors can upload to data-files |INSERT |authenticated | |((bucket_id = 'data-files'::text) AND has_edit_role(auth.uid())) |
| Editors can upload to docs |INSERT |authenticated | |((bucket_id = 'docs'::text) AND has_edit_role(auth.uid())) |
| Editors can upload to zenvue-branding |INSERT |authenticated | |((bucket_id = 'zenvue-branding'::text) AND has_edit_role(auth.uid())) |
| Staff can delete videos |DELETE |public |((bucket_id = 'video'::text) AND has_edit_role(auth.uid())) | |
| Staff can update videos |UPDATE |public |((bucket_id = 'video'::text) AND has_edit_role(auth.uid())) | |
| Staff can upload videos |INSERT |public | |((bucket_id = 'video'::text) AND has_edit_role(auth.uid())) |
| Video files are publicly accessible |SELECT |public |(bucket_id = 'video'::text) | |
| catalog assets editor write |ALL |authenticated |((bucket_id = 'catalog-assets'::text) AND has_edit_role(auth.uid())) |((bucket_id = 'catalog-assets'::text) AND has_edit_role(auth.uid())) |
| data files editor write |ALL |authenticated |((bucket_id = 'data-files'::text) AND has_edit_role(auth.uid())) |((bucket_id = 'data-files'::text) AND has_edit_role(auth.uid())) |
| docs editor write |ALL |authenticated |((bucket_id = 'docs'::text) AND has_edit_role(auth.uid())) |((bucket_id = 'docs'::text) AND has_edit_role(auth.uid())) |
| product images editor write |ALL |authenticated |((bucket_id = 'product-images'::text) AND has_edit_role(auth.uid())) |((bucket_id = 'product-images'::text) AND has_edit_role(auth.uid())) |
| product images public read |SELECT |public |(bucket_id = 'product-images'::text) | |
| product_images_editor_write |ALL |authenticated |((bucket_id = 'product-images'::text) AND has_edit_role(auth.uid())) |((bucket_id = 'product-images'::text) AND has_edit_role(auth.uid())) |
| zenvue branding editor write |ALL |authenticated |((bucket_id = 'zenvue-branding'::text) AND has_edit_role(auth.uid())) |((bucket_id = 'zenvue-branding'::text) AND has_edit_role(auth.uid())) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| protect_objects_delete |BEFORE |DELETE |STATEMENT |EXECUTE FUNCTION storage.protect_delete() |
| update_objects_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION storage.update_updated_at_column() |

## storage.s3_multipart_uploads

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |text |NO | |NO |NEVER |
| 2 |in_progress_size |bigint(64,0) |NO |0 |NO |NEVER |
| 3 |upload_signature |text |NO | |NO |NEVER |
| 4 |bucket_id |text |NO | |NO |NEVER |
| 5 |key |text |NO | |NO |NEVER |
| 6 |version |text |NO | |NO |NEVER |
| 7 |owner_id |text |YES | |NO |NEVER |
| 8 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 9 |user_metadata |jsonb |YES | |NO |NEVER |
| 10 |metadata |jsonb |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16546_17240_1_not_null |CHECK | | | |
| 16546_17240_2_not_null |CHECK | | | |
| 16546_17240_3_not_null |CHECK | | | |
| 16546_17240_4_not_null |CHECK | | | |
| 16546_17240_5_not_null |CHECK | | | |
| 16546_17240_6_not_null |CHECK | | | |
| 16546_17240_8_not_null |CHECK | | | |
| s3_multipart_uploads_bucket_id_fkey |FOREIGN KEY |bucket_id | | |
| s3_multipart_uploads_pkey |PRIMARY KEY |id | | |

### Indexes

| Name |Definition |
| --- |--- |
| idx_multipart_uploads_list |CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at) |
| s3_multipart_uploads_pkey |CREATE UNIQUE INDEX s3_multipart_uploads_pkey ON storage.s3_multipart_uploads USING btree (id) |

### RLS Policies

_None._

### Triggers

_None._

## storage.s3_multipart_uploads_parts

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |upload_id |text |NO | |NO |NEVER |
| 3 |size |bigint(64,0) |NO |0 |NO |NEVER |
| 4 |part_number |integer(32,0) |NO | |NO |NEVER |
| 5 |bucket_id |text |NO | |NO |NEVER |
| 6 |key |text |NO | |NO |NEVER |
| 7 |etag |text |NO | |NO |NEVER |
| 8 |owner_id |text |YES | |NO |NEVER |
| 9 |version |text |NO | |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16546_17254_10_not_null |CHECK | | | |
| 16546_17254_1_not_null |CHECK | | | |
| 16546_17254_2_not_null |CHECK | | | |
| 16546_17254_3_not_null |CHECK | | | |
| 16546_17254_4_not_null |CHECK | | | |
| 16546_17254_5_not_null |CHECK | | | |
| 16546_17254_6_not_null |CHECK | | | |
| 16546_17254_7_not_null |CHECK | | | |
| 16546_17254_9_not_null |CHECK | | | |
| s3_multipart_uploads_parts_bucket_id_fkey |FOREIGN KEY |bucket_id | | |
| s3_multipart_uploads_parts_pkey |PRIMARY KEY |id | | |
| s3_multipart_uploads_parts_upload_id_fkey |FOREIGN KEY |upload_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| s3_multipart_uploads_parts_pkey |CREATE UNIQUE INDEX s3_multipart_uploads_parts_pkey ON storage.s3_multipart_uploads_parts USING btree (id) |

### RLS Policies

_None._

### Triggers

_None._

## storage.vector_indexes

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |text |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |bucket_id |text |NO | |NO |NEVER |
| 4 |data_type |text |NO | |NO |NEVER |
| 5 |dimension |integer(32,0) |NO | |NO |NEVER |
| 6 |distance_metric |text |NO | |NO |NEVER |
| 7 |metadata_configuration |jsonb |YES | |NO |NEVER |
| 8 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 9 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

_None._

### Indexes

| Name |Definition |
| --- |--- |
| vector_indexes_name_bucket_id_idx |CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id) |
| vector_indexes_pkey |CREATE UNIQUE INDEX vector_indexes_pkey ON storage.vector_indexes USING btree (id) |

### RLS Policies

_None._

### Triggers

_None._

## supabase_migrations.schema_migrations

Type: table
RLS enabled: no
Estimated rows: 239

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |version |text |NO | |NO |NEVER |
| 2 |statements |ARRAY |YES | |NO |NEVER |
| 3 |name |text |YES | |NO |NEVER |
| 4 |created_by |text |YES | |NO |NEVER |
| 5 |idempotency_key |text |YES | |NO |NEVER |
| 6 |rollback |ARRAY |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 17620_17621_1_not_null |CHECK | | | |
| schema_migrations_idempotency_key_key |UNIQUE |idempotency_key |supabase_migrations.schema_migrations |idempotency_key |
| schema_migrations_pkey |PRIMARY KEY |version |supabase_migrations.schema_migrations |version |

### Indexes

| Name |Definition |
| --- |--- |
| schema_migrations_idempotency_key_key |CREATE UNIQUE INDEX schema_migrations_idempotency_key_key ON supabase_migrations.schema_migrations USING btree (idempotency_key) |
| schema_migrations_pkey |CREATE UNIQUE INDEX schema_migrations_pkey ON supabase_migrations.schema_migrations USING btree (version) |

### RLS Policies

_None._

### Triggers

_None._

## vault.decrypted_secrets

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |YES | |NO |NEVER |
| 2 |name |text |YES | |NO |NEVER |
| 3 |description |text |YES | |NO |NEVER |
| 4 |secret |text |YES | |NO |NEVER |
| 5 |decrypted_secret |text |YES | |NO |NEVER |
| 6 |key_id |uuid |YES | |NO |NEVER |
| 7 |nonce |bytea |YES | |NO |NEVER |
| 8 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 9 |updated_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## vault.secrets

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |YES | |NO |NEVER |
| 3 |description |text |NO |''::text |NO |NEVER |
| 4 |secret |text |NO | |NO |NEVER |
| 5 |key_id |uuid |YES | |NO |NEVER |
| 6 |nonce |bytea |YES |vault._crypto_aead_det_noncegen() |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |CURRENT_TIMESTAMP |NO |NEVER |
| 8 |updated_at |timestamp with time zone |NO |CURRENT_TIMESTAMP |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16607_16612_1_not_null |CHECK | | | |
| 16607_16612_3_not_null |CHECK | | | |
| 16607_16612_4_not_null |CHECK | | | |
| 16607_16612_7_not_null |CHECK | | | |
| 16607_16612_8_not_null |CHECK | | | |
| secrets_pkey |PRIMARY KEY |id | | |

### Indexes

| Name |Definition |
| --- |--- |
| secrets_name_idx |CREATE UNIQUE INDEX secrets_name_idx ON vault.secrets USING btree (name) WHERE (name IS NOT NULL) |
| secrets_pkey |CREATE UNIQUE INDEX secrets_pkey ON vault.secrets USING btree (id) |

### RLS Policies

_None._

### Triggers

_None._

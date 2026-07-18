# Lovable Cloud Schema Inventory

Source file: `tmp\lovable-schema-inventory.json`
Generated: 2026-07-16T19:21:52.596Z

## Summary

| Item |Count |
| --- |--- |
| relations |229 |
| columns |2441 |
| constraints |1989 |
| foreign keys |174 |
| indexes |462 |
| RLS policies |456 |
| triggers |74 |
| functions |238 |
| enum types |16 |
| extensions |8 |
| publications |2 |
| storage buckets |6 |

## Relation Summary

| Relation |Type |RLS |Estimated rows |Columns |Constraints |Indexes |Policies |
| --- |--- |--- |--- |--- |--- |--- |--- |
| auth.audit_log_entries |table |yes |0 |5 |3 |2 |0 |
| auth.custom_oauth_providers |table |no |0 |25 |37 |6 |0 |
| auth.flow_state |table |yes |2 |17 |5 |4 |0 |
| auth.identities |table |yes |22 |9 |8 |4 |0 |
| auth.instances |table |yes |0 |5 |2 |1 |0 |
| auth.mfa_amr_claims |table |yes |19 |5 |8 |2 |0 |
| auth.mfa_challenges |table |yes |0 |7 |6 |2 |0 |
| auth.mfa_factors |table |yes |0 |13 |9 |6 |0 |
| auth.oauth_authorizations |table |no |0 |17 |22 |4 |0 |
| auth.oauth_client_states |table |no |0 |4 |4 |2 |0 |
| auth.oauth_clients |table |no |0 |13 |13 |2 |0 |
| auth.oauth_consents |table |no |0 |6 |12 |5 |0 |
| auth.one_time_tokens |table |yes |4 |7 |10 |4 |0 |
| auth.refresh_tokens |table |yes |1536 |9 |4 |7 |0 |
| auth.saml_providers |table |yes |0 |9 |10 |3 |0 |
| auth.saml_relay_states |table |yes |0 |8 |7 |4 |0 |
| auth.schema_migrations |table |yes |77 |1 |0 |1 |0 |
| auth.sessions |table |yes |19 |15 |6 |5 |0 |
| auth.sso_domains |table |yes |0 |5 |6 |3 |0 |
| auth.sso_providers |table |yes |0 |5 |3 |3 |0 |
| auth.users |table |yes |21 |35 |6 |11 |0 |
| auth.webauthn_challenges |table |no |0 |6 |8 |3 |0 |
| auth.webauthn_credentials |table |no |0 |14 |14 |3 |0 |
| cron.job |table |yes |1 |9 |0 |2 |1 |
| cron.job_run_details |table |yes |1610 |10 |2 |1 |1 |
| extensions.pg_stat_statements |view |no |-1 |49 |0 |0 |0 |
| extensions.pg_stat_statements_info |view |no |-1 |2 |0 |0 |0 |
| net._http_response |table |no |24 |8 |1 |1 |0 |
| net.http_request_queue |table |no |45 |6 |4 |0 |0 |
| pgmq.a_auth_emails |table |no |0 |7 |6 |2 |0 |
| pgmq.a_auth_emails_dlq |table |no |0 |7 |6 |2 |0 |
| pgmq.a_transactional_emails |table |no |0 |7 |6 |2 |0 |
| pgmq.a_transactional_emails_dlq |table |no |0 |7 |6 |2 |0 |
| pgmq.meta |table |no |4 |4 |5 |1 |0 |
| pgmq.q_auth_emails |table |no |0 |6 |5 |2 |0 |
| pgmq.q_auth_emails_dlq |table |no |0 |6 |5 |2 |0 |
| pgmq.q_transactional_emails |table |no |0 |6 |5 |2 |0 |
| pgmq.q_transactional_emails_dlq |table |no |46 |6 |5 |2 |0 |
| public.abandoned_cart_alerts |table |yes |1 |12 |15 |2 |2 |
| public.activities |table |yes |0 |10 |8 |1 |4 |
| public.addon_pricing_sheets |table |yes |15 |5 |8 |2 |4 |
| public.addons |table |yes |82 |15 |15 |1 |4 |
| public.addons_public |view |no |-1 |14 |0 |0 |0 |
| public.admin_notification_receipts |table |yes |1 |7 |9 |2 |2 |
| public.admin_notifications |table |yes |1 |10 |11 |3 |2 |
| public.api_audit_log |table |yes |111 |10 |7 |2 |1 |
| public.api_keys |table |yes |6 |12 |11 |2 |1 |
| public.audit_log |table |yes |3845 |10 |7 |4 |2 |
| public.balances |table |yes |88 |10 |4 |2 |3 |
| public.balances_public |view |no |-1 |9 |0 |0 |0 |
| public.bank_payment_portals |table |yes |10 |5 |3 |2 |2 |
| public.blog_posts |table |yes |21 |22 |14 |6 |2 |
| public.brands |table |yes |164 |7 |9 |2 |5 |
| public.cadence_enrollments |table |yes |0 |8 |10 |3 |2 |
| public.cadence_steps |table |yes |8 |7 |9 |2 |2 |
| public.cadences |table |yes |2 |7 |7 |1 |2 |
| public.cart_drafts |table |yes |1 |9 |10 |2 |4 |
| public.cart_items |table |yes |1 |17 |14 |2 |4 |
| public.catalog_assignments |table |yes |0 |4 |4 |1 |4 |
| public.catalog_live |view |no |-1 |19 |0 |0 |0 |
| public.catalog_page_objects |table |yes |33 |16 |16 |1 |2 |
| public.catalog_pages |table |yes |8 |6 |9 |2 |2 |
| public.catalog_sections |table |yes |15 |9 |7 |1 |4 |
| public.catalog_templates |table |yes |4 |10 |4 |1 |4 |
| public.charge_types |table |yes |12 |6 |8 |2 |4 |
| public.company_settings |table |yes |1 |46 |45 |1 |2 |
| public.contact_sync_dead_letters |table |yes |0 |14 |16 |2 |1 |
| public.contact_sync_manual_review_queue |table |yes |0 |11 |11 |1 |1 |
| public.contact_sync_runs |table |yes |0 |15 |17 |1 |1 |
| public.contact_tag_links |table |yes |8 |3 |7 |2 |3 |
| public.contact_tags |table |yes |6 |6 |7 |1 |4 |
| public.contacts |table |yes |770 |46 |20 |9 |4 |
| public.crm_pipelines |table |yes |3 |4 |5 |1 |2 |
| public.customer_account_number_duplicates |view |no |-1 |4 |0 |0 |0 |
| public.customer_addresses |table |yes |6 |14 |16 |2 |4 |
| public.customer_automation_outbox |table |yes |1 |9 |11 |1 |1 |
| public.customer_order_health |view |no |-1 |9 |0 |0 |0 |
| public.customer_payment_methods |table |yes |0 |14 |21 |3 |4 |
| public.customer_payment_profile_public |view |no |-1 |7 |0 |0 |0 |
| public.customer_portal_feature_overrides |table |yes |16 |6 |10 |2 |2 |
| public.customer_pricing_access |table |yes |10 |4 |7 |2 |2 |
| public.customers |table |yes |83 |20 |7 |4 |4 |
| public.docstudio_billing_documents |table |yes |1 |21 |15 |2 |2 |
| public.docstudio_files |table |yes |7 |16 |12 |2 |2 |
| public.edge_function_health |table |yes |0 |8 |6 |2 |1 |
| public.edge_function_health_runs |table |yes |0 |8 |9 |2 |1 |
| public.email_send_log |table |yes |114 |8 |7 |5 |3 |
| public.email_send_state |table |yes |1 |7 |8 |1 |1 |
| public.email_unsubscribe_tokens |table |yes |7 |5 |7 |4 |3 |
| public.finishtypes |table |yes |7 |7 |9 |2 |5 |
| public.help_article_contexts |table |yes |19 |3 |6 |2 |4 |
| public.help_articles |table |yes |50 |14 |13 |3 |5 |
| public.help_feedback |table |yes |23 |7 |8 |1 |3 |
| public.helpdesk_followup_queue |table |yes |0 |7 |8 |2 |4 |
| public.helpdesk_inbound_email_log |table |yes |7 |7 |7 |2 |1 |
| public.helpdesk_priorities |table |yes |6 |7 |7 |2 |2 |
| public.helpdesk_sla_policies |table |yes |2 |11 |10 |1 |4 |
| public.helpdesk_team_members |table |yes |7 |5 |8 |2 |2 |
| public.helpdesk_teams |table |yes |2 |9 |10 |2 |4 |
| public.helpdesk_ticket_events |table |yes |380 |6 |6 |2 |5 |
| public.helpdesk_ticket_messages |table |yes |11 |9 |10 |2 |3 |
| public.helpdesk_ticket_review_queue_items |table |yes |2 |10 |8 |1 |1 |
| public.helpdesk_ticket_sla_status |table |yes |0 |8 |10 |2 |3 |
| public.helpdesk_ticket_stages |table |yes |5 |8 |10 |2 |4 |
| public.helpdesk_ticket_tag_rel |table |yes |0 |3 |7 |2 |2 |
| public.helpdesk_ticket_tags |table |yes |4 |5 |7 |2 |2 |
| public.helpdesk_ticket_types |table |yes |5 |7 |8 |2 |2 |
| public.helpdesk_ticket_watchers |table |yes |3 |10 |11 |3 |4 |
| public.helpdesk_tickets |table |yes |166 |28 |18 |6 |4 |
| public.import_batches |table |yes |5 |9 |10 |1 |4 |
| public.import_ref_mappings |table |yes |136 |5 |7 |2 |4 |
| public.industries |table |yes |10 |6 |7 |1 |4 |
| public.innovations_sync_dead_letters |table |yes |3219 |9 |8 |2 |1 |
| public.innovations_sync_requests |table |yes |2 |9 |7 |2 |1 |
| public.innovations_sync_runs |table |yes |30005 |12 |13 |2 |1 |
| public.integration_audit_events |table |yes |21 |8 |9 |2 |1 |
| public.integration_conflict_queue |table |yes |0 |14 |14 |2 |1 |
| public.integration_connection_secrets |table |yes |1 |6 |9 |2 |1 |
| public.integration_connections |table |yes |1 |27 |26 |2 |1 |
| public.integration_health_metrics_dashboard |view |no |-1 |7 |0 |0 |0 |
| public.integration_structured_logs |table |yes |17 |9 |11 |2 |1 |
| public.integration_sync_errors |table |yes |0 |20 |21 |3 |1 |
| public.integration_sync_jobs |table |yes |5 |13 |15 |1 |1 |
| public.integration_sync_run_metrics |table |yes |0 |14 |12 |2 |1 |
| public.lead_audits |table |yes |0 |6 |4 |1 |4 |
| public.lead_provider_credentials |table |yes |2 |6 |8 |2 |1 |
| public.legacy_rates |table |yes |7 |10 |11 |2 |2 |
| public.lens_lens_options |table |yes |1456 |4 |8 |2 |4 |
| public.lens_options |table |yes |917 |7 |9 |2 |4 |
| public.lens_recommendation_rule_sets |table |yes |0 |10 |11 |3 |1 |
| public.lens_recommendation_rules |table |yes |0 |13 |17 |2 |1 |
| public.lenses |table |yes |1458 |31 |29 |1 |4 |
| public.lenses_public |view |no |-1 |9 |0 |0 |0 |
| public.lenstypes |table |yes |960 |7 |9 |2 |5 |
| public.live_data_gateway_agents |table |yes |1 |7 |7 |1 |0 |
| public.live_data_gateway_requests |table |yes |0 |18 |18 |3 |0 |
| public.material_upgrades |table |yes |0 |7 |4 |1 |4 |
| public.materials |table |yes |20 |7 |9 |2 |5 |
| public.matrix_allocations |table |yes |909 |9 |8 |2 |4 |
| public.mftypes |table |yes |6 |7 |9 |2 |5 |
| public.notes |table |yes |0 |5 |5 |1 |4 |
| public.opportunities |table |yes |0 |14 |6 |3 |4 |
| public.order_activity |table |yes |66 |8 |7 |3 |2 |
| public.order_items |table |yes |39 |17 |14 |1 |3 |
| public.order_payment_events |table |yes |5 |5 |7 |2 |2 |
| public.order_payment_links |table |yes |0 |8 |12 |3 |2 |
| public.order_payments |table |yes |5 |13 |14 |3 |3 |
| public.order_revisions |table |yes |0 |9 |9 |2 |2 |
| public.orders |table |yes |10 |12 |9 |1 |3 |
| public.outreach_outbox |table |yes |0 |13 |12 |3 |2 |
| public.price_catalog |table |yes |0 |5 |2 |1 |4 |
| public.price_matrix |table |yes |10 |10 |4 |2 |4 |
| public.pricelist_catalog_rows |table |yes |724 |12 |13 |2 |4 |
| public.pricelist_child_sections |table |yes |10 |7 |5 |1 |4 |
| public.pricelist_line_overrides |table |yes |21 |7 |5 |1 |4 |
| public.pricelist_lines |table |yes |302 |10 |13 |2 |1 |
| public.pricelist_notes |table |yes |0 |4 |2 |1 |4 |
| public.pricelist_overrides |table |yes |112 |7 |3 |1 |4 |
| public.pricelist_variance |view |no |-1 |6 |0 |0 |0 |
| public.pricelist_versions |table |yes |4 |11 |4 |1 |4 |
| public.pricelists |table |yes |2 |7 |8 |3 |1 |
| public.pricing_audit |table |yes |303 |8 |6 |1 |1 |
| public.pricing_input_rows |table |yes |1369 |9 |10 |1 |4 |
| public.pricing_items |table |yes |325 |5 |7 |2 |3 |
| public.pricing_settings |table |yes |3 |30 |30 |1 |4 |
| public.pricing_sheets |table |yes |2 |7 |7 |1 |4 |
| public.product_variant_configs |table |yes |3 |10 |12 |2 |1 |
| public.product_variants |table |yes |0 |20 |19 |4 |1 |
| public.profiles |table |yes |21 |23 |9 |3 |6 |
| public.public_inquiries |table |yes |41 |13 |7 |1 |2 |
| public.quote_lines |table |yes |48 |25 |25 |1 |4 |
| public.quote_lines_customer |view |no |-1 |15 |0 |0 |0 |
| public.quotes |table |yes |17 |23 |18 |2 |4 |
| public.quotes_customer |view |no |-1 |18 |0 |0 |0 |
| public.role_permissions |table |yes |116 |7 |9 |2 |2 |
| public.rx_details |table |yes |3 |52 |7 |2 |5 |
| public.rx_order_drafts |table |yes |0 |10 |11 |2 |1 |
| public.rx_price_categories |table |yes |104 |8 |11 |2 |4 |
| public.rx_price_category_versions |table |yes |200 |8 |10 |2 |4 |
| public.rx_price_grouping_versions |table |yes |24 |8 |10 |2 |4 |
| public.rx_price_groupings |table |yes |10 |7 |9 |2 |4 |
| public.shipment_charges |table |yes |431 |11 |9 |1 |4 |
| public.shipment_lines |table |yes |70 |14 |17 |1 |4 |
| public.shipment_types |table |yes |5 |7 |10 |3 |4 |
| public.shipments |table |yes |110 |20 |21 |1 |4 |
| public.statement_lines |table |yes |75583 |14 |8 |3 |3 |
| public.statement_lines_public |view |no |-1 |10 |0 |0 |0 |
| public.statements |table |yes |4077 |28 |11 |4 |3 |
| public.statements_public |view |no |-1 |17 |0 |0 |0 |
| public.store_product_media |table |yes |3 |8 |10 |2 |2 |
| public.store_product_overrides |table |yes |3 |8 |10 |3 |2 |
| public.store_product_variant_settings |table |yes |5 |11 |10 |2 |1 |
| public.store_product_variant_summary |view |no |-1 |7 |0 |0 |0 |
| public.store_product_variants |table |yes |239 |21 |19 |4 |2 |
| public.store_product_variants_public |view |no |-1 |18 |0 |0 |0 |
| public.store_variant_audit_logs |table |yes |250 |7 |5 |2 |2 |
| public.suppliers |table |yes |42 |7 |9 |2 |5 |
| public.supplies |table |yes |39 |28 |26 |1 |4 |
| public.supplies_public |view |no |-1 |8 |0 |0 |0 |
| public.supply_categories |table |yes |8 |7 |8 |1 |4 |
| public.suppressed_emails |table |yes |0 |5 |7 |3 |2 |
| public.user_presence |table |yes |14 |7 |11 |1 |2 |
| public.user_roles |table |yes |19 |3 |6 |2 |5 |
| public.website_analytics_pageviews |table |yes |85 |7 |9 |3 |2 |
| public.website_analytics_sessions |table |yes |23 |14 |16 |3 |2 |
| public.website_analytics_web_vitals |table |yes |202 |11 |13 |3 |2 |
| public.website_features |table |yes |3 |6 |5 |1 |2 |
| public.wholesale_inquiries |table |yes |1 |12 |14 |1 |3 |
| public.wiki_headings |table |yes |2 |7 |9 |2 |4 |
| realtime.messages |partitioned table |yes |0 |9 |7 |2 |0 |
| realtime.messages_2026_07_14 |table |no |0 |9 |7 |2 |0 |
| realtime.messages_2026_07_15 |table |no |0 |9 |7 |2 |0 |
| realtime.messages_2026_07_16 |table |no |0 |9 |7 |2 |0 |
| realtime.messages_2026_07_17 |table |no |0 |9 |7 |2 |0 |
| realtime.messages_2026_07_18 |table |no |0 |9 |7 |2 |0 |
| realtime.messages_2026_07_19 |table |no |0 |9 |7 |2 |0 |
| realtime.schema_migrations |table |no |81 |2 |0 |1 |0 |
| realtime.subscription |table |no |0 |9 |9 |3 |0 |
| storage.buckets |table |yes |6 |11 |4 |2 |0 |
| storage.buckets_analytics |table |yes |0 |7 |7 |2 |0 |
| storage.buckets_vectors |table |yes |0 |4 |0 |1 |0 |
| storage.migrations |table |yes |61 |4 |0 |2 |0 |
| storage.objects |table |yes |28 |12 |3 |5 |20 |
| storage.s3_multipart_uploads |table |yes |0 |10 |9 |2 |0 |
| storage.s3_multipart_uploads_parts |table |yes |0 |10 |12 |1 |0 |
| storage.vector_indexes |table |yes |0 |9 |0 |2 |0 |
| supabase_migrations.schema_migrations |table |no |149 |6 |3 |2 |0 |
| vault.decrypted_secrets |view |no |-1 |9 |0 |0 |0 |
| vault.secrets |table |no |1 |8 |6 |2 |0 |

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

| Bucket |Object count |
| --- |--- |
| data-files |13 |
| product-images |3 |
| video |1 |
| zenvue-branding |11 |

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
| 16494_16525_2_not_null |CHECK | | | |
| 16494_16525_5_not_null |CHECK | | | |
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
| 16494_94614_10_not_null |CHECK | | | |
| 16494_94614_11_not_null |CHECK | | | |
| 16494_94614_12_not_null |CHECK | | | |
| 16494_94614_13_not_null |CHECK | | | |
| 16494_94614_16_not_null |CHECK | | | |
| 16494_94614_1_not_null |CHECK | | | |
| 16494_94614_23_not_null |CHECK | | | |
| 16494_94614_24_not_null |CHECK | | | |
| 16494_94614_25_not_null |CHECK | | | |
| 16494_94614_2_not_null |CHECK | | | |
| 16494_94614_3_not_null |CHECK | | | |
| 16494_94614_4_not_null |CHECK | | | |
| 16494_94614_5_not_null |CHECK | | | |
| 16494_94614_6_not_null |CHECK | | | |
| 16494_94614_7_not_null |CHECK | | | |
| 16494_94614_8_not_null |CHECK | | | |
| 16494_94614_9_not_null |CHECK | | | |
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
Estimated rows: 2

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
| 16494_16883_11_not_null |CHECK | | | |
| 16494_16883_17_not_null |CHECK | | | |
| 16494_16883_1_not_null |CHECK | | | |
| 16494_16883_6_not_null |CHECK | | | |
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
Estimated rows: 22

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
| 16494_16681_1_not_null |CHECK | | | |
| 16494_16681_2_not_null |CHECK | | | |
| 16494_16681_3_not_null |CHECK | | | |
| 16494_16681_4_not_null |CHECK | | | |
| 16494_16681_9_not_null |CHECK | | | |
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
| 16494_16518_1_not_null |CHECK | | | |
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
Estimated rows: 19

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
| 16494_16770_1_not_null |CHECK | | | |
| 16494_16770_2_not_null |CHECK | | | |
| 16494_16770_3_not_null |CHECK | | | |
| 16494_16770_4_not_null |CHECK | | | |
| 16494_16770_5_not_null |CHECK | | | |
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
| 16494_16758_1_not_null |CHECK | | | |
| 16494_16758_2_not_null |CHECK | | | |
| 16494_16758_3_not_null |CHECK | | | |
| 16494_16758_5_not_null |CHECK | | | |
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
| 16494_16745_1_not_null |CHECK | | | |
| 16494_16745_2_not_null |CHECK | | | |
| 16494_16745_4_not_null |CHECK | | | |
| 16494_16745_5_not_null |CHECK | | | |
| 16494_16745_6_not_null |CHECK | | | |
| 16494_16745_7_not_null |CHECK | | | |
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
| 16494_16995_11_not_null |CHECK | | | |
| 16494_16995_12_not_null |CHECK | | | |
| 16494_16995_14_not_null |CHECK | | | |
| 16494_16995_15_not_null |CHECK | | | |
| 16494_16995_1_not_null |CHECK | | | |
| 16494_16995_2_not_null |CHECK | | | |
| 16494_16995_3_not_null |CHECK | | | |
| 16494_16995_5_not_null |CHECK | | | |
| 16494_16995_6_not_null |CHECK | | | |
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
| 16494_17068_1_not_null |CHECK | | | |
| 16494_17068_2_not_null |CHECK | | | |
| 16494_17068_4_not_null |CHECK | | | |
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
| 16494_16965_10_not_null |CHECK | | | |
| 16494_16965_11_not_null |CHECK | | | |
| 16494_16965_13_not_null |CHECK | | | |
| 16494_16965_14_not_null |CHECK | | | |
| 16494_16965_1_not_null |CHECK | | | |
| 16494_16965_4_not_null |CHECK | | | |
| 16494_16965_5_not_null |CHECK | | | |
| 16494_16965_6_not_null |CHECK | | | |
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
| 16494_17028_1_not_null |CHECK | | | |
| 16494_17028_2_not_null |CHECK | | | |
| 16494_17028_3_not_null |CHECK | | | |
| 16494_17028_4_not_null |CHECK | | | |
| 16494_17028_5_not_null |CHECK | | | |
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
Estimated rows: 4

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
| 16494_16933_1_not_null |CHECK | | | |
| 16494_16933_2_not_null |CHECK | | | |
| 16494_16933_3_not_null |CHECK | | | |
| 16494_16933_4_not_null |CHECK | | | |
| 16494_16933_5_not_null |CHECK | | | |
| 16494_16933_6_not_null |CHECK | | | |
| 16494_16933_7_not_null |CHECK | | | |
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
Estimated rows: 1536

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
| 16494_16507_2_not_null |CHECK | | | |
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
| 16494_16812_1_not_null |CHECK | | | |
| 16494_16812_2_not_null |CHECK | | | |
| 16494_16812_3_not_null |CHECK | | | |
| 16494_16812_4_not_null |CHECK | | | |
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
| 16494_16830_1_not_null |CHECK | | | |
| 16494_16830_2_not_null |CHECK | | | |
| 16494_16830_3_not_null |CHECK | | | |
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
Estimated rows: 19

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
| 16494_16711_1_not_null |CHECK | | | |
| 16494_16711_2_not_null |CHECK | | | |
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
| 16494_16797_1_not_null |CHECK | | | |
| 16494_16797_2_not_null |CHECK | | | |
| 16494_16797_3_not_null |CHECK | | | |
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
| 16494_16788_1_not_null |CHECK | | | |
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
Estimated rows: 21

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
| 16494_16495_2_not_null |CHECK | | | |
| 16494_16495_33_not_null |CHECK | | | |
| 16494_16495_35_not_null |CHECK | | | |
| users_email_change_confirm_status_check |CHECK | | | |
| users_phone_key |UNIQUE |phone | | |
| users_pkey |PRIMARY KEY |id | | |

### Indexes

| Name |Definition |
| --- |--- |
| confirmation_token_idx |CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text) |
| email_change_token_current_idx |CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text) |
| email_change_token_new_idx |CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text) |
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
| on_auth_user_email_change |AFTER |INSERT |ROW |EXECUTE FUNCTION sync_auth_email_to_profile() |
| on_auth_user_email_change |AFTER |UPDATE |ROW |EXECUTE FUNCTION sync_auth_email_to_profile() |

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
| 16494_103821_1_not_null |CHECK | | | |
| 16494_103821_3_not_null |CHECK | | | |
| 16494_103821_4_not_null |CHECK | | | |
| 16494_103821_5_not_null |CHECK | | | |
| 16494_103821_6_not_null |CHECK | | | |
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
| 16494_103798_10_not_null |CHECK | | | |
| 16494_103798_11_not_null |CHECK | | | |
| 16494_103798_12_not_null |CHECK | | | |
| 16494_103798_13_not_null |CHECK | | | |
| 16494_103798_1_not_null |CHECK | | | |
| 16494_103798_2_not_null |CHECK | | | |
| 16494_103798_3_not_null |CHECK | | | |
| 16494_103798_4_not_null |CHECK | | | |
| 16494_103798_5_not_null |CHECK | | | |
| 16494_103798_7_not_null |CHECK | | | |
| 16494_103798_8_not_null |CHECK | | | |
| 16494_103798_9_not_null |CHECK | | | |
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
Estimated rows: 1

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
Estimated rows: 1610

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
| 93296_93317_2_not_null |CHECK | | | |
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
Estimated rows: 24

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
| 93347_93359_8_not_null |CHECK | | | |

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
Estimated rows: 45

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
| 93347_93352_1_not_null |CHECK | | | |
| 93347_93352_2_not_null |CHECK | | | |
| 93347_93352_3_not_null |CHECK | | | |
| 93347_93352_6_not_null |CHECK | | | |

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
| 120327_120399_1_not_null |CHECK | | | |
| 120327_120399_2_not_null |CHECK | | | |
| 120327_120399_3_not_null |CHECK | | | |
| 120327_120399_4_not_null |CHECK | | | |
| 120327_120399_5_not_null |CHECK | | | |
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
| 120327_120443_1_not_null |CHECK | | | |
| 120327_120443_2_not_null |CHECK | | | |
| 120327_120443_3_not_null |CHECK | | | |
| 120327_120443_4_not_null |CHECK | | | |
| 120327_120443_5_not_null |CHECK | | | |
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
| 120327_120421_1_not_null |CHECK | | | |
| 120327_120421_2_not_null |CHECK | | | |
| 120327_120421_3_not_null |CHECK | | | |
| 120327_120421_4_not_null |CHECK | | | |
| 120327_120421_5_not_null |CHECK | | | |
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
| 120327_120465_1_not_null |CHECK | | | |
| 120327_120465_2_not_null |CHECK | | | |
| 120327_120465_3_not_null |CHECK | | | |
| 120327_120465_4_not_null |CHECK | | | |
| 120327_120465_5_not_null |CHECK | | | |
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
| 120327_120329_1_not_null |CHECK | | | |
| 120327_120329_2_not_null |CHECK | | | |
| 120327_120329_3_not_null |CHECK | | | |
| 120327_120329_4_not_null |CHECK | | | |
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
| 120327_120390_1_not_null |CHECK | | | |
| 120327_120390_2_not_null |CHECK | | | |
| 120327_120390_3_not_null |CHECK | | | |
| 120327_120390_4_not_null |CHECK | | | |
| q_auth_emails_pkey |PRIMARY KEY |msg_id |pgmq.q_auth_emails |msg_id |

### Indexes

| Name |Definition |
| --- |--- |
| q_auth_emails_pkey |CREATE UNIQUE INDEX q_auth_emails_pkey ON pgmq.q_auth_emails USING btree (msg_id) |
| q_auth_emails_vt_idx |CREATE INDEX q_auth_emails_vt_idx ON pgmq.q_auth_emails USING btree (vt) |

### RLS Policies

_None._

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| email_queue_wake_auth |AFTER |INSERT |STATEMENT |EXECUTE FUNCTION email_queue_wake() |

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
| 120327_120434_1_not_null |CHECK | | | |
| 120327_120434_2_not_null |CHECK | | | |
| 120327_120434_3_not_null |CHECK | | | |
| 120327_120434_4_not_null |CHECK | | | |
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
| 120327_120412_1_not_null |CHECK | | | |
| 120327_120412_2_not_null |CHECK | | | |
| 120327_120412_3_not_null |CHECK | | | |
| 120327_120412_4_not_null |CHECK | | | |
| q_transactional_emails_pkey |PRIMARY KEY |msg_id |pgmq.q_transactional_emails |msg_id |

### Indexes

| Name |Definition |
| --- |--- |
| q_transactional_emails_pkey |CREATE UNIQUE INDEX q_transactional_emails_pkey ON pgmq.q_transactional_emails USING btree (msg_id) |
| q_transactional_emails_vt_idx |CREATE INDEX q_transactional_emails_vt_idx ON pgmq.q_transactional_emails USING btree (vt) |

### RLS Policies

_None._

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| email_queue_wake_transactional |AFTER |INSERT |STATEMENT |EXECUTE FUNCTION email_queue_wake() |

## pgmq.q_transactional_emails_dlq

Type: table
RLS enabled: no
Estimated rows: 46

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
| 120327_120456_1_not_null |CHECK | | | |
| 120327_120456_2_not_null |CHECK | | | |
| 120327_120456_3_not_null |CHECK | | | |
| 120327_120456_4_not_null |CHECK | | | |
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
Estimated rows: 1

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
| 2200_106242_1_not_null |CHECK | | | |
| 2200_106242_2_not_null |CHECK | | | |
| 2200_106242_3_not_null |CHECK | | | |
| 2200_106242_4_not_null |CHECK | | | |
| 2200_106242_5_not_null |CHECK | | | |
| 2200_106242_6_not_null |CHECK | | | |
| 2200_106242_7_not_null |CHECK | | | |
| 2200_106242_8_not_null |CHECK | | | |
| 2200_106242_9_not_null |CHECK | | | |
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
| 1 |id |uuid |NO |uuid_generate_v4() |NO |NEVER |
| 2 |contact_id |uuid |NO | |NO |NEVER |
| 3 |opportunity_id |uuid |YES | |NO |NEVER |
| 4 |type |text |NO | |NO |NEVER |
| 5 |content |text |YES | |NO |NEVER |
| 6 |created_by |uuid |YES | |NO |NEVER |
| 7 |created_at |timestamp with time zone |YES |now() |NO |NEVER |
| 8 |activity_type |text |YES |''::text |NO |NEVER |
| 9 |status |text |YES |'pending'::text |NO |NEVER |
| 10 |due_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_81079_1_not_null |CHECK | | | |
| 2200_81079_2_not_null |CHECK | | | |
| 2200_81079_4_not_null |CHECK | | | |
| activities_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| activities_created_by_fkey |FOREIGN KEY |created_by | | |
| activities_opportunity_id_fkey |FOREIGN KEY |opportunity_id |public.opportunities |id |
| activities_pkey |PRIMARY KEY |id |public.activities |id |
| activities_type_check |CHECK | |public.activities |type |

### Indexes

| Name |Definition |
| --- |--- |
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
Estimated rows: 15

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
| 2200_66553_1_not_null |CHECK | | | |
| 2200_66553_2_not_null |CHECK | | | |
| 2200_66553_3_not_null |CHECK | | | |
| 2200_66553_5_not_null |CHECK | | | |
| addon_pricing_sheets_addon_id_fkey |FOREIGN KEY |addon_id |public.addons |id |
| addon_pricing_sheets_addon_id_pricing_sheet_id_key |UNIQUE |addon_id, addon_id, pricing_sheet_id, pricing_sheet_id |public.addon_pricing_sheets |pricing_sheet_id, addon_id, pricing_sheet_id, addon_id |
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
Estimated rows: 82

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
| 2200_66529_10_not_null |CHECK | | | |
| 2200_66529_11_not_null |CHECK | | | |
| 2200_66529_12_not_null |CHECK | | | |
| 2200_66529_13_not_null |CHECK | | | |
| 2200_66529_15_not_null |CHECK | | | |
| 2200_66529_1_not_null |CHECK | | | |
| 2200_66529_2_not_null |CHECK | | | |
| 2200_66529_3_not_null |CHECK | | | |
| 2200_66529_4_not_null |CHECK | | | |
| 2200_66529_5_not_null |CHECK | | | |
| 2200_66529_6_not_null |CHECK | | | |
| 2200_66529_8_not_null |CHECK | | | |
| 2200_66529_9_not_null |CHECK | | | |
| addons_pkey |PRIMARY KEY |id |public.addons |id |
| addons_supplier_id_fkey |FOREIGN KEY |supplier_id |public.suppliers |id |

### Indexes

| Name |Definition |
| --- |--- |
| addons_pkey |CREATE UNIQUE INDEX addons_pkey ON public.addons USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete addons |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert addons |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update addons |UPDATE |public |has_edit_role(auth.uid()) | |
| Staff can select addons |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_addons_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.addons_public

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |YES | |NO |NEVER |
| 2 |supplier_id |uuid |YES | |NO |NEVER |
| 3 |name |text |YES | |NO |NEVER |
| 4 |sku |text |YES | |NO |NEVER |
| 5 |category |text |YES | |NO |NEVER |
| 6 |description |text |YES | |NO |NEVER |
| 7 |price |numeric |YES | |NO |NEVER |
| 8 |is_active |boolean |YES | |NO |NEVER |
| 9 |is_auto |boolean |YES | |NO |NEVER |
| 10 |auto_rule |jsonb |YES | |NO |NEVER |
| 11 |show_on_website |boolean |YES | |NO |NEVER |
| 12 |sort_order |integer(32,0) |YES | |NO |NEVER |
| 13 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 14 |updated_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.admin_notification_receipts

Type: table
RLS enabled: yes
Estimated rows: 1

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
| 2200_114784_1_not_null |CHECK | | | |
| 2200_114784_2_not_null |CHECK | | | |
| 2200_114784_3_not_null |CHECK | | | |
| 2200_114784_6_not_null |CHECK | | | |
| 2200_114784_7_not_null |CHECK | | | |
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
Estimated rows: 1

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
| 2200_106201_10_not_null |CHECK | | | |
| 2200_106201_1_not_null |CHECK | | | |
| 2200_106201_2_not_null |CHECK | | | |
| 2200_106201_3_not_null |CHECK | | | |
| 2200_106201_4_not_null |CHECK | | | |
| 2200_106201_5_not_null |CHECK | | | |
| 2200_106201_7_not_null |CHECK | | | |
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
| Staff can read admin notifications |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.api_audit_log

Type: table
RLS enabled: yes
Estimated rows: 111

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
| 2200_127391_10_not_null |CHECK | | | |
| 2200_127391_1_not_null |CHECK | | | |
| 2200_127391_3_not_null |CHECK | | | |
| 2200_127391_4_not_null |CHECK | | | |
| 2200_127391_6_not_null |CHECK | | | |
| api_audit_log_api_key_id_fkey |FOREIGN KEY |api_key_id |public.api_keys |id |
| api_audit_log_pkey |PRIMARY KEY |id |public.api_audit_log |id |

### Indexes

| Name |Definition |
| --- |--- |
| api_audit_log_key_created_idx |CREATE INDEX api_audit_log_key_created_idx ON public.api_audit_log USING btree (api_key_id, created_at DESC) |
| api_audit_log_pkey |CREATE UNIQUE INDEX api_audit_log_pkey ON public.api_audit_log USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins read api audit log |SELECT |authenticated |has_role(auth.uid(), 'admin'::app_role) | |

### Triggers

_None._

## public.api_keys

Type: table
RLS enabled: yes
Estimated rows: 6

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
| 2200_127371_10_not_null |CHECK | | | |
| 2200_127371_11_not_null |CHECK | | | |
| 2200_127371_1_not_null |CHECK | | | |
| 2200_127371_2_not_null |CHECK | | | |
| 2200_127371_3_not_null |CHECK | | | |
| 2200_127371_4_not_null |CHECK | | | |
| 2200_127371_5_not_null |CHECK | | | |
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
| Admins manage api keys |ALL |authenticated |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| api_keys_set_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION set_updated_at_timestamp() |

## public.audit_log

Type: table
RLS enabled: yes
Estimated rows: 3845

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
| 2200_66667_1_not_null |CHECK | | | |
| 2200_66667_2_not_null |CHECK | | | |
| 2200_66667_3_not_null |CHECK | | | |
| 2200_66667_4_not_null |CHECK | | | |
| 2200_66667_5_not_null |CHECK | | | |
| 2200_66667_6_not_null |CHECK | | | |
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
| Editors can insert audit_log |INSERT |public | |has_edit_role(auth.uid()) |
| Staff can select audit_log |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.balances

Type: table
RLS enabled: yes
Estimated rows: 88

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
| 2200_128464_10_not_null |CHECK | | | |
| 2200_128464_1_not_null |CHECK | | | |
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
| Service role full access balances |ALL |service_role |true |true |
| Staff full read on balances |SELECT |authenticated |has_edit_role(auth.uid()) | |

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
Estimated rows: 10

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
| 2200_128416_1_not_null |CHECK | | | |
| 2200_128416_4_not_null |CHECK | | | |
| bank_payment_portals_pkey |PRIMARY KEY |bank_name |public.bank_payment_portals |bank_name |

### Indexes

| Name |Definition |
| --- |--- |
| bank_payment_portals_innovations_eft_institution_id_key |CREATE UNIQUE INDEX bank_payment_portals_innovations_eft_institution_id_key ON public.bank_payment_portals USING btree (innovations_eft_institution_id) |
| bank_payment_portals_pkey |CREATE UNIQUE INDEX bank_payment_portals_pkey ON public.bank_payment_portals USING btree (bank_name) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated read bank_payment_portals |SELECT |authenticated |true | |
| Staff write bank_payment_portals |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.blog_posts

Type: table
RLS enabled: yes
Estimated rows: 21

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
| 2200_92105_10_not_null |CHECK | | | |
| 2200_92105_11_not_null |CHECK | | | |
| 2200_92105_13_not_null |CHECK | | | |
| 2200_92105_17_not_null |CHECK | | | |
| 2200_92105_18_not_null |CHECK | | | |
| 2200_92105_1_not_null |CHECK | | | |
| 2200_92105_22_not_null |CHECK | | | |
| 2200_92105_2_not_null |CHECK | | | |
| 2200_92105_4_not_null |CHECK | | | |
| 2200_92105_6_not_null |CHECK | | | |
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
Estimated rows: 164

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
| 2200_65136_1_not_null |CHECK | | | |
| 2200_65136_2_not_null |CHECK | | | |
| 2200_65136_3_not_null |CHECK | | | |
| 2200_65136_4_not_null |CHECK | | | |
| 2200_65136_5_not_null |CHECK | | | |
| 2200_65136_6_not_null |CHECK | | | |
| 2200_65136_7_not_null |CHECK | | | |
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
| 2200_130003_1_not_null |CHECK | | | |
| 2200_130003_2_not_null |CHECK | | | |
| 2200_130003_3_not_null |CHECK | | | |
| 2200_130003_4_not_null |CHECK | | | |
| 2200_130003_5_not_null |CHECK | | | |
| 2200_130003_7_not_null |CHECK | | | |
| cadence_enrollments_cadence_id_fkey |FOREIGN KEY |cadence_id |public.cadences |id |
| cadence_enrollments_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| cadence_enrollments_pkey |PRIMARY KEY |id |public.cadence_enrollments |id |
| cadence_enrollments_status_check |CHECK | |public.cadence_enrollments |status |

### Indexes

| Name |Definition |
| --- |--- |
| cadence_enrollments_due_idx |CREATE INDEX cadence_enrollments_due_idx ON public.cadence_enrollments USING btree (next_step_due_at) WHERE (status = 'active'::text) |
| cadence_enrollments_one_active_idx |CREATE UNIQUE INDEX cadence_enrollments_one_active_idx ON public.cadence_enrollments USING btree (contact_id, cadence_id) WHERE (status = 'active'::text) |
| cadence_enrollments_pkey |CREATE UNIQUE INDEX cadence_enrollments_pkey ON public.cadence_enrollments USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can manage cadence enrollments |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can select cadence enrollments |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.cadence_steps

Type: table
RLS enabled: yes
Estimated rows: 8

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
| 2200_129986_1_not_null |CHECK | | | |
| 2200_129986_2_not_null |CHECK | | | |
| 2200_129986_3_not_null |CHECK | | | |
| 2200_129986_4_not_null |CHECK | | | |
| 2200_129986_5_not_null |CHECK | | | |
| cadence_steps_cadence_id_fkey |FOREIGN KEY |cadence_id |public.cadences |id |
| cadence_steps_cadence_id_step_order_key |UNIQUE |cadence_id, cadence_id, step_order, step_order |public.cadence_steps |step_order, cadence_id, step_order, cadence_id |
| cadence_steps_channel_check |CHECK | |public.cadence_steps |channel |
| cadence_steps_pkey |PRIMARY KEY |id |public.cadence_steps |id |

### Indexes

| Name |Definition |
| --- |--- |
| cadence_steps_cadence_id_step_order_key |CREATE UNIQUE INDEX cadence_steps_cadence_id_step_order_key ON public.cadence_steps USING btree (cadence_id, step_order) |
| cadence_steps_pkey |CREATE UNIQUE INDEX cadence_steps_pkey ON public.cadence_steps USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can manage cadence steps |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can select cadence steps |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.cadences

Type: table
RLS enabled: yes
Estimated rows: 2

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
| 2200_129971_1_not_null |CHECK | | | |
| 2200_129971_2_not_null |CHECK | | | |
| 2200_129971_3_not_null |CHECK | | | |
| 2200_129971_6_not_null |CHECK | | | |
| 2200_129971_7_not_null |CHECK | | | |
| cadences_pipeline_fkey |FOREIGN KEY |pipeline |public.crm_pipelines |key |
| cadences_pkey |PRIMARY KEY |id |public.cadences |id |

### Indexes

| Name |Definition |
| --- |--- |
| cadences_pkey |CREATE UNIQUE INDEX cadences_pkey ON public.cadences USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can manage cadences |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can select cadences |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.cart_drafts

Type: table
RLS enabled: yes
Estimated rows: 1

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
| 2200_127190_1_not_null |CHECK | | | |
| 2200_127190_2_not_null |CHECK | | | |
| 2200_127190_3_not_null |CHECK | | | |
| 2200_127190_5_not_null |CHECK | | | |
| 2200_127190_6_not_null |CHECK | | | |
| 2200_127190_7_not_null |CHECK | | | |
| 2200_127190_8_not_null |CHECK | | | |
| 2200_127190_9_not_null |CHECK | | | |
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
Estimated rows: 1

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
| 17 |variant_snapshot |jsonb |NO |'{}'::jsonb |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_40724_14_not_null |CHECK | | | |
| 2200_40724_17_not_null |CHECK | | | |
| 2200_40724_1_not_null |CHECK | | | |
| 2200_40724_2_not_null |CHECK | | | |
| 2200_40724_3_not_null |CHECK | | | |
| 2200_40724_4_not_null |CHECK | | | |
| 2200_40724_5_not_null |CHECK | | | |
| 2200_40724_6_not_null |CHECK | | | |
| 2200_40724_7_not_null |CHECK | | | |
| 2200_40724_8_not_null |CHECK | | | |
| 2200_40724_9_not_null |CHECK | | | |
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
| 1 |id |integer(32,0) |NO |nextval('catalog_assignments_id_seq'::regclass) |NO |NEVER |
| 2 |catalog_template_id |integer(32,0) |YES | |NO |NEVER |
| 3 |customer_id |integer(32,0) |YES | |NO |NEVER |
| 4 |assigned_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_78649_1_not_null |CHECK | | | |
| catalog_assignments_catalog_template_id_fkey |FOREIGN KEY |catalog_template_id |public.catalog_templates |id |
| catalog_assignments_customer_id_fkey |FOREIGN KEY |customer_id |public.customers |id |
| catalog_assignments_pkey |PRIMARY KEY |id |public.catalog_assignments |id |

### Indexes

| Name |Definition |
| --- |--- |
| catalog_assignments_pkey |CREATE UNIQUE INDEX catalog_assignments_pkey ON public.catalog_assignments USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete catalog_assignments |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert catalog_assignments |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update catalog_assignments |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select catalog_assignments |SELECT |public |has_any_role(auth.uid()) | |

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
Estimated rows: 33

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
| 2200_117546_10_not_null |CHECK | | | |
| 2200_117546_11_not_null |CHECK | | | |
| 2200_117546_12_not_null |CHECK | | | |
| 2200_117546_13_not_null |CHECK | | | |
| 2200_117546_15_not_null |CHECK | | | |
| 2200_117546_16_not_null |CHECK | | | |
| 2200_117546_1_not_null |CHECK | | | |
| 2200_117546_2_not_null |CHECK | | | |
| 2200_117546_3_not_null |CHECK | | | |
| 2200_117546_4_not_null |CHECK | | | |
| 2200_117546_5_not_null |CHECK | | | |
| 2200_117546_6_not_null |CHECK | | | |
| 2200_117546_8_not_null |CHECK | | | |
| 2200_117546_9_not_null |CHECK | | | |
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
| Staff can manage catalog page objects |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_catalog_page_objects_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.catalog_pages

Type: table
RLS enabled: yes
Estimated rows: 8

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
| 2200_117525_1_not_null |CHECK | | | |
| 2200_117525_2_not_null |CHECK | | | |
| 2200_117525_3_not_null |CHECK | | | |
| 2200_117525_4_not_null |CHECK | | | |
| 2200_117525_5_not_null |CHECK | | | |
| 2200_117525_6_not_null |CHECK | | | |
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
| Staff can manage catalog pages |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_catalog_pages_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.catalog_sections

Type: table
RLS enabled: yes
Estimated rows: 15

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO |nextval('catalog_sections_id_seq'::regclass) |NO |NEVER |
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
| 2200_78486_1_not_null |CHECK | | | |
| 2200_78486_3_not_null |CHECK | | | |
| catalog_sections_article_id_fkey |FOREIGN KEY |article_id |public.help_articles |id |
| catalog_sections_catalog_template_id_fkey |FOREIGN KEY |catalog_template_id |public.catalog_templates |id |
| catalog_sections_format_choice_check |CHECK | |public.catalog_sections |format_choice |
| catalog_sections_pkey |PRIMARY KEY |id |public.catalog_sections |id |
| catalog_sections_pricelist_version_id_fkey |FOREIGN KEY |pricelist_version_id |public.pricelist_versions |id |

### Indexes

| Name |Definition |
| --- |--- |
| catalog_sections_pkey |CREATE UNIQUE INDEX catalog_sections_pkey ON public.catalog_sections USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete catalog_sections |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert catalog_sections |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update catalog_sections |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select catalog_sections |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.catalog_templates

Type: table
RLS enabled: yes
Estimated rows: 4

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO |nextval('catalog_templates_id_seq'::regclass) |NO |NEVER |
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
| 2200_78473_10_not_null |CHECK | | | |
| 2200_78473_1_not_null |CHECK | | | |
| 2200_78473_2_not_null |CHECK | | | |
| catalog_templates_pkey |PRIMARY KEY |id |public.catalog_templates |id |

### Indexes

| Name |Definition |
| --- |--- |
| catalog_templates_pkey |CREATE UNIQUE INDEX catalog_templates_pkey ON public.catalog_templates USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete catalog_templates |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert catalog_templates |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update catalog_templates |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select catalog_templates |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.charge_types

Type: table
RLS enabled: yes
Estimated rows: 12

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
| 2200_80970_1_not_null |CHECK | | | |
| 2200_80970_2_not_null |CHECK | | | |
| 2200_80970_3_not_null |CHECK | | | |
| 2200_80970_4_not_null |CHECK | | | |
| 2200_80970_5_not_null |CHECK | | | |
| 2200_80970_6_not_null |CHECK | | | |
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
| 2200_66588_10_not_null |CHECK | | | |
| 2200_66588_11_not_null |CHECK | | | |
| 2200_66588_12_not_null |CHECK | | | |
| 2200_66588_13_not_null |CHECK | | | |
| 2200_66588_14_not_null |CHECK | | | |
| 2200_66588_15_not_null |CHECK | | | |
| 2200_66588_16_not_null |CHECK | | | |
| 2200_66588_17_not_null |CHECK | | | |
| 2200_66588_18_not_null |CHECK | | | |
| 2200_66588_1_not_null |CHECK | | | |
| 2200_66588_21_not_null |CHECK | | | |
| 2200_66588_22_not_null |CHECK | | | |
| 2200_66588_23_not_null |CHECK | | | |
| 2200_66588_24_not_null |CHECK | | | |
| 2200_66588_25_not_null |CHECK | | | |
| 2200_66588_26_not_null |CHECK | | | |
| 2200_66588_27_not_null |CHECK | | | |
| 2200_66588_28_not_null |CHECK | | | |
| 2200_66588_29_not_null |CHECK | | | |
| 2200_66588_2_not_null |CHECK | | | |
| 2200_66588_30_not_null |CHECK | | | |
| 2200_66588_31_not_null |CHECK | | | |
| 2200_66588_32_not_null |CHECK | | | |
| 2200_66588_33_not_null |CHECK | | | |
| 2200_66588_34_not_null |CHECK | | | |
| 2200_66588_35_not_null |CHECK | | | |
| 2200_66588_36_not_null |CHECK | | | |
| 2200_66588_37_not_null |CHECK | | | |
| 2200_66588_38_not_null |CHECK | | | |
| 2200_66588_39_not_null |CHECK | | | |
| 2200_66588_3_not_null |CHECK | | | |
| 2200_66588_40_not_null |CHECK | | | |
| 2200_66588_41_not_null |CHECK | | | |
| 2200_66588_42_not_null |CHECK | | | |
| 2200_66588_43_not_null |CHECK | | | |
| 2200_66588_44_not_null |CHECK | | | |
| 2200_66588_45_not_null |CHECK | | | |
| 2200_66588_46_not_null |CHECK | | | |
| 2200_66588_4_not_null |CHECK | | | |
| 2200_66588_5_not_null |CHECK | | | |
| 2200_66588_6_not_null |CHECK | | | |
| 2200_66588_7_not_null |CHECK | | | |
| 2200_66588_8_not_null |CHECK | | | |
| 2200_66588_9_not_null |CHECK | | | |
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
| 2200_85046_11_not_null |CHECK | | | |
| 2200_85046_12_not_null |CHECK | | | |
| 2200_85046_13_not_null |CHECK | | | |
| 2200_85046_14_not_null |CHECK | | | |
| 2200_85046_1_not_null |CHECK | | | |
| 2200_85046_2_not_null |CHECK | | | |
| 2200_85046_3_not_null |CHECK | | | |
| 2200_85046_4_not_null |CHECK | | | |
| 2200_85046_7_not_null |CHECK | | | |
| 2200_85046_9_not_null |CHECK | | | |
| contact_sync_dead_letters_integration_connection_id_fkey |FOREIGN KEY |integration_connection_id |public.integration_connections |id |
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
| 2200_85074_11_not_null |CHECK | | | |
| 2200_85074_1_not_null |CHECK | | | |
| 2200_85074_2_not_null |CHECK | | | |
| 2200_85074_3_not_null |CHECK | | | |
| 2200_85074_6_not_null |CHECK | | | |
| 2200_85074_7_not_null |CHECK | | | |
| 2200_85074_8_not_null |CHECK | | | |
| contact_sync_manual_review_queue_integration_connection_id_fkey |FOREIGN KEY |integration_connection_id |public.integration_connections |id |
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
| 2200_85021_10_not_null |CHECK | | | |
| 2200_85021_11_not_null |CHECK | | | |
| 2200_85021_12_not_null |CHECK | | | |
| 2200_85021_13_not_null |CHECK | | | |
| 2200_85021_15_not_null |CHECK | | | |
| 2200_85021_1_not_null |CHECK | | | |
| 2200_85021_2_not_null |CHECK | | | |
| 2200_85021_3_not_null |CHECK | | | |
| 2200_85021_4_not_null |CHECK | | | |
| 2200_85021_5_not_null |CHECK | | | |
| 2200_85021_8_not_null |CHECK | | | |
| 2200_85021_9_not_null |CHECK | | | |
| contact_sync_runs_integration_connection_id_fkey |FOREIGN KEY |integration_connection_id |public.integration_connections |id |
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

## public.contact_tag_links

Type: table
RLS enabled: yes
Estimated rows: 8

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |contact_id |uuid |NO | |NO |NEVER |
| 3 |tag_id |uuid |NO | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_78578_1_not_null |CHECK | | | |
| 2200_78578_2_not_null |CHECK | | | |
| 2200_78578_3_not_null |CHECK | | | |
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
Estimated rows: 6

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
| 2200_78523_1_not_null |CHECK | | | |
| 2200_78523_2_not_null |CHECK | | | |
| 2200_78523_3_not_null |CHECK | | | |
| 2200_78523_4_not_null |CHECK | | | |
| 2200_78523_5_not_null |CHECK | | | |
| 2200_78523_6_not_null |CHECK | | | |
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
Estimated rows: 770

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
| 22 |is_customer |boolean |NO |false |NO |NEVER |
| 23 |lead_source |text |NO |''::text |NO |NEVER |
| 24 |pipeline_stage |text |NO |'New'::text |NO |NEVER |
| 25 |type |text |NO |'business'::text |NO |NEVER |
| 26 |business_name |text |YES | |NO |NEVER |
| 27 |address |text |YES | |NO |NEVER |
| 28 |country |text |NO |'Barbados'::text |NO |NEVER |
| 29 |google_place_id |text |YES | |NO |NEVER |
| 30 |facebook_page_id |text |YES | |NO |NEVER |
| 31 |instagram_handle |text |YES | |NO |NEVER |
| 32 |status |text |NO |'lead'::text |NO |NEVER |
| 33 |lead_score |integer(32,0) |NO |0 |NO |NEVER |
| 34 |google_rating |numeric |YES | |NO |NEVER |
| 35 |google_reviews_count |integer(32,0) |YES | |NO |NEVER |
| 36 |ai_intent_score |numeric |YES |0 |NO |NEVER |
| 37 |business_card_image_url |text |YES | |NO |NEVER |
| 38 |business_card_uploaded_at |timestamp with time zone |YES | |NO |NEVER |
| 39 |business_card_file_name |text |YES | |NO |NEVER |
| 40 |innovations_contact_id |bigint(64,0) |YES | |NO |NEVER |
| 41 |innovations_parent_customer_id |bigint(64,0) |YES | |NO |NEVER |
| 42 |linked_customer_id |integer(32,0) |YES | |NO |NEVER |
| 43 |pipeline |text |YES | |NO |NEVER |
| 44 |stage |text |YES | |NO |NEVER |
| 45 |stage_entered_at |timestamp with time zone |YES | |NO |NEVER |
| 46 |next_action_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_78539_18_not_null |CHECK | | | |
| 2200_78539_1_not_null |CHECK | | | |
| 2200_78539_20_not_null |CHECK | | | |
| 2200_78539_21_not_null |CHECK | | | |
| 2200_78539_22_not_null |CHECK | | | |
| 2200_78539_23_not_null |CHECK | | | |
| 2200_78539_24_not_null |CHECK | | | |
| 2200_78539_25_not_null |CHECK | | | |
| 2200_78539_28_not_null |CHECK | | | |
| 2200_78539_2_not_null |CHECK | | | |
| 2200_78539_32_not_null |CHECK | | | |
| 2200_78539_33_not_null |CHECK | | | |
| 2200_78539_3_not_null |CHECK | | | |
| contacts_industry_id_fkey |FOREIGN KEY |industry_id |public.industries |id |
| contacts_linked_customer_id_fkey |FOREIGN KEY |linked_customer_id |public.customers |id |
| contacts_parent_id_fkey |FOREIGN KEY |parent_id |public.contacts |id |
| contacts_pipeline_fkey |FOREIGN KEY |pipeline |public.crm_pipelines |key |
| contacts_pkey |PRIMARY KEY |id |public.contacts |id |
| contacts_stage_requires_pipeline |CHECK | |public.contacts |stage, pipeline |
| contacts_stage_valid |CHECK | |public.contacts |stage |

### Indexes

| Name |Definition |
| --- |--- |
| contacts_innovations_contact_id_key |CREATE UNIQUE INDEX contacts_innovations_contact_id_key ON public.contacts USING btree (innovations_contact_id) |
| contacts_name_key |CREATE UNIQUE INDEX contacts_name_key ON public.contacts USING btree (name) |
| contacts_next_action_at_idx |CREATE INDEX contacts_next_action_at_idx ON public.contacts USING btree (next_action_at) WHERE (next_action_at IS NOT NULL) |
| contacts_pipeline_stage_idx |CREATE INDEX contacts_pipeline_stage_idx ON public.contacts USING btree (pipeline, stage) WHERE (pipeline IS NOT NULL) |
| contacts_pkey |CREATE UNIQUE INDEX contacts_pkey ON public.contacts USING btree (id) |
| idx_contacts_country |CREATE INDEX idx_contacts_country ON public.contacts USING btree (country) |
| idx_contacts_is_customer |CREATE INDEX idx_contacts_is_customer ON public.contacts USING btree (is_customer) WHERE (is_customer = true) |
| idx_contacts_linked_customer_id |CREATE INDEX idx_contacts_linked_customer_id ON public.contacts USING btree (linked_customer_id) |
| idx_contacts_status |CREATE INDEX idx_contacts_status ON public.contacts USING btree (status) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete contacts |DELETE |authenticated |has_edit_role(auth.uid()) | |
| Editors can insert contacts |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update contacts |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Staff can view contacts |SELECT |authenticated |has_staff_role(auth.uid()) | |

### Triggers

_None._

## public.crm_pipelines

Type: table
RLS enabled: yes
Estimated rows: 3

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
| 2200_129929_1_not_null |CHECK | | | |
| 2200_129929_2_not_null |CHECK | | | |
| 2200_129929_3_not_null |CHECK | | | |
| 2200_129929_4_not_null |CHECK | | | |
| crm_pipelines_pkey |PRIMARY KEY |key |public.crm_pipelines |key |

### Indexes

| Name |Definition |
| --- |--- |
| crm_pipelines_pkey |CREATE UNIQUE INDEX crm_pipelines_pkey ON public.crm_pipelines USING btree (key) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can manage crm pipelines |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can select crm pipelines |SELECT |public |has_any_role(auth.uid()) | |

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
Estimated rows: 6

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
| 2200_106056_10_not_null |CHECK | | | |
| 2200_106056_11_not_null |CHECK | | | |
| 2200_106056_12_not_null |CHECK | | | |
| 2200_106056_13_not_null |CHECK | | | |
| 2200_106056_14_not_null |CHECK | | | |
| 2200_106056_1_not_null |CHECK | | | |
| 2200_106056_2_not_null |CHECK | | | |
| 2200_106056_3_not_null |CHECK | | | |
| 2200_106056_4_not_null |CHECK | | | |
| 2200_106056_5_not_null |CHECK | | | |
| 2200_106056_6_not_null |CHECK | | | |
| 2200_106056_7_not_null |CHECK | | | |
| 2200_106056_8_not_null |CHECK | | | |
| 2200_106056_9_not_null |CHECK | | | |
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
| customer_addresses_normalize_defaults_trigger |BEFORE |INSERT |ROW |EXECUTE FUNCTION normalize_customer_address_defaults() |
| customer_addresses_normalize_defaults_trigger |BEFORE |UPDATE |ROW |EXECUTE FUNCTION normalize_customer_address_defaults() |

## public.customer_automation_outbox

Type: table
RLS enabled: yes
Estimated rows: 1

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
| 2200_106227_1_not_null |CHECK | | | |
| 2200_106227_2_not_null |CHECK | | | |
| 2200_106227_3_not_null |CHECK | | | |
| 2200_106227_4_not_null |CHECK | | | |
| 2200_106227_5_not_null |CHECK | | | |
| 2200_106227_6_not_null |CHECK | | | |
| 2200_106227_7_not_null |CHECK | | | |
| 2200_106227_8_not_null |CHECK | | | |
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
| 2200_106090_10_not_null |CHECK | | | |
| 2200_106090_11_not_null |CHECK | | | |
| 2200_106090_12_not_null |CHECK | | | |
| 2200_106090_13_not_null |CHECK | | | |
| 2200_106090_14_not_null |CHECK | | | |
| 2200_106090_1_not_null |CHECK | | | |
| 2200_106090_2_not_null |CHECK | | | |
| 2200_106090_3_not_null |CHECK | | | |
| 2200_106090_4_not_null |CHECK | | | |
| 2200_106090_5_not_null |CHECK | | | |
| 2200_106090_6_not_null |CHECK | | | |
| 2200_106090_7_not_null |CHECK | | | |
| 2200_106090_8_not_null |CHECK | | | |
| 2200_106090_9_not_null |CHECK | | | |
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
| customer_payment_methods_normalize_default_trigger |BEFORE |INSERT |ROW |EXECUTE FUNCTION normalize_customer_payment_default() |
| customer_payment_methods_normalize_default_trigger |BEFORE |UPDATE |ROW |EXECUTE FUNCTION normalize_customer_payment_default() |
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
Estimated rows: 16

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
| 2200_106180_1_not_null |CHECK | | | |
| 2200_106180_2_not_null |CHECK | | | |
| 2200_106180_3_not_null |CHECK | | | |
| 2200_106180_4_not_null |CHECK | | | |
| 2200_106180_5_not_null |CHECK | | | |
| 2200_106180_6_not_null |CHECK | | | |
| customer_portal_feature_overrides_feature_key_check |CHECK | |public.customer_portal_feature_overrides |feature_key |
| customer_portal_feature_overrides_pkey |PRIMARY KEY |id |public.customer_portal_feature_overrides |id |
| customer_portal_feature_overrides_user_id_feature_key_key |UNIQUE |user_id, user_id, feature_key, feature_key |public.customer_portal_feature_overrides |user_id, feature_key, user_id, feature_key |
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
Estimated rows: 10

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
| 2200_71205_1_not_null |CHECK | | | |
| 2200_71205_2_not_null |CHECK | | | |
| 2200_71205_3_not_null |CHECK | | | |
| 2200_71205_4_not_null |CHECK | | | |
| customer_pricing_access_pkey |PRIMARY KEY |id |public.customer_pricing_access |id |
| customer_pricing_access_pricing_sheet_id_fkey |FOREIGN KEY |pricing_sheet_id |public.pricing_sheets |id |
| customer_pricing_access_user_id_pricing_sheet_id_key |UNIQUE |user_id, user_id, pricing_sheet_id, pricing_sheet_id |public.customer_pricing_access |user_id, pricing_sheet_id, user_id, pricing_sheet_id |

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
Estimated rows: 83

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO |nextval('customers_id_seq'::regclass) |NO |NEVER |
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
| 2200_78628_1_not_null |CHECK | | | |
| 2200_78628_2_not_null |CHECK | | | |
| customers_assigned_pricelist_id_fkey |FOREIGN KEY |assigned_pricelist_id |public.pricelist_versions |id |
| customers_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| customers_email_key |UNIQUE |email |public.customers |email |
| customers_pkey |PRIMARY KEY |id |public.customers |id |
| customers_type_check |CHECK | |public.customers |type |

### Indexes

| Name |Definition |
| --- |--- |
| customers_email_key |CREATE UNIQUE INDEX customers_email_key ON public.customers USING btree (email) |
| customers_innovations_customer_id_key |CREATE UNIQUE INDEX customers_innovations_customer_id_key ON public.customers USING btree (innovations_customer_id) |
| customers_pkey |CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id) |
| idx_customers_contact_id |CREATE INDEX idx_customers_contact_id ON public.customers USING btree (contact_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete customers |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert customers |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update customers |UPDATE |public |has_edit_role(auth.uid()) | |
| Staff can select customers |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.docstudio_billing_documents

Type: table
RLS enabled: yes
Estimated rows: 1

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
| 2200_130194_10_not_null |CHECK | | | |
| 2200_130194_11_not_null |CHECK | | | |
| 2200_130194_12_not_null |CHECK | | | |
| 2200_130194_13_not_null |CHECK | | | |
| 2200_130194_18_not_null |CHECK | | | |
| 2200_130194_19_not_null |CHECK | | | |
| 2200_130194_1_not_null |CHECK | | | |
| 2200_130194_20_not_null |CHECK | | | |
| 2200_130194_2_not_null |CHECK | | | |
| 2200_130194_3_not_null |CHECK | | | |
| 2200_130194_4_not_null |CHECK | | | |
| 2200_130194_9_not_null |CHECK | | | |
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
Estimated rows: 7

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
| 2200_130179_13_not_null |CHECK | | | |
| 2200_130179_14_not_null |CHECK | | | |
| 2200_130179_15_not_null |CHECK | | | |
| 2200_130179_1_not_null |CHECK | | | |
| 2200_130179_2_not_null |CHECK | | | |
| 2200_130179_3_not_null |CHECK | | | |
| 2200_130179_4_not_null |CHECK | | | |
| 2200_130179_7_not_null |CHECK | | | |
| 2200_130179_8_not_null |CHECK | | | |
| 2200_130179_9_not_null |CHECK | | | |
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
| 2200_131191_1_not_null |CHECK | | | |
| 2200_131191_2_not_null |CHECK | | | |
| 2200_131191_4_not_null |CHECK | | | |
| 2200_131191_5_not_null |CHECK | | | |
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
| 2200_131178_1_not_null |CHECK | | | |
| 2200_131178_2_not_null |CHECK | | | |
| 2200_131178_4_not_null |CHECK | | | |
| 2200_131178_5_not_null |CHECK | | | |
| 2200_131178_6_not_null |CHECK | | | |
| 2200_131178_7_not_null |CHECK | | | |
| 2200_131178_8_not_null |CHECK | | | |
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
Estimated rows: 114

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
| 2200_120477_1_not_null |CHECK | | | |
| 2200_120477_3_not_null |CHECK | | | |
| 2200_120477_4_not_null |CHECK | | | |
| 2200_120477_5_not_null |CHECK | | | |
| 2200_120477_8_not_null |CHECK | | | |
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
| 2200_120495_1_not_null |CHECK | | | |
| 2200_120495_3_not_null |CHECK | | | |
| 2200_120495_4_not_null |CHECK | | | |
| 2200_120495_5_not_null |CHECK | | | |
| 2200_120495_6_not_null |CHECK | | | |
| 2200_120495_7_not_null |CHECK | | | |
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
Estimated rows: 7

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
| 2200_120527_1_not_null |CHECK | | | |
| 2200_120527_2_not_null |CHECK | | | |
| 2200_120527_3_not_null |CHECK | | | |
| 2200_120527_4_not_null |CHECK | | | |
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
Estimated rows: 7

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
| 2200_65289_1_not_null |CHECK | | | |
| 2200_65289_2_not_null |CHECK | | | |
| 2200_65289_3_not_null |CHECK | | | |
| 2200_65289_4_not_null |CHECK | | | |
| 2200_65289_5_not_null |CHECK | | | |
| 2200_65289_6_not_null |CHECK | | | |
| 2200_65289_7_not_null |CHECK | | | |
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
Estimated rows: 19

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |article_id |uuid |NO | |NO |NEVER |
| 3 |context_slug |text |NO | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_83391_1_not_null |CHECK | | | |
| 2200_83391_2_not_null |CHECK | | | |
| 2200_83391_3_not_null |CHECK | | | |
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

## public.help_articles

Type: table
RLS enabled: yes
Estimated rows: 50

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
| 14 |is_public |boolean |YES |false |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_77315_10_not_null |CHECK | | | |
| 2200_77315_11_not_null |CHECK | | | |
| 2200_77315_12_not_null |CHECK | | | |
| 2200_77315_1_not_null |CHECK | | | |
| 2200_77315_2_not_null |CHECK | | | |
| 2200_77315_3_not_null |CHECK | | | |
| 2200_77315_4_not_null |CHECK | | | |
| 2200_77315_5_not_null |CHECK | | | |
| 2200_77315_6_not_null |CHECK | | | |
| 2200_77315_7_not_null |CHECK | | | |
| 2200_77315_8_not_null |CHECK | | | |
| 2200_77315_9_not_null |CHECK | | | |
| help_articles_pkey |PRIMARY KEY |id |public.help_articles |id |

### Indexes

| Name |Definition |
| --- |--- |
| help_articles_pkey |CREATE UNIQUE INDEX help_articles_pkey ON public.help_articles USING btree (id) |
| idx_help_articles_content_type |CREATE INDEX idx_help_articles_content_type ON public.help_articles USING btree (content_type) |
| idx_help_articles_visibility |CREATE INDEX idx_help_articles_visibility ON public.help_articles USING btree (visibility) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete help_articles |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Anyone authenticated can read public articles |SELECT |public |(visibility = 'public'::text) | |
| Editors can insert help_articles |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update help_articles |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select help_articles |SELECT |authenticated |(((visibility <> 'internal'::text) AND has_any_role(auth.uid())) OR has_staff_role(auth.uid())) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_help_articles_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.help_feedback

Type: table
RLS enabled: yes
Estimated rows: 23

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
| 2200_77332_1_not_null |CHECK | | | |
| 2200_77332_2_not_null |CHECK | | | |
| 2200_77332_3_not_null |CHECK | | | |
| 2200_77332_4_not_null |CHECK | | | |
| 2200_77332_7_not_null |CHECK | | | |
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
| 2200_119969_1_not_null |CHECK | | | |
| 2200_119969_2_not_null |CHECK | | | |
| 2200_119969_3_not_null |CHECK | | | |
| 2200_119969_4_not_null |CHECK | | | |
| 2200_119969_7_not_null |CHECK | | | |
| helpdesk_followup_queue_followup_type_check |CHECK | |public.helpdesk_followup_queue |followup_type |
| helpdesk_followup_queue_pkey |PRIMARY KEY |id |public.helpdesk_followup_queue |id |
| helpdesk_followup_queue_ticket_id_fkey |FOREIGN KEY |ticket_id |public.helpdesk_tickets |id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_followup_queue_pkey |CREATE UNIQUE INDEX helpdesk_followup_queue_pkey ON public.helpdesk_followup_queue USING btree (id) |
| helpdesk_followup_queue_scheduled_for_idx |CREATE INDEX helpdesk_followup_queue_scheduled_for_idx ON public.helpdesk_followup_queue USING btree (scheduled_for) WHERE ((sent_at IS NULL) AND (cancelled_at IS NULL)) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can delete followup queue |DELETE |authenticated |has_edit_role(auth.uid()) | |
| Staff can insert followup queue |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Staff can update followup queue |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Staff can view followup queue |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.helpdesk_inbound_email_log

Type: table
RLS enabled: yes
Estimated rows: 7

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
| 2200_125898_1_not_null |CHECK | | | |
| 2200_125898_2_not_null |CHECK | | | |
| 2200_125898_3_not_null |CHECK | | | |
| 2200_125898_7_not_null |CHECK | | | |
| helpdesk_inbound_email_log_message_id_mailbox_key |UNIQUE |message_id, message_id, mailbox, mailbox |public.helpdesk_inbound_email_log |message_id, mailbox, message_id, mailbox |
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
| 2200_93411_1_not_null |CHECK | | | |
| 2200_93411_2_not_null |CHECK | | | |
| 2200_93411_3_not_null |CHECK | | | |
| 2200_93411_4_not_null |CHECK | | | |
| 2200_93411_5_not_null |CHECK | | | |
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
Estimated rows: 2

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
| 2200_92134_10_not_null |CHECK | | | |
| 2200_92134_1_not_null |CHECK | | | |
| 2200_92134_2_not_null |CHECK | | | |
| 2200_92134_3_not_null |CHECK | | | |
| 2200_92134_6_not_null |CHECK | | | |
| 2200_92134_8_not_null |CHECK | | | |
| 2200_92134_9_not_null |CHECK | | | |
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
Estimated rows: 7

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
| 2200_93392_1_not_null |CHECK | | | |
| 2200_93392_2_not_null |CHECK | | | |
| 2200_93392_3_not_null |CHECK | | | |
| 2200_93392_4_not_null |CHECK | | | |
| 2200_93392_5_not_null |CHECK | | | |
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
Estimated rows: 2

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
| 2200_85141_1_not_null |CHECK | | | |
| 2200_85141_2_not_null |CHECK | | | |
| 2200_85141_3_not_null |CHECK | | | |
| 2200_85141_5_not_null |CHECK | | | |
| 2200_85141_6_not_null |CHECK | | | |
| 2200_85141_7_not_null |CHECK | | | |
| 2200_85141_8_not_null |CHECK | | | |
| 2200_85141_9_not_null |CHECK | | | |
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
Estimated rows: 380

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
| 2200_85254_1_not_null |CHECK | | | |
| 2200_85254_2_not_null |CHECK | | | |
| 2200_85254_3_not_null |CHECK | | | |
| 2200_85254_6_not_null |CHECK | | | |
| helpdesk_ticket_events_pkey |PRIMARY KEY |id |public.helpdesk_ticket_events |id |
| helpdesk_ticket_events_ticket_id_fkey |FOREIGN KEY |ticket_id |public.helpdesk_tickets |id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_ticket_events_pkey |CREATE UNIQUE INDEX helpdesk_ticket_events_pkey ON public.helpdesk_ticket_events USING btree (id) |
| helpdesk_ticket_events_ticket_id_idx |CREATE INDEX helpdesk_ticket_events_ticket_id_idx ON public.helpdesk_ticket_events USING btree (ticket_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Authenticated users can create ticket events |INSERT |authenticated | |(has_edit_role(auth.uid()) OR (EXISTS ( SELECT 1<br>   FROM helpdesk_tickets t<br>  WHERE ((t.id = helpdesk_ticket_events.ticket_id) AND (t.owner_user_id = auth.uid()))))) |
| Customers can view own helpdesk ticket events |SELECT |authenticated |(can_access_customer_portal_feature(auth.uid(), 'helpdesk'::text) AND (EXISTS ( SELECT 1<br>   FROM helpdesk_tickets t<br>  WHERE ((t.id = helpdesk_ticket_events.ticket_id) AND ((t.owner_user_id = auth.uid()) OR (t.partner_contact_id IN ( SELECT p.crm_contact_id<br>           FROM profiles p<br>          WHERE ((p.user_id = auth.uid()) AND (p.crm_contact_id IS NOT NULL))))))))) | |
| Editors can insert helpdesk ticket events |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Staff can view all helpdesk ticket events |SELECT |authenticated |has_edit_role(auth.uid()) | |
| Staff can view all ticket events |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.helpdesk_ticket_messages

Type: table
RLS enabled: yes
Estimated rows: 11

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
| 2200_119922_1_not_null |CHECK | | | |
| 2200_119922_2_not_null |CHECK | | | |
| 2200_119922_3_not_null |CHECK | | | |
| 2200_119922_4_not_null |CHECK | | | |
| 2200_119922_8_not_null |CHECK | | | |
| 2200_119922_9_not_null |CHECK | | | |
| helpdesk_ticket_messages_direction_check |CHECK | |public.helpdesk_ticket_messages |direction |
| helpdesk_ticket_messages_pkey |PRIMARY KEY |id |public.helpdesk_ticket_messages |id |
| helpdesk_ticket_messages_sender_user_id_fkey |FOREIGN KEY |sender_user_id | | |
| helpdesk_ticket_messages_ticket_id_fkey |FOREIGN KEY |ticket_id |public.helpdesk_tickets |id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_ticket_messages_pkey |CREATE UNIQUE INDEX helpdesk_ticket_messages_pkey ON public.helpdesk_ticket_messages USING btree (id) |
| helpdesk_ticket_messages_ticket_id_sent_at_idx |CREATE INDEX helpdesk_ticket_messages_ticket_id_sent_at_idx ON public.helpdesk_ticket_messages USING btree (ticket_id, sent_at) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can manage all ticket messages |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Ticket owners can create messages |INSERT |public | |(EXISTS ( SELECT 1<br>   FROM helpdesk_tickets t<br>  WHERE ((t.id = helpdesk_ticket_messages.ticket_id) AND (t.owner_user_id = auth.uid())))) |
| Ticket participants can read messages |SELECT |public |(EXISTS ( SELECT 1<br>   FROM helpdesk_tickets t<br>  WHERE ((t.id = helpdesk_ticket_messages.ticket_id) AND ((t.owner_user_id = auth.uid()) OR (t.partner_contact_id IN ( SELECT p.crm_contact_id<br>           FROM profiles p<br>          WHERE ((p.user_id = auth.uid()) AND (p.crm_contact_id IS NOT NULL)))))))) | |

### Triggers

_None._

## public.helpdesk_ticket_review_queue_items

Type: table
RLS enabled: yes
Estimated rows: 2

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |tenant_key |text |NO |'default'::text |NO |NEVER |
| 3 |ticket_id |uuid |NO | |NO |NEVER |
| 4 |queue_name |text |NO | |NO |NEVER |
| 5 |source_signal |text |YES | |NO |NEVER |
| 6 |source_reference |text |YES | |NO |NEVER |
| 7 |status |text |NO |'pending'::text |NO |NEVER |
| 8 |resolved_at |timestamp with time zone |YES | |NO |NEVER |
| 9 |resolved_by |uuid |YES | |NO |NEVER |
| 10 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_101530_10_not_null |CHECK | | | |
| 2200_101530_1_not_null |CHECK | | | |
| 2200_101530_2_not_null |CHECK | | | |
| 2200_101530_3_not_null |CHECK | | | |
| 2200_101530_4_not_null |CHECK | | | |
| 2200_101530_7_not_null |CHECK | | | |
| helpdesk_ticket_review_queue_items_pkey |PRIMARY KEY |id |public.helpdesk_ticket_review_queue_items |id |
| helpdesk_ticket_review_queue_items_ticket_id_fkey |FOREIGN KEY |ticket_id |public.helpdesk_tickets |id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_ticket_review_queue_items_pkey |CREATE UNIQUE INDEX helpdesk_ticket_review_queue_items_pkey ON public.helpdesk_ticket_review_queue_items USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage review queue |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

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
| 2200_92161_1_not_null |CHECK | | | |
| 2200_92161_2_not_null |CHECK | | | |
| 2200_92161_3_not_null |CHECK | | | |
| 2200_92161_6_not_null |CHECK | | | |
| 2200_92161_7_not_null |CHECK | | | |
| 2200_92161_8_not_null |CHECK | | | |
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
| 2200_85159_1_not_null |CHECK | | | |
| 2200_85159_2_not_null |CHECK | | | |
| 2200_85159_3_not_null |CHECK | | | |
| 2200_85159_4_not_null |CHECK | | | |
| 2200_85159_5_not_null |CHECK | | | |
| 2200_85159_6_not_null |CHECK | | | |
| 2200_85159_7_not_null |CHECK | | | |
| 2200_85159_8_not_null |CHECK | | | |
| helpdesk_ticket_stages_pkey |PRIMARY KEY |id |public.helpdesk_ticket_stages |id |
| helpdesk_ticket_stages_tenant_name_key |UNIQUE |tenant_key, tenant_key, name, name |public.helpdesk_ticket_stages |tenant_key, name, tenant_key, name |

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
| 2200_85272_1_not_null |CHECK | | | |
| 2200_85272_2_not_null |CHECK | | | |
| 2200_85272_3_not_null |CHECK | | | |
| helpdesk_ticket_tag_rel_pkey |PRIMARY KEY |id |public.helpdesk_ticket_tag_rel |id |
| helpdesk_ticket_tag_rel_tag_id_fkey |FOREIGN KEY |tag_id |public.helpdesk_ticket_tags |id |
| helpdesk_ticket_tag_rel_ticket_id_fkey |FOREIGN KEY |ticket_id |public.helpdesk_tickets |id |
| helpdesk_ticket_tag_rel_unique |UNIQUE |ticket_id, ticket_id, tag_id, tag_id |public.helpdesk_ticket_tag_rel |ticket_id, tag_id, ticket_id, tag_id |

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
Estimated rows: 4

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
| 2200_85195_1_not_null |CHECK | | | |
| 2200_85195_2_not_null |CHECK | | | |
| 2200_85195_3_not_null |CHECK | | | |
| 2200_85195_4_not_null |CHECK | | | |
| 2200_85195_5_not_null |CHECK | | | |
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
Estimated rows: 5

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

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_85179_1_not_null |CHECK | | | |
| 2200_85179_2_not_null |CHECK | | | |
| 2200_85179_3_not_null |CHECK | | | |
| 2200_85179_4_not_null |CHECK | | | |
| 2200_85179_5_not_null |CHECK | | | |
| 2200_85179_6_not_null |CHECK | | | |
| helpdesk_ticket_types_pkey |PRIMARY KEY |id |public.helpdesk_ticket_types |id |
| helpdesk_ticket_types_tenant_name_key |UNIQUE |tenant_key, tenant_key, name, name |public.helpdesk_ticket_types |tenant_key, name, tenant_key, name |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_ticket_types_pkey |CREATE UNIQUE INDEX helpdesk_ticket_types_pkey ON public.helpdesk_ticket_types USING btree (id) |
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
Estimated rows: 3

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
| 2200_119944_10_not_null |CHECK | | | |
| 2200_119944_1_not_null |CHECK | | | |
| 2200_119944_2_not_null |CHECK | | | |
| 2200_119944_3_not_null |CHECK | | | |
| 2200_119944_9_not_null |CHECK | | | |
| helpdesk_ticket_watchers_pkey |PRIMARY KEY |id |public.helpdesk_ticket_watchers |id |
| helpdesk_ticket_watchers_ticket_id_fkey |FOREIGN KEY |ticket_id |public.helpdesk_tickets |id |
| helpdesk_ticket_watchers_user_id_fkey |FOREIGN KEY |user_id | | |
| helpdesk_ticket_watchers_watcher_type_check |CHECK | |public.helpdesk_ticket_watchers |watcher_type |
| watchers_type_fields |CHECK | |public.helpdesk_ticket_watchers |contact_email, watcher_type, user_id, staff_email |
| watchers_unique_user |UNIQUE |ticket_id, ticket_id, user_id, user_id |public.helpdesk_ticket_watchers |user_id, ticket_id, user_id, ticket_id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_ticket_watchers_pkey |CREATE UNIQUE INDEX helpdesk_ticket_watchers_pkey ON public.helpdesk_ticket_watchers USING btree (id) |
| helpdesk_ticket_watchers_ticket_id_idx |CREATE INDEX helpdesk_ticket_watchers_ticket_id_idx ON public.helpdesk_ticket_watchers USING btree (ticket_id) |
| watchers_unique_user |CREATE UNIQUE INDEX watchers_unique_user ON public.helpdesk_ticket_watchers USING btree (ticket_id, user_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can add ticket watchers |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Staff can delete ticket watchers |DELETE |authenticated |has_edit_role(auth.uid()) | |
| Staff can update ticket watchers |UPDATE |authenticated |has_edit_role(auth.uid()) | |
| Staff can view ticket watchers |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.helpdesk_tickets

Type: table
RLS enabled: yes
Estimated rows: 166

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
| 22 |source_authentication_required |boolean |YES |false |NO |NEVER |
| 23 |source_metadata |jsonb |YES |'{}'::jsonb |NO |NEVER |
| 24 |contact_token |uuid |NO |gen_random_uuid() |NO |NEVER |
| 25 |customer_email |text |YES | |NO |NEVER |
| 26 |first_response_at |timestamp with time zone |YES | |NO |NEVER |
| 27 |sla_paused_at |timestamp with time zone |YES | |NO |NEVER |
| 28 |sla_paused_duration_seconds |integer(32,0) |NO |0 |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_85210_16_not_null |CHECK | | | |
| 2200_85210_17_not_null |CHECK | | | |
| 2200_85210_18_not_null |CHECK | | | |
| 2200_85210_1_not_null |CHECK | | | |
| 2200_85210_24_not_null |CHECK | | | |
| 2200_85210_28_not_null |CHECK | | | |
| 2200_85210_2_not_null |CHECK | | | |
| 2200_85210_3_not_null |CHECK | | | |
| 2200_85210_4_not_null |CHECK | | | |
| 2200_85210_5_not_null |CHECK | | | |
| 2200_85210_6_not_null |CHECK | | | |
| helpdesk_tickets_partner_contact_id_fkey |FOREIGN KEY |partner_contact_id |public.contacts |id |
| helpdesk_tickets_pkey |PRIMARY KEY |id |public.helpdesk_tickets |id |
| helpdesk_tickets_priority_check |CHECK | |public.helpdesk_tickets |priority |
| helpdesk_tickets_stage_id_fkey |FOREIGN KEY |stage_id |public.helpdesk_ticket_stages |id |
| helpdesk_tickets_team_id_fkey |FOREIGN KEY |team_id |public.helpdesk_teams |id |
| helpdesk_tickets_tenant_number_key |UNIQUE |tenant_key, tenant_key, ticket_number, ticket_number |public.helpdesk_tickets |tenant_key, ticket_number, tenant_key, ticket_number |
| helpdesk_tickets_ticket_type_id_fkey |FOREIGN KEY |ticket_type_id |public.helpdesk_ticket_types |id |

### Indexes

| Name |Definition |
| --- |--- |
| helpdesk_tickets_contact_token_idx |CREATE UNIQUE INDEX helpdesk_tickets_contact_token_idx ON public.helpdesk_tickets USING btree (contact_token) |
| helpdesk_tickets_owner_user_id_idx |CREATE INDEX helpdesk_tickets_owner_user_id_idx ON public.helpdesk_tickets USING btree (owner_user_id) |
| helpdesk_tickets_pkey |CREATE UNIQUE INDEX helpdesk_tickets_pkey ON public.helpdesk_tickets USING btree (id) |
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
Estimated rows: 5

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
| 2200_65332_1_not_null |CHECK | | | |
| 2200_65332_2_not_null |CHECK | | | |
| 2200_65332_3_not_null |CHECK | | | |
| 2200_65332_4_not_null |CHECK | | | |
| 2200_65332_5_not_null |CHECK | | | |
| 2200_65332_6_not_null |CHECK | | | |
| 2200_65332_7_not_null |CHECK | | | |
| 2200_65332_8_not_null |CHECK | | | |
| 2200_65332_9_not_null |CHECK | | | |
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
Estimated rows: 136

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
| 2200_67817_1_not_null |CHECK | | | |
| 2200_67817_2_not_null |CHECK | | | |
| 2200_67817_3_not_null |CHECK | | | |
| 2200_67817_4_not_null |CHECK | | | |
| 2200_67817_5_not_null |CHECK | | | |
| import_ref_mappings_pkey |PRIMARY KEY |id |public.import_ref_mappings |id |
| import_ref_mappings_ref_table_csv_value_key |UNIQUE |ref_table, ref_table, csv_value, csv_value |public.import_ref_mappings |ref_table, csv_value, ref_table, csv_value |

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
| 2200_78507_1_not_null |CHECK | | | |
| 2200_78507_2_not_null |CHECK | | | |
| 2200_78507_3_not_null |CHECK | | | |
| 2200_78507_4_not_null |CHECK | | | |
| 2200_78507_5_not_null |CHECK | | | |
| 2200_78507_6_not_null |CHECK | | | |
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
Estimated rows: 3219

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
| 2200_128085_1_not_null |CHECK | | | |
| 2200_128085_2_not_null |CHECK | | | |
| 2200_128085_6_not_null |CHECK | | | |
| 2200_128085_7_not_null |CHECK | | | |
| 2200_128085_8_not_null |CHECK | | | |
| 2200_128085_9_not_null |CHECK | | | |
| innovations_sync_dead_letters_pkey |PRIMARY KEY |id |public.innovations_sync_dead_letters |id |
| innovations_sync_dead_letters_status_check |CHECK | |public.innovations_sync_dead_letters |status |

### Indexes

| Name |Definition |
| --- |--- |
| idx_innovations_sync_dead_letters_status |CREATE INDEX idx_innovations_sync_dead_letters_status ON public.innovations_sync_dead_letters USING btree (status, created_at DESC) |
| innovations_sync_dead_letters_pkey |CREATE UNIQUE INDEX innovations_sync_dead_letters_pkey ON public.innovations_sync_dead_letters USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins manage innovations_sync_dead_letters |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_innovations_sync_dead_letters_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.innovations_sync_requests

Type: table
RLS enabled: yes
Estimated rows: 2

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
| 2200_128118_1_not_null |CHECK | | | |
| 2200_128118_2_not_null |CHECK | | | |
| 2200_128118_3_not_null |CHECK | | | |
| 2200_128118_5_not_null |CHECK | | | |
| 2200_128118_9_not_null |CHECK | | | |
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
Estimated rows: 30005

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
| 2200_128067_10_not_null |CHECK | | | |
| 2200_128067_11_not_null |CHECK | | | |
| 2200_128067_12_not_null |CHECK | | | |
| 2200_128067_1_not_null |CHECK | | | |
| 2200_128067_2_not_null |CHECK | | | |
| 2200_128067_4_not_null |CHECK | | | |
| 2200_128067_5_not_null |CHECK | | | |
| 2200_128067_6_not_null |CHECK | | | |
| 2200_128067_7_not_null |CHECK | | | |
| 2200_128067_8_not_null |CHECK | | | |
| innovations_sync_runs_entity_check |CHECK | |public.innovations_sync_runs |entity |
| innovations_sync_runs_pkey |PRIMARY KEY |id |public.innovations_sync_runs |id |
| innovations_sync_runs_status_check |CHECK | |public.innovations_sync_runs |status |

### Indexes

| Name |Definition |
| --- |--- |
| idx_innovations_sync_runs_entity_started |CREATE INDEX idx_innovations_sync_runs_entity_started ON public.innovations_sync_runs USING btree (entity, started_at DESC) |
| innovations_sync_runs_pkey |CREATE UNIQUE INDEX innovations_sync_runs_pkey ON public.innovations_sync_runs USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins manage innovations_sync_runs |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

_None._

## public.integration_audit_events

Type: table
RLS enabled: yes
Estimated rows: 21

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
| 2200_84913_1_not_null |CHECK | | | |
| 2200_84913_2_not_null |CHECK | | | |
| 2200_84913_3_not_null |CHECK | | | |
| 2200_84913_4_not_null |CHECK | | | |
| 2200_84913_5_not_null |CHECK | | | |
| 2200_84913_7_not_null |CHECK | | | |
| 2200_84913_8_not_null |CHECK | | | |
| integration_audit_events_integration_connection_id_fkey |FOREIGN KEY |integration_connection_id |public.integration_connections |id |
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
| 2200_84945_13_not_null |CHECK | | | |
| 2200_84945_14_not_null |CHECK | | | |
| 2200_84945_1_not_null |CHECK | | | |
| 2200_84945_2_not_null |CHECK | | | |
| 2200_84945_3_not_null |CHECK | | | |
| 2200_84945_4_not_null |CHECK | | | |
| 2200_84945_5_not_null |CHECK | | | |
| 2200_84945_6_not_null |CHECK | | | |
| 2200_84945_8_not_null |CHECK | | | |
| 2200_84945_9_not_null |CHECK | | | |
| integration_conflict_queue_integration_connection_id_fkey |FOREIGN KEY |integration_connection_id |public.integration_connections |id |
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

## public.integration_connection_secrets

Type: table
RLS enabled: yes
Estimated rows: 1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |integration_connection_id |uuid |NO | |NO |NEVER |
| 3 |key_version |integer(32,0) |NO |1 |NO |NEVER |
| 4 |encrypted_secret |bytea |NO | |NO |NEVER |
| 5 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 6 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_84875_1_not_null |CHECK | | | |
| 2200_84875_2_not_null |CHECK | | | |
| 2200_84875_3_not_null |CHECK | | | |
| 2200_84875_4_not_null |CHECK | | | |
| 2200_84875_5_not_null |CHECK | | | |
| 2200_84875_6_not_null |CHECK | | | |
| integration_connection_secrets_integration_connection_id_fkey |FOREIGN KEY |integration_connection_id |public.integration_connections |id |
| integration_connection_secrets_integration_connection_id_key |UNIQUE |integration_connection_id |public.integration_connection_secrets |integration_connection_id |
| integration_connection_secrets_pkey |PRIMARY KEY |id |public.integration_connection_secrets |id |

### Indexes

| Name |Definition |
| --- |--- |
| integration_connection_secrets_integration_connection_id_key |CREATE UNIQUE INDEX integration_connection_secrets_integration_connection_id_key ON public.integration_connection_secrets USING btree (integration_connection_id) |
| integration_connection_secrets_pkey |CREATE UNIQUE INDEX integration_connection_secrets_pkey ON public.integration_connection_secrets USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| No direct access to integration_connection_secrets |ALL |public |false |false |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_integration_connection_secrets_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.integration_connections

Type: table
RLS enabled: yes
Estimated rows: 1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |tenant_key |text |NO |'default'::text |NO |NEVER |
| 3 |provider |text |NO | |NO |NEVER |
| 4 |environment |text |NO |'production'::text |NO |NEVER |
| 5 |base_url |text |NO |''::text |NO |NEVER |
| 6 |database_name |text |NO |''::text |NO |NEVER |
| 7 |user_identifier |text |YES | |NO |NEVER |
| 8 |auth_mode |text |NO |'password'::text |NO |NEVER |
| 9 |status |text |NO |'not_configured'::text |NO |NEVER |
| 10 |last_health_check_at |timestamp with time zone |YES | |NO |NEVER |
| 11 |last_sync_cursor_at |timestamp with time zone |YES | |NO |NEVER |
| 12 |last_sync_import_count |integer(32,0) |NO |0 |NO |NEVER |
| 13 |last_sync_export_count |integer(32,0) |NO |0 |NO |NEVER |
| 14 |last_sync_failure_count |integer(32,0) |NO |0 |NO |NEVER |
| 15 |retry_state |text |YES | |NO |NEVER |
| 16 |incremental_enabled |boolean |NO |true |NO |NEVER |
| 17 |dry_run_enabled |boolean |NO |false |NO |NEVER |
| 18 |sync_direction |text |NO |'import_only'::text |NO |NEVER |
| 19 |conflict_policy |text |NO |'prefer_odoo'::text |NO |NEVER |
| 20 |sync_batch_size |integer(32,0) |NO |100 |NO |NEVER |
| 21 |sync_interval_minutes |integer(32,0) |NO |15 |NO |NEVER |
| 22 |pull_cursor |timestamp with time zone |YES | |NO |NEVER |
| 23 |push_cursor |timestamp with time zone |YES | |NO |NEVER |
| 24 |last_sync_started_at |timestamp with time zone |YES | |NO |NEVER |
| 25 |last_sync_finished_at |timestamp with time zone |YES | |NO |NEVER |
| 26 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 27 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_84843_12_not_null |CHECK | | | |
| 2200_84843_13_not_null |CHECK | | | |
| 2200_84843_14_not_null |CHECK | | | |
| 2200_84843_16_not_null |CHECK | | | |
| 2200_84843_17_not_null |CHECK | | | |
| 2200_84843_18_not_null |CHECK | | | |
| 2200_84843_19_not_null |CHECK | | | |
| 2200_84843_1_not_null |CHECK | | | |
| 2200_84843_20_not_null |CHECK | | | |
| 2200_84843_21_not_null |CHECK | | | |
| 2200_84843_26_not_null |CHECK | | | |
| 2200_84843_27_not_null |CHECK | | | |
| 2200_84843_2_not_null |CHECK | | | |
| 2200_84843_3_not_null |CHECK | | | |
| 2200_84843_4_not_null |CHECK | | | |
| 2200_84843_5_not_null |CHECK | | | |
| 2200_84843_6_not_null |CHECK | | | |
| 2200_84843_8_not_null |CHECK | | | |
| 2200_84843_9_not_null |CHECK | | | |
| integration_connections_auth_mode_check |CHECK | |public.integration_connections |auth_mode |
| integration_connections_conflict_policy_check |CHECK | |public.integration_connections |conflict_policy |
| integration_connections_pkey |PRIMARY KEY |id |public.integration_connections |id |
| integration_connections_provider_check |CHECK | |public.integration_connections |provider |
| integration_connections_status_check |CHECK | |public.integration_connections |status |
| integration_connections_sync_direction_check |CHECK | |public.integration_connections |sync_direction |
| integration_connections_tenant_key_provider_key |UNIQUE |tenant_key, tenant_key, provider, provider |public.integration_connections |provider, tenant_key, provider, tenant_key |

### Indexes

| Name |Definition |
| --- |--- |
| integration_connections_pkey |CREATE UNIQUE INDEX integration_connections_pkey ON public.integration_connections USING btree (id) |
| integration_connections_tenant_key_provider_key |CREATE UNIQUE INDEX integration_connections_tenant_key_provider_key ON public.integration_connections USING btree (tenant_key, provider) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage integration_connections |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_integration_connections_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.integration_health_metrics_dashboard

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |integration_connection_id |uuid |YES | |NO |NEVER |
| 2 |tenant_key |text |YES | |NO |NEVER |
| 3 |provider |text |YES | |NO |NEVER |
| 4 |last_successful_run_at |timestamp with time zone |YES | |NO |NEVER |
| 5 |lag_behind_source_seconds |integer(32,0) |YES | |NO |NEVER |
| 6 |error_rate |numeric |YES | |NO |NEVER |
| 7 |records_processed_per_run |numeric |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.integration_structured_logs

Type: table
RLS enabled: yes
Estimated rows: 17

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |integration_connection_id |uuid |YES | |NO |NEVER |
| 3 |tenant_key |text |NO | |NO |NEVER |
| 4 |provider |text |NO | |NO |NEVER |
| 5 |log_level |text |NO | |NO |NEVER |
| 6 |event_name |text |NO | |NO |NEVER |
| 7 |payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 8 |redacted_payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_84928_1_not_null |CHECK | | | |
| 2200_84928_3_not_null |CHECK | | | |
| 2200_84928_4_not_null |CHECK | | | |
| 2200_84928_5_not_null |CHECK | | | |
| 2200_84928_6_not_null |CHECK | | | |
| 2200_84928_7_not_null |CHECK | | | |
| 2200_84928_8_not_null |CHECK | | | |
| 2200_84928_9_not_null |CHECK | | | |
| integration_structured_logs_integration_connection_id_fkey |FOREIGN KEY |integration_connection_id |public.integration_connections |id |
| integration_structured_logs_log_level_check |CHECK | |public.integration_structured_logs |log_level |
| integration_structured_logs_pkey |PRIMARY KEY |id |public.integration_structured_logs |id |

### Indexes

| Name |Definition |
| --- |--- |
| idx_integration_structured_logs_tenant_provider_created |CREATE INDEX idx_integration_structured_logs_tenant_provider_created ON public.integration_structured_logs USING btree (tenant_key, provider, created_at DESC) |
| integration_structured_logs_pkey |CREATE UNIQUE INDEX integration_structured_logs_pkey ON public.integration_structured_logs USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage integration_structured_logs |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

_None._

## public.integration_sync_errors

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
| 6 |source_model |text |NO |'res.partner'::text |NO |NEVER |
| 7 |source_identifier |text |NO | |NO |NEVER |
| 8 |local_identifier |uuid |YES | |NO |NEVER |
| 9 |error_code |text |YES | |NO |NEVER |
| 10 |error_message |text |NO | |NO |NEVER |
| 11 |error_payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 12 |redacted_payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 13 |status |text |NO |'open'::text |NO |NEVER |
| 14 |retry_count |integer(32,0) |NO |0 |NO |NEVER |
| 15 |first_seen_at |timestamp with time zone |NO |now() |NO |NEVER |
| 16 |last_seen_at |timestamp with time zone |NO |now() |NO |NEVER |
| 17 |resolved_at |timestamp with time zone |YES | |NO |NEVER |
| 18 |resolved_by |uuid |YES | |NO |NEVER |
| 19 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 20 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_84987_10_not_null |CHECK | | | |
| 2200_84987_11_not_null |CHECK | | | |
| 2200_84987_12_not_null |CHECK | | | |
| 2200_84987_13_not_null |CHECK | | | |
| 2200_84987_14_not_null |CHECK | | | |
| 2200_84987_15_not_null |CHECK | | | |
| 2200_84987_16_not_null |CHECK | | | |
| 2200_84987_19_not_null |CHECK | | | |
| 2200_84987_1_not_null |CHECK | | | |
| 2200_84987_20_not_null |CHECK | | | |
| 2200_84987_2_not_null |CHECK | | | |
| 2200_84987_4_not_null |CHECK | | | |
| 2200_84987_5_not_null |CHECK | | | |
| 2200_84987_6_not_null |CHECK | | | |
| 2200_84987_7_not_null |CHECK | | | |
| integration_sync_errors_integration_connection_id_fkey |FOREIGN KEY |integration_connection_id |public.integration_connections |id |
| integration_sync_errors_local_identifier_fkey |FOREIGN KEY |local_identifier |public.contacts |id |
| integration_sync_errors_pkey |PRIMARY KEY |id |public.integration_sync_errors |id |
| integration_sync_errors_provider_check |CHECK | |public.integration_sync_errors |provider |
| integration_sync_errors_status_check |CHECK | |public.integration_sync_errors |status |
| integration_sync_errors_sync_job_id_fkey |FOREIGN KEY |sync_job_id |public.integration_sync_jobs |id |

### Indexes

| Name |Definition |
| --- |--- |
| idx_integration_sync_errors_connection_status |CREATE INDEX idx_integration_sync_errors_connection_status ON public.integration_sync_errors USING btree (integration_connection_id, status, last_seen_at DESC) |
| idx_integration_sync_errors_tenant_provider_status |CREATE INDEX idx_integration_sync_errors_tenant_provider_status ON public.integration_sync_errors USING btree (tenant_key, provider, status, last_seen_at DESC) |
| integration_sync_errors_pkey |CREATE UNIQUE INDEX integration_sync_errors_pkey ON public.integration_sync_errors USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage integration_sync_errors |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_integration_sync_errors_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.integration_sync_jobs

Type: table
RLS enabled: yes
Estimated rows: 5

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |integration_connection_id |uuid |NO | |NO |NEVER |
| 3 |tenant_key |text |NO | |NO |NEVER |
| 4 |provider |text |NO | |NO |NEVER |
| 5 |sync_kind |text |NO | |NO |NEVER |
| 6 |status |text |NO |'queued'::text |NO |NEVER |
| 7 |requested_by |uuid |NO | |NO |NEVER |
| 8 |requested_at |timestamp with time zone |NO |now() |NO |NEVER |
| 9 |started_at |timestamp with time zone |YES | |NO |NEVER |
| 10 |completed_at |timestamp with time zone |YES | |NO |NEVER |
| 11 |error_message |text |YES | |NO |NEVER |
| 12 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 13 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_84893_12_not_null |CHECK | | | |
| 2200_84893_13_not_null |CHECK | | | |
| 2200_84893_1_not_null |CHECK | | | |
| 2200_84893_2_not_null |CHECK | | | |
| 2200_84893_3_not_null |CHECK | | | |
| 2200_84893_4_not_null |CHECK | | | |
| 2200_84893_5_not_null |CHECK | | | |
| 2200_84893_6_not_null |CHECK | | | |
| 2200_84893_7_not_null |CHECK | | | |
| 2200_84893_8_not_null |CHECK | | | |
| integration_sync_jobs_integration_connection_id_fkey |FOREIGN KEY |integration_connection_id |public.integration_connections |id |
| integration_sync_jobs_pkey |PRIMARY KEY |id |public.integration_sync_jobs |id |
| integration_sync_jobs_provider_check |CHECK | |public.integration_sync_jobs |provider |
| integration_sync_jobs_status_check |CHECK | |public.integration_sync_jobs |status |
| integration_sync_jobs_sync_kind_check |CHECK | |public.integration_sync_jobs |sync_kind |

### Indexes

| Name |Definition |
| --- |--- |
| integration_sync_jobs_pkey |CREATE UNIQUE INDEX integration_sync_jobs_pkey ON public.integration_sync_jobs USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can manage integration_sync_jobs |ALL |public |has_role(auth.uid(), 'admin'::app_role) |has_role(auth.uid(), 'admin'::app_role) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_integration_sync_jobs_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

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
| 2200_84964_10_not_null |CHECK | | | |
| 2200_84964_11_not_null |CHECK | | | |
| 2200_84964_14_not_null |CHECK | | | |
| 2200_84964_1_not_null |CHECK | | | |
| 2200_84964_2_not_null |CHECK | | | |
| 2200_84964_4_not_null |CHECK | | | |
| 2200_84964_5_not_null |CHECK | | | |
| 2200_84964_6_not_null |CHECK | | | |
| 2200_84964_8_not_null |CHECK | | | |
| integration_sync_run_metrics_integration_connection_id_fkey |FOREIGN KEY |integration_connection_id |public.integration_connections |id |
| integration_sync_run_metrics_pkey |PRIMARY KEY |id |public.integration_sync_run_metrics |id |
| integration_sync_run_metrics_sync_job_id_fkey |FOREIGN KEY |sync_job_id |public.integration_sync_jobs |id |

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
| 1 |id |uuid |NO |uuid_generate_v4() |NO |NEVER |
| 2 |contact_id |uuid |NO | |NO |NEVER |
| 3 |generated_at |timestamp with time zone |YES |now() |NO |NEVER |
| 4 |pdf_url |text |YES | |NO |NEVER |
| 5 |raw_data |jsonb |YES | |NO |NEVER |
| 6 |summary |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_81064_1_not_null |CHECK | | | |
| 2200_81064_2_not_null |CHECK | | | |
| lead_audits_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| lead_audits_pkey |PRIMARY KEY |id |public.lead_audits |id |

### Indexes

| Name |Definition |
| --- |--- |
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

## public.lead_provider_credentials

Type: table
RLS enabled: yes
Estimated rows: 2

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
| 2200_83431_1_not_null |CHECK | | | |
| 2200_83431_2_not_null |CHECK | | | |
| 2200_83431_3_not_null |CHECK | | | |
| 2200_83431_4_not_null |CHECK | | | |
| 2200_83431_5_not_null |CHECK | | | |
| 2200_83431_6_not_null |CHECK | | | |
| lead_provider_credentials_pkey |PRIMARY KEY |id |public.lead_provider_credentials |id |
| lead_provider_credentials_provider_tenant_key_key |UNIQUE |provider, provider, tenant_key, tenant_key |public.lead_provider_credentials |tenant_key, provider, tenant_key, provider |

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

## public.legacy_rates

Type: table
RLS enabled: yes
Estimated rows: 7

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
| 2200_73711_10_not_null |CHECK | | | |
| 2200_73711_1_not_null |CHECK | | | |
| 2200_73711_2_not_null |CHECK | | | |
| 2200_73711_3_not_null |CHECK | | | |
| 2200_73711_4_not_null |CHECK | | | |
| 2200_73711_5_not_null |CHECK | | | |
| 2200_73711_8_not_null |CHECK | | | |
| 2200_73711_9_not_null |CHECK | | | |
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
Estimated rows: 1456

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
| 2200_65262_1_not_null |CHECK | | | |
| 2200_65262_2_not_null |CHECK | | | |
| 2200_65262_3_not_null |CHECK | | | |
| 2200_65262_4_not_null |CHECK | | | |
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
Estimated rows: 917

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
| 2200_65188_1_not_null |CHECK | | | |
| 2200_65188_2_not_null |CHECK | | | |
| 2200_65188_3_not_null |CHECK | | | |
| 2200_65188_4_not_null |CHECK | | | |
| 2200_65188_5_not_null |CHECK | | | |
| 2200_65188_6_not_null |CHECK | | | |
| 2200_65188_7_not_null |CHECK | | | |
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

## public.lens_recommendation_rule_sets

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |version |integer(32,0) |NO |1 |NO |NEVER |
| 4 |status |text |NO |'draft'::text |NO |NEVER |
| 5 |notes |text |YES | |NO |NEVER |
| 6 |created_by |uuid |YES | |NO |NEVER |
| 7 |published_by |uuid |YES | |NO |NEVER |
| 8 |published_at |timestamp with time zone |YES | |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 10 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_128698_10_not_null |CHECK | | | |
| 2200_128698_1_not_null |CHECK | | | |
| 2200_128698_2_not_null |CHECK | | | |
| 2200_128698_3_not_null |CHECK | | | |
| 2200_128698_4_not_null |CHECK | | | |
| 2200_128698_9_not_null |CHECK | | | |
| lens_recommendation_rule_sets_created_by_fkey |FOREIGN KEY |created_by | | |
| lens_recommendation_rule_sets_name_version_key |UNIQUE |name, name, version, version |public.lens_recommendation_rule_sets |version, name, version, name |
| lens_recommendation_rule_sets_pkey |PRIMARY KEY |id |public.lens_recommendation_rule_sets |id |
| lens_recommendation_rule_sets_published_by_fkey |FOREIGN KEY |published_by | | |
| lens_recommendation_rule_sets_status_check |CHECK | |public.lens_recommendation_rule_sets |status |

### Indexes

| Name |Definition |
| --- |--- |
| lens_recommendation_one_published_idx |CREATE UNIQUE INDEX lens_recommendation_one_published_idx ON public.lens_recommendation_rule_sets USING btree (status) WHERE (status = 'published'::text) |
| lens_recommendation_rule_sets_name_version_key |CREATE UNIQUE INDEX lens_recommendation_rule_sets_name_version_key ON public.lens_recommendation_rule_sets USING btree (name, version) |
| lens_recommendation_rule_sets_pkey |CREATE UNIQUE INDEX lens_recommendation_rule_sets_pkey ON public.lens_recommendation_rule_sets USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors manage lens recommendation rule sets |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_lens_recommendation_rule_sets_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.lens_recommendation_rules

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |rule_set_id |uuid |NO | |NO |NEVER |
| 3 |product_id |uuid |NO | |NO |NEVER |
| 4 |tier |text |NO | |NO |NEVER |
| 5 |priority |integer(32,0) |NO |100 |NO |NEVER |
| 6 |conditions |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 7 |coating |text |YES | |NO |NEVER |
| 8 |reasons |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 9 |warnings |ARRAY |NO |'{}'::text[] |NO |NEVER |
| 10 |turnaround_min_days |integer(32,0) |YES | |NO |NEVER |
| 11 |turnaround_max_days |integer(32,0) |YES | |NO |NEVER |
| 12 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 13 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_128724_12_not_null |CHECK | | | |
| 2200_128724_13_not_null |CHECK | | | |
| 2200_128724_1_not_null |CHECK | | | |
| 2200_128724_2_not_null |CHECK | | | |
| 2200_128724_3_not_null |CHECK | | | |
| 2200_128724_4_not_null |CHECK | | | |
| 2200_128724_5_not_null |CHECK | | | |
| 2200_128724_6_not_null |CHECK | | | |
| 2200_128724_8_not_null |CHECK | | | |
| 2200_128724_9_not_null |CHECK | | | |
| lens_recommendation_rules_check |CHECK | |public.lens_recommendation_rules |turnaround_min_days, turnaround_max_days |
| lens_recommendation_rules_pkey |PRIMARY KEY |id |public.lens_recommendation_rules |id |
| lens_recommendation_rules_product_id_fkey |FOREIGN KEY |product_id |public.lenses |id |
| lens_recommendation_rules_rule_set_id_fkey |FOREIGN KEY |rule_set_id |public.lens_recommendation_rule_sets |id |
| lens_recommendation_rules_rule_set_id_product_id_tier_key |UNIQUE |rule_set_id, rule_set_id, rule_set_id, product_id, product_id, product_id, tier, tier, tier |public.lens_recommendation_rules |product_id, tier, rule_set_id, product_id, tier, rule_set_id, tier, rule_set_id, product_id |
| lens_recommendation_rules_tier_check |CHECK | |public.lens_recommendation_rules |tier |
| lens_recommendation_rules_turnaround_min_days_check |CHECK | |public.lens_recommendation_rules |turnaround_min_days |

### Indexes

| Name |Definition |
| --- |--- |
| lens_recommendation_rules_pkey |CREATE UNIQUE INDEX lens_recommendation_rules_pkey ON public.lens_recommendation_rules USING btree (id) |
| lens_recommendation_rules_rule_set_id_product_id_tier_key |CREATE UNIQUE INDEX lens_recommendation_rules_rule_set_id_product_id_tier_key ON public.lens_recommendation_rules USING btree (rule_set_id, product_id, tier) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors manage lens recommendation rules |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_lens_recommendation_rules_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.lenses

Type: table
RLS enabled: yes
Estimated rows: 1458

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
| 26 |pricing_category |text |YES | |NO |NEVER |
| 27 |pricing_index |text |YES | |NO |NEVER |
| 28 |excluded_from_anchor |boolean |NO |false |NO |NEVER |
| 29 |excluded_reason |text |YES | |NO |NEVER |
| 30 |excluded_by |uuid |YES | |NO |NEVER |
| 31 |excluded_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_65226_10_not_null |CHECK | | | |
| 2200_65226_11_not_null |CHECK | | | |
| 2200_65226_12_not_null |CHECK | | | |
| 2200_65226_13_not_null |CHECK | | | |
| 2200_65226_14_not_null |CHECK | | | |
| 2200_65226_17_not_null |CHECK | | | |
| 2200_65226_19_not_null |CHECK | | | |
| 2200_65226_1_not_null |CHECK | | | |
| 2200_65226_20_not_null |CHECK | | | |
| 2200_65226_21_not_null |CHECK | | | |
| 2200_65226_22_not_null |CHECK | | | |
| 2200_65226_23_not_null |CHECK | | | |
| 2200_65226_24_not_null |CHECK | | | |
| 2200_65226_28_not_null |CHECK | | | |
| 2200_65226_2_not_null |CHECK | | | |
| 2200_65226_3_not_null |CHECK | | | |
| 2200_65226_4_not_null |CHECK | | | |
| 2200_65226_5_not_null |CHECK | | | |
| 2200_65226_6_not_null |CHECK | | | |
| 2200_65226_7_not_null |CHECK | | | |
| 2200_65226_8_not_null |CHECK | | | |
| 2200_65226_9_not_null |CHECK | | | |
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
| Editors can delete lenses |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert lenses |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update lenses |UPDATE |public |has_edit_role(auth.uid()) | |
| Staff can select lenses |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_lenses_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.lenses_public

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |YES | |NO |NEVER |
| 2 |name |text |YES | |NO |NEVER |
| 3 |sell_price |numeric(10,2) |YES | |NO |NEVER |
| 4 |notes |text |YES | |NO |NEVER |
| 5 |lenstype_id |uuid |YES | |NO |NEVER |
| 6 |material_id |uuid |YES | |NO |NEVER |
| 7 |mftype_id |uuid |YES | |NO |NEVER |
| 8 |is_active |boolean |YES | |NO |NEVER |
| 9 |show_on_website |boolean |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.lenstypes

Type: table
RLS enabled: yes
Estimated rows: 960

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
| 2200_65175_1_not_null |CHECK | | | |
| 2200_65175_2_not_null |CHECK | | | |
| 2200_65175_3_not_null |CHECK | | | |
| 2200_65175_4_not_null |CHECK | | | |
| 2200_65175_5_not_null |CHECK | | | |
| 2200_65175_6_not_null |CHECK | | | |
| 2200_65175_7_not_null |CHECK | | | |
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
Estimated rows: 1

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
| 2200_128842_1_not_null |CHECK | | | |
| 2200_128842_2_not_null |CHECK | | | |
| 2200_128842_4_not_null |CHECK | | | |
| 2200_128842_5_not_null |CHECK | | | |
| 2200_128842_6_not_null |CHECK | | | |
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
| 2200_128808_13_not_null |CHECK | | | |
| 2200_128808_17_not_null |CHECK | | | |
| 2200_128808_18_not_null |CHECK | | | |
| 2200_128808_1_not_null |CHECK | | | |
| 2200_128808_2_not_null |CHECK | | | |
| 2200_128808_3_not_null |CHECK | | | |
| 2200_128808_4_not_null |CHECK | | | |
| 2200_128808_5_not_null |CHECK | | | |
| 2200_128808_6_not_null |CHECK | | | |
| 2200_128808_7_not_null |CHECK | | | |
| 2200_128808_8_not_null |CHECK | | | |
| live_data_gateway_requests_claimed_by_fkey |FOREIGN KEY |claimed_by |public.api_keys |id |
| live_data_gateway_requests_operation_check |CHECK | |public.live_data_gateway_requests |operation |
| live_data_gateway_requests_pkey |PRIMARY KEY |id |public.live_data_gateway_requests |id |
| live_data_gateway_requests_requested_by_fkey |FOREIGN KEY |requested_by | | |
| live_data_gateway_requests_source_check |CHECK | |public.live_data_gateway_requests |source |
| live_data_gateway_requests_status_check |CHECK | |public.live_data_gateway_requests |status |
| live_data_gateway_requests_website_customer_id_fkey |FOREIGN KEY |website_customer_id |public.customers |id |

### Indexes

| Name |Definition |
| --- |--- |
| live_data_gateway_requests_pending_idx |CREATE INDEX live_data_gateway_requests_pending_idx ON public.live_data_gateway_requests USING btree (status, requested_at) WHERE (status = 'pending'::text) |
| live_data_gateway_requests_pkey |CREATE UNIQUE INDEX live_data_gateway_requests_pkey ON public.live_data_gateway_requests USING btree (id) |
| live_data_gateway_requests_requester_idx |CREATE INDEX live_data_gateway_requests_requester_idx ON public.live_data_gateway_requests USING btree (requested_by, requested_at DESC) |

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
| 1 |id |integer(32,0) |NO |nextval('material_upgrades_id_seq'::regclass) |NO |NEVER |
| 2 |upgrade_name |text |NO | |NO |NEVER |
| 3 |material |text |NO | |NO |NEVER |
| 4 |full_price_bbd |numeric(10,2) |YES | |NO |NEVER |
| 5 |delta_bbd |numeric(10,2) |YES | |NO |NEVER |
| 6 |notes |text |YES | |NO |NEVER |
| 7 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_73828_1_not_null |CHECK | | | |
| 2200_73828_2_not_null |CHECK | | | |
| 2200_73828_3_not_null |CHECK | | | |
| material_upgrades_pkey |PRIMARY KEY |id |public.material_upgrades |id |

### Indexes

| Name |Definition |
| --- |--- |
| material_upgrades_pkey |CREATE UNIQUE INDEX material_upgrades_pkey ON public.material_upgrades USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete material_upgrades |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert material_upgrades |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update material_upgrades |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select material_upgrades |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.materials

Type: table
RLS enabled: yes
Estimated rows: 20

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
| 2200_65149_1_not_null |CHECK | | | |
| 2200_65149_2_not_null |CHECK | | | |
| 2200_65149_3_not_null |CHECK | | | |
| 2200_65149_4_not_null |CHECK | | | |
| 2200_65149_5_not_null |CHECK | | | |
| 2200_65149_6_not_null |CHECK | | | |
| 2200_65149_7_not_null |CHECK | | | |
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
Estimated rows: 909

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO |nextval('matrix_allocations_id_seq'::regclass) |NO |NEVER |
| 2 |pricelist_version_id |integer(32,0) |YES | |NO |NEVER |
| 3 |treatment_type |text |NO | |NO |NEVER |
| 4 |category |text |NO | |NO |NEVER |
| 5 |material_index |text |NO | |NO |NEVER |
| 6 |lens_id |uuid |YES | |NO |NEVER |
| 7 |allocated_price_bbd |numeric(10,2) |YES | |NO |NEVER |
| 8 |is_active |boolean |YES |true |NO |NEVER |
| 9 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_75005_1_not_null |CHECK | | | |
| 2200_75005_3_not_null |CHECK | | | |
| 2200_75005_4_not_null |CHECK | | | |
| 2200_75005_5_not_null |CHECK | | | |
| matrix_allocations_lens_id_fkey |FOREIGN KEY |lens_id |public.lenses |id |
| matrix_allocations_pkey |PRIMARY KEY |id |public.matrix_allocations |id |
| matrix_allocations_pricelist_version_id_fkey |FOREIGN KEY |pricelist_version_id |public.pricelist_versions |id |
| matrix_allocations_version_cat_mat_treat_unique |UNIQUE |pricelist_version_id, pricelist_version_id, pricelist_version_id, pricelist_version_id, category, category, category, category, material_index, material_index, material_index, material_index, treatment_type, treatment_type, treatment_type, treatment_type |public.matrix_allocations |material_index, category, treatment_type, pricelist_version_id, category, treatment_type, pricelist_version_id, material_index, treatment_type, category, pricelist_version_id, material_index, pricelist_version_id, category, material_index, treatment_type |

### Indexes

| Name |Definition |
| --- |--- |
| matrix_allocations_pkey |CREATE UNIQUE INDEX matrix_allocations_pkey ON public.matrix_allocations USING btree (id) |
| matrix_allocations_version_cat_mat_treat_unique |CREATE UNIQUE INDEX matrix_allocations_version_cat_mat_treat_unique ON public.matrix_allocations USING btree (pricelist_version_id, category, material_index, treatment_type) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete matrix_allocations |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert matrix_allocations |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update matrix_allocations |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select matrix_allocations |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.mftypes

Type: table
RLS enabled: yes
Estimated rows: 6

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
| 2200_65162_1_not_null |CHECK | | | |
| 2200_65162_2_not_null |CHECK | | | |
| 2200_65162_3_not_null |CHECK | | | |
| 2200_65162_4_not_null |CHECK | | | |
| 2200_65162_5_not_null |CHECK | | | |
| 2200_65162_6_not_null |CHECK | | | |
| 2200_65162_7_not_null |CHECK | | | |
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

## public.notes

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |uuid_generate_v4() |NO |NEVER |
| 2 |contact_id |uuid |NO | |NO |NEVER |
| 3 |content |text |NO | |NO |NEVER |
| 4 |is_ai_generated |boolean |YES |false |NO |NEVER |
| 5 |created_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_81104_1_not_null |CHECK | | | |
| 2200_81104_2_not_null |CHECK | | | |
| 2200_81104_3_not_null |CHECK | | | |
| notes_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| notes_pkey |PRIMARY KEY |id |public.notes |id |

### Indexes

| Name |Definition |
| --- |--- |
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
| 1 |id |uuid |NO |uuid_generate_v4() |NO |NEVER |
| 2 |contact_id |uuid |NO | |NO |NEVER |
| 3 |status |text |YES |'new'::text |NO |NEVER |
| 4 |expected_value |numeric(12,2) |YES | |NO |NEVER |
| 5 |close_date |date |YES | |NO |NEVER |
| 6 |source |text |YES | |NO |NEVER |
| 7 |audit_pdf_url |text |YES | |NO |NEVER |
| 8 |created_at |timestamp with time zone |YES |now() |NO |NEVER |
| 9 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |
| 10 |title |text |YES |''::text |NO |NEVER |
| 11 |stage |text |YES |'new'::text |NO |NEVER |
| 12 |country |text |YES | |NO |NEVER |
| 13 |volume_tier |text |YES |'medium'::text |NO |NEVER |
| 14 |estimated_value |numeric |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_81046_1_not_null |CHECK | | | |
| 2200_81046_2_not_null |CHECK | | | |
| opportunities_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| opportunities_pkey |PRIMARY KEY |id |public.opportunities |id |
| opportunities_source_check |CHECK | |public.opportunities |source |
| opportunities_status_check |CHECK | |public.opportunities |status |

### Indexes

| Name |Definition |
| --- |--- |
| idx_opportunities_contact_id |CREATE INDEX idx_opportunities_contact_id ON public.opportunities USING btree (contact_id) |
| opportunities_contact_id_title_key |CREATE UNIQUE INDEX opportunities_contact_id_title_key ON public.opportunities USING btree (contact_id, title) |
| opportunities_pkey |CREATE UNIQUE INDEX opportunities_pkey ON public.opportunities USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete opportunities |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert opportunities |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update opportunities |UPDATE |public |has_edit_role(auth.uid()) | |
| Staff can view opportunities |SELECT |authenticated |has_staff_role(auth.uid()) | |

### Triggers

_None._

## public.order_activity

Type: table
RLS enabled: yes
Estimated rows: 66

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
| 2200_129949_1_not_null |CHECK | | | |
| 2200_129949_4_not_null |CHECK | | | |
| 2200_129949_5_not_null |CHECK | | | |
| 2200_129949_6_not_null |CHECK | | | |
| 2200_129949_8_not_null |CHECK | | | |
| order_activity_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| order_activity_pkey |PRIMARY KEY |innovations_customer_id |public.order_activity |innovations_customer_id |

### Indexes

| Name |Definition |
| --- |--- |
| order_activity_contact_id_idx |CREATE INDEX order_activity_contact_id_idx ON public.order_activity USING btree (contact_id) |
| order_activity_last_order_date_idx |CREATE INDEX order_activity_last_order_date_idx ON public.order_activity USING btree (last_order_date) |
| order_activity_pkey |CREATE UNIQUE INDEX order_activity_pkey ON public.order_activity USING btree (innovations_customer_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can manage order activity |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can select order activity |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| order_activity_link_contact |BEFORE |UPDATE |ROW |EXECUTE FUNCTION link_order_activity_contact() |
| order_activity_link_contact |BEFORE |INSERT |ROW |EXECUTE FUNCTION link_order_activity_contact() |

## public.order_items

Type: table
RLS enabled: yes
Estimated rows: 39

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
| 17 |variant_snapshot |jsonb |NO |'{}'::jsonb |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_40754_13_not_null |CHECK | | | |
| 2200_40754_14_not_null |CHECK | | | |
| 2200_40754_17_not_null |CHECK | | | |
| 2200_40754_1_not_null |CHECK | | | |
| 2200_40754_2_not_null |CHECK | | | |
| 2200_40754_3_not_null |CHECK | | | |
| 2200_40754_4_not_null |CHECK | | | |
| 2200_40754_5_not_null |CHECK | | | |
| 2200_40754_6_not_null |CHECK | | | |
| 2200_40754_7_not_null |CHECK | | | |
| 2200_40754_8_not_null |CHECK | | | |
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
Estimated rows: 5

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
| 2200_106162_1_not_null |CHECK | | | |
| 2200_106162_2_not_null |CHECK | | | |
| 2200_106162_3_not_null |CHECK | | | |
| 2200_106162_4_not_null |CHECK | | | |
| 2200_106162_5_not_null |CHECK | | | |
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

## public.order_payment_links

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |order_id |uuid |NO | |NO |NEVER |
| 3 |user_id |uuid |NO | |NO |NEVER |
| 4 |token |text |NO | |NO |NEVER |
| 5 |status |text |NO |'active'::text |NO |NEVER |
| 6 |expires_at |timestamp with time zone |NO |(now() + '14 days'::interval) |NO |NEVER |
| 7 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 8 |used_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_115157_1_not_null |CHECK | | | |
| 2200_115157_2_not_null |CHECK | | | |
| 2200_115157_3_not_null |CHECK | | | |
| 2200_115157_4_not_null |CHECK | | | |
| 2200_115157_5_not_null |CHECK | | | |
| 2200_115157_6_not_null |CHECK | | | |
| 2200_115157_7_not_null |CHECK | | | |
| order_payment_links_order_id_fkey |FOREIGN KEY |order_id |public.orders |id |
| order_payment_links_pkey |PRIMARY KEY |id |public.order_payment_links |id |
| order_payment_links_status_check |CHECK | |public.order_payment_links |status |
| order_payment_links_token_key |UNIQUE |token |public.order_payment_links |token |
| order_payment_links_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| order_payment_links_pkey |CREATE UNIQUE INDEX order_payment_links_pkey ON public.order_payment_links USING btree (id) |
| order_payment_links_token_key |CREATE UNIQUE INDEX order_payment_links_token_key ON public.order_payment_links USING btree (token) |
| order_payment_links_user_idx |CREATE INDEX order_payment_links_user_idx ON public.order_payment_links USING btree (user_id, created_at DESC) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can manage payment links |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Users can view their own payment links |SELECT |authenticated |((auth.uid() = user_id) OR has_edit_role(auth.uid())) | |

### Triggers

_None._

## public.order_payments

Type: table
RLS enabled: yes
Estimated rows: 5

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

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_106127_11_not_null |CHECK | | | |
| 2200_106127_12_not_null |CHECK | | | |
| 2200_106127_13_not_null |CHECK | | | |
| 2200_106127_1_not_null |CHECK | | | |
| 2200_106127_2_not_null |CHECK | | | |
| 2200_106127_3_not_null |CHECK | | | |
| 2200_106127_5_not_null |CHECK | | | |
| 2200_106127_6_not_null |CHECK | | | |
| 2200_106127_7_not_null |CHECK | | | |
| order_payments_order_id_fkey |FOREIGN KEY |order_id |public.orders |id |
| order_payments_payment_method_id_fkey |FOREIGN KEY |payment_method_id |public.customer_payment_methods |id |
| order_payments_pkey |PRIMARY KEY |id |public.order_payments |id |
| order_payments_status_check |CHECK | |public.order_payments |status |
| order_payments_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
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

## public.order_revisions

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |order_id |uuid |NO | |NO |NEVER |
| 3 |actor_user_id |uuid |YES | |NO |NEVER |
| 4 |revision_type |text |NO | |NO |NEVER |
| 5 |before_snapshot |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 6 |after_snapshot |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 7 |internal_note |text |YES | |NO |NEVER |
| 8 |customer_note |text |YES | |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_115184_1_not_null |CHECK | | | |
| 2200_115184_2_not_null |CHECK | | | |
| 2200_115184_4_not_null |CHECK | | | |
| 2200_115184_5_not_null |CHECK | | | |
| 2200_115184_6_not_null |CHECK | | | |
| 2200_115184_9_not_null |CHECK | | | |
| order_revisions_actor_user_id_fkey |FOREIGN KEY |actor_user_id | | |
| order_revisions_order_id_fkey |FOREIGN KEY |order_id |public.orders |id |
| order_revisions_pkey |PRIMARY KEY |id |public.order_revisions |id |

### Indexes

| Name |Definition |
| --- |--- |
| order_revisions_order_idx |CREATE INDEX order_revisions_order_idx ON public.order_revisions USING btree (order_id, created_at DESC) |
| order_revisions_pkey |CREATE UNIQUE INDEX order_revisions_pkey ON public.order_revisions USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can insert order revisions |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Users can read own order revisions |SELECT |authenticated |(has_edit_role(auth.uid()) OR (EXISTS ( SELECT 1<br>   FROM orders o<br>  WHERE ((o.id = order_revisions.order_id) AND (o.user_id = auth.uid()))))) | |

### Triggers

_None._

## public.orders

Type: table
RLS enabled: yes
Estimated rows: 10

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
| 2200_40743_12_not_null |CHECK | | | |
| 2200_40743_1_not_null |CHECK | | | |
| 2200_40743_2_not_null |CHECK | | | |
| 2200_40743_3_not_null |CHECK | | | |
| 2200_40743_4_not_null |CHECK | | | |
| 2200_40743_5_not_null |CHECK | | | |
| 2200_40743_6_not_null |CHECK | | | |
| orders_pkey |PRIMARY KEY |id |public.orders |id |
| orders_status_check |CHECK | |public.orders |status |

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
| 2200_130033_11_not_null |CHECK | | | |
| 2200_130033_1_not_null |CHECK | | | |
| 2200_130033_2_not_null |CHECK | | | |
| 2200_130033_4_not_null |CHECK | | | |
| 2200_130033_7_not_null |CHECK | | | |
| 2200_130033_8_not_null |CHECK | | | |
| 2200_130033_9_not_null |CHECK | | | |
| outreach_outbox_channel_check |CHECK | |public.outreach_outbox |channel |
| outreach_outbox_contact_id_fkey |FOREIGN KEY |contact_id |public.contacts |id |
| outreach_outbox_enrollment_id_fkey |FOREIGN KEY |enrollment_id |public.cadence_enrollments |id |
| outreach_outbox_pkey |PRIMARY KEY |id |public.outreach_outbox |id |
| outreach_outbox_status_check |CHECK | |public.outreach_outbox |status |

### Indexes

| Name |Definition |
| --- |--- |
| outreach_outbox_contact_id_idx |CREATE INDEX outreach_outbox_contact_id_idx ON public.outreach_outbox USING btree (contact_id) |
| outreach_outbox_pkey |CREATE UNIQUE INDEX outreach_outbox_pkey ON public.outreach_outbox USING btree (id) |
| outreach_outbox_status_idx |CREATE INDEX outreach_outbox_status_idx ON public.outreach_outbox USING btree (status) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can manage outreach outbox |ALL |public |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |
| Role users can select outreach outbox |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.price_catalog

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO | |NO |NEVER |
| 2 |product_id |uuid |YES | |NO |NEVER |
| 3 |web_price |numeric |YES | |NO |NEVER |
| 4 |web_enabled |boolean |YES |false |NO |NEVER |
| 5 |wspl_enabled |boolean |YES |false |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_81121_1_not_null |CHECK | | | |
| price_catalog_pkey |PRIMARY KEY |id |public.price_catalog |id |

### Indexes

| Name |Definition |
| --- |--- |
| price_catalog_pkey |CREATE UNIQUE INDEX price_catalog_pkey ON public.price_catalog USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete price_catalog |DELETE |authenticated |has_role(auth.uid(), 'admin'::app_role) | |
| Authenticated users can view price_catalog |SELECT |authenticated |has_any_role(auth.uid()) | |
| Editors can insert price_catalog |INSERT |authenticated | |has_edit_role(auth.uid()) |
| Editors can update price_catalog |UPDATE |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.price_matrix

Type: table
RLS enabled: yes
Estimated rows: 10

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO |nextval('price_matrix_id_seq'::regclass) |NO |NEVER |
| 2 |category |text |NO | |NO |NEVER |
| 3 |index_1_50 |numeric(10,2) |YES | |NO |NEVER |
| 4 |index_1_53 |numeric(10,2) |YES | |NO |NEVER |
| 5 |index_1_59 |numeric(10,2) |YES | |NO |NEVER |
| 6 |index_1_60 |numeric(10,2) |YES | |NO |NEVER |
| 7 |index_1_67 |numeric(10,2) |YES | |NO |NEVER |
| 8 |index_1_74 |numeric(10,2) |YES | |NO |NEVER |
| 9 |created_at |timestamp with time zone |YES |now() |NO |NEVER |
| 10 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_73756_1_not_null |CHECK | | | |
| 2200_73756_2_not_null |CHECK | | | |
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
| Admins can delete price_matrix |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert price_matrix |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update price_matrix |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select price_matrix |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.pricelist_catalog_rows

Type: table
RLS enabled: yes
Estimated rows: 724

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
| 2200_74978_10_not_null |CHECK | | | |
| 2200_74978_11_not_null |CHECK | | | |
| 2200_74978_12_not_null |CHECK | | | |
| 2200_74978_1_not_null |CHECK | | | |
| 2200_74978_2_not_null |CHECK | | | |
| 2200_74978_3_not_null |CHECK | | | |
| 2200_74978_4_not_null |CHECK | | | |
| 2200_74978_5_not_null |CHECK | | | |
| 2200_74978_6_not_null |CHECK | | | |
| 2200_74978_7_not_null |CHECK | | | |
| pricelist_catalog_rows_pkey |PRIMARY KEY |id |public.pricelist_catalog_rows |id |
| pricelist_catalog_rows_pricelist_version_id_catalog_type_ro_key |UNIQUE |pricelist_version_id, pricelist_version_id, pricelist_version_id, catalog_type, catalog_type, catalog_type, row_key, row_key, row_key |public.pricelist_catalog_rows |pricelist_version_id, catalog_type, row_key, pricelist_version_id, catalog_type, row_key, catalog_type, row_key, pricelist_version_id |
| pricelist_catalog_rows_pricelist_version_id_fkey |FOREIGN KEY |pricelist_version_id |public.pricelist_versions |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricelist_catalog_rows_pkey |CREATE UNIQUE INDEX pricelist_catalog_rows_pkey ON public.pricelist_catalog_rows USING btree (id) |
| pricelist_catalog_rows_pricelist_version_id_catalog_type_ro_key |CREATE UNIQUE INDEX pricelist_catalog_rows_pricelist_version_id_catalog_type_ro_key ON public.pricelist_catalog_rows USING btree (pricelist_version_id, catalog_type, row_key) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete pricelist_catalog_rows |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert pricelist_catalog_rows |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update pricelist_catalog_rows |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select pricelist_catalog_rows |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.pricelist_child_sections

Type: table
RLS enabled: yes
Estimated rows: 10

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO |nextval('pricelist_child_sections_id_seq'::regclass) |NO |NEVER |
| 2 |pricelist_version_id |integer(32,0) |YES | |NO |NEVER |
| 3 |section_type |text |NO | |NO |NEVER |
| 4 |child_markup_percent |numeric(5,2) |YES |0 |NO |NEVER |
| 5 |child_discount_percent |numeric(5,2) |YES |0 |NO |NEVER |
| 6 |created_at |timestamp with time zone |YES |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_77281_1_not_null |CHECK | | | |
| 2200_77281_3_not_null |CHECK | | | |
| pricelist_child_sections_pkey |PRIMARY KEY |id |public.pricelist_child_sections |id |
| pricelist_child_sections_pricelist_version_id_fkey |FOREIGN KEY |pricelist_version_id |public.pricelist_versions |id |
| pricelist_child_sections_section_type_check |CHECK | |public.pricelist_child_sections |section_type |

### Indexes

| Name |Definition |
| --- |--- |
| pricelist_child_sections_pkey |CREATE UNIQUE INDEX pricelist_child_sections_pkey ON public.pricelist_child_sections USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete pricelist_child_sections |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert pricelist_child_sections |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update pricelist_child_sections |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select pricelist_child_sections |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.pricelist_line_overrides

Type: table
RLS enabled: yes
Estimated rows: 21

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO |nextval('pricelist_line_overrides_id_seq'::regclass) |NO |NEVER |
| 2 |child_section_id |integer(32,0) |YES | |NO |NEVER |
| 3 |reference_id |text |NO | |NO |NEVER |
| 4 |reference_type |text |NO | |NO |NEVER |
| 5 |overridden_price_bbd |numeric(10,2) |YES | |NO |NEVER |
| 6 |reason |text |YES | |NO |NEVER |
| 7 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_77300_1_not_null |CHECK | | | |
| 2200_77300_3_not_null |CHECK | | | |
| 2200_77300_4_not_null |CHECK | | | |
| pricelist_line_overrides_child_section_id_fkey |FOREIGN KEY |child_section_id |public.pricelist_child_sections |id |
| pricelist_line_overrides_pkey |PRIMARY KEY |id |public.pricelist_line_overrides |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricelist_line_overrides_pkey |CREATE UNIQUE INDEX pricelist_line_overrides_pkey ON public.pricelist_line_overrides USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete pricelist_line_overrides |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert pricelist_line_overrides |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update pricelist_line_overrides |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select pricelist_line_overrides |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.pricelist_lines

Type: table
RLS enabled: yes
Estimated rows: 302

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
| 2200_131074_10_not_null |CHECK | | | |
| 2200_131074_1_not_null |CHECK | | | |
| 2200_131074_2_not_null |CHECK | | | |
| 2200_131074_3_not_null |CHECK | | | |
| 2200_131074_4_not_null |CHECK | | | |
| 2200_131074_6_not_null |CHECK | | | |
| 2200_131074_9_not_null |CHECK | | | |
| pricelist_lines_custom_price_check |CHECK | |public.pricelist_lines |custom_price |
| pricelist_lines_item_ref_fkey |FOREIGN KEY |item_ref |public.pricing_items |id |
| pricelist_lines_pkey |PRIMARY KEY |id |public.pricelist_lines |id |
| pricelist_lines_pricelist_id_fkey |FOREIGN KEY |pricelist_id |public.pricelists |id |
| pricelist_lines_pricelist_id_item_ref_key |UNIQUE |pricelist_id, pricelist_id, item_ref, item_ref |public.pricelist_lines |pricelist_id, item_ref, pricelist_id, item_ref |
| pricelist_lines_source_check |CHECK | |public.pricelist_lines |source |

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
| 1 |id |integer(32,0) |NO |nextval('pricelist_notes_id_seq'::regclass) |NO |NEVER |
| 2 |section |text |YES | |NO |NEVER |
| 3 |content |text |YES | |NO |NEVER |
| 4 |sort_order |integer(32,0) |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_73800_1_not_null |CHECK | | | |
| pricelist_notes_pkey |PRIMARY KEY |id |public.pricelist_notes |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricelist_notes_pkey |CREATE UNIQUE INDEX pricelist_notes_pkey ON public.pricelist_notes USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete pricelist_notes |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert pricelist_notes |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update pricelist_notes |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select pricelist_notes |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.pricelist_overrides

Type: table
RLS enabled: yes
Estimated rows: 112

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO |nextval('pricelist_overrides_id_seq'::regclass) |NO |NEVER |
| 2 |pricelist_version_id |integer(32,0) |YES | |NO |NEVER |
| 3 |category |text |YES | |NO |NEVER |
| 4 |index_column |text |YES | |NO |NEVER |
| 5 |overridden_price |numeric(10,2) |YES | |NO |NEVER |
| 6 |reason |text |YES | |NO |NEVER |
| 7 |created_at |timestamp with time zone |YES |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_73785_1_not_null |CHECK | | | |
| pricelist_overrides_pkey |PRIMARY KEY |id |public.pricelist_overrides |id |
| pricelist_overrides_pricelist_version_id_fkey |FOREIGN KEY |pricelist_version_id |public.pricelist_versions |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricelist_overrides_pkey |CREATE UNIQUE INDEX pricelist_overrides_pkey ON public.pricelist_overrides USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete pricelist_overrides |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert pricelist_overrides |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update pricelist_overrides |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select pricelist_overrides |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.pricelist_variance

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |customer_id |integer(32,0) |YES | |NO |NEVER |
| 2 |item_ref |uuid |YES | |NO |NEVER |
| 3 |master_price |numeric |YES | |NO |NEVER |
| 4 |custom_price |numeric |YES | |NO |NEVER |
| 5 |delta |numeric |YES | |NO |NEVER |
| 6 |pct |numeric |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.pricelist_versions

Type: table
RLS enabled: yes
Estimated rows: 4

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO |nextval('pricelist_versions_id_seq'::regclass) |NO |NEVER |
| 2 |name |text |NO | |NO |NEVER |
| 3 |base_currency |text |YES |'BBD'::text |NO |NEVER |
| 4 |is_template |boolean |YES |false |NO |NEVER |
| 5 |markup_percent |numeric(5,2) |YES |0 |NO |NEVER |
| 6 |discount_percent |numeric(5,2) |YES |0 |NO |NEVER |
| 7 |created_at |timestamp with time zone |YES |now() |NO |NEVER |
| 8 |updated_at |timestamp with time zone |YES |now() |NO |NEVER |
| 9 |format_type |text |YES |'list'::text |NO |NEVER |
| 10 |master_markup_percent |numeric(5,2) |YES |0 |NO |NEVER |
| 11 |master_discount_percent |numeric(5,2) |YES |0 |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_73770_1_not_null |CHECK | | | |
| 2200_73770_2_not_null |CHECK | | | |
| pricelist_versions_format_type_check |CHECK | |public.pricelist_versions |format_type |
| pricelist_versions_pkey |PRIMARY KEY |id |public.pricelist_versions |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricelist_versions_pkey |CREATE UNIQUE INDEX pricelist_versions_pkey ON public.pricelist_versions USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete pricelist_versions |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can insert pricelist_versions |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update pricelist_versions |UPDATE |public |has_edit_role(auth.uid()) | |
| Role users can select pricelist_versions |SELECT |public |has_any_role(auth.uid()) | |

### Triggers

_None._

## public.pricelists

Type: table
RLS enabled: yes
Estimated rows: 2

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
| 2200_131055_1_not_null |CHECK | | | |
| 2200_131055_2_not_null |CHECK | | | |
| 2200_131055_6_not_null |CHECK | | | |
| 2200_131055_7_not_null |CHECK | | | |
| pricelists_customer_id_fkey |FOREIGN KEY |customer_id |public.customers |id |
| pricelists_kind_check |CHECK | |public.pricelists |kind |
| pricelists_kind_customer_check |CHECK | |public.pricelists |kind, customer_id |
| pricelists_pkey |PRIMARY KEY |id |public.pricelists |id |

### Indexes

| Name |Definition |
| --- |--- |
| pricelists_one_custom_per_customer_idx |CREATE UNIQUE INDEX pricelists_one_custom_per_customer_idx ON public.pricelists USING btree (customer_id) WHERE (kind = 'custom'::text) |
| pricelists_pkey |CREATE UNIQUE INDEX pricelists_pkey ON public.pricelists USING btree (id) |
| pricelists_single_master_idx |CREATE UNIQUE INDEX pricelists_single_master_idx ON public.pricelists USING btree ((1)) WHERE (kind = 'master'::text) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors manage pricelists |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

_None._

## public.pricing_audit

Type: table
RLS enabled: yes
Estimated rows: 303

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
| 2200_130841_1_not_null |CHECK | | | |
| 2200_130841_3_not_null |CHECK | | | |
| 2200_130841_4_not_null |CHECK | | | |
| 2200_130841_5_not_null |CHECK | | | |
| 2200_130841_8_not_null |CHECK | | | |
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
Estimated rows: 1369

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
| 2200_65351_1_not_null |CHECK | | | |
| 2200_65351_2_not_null |CHECK | | | |
| 2200_65351_3_not_null |CHECK | | | |
| 2200_65351_4_not_null |CHECK | | | |
| 2200_65351_5_not_null |CHECK | | | |
| 2200_65351_6_not_null |CHECK | | | |
| 2200_65351_9_not_null |CHECK | | | |
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
Estimated rows: 325

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
| 2200_131040_1_not_null |CHECK | | | |
| 2200_131040_2_not_null |CHECK | | | |
| 2200_131040_3_not_null |CHECK | | | |
| 2200_131040_4_not_null |CHECK | | | |
| 2200_131040_5_not_null |CHECK | | | |
| pricing_items_pkey |PRIMARY KEY |id |public.pricing_items |id |
| pricing_items_treatment_tier_material_key |UNIQUE |treatment, treatment, treatment, tier, tier, tier, material, material, material |public.pricing_items |material, treatment, tier, material, treatment, tier, treatment, tier, material |

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
Estimated rows: 3

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
| 2200_66623_10_not_null |CHECK | | | |
| 2200_66623_11_not_null |CHECK | | | |
| 2200_66623_12_not_null |CHECK | | | |
| 2200_66623_13_not_null |CHECK | | | |
| 2200_66623_14_not_null |CHECK | | | |
| 2200_66623_15_not_null |CHECK | | | |
| 2200_66623_16_not_null |CHECK | | | |
| 2200_66623_17_not_null |CHECK | | | |
| 2200_66623_18_not_null |CHECK | | | |
| 2200_66623_19_not_null |CHECK | | | |
| 2200_66623_1_not_null |CHECK | | | |
| 2200_66623_20_not_null |CHECK | | | |
| 2200_66623_21_not_null |CHECK | | | |
| 2200_66623_22_not_null |CHECK | | | |
| 2200_66623_23_not_null |CHECK | | | |
| 2200_66623_24_not_null |CHECK | | | |
| 2200_66623_25_not_null |CHECK | | | |
| 2200_66623_26_not_null |CHECK | | | |
| 2200_66623_27_not_null |CHECK | | | |
| 2200_66623_28_not_null |CHECK | | | |
| 2200_66623_29_not_null |CHECK | | | |
| 2200_66623_2_not_null |CHECK | | | |
| 2200_66623_30_not_null |CHECK | | | |
| 2200_66623_4_not_null |CHECK | | | |
| 2200_66623_6_not_null |CHECK | | | |
| 2200_66623_7_not_null |CHECK | | | |
| 2200_66623_8_not_null |CHECK | | | |
| 2200_66623_9_not_null |CHECK | | | |
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
| Staff can select pricing_settings |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

_None._

## public.pricing_sheets

Type: table
RLS enabled: yes
Estimated rows: 2

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
| 2200_65379_1_not_null |CHECK | | | |
| 2200_65379_2_not_null |CHECK | | | |
| 2200_65379_4_not_null |CHECK | | | |
| 2200_65379_5_not_null |CHECK | | | |
| 2200_65379_6_not_null |CHECK | | | |
| 2200_65379_7_not_null |CHECK | | | |
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

## public.product_variant_configs

Type: table
RLS enabled: yes
Estimated rows: 3

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |product_type |text |NO | |NO |NEVER |
| 3 |product_id |uuid |NO | |NO |NEVER |
| 4 |variant_mode |text |NO |'none'::text |NO |NEVER |
| 5 |attributes |jsonb |NO |'[]'::jsonb |NO |NEVER |
| 6 |settings |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 7 |sku_template |text |YES | |NO |NEVER |
| 8 |opc_template |text |YES | |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 10 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_115107_10_not_null |CHECK | | | |
| 2200_115107_1_not_null |CHECK | | | |
| 2200_115107_2_not_null |CHECK | | | |
| 2200_115107_3_not_null |CHECK | | | |
| 2200_115107_4_not_null |CHECK | | | |
| 2200_115107_5_not_null |CHECK | | | |
| 2200_115107_6_not_null |CHECK | | | |
| 2200_115107_9_not_null |CHECK | | | |
| product_variant_configs_pkey |PRIMARY KEY |id |public.product_variant_configs |id |
| product_variant_configs_product_type_check |CHECK | |public.product_variant_configs |product_type |
| product_variant_configs_product_type_product_id_key |UNIQUE |product_type, product_type, product_id, product_id |public.product_variant_configs |product_type, product_id, product_type, product_id |
| product_variant_configs_variant_mode_check |CHECK | |public.product_variant_configs |variant_mode |

### Indexes

| Name |Definition |
| --- |--- |
| product_variant_configs_pkey |CREATE UNIQUE INDEX product_variant_configs_pkey ON public.product_variant_configs USING btree (id) |
| product_variant_configs_product_type_product_id_key |CREATE UNIQUE INDEX product_variant_configs_product_type_product_id_key ON public.product_variant_configs USING btree (product_type, product_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can manage product variant configs |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_product_variant_configs_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

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
| 2200_115124_10_not_null |CHECK | | | |
| 2200_115124_13_not_null |CHECK | | | |
| 2200_115124_14_not_null |CHECK | | | |
| 2200_115124_15_not_null |CHECK | | | |
| 2200_115124_16_not_null |CHECK | | | |
| 2200_115124_17_not_null |CHECK | | | |
| 2200_115124_18_not_null |CHECK | | | |
| 2200_115124_19_not_null |CHECK | | | |
| 2200_115124_1_not_null |CHECK | | | |
| 2200_115124_20_not_null |CHECK | | | |
| 2200_115124_2_not_null |CHECK | | | |
| 2200_115124_3_not_null |CHECK | | | |
| 2200_115124_4_not_null |CHECK | | | |
| 2200_115124_5_not_null |CHECK | | | |
| 2200_115124_6_not_null |CHECK | | | |
| product_variants_pkey |PRIMARY KEY |id |public.product_variants |id |
| product_variants_product_type_check |CHECK | |public.product_variants |product_type |
| product_variants_product_type_product_id_variant_key_key |UNIQUE |product_type, product_type, product_type, product_id, product_id, product_id, variant_key, variant_key, variant_key |public.product_variants |product_id, variant_key, product_type, product_id, variant_key, product_type, variant_key, product_type, product_id |
| product_variants_variant_mode_check |CHECK | |public.product_variants |variant_mode |

### Indexes

| Name |Definition |
| --- |--- |
| product_variants_attr_gin_idx |CREATE INDEX product_variants_attr_gin_idx ON public.product_variants USING gin (attribute_values) |
| product_variants_lookup_idx |CREATE INDEX product_variants_lookup_idx ON public.product_variants USING btree (product_type, product_id, is_active, sort_order, id) |
| product_variants_pkey |CREATE UNIQUE INDEX product_variants_pkey ON public.product_variants USING btree (id) |
| product_variants_product_type_product_id_variant_key_key |CREATE UNIQUE INDEX product_variants_product_type_product_id_variant_key_key ON public.product_variants USING btree (product_type, product_id, variant_key) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Staff can manage product variants |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_product_variants_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.profiles

Type: table
RLS enabled: yes
Estimated rows: 21

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
| 8 |full_name |text |YES |''::text |NO |NEVER |
| 9 |phone |text |YES |''::text |NO |NEVER |
| 10 |organization_name |text |YES |''::text |NO |NEVER |
| 11 |portal_access_status |text |YES |'pending_profile'::text |NO |NEVER |
| 12 |portal_access_note |text |YES |''::text |NO |NEVER |
| 13 |crm_contact_id |uuid |YES | |NO |NEVER |
| 14 |crm_customer_id |integer(32,0) |YES | |NO |NEVER |
| 15 |shipping_address |jsonb |YES | |NO |NEVER |
| 16 |billing_address |jsonb |YES | |NO |NEVER |
| 17 |email |text |YES | |NO |NEVER |
| 18 |email_verified_at |timestamp with time zone |YES | |NO |NEVER |
| 19 |profile_completed_at |timestamp with time zone |YES | |NO |NEVER |
| 20 |portal_access_approved_override |boolean |NO |false |NO |NEVER |
| 21 |portal_access_approved_by |uuid |YES | |NO |NEVER |
| 22 |portal_access_approved_at |timestamp with time zone |YES | |NO |NEVER |
| 23 |portal_access_approved_note |text |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_18599_1_not_null |CHECK | | | |
| 2200_18599_20_not_null |CHECK | | | |
| 2200_18599_2_not_null |CHECK | | | |
| 2200_18599_6_not_null |CHECK | | | |
| 2200_18599_7_not_null |CHECK | | | |
| profiles_pkey |PRIMARY KEY |id |public.profiles |id |
| profiles_portal_access_approved_by_fkey |FOREIGN KEY |portal_access_approved_by | | |
| profiles_user_id_fkey |FOREIGN KEY |user_id | | |
| profiles_user_id_key |UNIQUE |user_id |public.profiles |user_id |

### Indexes

| Name |Definition |
| --- |--- |
| profiles_email_idx |CREATE INDEX profiles_email_idx ON public.profiles USING btree (email) |
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
Estimated rows: 41

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
| 2200_101514_10_not_null |CHECK | | | |
| 2200_101514_13_not_null |CHECK | | | |
| 2200_101514_1_not_null |CHECK | | | |
| 2200_101514_2_not_null |CHECK | | | |
| 2200_101514_3_not_null |CHECK | | | |
| 2200_101514_4_not_null |CHECK | | | |
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
Estimated rows: 48

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
| 2200_72508_10_not_null |CHECK | | | |
| 2200_72508_11_not_null |CHECK | | | |
| 2200_72508_12_not_null |CHECK | | | |
| 2200_72508_15_not_null |CHECK | | | |
| 2200_72508_16_not_null |CHECK | | | |
| 2200_72508_17_not_null |CHECK | | | |
| 2200_72508_18_not_null |CHECK | | | |
| 2200_72508_19_not_null |CHECK | | | |
| 2200_72508_1_not_null |CHECK | | | |
| 2200_72508_22_not_null |CHECK | | | |
| 2200_72508_23_not_null |CHECK | | | |
| 2200_72508_24_not_null |CHECK | | | |
| 2200_72508_2_not_null |CHECK | | | |
| 2200_72508_3_not_null |CHECK | | | |
| 2200_72508_5_not_null |CHECK | | | |
| 2200_72508_6_not_null |CHECK | | | |
| 2200_72508_8_not_null |CHECK | | | |
| 2200_72508_9_not_null |CHECK | | | |
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

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Editors can delete quote_lines |DELETE |public |has_edit_role(auth.uid()) | |
| Editors can insert quote_lines |INSERT |public | |has_edit_role(auth.uid()) |
| Editors can update quote_lines |UPDATE |public |has_edit_role(auth.uid()) | |
| Staff can view all quote lines |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_quote_lines_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.quote_lines_customer

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |YES | |NO |NEVER |
| 2 |quote_id |uuid |YES | |NO |NEVER |
| 3 |line_type |text |YES | |NO |NEVER |
| 4 |product_id |uuid |YES | |NO |NEVER |
| 5 |sku |text |YES | |NO |NEVER |
| 6 |item_name |text |YES | |NO |NEVER |
| 7 |description_override |text |YES | |NO |NEVER |
| 8 |qty |numeric |YES | |NO |NEVER |
| 9 |unit_sell_price_bbd |numeric |YES | |NO |NEVER |
| 10 |group_key |text |YES | |NO |NEVER |
| 11 |parent_line_id |uuid |YES | |NO |NEVER |
| 12 |sort_order |integer(32,0) |YES | |NO |NEVER |
| 13 |line_note |text |YES | |NO |NEVER |
| 14 |created_at |timestamp with time zone |YES | |NO |NEVER |
| 15 |updated_at |timestamp with time zone |YES | |NO |NEVER |

### Constraints

_None._

### Indexes

_None._

### RLS Policies

_None._

### Triggers

_None._

## public.quotes

Type: table
RLS enabled: yes
Estimated rows: 17

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
| 2200_72478_10_not_null |CHECK | | | |
| 2200_72478_16_not_null |CHECK | | | |
| 2200_72478_17_not_null |CHECK | | | |
| 2200_72478_18_not_null |CHECK | | | |
| 2200_72478_19_not_null |CHECK | | | |
| 2200_72478_1_not_null |CHECK | | | |
| 2200_72478_20_not_null |CHECK | | | |
| 2200_72478_21_not_null |CHECK | | | |
| 2200_72478_22_not_null |CHECK | | | |
| 2200_72478_23_not_null |CHECK | | | |
| 2200_72478_2_not_null |CHECK | | | |
| 2200_72478_3_not_null |CHECK | | | |
| 2200_72478_4_not_null |CHECK | | | |
| 2200_72478_5_not_null |CHECK | | | |
| quotes_pkey |PRIMARY KEY |id |public.quotes |id |
| quotes_quote_number_key |UNIQUE |quote_number |public.quotes |quote_number |
| quotes_quote_type_check |CHECK | |public.quotes |quote_type |
| quotes_status_check |CHECK | |public.quotes |status |

### Indexes

| Name |Definition |
| --- |--- |
| quotes_pkey |CREATE UNIQUE INDEX quotes_pkey ON public.quotes USING btree (id) |
| quotes_quote_number_key |CREATE UNIQUE INDEX quotes_quote_number_key ON public.quotes USING btree (quote_number) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Admins can delete quotes |DELETE |public |has_role(auth.uid(), 'admin'::app_role) | |
| Editors can update quotes |UPDATE |public |has_edit_role(auth.uid()) | |
| Staff can read all quotes |SELECT |authenticated |has_edit_role(auth.uid()) | |
| Users can insert authorized quotes |INSERT |authenticated | |(has_edit_role(auth.uid()) OR ((created_by = auth.uid()) AND can_access_customer_portal_feature(auth.uid(), 'quotes'::text))) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| trg_generate_quote_number |BEFORE |INSERT |ROW |EXECUTE FUNCTION generate_quote_number() |
| update_quotes_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.quotes_customer

Type: view
RLS enabled: no
Estimated rows: -1

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |YES | |NO |NEVER |
| 2 |quote_number |text |YES | |NO |NEVER |
| 3 |quote_type |text |YES | |NO |NEVER |
| 4 |status |text |YES | |NO |NEVER |
| 5 |customer_name |text |YES | |NO |NEVER |
| 6 |account_id |text |YES | |NO |NEVER |
| 7 |contact_name |text |YES | |NO |NEVER |
| 8 |contact_email |text |YES | |NO |NEVER |
| 9 |contact_phone |text |YES | |NO |NEVER |
| 10 |currency |text |YES | |NO |NEVER |
| 11 |valid_until |date |YES | |NO |NEVER |
| 12 |lead_time_days |integer(32,0) |YES | |NO |NEVER |
| 13 |notes_customer |text |YES | |NO |NEVER |
| 14 |subtotal_sell |numeric |YES | |NO |NEVER |
| 15 |grand_total |numeric |YES | |NO |NEVER |
| 16 |created_by |uuid |YES | |NO |NEVER |
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

## public.role_permissions

Type: table
RLS enabled: yes
Estimated rows: 116

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
| 2200_71189_1_not_null |CHECK | | | |
| 2200_71189_2_not_null |CHECK | | | |
| 2200_71189_3_not_null |CHECK | | | |
| 2200_71189_4_not_null |CHECK | | | |
| 2200_71189_5_not_null |CHECK | | | |
| 2200_71189_6_not_null |CHECK | | | |
| 2200_71189_7_not_null |CHECK | | | |
| role_permissions_pkey |PRIMARY KEY |id |public.role_permissions |id |
| role_permissions_role_feature_key |UNIQUE |role, role, feature, feature |public.role_permissions |role, feature, role, feature |

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
Estimated rows: 3

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
| 2200_72551_15_not_null |CHECK | | | |
| 2200_72551_16_not_null |CHECK | | | |
| 2200_72551_1_not_null |CHECK | | | |
| 2200_72551_2_not_null |CHECK | | | |
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

## public.rx_order_drafts

Type: table
RLS enabled: yes
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |status |text |NO |'draft'::text |NO |NEVER |
| 4 |name |text |NO | |NO |NEVER |
| 5 |patient_reference |text |YES | |NO |NEVER |
| 6 |input_payload |jsonb |NO |'{}'::jsonb |NO |NEVER |
| 7 |recommendation_snapshot |jsonb |YES | |NO |NEVER |
| 8 |rule_set_id |uuid |YES | |NO |NEVER |
| 9 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 10 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_128753_10_not_null |CHECK | | | |
| 2200_128753_1_not_null |CHECK | | | |
| 2200_128753_2_not_null |CHECK | | | |
| 2200_128753_3_not_null |CHECK | | | |
| 2200_128753_4_not_null |CHECK | | | |
| 2200_128753_6_not_null |CHECK | | | |
| 2200_128753_9_not_null |CHECK | | | |
| rx_order_drafts_pkey |PRIMARY KEY |id |public.rx_order_drafts |id |
| rx_order_drafts_rule_set_id_fkey |FOREIGN KEY |rule_set_id |public.lens_recommendation_rule_sets |id |
| rx_order_drafts_status_check |CHECK | |public.rx_order_drafts |status |
| rx_order_drafts_user_id_fkey |FOREIGN KEY |user_id | | |

### Indexes

| Name |Definition |
| --- |--- |
| rx_order_drafts_pkey |CREATE UNIQUE INDEX rx_order_drafts_pkey ON public.rx_order_drafts USING btree (id) |
| rx_order_drafts_user_updated_idx |CREATE INDEX rx_order_drafts_user_updated_idx ON public.rx_order_drafts USING btree (user_id, updated_at DESC) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Customers manage their own Rx drafts |ALL |authenticated |(auth.uid() = user_id) |(auth.uid() = user_id) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_rx_order_drafts_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.rx_price_categories

Type: table
RLS enabled: yes
Estimated rows: 104

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO |nextval('rx_price_categories_id_seq'::regclass) |NO |NEVER |
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
| 2200_107562_1_not_null |CHECK | | | |
| 2200_107562_2_not_null |CHECK | | | |
| 2200_107562_3_not_null |CHECK | | | |
| 2200_107562_4_not_null |CHECK | | | |
| 2200_107562_5_not_null |CHECK | | | |
| 2200_107562_6_not_null |CHECK | | | |
| 2200_107562_7_not_null |CHECK | | | |
| 2200_107562_8_not_null |CHECK | | | |
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
Estimated rows: 200

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO |nextval('rx_price_category_versions_id_seq'::regclass) |NO |NEVER |
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
| 2200_107614_1_not_null |CHECK | | | |
| 2200_107614_2_not_null |CHECK | | | |
| 2200_107614_3_not_null |CHECK | | | |
| 2200_107614_6_not_null |CHECK | | | |
| 2200_107614_7_not_null |CHECK | | | |
| 2200_107614_8_not_null |CHECK | | | |
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
Estimated rows: 24

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO |nextval('rx_price_grouping_versions_id_seq'::regclass) |NO |NEVER |
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
| 2200_107586_1_not_null |CHECK | | | |
| 2200_107586_2_not_null |CHECK | | | |
| 2200_107586_3_not_null |CHECK | | | |
| 2200_107586_6_not_null |CHECK | | | |
| 2200_107586_7_not_null |CHECK | | | |
| 2200_107586_8_not_null |CHECK | | | |
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
Estimated rows: 10

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |integer(32,0) |NO |nextval('rx_price_groupings_id_seq'::regclass) |NO |NEVER |
| 2 |key |text |NO | |NO |NEVER |
| 3 |default_name |text |NO | |NO |NEVER |
| 4 |sort_order |integer(32,0) |NO |0 |NO |NEVER |
| 5 |is_active |boolean |NO |true |NO |NEVER |
| 6 |created_at |timestamp with time zone |NO |now() |NO |NEVER |
| 7 |updated_at |timestamp with time zone |NO |now() |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_107543_1_not_null |CHECK | | | |
| 2200_107543_2_not_null |CHECK | | | |
| 2200_107543_3_not_null |CHECK | | | |
| 2200_107543_4_not_null |CHECK | | | |
| 2200_107543_5_not_null |CHECK | | | |
| 2200_107543_6_not_null |CHECK | | | |
| 2200_107543_7_not_null |CHECK | | | |
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

## public.shipment_charges

Type: table
RLS enabled: yes
Estimated rows: 431

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
| 2200_72408_10_not_null |CHECK | | | |
| 2200_72408_11_not_null |CHECK | | | |
| 2200_72408_1_not_null |CHECK | | | |
| 2200_72408_2_not_null |CHECK | | | |
| 2200_72408_3_not_null |CHECK | | | |
| 2200_72408_4_not_null |CHECK | | | |
| 2200_72408_9_not_null |CHECK | | | |
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
| Staff can select shipment_charges |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_shipment_charges_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.shipment_lines

Type: table
RLS enabled: yes
Estimated rows: 70

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
| 2200_72433_10_not_null |CHECK | | | |
| 2200_72433_11_not_null |CHECK | | | |
| 2200_72433_12_not_null |CHECK | | | |
| 2200_72433_13_not_null |CHECK | | | |
| 2200_72433_14_not_null |CHECK | | | |
| 2200_72433_1_not_null |CHECK | | | |
| 2200_72433_2_not_null |CHECK | | | |
| 2200_72433_3_not_null |CHECK | | | |
| 2200_72433_7_not_null |CHECK | | | |
| 2200_72433_8_not_null |CHECK | | | |
| 2200_72433_9_not_null |CHECK | | | |
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
| Staff can select shipment_lines |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_shipment_lines_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.shipment_types

Type: table
RLS enabled: yes
Estimated rows: 5

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
| 2200_80988_1_not_null |CHECK | | | |
| 2200_80988_2_not_null |CHECK | | | |
| 2200_80988_3_not_null |CHECK | | | |
| 2200_80988_4_not_null |CHECK | | | |
| 2200_80988_5_not_null |CHECK | | | |
| 2200_80988_6_not_null |CHECK | | | |
| 2200_80988_7_not_null |CHECK | | | |
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
Estimated rows: 110

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
| 2200_72375_10_not_null |CHECK | | | |
| 2200_72375_11_not_null |CHECK | | | |
| 2200_72375_12_not_null |CHECK | | | |
| 2200_72375_13_not_null |CHECK | | | |
| 2200_72375_14_not_null |CHECK | | | |
| 2200_72375_15_not_null |CHECK | | | |
| 2200_72375_17_not_null |CHECK | | | |
| 2200_72375_18_not_null |CHECK | | | |
| 2200_72375_19_not_null |CHECK | | | |
| 2200_72375_1_not_null |CHECK | | | |
| 2200_72375_20_not_null |CHECK | | | |
| 2200_72375_2_not_null |CHECK | | | |
| 2200_72375_3_not_null |CHECK | | | |
| 2200_72375_4_not_null |CHECK | | | |
| 2200_72375_7_not_null |CHECK | | | |
| 2200_72375_8_not_null |CHECK | | | |
| 2200_72375_9_not_null |CHECK | | | |
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
| Staff can select shipments |SELECT |authenticated |has_edit_role(auth.uid()) | |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| update_shipments_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION update_updated_at_column() |

## public.statement_lines

Type: table
RLS enabled: yes
Estimated rows: 75583

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |bigint(64,0) |NO | |YES |NEVER |
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
| 2200_128447_10_not_null |CHECK | | | |
| 2200_128447_11_not_null |CHECK | | | |
| 2200_128447_1_not_null |CHECK | | | |
| 2200_128447_2_not_null |CHECK | | | |
| 2200_128447_3_not_null |CHECK | | | |
| statement_lines_innovations_statement_id_fkey |FOREIGN KEY |innovations_statement_id |public.statements |innovations_statement_id |
| statement_lines_innovations_statement_item_id_key |UNIQUE |innovations_statement_item_id |public.statement_lines |innovations_statement_item_id |
| statement_lines_pkey |PRIMARY KEY |id |public.statement_lines |id |

### Indexes

| Name |Definition |
| --- |--- |
| statement_lines_innovations_statement_item_id_key |CREATE UNIQUE INDEX statement_lines_innovations_statement_item_id_key ON public.statement_lines USING btree (innovations_statement_item_id) |
| statement_lines_pkey |CREATE UNIQUE INDEX statement_lines_pkey ON public.statement_lines USING btree (id) |
| statement_lines_statement_id_idx |CREATE INDEX statement_lines_statement_id_idx ON public.statement_lines USING btree (innovations_statement_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Customers read own statement_lines |SELECT |authenticated |(can_access_customer_portal_feature(auth.uid(), 'statements'::text) AND (innovations_statement_id IN ( SELECT statements.innovations_statement_id<br>   FROM statements<br>  WHERE (statements.customer_id IN ( SELECT profiles.crm_customer_id<br>           FROM profiles<br>          WHERE (profiles.user_id = auth.uid())))))) | |
| Service role full access statement_lines |ALL |service_role |true |true |
| Staff full read on statement_lines |SELECT |authenticated |has_edit_role(auth.uid()) | |

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
Estimated rows: 4077

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |bigint(64,0) |NO | |YES |NEVER |
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
| 2200_128425_1_not_null |CHECK | | | |
| 2200_128425_20_not_null |CHECK | | | |
| 2200_128425_21_not_null |CHECK | | | |
| 2200_128425_22_not_null |CHECK | | | |
| 2200_128425_24_not_null |CHECK | | | |
| 2200_128425_25_not_null |CHECK | | | |
| 2200_128425_2_not_null |CHECK | | | |
| 2200_128425_3_not_null |CHECK | | | |
| statements_customer_id_fkey |FOREIGN KEY |customer_id |public.customers |id |
| statements_innovations_statement_id_key |UNIQUE |innovations_statement_id |public.statements |innovations_statement_id |
| statements_pkey |PRIMARY KEY |id |public.statements |id |

### Indexes

| Name |Definition |
| --- |--- |
| statements_account_number_idx |CREATE INDEX statements_account_number_idx ON public.statements USING btree (account_number) |
| statements_customer_id_idx |CREATE INDEX statements_customer_id_idx ON public.statements USING btree (customer_id) |
| statements_innovations_statement_id_key |CREATE UNIQUE INDEX statements_innovations_statement_id_key ON public.statements USING btree (innovations_statement_id) |
| statements_pkey |CREATE UNIQUE INDEX statements_pkey ON public.statements USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| Customers read own statements |SELECT |authenticated |(can_access_customer_portal_feature(auth.uid(), 'statements'::text) AND (customer_id IN ( SELECT profiles.crm_customer_id<br>   FROM profiles<br>  WHERE (profiles.user_id = auth.uid())))) | |
| Service role full access statements |ALL |service_role |true |true |
| Staff full read on statements |SELECT |authenticated |has_edit_role(auth.uid()) | |

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
Estimated rows: 3

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
| 2200_111260_1_not_null |CHECK | | | |
| 2200_111260_2_not_null |CHECK | | | |
| 2200_111260_3_not_null |CHECK | | | |
| 2200_111260_4_not_null |CHECK | | | |
| 2200_111260_5_not_null |CHECK | | | |
| 2200_111260_6_not_null |CHECK | | | |
| 2200_111260_7_not_null |CHECK | | | |
| 2200_111260_8_not_null |CHECK | | | |
| store_product_media_pkey |PRIMARY KEY |id |public.store_product_media |id |
| store_product_media_product_type_check |CHECK | |public.store_product_media |product_type |

### Indexes

| Name |Definition |
| --- |--- |
| idx_store_product_media_product |CREATE INDEX idx_store_product_media_product ON public.store_product_media USING btree (product_type, product_id, is_active, sort_order) |
| store_product_media_pkey |CREATE UNIQUE INDEX store_product_media_pkey ON public.store_product_media USING btree (id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| store_product_media_read_authenticated |SELECT |authenticated |true | |
| store_product_media_write_staff |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| trg_store_product_media_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION set_updated_at_timestamp() |

## public.store_product_overrides

Type: table
RLS enabled: yes
Estimated rows: 3

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
| 2200_111244_1_not_null |CHECK | | | |
| 2200_111244_2_not_null |CHECK | | | |
| 2200_111244_3_not_null |CHECK | | | |
| 2200_111244_4_not_null |CHECK | | | |
| 2200_111244_6_not_null |CHECK | | | |
| 2200_111244_7_not_null |CHECK | | | |
| 2200_111244_8_not_null |CHECK | | | |
| store_product_overrides_pkey |PRIMARY KEY |id |public.store_product_overrides |id |
| store_product_overrides_product_type_check |CHECK | |public.store_product_overrides |product_type |
| store_product_overrides_product_type_product_id_key |UNIQUE |product_type, product_type, product_id, product_id |public.store_product_overrides |product_type, product_id, product_type, product_id |

### Indexes

| Name |Definition |
| --- |--- |
| idx_store_product_overrides_product |CREATE INDEX idx_store_product_overrides_product ON public.store_product_overrides USING btree (product_type, product_id) |
| store_product_overrides_pkey |CREATE UNIQUE INDEX store_product_overrides_pkey ON public.store_product_overrides USING btree (id) |
| store_product_overrides_product_type_product_id_key |CREATE UNIQUE INDEX store_product_overrides_product_type_product_id_key ON public.store_product_overrides USING btree (product_type, product_id) |

### RLS Policies

| Name |Command |Roles |Using |With check |
| --- |--- |--- |--- |--- |
| store_product_overrides_read_authenticated |SELECT |authenticated |true | |
| store_product_overrides_write_staff |ALL |authenticated |has_edit_role(auth.uid()) |has_edit_role(auth.uid()) |

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| trg_store_product_overrides_updated_at |BEFORE |UPDATE |ROW |EXECUTE FUNCTION set_updated_at_timestamp() |

## public.store_product_variant_settings

Type: table
RLS enabled: yes
Estimated rows: 5

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
| 2200_114957_10_not_null |CHECK | | | |
| 2200_114957_11_not_null |CHECK | | | |
| 2200_114957_1_not_null |CHECK | | | |
| 2200_114957_2_not_null |CHECK | | | |
| 2200_114957_3_not_null |CHECK | | | |
| 2200_114957_4_not_null |CHECK | | | |
| 2200_114957_7_not_null |CHECK | | | |
| store_product_variant_settings_pkey |PRIMARY KEY |id |public.store_product_variant_settings |id |
| store_product_variant_settings_product_type_check |CHECK | |public.store_product_variant_settings |product_type |
| store_product_variant_settings_product_type_product_id_key |UNIQUE |product_type, product_type, product_id, product_id |public.store_product_variant_settings |product_type, product_id, product_type, product_id |

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
Estimated rows: 239

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
| 2200_114972_10_not_null |CHECK | | | |
| 2200_114972_12_not_null |CHECK | | | |
| 2200_114972_13_not_null |CHECK | | | |
| 2200_114972_14_not_null |CHECK | | | |
| 2200_114972_15_not_null |CHECK | | | |
| 2200_114972_16_not_null |CHECK | | | |
| 2200_114972_17_not_null |CHECK | | | |
| 2200_114972_1_not_null |CHECK | | | |
| 2200_114972_20_not_null |CHECK | | | |
| 2200_114972_21_not_null |CHECK | | | |
| 2200_114972_2_not_null |CHECK | | | |
| 2200_114972_3_not_null |CHECK | | | |
| 2200_114972_4_not_null |CHECK | | | |
| 2200_114972_5_not_null |CHECK | | | |
| 2200_114972_8_not_null |CHECK | | | |
| 2200_114972_9_not_null |CHECK | | | |
| store_product_variants_pkey |PRIMARY KEY |id |public.store_product_variants |id |
| store_product_variants_product_type_check |CHECK | |public.store_product_variants |product_type |
| store_product_variants_product_type_product_id_variant_key_key |UNIQUE |product_type, product_type, product_type, product_id, product_id, product_id, variant_key, variant_key, variant_key |public.store_product_variants |product_id, variant_key, product_type, product_id, variant_key, product_type, variant_key, product_type, product_id |

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
| 10 |price |numeric(12,2) |YES | |NO |NEVER |
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
Estimated rows: 250

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
| 2200_114996_1_not_null |CHECK | | | |
| 2200_114996_3_not_null |CHECK | | | |
| 2200_114996_7_not_null |CHECK | | | |
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
Estimated rows: 42

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
| 2200_65123_1_not_null |CHECK | | | |
| 2200_65123_2_not_null |CHECK | | | |
| 2200_65123_3_not_null |CHECK | | | |
| 2200_65123_4_not_null |CHECK | | | |
| 2200_65123_5_not_null |CHECK | | | |
| 2200_65123_6_not_null |CHECK | | | |
| 2200_65123_7_not_null |CHECK | | | |
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
Estimated rows: 39

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
| 2200_66501_10_not_null |CHECK | | | |
| 2200_66501_11_not_null |CHECK | | | |
| 2200_66501_14_not_null |CHECK | | | |
| 2200_66501_15_not_null |CHECK | | | |
| 2200_66501_17_not_null |CHECK | | | |
| 2200_66501_18_not_null |CHECK | | | |
| 2200_66501_19_not_null |CHECK | | | |
| 2200_66501_1_not_null |CHECK | | | |
| 2200_66501_20_not_null |CHECK | | | |
| 2200_66501_21_not_null |CHECK | | | |
| 2200_66501_22_not_null |CHECK | | | |
| 2200_66501_23_not_null |CHECK | | | |
| 2200_66501_24_not_null |CHECK | | | |
| 2200_66501_25_not_null |CHECK | | | |
| 2200_66501_26_not_null |CHECK | | | |
| 2200_66501_28_not_null |CHECK | | | |
| 2200_66501_2_not_null |CHECK | | | |
| 2200_66501_3_not_null |CHECK | | | |
| 2200_66501_4_not_null |CHECK | | | |
| 2200_66501_6_not_null |CHECK | | | |
| 2200_66501_7_not_null |CHECK | | | |
| 2200_66501_8_not_null |CHECK | | | |
| 2200_66501_9_not_null |CHECK | | | |
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
Estimated rows: 8

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
| 2200_72351_1_not_null |CHECK | | | |
| 2200_72351_2_not_null |CHECK | | | |
| 2200_72351_3_not_null |CHECK | | | |
| 2200_72351_4_not_null |CHECK | | | |
| 2200_72351_5_not_null |CHECK | | | |
| 2200_72351_6_not_null |CHECK | | | |
| 2200_72351_7_not_null |CHECK | | | |
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
| 2200_120512_1_not_null |CHECK | | | |
| 2200_120512_2_not_null |CHECK | | | |
| 2200_120512_3_not_null |CHECK | | | |
| 2200_120512_5_not_null |CHECK | | | |
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
Estimated rows: 14

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
| 2200_114761_1_not_null |CHECK | | | |
| 2200_114761_2_not_null |CHECK | | | |
| 2200_114761_3_not_null |CHECK | | | |
| 2200_114761_4_not_null |CHECK | | | |
| 2200_114761_5_not_null |CHECK | | | |
| 2200_114761_6_not_null |CHECK | | | |
| 2200_114761_7_not_null |CHECK | | | |
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
Estimated rows: 19

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 2 |user_id |uuid |NO | |NO |NEVER |
| 3 |role |public.app_role |NO | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 2200_65105_1_not_null |CHECK | | | |
| 2200_65105_2_not_null |CHECK | | | |
| 2200_65105_3_not_null |CHECK | | | |
| user_roles_pkey |PRIMARY KEY |id |public.user_roles |id |
| user_roles_user_id_fkey |FOREIGN KEY |user_id | | |
| user_roles_user_id_role_key |UNIQUE |user_id, user_id, role, role |public.user_roles |user_id, role, user_id, role |

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
Estimated rows: 85

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
| 2200_120092_1_not_null |CHECK | | | |
| 2200_120092_2_not_null |CHECK | | | |
| 2200_120092_3_not_null |CHECK | | | |
| 2200_120092_4_not_null |CHECK | | | |
| 2200_120092_5_not_null |CHECK | | | |
| 2200_120092_6_not_null |CHECK | | | |
| 2200_120092_7_not_null |CHECK | | | |
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

### Triggers

_None._

## public.website_analytics_sessions

Type: table
RLS enabled: yes
Estimated rows: 23

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
| 2200_120070_10_not_null |CHECK | | | |
| 2200_120070_11_not_null |CHECK | | | |
| 2200_120070_13_not_null |CHECK | | | |
| 2200_120070_14_not_null |CHECK | | | |
| 2200_120070_1_not_null |CHECK | | | |
| 2200_120070_2_not_null |CHECK | | | |
| 2200_120070_3_not_null |CHECK | | | |
| 2200_120070_4_not_null |CHECK | | | |
| 2200_120070_5_not_null |CHECK | | | |
| 2200_120070_6_not_null |CHECK | | | |
| 2200_120070_7_not_null |CHECK | | | |
| 2200_120070_8_not_null |CHECK | | | |
| 2200_120070_9_not_null |CHECK | | | |
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

### Triggers

| Name |Timing |Event |Orientation |Statement |
| --- |--- |--- |--- |--- |
| trg_restrict_analytics_session_update |BEFORE |UPDATE |ROW |EXECUTE FUNCTION restrict_analytics_session_update() |

## public.website_analytics_web_vitals

Type: table
RLS enabled: yes
Estimated rows: 202

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
| 2200_120108_10_not_null |CHECK | | | |
| 2200_120108_11_not_null |CHECK | | | |
| 2200_120108_1_not_null |CHECK | | | |
| 2200_120108_2_not_null |CHECK | | | |
| 2200_120108_3_not_null |CHECK | | | |
| 2200_120108_4_not_null |CHECK | | | |
| 2200_120108_5_not_null |CHECK | | | |
| 2200_120108_6_not_null |CHECK | | | |
| 2200_120108_7_not_null |CHECK | | | |
| 2200_120108_8_not_null |CHECK | | | |
| 2200_120108_9_not_null |CHECK | | | |
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
| 2200_130325_1_not_null |CHECK | | | |
| 2200_130325_2_not_null |CHECK | | | |
| 2200_130325_4_not_null |CHECK | | | |
| 2200_130325_6_not_null |CHECK | | | |
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
Estimated rows: 1

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
| 2200_71223_11_not_null |CHECK | | | |
| 2200_71223_12_not_null |CHECK | | | |
| 2200_71223_1_not_null |CHECK | | | |
| 2200_71223_2_not_null |CHECK | | | |
| 2200_71223_3_not_null |CHECK | | | |
| 2200_71223_6_not_null |CHECK | | | |
| 2200_71223_7_not_null |CHECK | | | |
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
| Anyone can submit wholesale inquiry |INSERT |anon, authenticated | |((length(TRIM(BOTH FROM business_name)) > 0) AND (length(TRIM(BOTH FROM contact_name)) > 0) AND (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text) AND (status = 'new'::text)) |

### Triggers

_None._

## public.wiki_headings

Type: table
RLS enabled: yes
Estimated rows: 2

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
| 2200_83410_1_not_null |CHECK | | | |
| 2200_83410_2_not_null |CHECK | | | |
| 2200_83410_3_not_null |CHECK | | | |
| 2200_83410_4_not_null |CHECK | | | |
| 2200_83410_5_not_null |CHECK | | | |
| 2200_83410_6_not_null |CHECK | | | |
| 2200_83410_7_not_null |CHECK | | | |
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
| 16555_17467_10_not_null |CHECK | | | |
| 16555_17467_3_not_null |CHECK | | | |
| 16555_17467_4_not_null |CHECK | | | |
| 16555_17467_8_not_null |CHECK | | | |
| 16555_17467_9_not_null |CHECK | | | |
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

## realtime.messages_2026_07_14

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |topic |text |NO | |NO |NEVER |
| 2 |extension |text |NO | |NO |NEVER |
| 3 |payload |jsonb |YES | |NO |NEVER |
| 4 |event |text |YES | |NO |NEVER |
| 5 |private |boolean |YES |false |NO |NEVER |
| 6 |updated_at |timestamp without time zone |NO |now() |NO |NEVER |
| 7 |inserted_at |timestamp without time zone |NO |now() |NO |NEVER |
| 8 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 9 |binary_payload |bytea |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16555_130921_1_not_null |CHECK | | | |
| 16555_130921_2_not_null |CHECK | | | |
| 16555_130921_6_not_null |CHECK | | | |
| 16555_130921_7_not_null |CHECK | | | |
| 16555_130921_8_not_null |CHECK | | | |
| messages_2026_07_14_pkey |PRIMARY KEY |id, inserted_at | | |
| messages_payload_exclusive |CHECK | | | |

### Indexes

| Name |Definition |
| --- |--- |
| messages_2026_07_14_inserted_at_topic_idx |CREATE INDEX messages_2026_07_14_inserted_at_topic_idx ON realtime.messages_2026_07_14 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE)) |
| messages_2026_07_14_pkey |CREATE UNIQUE INDEX messages_2026_07_14_pkey ON realtime.messages_2026_07_14 USING btree (id, inserted_at) |

### RLS Policies

_None._

### Triggers

_None._

## realtime.messages_2026_07_15

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |topic |text |NO | |NO |NEVER |
| 2 |extension |text |NO | |NO |NEVER |
| 3 |payload |jsonb |YES | |NO |NEVER |
| 4 |event |text |YES | |NO |NEVER |
| 5 |private |boolean |YES |false |NO |NEVER |
| 6 |updated_at |timestamp without time zone |NO |now() |NO |NEVER |
| 7 |inserted_at |timestamp without time zone |NO |now() |NO |NEVER |
| 8 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 9 |binary_payload |bytea |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16555_130934_1_not_null |CHECK | | | |
| 16555_130934_2_not_null |CHECK | | | |
| 16555_130934_6_not_null |CHECK | | | |
| 16555_130934_7_not_null |CHECK | | | |
| 16555_130934_8_not_null |CHECK | | | |
| messages_2026_07_15_pkey |PRIMARY KEY |id, inserted_at | | |
| messages_payload_exclusive |CHECK | | | |

### Indexes

| Name |Definition |
| --- |--- |
| messages_2026_07_15_inserted_at_topic_idx |CREATE INDEX messages_2026_07_15_inserted_at_topic_idx ON realtime.messages_2026_07_15 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE)) |
| messages_2026_07_15_pkey |CREATE UNIQUE INDEX messages_2026_07_15_pkey ON realtime.messages_2026_07_15 USING btree (id, inserted_at) |

### RLS Policies

_None._

### Triggers

_None._

## realtime.messages_2026_07_16

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |topic |text |NO | |NO |NEVER |
| 2 |extension |text |NO | |NO |NEVER |
| 3 |payload |jsonb |YES | |NO |NEVER |
| 4 |event |text |YES | |NO |NEVER |
| 5 |private |boolean |YES |false |NO |NEVER |
| 6 |updated_at |timestamp without time zone |NO |now() |NO |NEVER |
| 7 |inserted_at |timestamp without time zone |NO |now() |NO |NEVER |
| 8 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 9 |binary_payload |bytea |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16555_130947_1_not_null |CHECK | | | |
| 16555_130947_2_not_null |CHECK | | | |
| 16555_130947_6_not_null |CHECK | | | |
| 16555_130947_7_not_null |CHECK | | | |
| 16555_130947_8_not_null |CHECK | | | |
| messages_2026_07_16_pkey |PRIMARY KEY |id, inserted_at | | |
| messages_payload_exclusive |CHECK | | | |

### Indexes

| Name |Definition |
| --- |--- |
| messages_2026_07_16_inserted_at_topic_idx |CREATE INDEX messages_2026_07_16_inserted_at_topic_idx ON realtime.messages_2026_07_16 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE)) |
| messages_2026_07_16_pkey |CREATE UNIQUE INDEX messages_2026_07_16_pkey ON realtime.messages_2026_07_16 USING btree (id, inserted_at) |

### RLS Policies

_None._

### Triggers

_None._

## realtime.messages_2026_07_17

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |topic |text |NO | |NO |NEVER |
| 2 |extension |text |NO | |NO |NEVER |
| 3 |payload |jsonb |YES | |NO |NEVER |
| 4 |event |text |YES | |NO |NEVER |
| 5 |private |boolean |YES |false |NO |NEVER |
| 6 |updated_at |timestamp without time zone |NO |now() |NO |NEVER |
| 7 |inserted_at |timestamp without time zone |NO |now() |NO |NEVER |
| 8 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 9 |binary_payload |bytea |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16555_130960_1_not_null |CHECK | | | |
| 16555_130960_2_not_null |CHECK | | | |
| 16555_130960_6_not_null |CHECK | | | |
| 16555_130960_7_not_null |CHECK | | | |
| 16555_130960_8_not_null |CHECK | | | |
| messages_2026_07_17_pkey |PRIMARY KEY |id, inserted_at | | |
| messages_payload_exclusive |CHECK | | | |

### Indexes

| Name |Definition |
| --- |--- |
| messages_2026_07_17_inserted_at_topic_idx |CREATE INDEX messages_2026_07_17_inserted_at_topic_idx ON realtime.messages_2026_07_17 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE)) |
| messages_2026_07_17_pkey |CREATE UNIQUE INDEX messages_2026_07_17_pkey ON realtime.messages_2026_07_17 USING btree (id, inserted_at) |

### RLS Policies

_None._

### Triggers

_None._

## realtime.messages_2026_07_18

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |topic |text |NO | |NO |NEVER |
| 2 |extension |text |NO | |NO |NEVER |
| 3 |payload |jsonb |YES | |NO |NEVER |
| 4 |event |text |YES | |NO |NEVER |
| 5 |private |boolean |YES |false |NO |NEVER |
| 6 |updated_at |timestamp without time zone |NO |now() |NO |NEVER |
| 7 |inserted_at |timestamp without time zone |NO |now() |NO |NEVER |
| 8 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 9 |binary_payload |bytea |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16555_130973_1_not_null |CHECK | | | |
| 16555_130973_2_not_null |CHECK | | | |
| 16555_130973_6_not_null |CHECK | | | |
| 16555_130973_7_not_null |CHECK | | | |
| 16555_130973_8_not_null |CHECK | | | |
| messages_2026_07_18_pkey |PRIMARY KEY |id, inserted_at | | |
| messages_payload_exclusive |CHECK | | | |

### Indexes

| Name |Definition |
| --- |--- |
| messages_2026_07_18_inserted_at_topic_idx |CREATE INDEX messages_2026_07_18_inserted_at_topic_idx ON realtime.messages_2026_07_18 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE)) |
| messages_2026_07_18_pkey |CREATE UNIQUE INDEX messages_2026_07_18_pkey ON realtime.messages_2026_07_18 USING btree (id, inserted_at) |

### RLS Policies

_None._

### Triggers

_None._

## realtime.messages_2026_07_19

Type: table
RLS enabled: no
Estimated rows: 0

### Columns

| # |Column |Type |Nullable |Default |Identity |Generated |
| --- |--- |--- |--- |--- |--- |--- |
| 1 |topic |text |NO | |NO |NEVER |
| 2 |extension |text |NO | |NO |NEVER |
| 3 |payload |jsonb |YES | |NO |NEVER |
| 4 |event |text |YES | |NO |NEVER |
| 5 |private |boolean |YES |false |NO |NEVER |
| 6 |updated_at |timestamp without time zone |NO |now() |NO |NEVER |
| 7 |inserted_at |timestamp without time zone |NO |now() |NO |NEVER |
| 8 |id |uuid |NO |gen_random_uuid() |NO |NEVER |
| 9 |binary_payload |bytea |YES | |NO |NEVER |

### Constraints

| Name |Type |Columns |Foreign table |Foreign columns |
| --- |--- |--- |--- |--- |
| 16555_131154_1_not_null |CHECK | | | |
| 16555_131154_2_not_null |CHECK | | | |
| 16555_131154_6_not_null |CHECK | | | |
| 16555_131154_7_not_null |CHECK | | | |
| 16555_131154_8_not_null |CHECK | | | |
| messages_2026_07_19_pkey |PRIMARY KEY |id, inserted_at | | |
| messages_payload_exclusive |CHECK | | | |

### Indexes

| Name |Definition |
| --- |--- |
| messages_2026_07_19_inserted_at_topic_idx |CREATE INDEX messages_2026_07_19_inserted_at_topic_idx ON realtime.messages_2026_07_19 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE)) |
| messages_2026_07_19_pkey |CREATE UNIQUE INDEX messages_2026_07_19_pkey ON realtime.messages_2026_07_19 USING btree (id, inserted_at) |

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
| 16555_17325_1_not_null |CHECK | | | |
| 16555_17325_2_not_null |CHECK | | | |
| 16555_17325_4_not_null |CHECK | | | |
| 16555_17325_5_not_null |CHECK | | | |
| 16555_17325_7_not_null |CHECK | | | |
| 16555_17325_8_not_null |CHECK | | | |
| 16555_17325_9_not_null |CHECK | | | |
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
| tr_check_filters |BEFORE |UPDATE |ROW |EXECUTE FUNCTION realtime.subscription_check_filters() |
| tr_check_filters |BEFORE |INSERT |ROW |EXECUTE FUNCTION realtime.subscription_check_filters() |

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
| 16542_17084_11_not_null |CHECK | | | |
| 16542_17084_1_not_null |CHECK | | | |
| 16542_17084_2_not_null |CHECK | | | |
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
| 16542_17246_1_not_null |CHECK | | | |
| 16542_17246_2_not_null |CHECK | | | |
| 16542_17246_3_not_null |CHECK | | | |
| 16542_17246_4_not_null |CHECK | | | |
| 16542_17246_5_not_null |CHECK | | | |
| 16542_17246_6_not_null |CHECK | | | |
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
Estimated rows: 28

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
| 16542_17094_1_not_null |CHECK | | | |
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
| Staff read access for data-files |SELECT |authenticated |((bucket_id = 'data-files'::text) AND has_edit_role(auth.uid())) | |
| Video files are publicly accessible |SELECT |public |(bucket_id = 'video'::text) | |
| product_images_editor_write |ALL |authenticated |((bucket_id = 'product-images'::text) AND has_edit_role(auth.uid())) |((bucket_id = 'product-images'::text) AND has_edit_role(auth.uid())) |
| product_images_public_read |SELECT |public |(bucket_id = 'product-images'::text) | |

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
| 16542_17144_1_not_null |CHECK | | | |
| 16542_17144_2_not_null |CHECK | | | |
| 16542_17144_3_not_null |CHECK | | | |
| 16542_17144_4_not_null |CHECK | | | |
| 16542_17144_5_not_null |CHECK | | | |
| 16542_17144_6_not_null |CHECK | | | |
| 16542_17144_8_not_null |CHECK | | | |
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
| 16542_17158_10_not_null |CHECK | | | |
| 16542_17158_1_not_null |CHECK | | | |
| 16542_17158_2_not_null |CHECK | | | |
| 16542_17158_3_not_null |CHECK | | | |
| 16542_17158_4_not_null |CHECK | | | |
| 16542_17158_5_not_null |CHECK | | | |
| 16542_17158_6_not_null |CHECK | | | |
| 16542_17158_7_not_null |CHECK | | | |
| 16542_17158_9_not_null |CHECK | | | |
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
Estimated rows: 149

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
| 18589_18590_1_not_null |CHECK | | | |
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
Estimated rows: 1

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
| 16603_16608_1_not_null |CHECK | | | |
| 16603_16608_3_not_null |CHECK | | | |
| 16603_16608_4_not_null |CHECK | | | |
| 16603_16608_7_not_null |CHECK | | | |
| 16603_16608_8_not_null |CHECK | | | |
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

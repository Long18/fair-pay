--
-- PostgreSQL database dump
--

\restrict etpvbjkFaBpBrIOSLM5Mpd1p5ZfkeBdoveTPNmE4vN6kIFSpr0aqsSDffAD0Bm2

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP EVENT TRIGGER IF EXISTS pgrst_drop_watch;
DROP EVENT TRIGGER IF EXISTS pgrst_ddl_watch;
DROP EVENT TRIGGER IF EXISTS issue_pg_net_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_graphql_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_cron_access;
DROP EVENT TRIGGER IF EXISTS issue_graphql_placeholder;
DROP PUBLICATION IF EXISTS supabase_realtime;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
DROP POLICY IF EXISTS notifications_read_own ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_own ON public.notifications;
DROP POLICY IF EXISTS momo_webhook_logs_admin_only ON public.momo_webhook_logs;
DROP POLICY IF EXISTS momo_settings_update_policy ON public.momo_settings;
DROP POLICY IF EXISTS momo_settings_read_policy ON public.momo_settings;
DROP POLICY IF EXISTS momo_settings_insert_policy ON public.momo_settings;
DROP POLICY IF EXISTS momo_payment_requests_update_own ON public.momo_payment_requests;
DROP POLICY IF EXISTS momo_payment_requests_read_own ON public.momo_payment_requests;
DROP POLICY IF EXISTS momo_payment_requests_create_own ON public.momo_payment_requests;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
ALTER TABLE IF EXISTS ONLY storage.vector_indexes DROP CONSTRAINT IF EXISTS vector_indexes_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_upload_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads DROP CONSTRAINT IF EXISTS s3_multipart_uploads_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.prefixes DROP CONSTRAINT IF EXISTS "prefixes_bucketId_fkey";
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS "objects_bucketId_fkey";
ALTER TABLE IF EXISTS ONLY storage.iceberg_tables DROP CONSTRAINT IF EXISTS iceberg_tables_namespace_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.iceberg_tables DROP CONSTRAINT IF EXISTS iceberg_tables_catalog_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.iceberg_namespaces DROP CONSTRAINT IF EXISTS iceberg_namespaces_catalog_id_fkey;
ALTER TABLE IF EXISTS ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE IF EXISTS ONLY public.momo_webhook_logs DROP CONSTRAINT IF EXISTS momo_webhook_logs_matched_request_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sso_domains DROP CONSTRAINT IF EXISTS sso_domains_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_oauth_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_flow_state_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_session_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.one_time_tokens DROP CONSTRAINT IF EXISTS one_time_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_challenges DROP CONSTRAINT IF EXISTS mfa_challenges_auth_factor_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS mfa_amr_claims_session_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_user_id_fkey;
ALTER TABLE IF EXISTS ONLY _realtime.extensions DROP CONSTRAINT IF EXISTS extensions_tenant_external_id_fkey;
DROP TRIGGER IF EXISTS update_objects_updated_at ON storage.objects;
DROP TRIGGER IF EXISTS prefixes_delete_hierarchy ON storage.prefixes;
DROP TRIGGER IF EXISTS prefixes_create_hierarchy ON storage.prefixes;
DROP TRIGGER IF EXISTS objects_update_create_prefix ON storage.objects;
DROP TRIGGER IF EXISTS objects_insert_create_prefix ON storage.objects;
DROP TRIGGER IF EXISTS objects_delete_delete_prefix ON storage.objects;
DROP TRIGGER IF EXISTS enforce_bucket_name_length_trigger ON storage.buckets;
DROP TRIGGER IF EXISTS tr_check_filters ON realtime.subscription;
DROP TRIGGER IF EXISTS update_momo_settings_updated_at ON public.momo_settings;
DROP TRIGGER IF EXISTS update_momo_payment_requests_updated_at ON public.momo_payment_requests;
DROP INDEX IF EXISTS supabase_functions.supabase_functions_hooks_request_id_idx;
DROP INDEX IF EXISTS supabase_functions.supabase_functions_hooks_h_table_id_h_name_idx;
DROP INDEX IF EXISTS storage.vector_indexes_name_bucket_id_idx;
DROP INDEX IF EXISTS storage.objects_bucket_id_level_idx;
DROP INDEX IF EXISTS storage.name_prefix_search;
DROP INDEX IF EXISTS storage.idx_prefixes_lower_name;
DROP INDEX IF EXISTS storage.idx_objects_lower_name;
DROP INDEX IF EXISTS storage.idx_objects_bucket_id_name;
DROP INDEX IF EXISTS storage.idx_name_bucket_level_unique;
DROP INDEX IF EXISTS storage.idx_multipart_uploads_list;
DROP INDEX IF EXISTS storage.idx_iceberg_tables_namespace_id;
DROP INDEX IF EXISTS storage.idx_iceberg_tables_location;
DROP INDEX IF EXISTS storage.idx_iceberg_namespaces_bucket_id;
DROP INDEX IF EXISTS storage.buckets_analytics_unique_name_idx;
DROP INDEX IF EXISTS storage.bucketid_objname;
DROP INDEX IF EXISTS storage.bname;
DROP INDEX IF EXISTS realtime.subscription_subscription_id_entity_filters_key;
DROP INDEX IF EXISTS realtime.messages_inserted_at_topic_index;
DROP INDEX IF EXISTS realtime.ix_realtime_subscription_entity;
DROP INDEX IF EXISTS public.idx_notifications_user_unread_created;
DROP INDEX IF EXISTS public.idx_notifications_user_created;
DROP INDEX IF EXISTS public.idx_notifications_type_created;
DROP INDEX IF EXISTS public.idx_momo_webhook_logs_tran_id;
DROP INDEX IF EXISTS public.idx_momo_webhook_logs_processed;
DROP INDEX IF EXISTS public.idx_momo_webhook_logs_created_at;
DROP INDEX IF EXISTS public.idx_momo_payment_requests_user_id;
DROP INDEX IF EXISTS public.idx_momo_payment_requests_status;
DROP INDEX IF EXISTS public.idx_momo_payment_requests_reference_code;
DROP INDEX IF EXISTS public.idx_momo_payment_requests_expense_split_id;
DROP INDEX IF EXISTS public.idx_momo_payment_requests_created_at;
DROP INDEX IF EXISTS auth.users_is_anonymous_idx;
DROP INDEX IF EXISTS auth.users_instance_id_idx;
DROP INDEX IF EXISTS auth.users_instance_id_email_idx;
DROP INDEX IF EXISTS auth.users_email_partial_key;
DROP INDEX IF EXISTS auth.user_id_created_at_idx;
DROP INDEX IF EXISTS auth.unique_phone_factor_per_user;
DROP INDEX IF EXISTS auth.sso_providers_resource_id_pattern_idx;
DROP INDEX IF EXISTS auth.sso_providers_resource_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_domain_idx;
DROP INDEX IF EXISTS auth.sessions_user_id_idx;
DROP INDEX IF EXISTS auth.sessions_oauth_client_id_idx;
DROP INDEX IF EXISTS auth.sessions_not_after_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_for_email_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_created_at_idx;
DROP INDEX IF EXISTS auth.saml_providers_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_updated_at_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_session_id_revoked_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_parent_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_user_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_idx;
DROP INDEX IF EXISTS auth.recovery_token_idx;
DROP INDEX IF EXISTS auth.reauthentication_token_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_user_id_token_type_key;
DROP INDEX IF EXISTS auth.one_time_tokens_token_hash_hash_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_relates_to_hash_idx;
DROP INDEX IF EXISTS auth.oauth_consents_user_order_idx;
DROP INDEX IF EXISTS auth.oauth_consents_active_user_client_idx;
DROP INDEX IF EXISTS auth.oauth_consents_active_client_idx;
DROP INDEX IF EXISTS auth.oauth_clients_deleted_at_idx;
DROP INDEX IF EXISTS auth.oauth_auth_pending_exp_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_id_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_friendly_name_unique;
DROP INDEX IF EXISTS auth.mfa_challenge_created_at_idx;
DROP INDEX IF EXISTS auth.idx_user_id_auth_method;
DROP INDEX IF EXISTS auth.idx_oauth_client_states_created_at;
DROP INDEX IF EXISTS auth.idx_auth_code;
DROP INDEX IF EXISTS auth.identities_user_id_idx;
DROP INDEX IF EXISTS auth.identities_email_idx;
DROP INDEX IF EXISTS auth.flow_state_created_at_idx;
DROP INDEX IF EXISTS auth.factor_id_created_at_idx;
DROP INDEX IF EXISTS auth.email_change_token_new_idx;
DROP INDEX IF EXISTS auth.email_change_token_current_idx;
DROP INDEX IF EXISTS auth.confirmation_token_idx;
DROP INDEX IF EXISTS auth.audit_logs_instance_id_idx;
DROP INDEX IF EXISTS _realtime.tenants_external_id_index;
DROP INDEX IF EXISTS _realtime.extensions_tenant_external_id_type_index;
DROP INDEX IF EXISTS _realtime.extensions_tenant_external_id_index;
ALTER TABLE IF EXISTS ONLY supabase_migrations.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY supabase_functions.migrations DROP CONSTRAINT IF EXISTS migrations_pkey;
ALTER TABLE IF EXISTS ONLY supabase_functions.hooks DROP CONSTRAINT IF EXISTS hooks_pkey;
ALTER TABLE IF EXISTS ONLY storage.vector_indexes DROP CONSTRAINT IF EXISTS vector_indexes_pkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads DROP CONSTRAINT IF EXISTS s3_multipart_uploads_pkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_pkey;
ALTER TABLE IF EXISTS ONLY storage.prefixes DROP CONSTRAINT IF EXISTS prefixes_pkey;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS objects_pkey;
ALTER TABLE IF EXISTS ONLY storage.migrations DROP CONSTRAINT IF EXISTS migrations_pkey;
ALTER TABLE IF EXISTS ONLY storage.migrations DROP CONSTRAINT IF EXISTS migrations_name_key;
ALTER TABLE IF EXISTS ONLY storage.iceberg_tables DROP CONSTRAINT IF EXISTS iceberg_tables_pkey;
ALTER TABLE IF EXISTS ONLY storage.iceberg_namespaces DROP CONSTRAINT IF EXISTS iceberg_namespaces_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets_vectors DROP CONSTRAINT IF EXISTS buckets_vectors_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets DROP CONSTRAINT IF EXISTS buckets_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets_analytics DROP CONSTRAINT IF EXISTS buckets_analytics_pkey;
ALTER TABLE IF EXISTS ONLY realtime.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY realtime.subscription DROP CONSTRAINT IF EXISTS pk_subscription;
ALTER TABLE IF EXISTS ONLY realtime.messages_2026_01_13 DROP CONSTRAINT IF EXISTS messages_2026_01_13_pkey;
ALTER TABLE IF EXISTS ONLY realtime.messages_2026_01_12 DROP CONSTRAINT IF EXISTS messages_2026_01_12_pkey;
ALTER TABLE IF EXISTS ONLY realtime.messages_2026_01_11 DROP CONSTRAINT IF EXISTS messages_2026_01_11_pkey;
ALTER TABLE IF EXISTS ONLY realtime.messages_2026_01_10 DROP CONSTRAINT IF EXISTS messages_2026_01_10_pkey;
ALTER TABLE IF EXISTS ONLY realtime.messages_2026_01_09 DROP CONSTRAINT IF EXISTS messages_2026_01_09_pkey;
ALTER TABLE IF EXISTS ONLY realtime.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE IF EXISTS ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.momo_webhook_logs DROP CONSTRAINT IF EXISTS momo_webhook_logs_tran_id_key;
ALTER TABLE IF EXISTS ONLY public.momo_webhook_logs DROP CONSTRAINT IF EXISTS momo_webhook_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.momo_settings DROP CONSTRAINT IF EXISTS momo_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.momo_payment_requests DROP CONSTRAINT IF EXISTS momo_payment_requests_reference_code_key;
ALTER TABLE IF EXISTS ONLY public.momo_payment_requests DROP CONSTRAINT IF EXISTS momo_payment_requests_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_phone_key;
ALTER TABLE IF EXISTS ONLY auth.sso_providers DROP CONSTRAINT IF EXISTS sso_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.sso_domains DROP CONSTRAINT IF EXISTS sso_domains_pkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY auth.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_entity_id_key;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_token_unique;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.one_time_tokens DROP CONSTRAINT IF EXISTS one_time_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_user_client_unique;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_clients DROP CONSTRAINT IF EXISTS oauth_clients_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_client_states DROP CONSTRAINT IF EXISTS oauth_client_states_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_authorization_id_key;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_authorization_code_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_last_challenged_at_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_challenges DROP CONSTRAINT IF EXISTS mfa_challenges_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS mfa_amr_claims_session_id_authentication_method_pkey;
ALTER TABLE IF EXISTS ONLY auth.instances DROP CONSTRAINT IF EXISTS instances_pkey;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_provider_id_provider_unique;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_pkey;
ALTER TABLE IF EXISTS ONLY auth.flow_state DROP CONSTRAINT IF EXISTS flow_state_pkey;
ALTER TABLE IF EXISTS ONLY auth.audit_log_entries DROP CONSTRAINT IF EXISTS audit_log_entries_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS amr_id_pk;
ALTER TABLE IF EXISTS ONLY _realtime.tenants DROP CONSTRAINT IF EXISTS tenants_pkey;
ALTER TABLE IF EXISTS ONLY _realtime.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY _realtime.extensions DROP CONSTRAINT IF EXISTS extensions_pkey;
ALTER TABLE IF EXISTS supabase_functions.hooks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS auth.refresh_tokens ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS supabase_migrations.schema_migrations;
DROP TABLE IF EXISTS supabase_functions.migrations;
DROP SEQUENCE IF EXISTS supabase_functions.hooks_id_seq;
DROP TABLE IF EXISTS supabase_functions.hooks;
DROP TABLE IF EXISTS storage.vector_indexes;
DROP TABLE IF EXISTS storage.s3_multipart_uploads_parts;
DROP TABLE IF EXISTS storage.s3_multipart_uploads;
DROP TABLE IF EXISTS storage.prefixes;
DROP TABLE IF EXISTS storage.objects;
DROP TABLE IF EXISTS storage.migrations;
DROP TABLE IF EXISTS storage.iceberg_tables;
DROP TABLE IF EXISTS storage.iceberg_namespaces;
DROP TABLE IF EXISTS storage.buckets_vectors;
DROP TABLE IF EXISTS storage.buckets_analytics;
DROP TABLE IF EXISTS storage.buckets;
DROP TABLE IF EXISTS realtime.subscription;
DROP TABLE IF EXISTS realtime.schema_migrations;
DROP TABLE IF EXISTS realtime.messages_2026_01_13;
DROP TABLE IF EXISTS realtime.messages_2026_01_12;
DROP TABLE IF EXISTS realtime.messages_2026_01_11;
DROP TABLE IF EXISTS realtime.messages_2026_01_10;
DROP TABLE IF EXISTS realtime.messages_2026_01_09;
DROP TABLE IF EXISTS realtime.messages;
DROP TABLE IF EXISTS public.profiles;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.momo_webhook_logs;
DROP TABLE IF EXISTS public.momo_settings;
DROP TABLE IF EXISTS public.momo_payment_requests;
DROP TABLE IF EXISTS auth.users;
DROP TABLE IF EXISTS auth.sso_providers;
DROP TABLE IF EXISTS auth.sso_domains;
DROP TABLE IF EXISTS auth.sessions;
DROP TABLE IF EXISTS auth.schema_migrations;
DROP TABLE IF EXISTS auth.saml_relay_states;
DROP TABLE IF EXISTS auth.saml_providers;
DROP SEQUENCE IF EXISTS auth.refresh_tokens_id_seq;
DROP TABLE IF EXISTS auth.refresh_tokens;
DROP TABLE IF EXISTS auth.one_time_tokens;
DROP TABLE IF EXISTS auth.oauth_consents;
DROP TABLE IF EXISTS auth.oauth_clients;
DROP TABLE IF EXISTS auth.oauth_client_states;
DROP TABLE IF EXISTS auth.oauth_authorizations;
DROP TABLE IF EXISTS auth.mfa_factors;
DROP TABLE IF EXISTS auth.mfa_challenges;
DROP TABLE IF EXISTS auth.mfa_amr_claims;
DROP TABLE IF EXISTS auth.instances;
DROP TABLE IF EXISTS auth.identities;
DROP TABLE IF EXISTS auth.flow_state;
DROP TABLE IF EXISTS auth.audit_log_entries;
DROP TABLE IF EXISTS _realtime.tenants;
DROP TABLE IF EXISTS _realtime.schema_migrations;
DROP TABLE IF EXISTS _realtime.extensions;
DROP FUNCTION IF EXISTS supabase_functions.http_request();
DROP FUNCTION IF EXISTS storage.update_updated_at_column();
DROP FUNCTION IF EXISTS storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text);
DROP FUNCTION IF EXISTS storage.search_v1_optimised(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text);
DROP FUNCTION IF EXISTS storage.search_legacy_v1(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text);
DROP FUNCTION IF EXISTS storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text);
DROP FUNCTION IF EXISTS storage.prefixes_insert_trigger();
DROP FUNCTION IF EXISTS storage.prefixes_delete_cleanup();
DROP FUNCTION IF EXISTS storage.operation();
DROP FUNCTION IF EXISTS storage.objects_update_prefix_trigger();
DROP FUNCTION IF EXISTS storage.objects_update_level_trigger();
DROP FUNCTION IF EXISTS storage.objects_update_cleanup();
DROP FUNCTION IF EXISTS storage.objects_insert_prefix_trigger();
DROP FUNCTION IF EXISTS storage.objects_delete_cleanup();
DROP FUNCTION IF EXISTS storage.lock_top_prefixes(bucket_ids text[], names text[]);
DROP FUNCTION IF EXISTS storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text);
DROP FUNCTION IF EXISTS storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text);
DROP FUNCTION IF EXISTS storage.get_size_by_bucket();
DROP FUNCTION IF EXISTS storage.get_prefixes(name text);
DROP FUNCTION IF EXISTS storage.get_prefix(name text);
DROP FUNCTION IF EXISTS storage.get_level(name text);
DROP FUNCTION IF EXISTS storage.foldername(name text);
DROP FUNCTION IF EXISTS storage.filename(name text);
DROP FUNCTION IF EXISTS storage.extension(name text);
DROP FUNCTION IF EXISTS storage.enforce_bucket_name_length();
DROP FUNCTION IF EXISTS storage.delete_prefix_hierarchy_trigger();
DROP FUNCTION IF EXISTS storage.delete_prefix(_bucket_id text, _name text);
DROP FUNCTION IF EXISTS storage.delete_leaf_prefixes(bucket_ids text[], names text[]);
DROP FUNCTION IF EXISTS storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb);
DROP FUNCTION IF EXISTS storage.add_prefixes(_bucket_id text, _name text);
DROP FUNCTION IF EXISTS realtime.topic();
DROP FUNCTION IF EXISTS realtime.to_regrole(role_name text);
DROP FUNCTION IF EXISTS realtime.subscription_check_filters();
DROP FUNCTION IF EXISTS realtime.send(payload jsonb, event text, topic text, private boolean);
DROP FUNCTION IF EXISTS realtime.quote_wal2json(entity regclass);
DROP FUNCTION IF EXISTS realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer);
DROP FUNCTION IF EXISTS realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]);
DROP FUNCTION IF EXISTS realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text);
DROP FUNCTION IF EXISTS realtime."cast"(val text, type_ regtype);
DROP FUNCTION IF EXISTS realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]);
DROP FUNCTION IF EXISTS realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text);
DROP FUNCTION IF EXISTS realtime.apply_rls(wal jsonb, max_record_bytes integer);
DROP FUNCTION IF EXISTS public.update_momo_settings_updated_at();
DROP FUNCTION IF EXISTS public.update_momo_payment_requests_updated_at();
DROP FUNCTION IF EXISTS public.unsettle_split(p_split_id uuid);
DROP FUNCTION IF EXISTS public.soft_delete_expense(p_expense_id uuid);
DROP FUNCTION IF EXISTS public.settle_split(p_split_id uuid, p_amount numeric);
DROP FUNCTION IF EXISTS public.settle_expense(p_expense_id uuid);
DROP FUNCTION IF EXISTS public.settle_all_group_debts(p_group_id uuid);
DROP FUNCTION IF EXISTS public.notify_friend_request();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.get_user_debts_public();
DROP FUNCTION IF EXISTS public.get_user_debts_history(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_user_debts_aggregated(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_user_balances_with_history(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_user_balances(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_user_activities(p_user_id uuid, p_limit integer, p_offset integer);
DROP FUNCTION IF EXISTS public.get_top_categories(p_start_date date, p_end_date date, p_group_id uuid, p_limit integer);
DROP FUNCTION IF EXISTS public.get_public_demo_debts();
DROP FUNCTION IF EXISTS public.get_balance_history(p_user_id uuid, p_start_date date, p_end_date date, p_currency text);
DROP FUNCTION IF EXISTS public.bulk_delete_expenses(p_expense_ids uuid[]);
DROP FUNCTION IF EXISTS pgbouncer.get_auth(p_usename text);
DROP FUNCTION IF EXISTS extensions.set_graphql_placeholder();
DROP FUNCTION IF EXISTS extensions.pgrst_drop_watch();
DROP FUNCTION IF EXISTS extensions.pgrst_ddl_watch();
DROP FUNCTION IF EXISTS extensions.grant_pg_net_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_graphql_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_cron_access();
DROP FUNCTION IF EXISTS auth.uid();
DROP FUNCTION IF EXISTS auth.role();
DROP FUNCTION IF EXISTS auth.jwt();
DROP FUNCTION IF EXISTS auth.email();
DROP TYPE IF EXISTS storage.buckettype;
DROP TYPE IF EXISTS realtime.wal_rls;
DROP TYPE IF EXISTS realtime.wal_column;
DROP TYPE IF EXISTS realtime.user_defined_filter;
DROP TYPE IF EXISTS realtime.equality_op;
DROP TYPE IF EXISTS realtime.action;
DROP TYPE IF EXISTS auth.one_time_token_type;
DROP TYPE IF EXISTS auth.oauth_response_type;
DROP TYPE IF EXISTS auth.oauth_registration_type;
DROP TYPE IF EXISTS auth.oauth_client_type;
DROP TYPE IF EXISTS auth.oauth_authorization_status;
DROP TYPE IF EXISTS auth.factor_type;
DROP TYPE IF EXISTS auth.factor_status;
DROP TYPE IF EXISTS auth.code_challenge_method;
DROP TYPE IF EXISTS auth.aal_level;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS supabase_vault;
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS pg_stat_statements;
DROP EXTENSION IF EXISTS pg_graphql;
DROP SCHEMA IF EXISTS vault;
DROP SCHEMA IF EXISTS supabase_migrations;
DROP SCHEMA IF EXISTS supabase_functions;
DROP SCHEMA IF EXISTS storage;
DROP SCHEMA IF EXISTS realtime;
DROP SCHEMA IF EXISTS pgbouncer;
DROP EXTENSION IF EXISTS pg_net;
DROP SCHEMA IF EXISTS graphql_public;
DROP SCHEMA IF EXISTS graphql;
DROP SCHEMA IF EXISTS extensions;
DROP SCHEMA IF EXISTS auth;
DROP SCHEMA IF EXISTS _realtime;
--
-- Name: _realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA _realtime;


--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_net; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_net IS 'Async HTTP';


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: supabase_functions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_functions;


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_migrations;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
    ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

    ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
    ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

    REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
    REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

    GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


--
-- Name: bulk_delete_expenses(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bulk_delete_expenses(p_expense_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID;
  v_expense RECORD;
  v_can_delete BOOLEAN;
  v_is_system_admin BOOLEAN;
  v_deleted_count INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user is system admin
  v_is_system_admin := is_admin();

  -- Validate expense limit (max 50 at a time)
  IF array_length(p_expense_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Cannot delete more than 50 expenses at once';
  END IF;

  -- Check permissions for each expense (skip if system admin)
  IF NOT v_is_system_admin THEN
    FOR v_expense IN
      SELECT e.*, gm.role as user_role
      FROM expenses e
      LEFT JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = v_user_id
      WHERE e.id = ANY(p_expense_ids)
    LOOP
      -- User can delete if they created it OR they are group admin
      v_can_delete := (v_expense.created_by = v_user_id) OR (v_expense.user_role = 'admin');

      IF NOT v_can_delete THEN
        RAISE EXCEPTION 'Permission denied to delete expense %', v_expense.id;
      END IF;
    END LOOP;
  END IF;

  -- Log each deletion to audit_logs
  INSERT INTO audit_logs (
    user_id,
    table_name,
    operation,
    record_id,
    changed_fields
  )
  SELECT
    v_user_id,
    'expenses',
    'BULK_DELETE',
    e.id,
    jsonb_build_object(
      'description', e.description,
      'amount', e.amount,
      'group_id', e.group_id,
      'friendship_id', e.friendship_id,
      'deleted_by_admin', v_is_system_admin
    )
  FROM expenses e
  WHERE e.id = ANY(p_expense_ids);

  -- Delete expense splits (cascades will handle this, but explicit for clarity)
  DELETE FROM expense_splits
  WHERE expense_id = ANY(p_expense_ids);

  -- Delete expenses
  DELETE FROM expenses
  WHERE id = ANY(p_expense_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'message', format('Deleted %s expense(s)', v_deleted_count)
  );
END;
$$;


--
-- Name: FUNCTION bulk_delete_expenses(p_expense_ids uuid[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.bulk_delete_expenses(p_expense_ids uuid[]) IS 'Deletes multiple expenses atomically. Max 50 expenses at a time. Can be called by expense creators, group admins, or system admins. Logs all deletions to audit_logs for audit trail.';


--
-- Name: get_balance_history(uuid, date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_balance_history(p_user_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE, p_currency text DEFAULT 'VND'::text) RETURNS TABLE(snapshot_date date, total_owed numeric, total_lent numeric, net_balance numeric, currency text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID;
  v_date DATE;
BEGIN
  -- Use provided user_id or default to current user
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Ensure balance history exists for date range
  -- Calculate missing snapshots on-demand
  FOR v_date IN
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE
  LOOP
    -- Check if snapshot exists (use explicit table alias to avoid ambiguity)
    IF NOT EXISTS (
      SELECT 1 FROM balance_history bh_check
      WHERE bh_check.user_id = v_user_id
        AND bh_check.snapshot_date = v_date
        AND bh_check.currency = p_currency
    ) THEN
      -- Calculate and store snapshot
      PERFORM calculate_daily_balance(v_user_id, v_date, p_currency);
    END IF;
  END LOOP;

  -- Return balance history with explicit column aliases matching RETURN TABLE
  RETURN QUERY
  SELECT
    bh.snapshot_date AS snapshot_date,
    bh.total_owed AS total_owed,
    bh.total_lent AS total_lent,
    bh.net_balance AS net_balance,
    bh.currency AS currency
  FROM balance_history bh
  WHERE bh.user_id = v_user_id
    AND bh.snapshot_date BETWEEN p_start_date AND p_end_date
    AND bh.currency = p_currency
  ORDER BY bh.snapshot_date ASC;
END;
$$;


--
-- Name: FUNCTION get_balance_history(p_user_id uuid, p_start_date date, p_end_date date, p_currency text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_balance_history(p_user_id uuid, p_start_date date, p_end_date date, p_currency text) IS 'Retrieves historical balance data for trend charts. Auto-calculates missing snapshots on-demand. Fixed ambiguous column reference with explicit aliases and search_path.';


--
-- Name: get_public_demo_debts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_demo_debts() RETURNS TABLE(counterparty_id uuid, counterparty_name text, amount numeric, currency text, i_owe_them boolean, owed_to_name text, owed_to_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        '00000000-0000-0000-0000-000000000001'::UUID AS counterparty_id,
        'Alice Johnson' AS counterparty_name,
        150.00 AS amount,
        'USD' AS currency,
        FALSE AS i_owe_them,
        'Demo User' AS owed_to_name,
        '00000000-0000-0000-0000-000000000000'::UUID AS owed_to_id
    UNION ALL
    SELECT
        '00000000-0000-0000-0000-000000000002'::UUID,
        'Bob Smith',
        75.50,
        'USD',
        TRUE,
        'Demo User',
        '00000000-0000-0000-0000-000000000000'::UUID
    UNION ALL
    SELECT
        '00000000-0000-0000-0000-000000000003'::UUID,
        'Charlie Brown',
        200.00,
        'EUR',
        FALSE,
        'Demo User',
        '00000000-0000-0000-0000-000000000000'::UUID
    UNION ALL
    SELECT
        '00000000-0000-0000-0000-000000000004'::UUID,
        'Diana Prince',
        50.00,
        'GBP',
        TRUE,
        'Demo User',
        '00000000-0000-0000-0000-000000000000'::UUID
    UNION ALL
    SELECT
        '00000000-0000-0000-0000-000000000005'::UUID,
        'Eve Wilson',
        120000.00,
        'VND',
        TRUE,
        'Demo User',
        '00000000-0000-0000-0000-000000000000'::UUID;
END;
$$;


--
-- Name: get_top_categories(date, date, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_categories(p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE, p_group_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 10) RETURNS TABLE(category text, total_amount numeric, expense_count bigint, percentage numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_total NUMERIC(10,2);
BEGIN
  -- Calculate total spending for percentage calculation
  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_total
  FROM expenses e
  WHERE e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.is_payment = false
    AND (p_group_id IS NULL OR e.group_id = p_group_id)
    AND EXISTS (
      SELECT 1 FROM expense_splits es
      WHERE es.expense_id = e.id
        AND es.user_id = auth.uid()
    );

  -- Return top categories with explicit TEXT cast for ENUM type
  RETURN QUERY
  SELECT
    e.category::TEXT AS category,
    SUM(e.amount) AS total_amount,
    COUNT(*)::BIGINT AS expense_count,
    CASE
      WHEN v_total > 0 THEN ROUND((SUM(e.amount) / v_total * 100)::NUMERIC, 2)
      ELSE 0
    END AS percentage
  FROM expenses e
  WHERE e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.is_payment = false
    AND (p_group_id IS NULL OR e.group_id = p_group_id)
    AND EXISTS (
      SELECT 1 FROM expense_splits es
      WHERE es.expense_id = e.id
        AND es.user_id = auth.uid()
    )
  GROUP BY e.category
  ORDER BY total_amount DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: FUNCTION get_top_categories(p_start_date date, p_end_date date, p_group_id uuid, p_limit integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_top_categories(p_start_date date, p_end_date date, p_group_id uuid, p_limit integer) IS 'Returns top spending categories with amounts and percentages for analytics dashboard. Fixed type mismatch by explicitly casting expense_category ENUM to TEXT.';


--
-- Name: get_user_activities(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_activities(p_user_id uuid, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, type text, description text, total_amount numeric, user_share numeric, currency text, date timestamp with time zone, group_name text, group_id uuid, paid_by_user_id uuid, paid_by_name text, is_lender boolean, is_borrower boolean, is_payment boolean, is_involved boolean, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH activities AS (
        -- Get expense activities
        SELECT
            e.id,
            'expense'::TEXT AS type,
            e.description AS description,
            e.amount AS total_amount,
            es.computed_amount AS user_share,
            COALESCE(e.currency, 'USD') AS currency,
            e.expense_date::TIMESTAMPTZ AS date,
            g.name AS group_name,
            g.id AS group_id,
            e.paid_by_user_id,
            p.full_name AS paid_by_name,
            e.paid_by_user_id = p_user_id AS is_lender,
            es.user_id = p_user_id AND e.paid_by_user_id != p_user_id AS is_borrower,
            FALSE AS is_payment,
            -- User is involved if they are the payer or a split participant
            (e.paid_by_user_id = p_user_id OR es.user_id = p_user_id) AS is_involved,
            e.created_at
        FROM expenses e
        LEFT JOIN expense_splits es ON es.expense_id = e.id
        LEFT JOIN groups g ON e.group_id = g.id
        LEFT JOIN profiles p ON e.paid_by_user_id = p.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND e.expense_date <= CURRENT_DATE -- Filter out future dates

        UNION ALL

        -- Get payment activities
        SELECT
            pay.id,
            'payment'::TEXT AS type,
            COALESCE(pay.note,
                CASE
                    WHEN pay.from_user = p_user_id
                    THEN 'Payment to ' || p_to.full_name
                    ELSE 'Payment from ' || p_from.full_name
                END) AS description,
            pay.amount AS total_amount,
            pay.amount AS user_share,
            COALESCE(pay.currency, 'USD') AS currency,
            pay.payment_date::TIMESTAMPTZ AS date,
            g.name AS group_name,
            g.id AS group_id,
            pay.from_user AS paid_by_user_id,
            p_from.full_name AS paid_by_name,
            pay.to_user = p_user_id AS is_lender,
            pay.from_user = p_user_id AS is_borrower,
            TRUE AS is_payment,
            -- User is involved if they are the sender or receiver
            (pay.from_user = p_user_id OR pay.to_user = p_user_id) AS is_involved,
            pay.created_at
        FROM payments pay
        LEFT JOIN groups g ON pay.group_id = g.id
        LEFT JOIN profiles p_from ON pay.from_user = p_from.id
        LEFT JOIN profiles p_to ON pay.to_user = p_to.id
        WHERE (pay.from_user = p_user_id OR pay.to_user = p_user_id)
            AND pay.payment_date <= CURRENT_DATE -- Filter out future dates
    )
    SELECT
        a.id,
        a.type,
        a.description,
        a.total_amount,
        a.user_share,
        a.currency,
        a.date,
        a.group_name,
        a.group_id,
        a.paid_by_user_id,
        a.paid_by_name,
        a.is_lender,
        a.is_borrower,
        a.is_payment,
        a.is_involved,
        a.created_at
    FROM activities a
    ORDER BY a.date DESC, a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


--
-- Name: get_user_balances(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_balances(p_user_id uuid) RETURNS TABLE(counterparty_id uuid, counterparty_name text, amount numeric, currency text, i_owe_them boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH expense_balances AS (
        -- Get balances from expenses where user is involved
        SELECT
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END AS balance_counterparty_id,
            e.currency AS balance_currency,
            CASE
                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN es.computed_amount
                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN -es.computed_amount
                ELSE 0
            END AS balance_amount
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND NOT es.is_settled
    ),
    payment_balances AS (
        -- Get balances from payments
        SELECT
            CASE
                WHEN pay.from_user = p_user_id THEN pay.to_user
                ELSE pay.from_user
            END AS balance_counterparty_id,
            pay.currency AS balance_currency,
            CASE
                WHEN pay.from_user = p_user_id THEN pay.amount
                ELSE -pay.amount
            END AS balance_amount
        FROM payments pay
        WHERE (pay.from_user = p_user_id OR pay.to_user = p_user_id)
    ),
    all_balances AS (
        SELECT balance_counterparty_id, balance_currency, balance_amount FROM expense_balances
        UNION ALL
        SELECT balance_counterparty_id, balance_currency, balance_amount FROM payment_balances
    ),
    aggregated AS (
        SELECT
            ab.balance_counterparty_id,
            ab.balance_currency,
            SUM(ab.balance_amount) AS net_amount
        FROM all_balances ab
        WHERE ab.balance_counterparty_id != p_user_id
        GROUP BY ab.balance_counterparty_id, ab.balance_currency
        HAVING SUM(ab.balance_amount) != 0
    )
    SELECT
        a.balance_counterparty_id AS counterparty_id,
        p.full_name AS counterparty_name,
        ABS(a.net_amount) AS amount,
        a.balance_currency AS currency,
        a.net_amount > 0 AS i_owe_them
    FROM aggregated a
    JOIN profiles p ON a.balance_counterparty_id = p.id
    ORDER BY a.balance_currency, ABS(a.net_amount) DESC;
END;
$$;


--
-- Name: get_user_balances_with_history(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_balances_with_history(p_user_id uuid) RETURNS TABLE(counterparty_id uuid, counterparty_name text, amount numeric, currency text, i_owe_them boolean, total_amount numeric, settled_amount numeric, remaining_amount numeric, transaction_count integer, last_transaction_date timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH all_transactions AS (
        -- Get all expense transactions
        SELECT
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END AS counterparty_id,
            e.currency,
            CASE
                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN es.computed_amount
                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN -es.computed_amount
                ELSE 0
            END AS amount,
            es.is_settled,
            e.created_at
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment

        UNION ALL

        -- Get all payment transactions
        SELECT
            CASE
                WHEN p.from_user = p_user_id THEN p.to_user
                ELSE p.from_user
            END AS counterparty_id,
            p.currency,
            CASE
                WHEN p.from_user = p_user_id THEN p.amount
                ELSE -p.amount
            END AS amount,
            TRUE AS is_settled,
            p.created_at
        FROM payments p
        WHERE (p.from_user = p_user_id OR p.to_user = p_user_id)
    ),
    aggregated AS (
        SELECT
            at.counterparty_id,
            at.currency,
            SUM(CASE WHEN NOT at.is_settled THEN at.amount ELSE 0 END) AS current_balance,
            SUM(ABS(at.amount)) AS total_amount,
            SUM(CASE WHEN at.is_settled THEN ABS(at.amount) ELSE 0 END) AS settled_amount,
            COUNT(*) AS transaction_count,
            MAX(at.created_at) AS last_transaction_date
        FROM all_transactions at
        WHERE at.counterparty_id != p_user_id
        GROUP BY at.counterparty_id, at.currency
    )
    SELECT
        a.counterparty_id,
        p.full_name AS counterparty_name,
        ABS(a.current_balance) AS amount,
        a.currency,
        a.current_balance > 0 AS i_owe_them,
        a.total_amount,
        a.settled_amount,
        ABS(a.current_balance) AS remaining_amount,
        a.transaction_count::INTEGER,
        a.last_transaction_date
    FROM aggregated a
    JOIN profiles p ON a.counterparty_id = p.id
    ORDER BY a.currency, a.last_transaction_date DESC;
END;
$$;


--
-- Name: get_user_debts_aggregated(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_debts_aggregated(p_user_id uuid) RETURNS TABLE(counterparty_id uuid, counterparty_name text, amount numeric, currency text, i_owe_them boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    WITH expense_debts AS (
        -- Use same logic as user_debts_summary view but group by currency
        SELECT
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END as counterparty_id,
            COALESCE(e.currency, 'USD') as currency,
            SUM(
                CASE
                    WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN
                        CASE
                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                            ELSE es.computed_amount
                        END
                    WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN
                        -CASE
                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                            ELSE es.computed_amount
                        END
                    ELSE 0
                END
            ) as net_amount
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND es.user_id != e.paid_by_user_id
            AND e.expense_date <= CURRENT_DATE  -- Exclude future expenses
            AND (
                (es.is_settled = false) OR
                (es.is_settled = true AND es.settled_amount < es.computed_amount)
            )
        GROUP BY
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END,
            COALESCE(e.currency, 'USD')
        HAVING SUM(
            CASE
                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN
                    CASE
                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                        ELSE es.computed_amount
                    END
                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN
                    CASE
                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                        ELSE es.computed_amount
                    END
                ELSE 0
            END
        ) != 0
    ),
    -- Note: Payments are settlement transactions, not outstanding debts
    -- They should NOT be included in get_user_debts_aggregated
    -- Payments reduce debts but are not debts themselves
    all_debts AS (
        SELECT ed.counterparty_id, ed.currency, ed.net_amount FROM expense_debts ed
    ),
    aggregated AS (
        SELECT
            ad.counterparty_id,
            ad.currency,
            SUM(ad.net_amount) AS net_amount
        FROM all_debts ad
        WHERE ad.counterparty_id IS DISTINCT FROM p_user_id
        GROUP BY ad.counterparty_id, ad.currency
        HAVING SUM(ad.net_amount) != 0
    )
    SELECT
        agg.counterparty_id,
        p.full_name AS counterparty_name,
        ABS(agg.net_amount) AS amount,
        agg.currency,
        (agg.net_amount > 0) AS i_owe_them
    FROM aggregated agg
    JOIN profiles p ON p.id = agg.counterparty_id
    ORDER BY agg.currency, ABS(agg.net_amount) DESC;
END;
$$;


--
-- Name: get_user_debts_history(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_debts_history(p_user_id uuid) RETURNS TABLE(counterparty_id uuid, counterparty_name text, amount numeric, currency text, i_owe_them boolean, total_amount numeric, settled_amount numeric, remaining_amount numeric, transaction_count integer, last_transaction_date timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    WITH expense_history AS (
        -- Use same logic as user_debts_history view but group by currency
        SELECT
            es.user_id as owes_user,
            e.paid_by_user_id as owed_user,
            COALESCE(e.currency, 'USD') as currency,
            SUM(es.computed_amount) as total_amount,
            SUM(COALESCE(es.settled_amount, 0)) as settled_amount,
            SUM(
                CASE
                    WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                    WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                    ELSE es.computed_amount
                END
            ) as remaining_amount,
            COUNT(DISTINCT e.id) as transaction_count,
            MAX(e.expense_date) as last_transaction_date
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND es.user_id != e.paid_by_user_id
            AND e.expense_date <= CURRENT_DATE  -- Exclude future expenses
        GROUP BY es.user_id, e.paid_by_user_id, COALESCE(e.currency, 'USD')
        HAVING SUM(es.computed_amount) > 0
    ),
    payment_history AS (
        -- Get payment transactions
        SELECT
            p.from_user as owes_user,
            p.to_user as owed_user,
            COALESCE(p.currency, 'USD') as currency,
            SUM(p.amount) as total_amount,
            SUM(p.amount) as settled_amount,  -- Payments are always settled
            0 as remaining_amount,
            COUNT(*) as transaction_count,
            MAX(p.payment_date) as last_transaction_date
        FROM payments p
        WHERE (p.from_user = p_user_id OR p.to_user = p_user_id)
        GROUP BY p.from_user, p.to_user, COALESCE(p.currency, 'USD')
    ),
    all_history AS (
        SELECT
            eh.owes_user,
            eh.owed_user,
            eh.currency,
            eh.total_amount,
            eh.settled_amount,
            eh.remaining_amount,
            eh.transaction_count,
            eh.last_transaction_date::TIMESTAMPTZ as last_transaction_date
        FROM expense_history eh
        UNION ALL
        SELECT
            ph.owes_user,
            ph.owed_user,
            ph.currency,
            ph.total_amount,
            ph.settled_amount,
            ph.remaining_amount,
            ph.transaction_count,
            ph.last_transaction_date::TIMESTAMPTZ
        FROM payment_history ph
    ),
    debt_calculations AS (
        SELECT
            CASE
                WHEN ah.owes_user = p_user_id THEN ah.owed_user
                WHEN ah.owed_user = p_user_id THEN ah.owes_user
                ELSE NULL
            END as other_user_id,
            ah.currency,
            CASE
                WHEN ah.owes_user = p_user_id THEN ah.total_amount
                WHEN ah.owed_user = p_user_id THEN -ah.total_amount
                ELSE 0
            END as signed_total_amount,
            CASE
                WHEN ah.owes_user = p_user_id THEN ah.settled_amount
                WHEN ah.owed_user = p_user_id THEN -ah.settled_amount
                ELSE 0
            END as signed_settled_amount,
            CASE
                WHEN ah.owes_user = p_user_id THEN ah.remaining_amount
                WHEN ah.owed_user = p_user_id THEN -ah.remaining_amount
                ELSE 0
            END as signed_remaining_amount,
            ah.transaction_count,
            ah.last_transaction_date
        FROM all_history ah
        WHERE (ah.owes_user = p_user_id OR ah.owed_user = p_user_id)
    ),
    aggregated AS (
        SELECT
            dc.other_user_id as counterparty_id,
            dc.currency,
            SUM(ABS(dc.signed_total_amount)) as total_amount,
            SUM(ABS(dc.signed_settled_amount)) as settled_amount,
            SUM(ABS(dc.signed_remaining_amount)) as remaining_amount,
            SUM(dc.transaction_count)::INTEGER as transaction_count,
            MAX(dc.last_transaction_date) as last_transaction_date,
            SUM(dc.signed_remaining_amount) as net_remaining_amount
        FROM debt_calculations dc
        WHERE dc.other_user_id IS NOT NULL
        GROUP BY dc.other_user_id, dc.currency
    )
    SELECT
        agg.counterparty_id,
        p.full_name AS counterparty_name,
        ABS(agg.net_remaining_amount) AS amount,
        agg.currency,
        (agg.net_remaining_amount > 0) AS i_owe_them,
        agg.total_amount,
        agg.settled_amount,
        ABS(agg.net_remaining_amount) AS remaining_amount,
        agg.transaction_count,
        agg.last_transaction_date
    FROM aggregated agg
    JOIN profiles p ON p.id = agg.counterparty_id
    ORDER BY
        agg.currency,
        CASE WHEN agg.net_remaining_amount != 0 THEN 0 ELSE 1 END,
        ABS(agg.net_remaining_amount) DESC,
        agg.last_transaction_date DESC NULLS LAST;
END;
$$;


--
-- Name: get_user_debts_public(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_debts_public() RETURNS TABLE(counterparty_id uuid, counterparty_name text, amount numeric, currency text, i_owe_them boolean, is_real_data boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_sample_user_id UUID;
BEGIN
    -- Find a user with recent activity who has outstanding debts
    SELECT es.user_id INTO v_sample_user_id
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE NOT es.is_settled
        AND e.created_at > CURRENT_DATE - INTERVAL '30 days'
        AND es.user_id != e.paid_by_user_id
        AND e.expense_date <= CURRENT_DATE
    ORDER BY e.created_at DESC
    LIMIT 1;

    -- If no active user found, return empty
    IF v_sample_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Use the same logic as get_user_debts_aggregated for consistency
    RETURN QUERY
    WITH expense_debts AS (
        -- Get debts from expenses where sample user is involved
        -- Only include unsettled or partially settled debts
        SELECT
            CASE
                WHEN es.user_id = v_sample_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END as counterparty_id,
            COALESCE(e.currency, 'VND') as currency,
            SUM(
                CASE
                    WHEN es.user_id = v_sample_user_id AND e.paid_by_user_id != v_sample_user_id THEN
                        CASE
                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                            ELSE es.computed_amount
                        END
                    WHEN es.user_id != v_sample_user_id AND e.paid_by_user_id = v_sample_user_id THEN
                        -CASE
                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                            ELSE es.computed_amount
                        END
                    ELSE 0
                END
            ) as net_amount
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = v_sample_user_id OR e.paid_by_user_id = v_sample_user_id)
            AND NOT e.is_payment
            AND es.user_id != e.paid_by_user_id  -- Exclude self-payments
            AND e.expense_date <= CURRENT_DATE  -- Exclude future expenses
            AND (
                (es.is_settled = false) OR
                (es.is_settled = true AND es.settled_amount < es.computed_amount)
            )
        GROUP BY
            CASE
                WHEN es.user_id = v_sample_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END,
            COALESCE(e.currency, 'VND')
        HAVING SUM(
            CASE
                WHEN es.user_id = v_sample_user_id AND e.paid_by_user_id != v_sample_user_id THEN
                    CASE
                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                        ELSE es.computed_amount
                    END
                WHEN es.user_id != v_sample_user_id AND e.paid_by_user_id = v_sample_user_id THEN
                    CASE
                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                        ELSE es.computed_amount
                    END
                ELSE 0
            END
        ) != 0
    ),
    all_debts AS (
        SELECT ed.counterparty_id, ed.currency, ed.net_amount FROM expense_debts ed
    ),
    aggregated AS (
        SELECT
            ad.counterparty_id,
            ad.currency,
            SUM(ad.net_amount) AS net_amount
        FROM all_debts ad
        WHERE ad.counterparty_id IS DISTINCT FROM v_sample_user_id  -- Exclude self
        GROUP BY ad.counterparty_id, ad.currency
        HAVING SUM(ad.net_amount) != 0  -- Only return non-zero balances
    )
    SELECT
        agg.counterparty_id,
        p.full_name AS counterparty_name,
        ABS(agg.net_amount) AS amount,
        agg.currency,
        (agg.net_amount > 0) AS i_owe_them,
        TRUE AS is_real_data
    FROM aggregated agg
    INNER JOIN profiles p ON p.id = agg.counterparty_id
    WHERE agg.counterparty_id IS NOT NULL
    ORDER BY agg.currency, ABS(agg.net_amount) DESC;
END;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Only check if user_roles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    );
  END IF;
  RETURN FALSE;
END;
$$;


--
-- Name: notify_friend_request(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_friend_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_recipient_id UUID;
  v_requester_id UUID;
  v_requester_name TEXT;
  v_notify_enabled BOOLEAN;
BEGIN
  -- Only create notification for pending friend requests
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Determine recipient (the user who did NOT create the request)
  -- and requester (the user who created the request)
  v_requester_id := NEW.created_by;

  IF NEW.user_a = v_requester_id THEN
    v_recipient_id := NEW.user_b;
  ELSE
    v_recipient_id := NEW.user_a;
  END IF;

  -- Get requester's full name from profiles (if exists)
  BEGIN
    SELECT full_name INTO v_requester_name
    FROM profiles
    WHERE id = v_requester_id;
  EXCEPTION WHEN OTHERS THEN
    v_requester_name := 'Someone';
  END;

  -- Check if recipient has friend request notifications enabled (if user_settings exists)
  BEGIN
    SELECT COALESCE(notify_on_friend_request, TRUE) INTO v_notify_enabled
    FROM user_settings
    WHERE user_id = v_recipient_id;
  EXCEPTION WHEN OTHERS THEN
    v_notify_enabled := TRUE;
  END;

  -- If notifications are disabled, skip
  IF v_notify_enabled = FALSE THEN
    RETURN NEW;
  END IF;

  -- Create notification for recipient (if notifications table exists)
  BEGIN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      related_id,
      is_read,
      created_at
    ) VALUES (
      v_recipient_id,
      'friend_request',
      COALESCE(v_requester_name, 'Someone') || ' sent you a friend request',
      'Accept or reject this request on the Friends page',
      '/friends',
      NEW.id,
      FALSE,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Silently fail if notifications table doesn't exist yet
    NULL;
  END;

  RETURN NEW;
END;
$$;


--
-- Name: settle_all_group_debts(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.settle_all_group_debts(p_group_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID;
  v_is_group_admin BOOLEAN;
  v_is_system_admin BOOLEAN;
  v_splits_count INTEGER := 0;
  v_total_amount NUMERIC(10,2) := 0;
  v_expenses_count INTEGER := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user is system admin
  v_is_system_admin := is_admin();

  -- Check if user is group admin (only if not system admin)
  IF NOT v_is_system_admin THEN
    SELECT role = 'admin' INTO v_is_group_admin
    FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User is not a member of this group';
    END IF;

    IF NOT v_is_group_admin THEN
      RAISE EXCEPTION 'Only group admins or system admins can settle all debts';
    END IF;
  END IF;

  -- Calculate total amount to be settled
  SELECT
    COUNT(*),
    COALESCE(SUM(computed_amount - COALESCE(settled_amount, 0)), 0)
  INTO v_splits_count, v_total_amount
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE e.group_id = p_group_id
    AND e.is_payment = false
    AND es.is_settled = false;

  -- Mark all unsettled splits as settled
  UPDATE expense_splits es
  SET
    is_settled = true,
    settled_amount = computed_amount,
    settled_at = NOW()
  FROM expenses e
  WHERE es.expense_id = e.id
    AND e.group_id = p_group_id
    AND e.is_payment = false
    AND es.is_settled = false;

  -- Count affected expenses
  SELECT COUNT(DISTINCT e.id) INTO v_expenses_count
  FROM expenses e
  WHERE e.group_id = p_group_id
    AND e.is_payment = false
    AND EXISTS (
      SELECT 1 FROM expense_splits es
      WHERE es.expense_id = e.id AND es.is_settled = true
    );

  -- Mark all expenses as paid
  UPDATE expenses
  SET is_payment = true, updated_at = NOW()
  WHERE group_id = p_group_id
    AND is_payment = false;

  -- Log to audit_logs
  INSERT INTO audit_logs (
    user_id,
    table_name,
    operation,
    record_id,
    changed_fields
  ) VALUES (
    v_user_id,
    'expenses',
    'BULK_SETTLE',
    p_group_id,
    jsonb_build_object(
      'group_id', p_group_id,
      'splits_settled', v_splits_count,
      'expenses_settled', v_expenses_count,
      'total_amount', v_total_amount,
      'settled_by_admin', v_is_system_admin
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'group_id', p_group_id,
    'splits_settled', v_splits_count,
    'expenses_settled', v_expenses_count,
    'total_amount', v_total_amount,
    'message', format('Settled %s debts totaling ₫%s', v_splits_count, v_total_amount)
  );
END;
$$;


--
-- Name: FUNCTION settle_all_group_debts(p_group_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.settle_all_group_debts(p_group_id uuid) IS 'Settles all outstanding debts in a group. Can be called by group admins or system admins. Marks all unsettled splits as settled and logs to audit_logs.';


--
-- Name: settle_expense(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.settle_expense(p_expense_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expense RECORD;
  v_splits_count INTEGER;
BEGIN
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found'; END IF;

  -- Allow payer OR system admin
  IF v_expense.paid_by_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only the payer or admin can settle the expense';
  END IF;

  IF v_expense.is_payment THEN
    RAISE EXCEPTION 'Expense is already settled';
  END IF;

  UPDATE expense_splits
  SET is_settled = true, settled_amount = computed_amount, settled_at = NOW()
  WHERE expense_id = p_expense_id AND is_settled = false;

  GET DIAGNOSTICS v_splits_count = ROW_COUNT;

  UPDATE expenses SET is_payment = true WHERE id = p_expense_id;

  RETURN jsonb_build_object(
    'success', true,
    'expense_id', p_expense_id,
    'splits_settled', v_splits_count
  );
END;
$$;


--
-- Name: FUNCTION settle_expense(p_expense_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.settle_expense(p_expense_id uuid) IS 'Settle all splits for an expense. Can be called by payer or system admin.';


--
-- Name: settle_split(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.settle_split(p_split_id uuid, p_amount numeric DEFAULT NULL::numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_split RECORD;
  v_expense RECORD;
  v_settled_amount DECIMAL;
BEGIN
  SELECT * INTO v_split FROM expense_splits WHERE id = p_split_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Split not found'; END IF;

  SELECT * INTO v_expense FROM expenses WHERE id = v_split.expense_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found'; END IF;

  -- Allow payer OR system admin
  IF v_expense.paid_by_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only the payer or admin can settle splits';
  END IF;

  IF v_split.is_settled THEN
    RAISE EXCEPTION 'Split is already settled';
  END IF;

  v_settled_amount := COALESCE(p_amount, v_split.computed_amount);

  IF v_settled_amount <= 0 THEN
    RAISE EXCEPTION 'Settlement amount must be greater than 0';
  END IF;

  IF v_settled_amount > v_split.computed_amount THEN
    RAISE EXCEPTION 'Settlement amount cannot exceed computed amount';
  END IF;

  UPDATE expense_splits
  SET is_settled = true, settled_amount = v_settled_amount, settled_at = NOW()
  WHERE id = p_split_id;

  RETURN jsonb_build_object(
    'success', true,
    'split_id', p_split_id,
    'settled_amount', v_settled_amount,
    'computed_amount', v_split.computed_amount,
    'is_partial', v_settled_amount < v_split.computed_amount
  );
END;
$$;


--
-- Name: FUNCTION settle_split(p_split_id uuid, p_amount numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.settle_split(p_split_id uuid, p_amount numeric) IS 'Settle an individual split with optional custom amount. Can be called by payer or system admin.';


--
-- Name: soft_delete_expense(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.soft_delete_expense(p_expense_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expense_exists BOOLEAN;
  v_is_system_admin BOOLEAN;
BEGIN
  -- Check if user is system admin
  v_is_system_admin := is_admin();

  -- Check if expense exists and user has permission
  IF v_is_system_admin THEN
    -- System admin can delete any expense
    SELECT EXISTS(
      SELECT 1 FROM expenses
      WHERE id = p_expense_id
        AND deleted_at IS NULL
    ) INTO v_expense_exists;
  ELSE
    -- Regular users can only delete their own expenses
    SELECT EXISTS(
      SELECT 1 FROM expenses
      WHERE id = p_expense_id
        AND created_by = auth.uid()
        AND deleted_at IS NULL
    ) INTO v_expense_exists;
  END IF;

  IF NOT v_expense_exists THEN
    RAISE EXCEPTION 'Expense not found or you do not have permission to delete it';
  END IF;

  -- Soft delete the expense
  UPDATE expenses
  SET deleted_at = NOW(),
      deleted_by = auth.uid()
  WHERE id = p_expense_id
    AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$;


--
-- Name: FUNCTION soft_delete_expense(p_expense_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.soft_delete_expense(p_expense_id uuid) IS 'Soft delete an expense. Can be called by expense creator or system admin.';


--
-- Name: unsettle_split(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unsettle_split(p_split_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_split RECORD;
  v_expense RECORD;
BEGIN
  SELECT * INTO v_split FROM expense_splits WHERE id = p_split_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Split not found'; END IF;

  SELECT * INTO v_expense FROM expenses WHERE id = v_split.expense_id;

  -- Allow payer OR system admin
  IF v_expense.paid_by_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only the payer or admin can unsettle splits';
  END IF;

  UPDATE expense_splits
  SET is_settled = false, settled_amount = 0, settled_at = NULL
  WHERE id = p_split_id;

  RETURN jsonb_build_object('success', true, 'split_id', p_split_id);
END;
$$;


--
-- Name: FUNCTION unsettle_split(p_split_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.unsettle_split(p_split_id uuid) IS 'Unsettle a split (for corrections). Can be called by payer or system admin.';


--
-- Name: update_momo_payment_requests_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_momo_payment_requests_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_momo_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_momo_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.add_prefixes(_bucket_id text, _name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: delete_leaf_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


--
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_prefix(_bucket_id text, _name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_prefix_hierarchy_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


--
-- Name: lock_top_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


--
-- Name: objects_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_insert_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: objects_update_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: objects_update_level_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_level_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: prefixes_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.prefixes_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


--
-- Name: http_request(); Type: FUNCTION; Schema: supabase_functions; Owner: -
--

CREATE FUNCTION supabase_functions.http_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'supabase_functions'
    AS $$
  DECLARE
    request_id bigint;
    payload jsonb;
    url text := TG_ARGV[0]::text;
    method text := TG_ARGV[1]::text;
    headers jsonb DEFAULT '{}'::jsonb;
    params jsonb DEFAULT '{}'::jsonb;
    timeout_ms integer DEFAULT 1000;
  BEGIN
    IF url IS NULL OR url = 'null' THEN
      RAISE EXCEPTION 'url argument is missing';
    END IF;

    IF method IS NULL OR method = 'null' THEN
      RAISE EXCEPTION 'method argument is missing';
    END IF;

    IF TG_ARGV[2] IS NULL OR TG_ARGV[2] = 'null' THEN
      headers = '{"Content-Type": "application/json"}'::jsonb;
    ELSE
      headers = TG_ARGV[2]::jsonb;
    END IF;

    IF TG_ARGV[3] IS NULL OR TG_ARGV[3] = 'null' THEN
      params = '{}'::jsonb;
    ELSE
      params = TG_ARGV[3]::jsonb;
    END IF;

    IF TG_ARGV[4] IS NULL OR TG_ARGV[4] = 'null' THEN
      timeout_ms = 1000;
    ELSE
      timeout_ms = TG_ARGV[4]::integer;
    END IF;

    CASE
      WHEN method = 'GET' THEN
        SELECT http_get INTO request_id FROM net.http_get(
          url,
          params,
          headers,
          timeout_ms
        );
      WHEN method = 'POST' THEN
        payload = jsonb_build_object(
          'old_record', OLD,
          'record', NEW,
          'type', TG_OP,
          'table', TG_TABLE_NAME,
          'schema', TG_TABLE_SCHEMA
        );

        SELECT http_post INTO request_id FROM net.http_post(
          url,
          payload,
          params,
          headers,
          timeout_ms
        );
      ELSE
        RAISE EXCEPTION 'method argument % is invalid', method;
    END CASE;

    INSERT INTO supabase_functions.hooks
      (hook_table_id, hook_name, request_id)
    VALUES
      (TG_RELID, TG_NAME, request_id);

    RETURN NEW;
  END
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: extensions; Type: TABLE; Schema: _realtime; Owner: -
--

CREATE TABLE _realtime.extensions (
    id uuid NOT NULL,
    type text,
    settings jsonb,
    tenant_external_id text,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: _realtime; Owner: -
--

CREATE TABLE _realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: tenants; Type: TABLE; Schema: _realtime; Owner: -
--

CREATE TABLE _realtime.tenants (
    id uuid NOT NULL,
    name text,
    external_id text,
    jwt_secret character varying(255),
    max_concurrent_users integer DEFAULT 200 NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL,
    max_events_per_second integer DEFAULT 100 NOT NULL,
    postgres_cdc_default text DEFAULT 'postgres_cdc_rls'::text,
    max_bytes_per_second integer DEFAULT 100000 NOT NULL,
    max_channels_per_client integer DEFAULT 100 NOT NULL,
    max_joins_per_second integer DEFAULT 500 NOT NULL,
    suspend boolean DEFAULT false,
    jwt_jwks jsonb,
    notify_private_alpha boolean DEFAULT false,
    private_only boolean DEFAULT false NOT NULL,
    migrations_ran integer DEFAULT 0,
    broadcast_adapter character varying(255) DEFAULT 'gen_rpc'::character varying,
    max_presence_events_per_second integer DEFAULT 1000,
    max_payload_size_in_kb integer DEFAULT 3000,
    CONSTRAINT jwt_secret_or_jwt_jwks_required CHECK (((jwt_secret IS NOT NULL) OR (jwt_jwks IS NOT NULL)))
);


--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: momo_payment_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.momo_payment_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_split_id uuid,
    user_id uuid,
    receiver_phone text NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'VND'::text,
    reference_code text NOT NULL,
    qr_url text,
    status text DEFAULT 'pending'::text,
    verified_at timestamp with time zone,
    momo_tran_id text,
    raw_webhook_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT amount_positive CHECK ((amount > (0)::numeric)),
    CONSTRAINT momo_payment_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'failed'::text, 'expired'::text])))
);


--
-- Name: momo_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.momo_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    receiver_phone text NOT NULL,
    receiver_name text,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: momo_webhook_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.momo_webhook_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    phone text,
    tran_id text,
    amount numeric(12,2),
    comment text,
    partner_id text,
    partner_name text,
    matched_request_id uuid,
    raw_payload jsonb NOT NULL,
    processed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    related_id uuid,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    banking_config jsonb
);


--
-- Name: COLUMN profiles.banking_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.banking_config IS 'Banking configuration for receiving payments (separate from donation settings)';


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: messages_2026_01_09; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_09 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_10; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_10 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_11; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_11 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_12; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_12 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_13; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_13 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: iceberg_namespaces; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.iceberg_namespaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_name text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    catalog_id uuid NOT NULL
);


--
-- Name: iceberg_tables; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.iceberg_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    namespace_id uuid NOT NULL,
    bucket_name text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    location text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    remote_table_id text,
    shard_key text,
    shard_id text,
    catalog_id uuid NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hooks; Type: TABLE; Schema: supabase_functions; Owner: -
--

CREATE TABLE supabase_functions.hooks (
    id bigint NOT NULL,
    hook_table_id integer NOT NULL,
    hook_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id bigint
);


--
-- Name: TABLE hooks; Type: COMMENT; Schema: supabase_functions; Owner: -
--

COMMENT ON TABLE supabase_functions.hooks IS 'Supabase Functions Hooks: Audit trail for triggered hooks.';


--
-- Name: hooks_id_seq; Type: SEQUENCE; Schema: supabase_functions; Owner: -
--

CREATE SEQUENCE supabase_functions.hooks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hooks_id_seq; Type: SEQUENCE OWNED BY; Schema: supabase_functions; Owner: -
--

ALTER SEQUENCE supabase_functions.hooks_id_seq OWNED BY supabase_functions.hooks.id;


--
-- Name: migrations; Type: TABLE; Schema: supabase_functions; Owner: -
--

CREATE TABLE supabase_functions.migrations (
    version text NOT NULL,
    inserted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text
);


--
-- Name: messages_2026_01_09; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_09 FOR VALUES FROM ('2026-01-09 00:00:00') TO ('2026-01-10 00:00:00');


--
-- Name: messages_2026_01_10; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_10 FOR VALUES FROM ('2026-01-10 00:00:00') TO ('2026-01-11 00:00:00');


--
-- Name: messages_2026_01_11; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_11 FOR VALUES FROM ('2026-01-11 00:00:00') TO ('2026-01-12 00:00:00');


--
-- Name: messages_2026_01_12; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_12 FOR VALUES FROM ('2026-01-12 00:00:00') TO ('2026-01-13 00:00:00');


--
-- Name: messages_2026_01_13; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_13 FOR VALUES FROM ('2026-01-13 00:00:00') TO ('2026-01-14 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: hooks id; Type: DEFAULT; Schema: supabase_functions; Owner: -
--

ALTER TABLE ONLY supabase_functions.hooks ALTER COLUMN id SET DEFAULT nextval('supabase_functions.hooks_id_seq'::regclass);


--
-- Data for Name: extensions; Type: TABLE DATA; Schema: _realtime; Owner: -
--

COPY _realtime.extensions (id, type, settings, tenant_external_id, inserted_at, updated_at) FROM stdin;
3ebdf0de-89a3-4ba8-b66e-dad4c9aeb162	postgres_cdc_rls	{"region": "us-east-1", "db_host": "VEcIOyiY4CxG8wwJLj2hcm/r+nlTzzeP3xbX+W1MSko=", "db_name": "sWBpZNdjggEPTQVlI52Zfw==", "db_port": "+enMDFi1J/3IrrquHHwUmA==", "db_user": "uxbEq/zz8DXVD53TOI1zmw==", "slot_name": "supabase_realtime_replication_slot", "db_password": "sWBpZNdjggEPTQVlI52Zfw==", "publication": "supabase_realtime", "ssl_enforced": false, "poll_interval_ms": 100, "poll_max_changes": 100, "poll_max_record_bytes": 1048576}	realtime-dev	2026-01-10 07:11:36	2026-01-10 07:11:36
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: _realtime; Owner: -
--

COPY _realtime.schema_migrations (version, inserted_at) FROM stdin;
20210706140551	2026-01-10 07:11:22
20220329161857	2026-01-10 07:11:22
20220410212326	2026-01-10 07:11:22
20220506102948	2026-01-10 07:11:22
20220527210857	2026-01-10 07:11:22
20220815211129	2026-01-10 07:11:22
20220815215024	2026-01-10 07:11:22
20220818141501	2026-01-10 07:11:22
20221018173709	2026-01-10 07:11:22
20221102172703	2026-01-10 07:11:22
20221223010058	2026-01-10 07:11:22
20230110180046	2026-01-10 07:11:22
20230810220907	2026-01-10 07:11:22
20230810220924	2026-01-10 07:11:22
20231024094642	2026-01-10 07:11:22
20240306114423	2026-01-10 07:11:22
20240418082835	2026-01-10 07:11:22
20240625211759	2026-01-10 07:11:22
20240704172020	2026-01-10 07:11:22
20240902173232	2026-01-10 07:11:22
20241106103258	2026-01-10 07:11:22
20250424203323	2026-01-10 07:11:22
20250613072131	2026-01-10 07:11:22
20250711044927	2026-01-10 07:11:22
20250811121559	2026-01-10 07:11:22
20250926223044	2026-01-10 07:11:22
20251204170944	2026-01-10 07:11:22
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: _realtime; Owner: -
--

COPY _realtime.tenants (id, name, external_id, jwt_secret, max_concurrent_users, inserted_at, updated_at, max_events_per_second, postgres_cdc_default, max_bytes_per_second, max_channels_per_client, max_joins_per_second, suspend, jwt_jwks, notify_private_alpha, private_only, migrations_ran, broadcast_adapter, max_presence_events_per_second, max_payload_size_in_kb) FROM stdin;
c6b8713a-4a1b-4259-bc68-d12651b14fff	realtime-dev	realtime-dev	iNjicxc4+llvc9wovDvqymwfnj9teWMlyOIbJ8Fh6j2WNU8CIJ2ZgjR6MUIKqSmeDmvpsKLsZ9jgXJmQPpwL8w==	200	2026-01-10 07:11:36	2026-01-10 07:11:36	100	postgres_cdc_rls	100000	100	100	f	{"keys": [{"k": "c3VwZXItc2VjcmV0LWp3dC10b2tlbi13aXRoLWF0LWxlYXN0LTMyLWNoYXJhY3RlcnMtbG9uZw", "kty": "oct"}]}	f	f	65	gen_rpc	1000	3000
\.


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
00000000-0000-0000-0000-000000000000	d02ce449-0a59-45c5-b99d-e36262ef0bbb	{"action":"user_signedup","actor_id":"dd4a4506-3421-476b-9332-e14c83aeabbd","actor_name":"Sync Test User","actor_username":"sync-integrity-1768030991572@fairpay.test","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2026-01-10 07:43:11.678143+00	
00000000-0000-0000-0000-000000000000	3d444f8d-a3dc-40f4-aeee-c44ffcfc1c0d	{"action":"login","actor_id":"dd4a4506-3421-476b-9332-e14c83aeabbd","actor_name":"Sync Test User","actor_username":"sync-integrity-1768030991572@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:43:11.683651+00	
00000000-0000-0000-0000-000000000000	5318eec3-a6c1-479c-9d3c-4ab7d2a067b1	{"action":"login","actor_id":"dd4a4506-3421-476b-9332-e14c83aeabbd","actor_name":"Sync Test User","actor_username":"sync-integrity-1768030991572@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:43:11.778504+00	
00000000-0000-0000-0000-000000000000	cab7c180-8be3-44fc-83ba-2ebeef778b9b	{"action":"logout","actor_id":"dd4a4506-3421-476b-9332-e14c83aeabbd","actor_name":"Sync Test User","actor_username":"sync-integrity-1768030991572@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:43:11.980828+00	
00000000-0000-0000-0000-000000000000	09332fd9-9584-415c-9c06-a62e6ca3e4f3	{"action":"login","actor_id":"dd4a4506-3421-476b-9332-e14c83aeabbd","actor_name":"Sync Test User","actor_username":"sync-integrity-1768030991572@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:43:12.066488+00	
00000000-0000-0000-0000-000000000000	60ee40ed-d8bf-4507-913c-a608f82dcedd	{"action":"logout","actor_id":"dd4a4506-3421-476b-9332-e14c83aeabbd","actor_name":"Sync Test User","actor_username":"sync-integrity-1768030991572@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:43:14.586894+00	
00000000-0000-0000-0000-000000000000	e9eb9a5c-54bb-44ed-83f7-244c796d3619	{"action":"login","actor_id":"dd4a4506-3421-476b-9332-e14c83aeabbd","actor_name":"Sync Test User","actor_username":"sync-integrity-1768030991572@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:43:14.676525+00	
00000000-0000-0000-0000-000000000000	a1449f8d-3c7e-47a7-bc6d-4cd46bcebf61	{"action":"logout","actor_id":"dd4a4506-3421-476b-9332-e14c83aeabbd","actor_name":"Sync Test User","actor_username":"sync-integrity-1768030991572@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:43:17.946345+00	
00000000-0000-0000-0000-000000000000	8b979571-8d7c-45fb-8dee-ed275c065b76	{"action":"login","actor_id":"dd4a4506-3421-476b-9332-e14c83aeabbd","actor_name":"Sync Test User","actor_username":"sync-integrity-1768030991572@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:43:18.038161+00	
00000000-0000-0000-0000-000000000000	499d9946-ad12-4fb9-8dc8-33b4bf37fef8	{"action":"logout","actor_id":"dd4a4506-3421-476b-9332-e14c83aeabbd","actor_name":"Sync Test User","actor_username":"sync-integrity-1768030991572@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:43:21.29334+00	
00000000-0000-0000-0000-000000000000	215cc1d4-96ba-49da-9caf-27b0a20249b2	{"action":"user_signedup","actor_id":"99d8c084-22e4-4fdb-9a9b-c244e6561631","actor_name":"Sync Test User","actor_username":"sync-integrity-1768031151821@fairpay.test","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2026-01-10 07:45:51.944958+00	
00000000-0000-0000-0000-000000000000	0544be80-24a6-4e16-95a5-3d47a7b6cfc7	{"action":"login","actor_id":"99d8c084-22e4-4fdb-9a9b-c244e6561631","actor_name":"Sync Test User","actor_username":"sync-integrity-1768031151821@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:45:51.949852+00	
00000000-0000-0000-0000-000000000000	35a79b2f-44ae-4582-a106-35adb6393d3b	{"action":"login","actor_id":"99d8c084-22e4-4fdb-9a9b-c244e6561631","actor_name":"Sync Test User","actor_username":"sync-integrity-1768031151821@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:45:52.040385+00	
00000000-0000-0000-0000-000000000000	9602cff5-2eca-4bbb-8c28-ccd2a44d8152	{"action":"logout","actor_id":"99d8c084-22e4-4fdb-9a9b-c244e6561631","actor_name":"Sync Test User","actor_username":"sync-integrity-1768031151821@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:45:55.274692+00	
00000000-0000-0000-0000-000000000000	d852a343-0bf6-4848-81df-6bf72bd97fb5	{"action":"login","actor_id":"99d8c084-22e4-4fdb-9a9b-c244e6561631","actor_name":"Sync Test User","actor_username":"sync-integrity-1768031151821@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:45:55.357564+00	
00000000-0000-0000-0000-000000000000	ca95cb5c-7b71-4994-8376-f398594dead9	{"action":"logout","actor_id":"99d8c084-22e4-4fdb-9a9b-c244e6561631","actor_name":"Sync Test User","actor_username":"sync-integrity-1768031151821@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:45:57.542128+00	
00000000-0000-0000-0000-000000000000	abf8a0aa-e7b7-47fb-a979-deef797d51b6	{"action":"login","actor_id":"99d8c084-22e4-4fdb-9a9b-c244e6561631","actor_name":"Sync Test User","actor_username":"sync-integrity-1768031151821@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:45:57.624927+00	
00000000-0000-0000-0000-000000000000	00337335-788b-4403-8269-339cdce0e66b	{"action":"logout","actor_id":"99d8c084-22e4-4fdb-9a9b-c244e6561631","actor_name":"Sync Test User","actor_username":"sync-integrity-1768031151821@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:46:00.553023+00	
00000000-0000-0000-0000-000000000000	7598f302-2af0-47e8-b18f-edfd307fb049	{"action":"login","actor_id":"99d8c084-22e4-4fdb-9a9b-c244e6561631","actor_name":"Sync Test User","actor_username":"sync-integrity-1768031151821@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:46:00.638269+00	
00000000-0000-0000-0000-000000000000	02d1369b-228f-44f7-9e07-41363f83a8f4	{"action":"logout","actor_id":"99d8c084-22e4-4fdb-9a9b-c244e6561631","actor_name":"Sync Test User","actor_username":"sync-integrity-1768031151821@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:46:03.427782+00	
00000000-0000-0000-0000-000000000000	e5317165-ee7f-446c-b87a-6753f505fd52	{"action":"user_signedup","actor_id":"4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031457067@fairpay.test","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2026-01-10 07:50:57.176831+00	
00000000-0000-0000-0000-000000000000	f6b8bc09-94ba-45b8-a67b-1d42ffe02e5b	{"action":"login","actor_id":"4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031457067@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:50:57.182887+00	
00000000-0000-0000-0000-000000000000	be97fd09-d22e-4987-8ab5-f0df9e08da11	{"action":"login","actor_id":"4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031457067@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:50:57.273545+00	
00000000-0000-0000-0000-000000000000	b871d5ac-4064-4c48-a0d2-c30077e44f44	{"action":"logout","actor_id":"4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031457067@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:50:57.569697+00	
00000000-0000-0000-0000-000000000000	d861b1df-9d74-4c31-8b80-691828bb84eb	{"action":"login","actor_id":"4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031457067@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:50:57.652625+00	
00000000-0000-0000-0000-000000000000	be053f10-a88a-4681-88c8-2e7dca22f190	{"action":"logout","actor_id":"4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031457067@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:50:57.777003+00	
00000000-0000-0000-0000-000000000000	85d8b396-2e20-40be-b047-31729549b97d	{"action":"login","actor_id":"4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031457067@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:50:57.860705+00	
00000000-0000-0000-0000-000000000000	38641148-d0b9-4aeb-96d0-86b1fec7b408	{"action":"logout","actor_id":"4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031457067@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:51:00.362226+00	
00000000-0000-0000-0000-000000000000	bb588344-2bbc-444f-96bf-aaba8c4a71a1	{"action":"login","actor_id":"4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031457067@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:51:00.445967+00	
00000000-0000-0000-0000-000000000000	709c60bd-3b42-4f6b-b314-a566df0eeadb	{"action":"logout","actor_id":"4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031457067@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:51:00.496902+00	
00000000-0000-0000-0000-000000000000	d176ecc0-1db4-4d4d-b5fd-4de7444e8797	{"action":"user_signedup","actor_id":"0d61d54b-7b27-4210-9622-575539d7e4eb","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031577558@fairpay.test","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2026-01-10 07:52:57.670893+00	
00000000-0000-0000-0000-000000000000	e3294799-65b7-401e-b6bb-60a80ef5457d	{"action":"login","actor_id":"0d61d54b-7b27-4210-9622-575539d7e4eb","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031577558@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:52:57.677483+00	
00000000-0000-0000-0000-000000000000	eb2d368d-1b05-4f48-8b06-d2313aac3dea	{"action":"login","actor_id":"0d61d54b-7b27-4210-9622-575539d7e4eb","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031577558@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:52:57.769377+00	
00000000-0000-0000-0000-000000000000	35c06cf2-2c7a-45cd-b205-efb6f06a8552	{"action":"logout","actor_id":"0d61d54b-7b27-4210-9622-575539d7e4eb","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031577558@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:52:58.089005+00	
00000000-0000-0000-0000-000000000000	2c789057-aaa9-4100-9024-6195699ba06a	{"action":"login","actor_id":"0d61d54b-7b27-4210-9622-575539d7e4eb","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031577558@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:52:58.171036+00	
00000000-0000-0000-0000-000000000000	22a86d3f-0cd1-4981-b1d9-c59b1b01c6f4	{"action":"logout","actor_id":"0d61d54b-7b27-4210-9622-575539d7e4eb","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031577558@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:52:58.271016+00	
00000000-0000-0000-0000-000000000000	e4c16221-b18e-4afc-b8fc-f7e4044fc5d8	{"action":"login","actor_id":"0d61d54b-7b27-4210-9622-575539d7e4eb","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031577558@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:52:58.357564+00	
00000000-0000-0000-0000-000000000000	9b2e0187-96ee-4d8c-b2eb-cfd78d6055fc	{"action":"logout","actor_id":"0d61d54b-7b27-4210-9622-575539d7e4eb","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031577558@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:53:00.853874+00	
00000000-0000-0000-0000-000000000000	a1631f4f-6a8e-42e3-8d59-95b1fb95842a	{"action":"login","actor_id":"0d61d54b-7b27-4210-9622-575539d7e4eb","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031577558@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 07:53:00.937231+00	
00000000-0000-0000-0000-000000000000	c2d3b886-16ae-43b2-994c-a9d33c355f06	{"action":"logout","actor_id":"0d61d54b-7b27-4210-9622-575539d7e4eb","actor_name":"Sync Performance Test User","actor_username":"sync-perf-1768031577558@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 07:53:00.986671+00	
00000000-0000-0000-0000-000000000000	3b0ef666-12c1-4224-b034-f50725247fdf	{"action":"user_signedup","actor_id":"d0570ccb-1851-42c7-a414-80a3fa078676","actor_name":"Migration Test User","actor_username":"migration-test-1768032608108@fairpay.test","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2026-01-10 08:10:08.232395+00	
00000000-0000-0000-0000-000000000000	a46899c8-0117-4810-8bb8-a26c6e190d86	{"action":"login","actor_id":"d0570ccb-1851-42c7-a414-80a3fa078676","actor_name":"Migration Test User","actor_username":"migration-test-1768032608108@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 08:10:08.237264+00	
00000000-0000-0000-0000-000000000000	282adb7f-cedb-4f2a-85bf-3425205edc9e	{"action":"login","actor_id":"d0570ccb-1851-42c7-a414-80a3fa078676","actor_name":"Migration Test User","actor_username":"migration-test-1768032608108@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 08:10:08.326926+00	
00000000-0000-0000-0000-000000000000	c4a45a42-5b2e-4055-9339-562463aa5c9b	{"action":"logout","actor_id":"d0570ccb-1851-42c7-a414-80a3fa078676","actor_name":"Migration Test User","actor_username":"migration-test-1768032608108@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 08:10:11.793174+00	
00000000-0000-0000-0000-000000000000	751ddd2c-60eb-4f61-9f84-277698ebd6ec	{"action":"user_signedup","actor_id":"8a049d2b-ab69-4679-9038-bc93ac43c62c","actor_name":"Migration Unit Test User","actor_username":"migration-unit-test-1768032873615@fairpay.test","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2026-01-10 08:14:33.718363+00	
00000000-0000-0000-0000-000000000000	e7d402f3-3ade-4028-8ae1-fb4afadfecf5	{"action":"login","actor_id":"8a049d2b-ab69-4679-9038-bc93ac43c62c","actor_name":"Migration Unit Test User","actor_username":"migration-unit-test-1768032873615@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 08:14:33.724371+00	
00000000-0000-0000-0000-000000000000	7321b327-e523-4758-985b-f7a4c4d1755b	{"action":"login","actor_id":"8a049d2b-ab69-4679-9038-bc93ac43c62c","actor_name":"Migration Unit Test User","actor_username":"migration-unit-test-1768032873615@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 08:14:33.815907+00	
00000000-0000-0000-0000-000000000000	703332e5-79ad-4996-884e-bcfefbc392a0	{"action":"logout","actor_id":"8a049d2b-ab69-4679-9038-bc93ac43c62c","actor_name":"Migration Unit Test User","actor_username":"migration-unit-test-1768032873615@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 08:14:33.851476+00	
00000000-0000-0000-0000-000000000000	aa9deaf5-5252-4b95-b42e-316598b6e40f	{"action":"user_signedup","actor_id":"661d1566-26e7-465d-9b87-89c1af97b335","actor_name":"Migration Unit Test User","actor_username":"migration-unit-test-1768032898502@fairpay.test","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2026-01-10 08:14:58.612888+00	
00000000-0000-0000-0000-000000000000	1657676c-616f-4095-abe9-670bd5085a84	{"action":"login","actor_id":"661d1566-26e7-465d-9b87-89c1af97b335","actor_name":"Migration Unit Test User","actor_username":"migration-unit-test-1768032898502@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 08:14:58.618045+00	
00000000-0000-0000-0000-000000000000	2c5e8689-742f-4c6b-9abb-b95c2a9ad7da	{"action":"login","actor_id":"661d1566-26e7-465d-9b87-89c1af97b335","actor_name":"Migration Unit Test User","actor_username":"migration-unit-test-1768032898502@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 08:14:58.70673+00	
00000000-0000-0000-0000-000000000000	ea3e2e9d-7227-40de-b08c-4bf2a8c8cbd1	{"action":"logout","actor_id":"661d1566-26e7-465d-9b87-89c1af97b335","actor_name":"Migration Unit Test User","actor_username":"migration-unit-test-1768032898502@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 08:14:58.737408+00	
00000000-0000-0000-0000-000000000000	be24aedd-b833-445d-a780-c63b2fbc3343	{"action":"user_signedup","actor_id":"7cd1f66b-1c9f-43f8-b4a4-6bee88aa4716","actor_name":"Migration Test User","actor_username":"migration-test-1768032941483@fairpay.test","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2026-01-10 08:15:41.606649+00	
00000000-0000-0000-0000-000000000000	c399adb1-aa2d-4376-9c89-2d77c33b0d49	{"action":"login","actor_id":"7cd1f66b-1c9f-43f8-b4a4-6bee88aa4716","actor_name":"Migration Test User","actor_username":"migration-test-1768032941483@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 08:15:41.612021+00	
00000000-0000-0000-0000-000000000000	6624e313-d0c6-4445-b435-6d743fd27f83	{"action":"login","actor_id":"7cd1f66b-1c9f-43f8-b4a4-6bee88aa4716","actor_name":"Migration Test User","actor_username":"migration-test-1768032941483@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 08:15:41.702323+00	
00000000-0000-0000-0000-000000000000	baed0e0f-7441-45c3-b666-969cec21a618	{"action":"logout","actor_id":"7cd1f66b-1c9f-43f8-b4a4-6bee88aa4716","actor_name":"Migration Test User","actor_username":"migration-test-1768032941483@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 08:15:45.298914+00	
00000000-0000-0000-0000-000000000000	1a19f5e4-69c7-4e23-b4f4-481cebec74d4	{"action":"user_signedup","actor_id":"70cdba8a-ab86-464f-a21b-d04591ab2525","actor_name":"Migration Unit Test User","actor_username":"migration-unit-test-1768032950218@fairpay.test","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2026-01-10 08:15:50.34073+00	
00000000-0000-0000-0000-000000000000	1c0bb4b9-5eaf-4580-b1c3-d7a08701d2d0	{"action":"login","actor_id":"70cdba8a-ab86-464f-a21b-d04591ab2525","actor_name":"Migration Unit Test User","actor_username":"migration-unit-test-1768032950218@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 08:15:50.345569+00	
00000000-0000-0000-0000-000000000000	e183dea8-6440-4977-a0e6-dac5e852aa62	{"action":"login","actor_id":"70cdba8a-ab86-464f-a21b-d04591ab2525","actor_name":"Migration Unit Test User","actor_username":"migration-unit-test-1768032950218@fairpay.test","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2026-01-10 08:15:50.432416+00	
00000000-0000-0000-0000-000000000000	c6f1b54f-efde-4516-98ed-9ef6ce84b0f2	{"action":"logout","actor_id":"70cdba8a-ab86-464f-a21b-d04591ab2525","actor_name":"Migration Unit Test User","actor_username":"migration-unit-test-1768032950218@fairpay.test","actor_via_sso":false,"log_type":"account"}	2026-01-10 08:15:50.462237+00	
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
dd4a4506-3421-476b-9332-e14c83aeabbd	dd4a4506-3421-476b-9332-e14c83aeabbd	{"sub": "dd4a4506-3421-476b-9332-e14c83aeabbd", "email": "sync-integrity-1768030991572@fairpay.test", "full_name": "Sync Test User", "email_verified": false, "phone_verified": false}	email	2026-01-10 07:43:11.676909+00	2026-01-10 07:43:11.676928+00	2026-01-10 07:43:11.676928+00	f4897639-f9c6-4df6-8c92-8e1d7da03623
99d8c084-22e4-4fdb-9a9b-c244e6561631	99d8c084-22e4-4fdb-9a9b-c244e6561631	{"sub": "99d8c084-22e4-4fdb-9a9b-c244e6561631", "email": "sync-integrity-1768031151821@fairpay.test", "full_name": "Sync Test User", "email_verified": false, "phone_verified": false}	email	2026-01-10 07:45:51.94371+00	2026-01-10 07:45:51.943729+00	2026-01-10 07:45:51.943729+00	75ef458e-eb5e-470b-a468-516539e65f0e
4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9	4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9	{"sub": "4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9", "email": "sync-perf-1768031457067@fairpay.test", "full_name": "Sync Performance Test User", "email_verified": false, "phone_verified": false}	email	2026-01-10 07:50:57.175728+00	2026-01-10 07:50:57.175747+00	2026-01-10 07:50:57.175747+00	d3e5946e-dd7a-41de-a773-9d08db0aab1e
0d61d54b-7b27-4210-9622-575539d7e4eb	0d61d54b-7b27-4210-9622-575539d7e4eb	{"sub": "0d61d54b-7b27-4210-9622-575539d7e4eb", "email": "sync-perf-1768031577558@fairpay.test", "full_name": "Sync Performance Test User", "email_verified": false, "phone_verified": false}	email	2026-01-10 07:52:57.669423+00	2026-01-10 07:52:57.669445+00	2026-01-10 07:52:57.669445+00	d91fc491-b6e6-4aeb-9d80-2a849fae126f
d0570ccb-1851-42c7-a414-80a3fa078676	d0570ccb-1851-42c7-a414-80a3fa078676	{"sub": "d0570ccb-1851-42c7-a414-80a3fa078676", "email": "migration-test-1768032608108@fairpay.test", "full_name": "Migration Test User", "email_verified": false, "phone_verified": false}	email	2026-01-10 08:10:08.231217+00	2026-01-10 08:10:08.231234+00	2026-01-10 08:10:08.231234+00	36ab6b31-51e0-47a7-b5f4-e32f4758f70f
8a049d2b-ab69-4679-9038-bc93ac43c62c	8a049d2b-ab69-4679-9038-bc93ac43c62c	{"sub": "8a049d2b-ab69-4679-9038-bc93ac43c62c", "email": "migration-unit-test-1768032873615@fairpay.test", "full_name": "Migration Unit Test User", "email_verified": false, "phone_verified": false}	email	2026-01-10 08:14:33.717219+00	2026-01-10 08:14:33.717241+00	2026-01-10 08:14:33.717241+00	e4359d95-ecb9-4e08-a4f3-2d67d2218eb8
661d1566-26e7-465d-9b87-89c1af97b335	661d1566-26e7-465d-9b87-89c1af97b335	{"sub": "661d1566-26e7-465d-9b87-89c1af97b335", "email": "migration-unit-test-1768032898502@fairpay.test", "full_name": "Migration Unit Test User", "email_verified": false, "phone_verified": false}	email	2026-01-10 08:14:58.611738+00	2026-01-10 08:14:58.611764+00	2026-01-10 08:14:58.611764+00	db387fdb-8f17-4b7e-ac24-ef7a91c7eaf8
7cd1f66b-1c9f-43f8-b4a4-6bee88aa4716	7cd1f66b-1c9f-43f8-b4a4-6bee88aa4716	{"sub": "7cd1f66b-1c9f-43f8-b4a4-6bee88aa4716", "email": "migration-test-1768032941483@fairpay.test", "full_name": "Migration Test User", "email_verified": false, "phone_verified": false}	email	2026-01-10 08:15:41.605379+00	2026-01-10 08:15:41.605398+00	2026-01-10 08:15:41.605398+00	77b97a0a-0320-480a-a58c-2358a2f2e7ce
70cdba8a-ab86-464f-a21b-d04591ab2525	70cdba8a-ab86-464f-a21b-d04591ab2525	{"sub": "70cdba8a-ab86-464f-a21b-d04591ab2525", "email": "migration-unit-test-1768032950218@fairpay.test", "full_name": "Migration Unit Test User", "email_verified": false, "phone_verified": false}	email	2026-01-10 08:15:50.339569+00	2026-01-10 08:15:50.339588+00	2026-01-10 08:15:50.339588+00	16219e85-815f-4fa1-a32e-0ca6feb90e13
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
\N	550e8400-e29b-41d4-a716-446655440000	\N	\N	test@example.com	\N	2026-01-10 07:15:46.078484+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-10 07:15:46.078484+00	2026-01-10 07:15:46.078484+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	70cdba8a-ab86-464f-a21b-d04591ab2525	authenticated	authenticated	migration-unit-test-1768032950218@fairpay.test	$2a$10$mrDgyW/NfjLu4sbEVQmL1..y3XvoaAOrcnVKOpR66GpnF6Qm0oY/W	2026-01-10 08:15:50.341078+00	\N		\N		\N			\N	2026-01-10 08:15:50.433094+00	{"provider": "email", "providers": ["email"]}	{"sub": "70cdba8a-ab86-464f-a21b-d04591ab2525", "email": "migration-unit-test-1768032950218@fairpay.test", "full_name": "Migration Unit Test User", "email_verified": true, "phone_verified": false}	\N	2026-01-10 08:15:50.337349+00	2026-01-10 08:15:50.434669+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	8a049d2b-ab69-4679-9038-bc93ac43c62c	authenticated	authenticated	migration-unit-test-1768032873615@fairpay.test	$2a$10$7KV5Ti7g069npvE5hUXLC.NbiKu3.Wxh2Vvn5ZD/wk6JMvNILCO8a	2026-01-10 08:14:33.718704+00	\N		\N		\N			\N	2026-01-10 08:14:33.816613+00	{"provider": "email", "providers": ["email"]}	{"sub": "8a049d2b-ab69-4679-9038-bc93ac43c62c", "email": "migration-unit-test-1768032873615@fairpay.test", "full_name": "Migration Unit Test User", "email_verified": true, "phone_verified": false}	\N	2026-01-10 08:14:33.714779+00	2026-01-10 08:14:33.819663+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	99d8c084-22e4-4fdb-9a9b-c244e6561631	authenticated	authenticated	sync-integrity-1768031151821@fairpay.test	$2a$10$ayRKEQujAHpCNhNxO8BjZeebNUKL6ku1KUOD.HljBJgbQ6AArPJ/a	2026-01-10 07:45:51.945271+00	\N		\N		\N			\N	2026-01-10 07:46:00.639048+00	{"provider": "email", "providers": ["email"]}	{"sub": "99d8c084-22e4-4fdb-9a9b-c244e6561631", "email": "sync-integrity-1768031151821@fairpay.test", "full_name": "Sync Test User", "email_verified": true, "phone_verified": false}	\N	2026-01-10 07:45:51.94138+00	2026-01-10 07:46:00.640662+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	d0570ccb-1851-42c7-a414-80a3fa078676	authenticated	authenticated	migration-test-1768032608108@fairpay.test	$2a$10$1ueLzDsn5jP1LGcCcnB3xeqnk7pJecROSt305ajNClnYFKAzb..fe	2026-01-10 08:10:08.232796+00	\N		\N		\N			\N	2026-01-10 08:10:08.327861+00	{"provider": "email", "providers": ["email"]}	{"sub": "d0570ccb-1851-42c7-a414-80a3fa078676", "email": "migration-test-1768032608108@fairpay.test", "full_name": "Migration Test User", "email_verified": true, "phone_verified": false}	\N	2026-01-10 08:10:08.228683+00	2026-01-10 08:10:08.329829+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	dd4a4506-3421-476b-9332-e14c83aeabbd	authenticated	authenticated	sync-integrity-1768030991572@fairpay.test	$2a$10$EFO36jkcOhh4vaDVrOjpquXAnMZEXZxtnUh1y8BMP5DJU09TZtd7y	2026-01-10 07:43:11.678612+00	\N		\N		\N			\N	2026-01-10 07:43:18.039626+00	{"provider": "email", "providers": ["email"]}	{"sub": "dd4a4506-3421-476b-9332-e14c83aeabbd", "email": "sync-integrity-1768030991572@fairpay.test", "full_name": "Sync Test User", "email_verified": true, "phone_verified": false}	\N	2026-01-10 07:43:11.674479+00	2026-01-10 07:43:18.04148+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	0d61d54b-7b27-4210-9622-575539d7e4eb	authenticated	authenticated	sync-perf-1768031577558@fairpay.test	$2a$10$wpLpc5qW1l5bh9u.6gnOjOb2KnFUD982SFiwmuAWNdsT/mT5QiSL.	2026-01-10 07:52:57.671391+00	\N		\N		\N			\N	2026-01-10 07:53:00.937887+00	{"provider": "email", "providers": ["email"]}	{"sub": "0d61d54b-7b27-4210-9622-575539d7e4eb", "email": "sync-perf-1768031577558@fairpay.test", "full_name": "Sync Performance Test User", "email_verified": true, "phone_verified": false}	\N	2026-01-10 07:52:57.667127+00	2026-01-10 07:53:00.941388+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9	authenticated	authenticated	sync-perf-1768031457067@fairpay.test	$2a$10$0Qv/8kFA4OiWRl8og2f0AugqdgGMjcROHnXcPpUi4RRg83MBmiSce	2026-01-10 07:50:57.177171+00	\N		\N		\N			\N	2026-01-10 07:51:00.446806+00	{"provider": "email", "providers": ["email"]}	{"sub": "4e3a7051-dcbd-43b7-b26d-90f2b3daa3a9", "email": "sync-perf-1768031457067@fairpay.test", "full_name": "Sync Performance Test User", "email_verified": true, "phone_verified": false}	\N	2026-01-10 07:50:57.173515+00	2026-01-10 07:51:00.448612+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	661d1566-26e7-465d-9b87-89c1af97b335	authenticated	authenticated	migration-unit-test-1768032898502@fairpay.test	$2a$10$Mqnxb/T2T15nKlaHAthhDOAv6RXlzT9v.gBUV3ATUaAVP/waI63AS	2026-01-10 08:14:58.613246+00	\N		\N		\N			\N	2026-01-10 08:14:58.707464+00	{"provider": "email", "providers": ["email"]}	{"sub": "661d1566-26e7-465d-9b87-89c1af97b335", "email": "migration-unit-test-1768032898502@fairpay.test", "full_name": "Migration Unit Test User", "email_verified": true, "phone_verified": false}	\N	2026-01-10 08:14:58.609309+00	2026-01-10 08:14:58.709019+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	7cd1f66b-1c9f-43f8-b4a4-6bee88aa4716	authenticated	authenticated	migration-test-1768032941483@fairpay.test	$2a$10$Vdx7bjzdhK1bedhyN23/Y.5HkF/WDoXN853c1uNgd3PeQ/LQxh9uK	2026-01-10 08:15:41.607019+00	\N		\N		\N			\N	2026-01-10 08:15:41.703136+00	{"provider": "email", "providers": ["email"]}	{"sub": "7cd1f66b-1c9f-43f8-b4a4-6bee88aa4716", "email": "migration-test-1768032941483@fairpay.test", "full_name": "Migration Test User", "email_verified": true, "phone_verified": false}	\N	2026-01-10 08:15:41.601976+00	2026-01-10 08:15:41.704719+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: momo_payment_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.momo_payment_requests (id, expense_split_id, user_id, receiver_phone, amount, currency, reference_code, qr_url, status, verified_at, momo_tran_id, raw_webhook_data, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: momo_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.momo_settings (id, receiver_phone, receiver_name, enabled, created_at, updated_at) FROM stdin;
fd212f74-1ae8-4c6d-b42c-b106254b5395	0918399443	FairPay	t	2026-01-10 07:11:33.797309+00	2026-01-10 07:11:33.797309+00
\.


--
-- Data for Name: momo_webhook_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.momo_webhook_logs (id, event_type, phone, tran_id, amount, comment, partner_id, partner_name, matched_request_id, raw_payload, processed, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, message, link, related_id, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, email, full_name, avatar_url, created_at, updated_at, banking_config) FROM stdin;
550e8400-e29b-41d4-a716-446655440000	test@example.com	Test User	\N	2026-01-10 07:15:46.078484+00	2026-01-10 07:15:46.078484+00	{"bank_info": {"app": "vcb", "bank": "VCB", "account": "1234567890", "accountName": "Test User"}, "qr_code_image_url": "https://example.com/qr.png"}
\.


--
-- Data for Name: messages_2026_01_09; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.messages_2026_01_09 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_01_10; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.messages_2026_01_10 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_01_11; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.messages_2026_01_11 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_01_12; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.messages_2026_01_12 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_01_13; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.messages_2026_01_13 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-01-10 07:11:23
20211116045059	2026-01-10 07:11:23
20211116050929	2026-01-10 07:11:23
20211116051442	2026-01-10 07:11:23
20211116212300	2026-01-10 07:11:23
20211116213355	2026-01-10 07:11:23
20211116213934	2026-01-10 07:11:23
20211116214523	2026-01-10 07:11:23
20211122062447	2026-01-10 07:11:23
20211124070109	2026-01-10 07:11:23
20211202204204	2026-01-10 07:11:23
20211202204605	2026-01-10 07:11:23
20211210212804	2026-01-10 07:11:23
20211228014915	2026-01-10 07:11:23
20220107221237	2026-01-10 07:11:23
20220228202821	2026-01-10 07:11:23
20220312004840	2026-01-10 07:11:23
20220603231003	2026-01-10 07:11:23
20220603232444	2026-01-10 07:11:23
20220615214548	2026-01-10 07:11:23
20220712093339	2026-01-10 07:11:23
20220908172859	2026-01-10 07:11:23
20220916233421	2026-01-10 07:11:23
20230119133233	2026-01-10 07:11:23
20230128025114	2026-01-10 07:11:23
20230128025212	2026-01-10 07:11:23
20230227211149	2026-01-10 07:11:23
20230228184745	2026-01-10 07:11:23
20230308225145	2026-01-10 07:11:23
20230328144023	2026-01-10 07:11:23
20231018144023	2026-01-10 07:11:23
20231204144023	2026-01-10 07:11:23
20231204144024	2026-01-10 07:11:23
20231204144025	2026-01-10 07:11:23
20240108234812	2026-01-10 07:11:23
20240109165339	2026-01-10 07:11:23
20240227174441	2026-01-10 07:11:23
20240311171622	2026-01-10 07:11:23
20240321100241	2026-01-10 07:11:23
20240401105812	2026-01-10 07:11:23
20240418121054	2026-01-10 07:11:23
20240523004032	2026-01-10 07:11:23
20240618124746	2026-01-10 07:11:23
20240801235015	2026-01-10 07:11:23
20240805133720	2026-01-10 07:11:23
20240827160934	2026-01-10 07:11:23
20240919163303	2026-01-10 07:11:23
20240919163305	2026-01-10 07:11:23
20241019105805	2026-01-10 07:11:23
20241030150047	2026-01-10 07:11:23
20241108114728	2026-01-10 07:11:23
20241121104152	2026-01-10 07:11:23
20241130184212	2026-01-10 07:11:23
20241220035512	2026-01-10 07:11:23
20241220123912	2026-01-10 07:11:23
20241224161212	2026-01-10 07:11:23
20250107150512	2026-01-10 07:11:23
20250110162412	2026-01-10 07:11:23
20250123174212	2026-01-10 07:11:23
20250128220012	2026-01-10 07:11:23
20250506224012	2026-01-10 07:11:23
20250523164012	2026-01-10 07:11:23
20250714121412	2026-01-10 07:11:23
20250905041441	2026-01-10 07:11:23
20251103001201	2026-01-10 07:11:23
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.iceberg_namespaces (id, bucket_name, name, created_at, updated_at, metadata, catalog_id) FROM stdin;
\.


--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.iceberg_tables (id, namespace_id, bucket_name, name, location, created_at, updated_at, remote_table_id, shard_key, shard_id, catalog_id) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-01-10 07:11:33.238987
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-01-10 07:11:33.241062
2	storage-schema	5c7968fd083fcea04050c1b7f6253c9771b99011	2026-01-10 07:11:33.242275
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-01-10 07:11:33.24657
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-01-10 07:11:33.248697
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-01-10 07:11:33.249461
6	change-column-name-in-get-size	f93f62afdf6613ee5e7e815b30d02dc990201044	2026-01-10 07:11:33.250545
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-01-10 07:11:33.251545
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-01-10 07:11:33.252226
9	fix-search-function	3a0af29f42e35a4d101c259ed955b67e1bee6825	2026-01-10 07:11:33.252854
10	search-files-search-function	68dc14822daad0ffac3746a502234f486182ef6e	2026-01-10 07:11:33.253798
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-01-10 07:11:33.254737
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-01-10 07:11:33.255696
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-01-10 07:11:33.256325
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-01-10 07:11:33.256939
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-01-10 07:11:33.261599
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-01-10 07:11:33.262477
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-01-10 07:11:33.263077
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-01-10 07:11:33.263652
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-01-10 07:11:33.264452
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-01-10 07:11:33.265046
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-01-10 07:11:33.266076
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-01-10 07:11:33.268774
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-01-10 07:11:33.270868
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-01-10 07:11:33.271795
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-01-10 07:11:33.272513
26	objects-prefixes	ef3f7871121cdc47a65308e6702519e853422ae2	2026-01-10 07:11:33.273241
27	search-v2	33b8f2a7ae53105f028e13e9fcda9dc4f356b4a2	2026-01-10 07:11:33.276626
28	object-bucket-name-sorting	ba85ec41b62c6a30a3f136788227ee47f311c436	2026-01-10 07:11:33.29732
29	create-prefixes	a7b1a22c0dc3ab630e3055bfec7ce7d2045c5b7b	2026-01-10 07:11:33.298468
30	update-object-levels	6c6f6cc9430d570f26284a24cf7b210599032db7	2026-01-10 07:11:33.29933
31	objects-level-index	33f1fef7ec7fea08bb892222f4f0f5d79bab5eb8	2026-01-10 07:11:33.300199
32	backward-compatible-index-on-objects	2d51eeb437a96868b36fcdfb1ddefdf13bef1647	2026-01-10 07:11:33.301035
33	backward-compatible-index-on-prefixes	fe473390e1b8c407434c0e470655945b110507bf	2026-01-10 07:11:33.301717
34	optimize-search-function-v1	82b0e469a00e8ebce495e29bfa70a0797f7ebd2c	2026-01-10 07:11:33.301883
35	add-insert-trigger-prefixes	63bb9fd05deb3dc5e9fa66c83e82b152f0caf589	2026-01-10 07:11:33.303178
36	optimise-existing-functions	81cf92eb0c36612865a18016a38496c530443899	2026-01-10 07:11:33.303746
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-01-10 07:11:33.305627
38	iceberg-catalog-flag-on-buckets	19a8bd89d5dfa69af7f222a46c726b7c41e462c5	2026-01-10 07:11:33.306419
39	add-search-v2-sort-support	39cf7d1e6bf515f4b02e41237aba845a7b492853	2026-01-10 07:11:33.309745
40	fix-prefix-race-conditions-optimized	fd02297e1c67df25a9fc110bf8c8a9af7fb06d1f	2026-01-10 07:11:33.310737
41	add-object-level-update-trigger	44c22478bf01744b2129efc480cd2edc9a7d60e9	2026-01-10 07:11:33.312742
42	rollback-prefix-triggers	f2ab4f526ab7f979541082992593938c05ee4b47	2026-01-10 07:11:33.31382
43	fix-object-level	ab837ad8f1c7d00cc0b7310e989a23388ff29fc6	2026-01-10 07:11:33.314729
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-01-10 07:11:33.315366
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-01-10 07:11:33.31589
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-01-10 07:11:33.31775
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-01-10 07:11:33.318414
48	iceberg-catalog-ids	2666dff93346e5d04e0a878416be1d5fec345d6f	2026-01-10 07:11:33.319121
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-01-10 07:11:33.325916
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata, level) FROM stdin;
\.


--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.prefixes (bucket_id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: -
--

COPY supabase_functions.hooks (id, hook_table_id, hook_name, created_at, request_id) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: supabase_functions; Owner: -
--

COPY supabase_functions.migrations (version, inserted_at) FROM stdin;
initial	2026-01-10 07:11:21.461948+00
20210809183423_update_grants	2026-01-10 07:11:21.461948+00
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: supabase_migrations; Owner: -
--

COPY supabase_migrations.schema_migrations (version, statements, name) FROM stdin;
20260107175703	{"-- ========================================\n-- FRIEND REQUEST NOTIFICATIONS\n-- ========================================\n-- Description: Add database trigger to automatically create notifications\n--              when a user sends a friend request to another user\n-- Date: 2026-01-07\n--\n-- This migration adds:\n-- - Column related_id to notifications table for linking to related entities\n-- - Function to create friend request notification for recipient\n-- - Trigger to call the function when a pending friendship is created\n-- ========================================\n\nBEGIN","-- Create notifications table if it doesn't exist (for fresh migrations)\n-- Note: FK constraint will be added later when profiles table exists\nCREATE TABLE IF NOT EXISTS notifications (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id UUID NOT NULL,\n  type TEXT NOT NULL,\n  title TEXT NOT NULL,\n  message TEXT NOT NULL,\n  link TEXT,\n  related_id UUID,\n  is_read BOOLEAN DEFAULT false,\n  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL\n)","-- Add related_id column to notifications table if it doesn't exist\nALTER TABLE notifications\nADD COLUMN IF NOT EXISTS related_id UUID","-- Add foreign key constraint if profiles table exists and constraint doesn't exist\nDO $$\nBEGIN\n  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN\n    IF NOT EXISTS (\n      SELECT 1 FROM information_schema.table_constraints\n      WHERE constraint_schema = 'public'\n      AND table_name = 'notifications'\n      AND constraint_name = 'notifications_user_id_fkey'\n    ) THEN\n      ALTER TABLE notifications\n      ADD CONSTRAINT notifications_user_id_fkey\n      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;\n    END IF;\n  END IF;\nEND $$","-- Enable RLS on notifications table\nALTER TABLE notifications ENABLE ROW LEVEL SECURITY","-- Create RLS policies if they don't exist\nDO $$\nBEGIN\n  -- Users can view their own notifications\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_policies\n    WHERE schemaname = 'public'\n    AND tablename = 'notifications'\n    AND policyname = 'notifications_read_own'\n  ) THEN\n    CREATE POLICY \\"notifications_read_own\\" ON notifications\n      FOR SELECT TO authenticated\n      USING (user_id = auth.uid());\n  END IF;\n\n  -- Users can update their own notifications\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_policies\n    WHERE schemaname = 'public'\n    AND tablename = 'notifications'\n    AND policyname = 'notifications_update_own'\n  ) THEN\n    CREATE POLICY \\"notifications_update_own\\" ON notifications\n      FOR UPDATE TO authenticated\n      USING (user_id = auth.uid());\n  END IF;\n\n  -- Users can insert their own notifications (for triggers)\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_policies\n    WHERE schemaname = 'public'\n    AND tablename = 'notifications'\n    AND policyname = 'notifications_insert_own'\n  ) THEN\n    CREATE POLICY \\"notifications_insert_own\\" ON notifications\n      FOR INSERT TO authenticated\n      WITH CHECK (user_id = auth.uid());\n  END IF;\nEND $$","-- Create indexes if they don't exist\nCREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created ON notifications(user_id, created_at DESC) WHERE is_read = FALSE","CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)","CREATE INDEX IF NOT EXISTS idx_notifications_type_created ON notifications(type, created_at DESC)","-- Function to create notification for friend request recipient\nCREATE OR REPLACE FUNCTION notify_friend_request()\nRETURNS TRIGGER\nSECURITY DEFINER\nSET search_path = public, pg_temp\nLANGUAGE plpgsql\nAS $$\nDECLARE\n  v_recipient_id UUID;\n  v_requester_id UUID;\n  v_requester_name TEXT;\n  v_notify_enabled BOOLEAN;\nBEGIN\n  -- Only create notification for pending friend requests\n  IF NEW.status != 'pending' THEN\n    RETURN NEW;\n  END IF;\n\n  -- Determine recipient (the user who did NOT create the request)\n  -- and requester (the user who created the request)\n  v_requester_id := NEW.created_by;\n\n  IF NEW.user_a = v_requester_id THEN\n    v_recipient_id := NEW.user_b;\n  ELSE\n    v_recipient_id := NEW.user_a;\n  END IF;\n\n  -- Get requester's full name from profiles (if exists)\n  BEGIN\n    SELECT full_name INTO v_requester_name\n    FROM profiles\n    WHERE id = v_requester_id;\n  EXCEPTION WHEN OTHERS THEN\n    v_requester_name := 'Someone';\n  END;\n\n  -- Check if recipient has friend request notifications enabled (if user_settings exists)\n  BEGIN\n    SELECT COALESCE(notify_on_friend_request, TRUE) INTO v_notify_enabled\n    FROM user_settings\n    WHERE user_id = v_recipient_id;\n  EXCEPTION WHEN OTHERS THEN\n    v_notify_enabled := TRUE;\n  END;\n\n  -- If notifications are disabled, skip\n  IF v_notify_enabled = FALSE THEN\n    RETURN NEW;\n  END IF;\n\n  -- Create notification for recipient (if notifications table exists)\n  BEGIN\n    INSERT INTO notifications (\n      user_id,\n      type,\n      title,\n      message,\n      link,\n      related_id,\n      is_read,\n      created_at\n    ) VALUES (\n      v_recipient_id,\n      'friend_request',\n      COALESCE(v_requester_name, 'Someone') || ' sent you a friend request',\n      'Accept or reject this request on the Friends page',\n      '/friends',\n      NEW.id,\n      FALSE,\n      NOW()\n    );\n  EXCEPTION WHEN OTHERS THEN\n    -- Silently fail if notifications table doesn't exist yet\n    NULL;\n  END;\n\n  RETURN NEW;\nEND;\n$$","-- Only create trigger if friendships table exists\nDO $$\nBEGIN\n  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'friendships') THEN\n    -- Drop trigger if it exists (for idempotency)\n    DROP TRIGGER IF EXISTS trigger_notify_friend_request ON friendships;\n\n    -- Create trigger\n    CREATE TRIGGER trigger_notify_friend_request\n      AFTER INSERT ON friendships\n      FOR EACH ROW\n      EXECUTE FUNCTION notify_friend_request();\n  END IF;\nEND $$",COMMIT}	friend_request_notifications
20260108110000	{"-- MoMo Payment Integration Tables\n-- This migration adds support for MoMo payment integration\n\n-- Create is_admin() function if it doesn't exist (needed for RLS policies)\nCREATE OR REPLACE FUNCTION is_admin()\nRETURNS BOOLEAN\nSECURITY DEFINER\nSET search_path = public, pg_temp\nLANGUAGE plpgsql\nAS $$\nBEGIN\n  -- Only check if user_roles table exists\n  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN\n    RETURN EXISTS (\n      SELECT 1 FROM user_roles\n      WHERE user_id = auth.uid() AND role = 'admin'\n    );\n  END IF;\n  RETURN FALSE;\nEND;\n$$","-- 1. Create momo_settings table for configuration\nCREATE TABLE IF NOT EXISTS momo_settings (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    receiver_phone TEXT NOT NULL,\n    receiver_name TEXT,\n    enabled BOOLEAN DEFAULT TRUE,\n    created_at TIMESTAMPTZ DEFAULT NOW(),\n    updated_at TIMESTAMPTZ DEFAULT NOW()\n)","-- Add RLS policies for momo_settings\nALTER TABLE momo_settings ENABLE ROW LEVEL SECURITY","-- Only authenticated users can read settings\nDROP POLICY IF EXISTS \\"momo_settings_read_policy\\" ON momo_settings","CREATE POLICY \\"momo_settings_read_policy\\" ON momo_settings\n    FOR SELECT TO authenticated\n    USING (true)","-- Only admins can update settings (using is_admin() function to avoid RLS recursion)\nDROP POLICY IF EXISTS \\"momo_settings_update_policy\\" ON momo_settings","CREATE POLICY \\"momo_settings_update_policy\\" ON momo_settings\n    FOR UPDATE TO authenticated\n    USING (is_admin())","-- 2. Create momo_payment_requests table (FK constraints added later)\nCREATE TABLE IF NOT EXISTS momo_payment_requests (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    expense_split_id UUID,\n    user_id UUID,\n    receiver_phone TEXT NOT NULL,\n    amount DECIMAL(12, 2) NOT NULL,\n    currency TEXT DEFAULT 'VND',\n    reference_code TEXT UNIQUE NOT NULL,\n    qr_url TEXT,\n    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'expired')),\n    verified_at TIMESTAMPTZ,\n    momo_tran_id TEXT,\n    raw_webhook_data JSONB,\n    created_at TIMESTAMPTZ DEFAULT NOW(),\n    updated_at TIMESTAMPTZ DEFAULT NOW(),\n    CONSTRAINT amount_positive CHECK (amount > 0)\n)","-- Add foreign key constraints if referenced tables exist\nDO $$\nBEGIN\n  -- Add FK to expense_splits if table exists\n  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_splits') THEN\n    IF NOT EXISTS (\n      SELECT 1 FROM information_schema.table_constraints\n      WHERE constraint_schema = 'public'\n      AND table_name = 'momo_payment_requests'\n      AND constraint_name = 'momo_payment_requests_expense_split_id_fkey'\n    ) THEN\n      ALTER TABLE momo_payment_requests\n      ADD CONSTRAINT momo_payment_requests_expense_split_id_fkey\n      FOREIGN KEY (expense_split_id) REFERENCES expense_splits(id) ON DELETE CASCADE;\n    END IF;\n  END IF;\n\n  -- Add FK to profiles if table exists\n  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN\n    IF NOT EXISTS (\n      SELECT 1 FROM information_schema.table_constraints\n      WHERE constraint_schema = 'public'\n      AND table_name = 'momo_payment_requests'\n      AND constraint_name = 'momo_payment_requests_user_id_fkey'\n    ) THEN\n      ALTER TABLE momo_payment_requests\n      ADD CONSTRAINT momo_payment_requests_user_id_fkey\n      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;\n    END IF;\n  END IF;\nEND $$","-- Add indexes for performance\nCREATE INDEX IF NOT EXISTS idx_momo_payment_requests_user_id ON momo_payment_requests(user_id)","CREATE INDEX IF NOT EXISTS idx_momo_payment_requests_expense_split_id ON momo_payment_requests(expense_split_id)","CREATE INDEX IF NOT EXISTS idx_momo_payment_requests_reference_code ON momo_payment_requests(reference_code)","CREATE INDEX IF NOT EXISTS idx_momo_payment_requests_status ON momo_payment_requests(status)","CREATE INDEX IF NOT EXISTS idx_momo_payment_requests_created_at ON momo_payment_requests(created_at DESC)","-- Add RLS policies for momo_payment_requests\nALTER TABLE momo_payment_requests ENABLE ROW LEVEL SECURITY","-- Users can view their own payment requests\nDROP POLICY IF EXISTS \\"momo_payment_requests_read_own\\" ON momo_payment_requests","CREATE POLICY \\"momo_payment_requests_read_own\\" ON momo_payment_requests\n    FOR SELECT TO authenticated\n    USING (user_id = auth.uid())","-- Users can create their own payment requests\nDROP POLICY IF EXISTS \\"momo_payment_requests_create_own\\" ON momo_payment_requests","CREATE POLICY \\"momo_payment_requests_create_own\\" ON momo_payment_requests\n    FOR INSERT TO authenticated\n    WITH CHECK (user_id = auth.uid())","-- Users can update their own payment requests (for status changes)\nDROP POLICY IF EXISTS \\"momo_payment_requests_update_own\\" ON momo_payment_requests","CREATE POLICY \\"momo_payment_requests_update_own\\" ON momo_payment_requests\n    FOR UPDATE TO authenticated\n    USING (user_id = auth.uid())","-- 3. Create momo_webhook_logs table for audit trail\nCREATE TABLE IF NOT EXISTS momo_webhook_logs (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    event_type TEXT NOT NULL,\n    phone TEXT,\n    tran_id TEXT UNIQUE,\n    amount DECIMAL(12, 2),\n    comment TEXT,\n    partner_id TEXT,\n    partner_name TEXT,\n    matched_request_id UUID,\n    raw_payload JSONB NOT NULL,\n    processed BOOLEAN DEFAULT FALSE,\n    created_at TIMESTAMPTZ DEFAULT NOW()\n)","-- Add FK constraint for matched_request_id if momo_payment_requests exists\nDO $$\nBEGIN\n  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'momo_payment_requests') THEN\n    IF NOT EXISTS (\n      SELECT 1 FROM information_schema.table_constraints\n      WHERE constraint_schema = 'public'\n      AND table_name = 'momo_webhook_logs'\n      AND constraint_name = 'momo_webhook_logs_matched_request_id_fkey'\n    ) THEN\n      ALTER TABLE momo_webhook_logs\n      ADD CONSTRAINT momo_webhook_logs_matched_request_id_fkey\n      FOREIGN KEY (matched_request_id) REFERENCES momo_payment_requests(id);\n    END IF;\n  END IF;\nEND $$","-- Add indexes for webhook logs\nCREATE INDEX IF NOT EXISTS idx_momo_webhook_logs_tran_id ON momo_webhook_logs(tran_id)","CREATE INDEX IF NOT EXISTS idx_momo_webhook_logs_processed ON momo_webhook_logs(processed)","CREATE INDEX IF NOT EXISTS idx_momo_webhook_logs_created_at ON momo_webhook_logs(created_at DESC)","-- Add RLS policies for momo_webhook_logs\nALTER TABLE momo_webhook_logs ENABLE ROW LEVEL SECURITY","-- Only admins can view webhook logs\nDROP POLICY IF EXISTS \\"momo_webhook_logs_admin_only\\" ON momo_webhook_logs","CREATE POLICY \\"momo_webhook_logs_admin_only\\" ON momo_webhook_logs\n    FOR ALL TO authenticated\n    USING (is_admin())","-- 4. Add triggers for updated_at\nCREATE OR REPLACE FUNCTION update_momo_settings_updated_at()\nRETURNS TRIGGER AS $$\nBEGIN\n    NEW.updated_at = NOW();\n    RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql","DROP TRIGGER IF EXISTS update_momo_settings_updated_at ON momo_settings","CREATE TRIGGER update_momo_settings_updated_at\n    BEFORE UPDATE ON momo_settings\n    FOR EACH ROW\n    EXECUTE FUNCTION update_momo_settings_updated_at()","CREATE OR REPLACE FUNCTION update_momo_payment_requests_updated_at()\nRETURNS TRIGGER AS $$\nBEGIN\n    NEW.updated_at = NOW();\n    RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql","DROP TRIGGER IF EXISTS update_momo_payment_requests_updated_at ON momo_payment_requests","CREATE TRIGGER update_momo_payment_requests_updated_at\n    BEFORE UPDATE ON momo_payment_requests\n    FOR EACH ROW\n    EXECUTE FUNCTION update_momo_payment_requests_updated_at()","-- 5. Function to verify MoMo payment and update expense split (only create if expense_splits exists)\nDO $$\nBEGIN\n  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_splits') THEN\n    EXECUTE '\n    CREATE OR REPLACE FUNCTION verify_momo_payment(\n        p_reference_code TEXT,\n        p_tran_id TEXT,\n        p_amount DECIMAL,\n        p_webhook_data JSONB DEFAULT NULL\n    )\n    RETURNS JSONB AS $func$\n    DECLARE\n        v_payment_request momo_payment_requests%ROWTYPE;\n        v_expense_split expense_splits%ROWTYPE;\n        v_result JSONB;\n    BEGIN\n        -- Find the payment request\n        SELECT * INTO v_payment_request\n        FROM momo_payment_requests\n        WHERE reference_code = p_reference_code\n        AND status = ''pending''\n        FOR UPDATE;\n\n        IF NOT FOUND THEN\n            RETURN jsonb_build_object(\n                ''success'', false,\n                ''error'', ''Payment request not found or already processed''\n            );\n        END IF;\n\n        -- Verify amount matches\n        IF v_payment_request.amount != p_amount THEN\n            -- Update status to failed\n            UPDATE momo_payment_requests\n            SET status = ''failed'',\n                momo_tran_id = p_tran_id,\n                raw_webhook_data = p_webhook_data,\n                updated_at = NOW()\n            WHERE id = v_payment_request.id;\n\n            RETURN jsonb_build_object(\n                ''success'', false,\n                ''error'', ''Amount mismatch''\n            );\n        END IF;\n\n        -- Update payment request status\n        UPDATE momo_payment_requests\n        SET status = ''verified'',\n            verified_at = NOW(),\n            momo_tran_id = p_tran_id,\n            raw_webhook_data = p_webhook_data,\n            updated_at = NOW()\n        WHERE id = v_payment_request.id;\n\n        -- Update expense split as settled\n        UPDATE expense_splits\n        SET is_settled = TRUE,\n            settled_amount = p_amount,\n            settled_at = NOW()\n        WHERE id = v_payment_request.expense_split_id;\n\n        -- Get updated split for return\n        SELECT * INTO v_expense_split\n        FROM expense_splits\n        WHERE id = v_payment_request.expense_split_id;\n\n        RETURN jsonb_build_object(\n            ''success'', true,\n            ''payment_request_id'', v_payment_request.id,\n            ''expense_split_id'', v_expense_split.id,\n            ''settled_amount'', v_expense_split.settled_amount\n        );\n    END;\n    $func$ LANGUAGE plpgsql SECURITY DEFINER';\n  END IF;\nEND $$","-- 6. Function to create MoMo payment request (only create if expense_splits exists)\nDO $$\nBEGIN\n  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_splits') THEN\n    -- Drop existing function first to avoid return type conflicts\n    DROP FUNCTION IF EXISTS create_momo_payment_request(UUID, UUID, TEXT, DECIMAL);\n    DROP FUNCTION IF EXISTS create_momo_payment_request(uuid, uuid, text, numeric);\n\n    EXECUTE '\n    CREATE OR REPLACE FUNCTION create_momo_payment_request(\n        p_expense_split_id UUID,\n        p_user_id UUID,\n        p_receiver_phone TEXT,\n        p_amount DECIMAL\n    )\n    RETURNS JSONB AS $func$\n    DECLARE\n        v_reference_code TEXT;\n        v_payment_request_id UUID;\n        v_expense_split expense_splits%ROWTYPE;\n    BEGIN\n        -- Verify expense split exists and belongs to user\n        SELECT * INTO v_expense_split\n        FROM expense_splits\n        WHERE id = p_expense_split_id\n        AND user_id = p_user_id\n        AND is_settled = FALSE;\n\n        IF NOT FOUND THEN\n            RETURN jsonb_build_object(\n                ''success'', false,\n                ''error'', ''Expense split not found or already settled''\n            );\n        END IF;\n\n        -- Check if there''s already a pending request\n        IF EXISTS (\n            SELECT 1 FROM momo_payment_requests\n            WHERE expense_split_id = p_expense_split_id\n            AND status = ''pending''\n        ) THEN\n            -- Return existing request\n            SELECT jsonb_build_object(\n                ''success'', true,\n                ''id'', id,\n                ''reference_code'', reference_code,\n                ''qr_url'', qr_url,\n                ''amount'', amount,\n                ''status'', status\n            ) INTO v_reference_code\n            FROM momo_payment_requests\n            WHERE expense_split_id = p_expense_split_id\n            AND status = ''pending''\n            LIMIT 1;\n\n            RETURN v_reference_code::JSONB;\n        END IF;\n\n        -- Generate unique reference code (FP-splitId-random)\n        v_reference_code := ''FP-'' || substring(p_expense_split_id::TEXT, 1, 8) || ''-'' || substring(gen_random_uuid()::TEXT, 1, 4);\n\n        -- Create payment request\n        INSERT INTO momo_payment_requests (\n            expense_split_id,\n            user_id,\n            receiver_phone,\n            amount,\n            reference_code\n        ) VALUES (\n            p_expense_split_id,\n            p_user_id,\n            p_receiver_phone,\n            p_amount,\n            v_reference_code\n        ) RETURNING id INTO v_payment_request_id;\n\n        RETURN jsonb_build_object(\n            ''success'', true,\n            ''id'', v_payment_request_id,\n            ''reference_code'', v_reference_code,\n            ''amount'', p_amount,\n            ''status'', ''pending''\n        );\n    END;\n    $func$ LANGUAGE plpgsql SECURITY DEFINER';\n  END IF;\nEND $$","-- 7. Insert default MoMo settings (can be updated by admin)\nINSERT INTO momo_settings (receiver_phone, receiver_name, enabled)\nVALUES ('0918399443', 'FairPay', TRUE)\nON CONFLICT DO NOTHING","-- 8. Grant necessary permissions\nGRANT SELECT ON momo_settings TO authenticated","GRANT ALL ON momo_payment_requests TO authenticated","-- Grant execute permissions on functions if they exist\nDO $$\nBEGIN\n  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'verify_momo_payment') THEN\n    GRANT EXECUTE ON FUNCTION verify_momo_payment TO authenticated;\n  END IF;\n  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_momo_payment_request') THEN\n    GRANT EXECUTE ON FUNCTION create_momo_payment_request TO authenticated;\n  END IF;\nEND $$","-- Enable realtime for payment requests (idempotent)\nDO $$\nBEGIN\n    IF NOT EXISTS (\n        SELECT 1 FROM pg_publication_tables\n        WHERE pubname = 'supabase_realtime'\n        AND tablename = 'momo_payment_requests'\n    ) THEN\n        ALTER PUBLICATION supabase_realtime ADD TABLE momo_payment_requests;\n    END IF;\nEND $$"}	momo_payment_integration
20260108120000	{"-- Migration: Create get_user_activities function\n-- Created: 2026-01-08\n-- Purpose: Create function to get user activities with proper error handling\n\n-- Drop existing function if it exists (with all possible signatures)\nDROP FUNCTION IF EXISTS get_user_activities(UUID)","DROP FUNCTION IF EXISTS get_user_activities(UUID, INTEGER)","-- Create function to get user activities\nCREATE OR REPLACE FUNCTION get_user_activities(\n  p_user_id UUID,\n  p_limit INTEGER DEFAULT 20\n)\nRETURNS TABLE (\n  id UUID,\n  type TEXT,\n  description TEXT,\n  total_amount NUMERIC,\n  user_share NUMERIC,\n  currency TEXT,\n  date TIMESTAMPTZ,\n  group_name TEXT,\n  paid_by_name TEXT,\n  is_lender BOOLEAN,\n  is_borrower BOOLEAN,\n  is_payment BOOLEAN\n)\nSECURITY DEFINER\nSET search_path = public, pg_temp\nLANGUAGE plpgsql\nSTABLE\nAS $$\nBEGIN\n  -- SECURITY DEFINER functions automatically bypass RLS\n  -- No need to disable RLS explicitly\n\n  RETURN QUERY\n  SELECT\n    e.id,\n    'expense'::TEXT as type,\n    e.description,\n    e.amount as total_amount,\n    es.computed_amount as user_share,\n    e.currency,\n    e.expense_date::TIMESTAMPTZ as date,\n    g.name as group_name,\n    paid_by.full_name as paid_by_name,\n    (e.paid_by_user_id = p_user_id) as is_lender,\n    (es.user_id = p_user_id AND e.paid_by_user_id != p_user_id) as is_borrower,\n    -- is_payment indicates if the split is settled\n    -- For lenders (payers): always false (they already paid when creating the expense)\n    -- For borrowers: true if settled, false if still owes (unpaid)\n    CASE\n      WHEN e.paid_by_user_id = p_user_id THEN false\n      ELSE COALESCE(es.is_settled, false)\n    END as is_payment\n  FROM expenses e\n  INNER JOIN expense_splits es ON e.id = es.expense_id AND es.user_id = p_user_id\n  LEFT JOIN groups g ON e.group_id = g.id\n  LEFT JOIN profiles paid_by ON e.paid_by_user_id = paid_by.id\n  WHERE COALESCE(e.is_payment, false) = false\n  ORDER BY e.expense_date DESC, e.created_at DESC\n  LIMIT p_limit;\nEND;\n$$","-- Grant execute permission\nGRANT EXECUTE ON FUNCTION get_user_activities(UUID, INTEGER) TO authenticated","GRANT EXECUTE ON FUNCTION get_user_activities(UUID, INTEGER) TO anon","-- Add comment\nCOMMENT ON FUNCTION get_user_activities(UUID, INTEGER) IS 'Get activities (expenses and splits) for a specific user with settlement status. Shows all expenses including unpaid ones.'"}	create_get_user_activities
20260108130000	{"-- Migration: Add get_user_activities function for profile activity display\n-- Created: 2026-01-08\n-- Purpose: Fix profile page to show correct activities for the specified user with proper settlement status\n-- Updated: 2026-01-08 - Fix to show all unpaid expenses correctly\n\n-- Drop existing function if it exists\nDROP FUNCTION IF EXISTS get_user_activities(UUID, INTEGER)","-- Create function to get user activities\nCREATE OR REPLACE FUNCTION get_user_activities(\n  p_user_id UUID,\n  p_limit INTEGER DEFAULT 20\n)\nRETURNS TABLE (\n  id UUID,\n  type TEXT,\n  description TEXT,\n  total_amount NUMERIC,\n  user_share NUMERIC,\n  currency TEXT,\n  date TIMESTAMPTZ,\n  group_name TEXT,\n  paid_by_name TEXT,\n  is_lender BOOLEAN,\n  is_borrower BOOLEAN,\n  is_payment BOOLEAN\n)\nSECURITY DEFINER\nSET search_path = public, pg_temp\nLANGUAGE plpgsql\nAS $$\nBEGIN\n  -- Temporarily disable RLS to ensure we can access all expenses the user should see\n  SET LOCAL row_security = off;\n\n  RETURN QUERY\n  SELECT\n    e.id,\n    'expense'::TEXT as type,\n    e.description,\n    e.amount as total_amount,\n    es.computed_amount as user_share,\n    e.currency,\n    e.expense_date::TIMESTAMPTZ as date,\n    g.name as group_name,\n    paid_by.full_name as paid_by_name,\n    (e.paid_by_user_id = p_user_id) as is_lender,\n    (es.user_id = p_user_id AND e.paid_by_user_id != p_user_id) as is_borrower,\n    -- is_payment should indicate if the split is settled (user has paid their share)\n    -- For lenders (payers): always false (they already paid when creating the expense)\n    -- For borrowers: true if settled, false if still owes (unpaid)\n    CASE\n      WHEN e.paid_by_user_id = p_user_id THEN false  -- Lender already paid\n      ELSE COALESCE(es.is_settled, false)  -- Borrower: show settlement status (default to false/unpaid if NULL)\n    END as is_payment\n  FROM expenses e\n  INNER JOIN expense_splits es ON e.id = es.expense_id AND es.user_id = p_user_id\n  LEFT JOIN groups g ON e.group_id = g.id\n  LEFT JOIN profiles paid_by ON e.paid_by_user_id = paid_by.id\n  WHERE\n    -- Only show expense records, not payment records\n    COALESCE(e.is_payment, false) = false\n  ORDER BY e.expense_date DESC, e.created_at DESC\n  LIMIT p_limit;\nEND;\n$$","-- Grant execute permission to authenticated users\nGRANT EXECUTE ON FUNCTION get_user_activities(UUID, INTEGER) TO authenticated","-- Add comment\nCOMMENT ON FUNCTION get_user_activities IS 'Get activities (expenses and splits) for a specific user with settlement status'"}	get_user_activities_function
20260108140000	{"-- Migration: Fix get_user_activities to show all unpaid expenses\n-- Created: 2026-01-08\n-- Purpose: Ensure function bypasses RLS and shows all expenses including unpaid ones\n\n-- Drop and recreate function with RLS bypass\nDROP FUNCTION IF EXISTS get_user_activities(UUID, INTEGER)","CREATE OR REPLACE FUNCTION get_user_activities(\n  p_user_id UUID,\n  p_limit INTEGER DEFAULT 20\n)\nRETURNS TABLE (\n  id UUID,\n  type TEXT,\n  description TEXT,\n  total_amount NUMERIC,\n  user_share NUMERIC,\n  currency TEXT,\n  date TIMESTAMPTZ,\n  group_name TEXT,\n  paid_by_name TEXT,\n  is_lender BOOLEAN,\n  is_borrower BOOLEAN,\n  is_payment BOOLEAN\n)\nSECURITY DEFINER\nSET search_path = public, pg_temp\nLANGUAGE plpgsql\nAS $$\nBEGIN\n  -- Temporarily disable RLS to ensure we can access all expenses the user should see\n  SET LOCAL row_security = off;\n\n  RETURN QUERY\n  SELECT\n    e.id,\n    'expense'::TEXT as type,\n    e.description,\n    e.amount as total_amount,\n    es.computed_amount as user_share,\n    e.currency,\n    e.expense_date::TIMESTAMPTZ as date,\n    g.name as group_name,\n    paid_by.full_name as paid_by_name,\n    (e.paid_by_user_id = p_user_id) as is_lender,\n    (es.user_id = p_user_id AND e.paid_by_user_id != p_user_id) as is_borrower,\n    -- is_payment should indicate if the split is settled (user has paid their share)\n    -- For lenders (payers): always false (they already paid when creating the expense)\n    -- For borrowers: true if settled, false if still owes (unpaid)\n    CASE\n      WHEN e.paid_by_user_id = p_user_id THEN false  -- Lender already paid\n      ELSE COALESCE(es.is_settled, false)  -- Borrower: show settlement status (default to false/unpaid if NULL)\n    END as is_payment\n  FROM expenses e\n  INNER JOIN expense_splits es ON e.id = es.expense_id AND es.user_id = p_user_id\n  LEFT JOIN groups g ON e.group_id = g.id\n  LEFT JOIN profiles paid_by ON e.paid_by_user_id = paid_by.id\n  WHERE\n    -- Only show expense records, not payment records\n    COALESCE(e.is_payment, false) = false\n  ORDER BY e.expense_date DESC, e.created_at DESC\n  LIMIT p_limit;\nEND;\n$$","-- Grant execute permission to authenticated users\nGRANT EXECUTE ON FUNCTION get_user_activities(UUID, INTEGER) TO authenticated","-- Add comment\nCOMMENT ON FUNCTION get_user_activities IS 'Get activities (expenses and splits) for a specific user with settlement status. Shows all expenses including unpaid ones.'"}	fix_get_user_activities_unpaid
20260108150000	{"-- Fix infinite recursion in RLS policies for momo_settings and momo_webhook_logs\n-- The policies were directly querying user_roles table, which caused infinite recursion\n-- Solution: Use is_admin() function which is SECURITY DEFINER and bypasses RLS\n\nDO $$\nBEGIN\n  -- Fix momo_settings update policy (only if table exists)\n  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'momo_settings') THEN\n    DROP POLICY IF EXISTS \\"momo_settings_update_policy\\" ON momo_settings;\n    CREATE POLICY \\"momo_settings_update_policy\\" ON momo_settings\n        FOR UPDATE TO authenticated\n        USING (is_admin())\n        WITH CHECK (is_admin());\n\n    -- Add INSERT policy for admins (needed when no settings exist)\n    DROP POLICY IF EXISTS \\"momo_settings_insert_policy\\" ON momo_settings;\n    CREATE POLICY \\"momo_settings_insert_policy\\" ON momo_settings\n        FOR INSERT TO authenticated\n        WITH CHECK (is_admin());\n  END IF;\n\n  -- Fix momo_webhook_logs admin-only policy (only if table exists)\n  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'momo_webhook_logs') THEN\n    DROP POLICY IF EXISTS \\"momo_webhook_logs_admin_only\\" ON momo_webhook_logs;\n    CREATE POLICY \\"momo_webhook_logs_admin_only\\" ON momo_webhook_logs\n        FOR ALL TO authenticated\n        USING (is_admin());\n  END IF;\nEND $$"}	fix_momo_settings_rls_recursion
20260108190000	{"-- Fix infinite recursion in MoMo settings RLS policies\n-- The policies were directly querying user_roles which has its own RLS policy,\n-- causing infinite recursion. Use is_admin() function instead which is SECURITY DEFINER\n-- and can bypass RLS.\n\nBEGIN","-- Only apply fixes if tables exist\nDO $$\nBEGIN\n  -- Fix momo_settings update policy (only if table exists)\n  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'momo_settings') THEN\n    DROP POLICY IF EXISTS \\"momo_settings_update_policy\\" ON momo_settings;\n    CREATE POLICY \\"momo_settings_update_policy\\" ON momo_settings\n        FOR UPDATE TO authenticated\n        USING (is_admin());\n  END IF;\n\n  -- Fix momo_webhook_logs admin-only policy (only if table exists)\n  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'momo_webhook_logs') THEN\n    DROP POLICY IF EXISTS \\"momo_webhook_logs_admin_only\\" ON momo_webhook_logs;\n    CREATE POLICY \\"momo_webhook_logs_admin_only\\" ON momo_webhook_logs\n        FOR ALL TO authenticated\n        USING (is_admin());\n  END IF;\nEND $$",COMMIT}	fix_momo_rls_recursion
20260109100000	{"-- Add currency to debt aggregation functions\n-- Updated to work with existing function names in production\n\n-- Drop existing functions first to avoid conflicts\nDROP FUNCTION IF EXISTS get_user_debts_aggregated(UUID)","DROP FUNCTION IF EXISTS get_user_debts_history(UUID)","DROP FUNCTION IF EXISTS get_public_demo_debts()","-- Also drop any new function names if they exist\nDROP FUNCTION IF EXISTS get_user_balances(UUID)","DROP FUNCTION IF EXISTS get_user_balances_with_history(UUID)","-- Create updated function to get user balances with currency\nCREATE OR REPLACE FUNCTION get_user_balances(p_user_id UUID)\nRETURNS TABLE (\n    counterparty_id UUID,\n    counterparty_name TEXT,\n    amount NUMERIC,\n    currency TEXT,\n    i_owe_them BOOLEAN\n) AS $$\nBEGIN\n    RETURN QUERY\n    WITH expense_balances AS (\n        -- Get balances from expenses where user is involved\n        SELECT\n            CASE\n                WHEN es.user_id = p_user_id THEN e.paid_by_user_id\n                ELSE es.user_id\n            END AS balance_counterparty_id,\n            e.currency AS balance_currency,\n            CASE\n                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN es.computed_amount\n                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN -es.computed_amount\n                ELSE 0\n            END AS balance_amount\n        FROM expense_splits es\n        JOIN expenses e ON es.expense_id = e.id\n        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)\n            AND NOT e.is_payment\n            AND NOT es.is_settled\n    ),\n    payment_balances AS (\n        -- Get balances from payments\n        SELECT\n            CASE\n                WHEN pay.from_user = p_user_id THEN pay.to_user\n                ELSE pay.from_user\n            END AS balance_counterparty_id,\n            pay.currency AS balance_currency,\n            CASE\n                WHEN pay.from_user = p_user_id THEN pay.amount\n                ELSE -pay.amount\n            END AS balance_amount\n        FROM payments pay\n        WHERE (pay.from_user = p_user_id OR pay.to_user = p_user_id)\n    ),\n    all_balances AS (\n        SELECT balance_counterparty_id, balance_currency, balance_amount FROM expense_balances\n        UNION ALL\n        SELECT balance_counterparty_id, balance_currency, balance_amount FROM payment_balances\n    ),\n    aggregated AS (\n        SELECT\n            ab.balance_counterparty_id,\n            ab.balance_currency,\n            SUM(ab.balance_amount) AS net_amount\n        FROM all_balances ab\n        WHERE ab.balance_counterparty_id != p_user_id\n        GROUP BY ab.balance_counterparty_id, ab.balance_currency\n        HAVING SUM(ab.balance_amount) != 0\n    )\n    SELECT\n        a.balance_counterparty_id AS counterparty_id,\n        p.full_name AS counterparty_name,\n        ABS(a.net_amount) AS amount,\n        a.balance_currency AS currency,\n        a.net_amount > 0 AS i_owe_them\n    FROM aggregated a\n    JOIN profiles p ON a.balance_counterparty_id = p.id\n    ORDER BY a.balance_currency, ABS(a.net_amount) DESC;\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER","-- Create updated function to get user balances with history including currency\nCREATE OR REPLACE FUNCTION get_user_balances_with_history(p_user_id UUID)\nRETURNS TABLE (\n    counterparty_id UUID,\n    counterparty_name TEXT,\n    amount NUMERIC,\n    currency TEXT,\n    i_owe_them BOOLEAN,\n    total_amount NUMERIC,\n    settled_amount NUMERIC,\n    remaining_amount NUMERIC,\n    transaction_count INTEGER,\n    last_transaction_date TIMESTAMPTZ\n) AS $$\nBEGIN\n    RETURN QUERY\n    WITH all_transactions AS (\n        -- Get all expense transactions\n        SELECT\n            CASE\n                WHEN es.user_id = p_user_id THEN e.paid_by_user_id\n                ELSE es.user_id\n            END AS counterparty_id,\n            e.currency,\n            CASE\n                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN es.computed_amount\n                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN -es.computed_amount\n                ELSE 0\n            END AS amount,\n            es.is_settled,\n            e.created_at\n        FROM expense_splits es\n        JOIN expenses e ON es.expense_id = e.id\n        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)\n            AND NOT e.is_payment\n\n        UNION ALL\n\n        -- Get all payment transactions\n        SELECT\n            CASE\n                WHEN p.from_user = p_user_id THEN p.to_user\n                ELSE p.from_user\n            END AS counterparty_id,\n            p.currency,\n            CASE\n                WHEN p.from_user = p_user_id THEN p.amount\n                ELSE -p.amount\n            END AS amount,\n            TRUE AS is_settled,\n            p.created_at\n        FROM payments p\n        WHERE (p.from_user = p_user_id OR p.to_user = p_user_id)\n    ),\n    aggregated AS (\n        SELECT\n            at.counterparty_id,\n            at.currency,\n            SUM(CASE WHEN NOT at.is_settled THEN at.amount ELSE 0 END) AS current_balance,\n            SUM(ABS(at.amount)) AS total_amount,\n            SUM(CASE WHEN at.is_settled THEN ABS(at.amount) ELSE 0 END) AS settled_amount,\n            COUNT(*) AS transaction_count,\n            MAX(at.created_at) AS last_transaction_date\n        FROM all_transactions at\n        WHERE at.counterparty_id != p_user_id\n        GROUP BY at.counterparty_id, at.currency\n    )\n    SELECT\n        a.counterparty_id,\n        p.full_name AS counterparty_name,\n        ABS(a.current_balance) AS amount,\n        a.currency,\n        a.current_balance > 0 AS i_owe_them,\n        a.total_amount,\n        a.settled_amount,\n        ABS(a.current_balance) AS remaining_amount,\n        a.transaction_count::INTEGER,\n        a.last_transaction_date\n    FROM aggregated a\n    JOIN profiles p ON a.counterparty_id = p.id\n    ORDER BY a.currency, a.last_transaction_date DESC;\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER","-- Create updated function for aggregated debts with currency\n\n-- Create updated function for debt history with currency\nCREATE OR REPLACE FUNCTION get_user_debts_history(p_user_id UUID)\nRETURNS TABLE (\n    counterparty_id UUID,\n    counterparty_name TEXT,\n    amount NUMERIC,\n    currency TEXT,\n    i_owe_them BOOLEAN,\n    total_amount NUMERIC,\n    settled_amount NUMERIC,\n    remaining_amount NUMERIC,\n    transaction_count INTEGER,\n    last_transaction_date TIMESTAMPTZ\n) AS $$\nBEGIN\n    RETURN QUERY\n    SELECT * FROM get_user_balances_with_history(p_user_id);\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER","-- Create updated function for public demo debts with currency\nCREATE OR REPLACE FUNCTION get_public_demo_debts()\nRETURNS TABLE (\n    counterparty_id UUID,\n    counterparty_name TEXT,\n    amount NUMERIC,\n    currency TEXT,\n    i_owe_them BOOLEAN,\n    owed_to_name TEXT,\n    owed_to_id UUID\n) AS $$\nBEGIN\n    RETURN QUERY\n    SELECT\n        '00000000-0000-0000-0000-000000000001'::UUID AS counterparty_id,\n        'Alice Johnson' AS counterparty_name,\n        150.00 AS amount,\n        'USD' AS currency,\n        FALSE AS i_owe_them,\n        'Demo User' AS owed_to_name,\n        '00000000-0000-0000-0000-000000000000'::UUID AS owed_to_id\n    UNION ALL\n    SELECT\n        '00000000-0000-0000-0000-000000000002'::UUID,\n        'Bob Smith',\n        75.50,\n        'USD',\n        TRUE,\n        'Demo User',\n        '00000000-0000-0000-0000-000000000000'::UUID\n    UNION ALL\n    SELECT\n        '00000000-0000-0000-0000-000000000003'::UUID,\n        'Charlie Brown',\n        200.00,\n        'EUR',\n        FALSE,\n        'Demo User',\n        '00000000-0000-0000-0000-000000000000'::UUID\n    UNION ALL\n    SELECT\n        '00000000-0000-0000-0000-000000000004'::UUID,\n        'Diana Prince',\n        50.00,\n        'GBP',\n        TRUE,\n        'Demo User',\n        '00000000-0000-0000-0000-000000000000'::UUID\n    UNION ALL\n    SELECT\n        '00000000-0000-0000-0000-000000000005'::UUID,\n        'Eve Wilson',\n        120000.00,\n        'VND',\n        TRUE,\n        'Demo User',\n        '00000000-0000-0000-0000-000000000000'::UUID;\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER","-- Create the get_user_debts_aggregated function that the frontend expects\nCREATE OR REPLACE FUNCTION get_user_debts_aggregated(p_user_id UUID)\nRETURNS TABLE (\n    counterparty_id UUID,\n    counterparty_name TEXT,\n    amount NUMERIC,\n    currency TEXT,\n    i_owe_them BOOLEAN\n) AS $$\nBEGIN\n    RETURN QUERY\n    SELECT * FROM get_user_balances(p_user_id);\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER","-- Grant execute permissions\nGRANT EXECUTE ON FUNCTION get_user_balances(UUID) TO authenticated","GRANT EXECUTE ON FUNCTION get_user_balances_with_history(UUID) TO authenticated","GRANT EXECUTE ON FUNCTION get_user_debts_aggregated(UUID) TO authenticated","GRANT EXECUTE ON FUNCTION get_user_debts_history(UUID) TO authenticated","GRANT EXECUTE ON FUNCTION get_public_demo_debts() TO anon, authenticated"}	add_currency_to_debt_functions
20260109110000	{"-- Migration: Add comment field to expenses table\n-- Date: 2026-01-09\n-- Purpose: Allow users to add optional comments/notes to expenses for additional context\n\nDO $$\nBEGIN\n  -- Only add column if expenses table exists\n  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN\n    -- Add comment column to expenses table\n    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS comment TEXT NULL;\n\n    -- Create index for better query performance when filtering by comment existence\n    CREATE INDEX IF NOT EXISTS idx_expenses_comment_exists ON expenses(id) WHERE comment IS NOT NULL;\n\n    -- Add comment\n    COMMENT ON COLUMN expenses.comment IS 'Optional comment/note field for additional expense details and context';\n  END IF;\nEND $$"}	add_expense_comments
20260109120000	{"-- Migration: Fix get_user_activities to support pagination with offset\n-- Created: 2026-01-09\n-- Purpose: Add p_offset parameter for proper pagination in profile activity display\n\n-- Drop existing function\nDROP FUNCTION IF EXISTS get_user_activities(UUID, INTEGER)","DROP FUNCTION IF EXISTS get_user_activities(UUID, INTEGER, INTEGER)","-- Create updated function with offset support\nCREATE OR REPLACE FUNCTION get_user_activities(\n  p_user_id UUID,\n  p_limit INTEGER DEFAULT 10,\n  p_offset INTEGER DEFAULT 0\n)\nRETURNS TABLE (\n  id UUID,\n  type TEXT,\n  description TEXT,\n  total_amount NUMERIC,\n  user_share NUMERIC,\n  currency TEXT,\n  date TIMESTAMPTZ,\n  group_name TEXT,\n  paid_by_name TEXT,\n  is_lender BOOLEAN,\n  is_borrower BOOLEAN,\n  is_payment BOOLEAN\n)\nSECURITY DEFINER\nSET search_path = public, pg_temp\nLANGUAGE plpgsql\nAS $$\nBEGIN\n  -- Temporarily disable RLS to ensure we can access all expenses the user should see\n  SET LOCAL row_security = off;\n\n  RETURN QUERY\n  SELECT\n    e.id,\n    'expense'::TEXT as type,\n    e.description,\n    e.amount as total_amount,\n    es.computed_amount as user_share,\n    e.currency,\n    e.expense_date::TIMESTAMPTZ as date,\n    g.name as group_name,\n    paid_by.full_name as paid_by_name,\n    (e.paid_by_user_id = p_user_id) as is_lender,\n    (es.user_id = p_user_id AND e.paid_by_user_id != p_user_id) as is_borrower,\n    -- is_payment should indicate if the split is settled (user has paid their share)\n    -- For lenders (payers): always false (they already paid when creating the expense)\n    -- For borrowers: true if settled, false if still owes (unpaid)\n    CASE\n      WHEN e.paid_by_user_id = p_user_id THEN false  -- Lender already paid\n      ELSE COALESCE(es.is_settled, false)  -- Borrower: show settlement status (default to false/unpaid if NULL)\n    END as is_payment\n  FROM expenses e\n  INNER JOIN expense_splits es ON e.id = es.expense_id AND es.user_id = p_user_id\n  LEFT JOIN groups g ON e.group_id = g.id\n  LEFT JOIN profiles paid_by ON e.paid_by_user_id = paid_by.id\n  WHERE\n    -- Only show expense records, not payment records\n    COALESCE(e.is_payment, false) = false\n  ORDER BY e.expense_date DESC, e.created_at DESC\n  LIMIT p_limit\n  OFFSET p_offset;\nEND;\n$$","-- Grant execute permission to authenticated users\nGRANT EXECUTE ON FUNCTION get_user_activities(UUID, INTEGER, INTEGER) TO authenticated","-- Add comment\nCOMMENT ON FUNCTION get_user_activities IS 'Get activities (expenses and splits) for a specific user with settlement status and pagination support.'"}	fix_user_activities_pagination
20260109130000	{"-- Migration: Update existing debt functions to include currency\n-- Created: 2026-01-09\n-- Purpose: Add currency field to existing debt aggregation functions\n-- IMPORTANT: Restores original logic using user_debts_summary view to maintain\n-- correct settlement filtering (partial settlements, future expenses exclusion)\n\n-- Drop and recreate get_user_debts_aggregated with currency support\nDROP FUNCTION IF EXISTS get_user_debts_aggregated(UUID)","CREATE OR REPLACE FUNCTION get_user_debts_aggregated(p_user_id UUID)\nRETURNS TABLE (\n    counterparty_id UUID,\n    counterparty_name TEXT,\n    amount NUMERIC,\n    currency TEXT,\n    i_owe_them BOOLEAN\n)\nSECURITY DEFINER\nSET search_path = public, pg_temp\nLANGUAGE plpgsql\nAS $$\nBEGIN\n    RETURN QUERY\n    WITH expense_debts AS (\n        -- Use same logic as user_debts_summary view but group by currency\n        SELECT\n            CASE\n                WHEN es.user_id = p_user_id THEN e.paid_by_user_id\n                ELSE es.user_id\n            END as counterparty_id,\n            COALESCE(e.currency, 'USD') as currency,\n            SUM(\n                CASE\n                    WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN\n                        CASE\n                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0\n                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount\n                            ELSE es.computed_amount\n                        END\n                    WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN\n                        -CASE\n                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0\n                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount\n                            ELSE es.computed_amount\n                        END\n                    ELSE 0\n                END\n            ) as net_amount\n        FROM expense_splits es\n        JOIN expenses e ON es.expense_id = e.id\n        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)\n            AND NOT e.is_payment\n            AND es.user_id != e.paid_by_user_id\n            AND e.expense_date <= CURRENT_DATE  -- Exclude future expenses\n            AND (\n                (es.is_settled = false) OR\n                (es.is_settled = true AND es.settled_amount < es.computed_amount)\n            )\n        GROUP BY\n            CASE\n                WHEN es.user_id = p_user_id THEN e.paid_by_user_id\n                ELSE es.user_id\n            END,\n            COALESCE(e.currency, 'USD')\n        HAVING SUM(\n            CASE\n                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN\n                    CASE\n                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0\n                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount\n                        ELSE es.computed_amount\n                    END\n                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN\n                    CASE\n                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0\n                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount\n                        ELSE es.computed_amount\n                    END\n                ELSE 0\n            END\n        ) != 0\n    ),\n    -- Note: Payments are settlement transactions, not outstanding debts\n    -- They should NOT be included in get_user_debts_aggregated\n    -- Payments reduce debts but are not debts themselves\n    all_debts AS (\n        SELECT ed.counterparty_id, ed.currency, ed.net_amount FROM expense_debts ed\n    ),\n    aggregated AS (\n        SELECT\n            ad.counterparty_id,\n            ad.currency,\n            SUM(ad.net_amount) AS net_amount\n        FROM all_debts ad\n        WHERE ad.counterparty_id IS DISTINCT FROM p_user_id\n        GROUP BY ad.counterparty_id, ad.currency\n        HAVING SUM(ad.net_amount) != 0\n    )\n    SELECT\n        agg.counterparty_id,\n        p.full_name AS counterparty_name,\n        ABS(agg.net_amount) AS amount,\n        agg.currency,\n        (agg.net_amount > 0) AS i_owe_them\n    FROM aggregated agg\n    JOIN profiles p ON p.id = agg.counterparty_id\n    ORDER BY agg.currency, ABS(agg.net_amount) DESC;\nEND;\n$$","-- Drop and recreate get_user_debts_history with currency support\nDROP FUNCTION IF EXISTS get_user_debts_history(UUID)","CREATE OR REPLACE FUNCTION get_user_debts_history(p_user_id UUID)\nRETURNS TABLE (\n    counterparty_id UUID,\n    counterparty_name TEXT,\n    amount NUMERIC,\n    currency TEXT,\n    i_owe_them BOOLEAN,\n    total_amount NUMERIC,\n    settled_amount NUMERIC,\n    remaining_amount NUMERIC,\n    transaction_count INTEGER,\n    last_transaction_date TIMESTAMPTZ\n)\nSECURITY DEFINER\nSET search_path = public, pg_temp\nLANGUAGE plpgsql\nAS $$\nBEGIN\n    RETURN QUERY\n    WITH expense_history AS (\n        -- Use same logic as user_debts_history view but group by currency\n        SELECT\n            es.user_id as owes_user,\n            e.paid_by_user_id as owed_user,\n            COALESCE(e.currency, 'USD') as currency,\n            SUM(es.computed_amount) as total_amount,\n            SUM(COALESCE(es.settled_amount, 0)) as settled_amount,\n            SUM(\n                CASE\n                    WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0\n                    WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount\n                    ELSE es.computed_amount\n                END\n            ) as remaining_amount,\n            COUNT(DISTINCT e.id) as transaction_count,\n            MAX(e.expense_date) as last_transaction_date\n        FROM expense_splits es\n        JOIN expenses e ON es.expense_id = e.id\n        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)\n            AND NOT e.is_payment\n            AND es.user_id != e.paid_by_user_id\n            AND e.expense_date <= CURRENT_DATE  -- Exclude future expenses\n        GROUP BY es.user_id, e.paid_by_user_id, COALESCE(e.currency, 'USD')\n        HAVING SUM(es.computed_amount) > 0\n    ),\n    payment_history AS (\n        -- Get payment transactions\n        SELECT\n            p.from_user as owes_user,\n            p.to_user as owed_user,\n            COALESCE(p.currency, 'USD') as currency,\n            SUM(p.amount) as total_amount,\n            SUM(p.amount) as settled_amount,  -- Payments are always settled\n            0 as remaining_amount,\n            COUNT(*) as transaction_count,\n            MAX(p.payment_date) as last_transaction_date\n        FROM payments p\n        WHERE (p.from_user = p_user_id OR p.to_user = p_user_id)\n        GROUP BY p.from_user, p.to_user, COALESCE(p.currency, 'USD')\n    ),\n    all_history AS (\n        SELECT\n            eh.owes_user,\n            eh.owed_user,\n            eh.currency,\n            eh.total_amount,\n            eh.settled_amount,\n            eh.remaining_amount,\n            eh.transaction_count,\n            eh.last_transaction_date::TIMESTAMPTZ as last_transaction_date\n        FROM expense_history eh\n        UNION ALL\n        SELECT\n            ph.owes_user,\n            ph.owed_user,\n            ph.currency,\n            ph.total_amount,\n            ph.settled_amount,\n            ph.remaining_amount,\n            ph.transaction_count,\n            ph.last_transaction_date::TIMESTAMPTZ\n        FROM payment_history ph\n    ),\n    debt_calculations AS (\n        SELECT\n            CASE\n                WHEN ah.owes_user = p_user_id THEN ah.owed_user\n                WHEN ah.owed_user = p_user_id THEN ah.owes_user\n                ELSE NULL\n            END as other_user_id,\n            ah.currency,\n            CASE\n                WHEN ah.owes_user = p_user_id THEN ah.total_amount\n                WHEN ah.owed_user = p_user_id THEN -ah.total_amount\n                ELSE 0\n            END as signed_total_amount,\n            CASE\n                WHEN ah.owes_user = p_user_id THEN ah.settled_amount\n                WHEN ah.owed_user = p_user_id THEN -ah.settled_amount\n                ELSE 0\n            END as signed_settled_amount,\n            CASE\n                WHEN ah.owes_user = p_user_id THEN ah.remaining_amount\n                WHEN ah.owed_user = p_user_id THEN -ah.remaining_amount\n                ELSE 0\n            END as signed_remaining_amount,\n            ah.transaction_count,\n            ah.last_transaction_date\n        FROM all_history ah\n        WHERE (ah.owes_user = p_user_id OR ah.owed_user = p_user_id)\n    ),\n    aggregated AS (\n        SELECT\n            dc.other_user_id as counterparty_id,\n            dc.currency,\n            SUM(ABS(dc.signed_total_amount)) as total_amount,\n            SUM(ABS(dc.signed_settled_amount)) as settled_amount,\n            SUM(ABS(dc.signed_remaining_amount)) as remaining_amount,\n            SUM(dc.transaction_count)::INTEGER as transaction_count,\n            MAX(dc.last_transaction_date) as last_transaction_date,\n            SUM(dc.signed_remaining_amount) as net_remaining_amount\n        FROM debt_calculations dc\n        WHERE dc.other_user_id IS NOT NULL\n        GROUP BY dc.other_user_id, dc.currency\n    )\n    SELECT\n        agg.counterparty_id,\n        p.full_name AS counterparty_name,\n        ABS(agg.net_remaining_amount) AS amount,\n        agg.currency,\n        (agg.net_remaining_amount > 0) AS i_owe_them,\n        agg.total_amount,\n        agg.settled_amount,\n        ABS(agg.net_remaining_amount) AS remaining_amount,\n        agg.transaction_count,\n        agg.last_transaction_date\n    FROM aggregated agg\n    JOIN profiles p ON p.id = agg.counterparty_id\n    ORDER BY\n        agg.currency,\n        CASE WHEN agg.net_remaining_amount != 0 THEN 0 ELSE 1 END,\n        ABS(agg.net_remaining_amount) DESC,\n        agg.last_transaction_date DESC NULLS LAST;\nEND;\n$$","-- Grant execute permissions\nGRANT EXECUTE ON FUNCTION get_user_debts_aggregated(UUID) TO authenticated","GRANT EXECUTE ON FUNCTION get_user_debts_history(UUID) TO authenticated"}	update_debt_functions_currency
20260109140000	{"-- Migration: Update get_user_activities to include involvement information\n-- Created: 2026-01-09\n-- Purpose: Add privacy controls and involvement flags to activities\n\nDROP FUNCTION IF EXISTS get_user_activities(UUID, INTEGER, INTEGER)","CREATE OR REPLACE FUNCTION get_user_activities(\n    p_user_id UUID,\n    p_limit INTEGER DEFAULT 10,\n    p_offset INTEGER DEFAULT 0\n)\nRETURNS TABLE (\n    id UUID,\n    type TEXT,\n    description TEXT,\n    total_amount NUMERIC,\n    user_share NUMERIC,\n    currency TEXT,\n    date TIMESTAMPTZ,\n    group_name TEXT,\n    group_id UUID,\n    paid_by_user_id UUID,\n    paid_by_name TEXT,\n    is_lender BOOLEAN,\n    is_borrower BOOLEAN,\n    is_payment BOOLEAN,\n    is_involved BOOLEAN, -- New field to indicate if user is directly involved\n    created_at TIMESTAMPTZ\n) AS $$\nBEGIN\n    RETURN QUERY\n    WITH activities AS (\n        -- Get expense activities\n        SELECT\n            e.id,\n            'expense'::TEXT AS type,\n            e.description AS description,\n            e.amount AS total_amount,\n            es.computed_amount AS user_share,\n            COALESCE(e.currency, 'USD') AS currency,\n            e.expense_date::TIMESTAMPTZ AS date,\n            g.name AS group_name,\n            g.id AS group_id,\n            e.paid_by_user_id,\n            p.full_name AS paid_by_name,\n            e.paid_by_user_id = p_user_id AS is_lender,\n            es.user_id = p_user_id AND e.paid_by_user_id != p_user_id AS is_borrower,\n            FALSE AS is_payment,\n            -- User is involved if they are the payer or a split participant\n            (e.paid_by_user_id = p_user_id OR es.user_id = p_user_id) AS is_involved,\n            e.created_at\n        FROM expenses e\n        LEFT JOIN expense_splits es ON es.expense_id = e.id\n        LEFT JOIN groups g ON e.group_id = g.id\n        LEFT JOIN profiles p ON e.paid_by_user_id = p.id\n        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)\n            AND NOT e.is_payment\n            AND e.expense_date <= CURRENT_DATE -- Filter out future dates\n\n        UNION ALL\n\n        -- Get payment activities\n        SELECT\n            pay.id,\n            'payment'::TEXT AS type,\n            COALESCE(pay.note,\n                CASE\n                    WHEN pay.from_user = p_user_id\n                    THEN 'Payment to ' || p_to.full_name\n                    ELSE 'Payment from ' || p_from.full_name\n                END) AS description,\n            pay.amount AS total_amount,\n            pay.amount AS user_share,\n            COALESCE(pay.currency, 'USD') AS currency,\n            pay.payment_date::TIMESTAMPTZ AS date,\n            g.name AS group_name,\n            g.id AS group_id,\n            pay.from_user AS paid_by_user_id,\n            p_from.full_name AS paid_by_name,\n            pay.to_user = p_user_id AS is_lender,\n            pay.from_user = p_user_id AS is_borrower,\n            TRUE AS is_payment,\n            -- User is involved if they are the sender or receiver\n            (pay.from_user = p_user_id OR pay.to_user = p_user_id) AS is_involved,\n            pay.created_at\n        FROM payments pay\n        LEFT JOIN groups g ON pay.group_id = g.id\n        LEFT JOIN profiles p_from ON pay.from_user = p_from.id\n        LEFT JOIN profiles p_to ON pay.to_user = p_to.id\n        WHERE (pay.from_user = p_user_id OR pay.to_user = p_user_id)\n            AND pay.payment_date <= CURRENT_DATE -- Filter out future dates\n    )\n    SELECT\n        a.id,\n        a.type,\n        a.description,\n        a.total_amount,\n        a.user_share,\n        a.currency,\n        a.date,\n        a.group_name,\n        a.group_id,\n        a.paid_by_user_id,\n        a.paid_by_name,\n        a.is_lender,\n        a.is_borrower,\n        a.is_payment,\n        a.is_involved,\n        a.created_at\n    FROM activities a\n    ORDER BY a.date DESC, a.created_at DESC\n    LIMIT p_limit\n    OFFSET p_offset;\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER","-- Grant execute permission\nGRANT EXECUTE ON FUNCTION get_user_activities(UUID, INTEGER, INTEGER) TO authenticated"}	update_user_activities_privacy
20260110000000	{"-- Migration: Fix SQL Function Errors - Comprehensive Solution\n-- Created: 2026-01-10\n-- Purpose: Fix ambiguous column references and type mismatches in SQL functions\n--\n-- Root Causes:\n-- 1. get_balance_history: Ambiguous column reference \\"snapshot_date\\" - PostgreSQL confuses\n--    between RETURN TABLE column names and query column names\n-- 2. get_top_categories: Type mismatch - expense_category ENUM returned as TEXT without cast\n--\n-- Solution Pattern:\n-- - All RETURN TABLE functions must use explicit column aliases in SELECT\n-- - All functions must set explicit search_path to prevent schema conflicts\n-- - ENUM types must be explicitly cast to TEXT when returning as TEXT\n\n-- =============================================\n-- 1. Fix get_balance_history function\n-- =============================================\n-- Issue: Ambiguous column reference \\"snapshot_date\\"\n-- Fix: Add explicit column aliases and SET search_path\n\nCREATE OR REPLACE FUNCTION get_balance_history(\n    p_user_id UUID DEFAULT NULL,\n    p_start_date DATE DEFAULT (CURRENT_DATE - '30 days'::interval),\n    p_end_date DATE DEFAULT CURRENT_DATE,\n    p_currency TEXT DEFAULT 'VND'\n)\nRETURNS TABLE(\n    snapshot_date DATE,\n    total_owed NUMERIC,\n    total_lent NUMERIC,\n    net_balance NUMERIC,\n    currency TEXT\n)\nSECURITY DEFINER\nSET search_path = public, pg_temp\nLANGUAGE plpgsql\nAS $$\nDECLARE\n  v_user_id UUID;\n  v_date DATE;\nBEGIN\n  -- Use provided user_id or default to current user\n  v_user_id := COALESCE(p_user_id, auth.uid());\n\n  -- Ensure balance history exists for date range\n  -- Calculate missing snapshots on-demand\n  FOR v_date IN\n    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE\n  LOOP\n    -- Check if snapshot exists (use explicit table alias to avoid ambiguity)\n    IF NOT EXISTS (\n      SELECT 1 FROM balance_history bh_check\n      WHERE bh_check.user_id = v_user_id\n        AND bh_check.snapshot_date = v_date\n        AND bh_check.currency = p_currency\n    ) THEN\n      -- Calculate and store snapshot\n      PERFORM calculate_daily_balance(v_user_id, v_date, p_currency);\n    END IF;\n  END LOOP;\n\n  -- Return balance history with explicit column aliases matching RETURN TABLE\n  RETURN QUERY\n  SELECT\n    bh.snapshot_date AS snapshot_date,\n    bh.total_owed AS total_owed,\n    bh.total_lent AS total_lent,\n    bh.net_balance AS net_balance,\n    bh.currency AS currency\n  FROM balance_history bh\n  WHERE bh.user_id = v_user_id\n    AND bh.snapshot_date BETWEEN p_start_date AND p_end_date\n    AND bh.currency = p_currency\n  ORDER BY bh.snapshot_date ASC;\nEND;\n$$","COMMENT ON FUNCTION get_balance_history(UUID, DATE, DATE, TEXT) IS\n'Retrieves historical balance data for trend charts. Auto-calculates missing snapshots on-demand. Fixed ambiguous column reference with explicit aliases and search_path.'","-- =============================================\n-- 2. Fix get_top_categories function\n-- =============================================\n-- Issue: Type mismatch - expense_category ENUM returned as TEXT\n-- Fix: Explicit cast to TEXT and SET search_path\n\nCREATE OR REPLACE FUNCTION get_top_categories(\n    p_start_date DATE DEFAULT (CURRENT_DATE - '30 days'::interval),\n    p_end_date DATE DEFAULT CURRENT_DATE,\n    p_group_id UUID DEFAULT NULL,\n    p_limit INTEGER DEFAULT 10\n)\nRETURNS TABLE(\n    category TEXT,\n    total_amount NUMERIC,\n    expense_count BIGINT,\n    percentage NUMERIC\n)\nSECURITY DEFINER\nSET search_path = public, pg_temp\nLANGUAGE plpgsql\nAS $$\nDECLARE\n  v_total NUMERIC(10,2);\nBEGIN\n  -- Calculate total spending for percentage calculation\n  SELECT COALESCE(SUM(e.amount), 0)\n  INTO v_total\n  FROM expenses e\n  WHERE e.expense_date BETWEEN p_start_date AND p_end_date\n    AND e.is_payment = false\n    AND (p_group_id IS NULL OR e.group_id = p_group_id)\n    AND EXISTS (\n      SELECT 1 FROM expense_splits es\n      WHERE es.expense_id = e.id\n        AND es.user_id = auth.uid()\n    );\n\n  -- Return top categories with explicit TEXT cast for ENUM type\n  RETURN QUERY\n  SELECT\n    e.category::TEXT AS category,\n    SUM(e.amount) AS total_amount,\n    COUNT(*)::BIGINT AS expense_count,\n    CASE\n      WHEN v_total > 0 THEN ROUND((SUM(e.amount) / v_total * 100)::NUMERIC, 2)\n      ELSE 0\n    END AS percentage\n  FROM expenses e\n  WHERE e.expense_date BETWEEN p_start_date AND p_end_date\n    AND e.is_payment = false\n    AND (p_group_id IS NULL OR e.group_id = p_group_id)\n    AND EXISTS (\n      SELECT 1 FROM expense_splits es\n      WHERE es.expense_id = e.id\n        AND es.user_id = auth.uid()\n    )\n  GROUP BY e.category\n  ORDER BY total_amount DESC\n  LIMIT p_limit;\nEND;\n$$","COMMENT ON FUNCTION get_top_categories(DATE, DATE, UUID, INTEGER) IS\n'Returns top spending categories with amounts and percentages for analytics dashboard. Fixed type mismatch by explicitly casting expense_category ENUM to TEXT.'","-- =============================================\n-- 3. Grant permissions (idempotent)\n-- =============================================\nGRANT EXECUTE ON FUNCTION get_balance_history(UUID, DATE, DATE, TEXT) TO authenticated","GRANT EXECUTE ON FUNCTION get_balance_history(UUID, DATE, DATE, TEXT) TO anon","GRANT EXECUTE ON FUNCTION get_top_categories(DATE, DATE, UUID, INTEGER) TO authenticated","GRANT EXECUTE ON FUNCTION get_top_categories(DATE, DATE, UUID, INTEGER) TO anon"}	fix_sql_function_errors
20260110100000	{"-- Migration: Add Admin Permissions to Settle and Delete Operations\n-- Created: 2026-01-10\n-- Purpose: Allow system admins to perform all CRUD operations including settle transactions\n--\n-- Changes:\n-- 1. settle_split: Allow admin to settle any split\n-- 2. settle_expense: Allow admin to settle any expense\n-- 3. unsettle_split: Allow admin to unsettle any split\n-- 4. settle_all_group_debts: Allow system admin (in addition to group admin)\n-- 5. bulk_delete_expenses: Allow system admin to delete any expenses\n-- 6. soft_delete_expense: Allow system admin to delete any expense\n\n-- =============================================\n-- 1. Update settle_split function\n-- =============================================\nCREATE OR REPLACE FUNCTION settle_split(\n  p_split_id UUID,\n  p_amount DECIMAL DEFAULT NULL\n)\nRETURNS JSONB\nSECURITY DEFINER\nSET search_path = public, pg_temp\nLANGUAGE plpgsql\nAS $$\nDECLARE\n  v_split RECORD;\n  v_expense RECORD;\n  v_settled_amount DECIMAL;\nBEGIN\n  SELECT * INTO v_split FROM expense_splits WHERE id = p_split_id;\n  IF NOT FOUND THEN RAISE EXCEPTION 'Split not found'; END IF;\n\n  SELECT * INTO v_expense FROM expenses WHERE id = v_split.expense_id;\n  IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found'; END IF;\n\n  -- Allow payer OR system admin\n  IF v_expense.paid_by_user_id != auth.uid() AND NOT is_admin() THEN\n    RAISE EXCEPTION 'Only the payer or admin can settle splits';\n  END IF;\n\n  IF v_split.is_settled THEN\n    RAISE EXCEPTION 'Split is already settled';\n  END IF;\n\n  v_settled_amount := COALESCE(p_amount, v_split.computed_amount);\n\n  IF v_settled_amount <= 0 THEN\n    RAISE EXCEPTION 'Settlement amount must be greater than 0';\n  END IF;\n\n  IF v_settled_amount > v_split.computed_amount THEN\n    RAISE EXCEPTION 'Settlement amount cannot exceed computed amount';\n  END IF;\n\n  UPDATE expense_splits\n  SET is_settled = true, settled_amount = v_settled_amount, settled_at = NOW()\n  WHERE id = p_split_id;\n\n  RETURN jsonb_build_object(\n    'success', true,\n    'split_id', p_split_id,\n    'settled_amount', v_settled_amount,\n    'computed_amount', v_split.computed_amount,\n    'is_partial', v_settled_amount < v_split.computed_amount\n  );\nEND;\n$$","COMMENT ON FUNCTION settle_split(UUID, DECIMAL) IS 'Settle an individual split with optional custom amount. Can be called by payer or system admin.'","-- =============================================\n-- 2. Update unsettle_split function\n-- =============================================\nCREATE OR REPLACE FUNCTION unsettle_split(p_split_id UUID)\nRETURNS JSONB\nSECURITY DEFINER\nSET search_path = public, pg_temp\nLANGUAGE plpgsql\nAS $$\nDECLARE\n  v_split RECORD;\n  v_expense RECORD;\nBEGIN\n  SELECT * INTO v_split FROM expense_splits WHERE id = p_split_id;\n  IF NOT FOUND THEN RAISE EXCEPTION 'Split not found'; END IF;\n\n  SELECT * INTO v_expense FROM expenses WHERE id = v_split.expense_id;\n\n  -- Allow payer OR system admin\n  IF v_expense.paid_by_user_id != auth.uid() AND NOT is_admin() THEN\n    RAISE EXCEPTION 'Only the payer or admin can unsettle splits';\n  END IF;\n\n  UPDATE expense_splits\n  SET is_settled = false, settled_amount = 0, settled_at = NULL\n  WHERE id = p_split_id;\n\n  RETURN jsonb_build_object('success', true, 'split_id', p_split_id);\nEND;\n$$","COMMENT ON FUNCTION unsettle_split(UUID) IS 'Unsettle a split (for corrections). Can be called by payer or system admin.'","-- =============================================\n-- 3. Update settle_expense function\n-- =============================================\nCREATE OR REPLACE FUNCTION settle_expense(p_expense_id UUID)\nRETURNS JSONB\nSECURITY DEFINER\nSET search_path = public, pg_temp\nLANGUAGE plpgsql\nAS $$\nDECLARE\n  v_expense RECORD;\n  v_splits_count INTEGER;\nBEGIN\n  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;\n  IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found'; END IF;\n\n  -- Allow payer OR system admin\n  IF v_expense.paid_by_user_id != auth.uid() AND NOT is_admin() THEN\n    RAISE EXCEPTION 'Only the payer or admin can settle the expense';\n  END IF;\n\n  IF v_expense.is_payment THEN\n    RAISE EXCEPTION 'Expense is already settled';\n  END IF;\n\n  UPDATE expense_splits\n  SET is_settled = true, settled_amount = computed_amount, settled_at = NOW()\n  WHERE expense_id = p_expense_id AND is_settled = false;\n\n  GET DIAGNOSTICS v_splits_count = ROW_COUNT;\n\n  UPDATE expenses SET is_payment = true WHERE id = p_expense_id;\n\n  RETURN jsonb_build_object(\n    'success', true,\n    'expense_id', p_expense_id,\n    'splits_settled', v_splits_count\n  );\nEND;\n$$","COMMENT ON FUNCTION settle_expense(UUID) IS 'Settle all splits for an expense. Can be called by payer or system admin.'","-- =============================================\n-- 4. Update settle_all_group_debts function\n-- =============================================\nCREATE OR REPLACE FUNCTION settle_all_group_debts(p_group_id UUID)\nRETURNS JSONB\nLANGUAGE plpgsql\nSECURITY DEFINER\nSET search_path TO 'public', 'pg_temp'\nAS $$\nDECLARE\n  v_user_id UUID;\n  v_is_group_admin BOOLEAN;\n  v_is_system_admin BOOLEAN;\n  v_splits_count INTEGER := 0;\n  v_total_amount NUMERIC(10,2) := 0;\n  v_expenses_count INTEGER := 0;\nBEGIN\n  -- Get current user\n  v_user_id := auth.uid();\n\n  IF v_user_id IS NULL THEN\n    RAISE EXCEPTION 'User must be authenticated';\n  END IF;\n\n  -- Check if user is system admin\n  v_is_system_admin := is_admin();\n\n  -- Check if user is group admin (only if not system admin)\n  IF NOT v_is_system_admin THEN\n    SELECT role = 'admin' INTO v_is_group_admin\n    FROM group_members\n    WHERE group_id = p_group_id AND user_id = v_user_id;\n\n    IF NOT FOUND THEN\n      RAISE EXCEPTION 'User is not a member of this group';\n    END IF;\n\n    IF NOT v_is_group_admin THEN\n      RAISE EXCEPTION 'Only group admins or system admins can settle all debts';\n    END IF;\n  END IF;\n\n  -- Calculate total amount to be settled\n  SELECT\n    COUNT(*),\n    COALESCE(SUM(computed_amount - COALESCE(settled_amount, 0)), 0)\n  INTO v_splits_count, v_total_amount\n  FROM expense_splits es\n  JOIN expenses e ON e.id = es.expense_id\n  WHERE e.group_id = p_group_id\n    AND e.is_payment = false\n    AND es.is_settled = false;\n\n  -- Mark all unsettled splits as settled\n  UPDATE expense_splits es\n  SET\n    is_settled = true,\n    settled_amount = computed_amount,\n    settled_at = NOW()\n  FROM expenses e\n  WHERE es.expense_id = e.id\n    AND e.group_id = p_group_id\n    AND e.is_payment = false\n    AND es.is_settled = false;\n\n  -- Count affected expenses\n  SELECT COUNT(DISTINCT e.id) INTO v_expenses_count\n  FROM expenses e\n  WHERE e.group_id = p_group_id\n    AND e.is_payment = false\n    AND EXISTS (\n      SELECT 1 FROM expense_splits es\n      WHERE es.expense_id = e.id AND es.is_settled = true\n    );\n\n  -- Mark all expenses as paid\n  UPDATE expenses\n  SET is_payment = true, updated_at = NOW()\n  WHERE group_id = p_group_id\n    AND is_payment = false;\n\n  -- Log to audit_logs\n  INSERT INTO audit_logs (\n    user_id,\n    table_name,\n    operation,\n    record_id,\n    changed_fields\n  ) VALUES (\n    v_user_id,\n    'expenses',\n    'BULK_SETTLE',\n    p_group_id,\n    jsonb_build_object(\n      'group_id', p_group_id,\n      'splits_settled', v_splits_count,\n      'expenses_settled', v_expenses_count,\n      'total_amount', v_total_amount,\n      'settled_by_admin', v_is_system_admin\n    )\n  );\n\n  RETURN jsonb_build_object(\n    'success', true,\n    'group_id', p_group_id,\n    'splits_settled', v_splits_count,\n    'expenses_settled', v_expenses_count,\n    'total_amount', v_total_amount,\n    'message', format('Settled %s debts totaling ₫%s', v_splits_count, v_total_amount)\n  );\nEND;\n$$","COMMENT ON FUNCTION settle_all_group_debts(UUID) IS 'Settles all outstanding debts in a group. Can be called by group admins or system admins. Marks all unsettled splits as settled and logs to audit_logs.'","-- =============================================\n-- 5. Update bulk_delete_expenses function\n-- =============================================\nCREATE OR REPLACE FUNCTION bulk_delete_expenses(p_expense_ids UUID[])\nRETURNS JSONB\nLANGUAGE plpgsql\nSECURITY DEFINER\nSET search_path TO 'public', 'pg_temp'\nAS $$\nDECLARE\n  v_user_id UUID;\n  v_expense RECORD;\n  v_can_delete BOOLEAN;\n  v_is_system_admin BOOLEAN;\n  v_deleted_count INTEGER;\nBEGIN\n  -- Get current user\n  v_user_id := auth.uid();\n\n  IF v_user_id IS NULL THEN\n    RAISE EXCEPTION 'User must be authenticated';\n  END IF;\n\n  -- Check if user is system admin\n  v_is_system_admin := is_admin();\n\n  -- Validate expense limit (max 50 at a time)\n  IF array_length(p_expense_ids, 1) > 50 THEN\n    RAISE EXCEPTION 'Cannot delete more than 50 expenses at once';\n  END IF;\n\n  -- Check permissions for each expense (skip if system admin)\n  IF NOT v_is_system_admin THEN\n    FOR v_expense IN\n      SELECT e.*, gm.role as user_role\n      FROM expenses e\n      LEFT JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = v_user_id\n      WHERE e.id = ANY(p_expense_ids)\n    LOOP\n      -- User can delete if they created it OR they are group admin\n      v_can_delete := (v_expense.created_by = v_user_id) OR (v_expense.user_role = 'admin');\n\n      IF NOT v_can_delete THEN\n        RAISE EXCEPTION 'Permission denied to delete expense %', v_expense.id;\n      END IF;\n    END LOOP;\n  END IF;\n\n  -- Log each deletion to audit_logs\n  INSERT INTO audit_logs (\n    user_id,\n    table_name,\n    operation,\n    record_id,\n    changed_fields\n  )\n  SELECT\n    v_user_id,\n    'expenses',\n    'BULK_DELETE',\n    e.id,\n    jsonb_build_object(\n      'description', e.description,\n      'amount', e.amount,\n      'group_id', e.group_id,\n      'friendship_id', e.friendship_id,\n      'deleted_by_admin', v_is_system_admin\n    )\n  FROM expenses e\n  WHERE e.id = ANY(p_expense_ids);\n\n  -- Delete expense splits (cascades will handle this, but explicit for clarity)\n  DELETE FROM expense_splits\n  WHERE expense_id = ANY(p_expense_ids);\n\n  -- Delete expenses\n  DELETE FROM expenses\n  WHERE id = ANY(p_expense_ids);\n\n  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;\n\n  RETURN jsonb_build_object(\n    'success', true,\n    'deleted_count', v_deleted_count,\n    'message', format('Deleted %s expense(s)', v_deleted_count)\n  );\nEND;\n$$","COMMENT ON FUNCTION bulk_delete_expenses(UUID[]) IS 'Deletes multiple expenses atomically. Max 50 expenses at a time. Can be called by expense creators, group admins, or system admins. Logs all deletions to audit_logs for audit trail.'","-- =============================================\n-- 6. Update soft_delete_expense function\n-- =============================================\nCREATE OR REPLACE FUNCTION soft_delete_expense(p_expense_id UUID)\nRETURNS BOOLEAN\nLANGUAGE plpgsql\nSECURITY DEFINER\nSET search_path TO 'public', 'pg_temp'\nAS $$\nDECLARE\n  v_expense_exists BOOLEAN;\n  v_is_system_admin BOOLEAN;\nBEGIN\n  -- Check if user is system admin\n  v_is_system_admin := is_admin();\n\n  -- Check if expense exists and user has permission\n  IF v_is_system_admin THEN\n    -- System admin can delete any expense\n    SELECT EXISTS(\n      SELECT 1 FROM expenses\n      WHERE id = p_expense_id\n        AND deleted_at IS NULL\n    ) INTO v_expense_exists;\n  ELSE\n    -- Regular users can only delete their own expenses\n    SELECT EXISTS(\n      SELECT 1 FROM expenses\n      WHERE id = p_expense_id\n        AND created_by = auth.uid()\n        AND deleted_at IS NULL\n    ) INTO v_expense_exists;\n  END IF;\n\n  IF NOT v_expense_exists THEN\n    RAISE EXCEPTION 'Expense not found or you do not have permission to delete it';\n  END IF;\n\n  -- Soft delete the expense\n  UPDATE expenses\n  SET deleted_at = NOW(),\n      deleted_by = auth.uid()\n  WHERE id = p_expense_id\n    AND deleted_at IS NULL;\n\n  RETURN FOUND;\nEND;\n$$","COMMENT ON FUNCTION soft_delete_expense(UUID) IS 'Soft delete an expense. Can be called by expense creator or system admin.'"}	add_admin_permissions_to_settle_operations
20260111000000	{"-- Fix get_user_debts_public to show debts like get_user_debts_aggregated\n-- Date: 2026-01-11\n-- Purpose: Make unauthenticated users see the same debt structure as authenticated users\n--          Select one active user and show only their actual outstanding debts\n\n-- =============================================\n-- Update get_user_debts_public function\n-- =============================================\nDROP FUNCTION IF EXISTS get_user_debts_public() CASCADE","CREATE OR REPLACE FUNCTION get_user_debts_public()\nRETURNS TABLE (\n    counterparty_id UUID,\n    counterparty_name TEXT,\n    amount NUMERIC,\n    currency TEXT,\n    i_owe_them BOOLEAN,\n    is_real_data BOOLEAN\n) AS $$\nDECLARE\n    v_sample_user_id UUID;\nBEGIN\n    -- Find a user with recent activity who has outstanding debts\n    SELECT es.user_id INTO v_sample_user_id\n    FROM expense_splits es\n    JOIN expenses e ON es.expense_id = e.id\n    WHERE NOT es.is_settled\n        AND e.created_at > CURRENT_DATE - INTERVAL '30 days'\n        AND es.user_id != e.paid_by_user_id\n        AND e.expense_date <= CURRENT_DATE\n    ORDER BY e.created_at DESC\n    LIMIT 1;\n\n    -- If no active user found, return empty\n    IF v_sample_user_id IS NULL THEN\n        RETURN;\n    END IF;\n\n    -- Use the same logic as get_user_debts_aggregated for consistency\n    RETURN QUERY\n    WITH expense_debts AS (\n        -- Get debts from expenses where sample user is involved\n        -- Only include unsettled or partially settled debts\n        SELECT\n            CASE\n                WHEN es.user_id = v_sample_user_id THEN e.paid_by_user_id\n                ELSE es.user_id\n            END as counterparty_id,\n            COALESCE(e.currency, 'VND') as currency,\n            SUM(\n                CASE\n                    WHEN es.user_id = v_sample_user_id AND e.paid_by_user_id != v_sample_user_id THEN\n                        CASE\n                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0\n                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount\n                            ELSE es.computed_amount\n                        END\n                    WHEN es.user_id != v_sample_user_id AND e.paid_by_user_id = v_sample_user_id THEN\n                        -CASE\n                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0\n                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount\n                            ELSE es.computed_amount\n                        END\n                    ELSE 0\n                END\n            ) as net_amount\n        FROM expense_splits es\n        JOIN expenses e ON es.expense_id = e.id\n        WHERE (es.user_id = v_sample_user_id OR e.paid_by_user_id = v_sample_user_id)\n            AND NOT e.is_payment\n            AND es.user_id != e.paid_by_user_id  -- Exclude self-payments\n            AND e.expense_date <= CURRENT_DATE  -- Exclude future expenses\n            AND (\n                (es.is_settled = false) OR\n                (es.is_settled = true AND es.settled_amount < es.computed_amount)\n            )\n        GROUP BY\n            CASE\n                WHEN es.user_id = v_sample_user_id THEN e.paid_by_user_id\n                ELSE es.user_id\n            END,\n            COALESCE(e.currency, 'VND')\n        HAVING SUM(\n            CASE\n                WHEN es.user_id = v_sample_user_id AND e.paid_by_user_id != v_sample_user_id THEN\n                    CASE\n                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0\n                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount\n                        ELSE es.computed_amount\n                    END\n                WHEN es.user_id != v_sample_user_id AND e.paid_by_user_id = v_sample_user_id THEN\n                    CASE\n                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0\n                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount\n                        ELSE es.computed_amount\n                    END\n                ELSE 0\n            END\n        ) != 0\n    ),\n    all_debts AS (\n        SELECT ed.counterparty_id, ed.currency, ed.net_amount FROM expense_debts ed\n    ),\n    aggregated AS (\n        SELECT\n            ad.counterparty_id,\n            ad.currency,\n            SUM(ad.net_amount) AS net_amount\n        FROM all_debts ad\n        WHERE ad.counterparty_id IS DISTINCT FROM v_sample_user_id  -- Exclude self\n        GROUP BY ad.counterparty_id, ad.currency\n        HAVING SUM(ad.net_amount) != 0  -- Only return non-zero balances\n    )\n    SELECT\n        agg.counterparty_id,\n        p.full_name AS counterparty_name,\n        ABS(agg.net_amount) AS amount,\n        agg.currency,\n        (agg.net_amount > 0) AS i_owe_them,\n        TRUE AS is_real_data\n    FROM aggregated agg\n    INNER JOIN profiles p ON p.id = agg.counterparty_id\n    WHERE agg.counterparty_id IS NOT NULL\n    ORDER BY agg.currency, ABS(agg.net_amount) DESC;\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER","GRANT EXECUTE ON FUNCTION get_user_debts_public() TO anon, authenticated"}	fix_get_user_debts_public_multiple_users
20260110071404	{"-- Add banking_config JSONB column to profiles table ALTER TABLE profiles ADD COLUMN banking_config JSONB DEFAULT NULL;  -- Add comment for documentation COMMENT ON COLUMN profiles.banking_config IS 'Banking configuration for receiving payments (separate from donation settings)';"}	add_banking_config_to_profiles
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: -
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 30, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: -
--

SELECT pg_catalog.setval('supabase_functions.hooks_id_seq', 1, false);


--
-- Name: extensions extensions_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: -
--

ALTER TABLE ONLY _realtime.extensions
    ADD CONSTRAINT extensions_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: -
--

ALTER TABLE ONLY _realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: -
--

ALTER TABLE ONLY _realtime.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: momo_payment_requests momo_payment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.momo_payment_requests
    ADD CONSTRAINT momo_payment_requests_pkey PRIMARY KEY (id);


--
-- Name: momo_payment_requests momo_payment_requests_reference_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.momo_payment_requests
    ADD CONSTRAINT momo_payment_requests_reference_code_key UNIQUE (reference_code);


--
-- Name: momo_settings momo_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.momo_settings
    ADD CONSTRAINT momo_settings_pkey PRIMARY KEY (id);


--
-- Name: momo_webhook_logs momo_webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.momo_webhook_logs
    ADD CONSTRAINT momo_webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: momo_webhook_logs momo_webhook_logs_tran_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.momo_webhook_logs
    ADD CONSTRAINT momo_webhook_logs_tran_id_key UNIQUE (tran_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_09 messages_2026_01_09_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_09
    ADD CONSTRAINT messages_2026_01_09_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_10 messages_2026_01_10_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_10
    ADD CONSTRAINT messages_2026_01_10_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_11 messages_2026_01_11_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_11
    ADD CONSTRAINT messages_2026_01_11_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_12 messages_2026_01_12_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_12
    ADD CONSTRAINT messages_2026_01_12_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_13 messages_2026_01_13_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_13
    ADD CONSTRAINT messages_2026_01_13_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: iceberg_namespaces iceberg_namespaces_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_namespaces
    ADD CONSTRAINT iceberg_namespaces_pkey PRIMARY KEY (id);


--
-- Name: iceberg_tables iceberg_tables_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: hooks hooks_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: -
--

ALTER TABLE ONLY supabase_functions.hooks
    ADD CONSTRAINT hooks_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: -
--

ALTER TABLE ONLY supabase_functions.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (version);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: extensions_tenant_external_id_index; Type: INDEX; Schema: _realtime; Owner: -
--

CREATE INDEX extensions_tenant_external_id_index ON _realtime.extensions USING btree (tenant_external_id);


--
-- Name: extensions_tenant_external_id_type_index; Type: INDEX; Schema: _realtime; Owner: -
--

CREATE UNIQUE INDEX extensions_tenant_external_id_type_index ON _realtime.extensions USING btree (tenant_external_id, type);


--
-- Name: tenants_external_id_index; Type: INDEX; Schema: _realtime; Owner: -
--

CREATE UNIQUE INDEX tenants_external_id_index ON _realtime.tenants USING btree (external_id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: idx_momo_payment_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_momo_payment_requests_created_at ON public.momo_payment_requests USING btree (created_at DESC);


--
-- Name: idx_momo_payment_requests_expense_split_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_momo_payment_requests_expense_split_id ON public.momo_payment_requests USING btree (expense_split_id);


--
-- Name: idx_momo_payment_requests_reference_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_momo_payment_requests_reference_code ON public.momo_payment_requests USING btree (reference_code);


--
-- Name: idx_momo_payment_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_momo_payment_requests_status ON public.momo_payment_requests USING btree (status);


--
-- Name: idx_momo_payment_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_momo_payment_requests_user_id ON public.momo_payment_requests USING btree (user_id);


--
-- Name: idx_momo_webhook_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_momo_webhook_logs_created_at ON public.momo_webhook_logs USING btree (created_at DESC);


--
-- Name: idx_momo_webhook_logs_processed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_momo_webhook_logs_processed ON public.momo_webhook_logs USING btree (processed);


--
-- Name: idx_momo_webhook_logs_tran_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_momo_webhook_logs_tran_id ON public.momo_webhook_logs USING btree (tran_id);


--
-- Name: idx_notifications_type_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type_created ON public.notifications USING btree (type, created_at DESC);


--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_notifications_user_unread_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread_created ON public.notifications USING btree (user_id, created_at DESC) WHERE (is_read = false);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_09_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_09_inserted_at_topic_idx ON realtime.messages_2026_01_09 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_10_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_10_inserted_at_topic_idx ON realtime.messages_2026_01_10 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_11_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_11_inserted_at_topic_idx ON realtime.messages_2026_01_11 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_12_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_12_inserted_at_topic_idx ON realtime.messages_2026_01_12 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_13_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_13_inserted_at_topic_idx ON realtime.messages_2026_01_13 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_iceberg_namespaces_bucket_id; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_iceberg_namespaces_bucket_id ON storage.iceberg_namespaces USING btree (catalog_id, name);


--
-- Name: idx_iceberg_tables_location; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_iceberg_tables_location ON storage.iceberg_tables USING btree (location);


--
-- Name: idx_iceberg_tables_namespace_id; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_iceberg_tables_namespace_id ON storage.iceberg_tables USING btree (catalog_id, namespace_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: supabase_functions_hooks_h_table_id_h_name_idx; Type: INDEX; Schema: supabase_functions; Owner: -
--

CREATE INDEX supabase_functions_hooks_h_table_id_h_name_idx ON supabase_functions.hooks USING btree (hook_table_id, hook_name);


--
-- Name: supabase_functions_hooks_request_id_idx; Type: INDEX; Schema: supabase_functions; Owner: -
--

CREATE INDEX supabase_functions_hooks_request_id_idx ON supabase_functions.hooks USING btree (request_id);


--
-- Name: messages_2026_01_09_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_09_inserted_at_topic_idx;


--
-- Name: messages_2026_01_09_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_09_pkey;


--
-- Name: messages_2026_01_10_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_10_inserted_at_topic_idx;


--
-- Name: messages_2026_01_10_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_10_pkey;


--
-- Name: messages_2026_01_11_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_11_inserted_at_topic_idx;


--
-- Name: messages_2026_01_11_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_11_pkey;


--
-- Name: messages_2026_01_12_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_12_inserted_at_topic_idx;


--
-- Name: messages_2026_01_12_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_12_pkey;


--
-- Name: messages_2026_01_13_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_13_inserted_at_topic_idx;


--
-- Name: messages_2026_01_13_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_13_pkey;


--
-- Name: momo_payment_requests update_momo_payment_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_momo_payment_requests_updated_at BEFORE UPDATE ON public.momo_payment_requests FOR EACH ROW EXECUTE FUNCTION public.update_momo_payment_requests_updated_at();


--
-- Name: momo_settings update_momo_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_momo_settings_updated_at BEFORE UPDATE ON public.momo_settings FOR EACH ROW EXECUTE FUNCTION public.update_momo_settings_updated_at();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: extensions extensions_tenant_external_id_fkey; Type: FK CONSTRAINT; Schema: _realtime; Owner: -
--

ALTER TABLE ONLY _realtime.extensions
    ADD CONSTRAINT extensions_tenant_external_id_fkey FOREIGN KEY (tenant_external_id) REFERENCES _realtime.tenants(external_id) ON DELETE CASCADE;


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: momo_webhook_logs momo_webhook_logs_matched_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.momo_webhook_logs
    ADD CONSTRAINT momo_webhook_logs_matched_request_id_fkey FOREIGN KEY (matched_request_id) REFERENCES public.momo_payment_requests(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: iceberg_namespaces iceberg_namespaces_catalog_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_namespaces
    ADD CONSTRAINT iceberg_namespaces_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES storage.buckets_analytics(id) ON DELETE CASCADE;


--
-- Name: iceberg_tables iceberg_tables_catalog_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES storage.buckets_analytics(id) ON DELETE CASCADE;


--
-- Name: iceberg_tables iceberg_tables_namespace_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_namespace_id_fkey FOREIGN KEY (namespace_id) REFERENCES storage.iceberg_namespaces(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles Users can read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: momo_payment_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.momo_payment_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: momo_payment_requests momo_payment_requests_create_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY momo_payment_requests_create_own ON public.momo_payment_requests FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: momo_payment_requests momo_payment_requests_read_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY momo_payment_requests_read_own ON public.momo_payment_requests FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: momo_payment_requests momo_payment_requests_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY momo_payment_requests_update_own ON public.momo_payment_requests FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: momo_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.momo_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: momo_settings momo_settings_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY momo_settings_insert_policy ON public.momo_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: momo_settings momo_settings_read_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY momo_settings_read_policy ON public.momo_settings FOR SELECT TO authenticated USING (true);


--
-- Name: momo_settings momo_settings_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY momo_settings_update_policy ON public.momo_settings FOR UPDATE TO authenticated USING (public.is_admin());


--
-- Name: momo_webhook_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.momo_webhook_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: momo_webhook_logs momo_webhook_logs_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY momo_webhook_logs_admin_only ON public.momo_webhook_logs TO authenticated USING (public.is_admin());


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert_own ON public.notifications FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: notifications notifications_read_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_read_own ON public.notifications FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: notifications notifications_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: iceberg_namespaces; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.iceberg_namespaces ENABLE ROW LEVEL SECURITY;

--
-- Name: iceberg_tables; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.iceberg_tables ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime momo_payment_requests; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.momo_payment_requests;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict etpvbjkFaBpBrIOSLM5Mpd1p5ZfkeBdoveTPNmE4vN6kIFSpr0aqsSDffAD0Bm2


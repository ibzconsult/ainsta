-- Remove todas as tabelas lia_* do Supabase antigo
-- Rodar no Supabase SQL Editor do projeto xpgumjcissquyoqjpwim ANTES de migrar
drop table if exists public.lia_audit_log         cascade;
drop table if exists public.lia_leads             cascade;
drop table if exists public.lia_n8n_chat_histories cascade;
drop table if exists public.lia_conversation_locks cascade;
drop table if exists public.lia_messages          cascade;
drop table if exists public.lia_conversations     cascade;
drop table if exists public.lia_contacts          cascade;
drop table if exists public.lia_campaigns         cascade;
drop table if exists public.lia_knowledge_base    cascade;
drop table if exists public.lia_agent_configs     cascade;
drop table if exists public.lia_whatsapp_instances cascade;
drop table if exists public.lia_meta_tokens       cascade;
drop table if exists public.lia_tenants           cascade;
drop function if exists public.lia_current_tenant_id() cascade;

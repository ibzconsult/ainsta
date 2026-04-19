-- RLS policies para Lia SaaS
-- Executar no Supabase SQL Editor após `prisma db push`.
-- Estratégia: anon/authenticated fazem SELECT apenas em tenants do próprio usuário
-- (via join por owner_email com auth.users). Mutações são feitas via API Next.js
-- usando SUPABASE_SERVICE_ROLE_KEY (bypassa RLS). n8n também usa service_role.

-- ---------- helper: resolve tenant_id do usuário autenticado ----------
create or replace function lia_current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.lia_tenants t
  join auth.users u on lower(u.email) = lower(t.owner_email)
  where u.id = auth.uid()
  limit 1
$$;

grant execute on function lia_current_tenant_id() to authenticated;

-- ---------- ligar RLS em todas as tabelas lia_* ----------
alter table public.lia_tenants             enable row level security;
alter table public.lia_meta_tokens         enable row level security;
alter table public.lia_whatsapp_instances  enable row level security;
alter table public.lia_agent_configs       enable row level security;
alter table public.lia_knowledge_base      enable row level security;
alter table public.lia_campaigns           enable row level security;
alter table public.lia_contacts            enable row level security;
alter table public.lia_conversations       enable row level security;
alter table public.lia_messages            enable row level security;
alter table public.lia_conversation_locks  enable row level security;
alter table public.lia_n8n_chat_histories  enable row level security;
alter table public.lia_leads               enable row level security;
alter table public.lia_audit_log           enable row level security;

-- ---------- policy genérica: tenant só vê linhas do próprio tenant_id ----------
-- tenants
drop policy if exists "tenant_self_select" on public.lia_tenants;
create policy "tenant_self_select" on public.lia_tenants
  for select to authenticated
  using (id = lia_current_tenant_id());

-- demais tabelas com coluna tenant_id
do $$
declare tbl text;
begin
  for tbl in
    select unnest(array[
      'lia_meta_tokens', 'lia_whatsapp_instances', 'lia_agent_configs',
      'lia_knowledge_base', 'lia_campaigns', 'lia_contacts',
      'lia_conversations', 'lia_conversation_locks',
      'lia_leads', 'lia_audit_log'
    ])
  loop
    execute format('drop policy if exists "tenant_select" on public.%I', tbl);
    execute format($p$
      create policy "tenant_select" on public.%I
        for select to authenticated
        using (tenant_id = lia_current_tenant_id())
    $p$, tbl);
  end loop;
end $$;

-- messages (acessa via conversation → tenant_id)
drop policy if exists "tenant_select" on public.lia_messages;
create policy "tenant_select" on public.lia_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.lia_conversations c
      where c.id = conversation_id
        and c.tenant_id = lia_current_tenant_id()
    )
  );

-- n8n_chat_histories: session_id = contact_id → join
drop policy if exists "tenant_select" on public.lia_n8n_chat_histories;
create policy "tenant_select" on public.lia_n8n_chat_histories
  for select to authenticated
  using (
    exists (
      select 1 from public.lia_contacts c
      where c.id::text = session_id
        and c.tenant_id = lia_current_tenant_id()
    )
  );

-- ---------- extensões necessárias (confirmar habilitadas) ----------
-- create extension if not exists pgcrypto;
-- create extension if not exists vector;

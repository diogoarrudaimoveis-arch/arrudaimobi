-- Arruda Imobi — Central IA Operacional
-- HARDENED DRAFT ONLY. NÃO EXECUTAR SEM APROVAÇÃO EXPLÍCITA.
-- Objetivo: observabilidade operacional AI-first multi-tenant com RLS real,
-- escrita server-side/service-role, mascaramento de payload e retenção.

-- Premissas já existentes no projeto:
-- - public.tenants(id)
-- - public.user_roles(user_id, tenant_id, role)
-- - public.has_tenant_role(_user_id uuid, _tenant_id uuid, _role app_role)
-- - enum public.app_role contém 'admin'
-- - service_role escreve via Edge Functions/servidor e bypassa RLS; client admin lê.

-- =====================================================================
-- 1) Tipos normalizados
-- =====================================================================
do $$ begin
  create type public.operational_status as enum (
    'unknown', 'ok', 'warning', 'error', 'critical', 'disabled',
    'online', 'offline', 'busy', 'degraded', 'blocked',
    'queued', 'running', 'waiting', 'waiting_approval',
    'completed', 'failed', 'canceled', 'skipped', 'success',
    'sent', 'suppressed', 'dry_run'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.incident_severity as enum ('debug', 'info', 'low', 'medium', 'warning', 'error', 'high', 'critical');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.audit_event_category as enum (
    'auth', 'token', 'permission', 'device', 'node', 'rls', 'deploy',
    'edge_function', 'webhook', 'automation', 'integration', 'data_access',
    'approval', 'config', 'incident', 'manual'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.audit_event_action as enum (
    'created', 'updated', 'deleted', 'read', 'executed', 'queued',
    'started', 'completed', 'failed', 'blocked', 'approved', 'rejected',
    'sent', 'suppressed', 'rotated', 'masked', 'expired', 'acknowledged',
    'resolved', 'detected'
  );
exception when duplicate_object then null;
end $$;

-- =====================================================================
-- 2) Funções de segurança / normalização
-- =====================================================================
create or replace function public.is_tenant_admin(_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_tenant_role(auth.uid(), _tenant_id, 'admin'::public.app_role);
$$;

create or replace function public.mask_secret_text(_value text)
returns text
language sql
immutable
as $$
  select case
    when _value is null then null
    else regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            _value,
            '(ghp_|github_pat_|glpat-|xox[baprs]-|sk-[A-Za-z0-9_-]{8})[A-Za-z0-9_\-]{12,}',
            '\1***MASKED***',
            'gi'
          ),
          '([A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{10,})',
          'jwt_***MASKED***',
          'g'
        ),
        '([A-Fa-f0-9]{32,})',
        'hex_***MASKED***',
        'g'
      ),
      '([A-Za-z0-9_\-]{40,})',
      'token_***MASKED***',
      'g'
    )
  end;
$$;

create or replace function public.scrub_operational_payload(_payload jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(public.mask_secret_text(coalesce(_payload, '{}'::jsonb)::text)::jsonb, '{}'::jsonb);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.scrub_payload_columns()
returns trigger
language plpgsql
as $$
begin
  if to_jsonb(new) ? 'config' then
    new.config = public.scrub_operational_payload(coalesce(new.config, '{}'::jsonb));
  end if;
  if to_jsonb(new) ? 'metadata' then
    new.metadata = public.scrub_operational_payload(coalesce(new.metadata, '{}'::jsonb));
  end if;
  if to_jsonb(new) ? 'payload_summary' then
    new.payload_summary = public.scrub_operational_payload(coalesce(new.payload_summary, '{}'::jsonb));
  end if;
  if to_jsonb(new) ? 'input_summary' then
    new.input_summary = public.scrub_operational_payload(coalesce(new.input_summary, '{}'::jsonb));
  end if;
  if to_jsonb(new) ? 'output_summary' then
    new.output_summary = public.scrub_operational_payload(coalesce(new.output_summary, '{}'::jsonb));
  end if;
  if to_jsonb(new) ? 'status_payload' then
    new.status_payload = public.scrub_operational_payload(coalesce(new.status_payload, '{}'::jsonb));
  end if;
  if to_jsonb(new) ? 'raw_summary' then
    new.raw_summary = public.scrub_operational_payload(coalesce(new.raw_summary, '{}'::jsonb));
  end if;
  if to_jsonb(new) ? 'payload' then
    new.payload = public.scrub_operational_payload(coalesce(new.payload, '{}'::jsonb));
  end if;
  if to_jsonb(new) ? 'secret_ref' then
    new.secret_ref = public.mask_secret_text(new.secret_ref);
  end if;
  if to_jsonb(new) ? 'token_hint' then
    new.token_hint = public.mask_secret_text(new.token_hint);
  end if;
  return new;
end;
$$;

-- =====================================================================
-- 3) Tabelas operacionais hardened
-- =====================================================================
create table if not exists public.operational_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_key text not null check (integration_key ~ '^[a-z0-9_:-]{2,80}$'),
  display_name text not null,
  status public.operational_status not null default 'unknown',
  health_score int check (health_score between 0 and 100),
  last_checked_at timestamptz,
  last_error text,
  config jsonb not null default '{}'::jsonb,
  token_hint text, -- masked only, never raw token
  retention_days int not null default 90 check (retention_days between 7 and 730),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, integration_key)
);

create table if not exists public.agent_status_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agent_id text not null check (agent_id ~ '^[a-z0-9_:-]{2,120}$'),
  agent_name text not null,
  agent_role text,
  status public.operational_status not null default 'unknown',
  current_task_id uuid,
  last_action text,
  risk_level public.incident_severity not null default 'low',
  metrics jsonb not null default '{}'::jsonb,
  reported_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  owner_agent_id text not null check (owner_agent_id ~ '^[a-z0-9_:-]{2,120}$'),
  requester_agent_id text,
  status public.operational_status not null default 'queued',
  priority text not null default 'P2' check (priority in ('P0','P1','P2','P3')),
  approval_required boolean not null default false,
  approval_status text not null default 'not_required' check (approval_status in ('not_required','pending','approved','rejected','expired')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source text not null check (source in ('n8n','openclaw','cron','edge_function','manual','meta_ads','github','vercel','supabase','telegram')),
  workflow_key text,
  workflow_name text,
  status public.operational_status not null,
  severity public.incident_severity not null default 'info',
  duration_ms int check (duration_ms is null or duration_ms >= 0),
  retry_count int not null default 0 check (retry_count >= 0),
  input_summary jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  error_message text,
  idempotency_key text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, source, idempotency_key)
);

create table if not exists public.n8n_execution_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  n8n_workflow_id text,
  n8n_execution_id text not null,
  workflow_name text,
  mode text,
  status public.operational_status not null,
  started_at timestamptz,
  stopped_at timestamptz,
  duration_ms int check (duration_ms is null or duration_ms >= 0),
  error_node text,
  error_message text,
  payload_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, n8n_execution_id)
);

create table if not exists public.openclaw_health_checks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  gateway_status public.operational_status not null,
  gateway_latency_ms int check (gateway_latency_ms is null or gateway_latency_ms >= 0),
  openclaw_version text,
  nodes_known int not null default 0 check (nodes_known >= 0),
  nodes_connected int not null default 0 check (nodes_connected >= 0),
  sessions_active int not null default 0 check (sessions_active >= 0),
  tasks_running int not null default 0 check (tasks_running >= 0),
  issue_count int not null default 0 check (issue_count >= 0),
  status_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.meta_ads_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  account_id text not null,
  campaign_id text,
  adset_id text,
  ad_id text,
  campaign_name text,
  date date not null,
  spend numeric(12,2) not null default 0 check (spend >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  leads bigint not null default 0 check (leads >= 0),
  purchases bigint not null default 0 check (purchases >= 0),
  revenue numeric(12,2) not null default 0 check (revenue >= 0),
  cpc numeric(12,4), cpm numeric(12,4), ctr numeric(12,4), cpl numeric(12,4), roas numeric(12,4),
  quality_label text check (quality_label is null or quality_label in ('winner','neutral','bad','learning','paused','unknown')),
  raw_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, account_id, campaign_id, adset_id, ad_id, date)
);

create table if not exists public.meta_ads_webhook_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider_event_id text,
  account_id text,
  object_type text not null, -- campaign, adset, ad, leadgen, pixel, page
  event_type text not null,
  status public.operational_status not null default 'queued',
  payload_summary jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (tenant_id, provider_event_id)
);

create table if not exists public.github_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  repo_full_name text not null,
  event_type text not null,
  branch text,
  commit_sha text,
  actor text,
  title text,
  status public.operational_status,
  url text,
  occurred_at timestamptz,
  payload_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vercel_deployments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  deployment_id text not null,
  project_id text,
  project_name text,
  url text,
  branch text,
  commit_sha text,
  status public.operational_status not null,
  environment text check (environment is null or environment in ('production','preview','development')),
  rollback_candidate boolean not null default false,
  created_by text,
  started_at timestamptz,
  ready_at timestamptz,
  error_message text,
  payload_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, deployment_id)
);

create table if not exists public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source text not null,
  category public.audit_event_category not null,
  action public.audit_event_action not null default 'detected',
  severity public.incident_severity not null,
  title text not null,
  description text,
  risk_score int check (risk_score between 0 and 10),
  affected_resource text,
  actor_ref text,
  secret_ref text, -- masked ref only: ghp_***MASKED***
  normalized_event_key text,
  remediation text,
  rollback text,
  status public.operational_status not null default 'queued',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (tenant_id, source, normalized_event_key)
);

create table if not exists public.telegram_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  alert_key text,
  severity public.incident_severity not null,
  title text not null,
  message text not null,
  target_channel text not null default 'telegram',
  target_ref text,
  status public.operational_status not null default 'queued',
  dry_run boolean not null default true,
  sent_at timestamptz,
  error_message text,
  related_table text,
  related_id uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, alert_key)
);

-- =====================================================================
-- 4) Índices
-- =====================================================================
create index if not exists idx_operational_integrations_tenant_status on public.operational_integrations(tenant_id, status, integration_key);
create index if not exists idx_agent_snapshots_tenant_created on public.agent_status_snapshots(tenant_id, created_at desc);
create index if not exists idx_agent_snapshots_agent_created on public.agent_status_snapshots(tenant_id, agent_id, created_at desc);
create index if not exists idx_agent_tasks_tenant_status on public.agent_tasks(tenant_id, status, priority, created_at desc);
create index if not exists idx_agent_tasks_owner_status on public.agent_tasks(tenant_id, owner_agent_id, status);
create index if not exists idx_automation_runs_tenant_created on public.automation_runs(tenant_id, created_at desc);
create index if not exists idx_automation_runs_status_severity on public.automation_runs(tenant_id, status, severity, created_at desc);
create index if not exists idx_n8n_logs_tenant_created on public.n8n_execution_logs(tenant_id, created_at desc);
create index if not exists idx_openclaw_health_tenant_created on public.openclaw_health_checks(tenant_id, created_at desc);
create index if not exists idx_meta_ads_tenant_date on public.meta_ads_daily_metrics(tenant_id, date desc);
create index if not exists idx_meta_ads_campaign_date on public.meta_ads_daily_metrics(tenant_id, account_id, campaign_id, date desc);
create index if not exists idx_meta_ads_webhooks_status on public.meta_ads_webhook_events(tenant_id, status, received_at desc);
create index if not exists idx_github_events_tenant_occurred on public.github_events(tenant_id, occurred_at desc);
create index if not exists idx_vercel_deployments_tenant_status on public.vercel_deployments(tenant_id, status, created_at desc);
create index if not exists idx_security_events_tenant_severity on public.security_audit_events(tenant_id, severity, status, created_at desc);
create index if not exists idx_security_events_category on public.security_audit_events(tenant_id, category, action, created_at desc);
create index if not exists idx_telegram_alerts_tenant_status on public.telegram_alerts(tenant_id, status, severity, created_at desc);

-- =====================================================================
-- 5) Triggers de updated_at e scrubbing
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'operational_integrations','agent_tasks'
  ] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;

  foreach t in array array[
    'operational_integrations','agent_status_snapshots','agent_tasks','automation_runs',
    'n8n_execution_logs','openclaw_health_checks','meta_ads_daily_metrics','meta_ads_webhook_events',
    'github_events','vercel_deployments','security_audit_events'
  ] loop
    execute format('drop trigger if exists trg_%I_scrub_payload on public.%I', t, t);
    execute format('create trigger trg_%I_scrub_payload before insert or update on public.%I for each row execute function public.scrub_payload_columns()', t, t);
  end loop;
end $$;

-- =====================================================================
-- 6) RLS real: admin lê, client não escreve. Service-role escreve server-side.
-- =====================================================================
alter table public.operational_integrations enable row level security;
alter table public.agent_status_snapshots enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.automation_runs enable row level security;
alter table public.n8n_execution_logs enable row level security;
alter table public.openclaw_health_checks enable row level security;
alter table public.meta_ads_daily_metrics enable row level security;
alter table public.meta_ads_webhook_events enable row level security;
alter table public.github_events enable row level security;
alter table public.vercel_deployments enable row level security;
alter table public.security_audit_events enable row level security;
alter table public.telegram_alerts enable row level security;

alter table public.operational_integrations force row level security;
alter table public.agent_status_snapshots force row level security;
alter table public.agent_tasks force row level security;
alter table public.automation_runs force row level security;
alter table public.n8n_execution_logs force row level security;
alter table public.openclaw_health_checks force row level security;
alter table public.meta_ads_daily_metrics force row level security;
alter table public.meta_ads_webhook_events force row level security;
alter table public.github_events force row level security;
alter table public.vercel_deployments force row level security;
alter table public.security_audit_events force row level security;
alter table public.telegram_alerts force row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'operational_integrations','agent_status_snapshots','agent_tasks','automation_runs',
    'n8n_execution_logs','openclaw_health_checks','meta_ads_daily_metrics','meta_ads_webhook_events',
    'github_events','vercel_deployments','security_audit_events','telegram_alerts'
  ] loop
    execute format('drop policy if exists "tenant admins can read %s" on public.%I', t, t);
    execute format('create policy "tenant admins can read %s" on public.%I for select to authenticated using (public.is_tenant_admin(tenant_id))', t, t);
  end loop;
end $$;

-- Nenhuma policy de INSERT/UPDATE/DELETE para authenticated/anon.
-- Escritas reais devem ocorrer somente por service_role em Edge Functions/servidor.
revoke all on public.operational_integrations from anon, authenticated;
revoke all on public.agent_status_snapshots from anon, authenticated;
revoke all on public.agent_tasks from anon, authenticated;
revoke all on public.automation_runs from anon, authenticated;
revoke all on public.n8n_execution_logs from anon, authenticated;
revoke all on public.openclaw_health_checks from anon, authenticated;
revoke all on public.meta_ads_daily_metrics from anon, authenticated;
revoke all on public.meta_ads_webhook_events from anon, authenticated;
revoke all on public.github_events from anon, authenticated;
revoke all on public.vercel_deployments from anon, authenticated;
revoke all on public.security_audit_events from anon, authenticated;
revoke all on public.telegram_alerts from anon, authenticated;

grant select on public.operational_integrations to authenticated;
grant select on public.agent_status_snapshots to authenticated;
grant select on public.agent_tasks to authenticated;
grant select on public.automation_runs to authenticated;
grant select on public.n8n_execution_logs to authenticated;
grant select on public.openclaw_health_checks to authenticated;
grant select on public.meta_ads_daily_metrics to authenticated;
grant select on public.meta_ads_webhook_events to authenticated;
grant select on public.github_events to authenticated;
grant select on public.vercel_deployments to authenticated;
grant select on public.security_audit_events to authenticated;
grant select on public.telegram_alerts to authenticated;

-- =====================================================================
-- 7) Retenção: função dry-run/executável apenas server-side
-- =====================================================================
create or replace function public.purge_operational_observability(_tenant_id uuid, _dry_run boolean default true)
returns table(table_name text, rows_matched bigint)
language plpgsql
security definer
set search_path = public
as $$
declare cutoff_default timestamptz := now() - interval '90 days';
begin
  -- Não conceder execute a authenticated. Uso previsto: service_role/cron server-side.
  if _dry_run then
    return query select 'agent_status_snapshots', count(*)::bigint from public.agent_status_snapshots where tenant_id = _tenant_id and created_at < now() - interval '30 days';
    return query select 'automation_runs', count(*)::bigint from public.automation_runs where tenant_id = _tenant_id and created_at < cutoff_default;
    return query select 'n8n_execution_logs', count(*)::bigint from public.n8n_execution_logs where tenant_id = _tenant_id and created_at < cutoff_default;
    return query select 'openclaw_health_checks', count(*)::bigint from public.openclaw_health_checks where tenant_id = _tenant_id and created_at < now() - interval '30 days';
    return query select 'meta_ads_webhook_events', count(*)::bigint from public.meta_ads_webhook_events where tenant_id = _tenant_id and received_at < now() - interval '90 days';
    return;
  end if;

  delete from public.agent_status_snapshots where tenant_id = _tenant_id and created_at < now() - interval '30 days';
  get diagnostics rows_matched = row_count; table_name := 'agent_status_snapshots'; return next;
  delete from public.automation_runs where tenant_id = _tenant_id and created_at < cutoff_default;
  get diagnostics rows_matched = row_count; table_name := 'automation_runs'; return next;
  delete from public.n8n_execution_logs where tenant_id = _tenant_id and created_at < cutoff_default;
  get diagnostics rows_matched = row_count; table_name := 'n8n_execution_logs'; return next;
  delete from public.openclaw_health_checks where tenant_id = _tenant_id and created_at < now() - interval '30 days';
  get diagnostics rows_matched = row_count; table_name := 'openclaw_health_checks'; return next;
  delete from public.meta_ads_webhook_events where tenant_id = _tenant_id and received_at < now() - interval '90 days';
  get diagnostics rows_matched = row_count; table_name := 'meta_ads_webhook_events'; return next;
end;
$$;

revoke all on function public.purge_operational_observability(uuid, boolean) from anon, authenticated;

-- =====================================================================
-- 8) Notas de execução segura
-- =====================================================================
-- Antes de executar este draft:
-- 1. Validar se enum app_role possui 'admin'.
-- 2. Validar comportamento de FORCE RLS com owner/migrations no ambiente Supabase.
-- 3. Rodar em banco local/staging via supabase db reset/migration dry-run.
-- 4. Confirmar Edge Functions usando service role server-side, nunca VITE_*.
-- 5. Manter Telegram alerts em dry_run=true até aprovação operacional.

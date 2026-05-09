-- Meta Ads controlled-write audit log.
-- Safe migration: creates table only, no campaign mutations.
create table if not exists public.meta_ads_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null,
  action text not null,
  entity_type text not null default 'campaign',
  entity_id text not null,
  entity_name text null,
  status text not null,
  approval_id text null,
  old_value jsonb null,
  new_value jsonb null,
  meta_response jsonb null,
  error_message text null,
  created_by uuid null,
  created_at timestamptz not null default now()
);
create index if not exists meta_ads_audit_log_created_at_idx on public.meta_ads_audit_log(created_at desc);
create index if not exists meta_ads_audit_log_entity_idx on public.meta_ads_audit_log(entity_type, entity_id);

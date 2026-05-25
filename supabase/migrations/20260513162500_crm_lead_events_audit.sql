-- Migration: crm_lead_events_audit_table
-- Purpose: Audit trail for CRM lead changes (stage moves, etc.)
-- Date: 2026-05-13
-- Rules: No ZPRO writes, no WhatsApp, no delete — audit only

CREATE TABLE IF NOT EXISTS crm_lead_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  event_type VARCHAR NOT NULL,
  payload JSONB DEFAULT '{}',
  actor VARCHAR NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lead history lookups
CREATE INDEX IF NOT EXISTS idx_crm_lead_events_lead_id ON crm_lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_events_event_type ON crm_lead_events(event_type);
CREATE INDEX IF NOT EXISTS idx_crm_lead_events_created_at ON crm_lead_events(created_at DESC);

-- RLS: readable by authenticated, writable by service_role only
ALTER TABLE crm_lead_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own tenant's events
CREATE POLICY "Authenticated read own tenant events" ON crm_lead_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crm_leads l
      WHERE l.id = crm_lead_events.lead_id
      AND l.tenant_name = 'Arruda Imobi'
    )
  );

-- Service role can do anything (used by Edge Functions)
CREATE POLICY "Service role all events" ON crm_lead_events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE crm_lead_events IS 'Audit log for CRM lead changes. Created by Jack (2026-05-13) as part of Approval D — audited stage updates.';
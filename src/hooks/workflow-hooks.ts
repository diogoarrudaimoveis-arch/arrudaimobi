/**
 * workflow-hooks.ts — N8N Workflow Trigger Hooks
 * Provides React Query hooks for triggering N8N webhooks from the frontend
 * Block 5a: Lead → ZPRO → WhatsApp integration
 */
import { useMutation } from "@tanstack/react-query";
import { triggerN8NWebhook, ARRADA_IMOBI_WEBHOOKS } from "@/integrations/n8n/client";
import type { N8NTriggerPayload } from "@/integrations/n8n/client";

export interface LeadCaptureData {
  name: string;
  phone: string;
  email?: string;
  source?: string;
  propertyId?: string | number;
  propertyTitle?: string;
  message?: string;
  channel?: string;
  tenantId?: string;
}

export interface LeadCaptureResult {
  success: boolean;
  executionId?: string;
  error?: string;
}

/**
 * Trigger the Lead Capture workflow in N8N
 * Called automatically after a lead form is submitted
 */
export async function triggerLeadCaptureWorkflow(
  data: LeadCaptureData
): Promise<LeadCaptureResult> {
  const payload: N8NTriggerPayload = {
    event: "lead_captured",
    tenantId: data.tenantId || "Arruda Imobi",
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      source: data.source || "website_form",
      property_id: data.propertyId || null,
      property_title: data.propertyTitle || null,
      message: data.message || null,
      channel: data.channel || "website",
      origin_url: window.location.href,
    },
    timestamp: new Date().toISOString(),
  };

  return triggerN8NWebhook(ARRADA_IMOBI_WEBHOOKS.LEAD_CAPTURE, payload);
}

/**
 * Trigger the Visit Scheduled workflow
 */
export async function triggerVisitScheduledWorkflow(data: {
  leadName: string;
  leadPhone: string;
  propertyTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  agentName?: string;
  tenantId?: string;
}): Promise<LeadCaptureResult> {
  const payload: N8NTriggerPayload = {
    event: "visit_scheduled",
    tenantId: data.tenantId || "Arruda Imobi",
    data: {
      lead_name: data.leadName,
      phone: data.phone,
      property_title: data.propertyTitle,
      scheduled_date: data.scheduledDate,
      scheduled_time: data.scheduledTime,
      agent_name: data.agentName || null,
    },
    timestamp: new Date().toISOString(),
  };

  return triggerN8NWebhook(ARRADA_IMOBI_WEBHOOKS.VISIT_SCHEDULED, payload);
}

/**
 * Trigger the Follow-up workflow for a lead
 */
export async function triggerFollowUpWorkflow(data: {
  leadName: string;
  leadPhone: string;
  lastMessage?: string;
  daysSinceCapture?: number;
  tenantId?: string;
}): Promise<LeadCaptureResult> {
  const payload: N8NTriggerPayload = {
    event: "follow_up",
    tenantId: data.tenantId || "Arruda Imobi",
    data: {
      lead_name: data.leadName,
      phone: data.leadPhone,
      last_message: data.lastMessage || null,
      days_since_capture: data.daysSinceCapture || 1,
    },
    timestamp: new Date().toISOString(),
  };

  return triggerN8NWebhook(ARRADA_IMOBI_WEBHOOKS.FOLLOW_UP, payload);
}

/**
 * Trigger the Catalog Request workflow (WhatsApp catalog)
 */
export async function triggerCatalogRequestWorkflow(data: {
  name: string;
  phone: string;
  preferenceType?: string;
  budget?: string;
  location?: string;
  tenantId?: string;
}): Promise<LeadCaptureResult> {
  const payload: N8NTriggerPayload = {
    event: "catalog_request",
    tenantId: data.tenantId || "Arruda Imobi",
    data: {
      name: data.name,
      phone: data.phone,
      preference_type: data.preferenceType || null,
      budget: data.budget || null,
      location: data.location || null,
    },
    timestamp: new Date().toISOString(),
  };

  return triggerN8NWebhook(ARRADA_IMOBI_WEBHOOKS.CATALOG_REQUEST, payload);
}

/**
 * Hook: Submit a lead and trigger N8N workflow
 * Use this in lead/contact forms
 */
export function useLeadCaptureWorkflow() {
  return useMutation({
    mutationFn: triggerLeadCaptureWorkflow,
    onError: (error: Error) => {
      console.error("[N8N] Lead capture workflow failed:", error.message);
      // Don't throw — the form submission already succeeded via Supabase
      // N8N failure is non-blocking (fallback Telegram alert handles it)
    },
  });
}

/**
 * Hook: Trigger visit scheduled workflow
 */
export function useVisitScheduledWorkflow() {
  return useMutation({
    mutationFn: triggerVisitScheduledWorkflow,
    onError: (error: Error) => {
      console.error("[N8N] Visit scheduled workflow failed:", error.message);
    },
  });
}

/**
 * Hook: Trigger follow-up workflow
 */
export function useFollowUpWorkflow() {
  return useMutation({
    mutationFn: triggerFollowUpWorkflow,
    onError: (error: Error) => {
      console.error("[N8N] Follow-up workflow failed:", error.message);
    },
  });
}

/**
 * Hook: Trigger catalog request workflow
 */
export function useCatalogRequestWorkflow() {
  return useMutation({
    mutationFn: triggerCatalogRequestWorkflow,
    onError: (error: Error) => {
      console.error("[N8N] Catalog request workflow failed:", error.message);
    },
  });
}

/**
 * Combined hook: after a lead form is submitted to Supabase,
 * call this to trigger the N8N → ZPRO → WhatsApp automation
 */
export function useLeadSubmitWithN8N() {
  const leadCapture = useLeadCaptureWorkflow();

  return {
    triggerN8NLeadFlow: async (data: LeadCaptureData) => {
      // Trigger async (non-blocking) — form already submitted
      leadCapture.mutate(data, {
        onSuccess: (result) => {
          console.log("[N8N] Lead capture workflow triggered:", result.executionId);
        },
      });
    },
    isTriggering: leadCapture.isPending,
  };
}
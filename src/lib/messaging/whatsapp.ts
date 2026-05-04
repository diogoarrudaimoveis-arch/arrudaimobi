/**
 * Messaging providers — WhatsApp abstraction layer.
 *
 * Strategy: allow swapping provider without touching call-sites.
 * Default provider: WaMeProvider (public wa.me, no API key required).
 *
 * ZPRO integration: ZproProvider for direct API integration with tracking.
 * ZPRO is activated via ZPRO_WHATSAPP_INSTANCE env var.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WhatsAppMessage {
  phone: string;
  message: string;
}

export interface WhatsAppProvider {
  readonly providerName: string;
  buildUrl(msg: WhatsAppMessage): string | null;
  /** Sends message and returns URL + analytics event. Never throws. */
  send(msg: WhatsAppMessage): Promise<{ url: string; event: string }>;
}

// ─── Normalization helpers ───────────────────────────────────────────────────

/** Normalize Brazilian phone for wa.me URL — strips non-digits, keeps 55 prefix. */
function normalizeForWaMe(phone: string | null | undefined): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

/** Normalize Brazilian phone for tel: link — adds + prefix. */
function normalizeForTel(phone: string | null | undefined): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
}

/** Normalize phone to E.164 format for ZPRO API. */
function normalizeForZpro(phone: string | null | undefined): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

// ─── WaMeProvider — public wa.me link (current default) ─────────────────────

export class WaMeProvider implements WhatsAppProvider {
  readonly providerName = "wa.me";

  buildUrl({ phone, message }: WhatsAppMessage): string | null {
    const normalized = normalizeForWaMe(phone);
    if (!normalized) return null;
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  }

  send(msg: WhatsAppMessage) {
    const url = this.buildUrl(msg);
    return Promise.resolve({ url: url ?? "", event: "whatsapp_click" });
  }
}

// ─── ZproProvider — direct ZPRO API integration with tracking ────────────────

export class ZproProvider implements WhatsAppProvider {
  readonly providerName = "zpro";

  private readonly baseUrl: string;
  private readonly instanceName: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_ZPRO_API_BASE_URL ?? "";
    this.instanceName = import.meta.env.VITE_ZPRO_WHATSAPP_INSTANCE ?? "";
  }

  /** Build wa.me fallback URL (used when ZPRO is not configured). */
  buildUrl({ phone, message }: WhatsAppMessage): string | null {
    if (!this.baseUrl || !this.instanceName) {
      // Fallback to wa.me if ZPRO not configured
      const wame = new WaMeProvider();
      return wame.buildUrl({ phone, message });
    }
    const normalized = normalizeForWaMe(phone);
    if (!normalized) return null;
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Send via ZPRO HTTP API.
   * Falls back to wa.me URL on error or when ZPRO is not configured.
   * Error is swallowed to never block the user flow.
   */
  async send(msg: WhatsAppMessage): Promise<{ url: string; event: string }> {
    if (!this.baseUrl || !this.instanceName) {
      // ZPRO not configured — fall back to wa.me
      const wame = new WaMeProvider();
      const url = wame.buildUrl(msg) ?? "";
      return { url, event: "whatsapp_click" };
    }

    try {
      const phoneNormalized = normalizeForZpro(msg.phone);
      const payload = {
        number: phoneNormalized,
        text: msg.message,
      };

      const response = await fetch(`${this.baseUrl}/message/sendText/${this.instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization header injected by reverse proxy or env-sidecar
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        // Non-2xx — log and fall back to wa.me
        console.warn(`[ZproProvider] send failed: ${response.status} ${response.statusText}`);
        const wame = new WaMeProvider();
        const url = wame.buildUrl(msg) ?? "";
        return { url, event: "whatsapp_click" };
      }

      // ZPRO success — return wa.me URL for user click-through (hybrid mode)
      const wame = new WaMeProvider();
      const url = wame.buildUrl(msg) ?? "";
      return { url, event: "whatsapp_click_zpro" };
    } catch (err) {
      // Network/timeout error — fail silently to wa.me
      console.warn("[ZproProvider] send error:", err);
      const wame = new WaMeProvider();
      const url = wame.buildUrl(msg) ?? "";
      return { url, event: "whatsapp_click" };
    }
  }
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

export function buildTelUrl(phone: string | null | undefined): string | null {
  const normalized = normalizeForTel(phone);
  return normalized ? `tel:${normalized}` : null;
}

export function buildMailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── Singleton exports ────────────────────────────────────────────────────────

export const whatsappProvider: WhatsAppProvider = new WaMeProvider();
export const zproProvider: WhatsAppProvider = new ZproProvider();
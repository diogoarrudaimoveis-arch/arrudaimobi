/**
 * Messaging providers — WhatsApp abstraction layer.
 *
 * Strategy: allow swapping provider without touching call-sites.
 * Default provider: WaMeProvider (public wa.me, no API key required).
 *
 * Future: ZPROProvider for direct API integration with tracking.
 */

export interface WhatsAppMessage {
  phone: string;
  message: string;
}

export interface WhatsAppProvider {
  readonly providerName: string;
  buildUrl(msg: WhatsAppMessage): string | null;
  /** Returns URL and event name for analytics. Never throws. */
  send(msg: WhatsAppMessage): Promise<{ url: string; event: string }>;
}

// ---------------------------------------------------------------------------
// Normalization helpers (mirrors PropertyDetail.tsx logic)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// WaMeProvider — public wa.me link (current behavior)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Utility helpers (mirror PropertyDetail.tsx helpers, reusable)
// ---------------------------------------------------------------------------

export function buildTelUrl(phone: string | null | undefined): string | null {
  const normalized = normalizeForTel(phone);
  return normalized ? `tel:${normalized}` : null;
}

export function buildMailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ---------------------------------------------------------------------------
// Default export singleton
// ---------------------------------------------------------------------------

export const whatsappProvider: WhatsAppProvider = new WaMeProvider();
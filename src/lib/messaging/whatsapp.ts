/**
 * Messaging providers — WhatsApp abstraction layer.
 *
 * Frontend seguro: links públicos wa.me apenas.
 * Qualquer envio real via ZPRO deve passar por Edge Function server-side.
 */

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

// ─── ZproProvider — safe placeholder ─────────────────────────────────────────
// Mantém compatibilidade de imports antigos, mas não chama ZPRO direto do browser.
// Envio real/CRM deve usar `src/lib/zpro-service.ts` → Supabase Edge Function `zpro-proxy`.
export class ZproProvider extends WaMeProvider {
  readonly providerName = "zpro-proxy-required";
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

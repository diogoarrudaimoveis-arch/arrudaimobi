/**
 * Messaging providers — WhatsApp abstraction layer.
 *
 * Strategy: allow swapping provider without touching call-sites.
 * Default provider: WaMeProvider (public wa.me, no API key required).
 * ZPROProvider for direct API integration with conversation tracking.
 *
 * Block 5d: Add WhatsApp template message logic + ZPROProvider implementation
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
// Normalization helpers
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
// ZPROProvider — direct WhatsApp API via ZPRO webhook
// ---------------------------------------------------------------------------

const ZPRO_WEBHOOK_URL = "https://conv.techatende.com.br/v2/api/external/8de34e32-1154-4479-8cc6-678456e1d741";
const ZPRO_API_TOKEN = import.meta.env.VITE_ZPRO_API_TOKEN || "";

export class ZPROProvider implements WhatsAppProvider {
  readonly providerName = "zpro";

  buildUrl({ phone, message }: WhatsAppMessage): string | null {
    // Fall back to wa.me if we can't build a proper WhatsApp click-to-chat URL
    const normalized = normalizeForWaMe(phone);
    if (!normalized) return null;
    // Return wa.me URL as fallback (user can still receive message via ZPRO webhook)
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  }

  async send(msg: WhatsAppMessage): Promise<{ url: string; event: string }> {
    const waUrl = this.buildUrl(msg) ?? "";

    if (!ZPRO_API_TOKEN) {
      console.warn("[ZPROProvider] No VITE_ZPRO_API_TOKEN — falling back to wa.me");
      return { url: waUrl, event: "zpro_fallback_wa.me" };
    }

    try {
      const response = await fetch(ZPRO_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ZPRO_API_TOKEN}`,
        },
        body: JSON.stringify({
          phone: msg.phone.replace(/\D/g, ""),
          message: msg.message,
          contactName: "",
          source: "arruda_imobi",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.warn(`[ZPROProvider] API error ${response.status}: ${errorText}`);
        return { url: waUrl, event: "zpro_api_error" };
      }

      return { url: waUrl, event: "zpro_whatsapp_sent" };
    } catch (err) {
      console.warn("[ZPROProvider] Network error, falling back to wa.me:", err);
      return { url: waUrl, event: "zpro_network_error" };
    }
  }
}

// ---------------------------------------------------------------------------
// WhatsApp Template Messages for Arruda Imobi
// ---------------------------------------------------------------------------

export interface WhatsAppTemplateContext {
  name: string;
  phone?: string;
  propertyTitle?: string;
  propertyUrl?: string;
  agentName?: string;
  visitDate?: string;
  visitTime?: string;
}

function vars(text: string, ctx: WhatsAppTemplateContext): string {
  return text
    .replace(/\{\{name\}\}/g, ctx.name || "")
    .replace(/\{\{phone\}\}/g, ctx.phone || "")
    .replace(/\{\{propertyTitle\}\}/g, ctx.propertyTitle || "")
    .replace(/\{\{propertyUrl\}\}/g, ctx.propertyUrl || "")
    .replace(/\{\{agentName\}\}/g, ctx.agentName || "")
    .replace(/\{\{visitDate\}\}/g, ctx.visitDate || "")
    .replace(/\{\{visitTime\}\}/g, ctx.visitTime || "");
}

/** Welcome template — sent after lead capture via N8N/ZPRO */
export function buildWelcomeTemplate(ctx: WhatsAppTemplateContext): string {
  return vars(
    `Olá {{name}}! 👋\n\n` +
    `Seu contato foi recebido pela *Arruda Imobi*.\n` +
    `Nossa equipe entrará em contato com você em breve!\n\n` +
    `🏠 Enquanto isso, explore nossos imóveis:\n` +
    `👉 https://www.arrudaimobi.com.br/imoveis\n\n` +
    `Qualquer dúvida, é só responder aqui no WhatsApp.`,
    ctx
  );
}

/** Property interest template — sent after contact form submission */
export function buildPropertyInterestTemplate(ctx: WhatsAppTemplateContext): string {
  return vars(
    `Olá {{name}}! 🏠\n\n` +
    `Recebemos seu interesse no imóvel *{{propertyTitle}}*.\n` +
    `Um corretor entrará em contato com você em breve.\n\n` +
    `📎 Enquanto isso, veja mais detalhes:\n` +
    `👉 {{propertyUrl}}\n\n` +
    `Agradecemos o contato!`,
    ctx
  );
}

/** Catalog request template — sent after catalog form submission */
export function buildCatalogTemplate(ctx: WhatsAppTemplateContext): string {
  return vars(
    `Olá {{name}}! 📚\n\n` +
    `Recebemos sua solicitação de catálogo personalizado.\n` +
    `Em instantes você receberá uma seleção de imóveis no WhatsApp.\n\n` +
    `🔥 Enquanto isso, confira nosso portfólio completo:\n` +
    `👉 https://www.arrudaimobi.com.br/imoveis\n\n` +
    `Estamos à disposição!`,
    ctx
  );
}

/** Visit confirmation template */
export function buildVisitConfirmationTemplate(ctx: WhatsAppTemplateContext): string {
  return vars(
    `Olá {{name}}! 📅\n\n` +
    `Sua visita foi agendada com sucesso!\n\n` +
    `📍 Imóvel: {{propertyTitle}}\n` +
    `🗓 Data: {{visitDate}}\n` +
    `🕐 Horário: {{visitTime}}\n` +
    `👨‍💼 Corretor: {{agentName}}\n\n` +
    `Estamos aguardando você!`,
    ctx
  );
}

/** Reminder template — sent before visit */
export function buildVisitReminderTemplate(ctx: WhatsAppTemplateContext): string {
  return vars(
    `⏰ Lembrete de visita!\n\n` +
    `Olá {{name}}, sua visita está agendada para hoje:\n\n` +
    `📍 Imóvel: {{propertyTitle}}\n` +
    `🕐 Horário: {{visitTime}}\n` +
    `👨‍💼 Corretor: {{agentName}}\n\n` +
    `Até lá! 🏠`,
    ctx
  );
}

/** Follow-up template — sent 24h after unanswered lead */
export function buildFollowUpTemplate(ctx: WhatsAppTemplateContext): string {
  return vars(
    `Olá {{name}}, tudo bem? 👋\n\n` +
    `Estamos passando para saber se você tem alguma dúvida sobre o imóvel que chamou sua atenção.\n\n` +
    `Ficamos à disposição para ajudar! 🏠`,
    ctx
  );
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

export function buildTelUrl(phone: string | null | undefined): string | null {
  const normalized = normalizeForTel(phone);
  return normalized ? `tel:${normalized}` : null;
}

export function buildMailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ---------------------------------------------------------------------------
// Default export singleton — prefer ZPRO when token is available
// ---------------------------------------------------------------------------

export const whatsappProvider: WhatsAppProvider =
  ZPRO_API_TOKEN ? new ZPROProvider() : new WaMeProvider();
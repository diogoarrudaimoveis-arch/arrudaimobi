/**
 * ZPRO WhatsApp Integration — API Client
 * Block 6a: WhatsApp webhook receiver setup
 *
 * Handles sending/receiving WhatsApp messages via ZPRO API.
 * ZPRO API docs: https://conv.techatende.com.br
 */
import { ZPRO_CONFIG, ZPROIncomingMessage, ZPROOutgoingMessage, ZPROSessionInfo, ZPROOptStatus } from "./types";

// ---------------------------------------------------------------------------
// Core API client
// ---------------------------------------------------------------------------

async function zproRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${ZPRO_CONFIG.webhookUrl.replace("/external/", "/api/")}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ZPRO_CONFIG.apiToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`ZPRO API ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Message sending
// ---------------------------------------------------------------------------

export interface ZPROMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a WhatsApp message via ZPRO API
 */
export async function sendZPROMessage(
  msg: ZPROOutgoingMessage
): Promise<ZPROMessageResponse> {
  if (!ZPRO_CONFIG.apiToken) {
    return { success: false, error: "VITE_ZPRO_API_TOKEN not configured" };
  }

  try {
    const result = await zproRequest<{ success: boolean; id?: string }>(
      "/messages/send",
      {
        method: "POST",
        body: JSON.stringify({
          phone: msg.phone.replace(/\D/g, ""),
          message: msg.message,
          contactName: msg.contactName || "",
          source: msg.source || ZPRO_CONFIG.source,
        }),
      }
    );

    return { success: result.success, messageId: result.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    console.warn("[ZPRO] sendMessage failed:", message);
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

/**
 * Get active session info for a phone number
 */
export async function getZPROSession(
  phone: string
): Promise<ZPROSessionInfo | null> {
  try {
    const normalized = phone.replace(/\D/g, "");
    const result = await zproRequest<ZPROSessionInfo>(
      `/sessions/${normalized}`
    );
    return result;
  } catch {
    return null;
  }
}

/**
 * End an active ZPRO session
 */
export async function endZPROSession(sessionId: string): Promise<boolean> {
  try {
    await zproRequest(`/sessions/${sessionId}/end`, { method: "POST" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Opt-in / Opt-out management
// ---------------------------------------------------------------------------

/**
 * Check if a phone number is opted in to WhatsApp messaging
 */
export async function getZPROOptStatus(
  phone: string
): Promise<ZPROOptStatus | null> {
  try {
    const normalized = phone.replace(/\D/g, "");
    return await zproRequest<ZPROOptStatus>(`/opt/${normalized}`);
  } catch {
    return null;
  }
}

/**
 * Opt-out a phone number from WhatsApp messaging
 */
export async function optOutZPRO(phone: string): Promise<boolean> {
  try {
    const normalized = phone.replace(/\D/g, "");
    await zproRequest(`/opt/${normalized}/out`, { method: "POST" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Opt-in a phone number (re-subscribe)
 */
export async function optInZPRO(phone: string): Promise<boolean> {
  try {
    const normalized = phone.replace(/\D/g, "");
    await zproRequest(`/opt/${normalized}/in`, { method: "POST" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Webhook verification (for incoming webhooks)
// ---------------------------------------------------------------------------

/**
 * Verify ZPRO webhook payload signature
 * ZPRO sends a X-ZPRO-Signature header for verification
 */
export function verifyZPROSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature || !ZPRO_CONFIG.apiToken) return false;

  // Simple verification: compare token prefix (extend with proper HMAC if needed)
  // In production, use: crypto.createHmac("sha256", secret).update(payload).digest("hex")
  const expected = ZPRO_CONFIG.apiToken.slice(0, 16);
  return signature.startsWith(expected);
}

// ---------------------------------------------------------------------------
// Incoming message parser
// ---------------------------------------------------------------------------

/**
 * Parse raw ZPRO webhook payload into structured ZPROIncomingMessage
 */
export function parseZPROIncomingMessage(body: unknown): ZPROIncomingMessage | null {
  try {
    const raw = body as Record<string, unknown>;

    // Handle common ZPRO payload shapes
    const phone = String(raw.phone || raw.from || raw.from_number || "");
    const message = String(raw.message || raw.text || raw.body || "");
    const messageId = String(raw.messageId || raw.id || raw.msg_id || "");
    const timestamp = String(
      raw.timestamp || raw.time || raw.created_at || new Date().toISOString()
    );
    const sessionId = String(raw.sessionId || raw.session_id || "");
    const contactName = String(raw.contactName || raw.name || raw.contact_name || "");

    if (!phone || !message) return null;

    return {
      phone,
      contactName: contactName || undefined,
      message,
      messageId: messageId || undefined,
      timestamp,
      sessionId: sessionId || undefined,
      source: (raw.source as ZPROIncomingMessage["source"]) || "whatsapp",
      mediaUrl: raw.mediaUrl as string | undefined,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function checkZPROHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    await fetch(ZPRO_CONFIG.webhookUrl.replace("/external/", "/health/"), {
      signal: controller.signal,
    });

    clearTimeout(timer);
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
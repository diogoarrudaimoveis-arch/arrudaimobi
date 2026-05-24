/**
 * ZPRO WhatsApp Integration — Type Definitions
 * Block 6a: WhatsApp webhook receiver setup
 */

export interface ZPROWebhookEvent {
  event: "message" | "session_started" | "session_ended" | "status_update";
  sessionId?: string;
  phone: string;
  contactName?: string;
  message?: string;
  messageId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ZPROIncomingMessage {
  phone: string;
  contactName?: string;
  message: string;
  messageId?: string;
  timestamp: string;
  sessionId?: string;
  source?: "whatsapp" | "web" | "api";
  mediaUrl?: string;
}

export interface ZPROOutgoingMessage {
  phone: string;
  message: string;
  contactName?: string;
  source?: string;
}

export interface ZPROSessionInfo {
  sessionId: string;
  phone: string;
  contactName?: string;
  startedAt: string;
  status: "active" | "ended" | "waiting";
  lastMessageAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ZPROOptStatus {
  phone: string;
  optedIn: boolean;
  optedInAt?: string;
  optedOutAt?: string;
}

export interface ZPROConversationContext {
  phone: string;
  contactName?: string;
  sessionId: string;
  recentMessages: ZPROIncomingMessage[];
  propertyInquiry?: {
    propertyId?: string | number;
    propertyTitle?: string;
  };
  leadSource?: string;
  lastContactAt?: string;
}

// ZPRO API configuration
export const ZPRO_CONFIG = {
  webhookUrl: "https://conv.techatende.com.br/v2/api/external/8de34e32-1154-4479-8cc6-678456e1d741",
  apiToken: import.meta.env.VITE_ZPRO_API_TOKEN || "",
  source: "arruda_imobi",
} as const;

export type ZPROEventType = ZPROWebhookEvent["event"];
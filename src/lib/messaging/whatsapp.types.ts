/**
 * Messaging types — separated to allow clean imports without circular deps.
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
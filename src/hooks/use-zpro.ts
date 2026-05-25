/**
 * useZPRO — React hooks for ZPRO WhatsApp integration
 * Block 6c: Session management for conversations
 */
import { useCallback, useRef } from "react";
import {
  sendZPROMessage,
  getZPROSession,
  endZPROSession,
  getZPROOptStatus,
  optOutZPRO,
  optInZPRO,
  parseZPROIncomingMessage,
  type ZPROMessageResponse,
} from "@/integrations/zpro/client";
import type {
  ZPROSessionInfo,
  ZPROOptStatus,
  ZPROIncomingMessage,
} from "@/integrations/zpro/types";

// ---------------------------------------------------------------------------
// Session store (in-memory per browser session)
// ---------------------------------------------------------------------------

interface ZPROConversation {
  phone: string;
  contactName?: string;
  sessionId: string;
  messages: ZPROIncomingMessage[];
  lastContactAt: string;
}

const conversations = new Map<string, ZPROConversation>();

export function getConversation(phone: string): ZPROConversation | undefined {
  const normalized = phone.replace(/\D/g, "");
  return conversations.get(normalized);
}

export function upsertConversation(msg: ZPROIncomingMessage): ZPROConversation {
  const normalized = msg.phone.replace(/\D/g, "");
  const existing = conversations.get(normalized);
  if (existing) {
    existing.messages.push(msg);
    existing.lastContactAt = msg.timestamp;
    return existing;
  }
  const conv: ZPROConversation = {
    phone: msg.phone,
    contactName: msg.contactName,
    sessionId: msg.sessionId || `session-${normalized}`,
    messages: [msg],
    lastContactAt: msg.timestamp,
  };
  conversations.set(normalized, conv);
  return conv;
}

// ---------------------------------------------------------------------------
// useZPROSendMessage — send WhatsApp message via ZPRO
// ---------------------------------------------------------------------------

export function useZPROSendMessage() {
  const sendingRef = useRef(false);

  const sendMessage = useCallback(
    async (
      phone: string,
      message: string,
      contactName?: string
    ): Promise<ZPROMessageResponse> => {
      if (sendingRef.current) {
        return { success: false, error: "Already sending a message" };
      }
      sendingRef.current = true;
      try {
        const result = await sendZPROMessage({ phone, message, contactName });
        return result;
      } finally {
        sendingRef.current = false;
      }
    },
    []
  );

  return { sendMessage };
}

// ---------------------------------------------------------------------------
// useZPROSession — manage active WhatsApp session for a phone
// ---------------------------------------------------------------------------

export function useZPROSession() {
  const fetchSession = useCallback(async (phone: string): Promise<ZPROSessionInfo | null> => {
    return getZPROSession(phone);
  }, []);

  const endSession = useCallback(async (sessionId: string): Promise<boolean> => {
    return endZPROSession(sessionId);
  }, []);

  return { fetchSession, endSession };
}

// ---------------------------------------------------------------------------
// useZPROOpt — manage WhatsApp opt-in/opt-out for a phone
// ---------------------------------------------------------------------------

export function useZPROOpt() {
  const checkOptStatus = useCallback(async (phone: string): Promise<ZPROOptStatus | null> => {
    return getZPROOptStatus(phone);
  }, []);

  const optOut = useCallback(async (phone: string): Promise<boolean> => {
    return optOutZPRO(phone);
  }, []);

  const optIn = useCallback(async (phone: string): Promise<boolean> => {
    return optInZPRO(phone);
  }, []);

  return { checkOptStatus, optOut, optIn };
}

// ---------------------------------------------------------------------------
// useZPROConversation — track conversation history with a contact
// ---------------------------------------------------------------------------

export function useZPROConversation(phone: string) {
  const getConversationHistory = useCallback((): ZPROIncomingMessage[] => {
    const conv = getConversation(phone);
    return conv?.messages || [];
  }, [phone]);

  const injectIncomingMessage = useCallback((rawBody: unknown): ZPROIncomingMessage | null => {
    const msg = parseZPROIncomingMessage(rawBody);
    if (msg) {
      upsertConversation(msg);
    }
    return msg;
  }, []);

  const lastContactAt = useCallback((): string | null => {
    const conv = getConversation(phone);
    return conv?.lastContactAt || null;
  }, [phone]);

  return { getConversationHistory, injectIncomingMessage, lastContactAt };
}
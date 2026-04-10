import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

interface ConsentRecord {
  preferences: CookiePreferences;
  consentedAt: string;
  version: string;
  sessionId: string;
}

interface CookieConsentContextType {
  preferences: CookiePreferences;
  hasConsented: boolean;
  consentedAt: string | null;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (prefs: CookiePreferences) => void;
  revokeConsent: () => void;
  showBanner: boolean;
  setShowBanner: (v: boolean) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
}

const STORAGE_KEY = "cookie_consent_v1";
const SESSION_KEY = "cookie_session_id";
const CONSENT_VERSION = "1.0";

const defaultPreferences: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  functional: false,
};

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

async function persistToDb(prefs: CookiePreferences, action: string) {
  try {
    await supabase.functions.invoke("save-consent", {
      body: {
        session_id: getSessionId(),
        preferences: prefs,
        consent_version: CONSENT_VERSION,
        action,
      },
    });
  } catch (err) {
    console.warn("Failed to persist cookie consent to DB:", err);
  }
}

const CookieConsentContext = createContext<CookieConsentContextType | null>(null);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const [hasConsented, setHasConsented] = useState(false);
  const [consentedAt, setConsentedAt] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const record: ConsentRecord = JSON.parse(stored);
        setPreferences({ ...record.preferences, essential: true });
        setHasConsented(true);
        setConsentedAt(record.consentedAt);
      } else {
        setShowBanner(true);
      }
    } catch {
      setShowBanner(true);
    }
  }, []);

  const persist = useCallback((prefs: CookiePreferences, action: string) => {
    const now = new Date().toISOString();
    const safePrefs = { ...prefs, essential: true };
    const record: ConsentRecord = {
      preferences: safePrefs,
      consentedAt: now,
      version: CONSENT_VERSION,
      sessionId: getSessionId(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setPreferences(safePrefs);
    setHasConsented(true);
    setConsentedAt(now);
    setShowBanner(false);
    setShowSettings(false);
    persistToDb(safePrefs, action);
  }, []);

  const acceptAll = useCallback(() => {
    persist({ essential: true, analytics: true, marketing: true, functional: true }, "accept_all");
  }, [persist]);

  const rejectNonEssential = useCallback(() => {
    persist({ essential: true, analytics: false, marketing: false, functional: false }, "reject_non_essential");
  }, [persist]);

  const savePreferences = useCallback((prefs: CookiePreferences) => {
    persist(prefs, "custom");
  }, [persist]);

  const revokeConsent = useCallback(() => {
    persistToDb(defaultPreferences, "revoke");
    localStorage.removeItem(STORAGE_KEY);
    setPreferences(defaultPreferences);
    setHasConsented(false);
    setConsentedAt(null);
    setShowBanner(true);
  }, []);

  return (
    <CookieConsentContext.Provider
      value={{
        preferences,
        hasConsented,
        consentedAt,
        acceptAll,
        rejectNonEssential,
        savePreferences,
        revokeConsent,
        showBanner,
        setShowBanner,
        showSettings,
        setShowSettings,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error("useCookieConsent must be used within CookieConsentProvider");
  return ctx;
}

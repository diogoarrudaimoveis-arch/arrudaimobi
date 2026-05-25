// Meta Pixel Integration — READ-ONLY client-side
// Wraps window.fbq with typed event helpers + safe guardrails
// Fires events to Meta Pixel ID configured in TrackingScripts / tenant settings

export interface MetaPixelEventData {
  property_id?: string;
  property_title?: string;
  price?: number;
  currency?: string;
  content_category?: string;
  content_type?: string;
  content_ids?: string[];
  [key: string]: unknown;
}

// ─── Safe fbq caller ─────────────────────────────────────────────────────────

declare global {
  interface Window {
    fbq?: {
      (command: "track", eventName: string, data?: MetaPixelEventData): void;
      (command: "init", pixelId: string, options?: Record<string, unknown>): void;
      push: unknown[];
      loaded: boolean;
      version: string;
    };
  }
}

function safeFbq(eventName: string, data?: MetaPixelEventData): void {
  if (typeof window === "undefined") return;
  const fbq = window.fbq;
  if (typeof fbq === "function") {
    try {
      fbq("track", eventName, data);
    } catch {
      // Silently ignore — pixel should never crash the app
    }
  }
}

// ─── Standard events ──────────────────────────────────────────────────────────

/**
 * PageView — fires automatically via TrackingScripts.tsx on every page.
 * Call this manually only if you need to suppress automatic firing.
 */
export function trackPageView(): void {
  safeFbq("PageView");
}

/**
 * ViewContent — when a property detail page loads.
 * @param propertyId - Internal property ID
 * @param propertyTitle - Property listing title
 * @param price - Listed price in BRL cents (optional)
 */
export function trackViewContent(
  propertyId: string,
  propertyTitle: string,
  price?: number
): void {
  safeFbq("ViewContent", {
    content_name: propertyTitle,
    content_category: "real_estate",
    content_type: "property",
    content_ids: [propertyId],
    ...(price ? { value: price, currency: "BRL" } : {}),
    property_id: propertyId,
    property_title: propertyTitle,
  });
}

/**
 * Lead — when a user submits an inquiry form or clicks WhatsApp/phone.
 * @param propertyId - Internal property ID
 * @param propertyTitle - Property listing title
 */
export function trackLead(propertyId: string, propertyTitle: string): void {
  safeFbq("Lead", {
    content_category: "real_estate",
    content_type: "property",
    content_ids: [propertyId],
    property_id: propertyId,
    property_title: propertyTitle,
  });
}

/**
 * Contact — when a user clicks contact links (phone, email, WhatsApp).
 * Used alongside Lead — Contact = link click, Lead = form submission.
 * @param propertyId - Internal property ID
 * @param propertyTitle - Property listing title
 */
export function trackContact(propertyId: string, propertyTitle: string): void {
  safeFbq("Contact", {
    content_category: "real_estate",
    content_type: "property",
    content_ids: [propertyId],
    property_id: propertyId,
    property_title: propertyTitle,
  });
}

/**
 * InitiateCheckout — when a user starts a contact/booking flow.
 */
export function trackInitiateCheckout(
  propertyId: string,
  propertyTitle: string
): void {
  safeFbq("InitiateCheckout", {
    content_category: "real_estate",
    content_type: "property",
    content_ids: [propertyId],
    property_id: propertyId,
    property_title: propertyTitle,
  });
}

/**
 * CompleteRegistration — for future lead capture with signup.
 */
export function trackCompleteRegistration(
  email: string,
  propertyId?: string
): void {
  safeFbq("CompleteRegistration", {
    content_category: "real_estate",
    ...(propertyId ? { property_id: propertyId } : {}),
    ...(email ? { email } : {}),
  });
}

/**
 * Custom event — for any non-standard tracking need.
 */
export function trackCustom(
  eventName: string,
  data?: MetaPixelEventData
): void {
  safeFbq(eventName, data);
}
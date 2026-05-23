import { useEffect, useRef } from "react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { useTenantSettings } from "@/hooks/use-tenant-settings";

/**
 * Conditionally loads analytics/marketing scripts based on cookie consent.
 * Reads GA ID and Facebook Pixel ID from tenant settings.
 * Place this component inside Layout (after CookieConsentProvider).
 */
export function ConditionalScripts() {
  const { preferences, hasConsented } = useCookieConsent();
  const { data: tenant } = useTenantSettings();
  const gaLoaded = useRef(false);
  const fbLoaded = useRef(false);

  const settings = (tenant?.settings || {}) as Record<string, string>;
  const gaId = settings.google_analytics_id;
  const fbPixelId = settings.facebook_pixel_id;

  // Google Analytics — requires analytics consent
  useEffect(() => {
    if (!hasConsented || !preferences.analytics || !gaId || gaLoaded.current) return;

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    script.async = true;
    document.head.appendChild(script);

    const inline = document.createElement("script");
    inline.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', { anonymize_ip: true });
    `;
    document.head.appendChild(inline);
    gaLoaded.current = true;
  }, [hasConsented, preferences.analytics, gaId]);

  // Facebook Pixel — requires marketing consent
  useEffect(() => {
    if (!hasConsented || !preferences.marketing || !fbPixelId || fbLoaded.current) return;

    const inline = document.createElement("script");
    inline.textContent = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${fbPixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(inline);
    fbLoaded.current = true;
  }, [hasConsented, preferences.marketing, fbPixelId]);

  return null;
}

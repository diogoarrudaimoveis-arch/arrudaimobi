import { Helmet } from "react-helmet-async";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { useTrackingSettings } from "@/hooks/use-tracking-settings";
import { useEffect } from "react";

export function TrackingScripts() {
  const { preferences, hasConsented } = useCookieConsent();
  const { data: settings } = useTrackingSettings();

  useEffect(() => {
    if (settings && process.env.NODE_ENV === 'development') {
      const activeTags = [];
      if (settings.meta_pixel_id) activeTags.push("Meta Pixel");
      if (settings.ga4_id) activeTags.push("GA4");
      if (settings.gtm_id) activeTags.push("GTM");
      if (settings.tiktok_pixel_id) activeTags.push("TikTok");
      if (settings.pinterest_tag_id) activeTags.push("Pinterest");
      
      if (activeTags.length > 0) {
        console.log(`[Tracking] IDs Ativos: ${activeTags.join(", ")}`);
      }
    }
  }, [settings]);

  if (!settings) return null;

  const showAnalytics = hasConsented && preferences.analytics;
  const showMarketing = hasConsented && preferences.marketing;

  return (
    <>
      <Helmet>
        {/* Google Analytics 4 (Analíticos) */}
        {showAnalytics && settings.ga4_id && (
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${settings.ga4_id}`} />
        )}
        {showAnalytics && settings.ga4_id && (
          <script>
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${settings.ga4_id}', { anonymize_ip: true });
            `}
          </script>
        )}

        {/* Google Tag Manager (Marketing) */}
        {showMarketing && settings.gtm_id && (
          <script>
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${settings.gtm_id}');
            `}
          </script>
        )}

        {/* Meta Pixel (Marketing) */}
        {showMarketing && settings.meta_pixel_id && (
          <script>
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${settings.meta_pixel_id}');
              fbq('track', 'PageView');
            `}
          </script>
        )}

        {/* TikTok Pixel (Marketing) */}
        {showMarketing && settings.tiktok_pixel_id && (
          <script>
            {`
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","setAlias","load","reset","instance"],ttq.setAlias=function(t,e){ttq._alias=ttq._alias||{},ttq._alias[t]=e};for(var i=0;i<ttq.methods.length;i++)ttq[ttq.methods[i]]=function(t){return function(){ttq.push([t].concat(Array.prototype.slice.call(arguments,0)))}}(ttq.methods[i]);ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n;var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=r+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                ttq.load('${settings.tiktok_pixel_id}');
                ttq.page();
              }(window, document, 'ttq');
            `}
          </script>
        )}

        {/* Pinterest Tag (Marketing) */}
        {showMarketing && settings.pinterest_tag_id && (
          <script>
            {`
              !function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
              pintrk('load', '${settings.pinterest_tag_id}');
              pintrk('page');
            `}
          </script>
        )}
      </Helmet>

      {/* NoScripts components */}
      {showMarketing && settings.gtm_id && (
        <noscript>
          <iframe 
            src={`https://www.googletagmanager.com/ns.html?id=${settings.gtm_id}`}
            height="0" 
            width="0" 
            style={{ display: 'none', visibility: 'hidden' }} 
          />
        </noscript>
      )}

      {showMarketing && settings.meta_pixel_id && (
        <noscript>
          <img 
            height="1" 
            width="1" 
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${settings.meta_pixel_id}&ev=PageView&noscript=1`}
          />
        </noscript>
      )}
    </>
  );
}

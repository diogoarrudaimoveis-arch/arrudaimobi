import { Header } from "./Header";
import { Footer } from "./Footer";
import { ScrollToTop } from "./ScrollToTop";
import { CookieConsent } from "@/components/cookie/CookieConsent";
import { ConditionalScripts } from "@/components/cookie/ConditionalScripts";
import { TrackingScripts } from "@/components/marketing/TrackingScripts";
import { WhatsAppFloat } from "@/components/marketing/WhatsAppFloat";
import { Helmet } from "react-helmet-async";
import { useTenantSettings } from "@/hooks/use-tenant-settings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { data: tenant } = useTenantSettings();
  
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-public", tenant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("favicon_url, seo_title, seo_description, seo_image_url")
        .eq("tenant_id", tenant?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!tenant?.id,
  });

  const title = siteSettings?.seo_title || "Arruda Imobi | Sua Plataforma de Gestão Imobiliária em MG";
  const description = siteSettings?.seo_description || "Sua plataforma completa para encontrar o imóvel ideal. Conectamos você aos melhores agentes e propriedades do mercado.";

  return (
    <div className="flex min-h-screen flex-col min-w-0">
      <Helmet>
        {siteSettings?.favicon_url ? (
          <link rel="icon" href={`${siteSettings.favicon_url}?t=${Date.now()}`} />
        ) : (
          <link rel="icon" href="/favicon.svg" />
        )}
        <title>{title}</title>
        <meta name="description" content={description} />
        
        {/* Open Graph para WhatsApp e Redes Sociais */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {siteSettings?.seo_image_url ? (
          <meta property="og:image" content={siteSettings.seo_image_url} />
        ) : (
          <meta property="og:image" content="https://arrudaimobi.com.br/branding/og-image.png" />
        )}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {siteSettings?.seo_image_url ? (
          <meta name="twitter:image" content={siteSettings.seo_image_url} />
        ) : (
          <meta name="twitter:image" content="https://arrudaimobi.com.br/branding/og-image.png" />
        )}

        <link rel="canonical" href={`https://www.arrudaimobi.com.br${location.pathname}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["RealEstateAgent", "Organization", "LocalBusiness"],
            "name": "Arruda Imobi",
            "url": "https://www.arrudaimobi.com.br",
            "telephone": "+55 31 99791-8717",
            "image": siteSettings?.seo_image_url || ""
          })}
        </script>
      </Helmet>
      <Header />
      <main className="flex-1 min-w-0">{children}</main>
      <Footer />
      <ScrollToTop />
      <CookieConsent />
      <ConditionalScripts />
      <TrackingScripts />
      <WhatsAppFloat />
    </div>
  );
}

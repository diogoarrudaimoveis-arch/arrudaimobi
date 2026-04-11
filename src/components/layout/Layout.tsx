import { Header } from "./Header";
import { Footer } from "./Footer";
import { ScrollToTop } from "./ScrollToTop";
import { CookieConsent } from "@/components/cookie/CookieConsent";
import { ConditionalScripts } from "@/components/cookie/ConditionalScripts";
import { TrackingScripts } from "@/components/marketing/TrackingScripts";
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

  const title = siteSettings?.seo_title || "Arruda Imobi";
  const description = siteSettings?.seo_description || "Descubra os melhores imóveis disponíveis para você com a Arruda Imobi.";

  return (
    <div className="flex min-h-screen flex-col">
      <Helmet>
        {siteSettings?.favicon_url && (
          <link rel="icon" href={`${siteSettings.favicon_url}?t=${Date.now()}`} />
        )}
        <title>{title}</title>
        <meta name="description" content={description} />
        
        {/* Open Graph para WhatsApp e Redes Sociais */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {siteSettings?.seo_image_url && (
          <meta property="og:image" content={`${siteSettings.seo_image_url}?v=${Date.now()}`} />
        )}
      </Helmet>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ScrollToTop />
      <CookieConsent />
      <ConditionalScripts />
      <TrackingScripts />
    </div>
  );
}

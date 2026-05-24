import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { usePublicProperty } from "@/hooks/use-properties";
import { PropertyContactForm } from "@/components/properties/PropertyContactForm";
import { formatCurrency, formatArea } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTenantSettings } from "@/hooks/use-tenant-settings";
import {
  MapPin, BedDouble, Bath, Car, Maximize, Phone, Mail, MessageCircle,
  ChevronLeft, ChevronRight, Share2, Heart, ArrowLeft, Play,
  Instagram, Facebook, Grid3X3, Maximize2, Home, Calculator
} from "lucide-react";
import { useState, useEffect } from "react";
import { Lightbox } from "@/components/properties/Lightbox";
import { extractYouTubeId, getYouTubeThumbnail } from "@/lib/youtube";
import { useFavorites } from "@/contexts/FavoritesContext";
import { shareProperty } from "@/lib/share";
import { whatsappProvider, buildTelUrl, buildMailtoUrl } from "@/lib/messaging";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { PropertyCardDb } from "@/components/properties/PropertyCardDb";
import { useQuery } from "@tanstack/react-query";

function getUniqueIds(ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.filter(Boolean))) as string[];
}

// JSON-LD structured data for SEO
function buildStructuredData(property: {
  id: string;
  title: string;
  description: string | null;
  price: number;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  areaUseful: number | null;
  area: number | null;
  images: Array<{ url: string; alt: string | null }>;
  propertyType: { name: string } | null;
  purpose: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": property.title,
    "description": property.description,
    "url": `https://www.arrudaimobi.com.br/imoveis/${property.id}`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": property.address,
      "addressLocality": property.city,
      "addressRegion": property.state,
      "addressCountry": "BR"
    },
    "geo": property.latitude && property.longitude ? {
      "@type": "GeoCoordinates",
      "latitude": property.latitude,
      "longitude": property.longitude
    } : undefined,
    "numberOfRooms": property.bedrooms,
    "numberOfBathroomsTotal": property.bathrooms,
    "parking": property.garages ? { "@type": "ParkingFacility", "numberOfSpaces": property.garages } : undefined,
    "floorSize": property.areaUseful ?? property.area ? {
      "@type": "QuantitativeValue",
      "value": property.areaUseful ?? property.area,
      "unitCode": "MTK"
    } : undefined,
    "image": property.images?.[0]?.url,
    "offers": {
      "@type": "Offer",
      "price": property.price,
      "priceCurrency": "BRL",
      "availability": "https://schema.org/InStock"
    },
    "propertyType": property.propertyType?.name,
    "transactionType": property.purpose === "sale" ? "ForSale" : "ForRent"
  };
}

// Fetch similar properties
function useSimilarProperties(tenantId: string, propertyId: string, purpose: string, propertyTypeId: string | null) {
  return useQuery({
    queryKey: ["similar-properties", tenantId, propertyId, purpose, propertyTypeId],
    queryFn: async () => {
      const params = new URLSearchParams({
        action: "list_properties",
        tenant_id: tenantId,
        limit: "4",
        ...(purpose === "sale" ? { purpose: "sale" } : { purpose: "rent" })
      });
      const res = await fetch(`https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/public-api?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.properties || []).filter((p: { id: string }) => p.id !== propertyId).slice(0, 3);
    },
    enabled: !!tenantId && !!propertyId,
    staleTime: 5 * 60 * 1000,
  });
}

const PropertyDetail = () => {
  const { id } = useParams();
  const { data: property, isLoading } = usePublicProperty(id);
  const [currentImage, setCurrentImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { data: tenantSettings } = useTenantSettings();

  const globalMetaPixel = tenantSettings?.settings?.meta_pixel_id || null;
  const globalGoogleAdsId = tenantSettings?.settings?.ga4_id || null;
  const globalTiktokPixel = tenantSettings?.settings?.tiktok_pixel_id || null;
  const globalPinterestTag = tenantSettings?.settings?.pinterest_tag_id || null;

  const propertyPixels = property?.marketing_pixels || {};
  const propertyFacebookPixel = property?.facebookPixel || propertyPixels.meta || null;
  const propertyGoogleAdsId = property?.googleAdsId || propertyPixels.google || null;
  const propertyTiktokPixel = property?.tiktokPixel || propertyPixels.tiktok || null;
  const propertyPinterestTag = property?.pinterestTag || propertyPixels.pinterest || null;

  const similarProps = useSimilarProperties(
    property?.tenantId || "",
    property?.id || "",
    property?.purpose || "sale",
    property?.propertyType?.id || null
  );

  const trackMarketingEvent = (eventName: string, eventData: Record<string, unknown> = {}) => {
    if (typeof window === "undefined") return;

    const fbq = (window as unknown as Record<string, unknown>).fbq as ((...args: unknown[]) => void) | undefined;
    const gtag = (window as unknown as Record<string, unknown>).gtag as ((...args: unknown[]) => void) | undefined;
    const ttq = (window as unknown as Record<string, unknown>).ttq as { instance?: (id: string) => { track?: (name: string) => void }; track?: (name: string) => void } | undefined;
    const pintrk = (window as unknown as Record<string, unknown>).pintrk as ((...args: unknown[]) => void) | undefined;

    const googleIds = getUniqueIds([globalGoogleAdsId, propertyGoogleAdsId]);
    const tiktokIds = getUniqueIds([globalTiktokPixel, propertyTiktokPixel]);
    const pinterestIds = getUniqueIds([globalPinterestTag, propertyPinterestTag]);

    if (fbq) {
      fbq("track", eventName, eventData);
    }

    if (gtag) {
      googleIds.forEach((id) => {
        gtag("event", eventName, { send_to: id, event_category: "engagement", event_label: property?.id, ...eventData });
      });
    }

    if (ttq) {
      if (typeof ttq.instance === "function") {
        tiktokIds.forEach((tid) => {
          if (tid === globalTiktokPixel) {
            ttq.track?.(eventName);
          } else {
            ttq.instance(tid)?.track?.(eventName);
          }
        });
      } else {
        ttq.track?.(eventName);
      }
    }

    if (pintrk) {
      pintrk("track", eventName);
    }
  };

  useEffect(() => {
    if (!property) return;

    const scripts: HTMLScriptElement[] = [];
    const shouldInitMeta = propertyFacebookPixel && propertyFacebookPixel !== globalMetaPixel;
    const shouldInitGoogle = propertyGoogleAdsId && propertyGoogleAdsId !== globalGoogleAdsId;
    const shouldInitTikTok = propertyTiktokPixel && propertyTiktokPixel !== globalTiktokPixel;
    const shouldInitPinterest = propertyPinterestTag && propertyPinterestTag !== globalPinterestTag;

    if (!shouldInitMeta && !shouldInitGoogle && !shouldInitTikTok && !shouldInitPinterest) {
      return;
    }

    if (shouldInitMeta) {
      console.log("[MARKETING] Inicializando Pixel específico do imóvel:", propertyFacebookPixel);
      const script = document.createElement("script");
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${propertyFacebookPixel}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
      scripts.push(script);
    }

    if (shouldInitGoogle) {
      console.log("[MARKETING] Inicializando Google Ads específico do imóvel:", propertyGoogleAdsId);
      const scriptOuter = document.createElement("script");
      scriptOuter.src = `https://www.googletagmanager.com/gtag/js?id=${propertyGoogleAdsId}`;
      scriptOuter.async = true;
      document.head.appendChild(scriptOuter);
      scripts.push(scriptOuter);

      const scriptInner = document.createElement("script");
      scriptInner.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${propertyGoogleAdsId}');
      `;
      document.head.appendChild(scriptInner);
      scripts.push(scriptInner);
    }

    if (shouldInitTikTok) {
      console.log("[MARKETING] Inicializando TikTok Pixel específico do imóvel:", propertyTiktokPixel);
      const script = document.createElement("script");
      script.innerHTML = `
        !function (w, d, t) {
          w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","setCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
          ttq.load('${propertyTiktokPixel}');
          ttq.page();
        }(window, document, 'ttq');
      `;
      document.head.appendChild(script);
      scripts.push(script);
    }

    if (shouldInitPinterest) {
      console.log("[MARKETING] Inicializando Pinterest Tag específico do imóvel:", propertyPinterestTag);
      const script = document.createElement("script");
      script.innerHTML = `
        !function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
        pintrk('load', '${propertyPinterestTag}');
        pintrk('page');
      `;
      document.head.appendChild(script);
      scripts.push(script);
    }

    return () => {
      scripts.forEach((s) => s.remove());
    };
  }, [property, globalMetaPixel, globalGoogleAdsId, globalTiktokPixel, globalPinterestTag, propertyFacebookPixel, propertyGoogleAdsId, propertyTiktokPixel, propertyPinterestTag]);

  useEffect(() => {
    if (!property?.id || !property?.tenantId) return;

    const insertViewEvent = async () => {
      const { error } = await supabase.from("property_analytics").insert({
        tenant_id: property.tenantId,
        property_id: property.id,
        event_type: "view",
      });

      if (error) {
        console.warn("Falha ao registrar view de imóvel:", error.message);
      }
    };

    void insertViewEvent();
  }, [property?.id, property?.tenantId]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-6 space-y-6">
          <Skeleton className="h-6 w-32" />
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="aspect-[16/10] w-full rounded-xl" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!property) {
    return (
      <Layout>
        <div className="container flex flex-col items-center py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Imóvel não encontrado</h1>
          <Button className="mt-4" asChild><Link to="/imoveis">Voltar para imóveis</Link></Button>
        </div>
      </Layout>
    );
  }

  const globalAddress = tenantSettings?.settings?.contact_address || "R. Pernambuco, 605 - Sra. das Graças, Betim - MG, 32671-694";
  const globalEmail = tenantSettings?.settings?.contact_email || "contato@email.arrudaimobi.com.br";
  const globalInstagram = tenantSettings?.settings?.social_instagram || "https://www.instagram.com/arrudaimobi";
  const globalFacebook = tenantSettings?.settings?.social_facebook || "https://www.facebook.com/arrudaimobi";

  const images = (property.images || []).slice().sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const amenities = property.amenities?.map(pa => pa.amenity?.name).filter(Boolean) || [];
  const agent = property.agent;
  const agentPhone = agent?.phone || tenantSettings?.settings?.contact_whatsapp || tenantSettings?.settings?.contact_phone || null;
  const whatsappMessage = `Olá! Tenho interesse no imóvel ${property.title}. Poderia me passar mais informações, por favor?`;
  const whatsappUrl = agentPhone ? whatsappProvider.buildUrl({ phone: agentPhone, message: whatsappMessage }) : null;
  const phoneUrl = agentPhone ? buildTelUrl(agentPhone) : null;
  const email = agent?.email || globalEmail;
  const emailSubject = `Interesse no imóvel ${property.id} - ${property.title}`;
  const emailBody = `Olá, vi o imóvel ${property.id} no site Arruda Imobi e gostaria de receber mais informações.`;
  const emailUrl = email ? buildMailtoUrl(email, emailSubject, emailBody) : null;
  const mainImage = images[0]?.url || "/logo-placeholder.png";
  const seoDescription = property.description || `${property.neighborhood}, ${property.city} - Confira este imóvel exclusivo na Arruda Imobi.`;

  const mapQueryText = property.latitude && property.longitude
    ? `${property.latitude},${property.longitude}`
    : [property.address, property.neighborhood, property.city, property.state]
        .filter(Boolean)
        .join(", ");
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(mapQueryText)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  const logPropertyAnalyticsEvent = async (eventType: "view" | "contact_click" | "whatsapp_click") => {
    if (!property?.id || !property?.tenantId) return;

    const { error } = await supabase.from("property_analytics").insert({
      tenant_id: property.tenantId,
      property_id: property.id,
      event_type: eventType,
    });

    if (error) {
      console.warn("Falha ao registrar evento de analytics:", error.message);
    }
  };

  const handleWhatsAppClick = () => {
    trackMarketingEvent("Lead", { property_id: property?.id });
    void logPropertyAnalyticsEvent("whatsapp_click");
  };

  const handleContactClick = () => {
    trackMarketingEvent("Contact", { property_id: property?.id });
    void logPropertyAnalyticsEvent("contact_click");
  };

  const nextImage = () => setCurrentImage((prev) => (prev + 1) % Math.max(images.length, 1));
  const prevImage = () => setCurrentImage((prev) => (prev - 1 + images.length) % Math.max(images.length, 1));

  // Price per m²
  const areaForPricePerSqm = property.areaUseful ?? property.area ?? 0;
  const pricePerSqm = areaForPricePerSqm > 0 ? Math.round(property.price / areaForPricePerSqm) : null;

  const structuredData = buildStructuredData({
    id: property.id,
    title: property.title,
    description: property.description,
    price: property.price,
    address: property.address,
    neighborhood: property.neighborhood,
    city: property.city,
    state: property.state,
    latitude: property.latitude ?? 0,
    longitude: property.longitude ?? 0,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    garages: property.garages,
    areaUseful: property.areaUseful ?? 0,
    area: property.area ?? 0,
    images: images.map(img => ({ url: img.url, alt: img.alt })),
    propertyType: property.propertyType,
    purpose: property.purpose,
  });

  return (
    <Layout>
      <Helmet>
        <title>{`${property.title} | Arruda Imobi`}</title>
        <meta name="description" content={seoDescription} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        
        {/* OpenGraph */}
        <meta property="og:title" content={property.title} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={mainImage} />
        <meta property="og:type" content="website" />
        <meta property="og:price:amount" content={property.price?.toString()} />
        <meta property="og:price:currency" content="BRL" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={property.title} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={mainImage} />
      </Helmet>

      <div className="w-full px-4 py-6 lg:max-w-7xl lg:mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground min-w-0" aria-label="Breadcrumb">
          <Link to="/imoveis" className="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-primary rounded-md px-2 py-1 -mx-2">
            <Home className="h-4 w-4" /> Imóveis
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground truncate max-w-[200px] sm:max-w-none">{property.title}</span>
        </nav>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Main Content */}
          <div className="flex-1 space-y-6 min-w-0">
            {/* Image Gallery */}
            <div className="relative w-full overflow-hidden rounded-xl bg-muted aspect-video">
              {images.length > 0 ? (
                (() => {
                  const currentImg = images[currentImage];
                  const ytId = extractYouTubeId(currentImg?.url || "");
                  if (ytId) {
                    return (
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}`}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }
                  return (
                    <>
                      <img
                        src={currentImg?.url}
                        alt={currentImg?.alt || property.title}
                        className="h-full w-full cursor-zoom-in object-cover transition-transform duration-300 hover:scale-105"
                        onClick={() => setLightboxOpen(true)}
                      />
                      <button
                        onClick={() => setLightboxOpen(true)}
                        className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-2 text-sm font-medium shadow-lg backdrop-blur-sm transition-colors hover:bg-card"
                        aria-label="Abrir galeria"
                      >
                        <Grid3X3 className="h-4 w-4" /> Ver fotos ({images.length})
                      </button>
                    </>
                  );
                })()
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <MapPin className="h-12 w-12" />
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 shadow-lg transition-colors hover:bg-card" aria-label="Imagem anterior">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 shadow-lg transition-colors hover:bg-card" aria-label="Próxima imagem">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-16 flex gap-1.5">
                    {images.slice(0, 8).map((_, i) => (
                      <button key={i} onClick={() => setCurrentImage(i)} className={`h-2 w-2 rounded-full transition-all ${i === currentImage ? "w-6 bg-card" : "bg-card/50"}`} aria-label={`Ir para imagem ${i + 1}`} />
                    ))}
                    {images.length > 8 && <span className="text-card text-xs self-center">+{images.length - 8}</span>}
                  </div>
                </>
              )}
              {/* Top-right actions */}
              <div className="absolute right-3 top-3 flex gap-2">
                <button
                  onClick={() => toggleFavorite(property.id)}
                  className="rounded-full bg-card/90 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-card"
                  aria-label={isFavorite(property.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                >
                  <Heart className={`h-4 w-4 transition-colors ${isFavorite(property.id) ? "fill-destructive text-destructive" : "text-foreground"}`} />
                </button>
                <button
                  onClick={() => shareProperty(property.title)}
                  className="rounded-full bg-card/90 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-card"
                  aria-label="Compartilhar imóvel"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
                {images.map((img, i) => {
                  const ytId = extractYouTubeId(img.url);
                  return (
                    <button key={img.id} onClick={() => setCurrentImage(i)} className={`relative h-16 min-w-[96px] shrink-0 overflow-hidden rounded-lg border-2 transition-all ${i === currentImage ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-60 hover:opacity-80"}`}>
                      {ytId ? (
                        <>
                          <img src={getYouTubeThumbnail(ytId)} alt={img.alt || ""} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="rounded-full bg-destructive/90 p-1">
                              <Play className="h-3 w-3 fill-destructive-foreground text-destructive-foreground" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <img src={img.url} alt={img.alt || ""} className="h-full w-full object-cover" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Title, Badges & Price */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary text-primary-foreground">{property.purpose === "sale" ? "Venda" : "Aluguel"}</Badge>
                {property.propertyType?.name && <Badge variant="secondary">{property.propertyType.name}</Badge>}
                {property.featured && <Badge className="bg-warning text-warning-foreground">Destaque</Badge>}
                <Badge variant="outline" className="text-muted-foreground">ID: {property.id.slice(0, 8)}</Badge>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="font-display text-2xl font-bold text-foreground md:text-4xl leading-tight">{property.title}</h1>
                  <p className="mt-1.5 flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{[property.address, property.neighborhood, property.city, property.state].filter(Boolean).join(", ")}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-3xl font-extrabold text-primary md:text-5xl leading-none">
                    {formatCurrency(property.price)}
                    {property.purpose === "rent" && <span className="text-base font-normal text-muted-foreground">/mês</span>}
                  </p>
                  {pricePerSqm && (
                    <p className="mt-1 text-sm text-muted-foreground flex items-center justify-end gap-1">
                      <Calculator className="h-3.5 w-3.5" />
                      {formatCurrency(pricePerSqm)}/m²
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: BedDouble, label: "Quartos", value: property.bedrooms ?? 0 },
                { icon: Bath, label: "Banheiros", value: property.bathrooms ?? 0 },
                { icon: Car, label: "Vagas", value: property.garages ?? 0 },
                { icon: Maximize, label: "Área", value: formatArea(property.areaUseful ?? property.area ?? 0) },
              ].map((f) => (
                <Card key={f.label} className="flex flex-col items-center p-4 text-center hover:border-primary/30 transition-colors">
                  <f.icon className="h-6 w-6 text-primary" />
                  <span className="mt-2 font-display text-xl font-bold text-foreground">{f.value}</span>
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                </Card>
              ))}
            </div>

            {/* Description */}
            {property.description && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="h-1 w-5 rounded-full bg-primary" /> Descrição
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground whitespace-pre-line">{property.description}</p>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="h-1 w-5 rounded-full bg-primary" /> Comodidades
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            <div className="rounded-xl border bg-card p-6">
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <span className="h-1 w-5 rounded-full bg-primary" /> Localização
              </h2>
              {mapQueryText ? (
                <div className="w-full overflow-hidden rounded-lg">
                  <iframe
                    title={`Mapa - ${property.title}`}
                    className="w-full h-[300px] md:h-[400px] border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapSrc}
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-muted">
                  <div className="text-center">
                    <MapPin className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">Localização não disponível</p>
                  </div>
                </div>
              )}
            </div>

            {/* Similar Properties */}
            {similarProps.data && similarProps.data.length > 0 && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                  <span className="h-1 w-5 rounded-full bg-primary" /> Imóveis Similares
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {similarProps.data.map((similar: { id: string }) => (
                    <PropertyCardDb key={similar.id} property={similar} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:w-80 xl:w-96 shrink-0">
            {agent && (
              <Card className="p-6 border-primary/20">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/20">
                    <AvatarImage src={agent.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-display text-lg">
                      {(agent.fullName || "A").split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-display font-semibold text-foreground">{agent.fullName || "Agente"}</p>
                    <p className="text-xs text-muted-foreground">Agente Responsável</p>
                  </div>
                </div>
                {agent.bio && <p className="text-sm text-muted-foreground">{agent.bio}</p>}
                <div className="mt-4 space-y-2.5">
                  {whatsappUrl ? (
                    <Button className="w-full gap-2" size="lg" asChild onClick={handleWhatsAppClick}>
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <Button className="w-full gap-2" size="lg" disabled><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
                  )}
                  {phoneUrl ? (
                    <Button variant="outline" className="w-full gap-2" asChild onClick={handleContactClick}>
                      <a href={phoneUrl} target="_blank" rel="noopener noreferrer">
                        <Phone className="h-4 w-4" /> Ligar
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full gap-2" disabled><Phone className="h-4 w-4" /> Ligar</Button>
                  )}
                  {emailUrl ? (
                    <Button variant="outline" className="w-full gap-2" asChild onClick={handleContactClick}>
                      <a href={emailUrl} target="_blank" rel="noopener noreferrer">
                        <Mail className="h-4 w-4" /> Enviar Email
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full gap-2" disabled><Mail className="h-4 w-4" /> Enviar Email</Button>
                  )}
                </div>
              </Card>
            )}

            <Card className="p-6">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Contato da Imobiliária</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                  <span>{globalAddress}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                  <span>{globalEmail}</span>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <a href={globalInstagram} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted transition hover:bg-primary/10">
                    <Instagram className="h-4 w-4 text-foreground" />
                  </a>
                  <a href={globalFacebook} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted transition hover:bg-primary/10">
                    <Facebook className="h-4 w-4 text-foreground" />
                  </a>
                </div>
              </div>
            </Card>

            <PropertyContactForm
              propertyId={property.id}
              propertyTitle={property.title}
              agentId={property.agentId}
              tenantId={property.tenantId}
              onTrackMarketingEvent={trackMarketingEvent}
            />
          </div>
        </div>
      </div>

      {lightboxOpen && images.length > 0 && (
        <Lightbox
          images={images}
          currentIndex={currentImage}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(i) => setCurrentImage(i)}
        />
      )}
    </Layout>
  );
};

export default PropertyDetail;
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
  Instagram, Facebook
} from "lucide-react";
import { useState, useEffect } from "react";
import { Lightbox } from "@/components/properties/Lightbox";
import { extractYouTubeId, getYouTubeThumbnail } from "@/lib/youtube";
import { useFavorites } from "@/contexts/FavoritesContext";
import { shareProperty } from "@/lib/share";
import { whatsappProvider, buildTelUrl, buildMailtoUrl } from "@/lib/messaging";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

function getUniqueIds(ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.filter(Boolean))) as string[];
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

  const trackMarketingEvent = (eventName: string, eventData: Record<string, unknown> = {}) => {
    if (typeof window === "undefined") return;

    const fbq = (window as any).fbq as ((...args: any[]) => void) | undefined;
    const gtag = (window as any).gtag as ((...args: any[]) => void) | undefined;
    const ttq = (window as any).ttq as any;
    const pintrk = (window as any).pintrk as any;

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
        tiktokIds.forEach((id) => {
          if (id === globalTiktokPixel) {
            ttq.track(eventName);
          } else {
            ttq.instance(id)?.track?.(eventName);
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
          <Button className="mt-4" asChild><Link to="/imoveis">Voltar</Link></Button>
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

  return (
    <Layout>
      <Helmet>
        <title>{`${property.title} | Arruda Imobi`}</title>
        <meta name="description" content={seoDescription} />
        
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
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground min-w-0">
          <Link to="/imoveis" className="flex items-center gap-1 whitespace-nowrap transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Imóveis
          </Link>
          <span className="whitespace-nowrap">/</span>
          <span className="text-foreground truncate max-w-full">{property.title}</span>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex-1 space-y-6">
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
                      <img
                        src={currentImg?.url}
                        alt={currentImg?.alt || property.title}
                        className="h-full w-full cursor-zoom-in object-cover"
                        onClick={() => setLightboxOpen(true)}
                      />
                    );
                  })()
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <MapPin className="h-12 w-12" />
                  </div>
                )}
              {images.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 shadow-lg transition-colors hover:bg-card">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 shadow-lg transition-colors hover:bg-card">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {images.map((_, i) => (
                      <button key={i} onClick={() => setCurrentImage(i)} className={`h-2 w-2 rounded-full transition-all ${i === currentImage ? "w-6 bg-card" : "bg-card/50"}`} />
                    ))}
                  </div>
                </>
              )}
              <div className="absolute right-3 top-3 flex gap-2">
                <button
                  onClick={() => toggleFavorite(property.id)}
                  className="rounded-full bg-card/90 p-2 shadow-lg transition-colors hover:bg-card"
                  aria-label={isFavorite(property.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                >
                  <Heart className={`h-4 w-4 transition-colors ${isFavorite(property.id) ? "fill-destructive text-destructive" : ""}`} />
                </button>
                <button
                  onClick={() => shareProperty(property.title)}
                  className="rounded-full bg-card/90 p-2 shadow-lg transition-colors hover:bg-card"
                  aria-label="Compartilhar imóvel"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 px-4">
                {images.map((img, i) => {
                  const ytId = extractYouTubeId(img.url);
                  return (
                    <button key={img.id} onClick={() => setCurrentImage(i)} className={`relative h-16 min-w-[96px] shrink-0 overflow-hidden rounded-md border-2 transition-all ${i === currentImage ? "border-primary" : "border-transparent opacity-60"}`}>
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

            {/* Title & Price */}
            <div className="px-4 sm:px-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary text-primary-foreground">{property.purpose === "sale" ? "Venda" : "Aluguel"}</Badge>
                {property.propertyType?.name && <Badge variant="secondary">{property.propertyType.name}</Badge>}
                {property.featured && <Badge className="bg-warning text-warning-foreground">Destaque</Badge>}
              </div>
              <h1 className="mt-3 font-display text-2xl font-bold text-foreground md:text-4xl">{property.title}</h1>
              <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {[property.address, property.neighborhood, property.city, property.state].filter(Boolean).join(", ")}
              </p>
              <p className="mt-4 font-display text-3xl font-extrabold text-primary md:text-5xl">
                {formatCurrency(property.price)}
                {property.purpose === "rent" && <span className="text-lg font-normal text-muted-foreground">/mês</span>}
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { icon: BedDouble, label: "Quartos", value: property.bedrooms || 0 },
                { icon: Bath, label: "Banheiros", value: property.bathrooms || 0 },
                { icon: Car, label: "Vagas", value: property.garages || 0 },
                { icon: Maximize, label: "Área", value: formatArea(property.areaUseful ?? property.area ?? 0) },
              ].map((f) => (
                <Card key={f.label} className="flex flex-col items-center p-4 text-center">
                  <f.icon className="h-6 w-6 text-primary" />
                  <span className="mt-2 font-display text-lg font-bold text-foreground">{f.value}</span>
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                </Card>
              ))}
            </div>

            {/* Description */}
            {property.description && (
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground md:text-2xl">Descrição</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{property.description}</p>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground md:text-2xl">Comodidades</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {amenities.map((amenity) => (
                    <Badge key={amenity} variant="secondary" className="px-3 py-1.5 text-sm">{amenity}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Localização</h2>
              {mapQueryText ? (
                <div className="mt-3 w-full overflow-hidden rounded-lg bg-muted aspect-video h-[300px] md:h-[450px]">
                  <iframe
                    title={`Mapa - ${property.title}`}
                    className="w-full h-full border-0"
                    width="100%"
                    height="100%"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapSrc}
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="mt-3 flex h-64 items-center justify-center rounded-lg border border-border bg-muted">
                  <div className="text-center">
                    <MapPin className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">Localização não disponível para este imóvel</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {agent && (
              <Card className="p-6">
                <h3 className="font-display text-sm font-semibold text-foreground">Agente Responsável</h3>
                <div className="mt-4 flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={agent.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-display">
                      {(agent.fullName || "A").split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-display font-semibold text-foreground">{agent.fullName || "Agente"}</p>
                  </div>
                </div>
                {agent.bio && <p className="mt-3 text-sm text-muted-foreground">{agent.bio}</p>}
                <div className="mt-4 space-y-2">
                  {whatsappUrl ? (
                    <Button className="w-full gap-2" size="lg" asChild>
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={handleWhatsAppClick}>
                        <MessageCircle className="h-4 w-4" />WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <Button className="w-full gap-2" size="lg" disabled><MessageCircle className="h-4 w-4" />WhatsApp</Button>
                  )}
                  {phoneUrl ? (
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <a href={phoneUrl} target="_blank" rel="noopener noreferrer" onClick={handleContactClick}>
                        <Phone className="h-4 w-4" />Ligar
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full gap-2" disabled><Phone className="h-4 w-4" />Ligar</Button>
                  )}
                  {emailUrl ? (
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <a href={emailUrl} target="_blank" rel="noopener noreferrer" onClick={handleContactClick}>
                        <Mail className="h-4 w-4" />Enviar Email
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full gap-2" disabled><Mail className="h-4 w-4" />Enviar Email</Button>
                  )}
                </div>
              </Card>
            )}

            <Card className="p-6">
              <h3 className="font-display text-sm font-semibold text-foreground">Contato da Imobiliária</h3>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-4 w-4 text-primary" />
                  <div>{globalAddress}</div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="mt-1 h-4 w-4 text-primary" />
                  <div>{globalEmail}</div>
                </div>
                <div className="flex items-center gap-3">
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

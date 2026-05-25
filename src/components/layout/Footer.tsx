import { Link } from "react-router-dom";
import { Building2, Mail, Phone, MapPin, Instagram, Facebook, Linkedin, Youtube, Cookie, ArrowRight, Send } from "lucide-react";
import { useTenantSettings } from "@/hooks/use-tenant-settings";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { useState } from "react";

function CookieSettingsButton() {
  const { setShowBanner, setShowSettings } = useCookieConsent();
  return (
    <button
      onClick={() => { setShowBanner(true); setShowSettings(true); }}
      className="inline-flex items-center gap-1 transition-colors hover:text-foreground text-muted-foreground"
    >
      <Cookie className="h-3 w-3" />
      Cookies
    </button>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // Stub: integrate with Supabase or mailing service
    console.log("[NEWSLETTER] Subscribing:", email);
    setSubmitted(true);
    setEmail("");
  };

  if (submitted) {
    return (
      <div className="mt-3 rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm text-primary-foreground">
        ✅ Cadastro realizado! Receba novidades por email.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="seu@email.com"
        required
        className="flex-1 min-w-0 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button
        type="submit"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
        aria-label="Inscrever-se na newsletter"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}

export function Footer() {
  const { data: tenant } = useTenantSettings();
  const s = tenant?.settings || {};

  const phone = s.contact_phone || "(31) 3584-0000";
  const email = s.contact_email || "contato@email.arrudaimobi.com.br";
  const address = s.contact_address || "R. Pernambuco, 605 - Sra. das Graças, Betim - MG, 32671-694";
  const companyName = tenant?.name || "Arruda Imobi";

  const defaultInstagram = "https://www.instagram.com/arrudaimobi";
  const defaultFacebook = "https://www.facebook.com/arrudaimobi";

  const TikTokIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );

  const socials = [
    { url: s.social_instagram || defaultInstagram, icon: Instagram, label: "Instagram" },
    { url: s.social_facebook || defaultFacebook, icon: Facebook, label: "Facebook" },
    { url: s.social_linkedin, icon: Linkedin, label: "LinkedIn" },
    { url: s.social_youtube, icon: Youtube, label: "YouTube" },
    { url: s.social_tiktok, icon: TikTokIcon, label: "TikTok" },
  ].filter(item => item.url);

  const showQuickLinks = s.footer_quick_links_visible !== false;
  const showPropertyTypes = s.footer_property_types_visible !== false;

  return (
    <footer className="border-t border-border/60 bg-card">
      {/* Main footer content */}
      <div className="container py-10 px-4 sm:px-6 lg:px-8">
        {/* Brand + Newsletter column — stacks first on mobile */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link to="/" className="mb-5 flex items-center gap-2.5 group">
              {s.logo_mode === "image" && s.logo_url ? (
                <img
                  src={s.logo_url}
                  alt={companyName}
                  className="h-9 max-w-full object-contain transition-transform group-hover:scale-105"
                />
              ) : (
                <>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/25 transition-transform group-hover:scale-105">
                    <Building2 className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-display text-lg font-bold text-foreground">
                    {companyName}
                  </span>
                </>
              )}
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {s.footer_description || "Sua plataforma completa para encontrar o imóvel ideal. Conectamos você aos melhores agentes e propriedades do mercado."}
            </p>
            
            {/* Newsletter */}
            <div className="mt-6">
              <p className="text-sm font-semibold text-foreground">Newsletter</p>
              <p className="mt-1 text-xs text-muted-foreground">Receba novidades e ofertas exclusivas.</p>
              <NewsletterForm />
            </div>
          </div>

          {showQuickLinks && (
            <div>
              <h4 className="mb-4 font-display text-sm font-semibold text-foreground">Links Rápidos</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link to="/imoveis" className="inline-block py-1 transition-colors hover:text-foreground">
                    Buscar Imóveis
                  </Link>
                </li>
                <li>
                  <Link to="/agentes" className="inline-block py-1 transition-colors hover:text-foreground">
                    Nossos Agentes
                  </Link>
                </li>
                <li>
                  <Link to="/contato" className="inline-block py-1 transition-colors hover:text-foreground">
                    Contato
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="inline-block py-1 transition-colors hover:text-foreground">
                    Área do Agente
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {showPropertyTypes && (
            <div>
              <h4 className="mb-4 font-display text-sm font-semibold text-foreground">Tipos de Imóvel</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link to="/imoveis?type=Apartamento" className="inline-block py-1 transition-colors hover:text-foreground">
                    Apartamentos
                  </Link>
                </li>
                <li>
                  <Link to="/imoveis?type=Casa" className="inline-block py-1 transition-colors hover:text-foreground">
                    Casas
                  </Link>
                </li>
                <li>
                  <Link to="/imoveis?type=Sala Comercial" className="inline-block py-1 transition-colors hover:text-foreground">
                    Comercial
                  </Link>
                </li>
                <li>
                  <Link to="/imoveis?type=Terreno" className="inline-block py-1 transition-colors hover:text-foreground">
                    Terrenos
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Contact column */}
          <div>
            <h4 className="mb-4 font-display text-sm font-semibold text-foreground">Contato</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                </div>
                <a href={`tel:${phone.replace(/\D/g, "")}`} className="hover:text-foreground transition-colors">
                  {phone}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                </div>
                <a href={`mailto:${email}`} className="hover:text-foreground transition-colors break-all">
                  {email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="leading-snug">{address}</span>
              </li>
            </ul>

            {/* Social links */}
            {socials.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {socials.map((item) => (
                  <a
                    key={item.label}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                    aria-label={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-5 flex gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground/50"><Instagram className="h-4 w-4" /></span>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground/50"><Facebook className="h-4 w-4" /></span>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground/50"><Linkedin className="h-4 w-4" /></span>
              </div>
            )}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="mt-10 rounded-2xl border border-primary/15 bg-primary/5 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div>
              <h4 className="font-display text-base font-semibold text-foreground">Tem um imóvel para vender?</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Cadastre seu imóvel ou empreendimento para avaliação da Arruda Imobi.
              </p>
            </div>
            <a
              href="/#/captar-imovel"
              aria-label="Anuncie seu imóvel na Arruda Imobi"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 sm:w-auto sm:shrink-0"
            >
              Anuncie seu imóvel
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-border/60 pt-6">
          <div className="flex flex-col items-center gap-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              <Link to="/termos" className="transition-colors hover:text-foreground">Termos de Serviço</Link>
              <span className="text-border hidden sm:inline">•</span>
              <Link to="/privacidade" className="transition-colors hover:text-foreground">Política de Privacidade</Link>
              <span className="text-border hidden sm:inline">•</span>
              <CookieSettingsButton />
            </div>
            <p className="text-muted-foreground/60">© {new Date().getFullYear()} {companyName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
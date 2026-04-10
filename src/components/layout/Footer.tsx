import { Link } from "react-router-dom";
import { Building2, Mail, Phone, MapPin, Instagram, Facebook, Linkedin, Youtube, Cookie } from "lucide-react";
import { useTenantSettings } from "@/hooks/use-tenant-settings";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

function CookieSettingsButton() {
  const { setShowBanner, setShowSettings } = useCookieConsent();
  return (
    <button
      onClick={() => { setShowBanner(true); setShowSettings(true); }}
      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
    >
      <Cookie className="h-3 w-3" />
      Cookies
    </button>
  );
}

export function Footer() {
  const { data: tenant } = useTenantSettings();
  const s = tenant?.settings || {};

  const phone = s.contact_phone || "(11) 3000-0000";
  const email = s.contact_email || "contato@empresa.com";
  const address = s.contact_address || "Av. Paulista, 1000 - São Paulo, SP";
  const companyName = tenant?.name || "Sua Imobiliária";

  const TikTokIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );

  const socials = [
    { url: s.social_instagram, icon: Instagram, label: "Instagram" },
    { url: s.social_facebook, icon: Facebook, label: "Facebook" },
    { url: s.social_linkedin, icon: Linkedin, label: "LinkedIn" },
    { url: s.social_youtube, icon: Youtube, label: "YouTube" },
    { url: s.social_tiktok, icon: TikTokIcon, label: "TikTok" },
  ].filter(item => item.url);

  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="mb-5 flex items-center gap-2.5 group">
              {s.logo_mode === "image" && s.logo_url ? (
                <img
                  src={s.logo_url}
                  alt={companyName}
                  className="h-9 max-w-[180px] object-contain transition-transform group-hover:scale-105"
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
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {s.footer_description || "Sua plataforma completa para encontrar o imóvel ideal. Conectamos você aos melhores agentes e propriedades do mercado."}
            </p>
          </div>

          <div>
            <h4 className="mb-5 font-display text-sm font-semibold text-foreground">Links Rápidos</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="/imoveis" className="transition-colors hover:text-foreground">Buscar Imóveis</Link></li>
              <li><Link to="/agentes" className="transition-colors hover:text-foreground">Nossos Agentes</Link></li>
              <li><Link to="/contato" className="transition-colors hover:text-foreground">Contato</Link></li>
              <li><Link to="/login" className="transition-colors hover:text-foreground">Área do Agente</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 font-display text-sm font-semibold text-foreground">Tipos de Imóvel</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="/imoveis?type=Apartamento" className="transition-colors hover:text-foreground">Apartamentos</Link></li>
              <li><Link to="/imoveis?type=Casa" className="transition-colors hover:text-foreground">Casas</Link></li>
              <li><Link to="/imoveis?type=Sala Comercial" className="transition-colors hover:text-foreground">Comercial</Link></li>
              <li><Link to="/imoveis?type=Terreno" className="transition-colors hover:text-foreground">Terrenos</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 font-display text-sm font-semibold text-foreground">Contato</h4>
            <ul className="space-y-3.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                </div>
                {phone}
              </li>
              <li className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                </div>
                {email}
              </li>
              <li className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                </div>
                {address}
              </li>
            </ul>
            {socials.length > 0 && (
              <div className="mt-5 flex gap-2">
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
            )}
            {socials.length === 0 && (
              <div className="mt-5 flex gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground/50"><Instagram className="h-4 w-4" /></span>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground/50"><Facebook className="h-4 w-4" /></span>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground/50"><Linkedin className="h-4 w-4" /></span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 border-t border-border/60 pt-6 flex flex-col items-center gap-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/termos" className="transition-colors hover:text-foreground">Termos de Serviço</Link>
            <span className="text-border">•</span>
            <Link to="/privacidade" className="transition-colors hover:text-foreground">Política de Privacidade</Link>
            <span className="text-border">•</span>
            <CookieSettingsButton />
          </div>
          <p className="text-muted-foreground/60">© {new Date().getFullYear()} {companyName}. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
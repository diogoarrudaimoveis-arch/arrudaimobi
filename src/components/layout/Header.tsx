import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Building2, Menu, X, Phone, User, LogOut, LayoutDashboard, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useTenantSettings } from "@/hooks/use-tenant-settings";

const navLinks = [
  { label: "Início", href: "/" },
  { label: "Imóveis", href: "/imoveis" },
  { label: "Blog", href: "/blog" },
  { label: "Agentes", href: "/agentes" },
  { label: "Contato", href: "/contato" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, isReady, signOut, isAdmin, isAgent } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: tenant } = useTenantSettings();
  const phone = tenant?.settings?.contact_phone;

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
      <div className="container flex h-14 min-[400px]:h-16 min-w-0 items-center justify-between gap-3 px-3 min-[400px]:px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          {(() => {
            const mode = (tenant?.settings as any)?.logo_mode ?? "text";
            const logoUrl = (tenant?.settings as any)?.logo_url;
            // image mode: show ONLY the image
            if ((mode === "image" || mode === "both") && logoUrl) {
              return (
                <img
                  src={logoUrl}
                  alt={tenant?.name || "Logo"}
                  className="h-8 min-[400px]:h-9 max-w-[180px] object-contain transition-transform group-hover:scale-105"
                />
              );
            }
            // text mode or no image: show icon + text
            return (
              <>
                <div className="flex h-8 min-[400px]:h-9 w-8 min-[400px]:w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/25 transition-transform group-hover:scale-105">
                  <Building2 className="h-4 w-4 min-[400px]:h-5 min-[400px]:w-5 text-primary-foreground" />
                </div>
                <span className="font-display text-base min-[400px]:text-lg font-bold text-foreground truncate max-w-[120px] min-[400px]:max-w-none">
                  {tenant?.name || "Sua Imobiliária"}
                </span>
              </>
            );
          })()}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 min-w-0 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "relative rounded-lg px-2.5 min-[900px]:px-3.5 py-1.5 min-[900px]:py-2 text-xs min-[900px]:text-sm font-medium transition-all duration-200 min-w-0",
                location.pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {link.label}
              {location.pathname === link.href && (
                <span className="absolute inset-x-1.5 min-[900px]:inset-x-2 -bottom-[1px] h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-1.5 lg:gap-2 lg:flex">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground h-9 w-9">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Alternar tema</span>
          </Button>
          {phone && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hidden xl:flex" asChild>
              <a href={`tel:${phone.replace(/\D/g, "")}`}>
                <Phone className="h-4 w-4" />
                <span className="hidden xl:inline">{phone}</span>
              </a>
            </Button>
          )}
          {isReady && user ? (
            <>
              {(isAdmin || isAgent) && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin" className="gap-1.5">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden xl:inline">Painel</span>
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" asChild>
                <Link to="/login">
                  <User className="h-4 w-4" />
                  <span className="hidden xl:inline">Entrar</span>
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/imoveis">Ver Imóveis</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0 h-9 w-9"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 lg:hidden",
        mobileOpen ? "max-h-[500px] border-t border-border/60" : "max-h-0"
      )}>
        <nav className="container min-w-0 flex flex-col gap-0.5 py-3 px-3 bg-card">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                location.pathname === link.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
            {phone && (
              <Button variant="ghost" size="sm" className="justify-start gap-2 text-muted-foreground" asChild>
                <a href={`tel:${phone.replace(/\D/g, "")}`} onClick={() => setMobileOpen(false)}>
                  <Phone className="h-4 w-4" />
                  {phone}
                </a>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { toggleTheme(); setMobileOpen(false); }} className="justify-start gap-2 text-muted-foreground">
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
              Alternar Tema
            </Button>
            {user ? (
              <>
                {(isAdmin || isAgent) && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin" onClick={() => setMobileOpen(false)}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Painel Admin
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-destructive justify-start" onClick={() => { signOut(); setMobileOpen(false); }}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="justify-center" asChild>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>Entrar</Link>
                </Button>
                <Button size="sm" className="justify-center" asChild>
                  <Link to="/imoveis" onClick={() => setMobileOpen(false)}>Ver Imóveis</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
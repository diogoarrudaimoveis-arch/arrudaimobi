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
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          {tenant?.settings?.logo_mode === "image" && tenant?.settings?.logo_url ? (
            <img
              src={tenant.settings.logo_url}
              alt={tenant?.name || "Logo"}
              className="h-9 max-w-[180px] object-contain transition-transform group-hover:scale-105"
            />
          ) : (
            <>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/25 transition-transform group-hover:scale-105">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold text-foreground">
                {tenant?.name || "Sua Imobiliária"}
              </span>
            </>
          )}
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                location.pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
              {location.pathname === link.href && (
                <span className="absolute inset-x-2 -bottom-[1px] h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground h-9 w-9">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Alternar tema</span>
          </Button>
          {phone && (
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" asChild>
              <a href={`tel:${phone.replace(/\D/g, "")}`}>
                <Phone className="h-4 w-4" />
                <span className="hidden lg:inline">{phone}</span>
              </a>
            </Button>
          )}
          {isReady && user ? (
            <>
              {(isAdmin || isAgent) && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Painel
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login" className="gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  Entrar
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/imoveis">Ver Imóveis</Link>
              </Button>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 md:hidden",
        mobileOpen ? "max-h-[500px] border-t border-border/60" : "max-h-0"
      )}>
        <nav className="container flex flex-col gap-1 py-4 bg-card">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                location.pathname === link.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="justify-start gap-2 text-muted-foreground">
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
              Alternar Tema
            </Button>
            {user ? (
              <>
                {(isAdmin || isAgent) && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin" onClick={() => setMobileOpen(false)}>Painel Admin</Link>
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
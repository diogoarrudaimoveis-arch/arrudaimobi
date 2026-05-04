import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantSettings } from "@/hooks/use-tenant-settings";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Building2, LayoutDashboard, Home, Users, Settings, Tag,
  Sparkles, MessageSquare, LogOut, X, Menu, Sun, Moon, User, Image, Send, Mail,
  PanelLeftClose, PanelLeftOpen, ChevronRight, FileText, Download, Globe,
  Calendar as CalendarIcon, Target, BarChart3
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const navGroups = [
  {
    label: "Principal",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Proprietários", href: "/admin/proprietarios", icon: Users },
      { label: "Imóveis", href: "/admin/imoveis", icon: Home },
      { label: "Agenda", href: "/admin/agenda", icon: CalendarIcon },
    ]
  },
  {
    label: "Gestão Básica",
    items: [
      { label: "Agentes", href: "/admin/agentes", icon: Users },
      { label: "Tipos de Imóvel", href: "/admin/tipos", icon: Tag },
      { label: "Comodidades", href: "/admin/comodidades", icon: Sparkles },
      { label: "Biblioteca de Mídias", href: "/admin/midias", icon: Image },
      { label: "Blog", href: "/admin/blog", icon: FileText },
    ]
  },
  {
    label: "CRM & Atendimento",
    items: [
      { label: "Contatos", href: "/admin/contatos", icon: MessageSquare },
      { label: "Mensagens", href: "/admin/mensagens", icon: Send },
    ]
  },
  {
    label: "Marketing Digital",
    items: [
      { label: "Configurações de IA", href: "/admin/configuracoes-ia", icon: Sparkles },
      { label: "Portais Imobiliários", href: "/admin/portais", icon: Globe },
      { label: "Rastreamento do Portal", href: "/admin/marketing-portal", icon: Target },
      { label: "Performance de Imóveis", href: "/admin/performance", icon: BarChart3 },
    ]
  },
  {
    label: "Sistema",
    items: [
      { label: "Meu Perfil", href: "/admin/perfil", icon: User },
      { label: "Config. E-mail", href: "/admin/email", icon: Mail },
      { label: "Configurações", href: "/admin/configuracoes", icon: Settings },
    ]
  }
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { profile, userRole, signOut } = useAuth();
  const { data: tenant } = useTenantSettings();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("admin_sidebar_collapsed") === "true"; } catch { return false; }
  });
  const { theme, setTheme } = useTheme();
  const { isInstallable, isInstalled, installApp } = usePWAInstall();

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem("admin_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  const initials = (profile?.full_name || "U")
    .split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const NavLink = ({ item }: { item: { label: string; href: string; icon?: React.ComponentType<{ className?: string }> } }) => {
    const active = location.pathname === item.href;
    const link = (
      <Link
        to={item.href}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
          collapsed && "justify-center px-2",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25"
            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <item.icon className={cn(
          "h-[18px] w-[18px] shrink-0 transition-all duration-200",
          active ? "drop-shadow-sm" : "group-hover:text-sidebar-primary"
        )} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && active && (
          <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60" />
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0 w-[280px]" : "-translate-x-full w-[280px]",
          "lg:w-[260px]",
          collapsed && "lg:w-[72px]"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex h-16 shrink-0 items-center gap-3 px-5",
          collapsed && "justify-center px-3"
        )}>
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary shadow-lg shadow-sidebar-primary/30">
              <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-display text-sm font-bold text-sidebar-foreground leading-tight">
                  Admin Panel
                </span>
                <span className="text-2xs text-sidebar-muted">{tenant?.name || "Painel Admin"}</span>
              </div>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto px-3 py-4 scrollbar-sidebar", collapsed && "px-2")}>
          <div className="space-y-6">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                {!collapsed && (
                  <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40 mb-2">
                    {group.label}
                  </h3>
                )}
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className={cn(
          "shrink-0 border-t border-sidebar-border px-3 py-3 space-y-1.5",
          collapsed && "px-2"
        )}>
          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden lg:flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground justify-center"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && <span className="flex-1 text-left">Recolher</span>}
          </button>

          {/* PWA Install Button */}
          {isInstallable && !isInstalled && (
            collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={installApp}
                    className="w-full bg-[#003366] hover:bg-[#002244] text-white shadow-md shadow-[#003366]/20"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>Instalar Aplicativo</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={installApp}
                className="w-full justify-start gap-3 bg-[#003366] hover:bg-[#002244] text-white shadow-md shadow-[#003366]/20"
              >
                <Download className="h-4 w-4" />
                <span>Instalar Aplicativo</span>
              </Button>
            )
          )}

          {/* Theme toggle */}
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-[13px] text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <Sun className="h-4 w-4 dark:hidden" />
                  <Moon className="hidden h-4 w-4 dark:block" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>Alternar Tema</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
              <span>Alternar Tema</span>
            </button>
          )}

          {/* User info */}
          <div className={cn(
            "flex items-center gap-3 rounded-xl bg-sidebar-accent/50 px-3 py-2.5",
            collapsed && "justify-center px-2 bg-transparent"
          )}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 ring-2 ring-sidebar-primary/30">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-display">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" sideOffset={12}>
                  {profile?.full_name || "Usuário"} ({userRole || "user"})
                </TooltipContent>
              )}
            </Tooltip>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-sidebar-foreground truncate">
                  {profile?.full_name || "Usuário"}
                </p>
                <p className="text-2xs text-sidebar-muted capitalize">{userRole || "user"}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={cn("flex gap-1", collapsed && "flex-col")}>
            {collapsed ? (
              <>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent" asChild>
                      <Link to="/"><Home className="h-4 w-4" /></Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>Ver Site</TooltipContent>
                </Tooltip>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-full text-red-400/70 hover:text-red-400 hover:bg-sidebar-accent" onClick={signOut}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>Sair</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent" asChild>
                  <Link to="/">
                    <Home className="h-4 w-4" />
                    Ver Site
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 text-red-400/70 hover:text-red-400 hover:bg-sidebar-accent" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-14 shrink-0 items-center border-b border-border bg-card/50 backdrop-blur-lg px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-3 font-display text-sm font-semibold text-foreground">Admin Panel</span>
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
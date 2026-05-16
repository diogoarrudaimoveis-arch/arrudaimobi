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
  Calendar as CalendarIcon, Target, BarChart3, BrainCircuit, Bot, Workflow,
  ScrollText, HeartPulse, GitBranch, Database
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
    label: "IA Operacional",
    items: [
      { label: "Central IA", href: "/admin/ia-operacional", icon: BrainCircuit },
      { label: "Agentes IA", href: "/admin/ia-agentes", icon: Bot },
      { label: "Automações N8N", href: "/admin/ia-automacoes", icon: Workflow },
      { label: "Logs", href: "/admin/ia-logs", icon: ScrollText },
      { label: "Health Checks", href: "/admin/ia-health", icon: HeartPulse },
      { label: "DevOps", href: "/admin/devops", icon: GitBranch },
      { label: "Meta Ads", href: "/admin/meta-ads", icon: Target },
      { label: "Supabase", href: "/admin/supabase-monitor", icon: Database },
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

  const NavLink = ({ item }: { item: { label: string; href: string; icon: LucideIcon } }) => {
    const active = location.pathname === item.href;
    const link = (
      <Link
        to={item.href}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12px] font-medium transition-all duration-150",
          collapsed && "justify-center px-1.5",
          active
            ? "bg-slate-800 text-white shadow-sm"
            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
        )}
      >
        <item.icon className={cn(
          "h-[15px] w-[15px] shrink-0 transition-all duration-150",
        )} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && active && (
          <ChevronRight className="ml-auto h-3 w-3 opacity-50" />
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
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0 w-[260px]" : "-translate-x-full w-[260px]",
          "lg:w-[248px] bg-slate-900 dark:bg-slate-950",
          collapsed && "lg:w-[68px]"
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
        <nav className={cn("flex-1 overflow-y-auto px-3 py-4 scrollbar-sidebar", collapsed && "px-1.5")}>
          <div className="space-y-5">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-0.5">
                {!collapsed && (
                  <h3 className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
            <button
              onClick={installApp}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200",
                collapsed && "justify-center px-1.5 w-full"
              )}
            >
              <Download className="h-3.5 w-3.5" />
              {!collapsed && <span>Instalar App</span>}
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-[12px] text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200",
              collapsed && "justify-center px-1.5 w-full"
            )}
          >
            <Sun className="h-3.5 w-3.5 dark:hidden" />
            <Moon className="hidden h-3.5 w-3.5 dark:block" />
            {!collapsed && <span>{theme === "dark" ? "Claro" : "Escuro"}</span>}
          </button>

          {/* Divider */}
          <div className="my-1 border-t border-slate-800" />

          {/* User info */}
          <div className={cn(
            "flex items-center gap-2.5 rounded-lg bg-slate-800/50 px-2.5 py-2",
            collapsed && "justify-center bg-transparent p-1"
          )}>
            <Avatar className="h-7 w-7 ring-1 ring-slate-700">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-blue-600 text-white text-[10px] font-display">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-slate-200 truncate">
                  {profile?.full_name || "Usuário"}
                </p>
                <p className="text-[10px] text-slate-500 capitalize">{userRole || "user"}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={cn("flex gap-1", collapsed && "flex-col")}>
            <button
              onClick={() => signOut()}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-[12px] text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400",
                collapsed && "justify-center px-1.5 w-full"
              )}
            >
              <LogOut className="h-3.5 w-3.5" />
              {!collapsed && <span>Sair</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-6">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 items-center gap-3">
            <span className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Painel Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">
              {profile?.full_name || "Usuário"}
            </span>
            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-[10px] text-white font-display">{initials}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          <div className="p-5 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
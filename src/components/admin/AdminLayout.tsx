import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantSettings } from "@/hooks/use-tenant-settings";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { normalizeRole, canSeeMenuItem, getRoleLabel, type AdminMenuItem } from "@/lib/adminPermissions";
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

// Menu items with permission flags
const allMenuItems: AdminMenuItem[] = [
  // Principal
  { key: "dashboard", label: "Dashboard", href: "/admin", icon: LayoutDashboard, section: "Principal" },
  { key: "owners", label: "Proprietários", href: "/admin/proprietarios", icon: Users, section: "Principal" },
  { key: "properties", label: "Imóveis", href: "/admin/imoveis", icon: Home, section: "Principal" },
  { key: "agenda", label: "Agenda", href: "/admin/agenda", icon: CalendarIcon, section: "Principal" },
  // Gestão Básica
  { key: "agents", label: "Agentes", href: "/admin/agentes", icon: Users, section: "Gestão Básica" },
  { key: "property-types", label: "Tipos de Imóvel", href: "/admin/tipos", icon: Tag, section: "Gestão Básica" },
  { key: "amenities", label: "Comodidades", href: "/admin/comodidades", icon: Sparkles, section: "Gestão Básica" },
  { key: "media", label: "Biblioteca de Mídias", href: "/admin/midias", icon: Image, section: "Gestão Básica" },
  { key: "blog", label: "Blog", href: "/admin/blog", icon: FileText, section: "Gestão Básica" },
  // CRM & Atendimento
  { key: "contacts", label: "Contatos", href: "/admin/contatos", icon: MessageSquare, section: "CRM & Atendimento" },
  { key: "messages", label: "Mensagens", href: "/admin/mensagens", icon: Send, section: "CRM & Atendimento" },
  // Marketing Digital
  { key: "ai-config", label: "Configurações de IA", href: "/admin/configuracoes-ia", icon: Sparkles, section: "Marketing Digital", techOnly: true },
  { key: "portals", label: "Portais Imobiliários", href: "/admin/portais", icon: Globe, section: "Marketing Digital", adminOnly: true },
  { key: "tracking", label: "Rastreamento do Portal", href: "/admin/marketing-portal", icon: Target, section: "Marketing Digital", adminOnly: true },
  { key: "performance", label: "Performance de Imóveis", href: "/admin/performance", icon: BarChart3, section: "Marketing Digital", adminOnly: true },
  // IA Operacional — all techOnly
  { key: "central-ai", label: "Central IA", href: "/admin/ia-operacional", icon: BrainCircuit, section: "IA Operacional", techOnly: true },
  { key: "ai-agents", label: "Agentes IA", href: "/admin/ia-agentes", icon: Bot, section: "IA Operacional", techOnly: true },
  { key: "n8n", label: "Automações N8N", href: "/admin/ia-automacoes", icon: Workflow, section: "IA Operacional", techOnly: true },
  { key: "logs", label: "Logs", href: "/admin/ia-logs", icon: ScrollText, section: "IA Operacional", techOnly: true },
  { key: "health", label: "Health Checks", href: "/admin/ia-health", icon: HeartPulse, section: "IA Operacional", techOnly: true },
  { key: "devops", label: "DevOps", href: "/admin/devops", icon: GitBranch, section: "IA Operacional", techOnly: true },
  { key: "meta-ads", label: "Meta Ads", href: "/admin/meta-ads", icon: Target, section: "IA Operacional", techOnly: true },
  { key: "supabase", label: "Supabase", href: "/admin/supabase-monitor", icon: Database, section: "IA Operacional", techOnly: true },
  // Sistema
  { key: "profile", label: "Meu Perfil", href: "/admin/perfil", icon: User, section: "Sistema" },
  { key: "email-config", label: "Config. E-mail", href: "/admin/email", icon: Mail, section: "Sistema", adminOnly: true },
  { key: "settings", label: "Configurações", href: "/admin/configuracoes", icon: Settings, section: "Sistema", adminOnly: true },
];

// Group menu items by section
const menuSections = [
  { label: "Principal", keys: ["dashboard", "owners", "properties", "agenda"] },
  { label: "Gestão Básica", keys: ["agents", "property-types", "amenities", "media", "blog"] },
  { label: "CRM & Atendimento", keys: ["contacts", "messages"] },
  { label: "Marketing Digital", keys: ["ai-config", "portals", "tracking", "performance"] },
  { label: "IA Operacional", keys: ["central-ai", "ai-agents", "n8n", "logs", "health", "devops", "meta-ads", "supabase"] },
  { label: "Sistema", keys: ["profile", "email-config", "settings"] },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { profile, userRole, signOut, isDeveloper, isAdmin } = useAuth();
  const { data: tenant } = useTenantSettings();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("admin_sidebar_collapsed") === "true"; } catch { return false; }
  });
  const { theme, setTheme } = useTheme();
  const { isInstallable, isInstalled, installApp } = usePWAInstall();

  // Get visible menu items based on role
  const visibleItems = allMenuItems.filter(item => canSeeMenuItem(userRole, item));

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem("admin_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  const roleLabel = getRoleLabel(userRole);
  const initials = (profile?.full_name || "U")
    .split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const NavLink = ({ item }: { item: AdminMenuItem }) => {
    const active = location.pathname === item.href;
    const link = (
      <Link
        to={item.href}
        className={cn(
          "group relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-[12px] font-medium transition-all duration-150",
          collapsed && "justify-center px-1.5",
          active
            ? "bg-slate-800 text-white border-l-2 border-primary shadow-sm"
            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
        )}
      >
        <item.icon className={cn("h-[14px] w-[14px] shrink-0")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && active && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
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
        <div className={cn("flex h-14 shrink-0 items-center gap-3 px-4", collapsed && "justify-center px-2")}>
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-display text-sm font-bold text-white leading-tight">
                  Admin Panel
                </span>
                <span className="text-[10px] text-slate-400">{tenant?.name || "Arruda Imobi"}</span>
              </div>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto px-2 py-3 scrollbar-sidebar", collapsed && "px-1.5")}>
          {menuSections.map((section) => {
            const sectionItems = visibleItems.filter(item => section.keys.includes(item.key));
            if (sectionItems.length === 0) return null;
            return (
              <div key={section.label} className="space-y-0.5 mb-4">
                {!collapsed && (
                  <h3 className="mb-0.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {section.label}
                  </h3>
                )}
                {sectionItems.map((item) => (
                  <NavLink key={item.key} item={item} />
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn("shrink-0 border-t border-slate-800 px-3 py-3 space-y-1.5", collapsed && "px-2")}>
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden lg:flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[12px] text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300 justify-center"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && <span className="flex-1 text-left">Recolher</span>}
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-[12px] text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300",
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
          <div className={cn("flex items-center gap-2.5 rounded-lg bg-slate-800/50 px-2.5 py-2", collapsed && "justify-center bg-transparent p-1")}>
            <Avatar className="h-7 w-7 ring-1 ring-slate-700">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-blue-600 text-white text-[10px] font-display">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-slate-200 truncate">{profile?.full_name || "Usuário"}</p>
                <p className="text-[10px] text-slate-500">{roleLabel}</p>
              </div>
            )}
          </div>

          {/* Sign out */}
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
            {(isDeveloper || isAdmin) && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                {roleLabel}
              </span>
            )}
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
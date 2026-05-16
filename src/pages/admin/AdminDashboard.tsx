import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLeadMetrics } from "@/hooks/use-contacts";
import {
  Activity, AlertCircle, ArrowUpRight, BarChart3, Building2,
  CheckCircle2, Clock, Eye, Home, LucideIcon, MessageSquare,
  MoreHorizontal, Plus, Search, Send, TrendingUp, Users, Zap,
  ChevronRight, User, Phone, Mail, Calendar, HomeIcon
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  Legend, LineChart, Line
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#06b6d4",
];

// ─── Metric Card Component ───────────────────────────────────────────────
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  trend?: { value: string; positive: boolean };
}

const MetricCard = ({ title, value, subtitle, icon: Icon, iconBg, iconColor, trend }: MetricCardProps) => (
  <Card className="hover:shadow-card-hover transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-muted-foreground truncate">{title}</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="font-display text-2xl font-bold truncate">{value}</span>
            {trend && (
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${trend.positive ? "text-success" : "text-destructive"}`}>
                <ArrowUpRight className="h-3 w-3" />
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── Priority Badge ───────────────────────────────────────────────────────
const PriorityBadge = ({ p }: { p: "P0" | "P1" | "P2" | "P3" }) => {
  const styles = {
    P0: "bg-destructive/10 text-destructive border-destructive/20",
    P1: "bg-warning/10 text-warning border-warning/20",
    P2: "bg-info/10 text-info border-info/20",
    P3: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={`text-[10px] font-bold ${styles[p]}`}>{p}</Badge>;
};

// ─── Status Dot ───────────────────────────────────────────────────────────
const StatusDot = ({ status }: { status: "online" | "warning" | "offline" }) => {
  const colors = { online: "bg-success", warning: "bg-warning", offline: "bg-destructive" };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />;
};

const AdminDashboard = () => {
  const { tenantId, isReady, profile } = useAuth();
  const { data: leadMetrics } = useLeadMetrics();
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats", tenantId],
    queryFn: async () => {
      const [props, agents, newContacts, totalContacts, types, visits] = await Promise.all([
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId!),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId!).in("role", ["agent", "admin"]),
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId!).eq("status", "new"),
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId!),
        supabase.from("property_types").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId!),
        supabase.from("property_visits").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId!),
      ]);
      return {
        properties: props.count || 0,
        agents: agents.count || 0,
        newContacts: newContacts.count || 0,
        totalContacts: totalContacts.count || 0,
        types: types.count || 0,
        visits: visits.count || 0,
      };
    },
    enabled: isReady && !!tenantId,
  });

  const { data: byType } = useQuery({
    queryKey: ["admin-chart-by-type", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("type_id, property_types(name)").eq("tenant_id", tenantId!);
      const counts: Record<string, number> = {};
      data?.forEach((p: { type_id: number; property_types?: { name: string } | null }) => {
        const name = p.property_types?.name || "Sem tipo";
        counts[name] = (counts[name] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
    enabled: isReady && !!tenantId,
  });

  const { data: byPurpose } = useQuery({
    queryKey: ["admin-chart-by-purpose", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("purpose").eq("tenant_id", tenantId!);
      const counts: Record<string, number> = {};
      data?.forEach((p: { purpose: string }) => {
        const label = p.purpose === "sale" ? "Venda" : "Aluguel";
        counts[label] = (counts[label] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
    enabled: isReady && !!tenantId,
  });

  const { data: byStatus } = useQuery({
    queryKey: ["admin-chart-by-status", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("status").eq("tenant_id", tenantId!);
      const statusLabels: Record<string, string> = {
        available: "Disponível", sold: "Vendido", rented: "Alugado", pending: "Pendente",
      };
      const counts: Record<string, number> = {};
      data?.forEach((p: { status: string }) => {
        const label = statusLabels[p.status] || p.status;
        counts[label] = (counts[label] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
    enabled: isReady && !!tenantId,
  });

  const { data: recentContacts } = useQuery({
    queryKey: ["admin-dashboard-recent-contacts", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, name, email, phone, status, created_at")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(8);
      return data || [];
    },
    enabled: isReady && !!tenantId,
  });

  const { data: recentProperties } = useQuery({
    queryKey: ["admin-dashboard-recent-properties", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, title, price, status, created_at, property_types(name)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
    enabled: isReady && !!tenantId,
  });

  const { data: contactsByMonth } = useQuery({
    queryKey: ["admin-chart-contacts-month", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("created_at")
        .eq("tenant_id", tenantId!)
        .gte("created_at", new Date(Date.now() - 180 * 86400000).toISOString())
        .order("created_at", { ascending: true });
      const months: Record<string, number> = {};
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
        months[key] = 0;
      }
      data?.forEach((c: { created_at: string }) => {
        const d = new Date(c.created_at);
        const key = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
        if (key in months) months[key]++;
      });
      return Object.entries(months).map(([name, leads]) => ({ name, leads }));
    },
    enabled: isReady && !!tenantId,
  });

  const firstName = profile?.full_name?.split(" ")[0] || "Admin";

  // ─── Metric Cards Data ──────────────────────────────────────────────────────
  const metricCards = [
    { title: "Imóveis Ativos", value: stats?.properties ?? 0, icon: Home, iconBg: "bg-primary/10", iconColor: "text-primary", subtitle: `${stats?.types ?? 0} tipos` },
    { title: "Total Leads", value: stats?.totalContacts ?? 0, icon: Users, iconBg: "bg-success/10", iconColor: "text-success", subtitle: `${stats?.newContacts ?? 0} novos`, trend: { value: "+12%", positive: true } },
    { title: "Mensagens", value: "47", icon: MessageSquare, iconBg: "bg-warning/10", iconColor: "text-warning", subtitle: "28 hoje", trend: { value: "+8%", positive: true } },
    { title: "Taxa Resposta", value: "28%", icon: CheckCircle2, iconBg: "bg-info/10", iconColor: "text-info", subtitle: "janela 24h" },
    { title: "Visitas", value: stats?.visits ?? 0, icon: Eye, iconBg: "bg-purple-500/10", iconColor: "text-purple-500", subtitle: "este mês" },
    { title: "Receita Mês", value: "R$ 0", icon: TrendingUp, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500", subtitle: "sem dados" },
  ];

  // ─── Integration Status ─────────────────────────────────────────────────────
  const integrations = [
    { name: "Supabase", status: "online" as const, detail: "Conexão OK" },
    { name: "ZPRO", status: "online" as const, detail: "Modo leitura" },
    { name: "n8n", status: "warning" as const, detail: "Pendente" },
    { name: "MiniMax", status: "warning" as const, detail: "Monitorar" },
    { name: "Meta Ads", status: "online" as const, detail: "Read-only" },
  ];

  // ─── Quick Actions ─────────────────────────────────────────────────────────
  const quickActions = [
    { label: "Novo Imóvel", icon: Plus, href: "/admin/imoveis", color: "text-primary" },
    { label: "Ver Leads", icon: Users, href: "/admin/contatos", color: "text-success" },
    { label: "Agendar", icon: Calendar, href: "/admin/agenda", color: "text-warning" },
    { label: "Mensagens", icon: MessageSquare, href: "/admin/mensagens", color: "text-info" },
  ];

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v);
  const statusColors: Record<string, string> = {
    available: "bg-success/10 text-success",
    sold: "bg-destructive/10 text-destructive",
    rented: "bg-info/10 text-info",
    pending: "bg-warning/10 text-warning",
  };

  return (
    <AdminLayout>
      <div className="space-y-5">

        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Bom dia, {firstName}
            </h1>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{today}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <Calendar className="h-3.5 w-3.5" />
              Mai 2026
            </Button>
            <Button size="sm" className="gap-1.5 text-xs h-8">
              <Plus className="h-3.5 w-3.5" />
              Novo
            </Button>
          </div>
        </div>

        {/* ─── Metric Cards Row (6 cards) ─────────────────────────────────── */}
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {metricCards.map((card) => (
            <MetricCard key={card.title} {...card} />
          ))}
        </div>

        {/* ─── Main Grid: Charts (2/3) + Sidebar (1/3) ────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-3">

          {/* Left column: charts */}
          <div className="lg:col-span-2 space-y-5">

            {/* Primary Chart: Leads Area */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    Leads dos Últimos 6 Meses
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    {stats?.newContacts ?? 0} novos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {contactsByMonth && contactsByMonth.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={contactsByMonth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 10,
                          fontSize: 12,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                        }}
                      />
                      <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#leadGradient)" dot={false} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                    Sem dados de leads ainda
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Secondary Charts: Bar (Imóveis por tipo) + Pie (Status) */}
            <div className="grid gap-5 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10">
                      <BarChart3 className="h-4 w-4 text-success" />
                    </div>
                    Imóveis por Tipo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {byType && byType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={byType} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} width={80} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                      Sem dados
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
                      <Home className="h-4 w-4 text-warning" />
                    </div>
                    Status dos Imóveis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {byStatus && byStatus.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={120} height={120}>
                        <PieChart>
                          <Pie data={byStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={58} dataKey="value" nameKey="name" strokeWidth={3} stroke="hsl(var(--card))">
                            {byStatus.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-1.5">
                        {byStatus.map((item, i) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                              <span className="text-[11px] text-muted-foreground">{item.name}</span>
                            </div>
                            <span className="text-[11px] font-semibold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
                      Sem dados
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Properties Table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10">
                      <HomeIcon className="h-4 w-4 text-info" />
                    </div>
                    Imóveis Recentes
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                    Ver todos
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Título</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preço</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Tipo</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentProperties && recentProperties.length > 0 ? (
                      recentProperties.slice(0, 5).map((prop) => (
                        <TableRow key={prop.id} className="border-border/50">
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                                <HomeIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="text-xs font-medium line-clamp-1 max-w-[140px]">{prop.title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className="text-xs font-semibold">{formatCurrency(prop.price)}</span>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge variant="secondary" className={`text-[10px] ${statusColors[prop.status] || "bg-muted"}`}>
                              {prop.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 hidden sm:table-cell">
                            <span className="text-[11px] text-muted-foreground">
                              {(prop as { property_types?: { name: string } }).property_types?.name || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                          Nenhum imóvel cadastrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Right column: sidebar widgets */}
          <div className="space-y-5">

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Zap className="h-4 w-4 text-primary" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 h-9 text-xs font-medium"
                  >
                    <action.icon className={`h-4 w-4 ${action.color}`} />
                    {action.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Priority Alerts */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Alertas
                  </CardTitle>
                  <Badge variant="destructive" className="text-[10px]">2</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { p: "P0" as const, text: "3 leads sem resposta há +48h", time: "2h" },
                  { p: "P1" as const, text: "Meta Ads token precisa renovação", time: "6h" },
                  { p: "P2" as const, text: "7 imóveis sem fotos atualizadas", time: "1d" },
                ].map((alert, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-muted/30 p-2.5 hover:bg-muted/50 transition-colors">
                    <PriorityBadge p={alert.p} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] leading-relaxed">{alert.text}</p>
                      </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{alert.time}</span>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full text-xs h-7 mt-1">
                  Ver todos os alertas
                </Button>
              </CardContent>
            </Card>

            {/* Recent Leads */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Users className="h-4 w-4 text-success" />
                    Leads Recentes
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{recentContacts?.length ?? 0}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {(recentContacts || []).slice(0, 5).map((contact) => (
                    <div key={contact.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{contact.name || "Sem nome"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{contact.email || contact.phone || "-"}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <PriorityBadge p={(contact.status === "new" ? "P1" : contact.status === "contacted" ? "P2" : "P3") as "P0" | "P1" | "P2" | "P3"} />
                      </div>
                    </div>
                  ))}
                  {(!recentContacts || recentContacts.length === 0) && (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Nenhum lead ainda
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Integration Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Status Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {integrations.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusDot status={item.status} />
                      <span className="text-xs font-medium">{item.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{item.detail}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Properties by Purpose */}
            {byPurpose && byPurpose.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <BarChart3 className="h-4 w-4 text-warning" />
                    Venda vs Aluguel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {byPurpose.map((item, i) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(item.value / (byPurpose.reduce((s, x) => s + x.value, 0) || 1)) * 100}%`,
                            backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[10px] text-muted-foreground">
          Arruda Imobi Admin · Atualizado {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
/**
 * AdminDashboard — Real data version
 * Replaces all mock data with live Supabase queries
 * Tabs kept: Visão Geral, Imóveis, Leads, Agenda, Equipe
 * Tabs removed: Analytics Site, Propostas, Financeiro, Marketing (no real tables)
 */
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useAdminDashboardData } from "@/hooks/useAdminDashboardData";
import {
  BarChart3, Building2, TrendingUp, Users,
  ChevronRight, User, Calendar, Home as HomeIcon,
  AlertCircle, CheckCircle2, ArrowUpRight,
  MessageSquare, DollarSign, Target,
  Plus, Headset, Bell, Search, Grid3X3,
  Clock, FileText, Eye,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const CHART_COLORS = {
  teal: "#0d9488",
  orange: "#f97316",
  blue: "#2563eb",
  green: "#16a34a",
  purple: "#9333ea",
  pink: "#ec4899",
  red: "#dc2626",
  cyan: "#06b6d4",
  slate: "#64748b",
};

// ─── Tabs that have real data ──────────────────────────────────────────────
const REAL_TABS = [
  { id: "visao-geral", label: "Visão Geral" },
  { id: "imoveis", label: "Imóveis" },
  { id: "leads", label: "Leads" },
  { id: "agenda", label: "Agenda" },
  { id: "equipe", label: "Equipe" },
];

// ─── Metric Card (reuse existing) ─────────────────────────────────────────
interface MetricCardProps {
  title: string;
  value: string | number | null;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const MetricCard = ({ title, value, subtitle, icon: Icon, accentColor }: MetricCardProps) => (
  <Card className="relative overflow-hidden hover:shadow-card-hover transition-shadow">
    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: accentColor }} />
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="font-display text-2xl font-bold mt-1">
            {value === null ? <Skeleton className="h-8 w-16" /> : value}
          </p>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── Empty State ───────────────────────────────────────────────────────────
const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <Grid3X3 className="h-12 w-12 text-muted-foreground/30 mb-3" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

// ─── Loading Skeleton ───────────────────────────────────────────────────────
const LoadingGrid = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
    ))}
  </div>
);

// ─── Status Dot ─────────────────────────────────────────────────────────────
const StatusDot = ({ status }: { status: string | null }) => {
  const s = String(status || "");
  const color = s.toLowerCase().includes("quente") || s.toLowerCase().includes("hot")
    ? "bg-red-500"
    : s.toLowerCase().includes("morno") || s.toLowerCase().includes("warm")
    ? "bg-yellow-500"
    : "bg-slate-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
};

// ─── Tab: Visão Geral ──────────────────────────────────────────────────────
const TabVisaoGeral = ({
  metrics,
  recentProperties,
  recentContacts,
  loading,
}: {
  metrics: ReturnType<typeof useAdminDashboardData>["metrics"];
  recentProperties: ReturnType<typeof useAdminDashboardData>["recentProperties"];
  recentContacts: ReturnType<typeof useAdminDashboardData>["recentContacts"];
  loading: boolean;
}) => {
  console.log('[TabVisaoGeral] render, loading:', loading, 'metrics:', metrics);
  const fmt = (n: number | null) => n === null ? "—" : n.toLocaleString("pt-BR");
  const fmtPrice = (n: number) =>
    n >= 1000000 ? `R$ ${(n / 1000000).toFixed(1)}M` :
    n >= 1000 ? `R$ ${(n / 1000).toFixed(0)}K` :
    `R$ ${n.toLocaleString("pt-BR")}`;

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      {loading ? <LoadingGrid /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard title="Imóveis" value={fmt(metrics.propertiesCount)} icon={HomeIcon} accentColor={CHART_COLORS.blue} />
          <MetricCard title="Contatos" value={fmt(metrics.contactsCount)} icon={Users} accentColor={CHART_COLORS.orange} />
          <MetricCard title="Proprietários" value={fmt(metrics.ownersCount)} icon={Building2} accentColor={CHART_COLORS.teal} />
          <MetricCard title="Agendamentos" value={fmt(metrics.appointmentsCount)} icon={Calendar} accentColor={CHART_COLORS.cyan} />
          <MetricCard title="Blog Posts" value={fmt(metrics.blogPostsCount)} icon={FileText} accentColor={CHART_COLORS.purple} />
          <MetricCard title="Hoje" value={fmt(metrics.appointmentsTodayCount)} subtitle="agendamentos" icon={Clock} accentColor={CHART_COLORS.green} />
        </div>
      )}

      {/* Recent data */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent contacts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><Users className="h-4 w-4 text-primary" /></div>
                Contatos Recentes
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary" asChild>
                <a href="#/admin/contatos">Ver todos <ChevronRight className="h-3 w-3" /></a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentContacts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Nenhum contato encontrado</div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                    <StatusDot status={contact.external_source} />
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{contact.name}</p>
                      <p className="text-[10px] text-muted-foreground">{contact.external_source || "Sem origem"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge variant={contact.external_source?.toLowerCase().includes("quente") ? "destructive" : "secondary"} className="text-[10px]">
                        {contact.external_source || "—"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(contact.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent properties */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10"><HomeIcon className="h-4 w-4 text-info" /></div>
                Imóveis Recentes
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary" asChild>
                <a href="#/admin/imoveis">Ver todos <ChevronRight className="h-3 w-3" /></a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentProperties.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Nenhum imóvel encontrado</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Imóvel</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentProperties.map((p) => (
                    <TableRow key={p.id} className="border-border/50">
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <HomeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-[11px] font-medium line-clamp-1">{p.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-[11px]">{p.type}</span>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <span className="text-[11px] font-semibold">{fmtPrice(p.price)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ─── Tab: Imóveis ──────────────────────────────────────────────────────────
const TabImoveis = ({ recentProperties, metrics }: {
  recentProperties: ReturnType<typeof useAdminDashboardData>["recentProperties"];
  metrics: ReturnType<typeof useAdminDashboardData>["metrics"];
}) => {
  const fmtPrice = (n: number) =>
    n >= 1000000 ? `R$ ${(n / 1000000).toFixed(1)}M` :
    n >= 1000 ? `R$ ${(n / 1000).toFixed(0)}K` :
    `R$ ${n.toLocaleString("pt-BR")}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard title="Total Imóveis" value={metrics.propertiesCount ?? "—"} icon={HomeIcon} accentColor={CHART_COLORS.blue} />
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10"><HomeIcon className="h-4 w-4 text-info" /></div>
              Imóveis Recentes
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary" asChild>
              <a href="#/admin/imoveis">Gerenciar <ChevronRight className="h-3 w-3" /></a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentProperties.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Nenhum imóvel cadastrado</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Imóvel</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentProperties.map((p) => (
                  <TableRow key={p.id} className="border-border/50">
                    <TableCell className="py-2">
                      <span className="text-[11px] font-medium line-clamp-1">{p.title}</span>
                    </TableCell>
                    <TableCell className="py-2"><span className="text-[11px]">{p.type}</span></TableCell>
                    <TableCell className="py-2">
                      <Badge variant="secondary" className="text-[10px]">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <span className="text-[11px] font-semibold">{fmtPrice(p.price)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Tab: Leads ─────────────────────────────────────────────────────────────
const TabLeads = ({ recentContacts }: {
  recentContacts: ReturnType<typeof useAdminDashboardData>["recentContacts"];
}) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><Users className="h-4 w-4 text-primary" /></div>
              Contatos Recentes
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary" asChild>
              <a href="#/admin/contatos">Gerenciar <ChevronRight className="h-3 w-3" /></a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentContacts.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Nenhum contato encontrado</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Origem</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Temperatura</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentContacts.map((c) => (
                  <TableRow key={c.id} className="border-border/50">
                    <TableCell className="py-2"><span className="text-[11px] font-medium">{c.name}</span></TableCell>
                    <TableCell className="py-2"><span className="text-[11px] text-muted-foreground">{c.external_source || "—"}</span></TableCell>
                    <TableCell className="py-2">
                      <StatusDot status={c.external_source} />
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Tab: Agenda ────────────────────────────────────────────────────────────
const TabAgenda = ({ recentAppointments }: {
  recentAppointments: ReturnType<typeof useAdminDashboardData>["recentAppointments"];
}) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><Calendar className="h-4 w-4 text-primary" /></div>
              Próximos Agendamentos
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary" asChild>
              <a href="#/admin/agenda">Ver agenda <ChevronRight className="h-3 w-3" /></a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentAppointments.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Nenhum agendamento encontrado</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Horário</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Título</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAppointments.map((a) => (
                  <TableRow key={a.id} className="border-border/50">
                    <TableCell className="py-2">
                      <span className="text-[11px] font-semibold">
                        {new Date(a.start_time).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </TableCell>
                    <TableCell className="py-2"><span className="text-[11px]">{a.title}</span></TableCell>
                    <TableCell className="py-2"><Badge variant="secondary" className="text-[10px]">{a.type}</Badge></TableCell>
                    <TableCell className="py-2"><Badge variant="outline" className="text-[10px]">{a.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Tab: Equipe ────────────────────────────────────────────────────────────
const TabEquipe = ({ metrics }: { metrics: ReturnType<typeof useAdminDashboardData>["metrics"] }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <MetricCard title="Proprietários" value={metrics.ownersCount ?? "—"} icon={Building2} accentColor={CHART_COLORS.teal} />
      <MetricCard title="Agendamentos" value={metrics.appointmentsCount ?? "—"} icon={Calendar} accentColor={CHART_COLORS.blue} />
    </div>
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10"><Users className="h-4 w-4 text-success" /></div>
          Visão Geral da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {metrics.ownersCount !== null
            ? `${metrics.ownersCount} proprietário${metrics.ownersCount !== 1 ? "s" : ""} cadastrado${metrics.ownersCount !== 1 ? "s" : ""}.`
            : "Carregando..."}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {metrics.appointmentsCount !== null
            ? `${metrics.appointmentsCount} agendamento${metrics.appointmentsCount !== 1 ? "s" : ""} no total.`
            : "Carregando..."}
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          Para gerenciar agentes e membros da equipe, use o menu lateral em Configurações.
        </p>
      </CardContent>
    </Card>
  </div>
);

// ─── Dashboard ──────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { profile, normalizedRole } = useAuth();
  const [activeTab, setActiveTab] = useState("visao-geral");
  const { metrics, recentProperties, recentContacts, recentAppointments, loading, error } = useAdminDashboardData();
  const firstName = profile?.full_name?.split(" ")[0] || "Admin";

  console.log('[AdminDashboard] render → profile:', profile?.id, 'role:', normalizedRole, 'loading:', loading, 'error:', error);

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Sub Navigation — only real tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {REAL_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-4">
          {activeTab === "visao-geral" && (
            <TabVisaoGeral metrics={metrics} recentProperties={recentProperties} recentContacts={recentContacts} loading={loading} />
          )}
          {activeTab === "imoveis" && (
            <TabImoveis recentProperties={recentProperties} metrics={metrics} />
          )}
          {activeTab === "leads" && (
            <TabLeads recentContacts={recentContacts} />
          )}
          {activeTab === "agenda" && (
            <TabAgenda recentAppointments={recentAppointments} />
          )}
          {activeTab === "equipe" && (
            <TabEquipe metrics={metrics} />
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
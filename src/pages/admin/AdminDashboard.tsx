import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import {
  BarChart3, Building2, Eye, Home, LucideIcon,
  MoreHorizontal, Phone, TrendingUp, Users,
  ChevronRight, User, Calendar, HomeIcon,
  AlertCircle, CheckCircle2, ArrowUpRight,
  MessageSquare, Star, DollarSign, Target,
  Plus, Headset, Bell, Search, Grid3X3,
  Clock, FileText, XCircle,
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

const CHART_COLORS = {
  teal: "#0d9488",
  orange: "#f97316",
  blue: "#2563eb",
  green: "#16a34a",
  purple: "#9333ea",
  pink: "#ec4899",
  red: "#dc2626",
  yellow: "#eab308",
  cyan: "#06b6d4",
  slate: "#64748b",
};

// Color fills for area chart
const AREA_TEAL = "hsl(var(--primary) / 0.25)";
const AREA_ORANGE = "hsl(var(--warning) / 0.25)";

// ─── Mock Data ────────────────────────────────────────────────────────────
const MOCK_METRICS = {
  imoveisAtivos: 41,
  leads: { novos: 10, total: 80 },
  vendas: 7,
  vgv: "R$ 2.1M",
  comissao: "R$ 60K",
  clientes: 128,
};

const MOCK_EVOLUCAO_DATA = [
  { name: "Set/25", leads: 18, negocios: 5 },
  { name: "Out/25", leads: 24, negocios: 7 },
  { name: "Nov/25", leads: 22, negocios: 6 },
  { name: "Dez/25", leads: 31, negocios: 8 },
  { name: "Jan/26", leads: 28, negocios: 7 },
  { name: "Fev/26", leads: 35, negocios: 9 },
  { name: "Mar/26", leads: 41, negocios: 7 },
];

const MOCK_ALERTAS = [
  { text: "8 imóveis desatualizados", type: "warning" as const, icon: "home" },
  { text: "15 leads sem atividade", type: "urgent" as const, icon: "alert" },
  { text: "23 leads aguardando", type: "info" as const, icon: "clock" },
];

const MOCK_LEADS = [
  { id: "1", name: "Carlos Silva", source: "Orgânico", status: "Quente", value: "R$ 450K", time: "4h" },
  { id: "2", name: "Ana Beatriz", source: "Instagram", status: "Morno", value: "R$ 320K", time: "1d" },
  { id: "3", name: "Roberto Mendes", source: "Indicação", status: "Quente", value: "R$ 890K", time: "2d" },
  { id: "4", name: "Fernanda Costa", source: "ZAP", status: "Frio", value: "R$ 210K", time: "3d" },
  { id: "5", name: "Pedro Henrique", source: "Orgânico", status: "Quente", value: "R$ 560K", time: "1sem" },
];

const MOCK_IMOVEIS_NEGOCIOS = [
  { id: "1", titulo: "Casa 3qts w/ pool", tipo: "Venda", valor: "R$ 890K", statusColor: "bg-green-500" },
  { id: "2", titulo: "Apto 2qts centro", tipo: "Proposta", valor: "R$ 420K", statusColor: "bg-yellow-500" },
  { id: "3", titulo: "Cobertura duplex", tipo: "Captado", valor: "R$ 1.2M", statusColor: "bg-cyan-500" },
  { id: "4", titulo: "Casa 4qts Imbuí", tipo: "Venda", valor: "R$ 750K", statusColor: "bg-green-500" },
  { id: "5", titulo: "Apto 1qt garagem", tipo: "Aluguel", valor: "R$ 1.8K", statusColor: "bg-blue-500" },
];

const MOCK_TRAFEGO = [
  { name: "Orgânico", value: 38, color: CHART_COLORS.teal },
  { name: "Pago", value: 27, color: CHART_COLORS.blue },
  { name: "Instagram", value: 18, color: CHART_COLORS.purple },
  { name: "Portais", value: 12, color: CHART_COLORS.orange },
  { name: "Indicação", value: 5, color: CHART_COLORS.pink },
];

const MOCK_PAGO_VS_ORGANICO = [
  { name: "Set", pago: 2400, organico: 1800 },
  { name: "Out", pago: 3200, organico: 2100 },
  { name: "Nov", pago: 2800, organico: 2600 },
  { name: "Dez", pago: 4100, organico: 3200 },
  { name: "Jan", pago: 3800, organico: 3400 },
  { name: "Fev", pago: 4600, organico: 3900 },
  { name: "Mar", pago: 4100, organico: 3700 },
];

const MOCK_EQUIPE = [
  { nome: "Marcos", vendas: 8, meta: 10, pct: 80, color: CHART_COLORS.teal },
  { nome: "Juliana", vendas: 6, meta: 10, pct: 60, color: CHART_COLORS.blue },
  { nome: "Ricardo", vendas: 5, meta: 8, pct: 62, color: CHART_COLORS.orange },
  { nome: "Patrícia", vendas: 4, meta: 8, pct: 50, color: CHART_COLORS.purple },
  { nome: "Thiago", vendas: 3, meta: 6, pct: 50, color: CHART_COLORS.green },
];

// ─── Metric Card ──────────────────────────────────────────────────────────
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accentColor: string;
}

const MetricCard = ({ title, value, subtitle, icon: Icon, accentColor }: MetricCardProps) => (
  <Card className="relative overflow-hidden hover:shadow-card-hover transition-shadow">
    {/* Bottom accent bar */}
    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: accentColor }} />
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="font-display text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── Alert Bar ────────────────────────────────────────────────────────────
const AlertBar = ({ text, type }: { text: string; type: "warning" | "urgent" | "info" }) => {
  const config = {
    warning: { bg: "bg-yellow-50 border-yellow-200", icon: "🏠", color: "text-yellow-700" },
    urgent: { bg: "bg-red-50 border-red-200", icon: "⚠️", color: "text-red-700" },
    info: { bg: "bg-cyan-50 border-cyan-200", icon: "⏱️", color: "text-cyan-700" },
  };
  const c = config[type];
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${c.bg}`}>
      <span className="text-base">{c.icon}</span>
      <span className={`text-xs font-medium ${c.color}`}>{text}</span>
    </div>
  );
};

// ─── Lead Status Dot ───────────────────────────────────────────────────────
const StatusDot = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    Quente: "bg-red-500",
    Morno: "bg-yellow-500",
    Frio: "bg-slate-400",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status] || "bg-slate-400"}`} />;
};

// ─── Sub Navigation Tabs ──────────────────────────────────────────────────
const SUB_TABS = [
  { id: "visao-geral", label: "Visão Geral", section: "overview" },
  { id: "analytics", label: "Analytics Site", section: "analytics" },
  { id: "imoveis", label: "Imóveis", section: "properties" },
  { id: "leads", label: "Leads", section: "leads" },
  { id: "propostas", label: "Propostas", section: "proposals" },
  { id: "financeiro", label: "Financeiro", section: "finance" },
  { id: "equipe", label: "Equipe", section: "team" },
  { id: "agenda", label: "Agenda", section: "schedule" },
  { id: "marketing", label: "Marketing", section: "marketing" },
];

const PERIOD_FILTERS = ["Hoje", "Ontem", "7D", "15D", "3M", "6M", "12M", "Este Ano"];

// ─── Dashboard ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("visao-geral");
  const firstName = profile?.full_name?.split(" ")[0] || "Admin";

  const metaPercent = Math.round((MOCK_METRICS.leads.novos / MOCK_METRICS.leads.total) * 100);

  return (
    <AdminLayout>
      <div className="space-y-4">

        {/* ─── Sub Navigation (tabs like in video) ─────────────────────────── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {SUB_TABS.map((tab) => (
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

        {/* ─── Main Content ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          {activeTab === "visao-geral" && (
          <>
          {/* ── Metric Cards Row (6 cards) ─────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard title="Imóveis Ativos" value={MOCK_METRICS.imoveisAtivos} icon={Home} accentColor={CHART_COLORS.blue} />
            <MetricCard title="Leads" value={`${MOCK_METRICS.leads.novos}/${MOCK_METRICS.leads.total}`} icon={Users} accentColor={CHART_COLORS.orange} />
            <MetricCard title="Vendas" value={MOCK_METRICS.vendas} icon={TrendingUp} accentColor={CHART_COLORS.cyan} />
            <MetricCard title="VGV Total" value={MOCK_METRICS.vgv} icon={DollarSign} accentColor={CHART_COLORS.green} />
            <MetricCard title="Comissão" value={MOCK_METRICS.comissao} icon={BarChart3} accentColor={CHART_COLORS.purple} />
            <MetricCard title="Clientes" value={MOCK_METRICS.clientes} icon={Star} accentColor={CHART_COLORS.pink} />
          </div>

          {/* ── Evolução + Atenção Necessária ───────────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><TrendingUp className="h-4 w-4 text-primary" /></div>
                      Evolução
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-[10px]"><span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: CHART_COLORS.teal}} />Leads</span>
                      <span className="flex items-center gap-1.5 text-[10px]"><span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: CHART_COLORS.orange}} />Negócios</span>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 py-0">Agrupar: Mensal</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 py-0">Origem</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={MOCK_EVOLUCAO_DATA} margin={{top:5,right:10,left:-20,bottom:0}}>
                      <defs>
                        <linearGradient id="colorTeal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_COLORS.teal} stopOpacity={0.3}/><stop offset="95%" stopColor={CHART_COLORS.teal} stopOpacity={0.02}/></linearGradient>
                        <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_COLORS.orange} stopOpacity={0.3}/><stop offset="95%" stopColor={CHART_COLORS.orange} stopOpacity={0.02}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
                      <XAxis dataKey="name" tick={{fontSize:11}} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:11}} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{backgroundColor:"hsl(var(--card))",border:"1px solid hsl(var(--border))",borderRadius:10,fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}/>
                      <Area type="monotone" dataKey="leads" stroke={CHART_COLORS.teal} strokeWidth={2} fill="url(#colorTeal)" dot={false} activeDot={{r:5}}/>
                      <Area type="monotone" dataKey="negocios" stroke={CHART_COLORS.orange} strokeWidth={2} fill="url(#colorOrange)" dot={false} activeDot={{r:5}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <AlertCircle className="h-4 w-4 text-destructive"/>Atenção Necessária
                    </CardTitle>
                    <Badge variant="destructive" className="text-[10px]">{MOCK_ALERTAS.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {MOCK_ALERTAS.map((alert,i)=>(<AlertBar key={i} text={alert.text} type={alert.type}/>))}
                  <Button variant="ghost" size="sm" className="w-full text-xs h-7 mt-1">Ver todos os alertas</Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Leads Recentes + Imóveis e Negócios ───────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><Users className="h-4 w-4 text-primary"/></div>
                    Leads Recentes
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary">Ver todos <ChevronRight className="h-3 w-3"/></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {MOCK_LEADS.map((lead)=>(<div key={lead.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                    <StatusDot status={lead.status}/>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10"><User className="h-4 w-4 text-primary"/></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{lead.name}</p>
                      <p className="text-[10px] text-muted-foreground">{lead.source} · {lead.value}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge variant="secondary" className={`text-[10px] shrink-0 ${lead.status==="Quente"?"bg-red-100 text-red-700":lead.status==="Morno"?"bg-yellow-100 text-yellow-700":"bg-muted text-muted-foreground"}`}>{lead.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">{lead.time}</span>
                    </div>
                  </div>))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10"><Home className="h-4 w-4 text-info"/></div>
                    Imóveis e Negócios
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary">Ver imóveis <ChevronRight className="h-3 w-3"/></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Imóvel</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Valor</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {MOCK_IMOVEIS_NEGOCIOS.map((imovel)=>(<TableRow key={imovel.id} className="border-border/50">
                      <TableCell className="py-2"><div className="flex items-center gap-2"><HomeIcon className="h-4 w-4 text-muted-foreground shrink-0"/><span className="text-[11px] font-medium line-clamp-1">{imovel.titulo}</span></div></TableCell>
                      <TableCell className="py-2"><span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${imovel.statusColor}`}/><span className="text-[11px]">{imovel.tipo}</span></TableCell>
                      <TableCell className="py-2 text-right"><span className="text-[11px] font-semibold">{imovel.valor}</span></TableCell>
                    </TableRow>))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* ── Origens de Tráfego + Pago vs Orgânico ──────────────────── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><BarChart3 className="h-4 w-4 text-primary"/></div>
                  Origens de Tráfego
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {MOCK_TRAFEGO.map((item)=>(<div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-semibold">{item.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{width:`${item.value}%`,backgroundColor:item.color}}/>
                  </div>
                </div>))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10"><TrendingUp className="h-4 w-4 text-warning"/></div>
                  Pago vs Orgânico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={MOCK_PAGO_VS_ORGANICO} margin={{top:5,right:10,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
                    <XAxis dataKey="name" tick={{fontSize:10}} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10}} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{backgroundColor:"hsl(var(--card))",border:"1px solid hsl(var(--border))",borderRadius:8,fontSize:11}}/>
                    <Bar dataKey="pago" fill={CHART_COLORS.blue} name="Pago" radius={[4,4,0,0]} barSize={16}/>
                    <Bar dataKey="organico" fill={CHART_COLORS.teal} name="Orgânico" radius={[4,4,0,0]} barSize={16}/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ── Imóveis Mais Visitados + Performance da Equipe ─────────── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10"><Eye className="h-4 w-4 text-info"/></div>
                    Imóveis Mais Visitados
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary">Ver todos <ChevronRight className="h-3 w-3"/></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Imóvel</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Visitas</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {[{titulo:"Casa 3qts w/ pool",visitas:312},{titulo:"Apto 2qts centro",visitas:287},{titulo:"Cobertura duplex",visitas:241},{titulo:"Casa 4qts Imbuí",visitas:198},{titulo:"Apto 1qt garagem",visitas:156}].map((imovel,i)=>(<TableRow key={i} className="border-border/50">
                      <TableCell className="py-2"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted"><HomeIcon className="h-4 w-4 text-muted-foreground"/></div><span className="text-[11px] font-medium line-clamp-1 max-w-[180px]">{imovel.titulo}</span></div></TableCell>
                      <TableCell className="py-2 text-right"><div className="flex items-center justify-end gap-1.5"><Eye className="h-3.5 w-3.5 text-muted-foreground"/><span className="text-[11px] font-semibold">{imovel.visitas}</span></div></TableCell>
                    </TableRow>))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10"><Star className="h-4 w-4 text-success"/></div>
                  Performance da Equipe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {MOCK_EQUIPE.map((membro,i)=>(<div key={membro.nome} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold" style={{backgroundColor:`${membro.color}20`,color:membro.color}}>{i+1}</span>
                      <span className="text-xs font-semibold">{membro.nome}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{membro.vendas}/{membro.meta} — {membro.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden ml-8">
                    <div className="h-full rounded-full transition-all" style={{width:`${Math.min(membro.pct,100)}%`,backgroundColor:membro.color}}/>
                  </div>
                </div>))}
              </CardContent>
            </Card>
          </div>

          {/* ── Meta do Mês + Status Rápido ────────────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-bold"><Target className="h-4 w-4 text-success"/>Meta do Mês</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <div><p className="text-[11px] text-muted-foreground">Leads novos</p><p className="font-display text-2xl font-bold">{MOCK_METRICS.leads.novos}</p></div>
                  <p className="text-sm font-semibold text-muted-foreground">/ {MOCK_METRICS.leads.total}</p>
                </div>
                <Progress value={metaPercent} className="h-2"/>
                <p className="text-center text-[11px] text-muted-foreground">{metaPercent}% atingido</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 className="h-4 w-4 text-muted-foreground"/>Status Rápido</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[{label:"Imóveis ativos",value:"24",ok:true},{label:"Leads pendentes",value:"8",ok:false},{label:"Visitas hoje",value:"3",ok:true},{label:"Contratos",value:"2",ok:true}].map((item)=>(<div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block h-2 w-2 rounded-full ${item.ok?"bg-success":"bg-warning"}`}/>
                    <span className="text-xs font-semibold">{item.value}</span>
                  </div>
                </div>))}
              </CardContent>
            </Card>
          </div>
          </>
          )}

          {activeTab === "analytics" && (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard title="Visitas" value="2.847" subtitle="este mês" icon={Eye} accentColor={CHART_COLORS.blue}/>
            <MetricCard title="Páginas/Dia" value="18" subtitle="média" icon={BarChart3} accentColor={CHART_COLORS.teal}/>
            <MetricCard title="Taxa Rejeição" value="34%" subtitle="-2% vs mês anterior" icon={TrendingUp} accentColor={CHART_COLORS.orange}/>
            <MetricCard title="Tempo Médio" value="2m34s" subtitle="+15s vs anterior" icon={Clock} accentColor={CHART_COLORS.purple}/>
            <MetricCard title="Novas Visitas" value="61%" subtitle="de novos visitantes" icon={Users} accentColor={CHART_COLORS.cyan}/>
            <MetricCard title="Retorno" value="39%" subtitle="visitantes recorrentes" icon={Star} accentColor={CHART_COLORS.pink}/>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-bold"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><BarChart3 className="h-4 w-4 text-primary"/></div>Origens de Tráfego</CardTitle></CardHeader><CardContent className="space-y-3">{MOCK_TRAFEGO.map((item)=>(<div key={item.name} className="space-y-1"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">{item.name}</span><span className="font-semibold">{item.value}%</span></div><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${item.value}%`,backgroundColor:item.color}}/></div></div>))}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-bold"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10"><TrendingUp className="h-4 w-4 text-warning"/></div>Pago vs Orgânico</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={160}><BarChart data={MOCK_PAGO_VS_ORGANICO} margin={{top:5,right:10,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/><XAxis dataKey="name" tick={{fontSize:10}} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10}} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false}/><Tooltip contentStyle={{backgroundColor:"hsl(var(--card))",border:"1px solid hsl(var(--border))",borderRadius:8,fontSize:11}}/><Bar dataKey="pago" fill={CHART_COLORS.blue} name="Pago" radius={[4,4,0,0]} barSize={16}/><Bar dataKey="organico" fill={CHART_COLORS.teal} name="Orgânico" radius={[4,4,0,0]} barSize={16}/></BarChart></ResponsiveContainer></CardContent></Card>
          </div>
          <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-bold"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><TrendingUp className="h-4 w-4 text-primary"/></div>Evolução de Visitas</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={200}><AreaChart data={MOCK_EVOLUCAO_DATA} margin={{top:5,right:10,left:-20,bottom:0}}><defs><linearGradient id="colorTealAN" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_COLORS.teal} stopOpacity={0.3}/><stop offset="95%" stopColor={CHART_COLORS.teal} stopOpacity={0.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/><XAxis dataKey="name" tick={{fontSize:11}} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11}} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false}/><Tooltip contentStyle={{backgroundColor:"hsl(var(--card))",border:"1px solid hsl(var(--border))",borderRadius:10,fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}/><Area type="monotone" dataKey="leads" stroke={CHART_COLORS.teal} strokeWidth={2} fill="url(#colorTealAN)" dot={false} activeDot={{r:5}}/></AreaChart></ResponsiveContainer></CardContent></Card>
          </>
          )}

          {activeTab === "imoveis" && (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard title="Total Imóveis" value="87" subtitle="cadastrados" icon={Home} accentColor={CHART_COLORS.blue}/>
            <MetricCard title="Ativos" value="41" subtitle="no ar" icon={CheckCircle2} accentColor={CHART_COLORS.green}/>
            <MetricCard title="Proposta" value="12" subtitle="em negociação" icon={TrendingUp} accentColor={CHART_COLORS.orange}/>
            <MetricCard title="Captado" value="8" subtitle="negociados" icon={Star} accentColor={CHART_COLORS.purple}/>
            <MetricCard title="Vendas" value="R$ 2.1M" subtitle="VGV" icon={DollarSign} accentColor={CHART_COLORS.cyan}/>
            <MetricCard title="Aluguel" value="R$ 28K" subtitle="mensal" icon={BarChart3} accentColor={CHART_COLORS.pink}/>
          </div>
          <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-sm font-bold"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10"><Home className="h-4 w-4 text-info"/></div>Imóveis e Negócios</CardTitle><Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary">Ver imóveis <ChevronRight className="h-3 w-3"/></Button></div></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Imóvel</TableHead><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</TableHead><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{MOCK_IMOVEIS_NEGOCIOS.map((imovel)=>(<TableRow key={imovel.id} className="border-border/50"><TableCell className="py-2"><div className="flex items-center gap-2"><HomeIcon className="h-4 w-4 text-muted-foreground shrink-0"/><span className="text-[11px] font-medium line-clamp-1">{imovel.titulo}</span></div></TableCell><TableCell className="py-2"><span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${imovel.statusColor}`}/><span className="text-[11px]">{imovel.tipo}</span></TableCell><TableCell className="py-2 text-right"><span className="text-[11px] font-semibold">{imovel.valor}</span></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
          <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-sm font-bold"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10"><Eye className="h-4 w-4 text-info"/></div>Imóveis Mais Visitados</CardTitle><Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary">Ver todos <ChevronRight className="h-3 w-3"/></Button></div></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Imóvel</TableHead><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Visitas</TableHead></TableRow></TableHeader><TableBody>{[{titulo:"Casa 3qts w/ pool",visitas:312},{titulo:"Apto 2qts centro",visitas:287},{titulo:"Cobertura duplex",visitas:241},{titulo:"Casa 4qts Imbuí",visitas:198},{titulo:"Apto 1qt garagem",visitas:156}].map((imovel,i)=>(<TableRow key={i} className="border-border/50"><TableCell className="py-2"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted"><HomeIcon className="h-4 w-4 text-muted-foreground"/></div><span className="text-[11px] font-medium line-clamp-1 max-w-[180px]">{imovel.titulo}</span></div></TableCell><TableCell className="py-2 text-right"><div className="flex items-center justify-end gap-1.5"><Eye className="h-3.5 w-3.5 text-muted-foreground"/><span className="text-[11px] font-semibold">{imovel.visitas}</span></div></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
          </>
          )}

          {activeTab === "leads" && (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard title="Total Leads" value="80" subtitle="cadastrados" icon={Users} accentColor={CHART_COLORS.blue}/>
            <MetricCard title="Novos" value="10" subtitle="este período" icon={Plus} accentColor={CHART_COLORS.cyan}/>
            <MetricCard title="Quentes" value="18" subtitle="alta prioridade" icon={TrendingUp} accentColor={CHART_COLORS.red}/>
            <MetricCard title="Mornos" value="35" subtitle="em acompanhamento" icon={Star} accentColor={CHART_COLORS.orange}/>
            <MetricCard title="Frios" value="27" subtitle="precisam reaquecer" icon={AlertCircle} accentColor={CHART_COLORS.slate}/>
            <MetricCard title="Convertidos" value="7" subtitle="negócios fechados" icon={CheckCircle2} accentColor={CHART_COLORS.green}/>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><Users className="h-4 w-4 text-primary"/></div>
                  Leads Recentes
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary">Ver todos <ChevronRight className="h-3 w-3"/></Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {MOCK_LEADS.map((lead)=>(<div key={lead.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <StatusDot status={lead.status}/>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10"><User className="h-4 w-4 text-primary"/></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{lead.name}</p>
                    <p className="text-[10px] text-muted-foreground">{lead.source} · {lead.value}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <Badge variant="secondary" className={`text-[10px] shrink-0 ${lead.status==="Quente"?"bg-red-100 text-red-700":lead.status==="Morno"?"bg-yellow-100 text-yellow-700":"bg-muted text-muted-foreground"}`}>{lead.status}</Badge>
                    <span className="text-[10px] text-muted-foreground">{lead.time}</span>
                  </div>
                </div>))}
              </div>
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-bold"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><AlertCircle className="h-4 w-4 text-destructive"/>Leads Sem Atividade</CardTitle></CardHeader><CardContent className="space-y-3"><AlertBar text="15 leads sem atividade há mais de 7 dias" type="warning"/><AlertBar text="8 leads sem estágio definido" type="info"/><Button variant="ghost" size="sm" className="w-full text-xs h-7">Ver todos os leads pendentes</Button></CardContent></Card>
          </>
          )}

          {activeTab === "propostas" && (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard title="Propostas" value="15" subtitle="abertas" icon={FileText} accentColor={CHART_COLORS.blue}/>
            <MetricCard title="Aceitas" value="7" subtitle="confirmadas" icon={CheckCircle2} accentColor={CHART_COLORS.green}/>
            <MetricCard title="Recusadas" value="3" subtitle="rejeitadas" icon={XCircle} accentColor={CHART_COLORS.red}/>
            <MetricCard title="Em Análise" value="5" subtitle="avaliação" icon={Clock} accentColor={CHART_COLORS.orange}/>
            <MetricCard title="VGV Total" value="R$ 4.2M" subtitle="propostas ativas" icon={DollarSign} accentColor={CHART_COLORS.cyan}/>
            <MetricCard title="Comissão" value="R$ 126K" subtitle="prevista" icon={BarChart3} accentColor={CHART_COLORS.purple}/>
          </div>
          <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-bold"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><FileText className="h-4 w-4 text-primary"/></div>Propostas em Andamento</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Imóvel</TableHead><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</TableHead><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Valor</TableHead><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead></TableRow></TableHeader><TableBody>{[{titulo:"Casa 3qts w/ pool",cliente:"Carlos Silva",valor:"R$ 890K",status:"Aceita",statusColor:"bg-green-100 text-green-700"},{titulo:"Apto 2qts centro",cliente:"Ana Beatriz",valor:"R$ 420K",status:"Análise",statusColor:"bg-yellow-100 text-yellow-700"},{titulo:"Cobertura duplex",cliente:"Roberto Mendes",valor:"R$ 1.2M",status:"Aceita",statusColor:"bg-green-100 text-green-700"},{titulo:"Casa 4qts Imbuí",cliente:"Fernanda Costa",valor:"R$ 750K",status:"Recusada",statusColor:"bg-red-100 text-red-700"}].map((p,i)=>(<TableRow key={i} className="border-border/50"><TableCell className="py-2"><span className="text-[11px] font-medium">{p.titulo}</span></TableCell><TableCell className="py-2"><span className="text-[11px]">{p.cliente}</span></TableCell><TableCell className="py-2"><span className="text-[11px] font-semibold">{p.valor}</span></TableCell><TableCell className="py-2"><Badge className={`text-[10px] ${p.statusColor}`}>{p.status}</Badge></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
          </>
          )}

          {activeTab === "financeiro" && (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard title="VGV" value="R$ 2.1M" subtitle="total" icon={DollarSign} accentColor={CHART_COLORS.green}/>
            <MetricCard title="Comissão" value="R$ 60K" subtitle="recebida" icon={BarChart3} accentColor={CHART_COLORS.cyan}/>
            <MetricCard title="Pendente" value="R$ 35K" subtitle="a receber" icon={Clock} accentColor={CHART_COLORS.orange}/>
            <MetricCard title="Recebido" value="R$ 25K" subtitle="este mês" icon={CheckCircle2} accentColor={CHART_COLORS.teal}/>
            <MetricCard title="Contratos" value="12" subtitle="fechados" icon={FileText} accentColor={CHART_COLORS.purple}/>
            <MetricCard title="Tickets" value="R$ 8.2K" subtitle="ticket médio" icon={TrendingUp} accentColor={CHART_COLORS.pink}/>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-bold"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><DollarSign className="h-4 w-4 text-primary"/></div>Comissão por Mês</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={180}><BarChart data={[{name:"Set",comissao:12},{name:"Out",comissao:18},{name:"Nov",comissao:15},{name:"Dez",comissao:22},{name:"Jan",comissao:20},{name:"Fev",comissao:25},{name:"Mar",comissao:18}]} margin={{top:5,right:10,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/><XAxis dataKey="name" tick={{fontSize:11}} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11}} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false}/><Tooltip contentStyle={{backgroundColor:"hsl(var(--card))",border:"1px solid hsl(var(--border))",borderRadius:8,fontSize:11}}/><Bar dataKey="comissao" fill={CHART_COLORS.teal} name="Comissão (R$ mil)" radius={[4,4,0,0]} barSize={20}/></BarChart></ResponsiveContainer></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-bold"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10"><TrendingUp className="h-4 w-4 text-success"/></div>VGV x Meta</CardTitle></CardHeader><CardContent className="space-y-3">{[{mes:"Jan/26",vgv:85,meta:100,cor:CHART_COLORS.teal},{mes:"Fev/26",vgv:110,meta:100,cor:CHART_COLORS.green},{mes:"Mar/26",vgv:92,meta:100,cor:CHART_COLORS.orange}].map((m)=>(<div key={m.mes} className="space-y-1.5"><div className="flex items-center justify-between"><span className="text-xs font-semibold">{m.mes}</span><span className="text-[11px] text-muted-foreground">{m.vgv}% da meta</span></div><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${Math.min(m.vgv,100)}%`,backgroundColor:m.cor}}/></div></div>))}</CardContent></Card>
          </div>
          </>
          )}

          {activeTab === "equipe" && (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard title="Equipe" value="5" subtitle="agentes" icon={Users} accentColor={CHART_COLORS.blue}/>
            <MetricCard title="Vendas" value="7" subtitle="este mês" icon={TrendingUp} accentColor={CHART_COLORS.green}/>
            <MetricCard title="VGV" value="R$ 2.1M" subtitle="equipe" icon={DollarSign} accentColor={CHART_COLORS.cyan}/>
            <MetricCard title="Comissão" value="R$ 60K" subtitle="equipe" icon={BarChart3} accentColor={CHART_COLORS.purple}/>
            <MetricCard title="Visitas" value="23" subtitle="este mês" icon={Home} accentColor={CHART_COLORS.orange}/>
            <MetricCard title="Propostas" value="15" subtitle="abertas" icon={FileText} accentColor={CHART_COLORS.pink}/>
          </div>
          <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-bold"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10"><Star className="h-4 w-4 text-success"/></div>Performance da Equipe</CardTitle></CardHeader><CardContent className="space-y-4">{MOCK_EQUIPE.map((membro,i)=>(<div key={membro.nome} className="space-y-1.5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold" style={{backgroundColor:`${membro.color}20`,color:membro.color}}>{i+1}</span><span className="text-xs font-semibold">{membro.nome}</span></div><span className="text-[11px] text-muted-foreground">{membro.vendas}/{membro.meta} — {membro.pct}%</span></div><div className="h-2 rounded-full bg-muted overflow-hidden ml-8"><div className="h-full rounded-full transition-all" style={{width:`${Math.min(membro.pct,100)}%`,backgroundColor:membro.color}}/></div></div>))}</CardContent></Card>
          </>
          )}

          {activeTab === "agenda" && (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard title="Hoje" value="3" subtitle="compromissos" icon={Calendar} accentColor={CHART_COLORS.blue}/>
            <MetricCard title="Esta Semana" value="12" subtitle="agendados" icon={Calendar} accentColor={CHART_COLORS.teal}/>
            <MetricCard title="Visitas" value="8" subtitle="marcadas" icon={Home} accentColor={CHART_COLORS.cyan}/>
            <MetricCard title="Pendentes" value="5" subtitle="sem confirmação" icon={AlertCircle} accentColor={CHART_COLORS.orange}/>
            <MetricCard title="Concluídas" value="18" subtitle="este mês" icon={CheckCircle2} accentColor={CHART_COLORS.green}/>
            <MetricCard title="Canceladas" value="2" subtitle="este mês" icon={XCircle} accentColor={CHART_COLORS.red}/>
          </div>
          <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-sm font-bold"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><Calendar className="h-4 w-4 text-primary"/></div>Próximos Compromissos</CardTitle><Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary">Ver agenda <ChevronRight className="h-3 w-3"/></Button></div></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Horário</TableHead><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</TableHead><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Imóvel</TableHead><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</TableHead></TableRow></TableHeader><TableBody>{[{hora:"09:00",cliente:"Carlos Silva",imovel:"Casa 3qts w/ pool",tipo:"Visita"},{hora:"11:30",cliente:"Ana Beatriz",imovel:"Apto 2qts centro",tipo:"Visita"},{hora:"14:00",cliente:"Roberto Mendes",imovel:"Cobertura duplex",tipo:"Negociação"},{hora:"16:00",cliente:"Fernanda Costa",imovel:"Casa 4qts Imbuí",tipo:"Visita"}].map((a,i)=>(<TableRow key={i} className="border-border/50"><TableCell className="py-2"><span className="text-[11px] font-semibold">{a.hora}</span></TableCell><TableCell className="py-2"><span className="text-[11px]">{a.cliente}</span></TableCell><TableCell className="py-2"><span className="text-[11px]">{a.imovel}</span></TableCell><TableCell className="py-2"><Badge variant="secondary" className="text-[10px]">{a.tipo}</Badge></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
          </>
          )}

          {activeTab === "marketing" && (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard title="Campanhas" value="3" subtitle="ativas" icon={Target} accentColor={CHART_COLORS.blue}/>
            <MetricCard title="Spend" value="R$ 149" subtitle="últimos 7 dias" icon={TrendingUp} accentColor={CHART_COLORS.orange}/>
            <MetricCard title="Impressões" value="8.5K" subtitle="últimos 7 dias" icon={Eye} accentColor={CHART_COLORS.cyan}/>
            <MetricCard title="Cliques" value="368" subtitle="CTR 4.29%" icon={BarChart3} accentColor={CHART_COLORS.teal}/>
            <MetricCard title="Mensagens" value="83" subtitle="recebidas" icon={MessageSquare} accentColor={CHART_COLORS.purple}/>
            <MetricCard title="Leads" value="12" subtitle="conversões" icon={Users} accentColor={CHART_COLORS.green}/>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-bold"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><Target className="h-4 w-4 text-primary"/></div>Campanhas Ativas</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Campanha</TableHead><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Spend</TableHead></TableRow></TableHeader><TableBody>{[{nome:"Bonfim 13/05/26",status:"🟢 Ativa",valor:"R$ 89"},{nome:"Chác. Medeiros",status:"🟡 Pausada",valor:"R$ 35"},{nome:"Chác. MG - Bonfim",status:"🟡 Pausada",valor:"R$ 25"}].map((c,i)=>(<TableRow key={i} className="border-border/50"><TableCell className="py-2"><span className="text-[11px] font-medium">{c.nome}</span></TableCell><TableCell className="py-2"><span className="text-[11px]">{c.status}</span></TableCell><TableCell className="py-2 text-right"><span className="text-[11px] font-semibold">{c.valor}</span></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-bold"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10"><BarChart3 className="h-4 w-4 text-info"/></div>Portais Integrados</CardTitle></CardHeader><CardContent className="space-y-3">{[{portal:"OLX",status:"Conectado",imoveis:24},{portal:"ZAP",status:"Conectado",imoveis:18},{portal:"Viva Real",status:"Conectado",imoveis:12},{portal:"Imovelweb",status:"Conectado",imoveis:8}].map((p)=>(<div key={p.portal} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-xs font-semibold">{p.portal}</span><Badge variant="secondary" className="text-[10px]">{p.status}</Badge></div><span className="text-[11px] text-muted-foreground">{p.imoveis} imóveis</span></div>))}</CardContent></Card>
          </div>
          </>
          )}
        </div>

        {/* ── FABs (Floating Action Buttons) ────────────────────────────── */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 shadow-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-5 w-5 text-white" />
          </button>
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 shadow-lg hover:bg-orange-600 transition-colors">
            <Headset className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground pb-8">
          Arruda Imobi Admin · Painel atualizado {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3, Building2, Eye, Home, LucideIcon,
  MoreHorizontal, Phone, TrendingUp, Users,
  ChevronRight, User, Calendar, HomeIcon,
  AlertCircle, CheckCircle2, ArrowUpRight,
  MessageSquare, Star, DollarSign, Target,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

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

// ─── Mock Data ────────────────────────────────────────────────────────────
const MOCK_METRICS = {
  leadsAtivos: 41,
  metaMensal: { current: 10, target: 80 },
  novosNegocios: 7,
  valorCarteira: "R$ 2.1M",
  receitaPrevista: "R$ 60K",
  atendimentos: 128,
};

const MOCK_EVOLUCAO_DATA = [
  { name: "Jan", leads: 12, negocios: 3 },
  { name: "Fev", leads: 19, negocios: 5 },
  { name: "Mar", leads: 15, negocios: 4 },
  { name: "Abr", leads: 28, negocios: 6 },
  { name: "Mai", leads: 35, negocios: 8 },
  { name: "Jun", leads: 41, negocios: 7 },
];

const MOCK_ALERTAS = [
  { p: "P0" as const, text: "5 leads sem resposta há +72h", time: "agora" },
  { p: "P1" as const, text: "Meta de junho 12% abaixo do esperado", time: "2h" },
  { p: "P2" as const, text: "3 visitas marcadas sem confirmação", time: "4h" },
  { p: "P2" as const, text: "2 contratos pendentes de assinatura", time: "1d" },
];

const MOCK_LEADS = [
  { id: "1", name: "Carlos Silva", source: "Orgânico", status: "Quente", value: "R$ 450K" },
  { id: "2", name: "Ana Beatriz", source: "Instagram", status: "Morno", value: "R$ 320K" },
  { id: "3", name: "Roberto Mendes", source: "Indicação", status: "Quente", value: "R$ 890K" },
  { id: "4", name: "Fernanda Costa", source: "ZAP", status: "Frio", value: "R$ 210K" },
  { id: "5", name: "Pedro Henrique", source: "Orgânico", status: "Quente", value: "R$ 560K" },
];

const MOCK_IMOVEIS = [
  { id: "1", titulo: "Casa 3qts with pool", visitas: 312, tipo: "Casa" },
  { id: "2", titulo: "Apto 2qts centro", visitas: 287, tipo: "Apartamento" },
  { id: "3", titulo: "Cobertura duplex", visitas: 241, tipo: "Cobertura" },
  { id: "4", titulo: "Casa 4qts Imbuí", visitas: 198, tipo: "Casa" },
  { id: "5", titulo: "Apto 1qt garagem", visitas: 156, tipo: "Apartamento" },
];

const MOCK_TRAFEGO = [
  { name: "Orgânico", value: 38, color: CHART_COLORS[0] },
  { name: "Pago", value: 27, color: CHART_COLORS[1] },
  { name: "Instagram", value: 18, color: CHART_COLORS[2] },
  { name: "Portais", value: 12, color: CHART_COLORS[3] },
  { name: "Indicação", value: 5, color: CHART_COLORS[4] },
];

const MOCK_PAGO_VS_ORGANICO = [
  { name: "Jan", pago: 2400, organico: 1800 },
  { name: "Fev", pago: 3200, organico: 2100 },
  { name: "Mar", pago: 2800, organico: 2600 },
  { name: "Abr", pago: 4100, organico: 3200 },
  { name: "Mai", pago: 3800, organico: 3400 },
  { name: "Jun", pago: 4600, organico: 3900 },
];

const MOCK_EQUIPE = [
  { nome: "Marcos", vendas: 8, meta: 10, fill: CHART_COLORS[0] },
  { nome: "Juliana", vendas: 6, meta: 10, fill: CHART_COLORS[1] },
  { nome: "Ricardo", vendas: 5, meta: 8, fill: CHART_COLORS[2] },
  { nome: "Patrícia", vendas: 4, meta: 8, fill: CHART_COLORS[3] },
  { nome: "Thiago", vendas: 3, meta: 6, fill: CHART_COLORS[4] },
];

// ─── Metric Card ──────────────────────────────────────────────────────────
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

const MetricCard = ({ title, value, subtitle, icon: Icon, iconBg, iconColor }: MetricCardProps) => (
  <Card className="hover:shadow-card-hover transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-muted-foreground truncate">{title}</p>
          <p className="font-display text-2xl font-bold truncate mt-1">{value}</p>
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

const AdminDashboard = () => {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Admin";
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const metaPercent = Math.round((MOCK_METRICS.metaMensal.current / MOCK_METRICS.metaMensal.target) * 100);

  return (
    <AdminLayout>
      <div className="space-y-5">

        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Painel da Imobiliária</h1>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{today} · Bem-vindo, {firstName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <Calendar className="h-3.5 w-3.5" />
              Jun 2026
            </Button>
          </div>
        </div>

        {/* ─── Metric Cards Row (6 cards) ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            title="Leads Ativos"
            value={MOCK_METRICS.leadsAtivos}
            icon={Users}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            subtitle="Total em pipeline"
          />
          <MetricCard
            title="Meta Mensal"
            value={`${MOCK_METRICS.metaMensal.current}/${MOCK_METRICS.metaMensal.target}`}
            icon={Target}
            iconBg="bg-success/10"
            iconColor="text-success"
            subtitle={`${metaPercent}% atingido`}
          />
          <MetricCard
            title="Novos Negócios"
            value={MOCK_METRICS.novosNegocios}
            icon={TrendingUp}
            iconBg="bg-warning/10"
            iconColor="text-warning"
            subtitle="Este mês"
          />
          <MetricCard
            title="Valor em Carteira"
            value={MOCK_METRICS.valorCarteira}
            icon={DollarSign}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-500"
            subtitle="Pipeline ativo"
          />
          <MetricCard
            title="Receita Prevista"
            value={MOCK_METRICS.receitaPrevista}
            icon={BarChart3}
            iconBg="bg-purple-500/10"
            iconColor="text-purple-500"
            subtitle="Comissão estimada"
          />
          <MetricCard
            title="Atendimentos"
            value={MOCK_METRICS.atendimentos}
            icon={MessageSquare}
            iconBg="bg-info/10"
            iconColor="text-info"
            subtitle="Junho 2026"
          />
        </div>

        {/* ─── Main Grid ───────────────────────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-3">

          {/* ── Left Column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Evolução */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    Evolução
                  </CardTitle>
                  <div className="flex gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      Leads
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      Negócios
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={MOCK_EVOLUCAO_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 10,
                        fontSize: 12,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                      }}
                    />
                    <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="negocios" stroke="hsl(var(--success))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Leads Recentes + Imóveis e Negócios side by side */}
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Leads Recentes */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10">
                        <Users className="h-4 w-4 text-success" />
                      </div>
                      Leads Recentes
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                      Ver todos <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {MOCK_LEADS.map((lead) => (
                      <div key={lead.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{lead.name}</p>
                          <p className="text-[10px] text-muted-foreground">{lead.source} · {lead.value}</p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] shrink-0 ${
                            lead.status === "Quente" ? "bg-destructive/10 text-destructive" :
                            lead.status === "Morno" ? "bg-warning/10 text-warning" :
                            "bg-muted text-muted-foreground"
                          }`}
                        >
                          {lead.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Imóveis e Negócios */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10">
                        <Home className="h-4 w-4 text-info" />
                      </div>
                      Imóveis e Negócios
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                      Ver todos <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Imóvel</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Visitas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MOCK_IMOVEIS.map((imovel) => (
                        <TableRow key={imovel.id} className="border-border/50">
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <HomeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div>
                                <p className="text-[11px] font-medium line-clamp-1">{imovel.titulo}</p>
                                <p className="text-[10px] text-muted-foreground">{imovel.tipo}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <span className="text-[11px] font-semibold">{imovel.visitas}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Origens de Tráfego + Pago vs Orgânico */}
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Origens de Tráfego */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
                      <BarChart3 className="h-4 w-4 text-warning" />
                    </div>
                    Origens de Tráfego
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {MOCK_TRAFEGO.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-semibold">{item.value}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${item.value}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Pago vs Orgânico */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                    </div>
                    Pago vs Orgânico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={MOCK_PAGO_VS_ORGANICO} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                      />
                      <Bar dataKey="pago" fill="hsl(var(--primary))" name="Pago" radius={[3, 3, 0, 0]} barSize={14} />
                      <Bar dataKey="organico" fill="hsl(var(--success))" name="Orgânico" radius={[3, 3, 0, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Imóveis Mais Visitados */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10">
                      <Eye className="h-4 w-4 text-info" />
                    </div>
                    Imóveis Mais Visitados
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                    Ver todos <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Imóvel</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Visitas</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_IMOVEIS.map((imovel, i) => (
                      <TableRow key={imovel.id} className="border-border/50">
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                              <HomeIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="text-[11px] font-medium line-clamp-1 max-w-[160px]">{imovel.titulo}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="secondary" className="text-[10px]">{imovel.tipo}</Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <span className="text-[11px] font-semibold">{imovel.visitas}</span>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Performance da Equipe */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10">
                    <Star className="h-4 w-4 text-success" />
                  </div>
                  Performance da Equipe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {MOCK_EQUIPE.map((membro, i) => {
                  const pct = Math.round((membro.vendas / membro.meta) * 100);
                  return (
                    <div key={membro.nome} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                            {i + 1}
                          </span>
                          <span className="text-xs font-semibold">{membro.nome}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {membro.vendas}/{membro.meta} — {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden ml-8">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            backgroundColor: membro.fill,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-5">

            {/* Atenção Necessária */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Atenção Necessária
                  </CardTitle>
                  <Badge variant="destructive" className="text-[10px]">{MOCK_ALERTAS.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {MOCK_ALERTAS.map((alert, i) => (
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

            {/* Meta do Mês */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Target className="h-4 w-4 text-success" />
                  Meta do Mês
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Leads novos</p>
                    <p className="font-display text-2xl font-bold">{MOCK_METRICS.metaMensal.current}</p>
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">/ {MOCK_METRICS.metaMensal.target}</p>
                </div>
                <Progress value={metaPercent} className="h-2" />
                <p className="text-center text-[11px] text-muted-foreground">{metaPercent}% atingido</p>
              </CardContent>
            </Card>

            {/* Status Rápido */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  Status Rápido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Imóveis ativos", value: "24", ok: true },
                  { label: "Leads pendentes", value: "8", ok: false },
                  { label: "Visitas hoje", value: "3", ok: true },
                  { label: "Contratos", value: "2", ok: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${item.ok ? "bg-success" : "bg-warning"}`} />
                      <span className="text-xs font-semibold">{item.value}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground">
          Arruda Imobi Admin · Painel atualizado {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { useTenantSettings } from "@/hooks/use-tenant-settings";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Eye, MousePointerClick, TrendingUp, Home, BarChart3, Inbox
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type PropertyAnalyticsEvent = Database["public"]["Tables"]["property_analytics"]["Row"] & {
  properties?: {
    title: string | null;
  };
};

interface PropertyRow {
  property_id: string;
  title: string;
  code: string;
  views: number;
  clicks: number;
  conversion: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BAR_COLORS = { views: "#003366", clicks: "#0ea5e9" };
const DONUT_COLORS = ["#003366", "#0ea5e9", "#22c55e", "#f59e0b"];

const PERIOD_OPTIONS = [
  { value: "1",  label: "Últimas 24h" },
  { value: "7",  label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, icon: Icon, iconColor,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconColor: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              {label}
            </p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: `${iconColor}18` }}
          >
            <Icon className="h-5 w-5" style={{ color: iconColor }} />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message = "Nenhum dado disponível no período" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-center">
      <span className="rounded-full bg-muted p-3">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </span>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Custom donut label ───────────────────────────────────────────────────────

const renderDonutLabel = ({ name, percent }: { name: string; percent: number }) =>
  percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : null;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PropertyPerformance() {
  const { data: tenant } = useTenantSettings();
  const [period, setPeriod] = useState("30");
  const [testLoading, setTestLoading] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: rawEvents, isLoading, refetch } = useQuery<PropertyAnalyticsEvent[]>({
    queryKey: ["property-performance", tenant?.id, period],
    queryFn: async () => {
      const dateFrom = new Date();
      if (period === "1") dateFrom.setHours(dateFrom.getHours() - 24);
      else dateFrom.setDate(dateFrom.getDate() - parseInt(period));

      const { data, error } = await supabase
        .from("property_analytics")
        .select<PropertyAnalyticsEvent>("event_type, property_id, properties(title)")
        .eq("tenant_id", tenant?.id)
        .gte("created_at", dateFrom.toISOString())
        .limit(5000);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenant?.id,
  });

  const insertFakeViews = async () => {
    if (!tenant?.id) return;
    setTestLoading(true);

    try {
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("id")
        .eq("tenant_id", tenant.id)
        .limit(1)
        .single();

      if (propertyError || !propertyData) {
        console.warn("Não foi possível encontrar imóvel para gerar visualizações de teste", propertyError);
        return;
      }

      const now = new Date();
      const fakeRows = Array.from({ length: 5 }).map((_, index) => ({
        tenant_id: tenant.id,
        property_id: propertyData.id,
        event_type: "view",
        created_at: new Date(now.getTime() - index * 60 * 60 * 1000).toISOString(),
      }));

      const { error: insertError } = await supabase.from("property_analytics").insert(fakeRows);
      if (insertError) {
        console.warn("Erro ao inserir visualizações de teste:", insertError.message);
      } else {
        await refetch();
      }
    } finally {
      setTestLoading(false);
    }
  };

  // ── Aggregation ────────────────────────────────────────────────────────────
  const rows: PropertyRow[] = useMemo(() => {
    if (!rawEvents?.length) return [];
    const map: Record<string, PropertyRow> = {};

    rawEvents.forEach((row: any) => {
      const pid = row.property_id;
      if (!map[pid]) {
        map[pid] = {
          property_id: pid,
          title: row.properties?.title ?? "Imóvel desconhecido",
          code: pid.split("-")[0].toUpperCase(),
          views: 0,
          clicks: 0,
          conversion: "0.0",
        };
      }
      if (row.event_type === "view") map[pid].views += 1;
      else if (row.event_type === "contact_click" || row.event_type === "whatsapp_click") map[pid].clicks += 1;
    });

    return Object.values(map)
      .map(r => ({ ...r, conversion: r.views > 0 ? ((r.clicks / r.views) * 100).toFixed(1) : "0.0" }))
      .sort((a, b) => b.views - a.views);
  }, [rawEvents]);

  // ── Summary metrics ────────────────────────────────────────────────────────
  const totalViews  = rows.reduce((s, r) => s + r.views, 0);
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const avgConv     = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";
  const hasData     = rows.length > 0;

  // ── Chart data ─────────────────────────────────────────────────────────────
  const barData = rows.slice(0, 5).map(r => ({
    name: r.title.length > 18 ? r.title.slice(0, 18) + "…" : r.title,
    Visualizações: r.views,
    Cliques: r.clicks,
  }));

  // Aggregate event types for donut
  const eventCounts = useMemo(() => {
    if (!rawEvents?.length) return [];
    const counts: Record<string, number> = {};
    rawEvents.forEach((r: any) => {
      counts[r.event_type] = (counts[r.event_type] ?? 0) + 1;
    });
    const labels: Record<string, string> = {
      view: "Visualização",
      contact_click: "Clique Contato",
      whatsapp_click: "Clique WhatsApp",
    };
    return Object.entries(counts).map(([key, value]) => ({
      name: labels[key] ?? key,
      value,
    }));
  }, [rawEvents]);

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6 pb-10">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-9 w-36" />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="space-y-6 pb-10">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Performance de Imóveis
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Analise tráfego, interações e conversões do seu catálogo.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-muted-foreground font-medium">Período:</span>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger id="period-select" className="w-[160px] bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={insertFakeViews} disabled={!tenant?.id || testLoading}>
              {testLoading ? "Gerando dados…" : "Inserir 5 views de teste"}
            </Button>
          </div>
        </div>

        {/* ── 1. Metric Cards ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Visualizações"    value={totalViews}       icon={Eye}              iconColor="#003366" />
          <MetricCard label="Cliques Contato"  value={totalClicks}      icon={MousePointerClick} iconColor="#0ea5e9" />
          <MetricCard
            label="Taxa de Conversão"
            value={`${avgConv}%`}
            sub="views → cliques"
            icon={TrendingUp}
            iconColor="#22c55e"
          />
          <MetricCard label="Imóveis Vistos"   value={rows.length}      icon={Home}             iconColor="#f59e0b" />
        </div>

        {/* ── 2. Charts ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* Bar Chart */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Top 5 Imóveis Mais Visualizados</CardTitle>
              <CardDescription>Visualizações vs Cliques de Contato</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px] pl-1 pr-3">
              {!hasData ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 5, left: -15, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      angle={-20}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                        fontSize: "12px",
                      }}
                      cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />
                    <Bar dataKey="Visualizações" fill={BAR_COLORS.views}  radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Cliques"       fill={BAR_COLORS.clicks} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Donut Chart */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Distribuição de Eventos</CardTitle>
              <CardDescription>Proporção de cada tipo de interação registrada</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              {!hasData ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={eventCounts}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      label={renderDonutLabel}
                      labelLine={false}
                    >
                      {eventCounts.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── 3. Ranking Table ── */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Ranking de Imóveis</CardTitle>
            <CardDescription>Métricas individuais por propriedade no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasData ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <span className="rounded-full bg-muted p-4">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                </span>
                <h3 className="font-semibold text-foreground">Nenhum dado disponível</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Seus imóveis ainda não registraram visitas ou contatos no período selecionado.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="w-10">#</TableHead>
                      <TableHead className="w-[90px]">Ref.</TableHead>
                      <TableHead>Título do Imóvel</TableHead>
                      <TableHead className="text-center">Visualizações</TableHead>
                      <TableHead className="text-center">Cliques</TableHead>
                      <TableHead className="text-right">Taxa Conversão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => {
                      const conv = parseFloat(row.conversion);
                      const badge =
                        conv >= 10 ? "default" :
                        conv >= 4  ? "secondary" :
                        "outline";
                      return (
                        <TableRow key={row.property_id} className="border-border">
                          <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                              {row.code}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">{row.title}</TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-1">
                              {row.views}
                              <Eye className="h-3 w-3 text-muted-foreground/50" />
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-1">
                              {row.clicks}
                              <MousePointerClick className="h-3 w-3 text-muted-foreground/50" />
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={badge}>
                              {row.conversion}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AdminLayout>
  );
}

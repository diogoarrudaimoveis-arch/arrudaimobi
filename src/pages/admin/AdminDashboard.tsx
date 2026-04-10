import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLeadMetrics } from "@/hooks/use-contacts";
import { Building2, Home, Users, MessageSquare, TrendingUp, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

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

const AdminDashboard = () => {
  const { tenantId, isReady, profile } = useAuth();
  const { data: leadMetrics } = useLeadMetrics();

  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats", tenantId],
    queryFn: async () => {
      const [props, agents, newContacts, totalContacts, types] = await Promise.all([
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId!),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId!).in("role", ["agent", "admin"]),
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId!).eq("status", "new"),
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId!),
        supabase.from("property_types").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId!),
      ]);
      return {
        properties: props.count || 0,
        agents: agents.count || 0,
        newContacts: newContacts.count || 0,
        totalContacts: totalContacts.count || 0,
        types: types.count || 0,
      };
    },
    enabled: isReady && !!tenantId,
  });

  const { data: byType } = useQuery({
    queryKey: ["admin-chart-by-type", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("type_id, property_types(name)")
        .eq("tenant_id", tenantId!);
      const counts: Record<string, number> = {};
      data?.forEach((p: any) => {
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
      const { data } = await supabase
        .from("properties")
        .select("purpose")
        .eq("tenant_id", tenantId!);
      const counts: Record<string, number> = {};
      data?.forEach((p: any) => {
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
      const { data } = await supabase
        .from("properties")
        .select("status")
        .eq("tenant_id", tenantId!);
      const statusLabels: Record<string, string> = {
        available: "Disponível", sold: "Vendido", rented: "Alugado", pending: "Pendente",
      };
      const counts: Record<string, number> = {};
      data?.forEach((p: any) => {
        const label = statusLabels[p.status] || p.status;
        counts[label] = (counts[label] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
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

      data?.forEach((c: any) => {
        const d = new Date(c.created_at);
        const key = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
        if (key in months) months[key]++;
      });

      return Object.entries(months).map(([name, leads]) => ({ name, leads }));
    },
    enabled: isReady && !!tenantId,
  });

  const statsCards = [
    { title: "Imóveis", value: stats?.properties ?? 0, icon: Home, gradient: "from-primary/10 to-primary/5", iconColor: "text-primary" },
    { title: "Agentes", value: stats?.agents ?? 0, icon: Users, gradient: "from-success/10 to-success/5", iconColor: "text-success" },
    { title: "Novos Leads", value: stats?.newContacts ?? 0, icon: MessageSquare, gradient: "from-warning/10 to-warning/5", iconColor: "text-warning" },
    { title: "Total Leads", value: stats?.totalContacts ?? 0, icon: TrendingUp, gradient: "from-info/10 to-info/5", iconColor: "text-info" },
  ];

  const firstName = profile?.full_name?.split(" ")[0] || "Administrador";

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Olá, {firstName} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">Aqui está a visão geral da sua plataforma</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((card) => (
            <Card key={card.title} className="overflow-hidden hover:shadow-card-hover">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground">{card.title}</p>
                    <p className="mt-1.5 font-display text-3xl font-bold tracking-tight">{card.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient}`}>
                    <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Lead Metrics */}
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Métricas de Leads</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Card className="overflow-hidden hover:shadow-card-hover">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground">Total de Leads</p>
                    <p className="mt-1.5 font-display text-3xl font-bold tracking-tight">{leadMetrics?.total ?? 0}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-info/10 to-info/5">
                    <TrendingUp className="h-6 w-6 text-info" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden hover:shadow-card-hover">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground">Leads Externos</p>
                    <p className="mt-1.5 font-display text-3xl font-bold tracking-tight">{leadMetrics?.external ?? 0}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-success/10 to-success/5">
                    <MessageSquare className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                Imóveis por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {byType && byType.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={byType} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                    <Bar dataKey="value" name="Imóveis" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                Leads por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contactsByMonth && contactsByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={contactsByMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                    <Line type="monotone" dataKey="leads" name="Leads" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ fill: "hsl(var(--success))", r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                  <Eye className="h-4 w-4 text-warning" />
                </div>
                Finalidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {byPurpose && byPurpose.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={byPurpose} cx="50%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} strokeWidth={3} stroke="hsl(var(--card))">
                      {byPurpose.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
                  <Home className="h-4 w-4 text-info" />
                </div>
                Status dos Imóveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {byStatus && byStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={byStatus} cx="50%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} strokeWidth={3} stroke="hsl(var(--card))">
                      {byStatus.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
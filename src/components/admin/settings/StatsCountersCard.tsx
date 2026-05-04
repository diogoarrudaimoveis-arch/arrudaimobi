import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BarChart3, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAdminTenant } from "@/hooks/use-admin-tenant";
import type { TenantSettings } from "@/hooks/use-tenant-settings";

export function StatsCountersCard() {
  const { tenant, saveSettings, toast } = useAdminTenant();
  const [showStats, setShowStats] = useState(true);
  const [propertiesCount, setPropertiesCount] = useState("");
  const [clientsServed, setClientsServed] = useState("");
  const [activeAgents, setActiveAgents] = useState("");
  const [citiesServed, setCitiesServed] = useState("");

  useEffect(() => {
    const settings = (tenant?.settings as TenantSettings) || {};
    const counters = settings.stats_counters || {};

    setShowStats(counters.show_stats !== false);
    setPropertiesCount(counters.properties_count || "");
    setClientsServed(counters.clients_served || "");
    setActiveAgents(counters.active_agents || "");
    setCitiesServed(counters.cities_served || "");
  }, [tenant]);

  const mutation = useMutation({
    mutationFn: () =>
      saveSettings({
        stats_counters: {
          show_stats: showStats,
          properties_count: propertiesCount.trim(),
          clients_served: clientsServed.trim(),
          active_agents: activeAgents.trim(),
          cities_served: citiesServed.trim(),
        },
      }),
    onSuccess: () => toast({ title: "Configurações salvas!" }),
    onError: (err) => toast({ title: "Erro ao salvar", description: err?.message || "Tente novamente", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" /> Estatísticas e Prova Social
        </CardTitle>
        <CardDescription>Personalize os contadores exibidos na página inicial pública.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Exibir contadores no portal público</p>
            <p className="text-sm text-muted-foreground">Ative para mostrar os cards de prova social na página inicial.</p>
          </div>
          <Switch checked={showStats} onCheckedChange={setShowStats} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="properties-count" className="mb-2 block text-sm font-medium text-foreground">Imóveis Cadastrados</Label>
            <Input
              id="properties-count"
              value={propertiesCount}
              onChange={(event) => setPropertiesCount(event.target.value)}
              placeholder="1+"
            />
          </div>
          <div>
            <Label htmlFor="clients-served" className="mb-2 block text-sm font-medium text-foreground">Clientes Atendidos</Label>
            <Input
              id="clients-served"
              value={clientsServed}
              onChange={(event) => setClientsServed(event.target.value)}
              placeholder="1.200+"
            />
          </div>
          <div>
            <Label htmlFor="active-agents" className="mb-2 block text-sm font-medium text-foreground">Agentes Ativos</Label>
            <Input
              id="active-agents"
              value={activeAgents}
              onChange={(event) => setActiveAgents(event.target.value)}
              placeholder="2"
            />
          </div>
          <div>
            <Label htmlFor="cities-served" className="mb-2 block text-sm font-medium text-foreground">Cidades Atendidas</Label>
            <Input
              id="cities-served"
              value={citiesServed}
              onChange={(event) => setCitiesServed(event.target.value)}
              placeholder="1"
            />
          </div>
        </div>

        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}

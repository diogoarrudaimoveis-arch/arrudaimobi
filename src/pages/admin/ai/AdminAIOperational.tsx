import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  AgentStatusCard,
  AlertSeverityCard,
  HealthStatusCard,
  LeadSlaCard,
  RealIntegrationHealthCard,
  SectionHeader,
  SummaryMetricCard,
} from "@/components/admin/ai/AiOpsCards";
import { useIntegrationHealth } from "@/hooks/use-integration-health";
import { aiAgents, aiOpsSummaryCards, alerts, healthStatuses, leadSlaCards } from "@/data/aiOpsMockData";
import { AlertTriangle } from "lucide-react";

export default function AdminAIOperational() {
  const { healthItems, isLoading, isError } = useIntegrationHealth();
  return (
    <AdminLayout>
      <div className="space-y-8">
        <SectionHeader
          title="Central IA Operacional"
          description="Mockup seguro da camada AI-first. Dados estáticos, sem APIs reais, sem tokens e sem escrita em banco."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {aiOpsSummaryCards.map((card) => (
            <SummaryMetricCard key={card.label} {...card} />
          ))}
        </div>

        <section className="space-y-4">
          <SectionHeader title="Health operacional" description="Verificação real dos serviços críticos via hooks. Fallback para dados mock em caso de falha." />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isError && healthItems.length === 0 ? (
              <div className="col-span-full flex items-center gap-2 text-sm text-warning">
                <AlertTriangle className="h-4 w-4" />
                Falha ao obter health real — usando dados mock. Recarregue para tentar novamente.
              </div>
            ) : (
              healthItems.map((health) => (
                <RealIntegrationHealthCard key={health.id} health={health} />
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader title="Health legado (mock)" description="Dados estáticos mockados —保留 para compatibilidade." />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {healthStatuses.map((health) => (
              <HealthStatusCard key={health.id} health={health} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader title="Agentes em operação" description="Status mockado da célula Arruda para validar UX antes da integração OpenClaw." />
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {aiAgents.slice(0, 6).map((agent) => (
              <AgentStatusCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader title="Alertas e SLA" description="Alertas em modo visual/dry-run; nenhuma mensagem Telegram é enviada por esta tela." />
          <div className="grid gap-4 xl:grid-cols-3">
            {leadSlaCards.map((sla) => (
              <LeadSlaCard key={sla.id} item={sla} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {alerts.map((alert) => (
              <AlertSeverityCard key={alert.id} alert={alert} />
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

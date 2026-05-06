import { AdminLayout } from "@/components/admin/AdminLayout";
import { AgentStatusCard, SectionHeader } from "@/components/admin/ai/AiOpsCards";
import { aiAgents } from "@/data/aiOpsMockData";

export default function AdminAIAgents() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Agentes IA"
          description="Mapa da célula operacional Arruda. Mockup local para futura integração com OpenClaw."
        />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {aiAgents.map((agent) => (
            <AgentStatusCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

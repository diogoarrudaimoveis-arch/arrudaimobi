import { AdminLayout } from "@/components/admin/AdminLayout";
import { AutomationRunCard, SectionHeader } from "@/components/admin/ai/AiOpsCards";
import { automationRuns } from "@/data/aiOpsMockData";

export default function AdminAIAutomations() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Automações N8N"
          description="Execuções e filas em mockup. A integração real deve iniciar em modo leitura e dry-run."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {automationRuns.map((run) => (
            <AutomationRunCard key={run.id} run={run} />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

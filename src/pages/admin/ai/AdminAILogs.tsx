import { AdminLayout } from "@/components/admin/AdminLayout";
import { AlertSeverityCard, SectionHeader } from "@/components/admin/ai/AiOpsCards";
import { alerts } from "@/data/aiOpsMockData";

export default function AdminAILogs() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Logs Operacionais"
          description="Linha do tempo mockada de eventos críticos. Logs reais deverão ser mascarados antes de persistir."
        />
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <AlertSeverityCard key={alert.id} alert={alert} />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

import { AdminLayout } from "@/components/admin/AdminLayout";
import { HealthStatusCard, SectionHeader } from "@/components/admin/ai/AiOpsCards";
import { healthStatuses } from "@/data/aiOpsMockData";

export default function AdminAIHealth() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Health Checks"
          description="Monitoramento planejado para site, admin, OpenClaw, n8n, Supabase e segurança."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {healthStatuses.map((health) => (
            <HealthStatusCard key={health.id} health={health} />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

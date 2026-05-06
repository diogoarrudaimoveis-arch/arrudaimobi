import { AdminLayout } from "@/components/admin/AdminLayout";
import { DevOpsStatusCard, SectionHeader, SummaryMetricCard } from "@/components/admin/ai/AiOpsCards";
import { devOpsStatuses, devOpsTimeline } from "@/data/aiOpsMockData";

export default function AdminDevOps() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <SectionHeader
          title="DevOps"
          description="Tracking de GitHub, Vercel, builds e rollback. Mockup sem chamadas reais."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {devOpsStatuses.map((item) => (
            <DevOpsStatusCard key={item.id} item={item} />
          ))}
        </div>
        <section className="space-y-4">
          <SectionHeader title="Timeline DevOps" description="Eventos planejados para sincronização read-only via webhook/sync." />
          <div className="grid gap-4 lg:grid-cols-3">
            {devOpsTimeline.map((item) => (
              <SummaryMetricCard key={item.id} label={item.title} value="draft" detail={item.detail} icon={item.icon} status={item.status} />
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

import { AdminLayout } from "@/components/admin/AdminLayout";
import { MetaAdsMetricCard, SectionHeader, SummaryMetricCard } from "@/components/admin/ai/AiOpsCards";
import { metaAdsMetrics, metaAdsPlan } from "@/data/aiOpsMockData";

export default function AdminMetaAds() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <SectionHeader
          title="Meta Ads"
          description="Campanhas, pixel, eventos e alertas CPL/ROAS. Dados mockados; sync real será read-only."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metaAdsMetrics.map((metric) => (
            <MetaAdsMetricCard key={metric.id} metric={metric} />
          ))}
        </div>
        <section className="space-y-4">
          <SectionHeader title="Plano de sincronização" description="Estratégia segura para conectar Meta Marketing API sem criar campanhas." />
          <div className="grid gap-4 lg:grid-cols-3">
            {metaAdsPlan.map((item) => (
              <SummaryMetricCard key={item.id} label={item.title} value="read-only" detail={item.detail} icon={item.icon} status={item.status} />
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

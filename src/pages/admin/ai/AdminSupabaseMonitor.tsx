import { AdminLayout } from "@/components/admin/AdminLayout";
import { SectionHeader, SupabaseStatusCard } from "@/components/admin/ai/AiOpsCards";
import { supabaseStatuses } from "@/data/aiOpsMockData";

export default function AdminSupabaseMonitor() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Supabase Monitor"
          description="Auth, Edge Functions, RLS e service role. Mockup local, sem tocar banco."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {supabaseStatuses.map((item) => (
            <SupabaseStatusCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

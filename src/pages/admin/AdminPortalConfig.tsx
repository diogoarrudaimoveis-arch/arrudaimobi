import { useAdminTenant } from "@/hooks/use-admin-tenant";
import { PortalEditor } from "@/components/admin/settings/PortalEditor";

export default function AdminPortalConfig() {
  const { tenantId } = useAdminTenant();

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <PortalEditor tenantId={tenantId} />;
}
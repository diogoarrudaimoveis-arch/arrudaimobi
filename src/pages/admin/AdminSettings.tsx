import { AdminLayout } from "@/components/admin/AdminLayout";
import { AllInOneEditor } from "@/components/admin/settings/AllInOneEditor";
import { useAdminTenant } from "@/hooks/use-admin-tenant";
import { Loader2 } from "lucide-react";

const AdminSettings = () => {
  const { isLoading, tenantId } = useAdminTenant();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!tenantId) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-muted-foreground">Carregando configurações...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AllInOneEditor tenantId={tenantId} />
    </AdminLayout>
  );
};

export default AdminSettings;
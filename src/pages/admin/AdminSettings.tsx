import { AdminLayout } from "@/components/admin/AdminLayout";
import { Loader2 } from "lucide-react";
import { useAdminTenant } from "@/hooks/use-admin-tenant";
import { RegistrationToggle } from "@/components/admin/settings/RegistrationToggle";
import { TenantInfoCard } from "@/components/admin/settings/TenantInfoCard";
import { HomeCustomization } from "@/components/admin/settings/HomeCustomization";
import { ContactSocialCard } from "@/components/admin/settings/ContactSocialCard";
import { StatsCountersCard } from "@/components/admin/settings/StatsCountersCard";
import { BrandCustomization } from "@/components/admin/BrandCustomization";
import { PWASettingsCard } from "@/components/admin/PWASettingsCard";
import { AdvancedSiteSettings } from "@/components/admin/settings/AdvancedSiteSettings";
import type { TenantSettings } from "@/hooks/use-tenant-settings";

const AdminSettings = () => {
  const { tenant, isLoading, tenantId, getCurrentSettings } = useAdminTenant();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Configurações</h1>

        <RegistrationToggle />
        <TenantInfoCard />
        <HomeCustomization />
        <StatsCountersCard />
        <ContactSocialCard />

        {/* Brand Customization */}
        {tenantId && (
          <BrandCustomization
            tenantId={tenantId}
            settings={(tenant?.settings as TenantSettings) || {}}
            allSettings={getCurrentSettings()}
          />
        )}

        {/* PWA Settings */}
        {tenantId && (
          <PWASettingsCard
            tenantId={tenantId}
            settings={(tenant?.settings as TenantSettings) || {}}
            allSettings={getCurrentSettings()}
          />
        )}

        {/* Configurações Avançadas do Site (Favicon, SEO, Docs, Cookies) */}
        {tenantId && <AdvancedSiteSettings tenantId={tenantId} />}
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;

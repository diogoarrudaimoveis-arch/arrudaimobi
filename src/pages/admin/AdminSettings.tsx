import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, PageCard } from "@/components/admin/shared/AdminComponents";
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
import { useAuth } from "@/contexts/AuthContext";
import { normalizeRole } from "@/lib/adminPermissions";

const AdminSettings = () => {
  const { tenant, isLoading, tenantId, getCurrentSettings } = useAdminTenant();
  const { profile } = useAuth();

  const normalizedRole = normalizeRole(profile?.role);
  const isDev = normalizedRole === "developer";
  const isAdminRole = normalizedRole === "admin";

  if (isLoading) {
    return (
      <AdminLayout>
        <AdminPageShell>
          <PageCard>
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          </PageCard>
        </AdminPageShell>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AdminPageShell>
        {isAdminRole && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Admin:</strong> Você está editando configurações do site.
              Apenas <strong>Developer</strong> pode ver configurações avançadas de sistema.
            </p>
          </div>
        )}
        {isDev && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            <p className="text-sm text-purple-800 font-medium">Desenvolvedor — Acesso Total</p>
          </div>
        )}
        <PageCard>
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Configurações</h1>

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
        </PageCard>
      </AdminPageShell>
    </AdminLayout>
  );
};

export default AdminSettings;
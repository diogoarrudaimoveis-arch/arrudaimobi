import { useLayoutEffect } from "react";
import { getCachedTenantSettings, useTenantSettings } from "@/hooks/use-tenant-settings";
import { applyBrandColors } from "@/components/admin/BrandCustomization";

const cachedTenantSettings = getCachedTenantSettings();

if (typeof document !== "undefined" && cachedTenantSettings?.settings) {
  applyBrandColors(
    cachedTenantSettings.settings.primary_color,
    cachedTenantSettings.settings.gradient_from,
    cachedTenantSettings.settings.gradient_to
  );
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { data: tenant, isLoading } = useTenantSettings();

  useLayoutEffect(() => {
    if (tenant?.settings) {
      applyBrandColors(
        tenant.settings.primary_color,
        tenant.settings.gradient_from,
        tenant.settings.gradient_to
      );
    }
  }, [
    tenant?.settings?.primary_color,
    tenant?.settings?.gradient_from,
    tenant?.settings?.gradient_to,
  ]);

  if (!tenant && isLoading) {
    return <div className="min-h-screen bg-background" aria-hidden="true" />;
  }

  return <>{children}</>;
}
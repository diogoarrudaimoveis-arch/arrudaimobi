import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRoleBadgeVariant } from "@/lib/adminPermissions";

// ─── AdminPageShell ─────────────────────────────────────────────────────────
export function AdminPageShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-screen bg-slate-50 dark:bg-slate-950 p-5 lg:p-6 space-y-5",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── AdminPageHeader ────────────────────────────────────────────────────────
interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}
export function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// ─── PageCard ───────────────────────────────────────────────────────────────
interface PageCardProps {
  title?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}
export function PageCard({ title, icon: Icon, children, className, action }: PageCardProps) {
  return (
    <Card className={cn("", className)}>
      {title && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn(!title && "p-4")}>{children}</CardContent>
    </Card>
  );
}

// ─── AdminToolbar ───────────────────────────────────────────────────────────
interface AdminToolbarProps {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  filters?: React.ReactNode;
  actions?: React.ReactNode;
}
export function AdminToolbar({ search, filters, actions }: AdminToolbarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {search && (
        <div className="relative max-w-[300px] w-full">
          <input
            type="text"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Buscar..."}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
        </div>
      )}
      {filters && <div className="flex items-center gap-1.5">{filters}</div>}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── AdminEmptyState ────────────────────────────────────────────────────────
interface AdminEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
export function AdminEmptyState({ icon: Icon, title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 space-y-3">
      {Icon && (
        <div className="rounded-full bg-muted p-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div className="space-y-1">
        <p className="font-semibold text-base">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ─── RoleBadge ─────────────────────────────────────────────────────────────
interface RoleBadgeProps {
  role: string | null | undefined;
}
export function RoleBadge({ role }: RoleBadgeProps) {
  const variant = getRoleBadgeVariant(role);
  return <Badge variant={variant as "default" | "secondary" | "outline" | "destructive"}>{role ?? "usuário"}</Badge>;
}

// ─── StatusBadge ───────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string;
  variant?: "success" | "warning" | "error" | "info" | "neutral";
}
const STATUS_VARIANT_STYLES: Record<NonNullable<StatusBadgeProps["variant"]>, string> = {
  success: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400",
  error: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400",
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};
export function StatusBadge({ status, variant = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        STATUS_VARIANT_STYLES[variant]
      )}
    >
      {status}
    </span>
  );
}

// ─── MetricItem ─────────────────────────────────────────────────────────────
interface MetricItemProps {
  icon?: LucideIcon;
  value: string | number;
  label?: string;
  color?: string;
}
export function MetricItem({ icon: Icon, value, label, color }: MetricItemProps) {
  return (
    <div className="flex items-center gap-2">
      {Icon && (
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-white",
            color ?? "bg-slate-600"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      )}
      <div>
        <p className="text-sm font-bold text-foreground">{value}</p>
        {label && <p className="text-xs text-muted-foreground">{label}</p>}
      </div>
    </div>
  );
}
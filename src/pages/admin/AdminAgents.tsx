import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, PageCard } from "@/components/admin/shared/AdminComponents";
import { Users, UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getRoleLabel, getRoleBadgeVariant } from "@/lib/adminPermissions";

interface CompanyUser {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  created_at: string;
  role: string;
  email?: string;
}

const AdminAgents = () => {
  const { tenantId, isReady, session, isDeveloper } = useAuth();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["company-users", tenantId],
    queryFn: async (): Promise<CompanyUser[]> => {
      if (!tenantId) throw new Error("No tenantId");

      // Fetch profiles for this tenant
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, phone, bio, created_at")
        .eq("tenant_id", tenantId);
      if (profErr) throw profErr;

      // Fetch roles for this tenant
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("tenant_id", tenantId);
      if (rolesErr) throw rolesErr;

      // Build role map
      const roleMap: Record<string, string> = {};
      roles?.forEach((r) => { roleMap[r.user_id] = r.role; });

      // Fetch email from auth.users for each user
      const userIds = (profiles || []).map((p) => p.user_id);
      let emailMap: Record<string, string> = {};

      if (userIds.length > 0 && session?.access_token) {
        try {
          const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const res = await fetch(
            `https://${PROJECT_ID}.supabase.co/auth/v1/admin/users?page=1&per_page=1000`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            const users_arr: any[] = data.users || [];
            users_arr.forEach((u) => {
              if (u.id && u.email) emailMap[u.id] = u.email;
            });
          }
        } catch {
          // If we can't fetch emails, proceed without
        }
      }

      return (profiles || []).map((p) => ({
        ...p,
        role: roleMap[p.user_id] || "user",
        email: emailMap[p.user_id] || undefined,
      }));
    },
    enabled: isReady && !!tenantId,
  });

  const roleBadgeVariant = (role: string) => {
    const variant = getRoleBadgeVariant(role);
    if (variant === "default") return "default"; // blue for admin
    if (variant === "developer") return "developer"; // purple
    if (variant === "secondary") return "success"; // green for agent
    return "outline"; // gray for user
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  return (
    <AdminLayout>
      <AdminPageShell>
        <PageCard title="Agentes & Usuários" icon={Users}>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                  Agentes & Usuários
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isLoading
                    ? "Carregando membros..."
                    : `${users.length} membros na imobiliária`}
                </p>
              </div>
              {isDeveloper && (
                <Button className="gap-2 bg-[#003366] hover:bg-[#002244] text-white" disabled>
                  <UserPlus className="h-4 w-4" />
                  Criar Usuário
                </Button>
              )}
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
                    <Skeleton variant="circle" className="h-10 w-10" />
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="text" className="w-48" />
                      <Skeleton variant="text" className="w-32" />
                    </div>
                    <Skeleton variant="default" className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : !users.length ? (
              <Card className="flex flex-col items-center py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 font-display font-semibold">Nenhum membro encontrado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nenhum perfil encontrado para este tenant.
                </p>
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Data Criação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {(u.full_name || "U").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {u.full_name || "Sem nome"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {u.email || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{u.phone || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleBadgeVariant(u.role)}>
                            {getRoleLabel(u.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(u.created_at)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </PageCard>
      </AdminPageShell>
    </AdminLayout>
  );
};

export default AdminAgents;
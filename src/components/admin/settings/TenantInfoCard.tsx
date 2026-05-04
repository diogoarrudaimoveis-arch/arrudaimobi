import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminTenant } from "@/hooks/use-admin-tenant";

export function TenantInfoCard() {
  const { tenant, tenantId, queryClient, toast } = useAdminTenant();
  const [name, setName] = useState("");

  useEffect(() => {
    if (tenant) setName(tenant.name || "");
  }, [tenant]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tenants").update({ name: name || tenant?.name }).eq("id", tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenant"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      toast({ title: "Configurações salvas!" });
    },
    onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dados da Imobiliária</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Nome da Imobiliária</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { UserPlus } from "lucide-react";
import { useAdminTenant } from "@/hooks/use-admin-tenant";

export function RegistrationToggle() {
  const { tenant, saveSettings, toast } = useAdminTenant();
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    const s = (tenant?.settings as any) || {};
    setAllowed(s.allow_registration !== false);
  }, [tenant]);

  const handleToggle = async (checked: boolean) => {
    setAllowed(checked);
    try {
      await saveSettings({ allow_registration: checked });
      toast({ title: checked ? "Cadastro habilitado" : "Cadastro desabilitado" });
    } catch (err: any) {
      setAllowed(!checked);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="h-5 w-5 text-primary" /> Registro de Usuários
        </CardTitle>
        <CardDescription>Controle se novos usuários podem se cadastrar no sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="font-medium text-sm">Permitir novos cadastros</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allowed ? "Novos usuários podem criar conta" : "Cadastro de novos usuários está bloqueado"}
            </p>
          </div>
          <Switch checked={allowed} onCheckedChange={handleToggle} />
        </div>
      </CardContent>
    </Card>
  );
}
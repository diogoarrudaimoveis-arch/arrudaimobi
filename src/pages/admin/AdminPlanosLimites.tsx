import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function AdminPlanosLimites() {
  return (
    <AdminLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <Construction className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle>Planos e Limites</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Esta funcionalidade está em desenvolvimento. Em breve você poderá gerenciar planos de assinatura e limites de uso.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

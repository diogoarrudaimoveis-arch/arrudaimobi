import { useSearchParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Home, Eye, MousePointer, User, Plus, Settings } from "lucide-react";

const ProprietarioDashboard = () => {
  const [searchParams] = useSearchParams();
  const ownerId = searchParams.get("owner");
  const token = searchParams.get("token");

  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) {
      setLoading(false);
      return;
    }

    const loadOwner = async () => {
      const { data } = await supabase
        .from("owners")
        .select("*")
        .eq("id", ownerId)
        .single();
      setOwner(data);
      setLoading(false);
    };
    loadOwner();
  }, [ownerId]);

  if (!ownerId || !token) {
    return (
      <Layout>
        <section className="py-12 px-4">
          <div className="container max-w-2xl mx-auto text-center">
            <h1 className="font-display text-2xl font-bold mb-4">Acesso não autorizado</h1>
            <p className="text-muted-foreground">Use o link enviado para seu e-mail/WhatsApp para acessar o portal.</p>
          </div>
        </section>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <section className="py-12 px-4"><div className="container">Carregando...</div></section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="bg-primary/5 py-8 px-4">
        <div className="container">
          <h1 className="font-display text-2xl font-bold">Olá, {owner?.name || "Proprietário"}</h1>
          <p className="text-muted-foreground">Bem-vindo ao seu painel</p>
        </div>
      </section>
      <section className="py-8 px-4">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Home className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Imóveis cadastrados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Eye className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Visualizações</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <MousePointer className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Cliques WhatsApp</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4">
            <Link to={`/proprietario/imoveis/novo?owner=${ownerId}&token=${token}`}>
              <button className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium">
                <Plus className="h-4 w-4" /> Cadastrar Imóvel
              </button>
            </Link>
            <Link to={`/proprietario/imoveis?owner=${ownerId}&token=${token}`}>
              <button className="flex items-center gap-2 border border-primary text-primary px-6 py-3 rounded-lg font-medium">
                <Home className="h-4 w-4" /> Meus Imóveis
              </button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProprietarioDashboard;

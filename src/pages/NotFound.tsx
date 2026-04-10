import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-6xl font-bold text-primary">404</h1>
          <p className="mt-3 text-xl font-medium text-foreground">Página não encontrada</p>
          <p className="mt-2 text-sm text-muted-foreground">
            A página que você procura não existe ou foi removida.
          </p>
          <Button className="mt-6 gap-2" asChild>
            <Link to="/"><Home className="h-4 w-4" /> Voltar ao Início</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;

import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePublicAgents } from "@/hooks/use-properties";
import { Link } from "react-router-dom";

const PAGE_SIZE = 12;

const Agents = () => {
  const [page, setPage] = useState(1);
  const { data: response, isLoading } = usePublicAgents({ page: String(page), pageSize: String(PAGE_SIZE) });
  const agents = response?.data || [];
  const totalPages = response?.totalPages || 0;
  const total = response?.total || 0;

  return (
    <Layout>
      <section className="bg-secondary/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="container px-0">
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Nossos Agentes</h1>
          <p className="mt-1 text-muted-foreground">
            {isLoading ? "Carregando..." : `${total} profissionais qualificados`}
          </p>
        </div>
      </section>

      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="container px-0">
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
            </div>
          ) : !agents.length ? (
            <p className="py-20 text-center text-muted-foreground">Nenhum agente cadastrado</p>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {agents.map((agent) => (
                  <Link key={agent.id} to={`/agentes/${agent.userId}`}>
                    <Card className="group overflow-hidden p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      <div className="flex flex-col items-center text-center">
                        <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                          <AvatarImage src={agent.avatarUrl || undefined} alt={agent.fullName || ""} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-display">
                            {(agent.fullName || "A").split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="mt-4 font-display text-base font-semibold text-foreground">{agent.fullName || "Agente"}</h3>
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{agent.bio}</p>
                        <Badge variant="secondary" className="mt-3 gap-1">
                          <Building2 className="h-3 w-3" /> {agent.propertiesCount} imóveis
                        </Badge>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>

              <TablePagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Agents;

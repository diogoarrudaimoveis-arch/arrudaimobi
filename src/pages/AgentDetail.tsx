import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { PropertyCardDb } from "@/components/properties/PropertyCardDb";
import { usePublicAgent } from "@/hooks/use-properties";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageCircle, Building2, ArrowLeft } from "lucide-react";

const AgentDetail = () => {
  const { id } = useParams();
  const { data: agent, isLoading } = usePublicAgent(id);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-6 space-y-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!agent) {
    return (
      <Layout>
        <div className="container flex flex-col items-center py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Agente não encontrado</h1>
          <Button className="mt-4" asChild><Link to="/agentes">Voltar</Link></Button>
        </div>
      </Layout>
    );
  }

  const rawPhone = agent.phone?.replace(/\D/g, "") || "";
  const whatsappUrl = rawPhone
    ? `https://wa.me/55${rawPhone}`
    : null;
  const phoneUrl = rawPhone ? `tel:+55${rawPhone}` : null;
  const emailUrl = agent.email ? `mailto:${agent.email}` : null;

  return (
    <Layout>
      <div className="container py-6">
        <Link to="/agentes" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Agentes
        </Link>

        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-8 text-center md:flex-row md:text-left md:gap-8">
          <Avatar className="h-28 w-28 ring-4 ring-primary/20">
            <AvatarImage src={agent.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-display">
              {(agent.fullName || "A").split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="mt-4 flex-1 md:mt-0">
            <h1 className="font-display text-2xl font-bold text-foreground">{agent.fullName || "Agente"}</h1>
            <div className="mt-1 flex items-center justify-center gap-2 md:justify-start">
              <Badge variant="secondary" className="gap-1">
                <Building2 className="h-3 w-3" /> {agent.propertiesCount} imóveis
              </Badge>
            </div>
            {agent.bio && <p className="mt-3 text-muted-foreground">{agent.bio}</p>}
            <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
              {whatsappUrl ? (
                <Button className="gap-2" asChild>
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              ) : (
                <Button className="gap-2" disabled><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
              )}
              {phoneUrl ? (
                <Button variant="outline" className="gap-2" asChild>
                  <a href={phoneUrl}>
                    <Phone className="h-4 w-4" /> Ligar
                  </a>
                </Button>
              ) : (
                <Button variant="outline" className="gap-2" disabled><Phone className="h-4 w-4" /> Ligar</Button>
              )}
              {emailUrl ? (
                <Button variant="outline" className="gap-2" asChild>
                  <a href={emailUrl}>
                    <Mail className="h-4 w-4" /> Email
                  </a>
                </Button>
              ) : (
                <Button variant="outline" className="gap-2" disabled><Mail className="h-4 w-4" /> Email</Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="font-display text-xl font-bold text-foreground">
            Imóveis de {(agent.fullName || "Agente").split(" ")[0]}
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {agent.properties?.map((p) => <PropertyCardDb key={p.id} property={p} />)}
          </div>
          {!agent.properties?.length && (
            <p className="py-10 text-center text-muted-foreground">Nenhum imóvel cadastrado.</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AgentDetail;

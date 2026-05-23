import { Link } from "react-router-dom";
import { Agent } from "@/types/property";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Building2, Phone, Mail } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link to={`/agentes/${agent.id}`}>
      <Card className="group overflow-hidden p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-20 w-20 ring-2 ring-primary/20">
            <AvatarImage src={agent.avatar} alt={agent.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-display">
              {agent.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>

          <h3 className="mt-4 font-display text-base font-semibold text-foreground">
            {agent.name}
          </h3>

          <div className="mt-1 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
            <span className="text-sm font-medium text-foreground">{agent.rating}</span>
          </div>

          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{agent.bio}</p>

          <Badge variant="secondary" className="mt-3 gap-1">
            <Building2 className="h-3 w-3" />
            {agent.propertiesCount} imóveis
          </Badge>

          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Ligar</span>
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

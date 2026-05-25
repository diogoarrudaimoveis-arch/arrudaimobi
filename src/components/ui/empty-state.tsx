import { LucideIcon } from "lucide-react";
import { Button } from "./button";
import { Card } from "./card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <Card className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted animate-pulse-soft">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button className="mt-6 gap-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}

// Specialized empty states
export function EmptyProperties({ onReset }: { onReset?: () => void }) {
  return (
    <EmptyState
      icon={({ className }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      )}
      title="Nenhum imóvel encontrado"
      description="Tente ajustar os filtros de busca para encontrar mais resultados."
      actionLabel="Limpar filtros"
      onAction={onReset}
      className="bg-card border-dashed"
    />
  );
}

export function EmptySearch({ onReset }: { onReset?: () => void }) {
  return (
    <EmptyState
      icon={({ className }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      )}
      title="Busca sem resultados"
      description="Não encontramos imóveis correspondentes à sua busca."
      actionLabel="Tentar novamente"
      onAction={onReset}
      className="bg-card border-dashed"
    />
  );
}

export function EmptyAgents() {
  return (
    <EmptyState
      icon={({ className }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )}
      title="Nenhum agente cadastrado"
      description="Nossa equipe ainda está sendo formada. Volte em breve!"
      className="bg-card border-dashed"
    />
  );
}

export function EmptyBlog() {
  return (
    <EmptyState
      icon={({ className }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <line x1="10" y1="9" x2="8" y2="9"/>
        </svg>
      )}
      title="Nenhum post encontrado"
      description="Em breve traremos novidades para você. Acompanhe nosso blog!"
      className="bg-card border-dashed"
    />
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="animate-shimmer rounded-xl border border-border bg-card overflow-hidden">
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-5/6" />
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-16 bg-muted rounded" />
          <div className="h-6 w-16 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="animate-shimmer rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col items-center">
        <div className="h-20 w-20 bg-muted rounded-full" />
        <div className="mt-4 h-4 bg-muted rounded w-32" />
        <div className="mt-2 h-3 bg-muted rounded w-40" />
        <div className="mt-3 h-6 w-24 bg-muted rounded" />
      </div>
    </div>
  );
}
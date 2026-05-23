import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePropertyTypes } from "@/hooks/use-properties";
import { getIconByName } from "@/lib/dynamic-icon";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  title?: string;
  subtitle?: string;
}

export function PropertyTypeGrid({ title = "Explore por Tipo de Imóvel", subtitle = "Encontre o tipo ideal para suas necessidades" }: Props) {
  const { data: propertyTypes, isLoading } = usePropertyTypes();

  if (isLoading) {
    return (
      <section className="py-20">
        <div className="container">
          <div className="mb-10 flex flex-col items-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-semibold uppercase tracking-wider">Categorias</Badge>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">{title}</h2>
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex h-28 flex-col items-center justify-center rounded-2xl border border-border/60 bg-card animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!propertyTypes || propertyTypes.length === 0) return null;

  return (
    <section className="py-20">
      <div className="container">
        <div className="mb-10 text-center">
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-semibold uppercase tracking-wider">Categorias</Badge>
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">{title}</h2>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {propertyTypes.filter(t => t.active).map((type) => {
            const IconComponent = getIconByName(type.icon);
            return (
              <Link
                key={type.id}
                to={`/imoveis?type=${encodeURIComponent(type.name)}`}
                className="group flex flex-col items-center rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/25">
                  <IconComponent className="h-6 w-6" />
                </div>
                <span className="mt-3 text-center text-sm font-medium text-foreground">{type.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
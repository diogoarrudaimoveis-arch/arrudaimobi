import { Link } from "react-router-dom";
import { Property } from "@/types/property";
import { formatCurrency, formatArea } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { MapPin, BedDouble, Bath, Car, Maximize } from "lucide-react";

interface PropertyListItemProps {
  property: Property;
}

export function PropertyListItem({ property }: PropertyListItemProps) {
  return (
    <Link to={`/imoveis/${property.id}`}>
      <div className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:shadow-lg sm:flex-row">
        <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-auto sm:w-72">
          <img
            src={property.images[0]?.url}
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge className="bg-primary text-primary-foreground font-medium text-xs">
              {property.purpose === "sale" ? "Venda" : "Aluguel"}
            </Badge>
            {property.featured && (
              <Badge className="bg-warning text-warning-foreground font-medium text-xs">
                Destaque
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              {property.title}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {property.neighborhood}, {property.city} - {property.state}
            </p>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {property.description}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {property.bedrooms > 0 && (
                <span className="flex items-center gap-1">
                  <BedDouble className="h-4 w-4" /> {property.bedrooms}
                </span>
              )}
              {property.bathrooms > 0 && (
                <span className="flex items-center gap-1">
                  <Bath className="h-4 w-4" /> {property.bathrooms}
                </span>
              )}
              {property.garages > 0 && (
                <span className="flex items-center gap-1">
                  <Car className="h-4 w-4" /> {property.garages}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Maximize className="h-4 w-4" /> {formatArea(property.areaUseful ?? property.area ?? 0)}
              </span>
            </div>
            <p className="font-display text-lg font-bold text-primary">
              {formatCurrency(property.price)}
              {property.purpose === "rent" && <span className="text-sm font-normal text-muted-foreground">/mês</span>}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

import { Link } from "react-router-dom";
import { Property } from "@/types/property";
import { formatCurrency, formatArea } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, BedDouble, Bath, Car, Maximize } from "lucide-react";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Link to={`/imoveis/${property.id}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={property.images[0]?.url}
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
          
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge className="bg-primary text-primary-foreground font-medium">
              {property.purpose === "sale" ? "Venda" : "Aluguel"}
            </Badge>
            {property.featured && (
              <Badge className="bg-warning text-warning-foreground font-medium">
                Destaque
              </Badge>
            )}
          </div>

          <div className="absolute bottom-3 left-3 right-3">
            <p className="font-display text-lg font-bold text-card">
              {formatCurrency(property.price)}
              {property.purpose === "rent" && <span className="text-sm font-normal">/mês</span>}
            </p>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-display text-sm font-semibold text-foreground line-clamp-1">
            {property.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {property.neighborhood}, {property.city}
          </p>

          <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
            {property.bedrooms > 0 && (
              <span className="flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5" />
                {property.bedrooms}
              </span>
            )}
            {property.bathrooms > 0 && (
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" />
                {property.bathrooms}
              </span>
            )}
            {property.garages > 0 && (
              <span className="flex items-center gap-1">
                <Car className="h-3.5 w-3.5" />
                {property.garages}
              </span>
            )}
            <span className="flex items-center gap-1 ml-auto">
              <Maximize className="h-3.5 w-3.5" />
              {formatArea(property.areaUseful ?? property.area ?? 0)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

import { Link } from "react-router-dom";
import { Property } from "@/hooks/use-properties";
import { formatCurrency, formatArea } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, BedDouble, Bath, Car, Maximize, Heart } from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";

interface Props {
  property: Property;
}

export function PropertyCardDb({ property }: Props) {
  const mainImage = property.images?.slice().sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))[0];
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(property.id);

  const whatsappMsg = encodeURIComponent(
    `Olá! Tenho interesse no imóvel: ${property.title} - ${property.neighborhood}, ${property.city}.`
  );
  const whatsappHref = `https://wa.me/553197918717?text=${whatsappMsg}`;

  return (
    <Link to={`/imoveis/${property.id}`}>
      <Card className="group overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 transition-all duration-300">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {mainImage ? (
            <img
              src={mainImage.url}
              alt={mainImage.alt || property.title}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <MapPin className="h-8 w-8" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge className="bg-primary/90 text-primary-foreground font-medium backdrop-blur-sm border-0 shadow-sm">
              {property.purpose === "sale" ? "Venda" : "Aluguel"}
            </Badge>
            {property.featured && (
              <Badge className="bg-warning/90 text-warning-foreground font-medium backdrop-blur-sm border-0 shadow-sm">Destaque</Badge>
            )}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(property.id); }}
            className="absolute right-3 top-3 rounded-full bg-card/80 p-2.5 shadow-lg backdrop-blur-sm transition-all hover:bg-card hover:scale-110 z-10"
            aria-label={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Heart className={`h-4 w-4 transition-colors ${favorited ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </button>
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
            <p className="font-display text-xl font-bold text-white drop-shadow-md">
              {formatCurrency(property.price)}
              {property.purpose === "rent" && <span className="text-sm font-normal opacity-80">/mês</span>}
            </p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-full bg-green-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition-all hover:bg-green-600 hover:scale-105 opacity-0 group-hover:opacity-100 z-10"
              aria-label="Solicitar info via WhatsApp"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-display text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {property.title}
          </h3>
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{[property.neighborhood, property.city].filter(Boolean).join(", ")}</span>
          </p>
          <div className="mt-3 flex items-center gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            {(property.bedrooms || 0) > 0 && (
              <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{property.bedrooms}</span>
            )}
            {(property.bathrooms || 0) > 0 && (
              <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{property.bathrooms}</span>
            )}
            {(property.garages || 0) > 0 && (
              <span className="flex items-center gap-1"><Car className="h-3.5 w-3.5" />{property.garages}</span>
            )}
            <span className="ml-auto flex items-center gap-1 font-medium text-foreground/70">
              <Maximize className="h-3.5 w-3.5" />{formatArea(property.areaUseful ?? property.area ?? 0)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
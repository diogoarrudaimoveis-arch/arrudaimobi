import { Link } from "react-router-dom";
import { Property } from "@/hooks/use-properties";
import { formatCurrency, formatArea } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, BedDouble, Bath, Car, Maximize, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useState, useCallback } from "react";

interface Props {
  property: Property;
}

export function PropertyCardDb({ property }: Props) {
  const sortedImages = property.images?.slice().sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)) || [];
  const [currentImg, setCurrentImg] = useState(0);
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(property.id);

  const handlePrev = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImg((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
  }, [sortedImages.length]);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImg((prev) => (prev + 1) % sortedImages.length);
  }, [sortedImages.length]);

  const handleDotClick = useCallback((e: React.MouseEvent, i: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImg(i);
  }, []);

  const mainImage = sortedImages[currentImg] || sortedImages[0];

  return (
    <Link to={`/imoveis/${property.id}`}>
      <Card className="group overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-primary/20">
        {/* Image area with carousel */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {sortedImages.length > 0 ? (
            <img
              src={mainImage.url}
              alt={mainImage.alt || property.title}
              className="h-full w-full object-cover transition-opacity duration-300"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <MapPin className="h-8 w-8" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Badges - top left */}
          <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
            <Badge className="bg-primary/90 text-primary-foreground font-medium backdrop-blur-sm border-0 shadow-sm">
              {property.purpose === "sale" ? "Venda" : "Aluguel"}
            </Badge>
            {property.featured && (
              <Badge className="bg-warning/90 text-warning-foreground font-medium backdrop-blur-sm border-0 shadow-sm">Destaque</Badge>
            )}
          </div>

          {/* Favorite button - top right */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(property.id); }}
            className="absolute right-3 top-3 z-10 rounded-full bg-card/80 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-card hover:scale-110"
            aria-label={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Heart className={`h-4 w-4 transition-colors ${favorited ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </button>

          {/* Image carousel navigation (only if multiple images) */}
          {sortedImages.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-card/70 p-1.5 text-foreground opacity-0 shadow-md backdrop-blur-sm transition-all hover:bg-card hover:opacity-100 group-hover:opacity-80"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-card/70 p-1.5 text-foreground opacity-0 shadow-md backdrop-blur-sm transition-all hover:bg-card hover:opacity-100 group-hover:opacity-80"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Dot indicators */}
          {sortedImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {sortedImages.slice(0, 8).map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => handleDotClick(e, i)}
                  className={`h-1.5 w-1.5 rounded-full transition-all ${
                    i === currentImg ? "bg-white w-4" : "bg-white/50 hover:bg-white/80"
                  }`}
                  aria-label={`Ir para imagem ${i + 1}`}
                />
              ))}
              {sortedImages.length > 8 && (
                <span className="text-white text-xs self-center">+{sortedImages.length - 8}</span>
              )}
            </div>
          )}

          {/* Price - bottom */}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="font-display text-xl font-bold text-white drop-shadow-md">
              {formatCurrency(property.price)}
              {property.purpose === "rent" && <span className="text-sm font-normal opacity-80">/mês</span>}
            </p>
          </div>
        </div>

        {/* Card content */}
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
            <span className="flex items-center gap-1 ml-auto font-medium text-foreground/70">
              <Maximize className="h-3.5 w-3.5" />{formatArea(property.areaUseful ?? property.area ?? 0)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
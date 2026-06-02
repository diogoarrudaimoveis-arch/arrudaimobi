import { Link } from "react-router-dom";
import { Property } from "@/hooks/use-properties";
import { formatCurrency, formatArea } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { MapPin, BedDouble, Bath, Car, Maximize, Heart, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";

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
    <Link to={`/imovel/${property.id}`} className="block group">
      <motion.div
        whileHover={{ y: -8 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="rounded-2xl bg-card shadow-soft overflow-hidden transition-shadow duration-300 hover:shadow-hover"
      >
        {/* Image area with carousel */}
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          {sortedImages.length > 0 ? (
            <motion.img
              src={mainImage.url}
              alt={mainImage.alt || property.title}
              className="h-full w-full object-cover"
              loading="lazy"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.4 }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <MapPin className="h-8 w-8" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />

          {/* Badges glassmorphism (Arruda 2.0) */}
          <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
            <span className={`px-3 py-1 rounded-full text-xs font-bold text-white backdrop-blur-md ${
              property.purpose === "sale" ? "bg-brand-blue/85" : "bg-success/85"
            }`}>
              {property.purpose === "sale" ? "💰 Venda" : "🔑 Aluguel"}
            </span>
            {property.featured && (
              <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-brand-gold/90 backdrop-blur-md">
                ⭐ Destaque
              </span>
            )}
            {property.type && (
              <span className="px-3 py-1 rounded-full text-xs font-medium text-white bg-black/40 backdrop-blur-md">
                {property.type}
              </span>
            )}
          </div>

          {/* Favorite button - top right */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(property.id); }}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:scale-110"
            aria-label={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Heart className={`h-4 w-4 transition-colors ${favorited ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
          </button>

          {/* Image carousel navigation (only if multiple images) */}
          {sortedImages.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-foreground opacity-0 shadow-md backdrop-blur-sm transition-all hover:opacity-100 group-hover:opacity-80"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-foreground opacity-0 shadow-md backdrop-blur-sm transition-all hover:opacity-100 group-hover:opacity-80"
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
            <p className="font-display text-2xl font-bold text-white drop-shadow-lg">
              {formatCurrency(property.price)}
              {property.purpose === "rent" && <span className="ml-1 text-sm font-normal opacity-90">/mês</span>}
            </p>
          </div>
        </div>

        {/* Card content */}
        <div className="p-5">
          <h3 className="font-display text-base font-semibold text-foreground line-clamp-1 transition-colors group-hover:text-brand-blue">
            {property.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{[property.neighborhood, property.city].filter(Boolean).join(", ")}</span>
          </p>

          {/* Stats com ícones destacados em cards */}
          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-3">
            {(property.bedrooms || 0) > 0 && (
              <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 px-1 py-1.5">
                <BedDouble className="h-4 w-4 text-brand-blue" />
                <span className="text-xs font-semibold text-foreground">{property.bedrooms}</span>
              </div>
            )}
            {(property.bathrooms || 0) > 0 && (
              <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 px-1 py-1.5">
                <Bath className="h-4 w-4 text-brand-blue" />
                <span className="text-xs font-semibold text-foreground">{property.bathrooms}</span>
              </div>
            )}
            {(property.garages || 0) > 0 && (
              <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 px-1 py-1.5">
                <Car className="h-4 w-4 text-brand-blue" />
                <span className="text-xs font-semibold text-foreground">{property.garages}</span>
              </div>
            )}
            <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 px-1 py-1.5">
              <Maximize className="h-4 w-4 text-brand-blue" />
              <span className="text-xs font-semibold text-foreground">{formatArea(property.areaUseful ?? property.area ?? 0)}</span>
            </div>
          </div>

          {/* CTA Ver Detalhes */}
          <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-blue/30 px-4 py-2.5 text-sm font-semibold text-brand-blue transition-all duration-300 group-hover:gap-3 group-hover:bg-brand-blue group-hover:text-white">
            Ver Detalhes <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
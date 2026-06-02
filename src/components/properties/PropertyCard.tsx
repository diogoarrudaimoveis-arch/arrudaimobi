import { Link } from "react-router-dom";
import { Property } from "@/types/property";
import { formatCurrency, formatArea } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, BedDouble, Bath, Car, Maximize, Heart, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { hoverLift, hoverZoom, viewportOnce } from "@/lib/animations";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Link to={`/imovel/${property.id}`} className="block group">
      <motion.div
        whileHover={{ y: -8 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="rounded-2xl bg-card shadow-soft overflow-hidden transition-shadow duration-300 hover:shadow-hover"
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          <motion.img
            src={property.images[0]?.url}
            alt={property.title}
            className="h-full w-full object-cover"
            loading="lazy"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />

          {/* Badges glassmorphism */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
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

          {/* Favorite button (visual only) */}
          <button
            type="button"
            aria-label="Favoritar imóvel"
            onClick={(e) => { e.preventDefault(); }}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-all hover:bg-white hover:scale-110"
          >
            <Heart className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Preço com destaque (sobre imagem) */}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="font-display text-2xl font-bold text-white drop-shadow-lg">
              {formatCurrency(property.price)}
              {property.purpose === "rent" && <span className="ml-1 text-sm font-normal opacity-90">/mês</span>}
            </p>
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-display text-base font-semibold text-foreground line-clamp-1">
            {property.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{property.neighborhood}, {property.city}</span>
          </p>

          {/* Stats com ícones destacados */}
          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-3">
            {property.bedrooms > 0 && (
              <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 px-1 py-1.5">
                <BedDouble className="h-4 w-4 text-brand-blue" />
                <span className="text-xs font-semibold text-foreground">{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms > 0 && (
              <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 px-1 py-1.5">
                <Bath className="h-4 w-4 text-brand-blue" />
                <span className="text-xs font-semibold text-foreground">{property.bathrooms}</span>
              </div>
            )}
            {property.garages > 0 && (
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
          <Button
            variant="outline"
            className="mt-4 w-full gap-2 rounded-xl border-brand-blue/30 text-brand-blue transition-all hover:gap-3 hover:bg-brand-blue hover:text-white"
            asChild
          >
            <span>
              Ver Detalhes <ArrowRight className="h-4 w-4" />
            </span>
          </Button>
        </div>
      </motion.div>
    </Link>
  );
}

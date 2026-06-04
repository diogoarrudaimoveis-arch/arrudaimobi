import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface PortalTemplate {
  id: string;
  name: string;
  description: string;
  preview: string; // emoji or mini SVG icon
  colors: {
    primary: string;
    accent: string;
    font: string;
    header: string;
    footer: string;
    hero: string;
  };
  tags: string[];
}

export const PORTAL_TEMPLATES: PortalTemplate[] = [
  {
    id: "modern-blue",
    name: "Modern Blue",
    description: "Visual limpo e profissional com tons de azul escuro, ideal para imobiliárias tradicionais.",
    preview: "🏙️",
    colors: { primary: "#003366", accent: "#0066CC", font: "Plus Jakarta Sans", header: "transparent", footer: "dark", hero: "search-centered" },
    tags: ["profissional", "azul", "tradicional"],
  },
  {
    id: "elegant-gold",
    name: "Elegant Gold",
    description: "Sofisticado com dourado e preto, perfeito para corretores de alto padrão.",
    preview: "✨",
    colors: { primary: "#1a1a1a", accent: "#C9A84C", font: "Playfair Display", header: "solid-dark", footer: "dark", hero: "fullwidth-image" },
    tags: ["luxo", "dourado", "premium"],
  },
  {
    id: "warm-earth",
    name: "Warm Earth",
    description: " Tons terrosos e quentes, transmite aconchego e confiança para famílias.",
    preview: "🏡",
    colors: { primary: "#8B5E3C", accent: "#C4956A", font: "Nunito", header: "light-solid", footer: "warm", hero: "video-background" },
    tags: ["terra", "aconchegante", "família"],
  },
  {
    id: "minimal-white",
    name: "Minimal White",
    description: "Design minimalista com muito branco e detalhes em verde, perfeito para startups.",
    preview: "🌿",
    colors: { primary: "#FFFFFF", accent: "#22C55E", font: "Inter", header: "white", footer: "light", hero: "split-hero" },
    tags: ["minimal", "branco", "clean"],
  },
  {
    id: "bold-gradient",
    name: "Bold Gradient",
    description: "Visual impactante com gradientes modernos, perfeito para marcas arrojadas.",
    preview: "🌈",
    colors: { primary: "#0F172A", accent: "#6366F1", font: "Space Grotesk", header: "gradient", footer: "dark", hero: "gradient-bg" },
    tags: ["moderno", "gradiente", "impactante"],
  },
  {
    id: "coastal-breeze",
    name: "Coastal Breeze",
    description: "Azul e verde aquático, transmite leveza e conexão com a natureza litorânea.",
    preview: "🌊",
    colors: { primary: "#0EA5E9", accent: "#10B981", font: "Poppins", header: "transparent", footer: "gradient", hero: "parallax-scroll" },
    tags: ["litoral", "azul", "leve"],
  },
  {
    id: "classic-realestate",
    name: "Classic Real Estate",
    description: "Visual clássico de inmobiliario com serifas e cores sóbrias, transmite tradição.",
    preview: "🏛️",
    colors: { primary: "#1E3A5F", accent: "#B8860B", font: "Merriweather", header: "dark", footer: "dark", hero: "search-bar-bottom" },
    tags: ["clássico", "serifado", "tradicional"],
  },
  {
    id: "tech-startup",
    name: "Tech Startup",
    description: "Visual tech com cores vibrantes e tipografia moderna, perfeito para proptechs.",
    preview: "🚀",
    colors: { primary: "#18181B", accent: "#F97316", font: "Outfit", header: "glass", footer: "glass", hero: "floating-search" },
    tags: ["tech", "startup", "moderno"],
  },
];

interface PortalTemplateSelectorProps {
  value: string;
  onChange: (templateId: string) => void;
}

export function PortalTemplateSelector({ value, onChange }: PortalTemplateSelectorProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {PORTAL_TEMPLATES.map((template) => {
          const isSelected = value === template.id;
          const isHovered = hovered === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onChange(template.id)}
              onMouseEnter={() => setHovered(template.id)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 text-left",
                "hover:shadow-md hover:scale-[1.02]",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              {/* Preview icon */}
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{ backgroundColor: template.colors.primary + "20" }}
              >
                {template.preview}
              </div>

              {/* Template name */}
              <div className="text-center w-full">
                <p className="text-xs font-semibold text-foreground">{template.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{template.description}</p>
              </div>

              {/* Color dots */}
              <div className="flex gap-1 mt-1">
                <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: template.colors.primary }} />
                <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: template.colors.accent }} />
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-1 justify-center">
                {template.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                ))}
              </div>

              {/* Selected badge */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded preview for hovered template */}
      {hovered && !value && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">
            {PORTAL_TEMPLATES.find(t => t.id === hovered)?.name}
          </p>
          <p>{PORTAL_TEMPLATES.find(t => t.id === hovered)?.description}</p>
        </div>
      )}
    </div>
  );
}
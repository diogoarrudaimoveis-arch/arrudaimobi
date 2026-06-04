import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface PortalTemplate {
  id: string;
  name: string;
  namePt: string;
  description: string;
  preview: string;
  colors: {
    primary: string;
    accent: string;
    font: string;
    header: string;
    footer: string;
    hero: string;
  };
  tags: string[];
  gradient?: string;
}

export const PORTAL_TEMPLATES: PortalTemplate[] = [
  {
    id: "modern-blue",
    name: "Modern Blue",
    namePt: "Azul Moderno",
    description: "Visual limpo e profissional com tons de azul escuro, ideal para imobiliárias tradicionais.",
    preview: "🏙️",
    colors: { primary: "#14213d", accent: "#3b82f6", font: "Plus Jakarta Sans", header: "transparent", footer: "dark", hero: "search-centered" },
    tags: ["profissional", "azul", "tradicional"],
    gradient: "linear-gradient(135deg, #14213d 0%, #3b82f6 100%)",
  },
  {
    id: "elegant-gold",
    name: "Elegant Gold",
    namePt: "Dourado Elegante",
    description: "Sofisticado com dourado e preto, perfeito para corretores de alto padrão.",
    preview: "✨",
    colors: { primary: "#1a1a1a", accent: "#C9A84C", font: "Playfair Display", header: "solid-dark", footer: "dark", hero: "fullwidth-image" },
    tags: ["luxo", "dourado", "premium"],
    gradient: "linear-gradient(135deg, #1a1a1a 0%, #C9A84C 100%)",
  },
  {
    id: "warm-earth",
    name: "Warm Earth",
    namePt: "Terra Aconchegante",
    description: "Tons terrosos e quentes, transmite aconchego e confiança para famílias.",
    preview: "🏡",
    colors: { primary: "#8B5E3C", accent: "#C4956A", font: "Nunito", header: "light-solid", footer: "warm", hero: "video-background" },
    tags: ["terra", "aconchegante", "família"],
    gradient: "linear-gradient(135deg, #8B5E3C 0%, #C4956A 100%)",
  },
  {
    id: "minimal-white",
    name: "Minimal White",
    namePt: "Branco Minimal",
    description: "Design minimalista com muito branco e detalhes em verde, perfeito para startups.",
    preview: "🌿",
    colors: { primary: "#f8fafc", accent: "#22C55E", font: "Inter", header: "white", footer: "light", hero: "split-hero" },
    tags: ["minimal", "branco", "clean"],
    gradient: "linear-gradient(135deg, #f8fafc 0%, #22C55E 100%)",
  },
  {
    id: "bold-gradient",
    name: "Bold Gradient",
    namePt: "Gradiente Impactante",
    description: "Visual impactante com gradientes modernos, perfeito para marcas arrojadas.",
    preview: "🌈",
    colors: { primary: "#0F172A", accent: "#6366F1", font: "Space Grotesk", header: "gradient", footer: "dark", hero: "gradient-bg" },
    tags: ["moderno", "gradiente", "impactante"],
    gradient: "linear-gradient(135deg, #0F172A 0%, #6366F1 50%, #EC4899 100%)",
  },
  {
    id: "coastal-breeze",
    name: "Coastal Breeze",
    namePt: "Breeze Costeiro",
    description: "Azul e verde aquático, transmite leveza e conexão com a natureza litorânea.",
    preview: "🌊",
    colors: { primary: "#0EA5E9", accent: "#10B981", font: "Poppins", header: "transparent", footer: "gradient", hero: "parallax-scroll" },
    tags: ["litoral", "azul", "leve"],
    gradient: "linear-gradient(135deg, #0EA5E9 0%, #10B981 100%)",
  },
  {
    id: "classic-realestate",
    name: "Classic Real Estate",
    namePt: "Imobiliário Clássico",
    description: "Visual clássico com serifas e cores sóbrias, transmite tradição e credibilidade.",
    preview: "🏛️",
    colors: { primary: "#1E3A5F", accent: "#B8860B", font: "Merriweather", header: "dark", footer: "dark", hero: "search-bar-bottom" },
    tags: ["clássico", "serifado", "tradicional"],
    gradient: "linear-gradient(135deg, #1E3A5F 0%, #B8860B 100%)",
  },
  {
    id: "tech-startup",
    name: "Tech Startup",
    namePt: "Tech Startup",
    description: "Visual tech com cores vibrantes e tipografia moderna, perfeito para proptechs.",
    preview: "🚀",
    colors: { primary: "#18181B", accent: "#F97316", font: "Outfit", header: "glass", footer: "glass", hero: "floating-search" },
    tags: ["tech", "startup", "moderno"],
    gradient: "linear-gradient(135deg, #18181B 0%, #F97316 100%)",
  },
];

interface PortalTemplateSelectorProps {
  value: string;
  onChange: (templateId: string) => void;
}

export function PortalTemplateSelector({ value, onChange }: PortalTemplateSelectorProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredRef, setHoveredRef] = useState<{ x: number; y: number } | null>(null);

  return (
    <div className="space-y-4">
      {/* Template grid - larger cards */}
      <div className="grid grid-cols-2 gap-3">
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
                "relative w-full text-left rounded-xl border-2 p-4 transition-all duration-200",
                "hover:shadow-lg hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-primary/40",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/20"
              )}
            >
              {/* Gradient color preview bar */}
              <div
                className="w-full h-16 rounded-lg mb-3 flex items-center justify-center text-2xl"
                style={{ background: template.gradient }}
              >
                <span className="text-3xl drop-shadow-md">{template.preview}</span>
              </div>

              {/* Template name in Portuguese */}
              <p className="text-sm font-bold text-foreground leading-tight">{template.namePt}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {template.description}
              </p>

              {/* Color swatches + tags */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1.5">
                  <div
                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: template.colors.primary }}
                    title={`Primary: ${template.colors.primary}`}
                  />
                  <div
                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: template.colors.accent }}
                    title={`Accent: ${template.colors.accent}`}
                  />
                </div>
                <div className="flex gap-1">
                  {template.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Selected badge */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-md">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
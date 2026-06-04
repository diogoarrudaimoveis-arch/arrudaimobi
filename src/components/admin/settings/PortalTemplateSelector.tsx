import { useState } from "react";
import { Check, Sparkles, Zap, Shield, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PortalTemplate {
  id: string;
  name: string;
  namePt: string;
  description: string;
  image: string; // public URL path
  colors: {
    primary: string;
    accent: string;
    font: string;
    header: string;
    footer: string;
    hero: string;
  };
  tags: string[];
  feature?: string; // USP badge text
}

export const PORTAL_TEMPLATES: PortalTemplate[] = [
  {
    id: "modern-blue",
    name: "Modern Blue",
    namePt: "Azul Moderno",
    description: "Visual limpo e profissional com tons de azul escuro, ideal para imobiliárias tradicionais.",
    image: "/templates/modern-blue.png",
    colors: { primary: "#14213d", accent: "#3b82f6", font: "Plus Jakarta Sans", header: "transparent", footer: "dark", hero: "search-centered" },
    tags: ["profissional", "azul", "SEO"],
    feature: "SEO Avançado",
  },
  {
    id: "elegant-gold",
    name: "Elegant Gold",
    namePt: "Dourado Elegante",
    description: "Sofisticado com dourado e preto, perfeito para corretores de alto padrão.",
    image: "/templates/elegant-gold.png",
    colors: { primary: "#1a1a1a", accent: "#C9A84C", font: "Playfair Display", header: "solid-dark", footer: "dark", hero: "fullwidth-image" },
    tags: ["luxo", "dourado", "premium"],
    feature: "Design Premium",
  },
  {
    id: "warm-earth",
    name: "Warm Earth",
    namePt: "Terra Aconchegante",
    description: "Tons terrosos e quentes, transmite aconchego e confiança para famílias.",
    image: "/templates/warm-earth.png",
    colors: { primary: "#8B5E3C", accent: "#C4956A", font: "Nunito", header: "light-solid", footer: "warm", hero: "video-background" },
    tags: ["terra", "família", " aconchego"],
    feature: "Alta Conversão",
  },
  {
    id: "minimal-white",
    name: "Minimal White",
    namePt: "Branco Minimal",
    description: "Design minimalista com muito branco e detalhes em verde, perfeito para startups.",
    image: "/templates/minimal-white.png",
    colors: { primary: "#f8fafc", accent: "#22C55E", font: "Inter", header: "white", footer: "light", hero: "split-hero" },
    tags: ["minimal", "clean", "tech"],
    feature: "Performance Top",
  },
  {
    id: "bold-gradient",
    name: "Bold Gradient",
    namePt: "Gradiente Impactante",
    description: "Visual impactante com gradientes modernos, perfeito para marcas arrojadas.",
    image: "/templates/bold-gradient.png",
    colors: { primary: "#0F172A", accent: "#6366F1", font: "Space Grotesk", header: "gradient", footer: "dark", hero: "gradient-bg" },
    tags: ["moderno", "gradiente", " arrojado"],
    feature: "Design 2026",
  },
  {
    id: "coastal-breeze",
    name: "Coastal Breeze",
    namePt: "Breeze Costeiro",
    description: "Azul e verde aquático, transmite leveza e conexão com a natureza litorânea.",
    image: "/templates/coastal-breeze.png",
    colors: { primary: "#0EA5E9", accent: "#10B981", font: "Poppins", header: "transparent", footer: "gradient", hero: "parallax-scroll" },
    tags: ["litoral", "azul", "leve"],
    feature: "Editor Visual",
  },
  {
    id: "classic-realestate",
    name: "Classic Real Estate",
    namePt: "Imobiliário Clássico",
    description: "Visual clássico com serifas e cores sóbrias, transmite tradição e credibilidade.",
    image: "/templates/classic-realestate.png",
    colors: { primary: "#1E3A5F", accent: "#B8860B", font: "Merriweather", header: "dark", footer: "dark", hero: "search-bar-bottom" },
    tags: ["clássico", "serifado", "tradição"],
    feature: "Corretora Premium",
  },
  {
    id: "tech-startup",
    name: "Tech Startup",
    namePt: "Tech Startup",
    description: "Visual tech com cores vibrantes e tipografia moderna, perfeito para proptechs.",
    image: "/templates/tech-startup.png",
    colors: { primary: "#18181B", accent: "#F97316", font: "Outfit", header: "glass", footer: "glass", hero: "floating-search" },
    tags: ["tech", "startup", "moderno"],
    feature: "CRM Integrado",
  },
];

interface PortalTemplateSelectorProps {
  value: string;
  onChange: (templateId: string) => void;
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  "SEO Avançado": <Zap className="w-3 h-3" />,
  "Design Premium": <Sparkles className="w-3 h-3" />,
  "Alta Conversão": <Shield className="w-3 h-3" />,
  "Performance Top": <Zap className="w-3 h-3" />,
  "Design 2026": <Sparkles className="w-3 h-3" />,
  "Editor Visual": <Globe className="w-3 h-3" />,
  "Corretora Premium": <Sparkles className="w-3 h-3" />,
  "CRM Integrado": <Shield className="w-3 h-3" />,
};

export function PortalTemplateSelector({ value, onChange }: PortalTemplateSelectorProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Template grid - Imobisoft style: full site preview with text below */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                "relative w-full text-left rounded-xl overflow-hidden border-2 transition-all duration-200",
                "hover:shadow-xl hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-primary/40",
                isSelected
                  ? "border-primary shadow-lg ring-2 ring-primary/30"
                  : "border-border bg-card hover:border-primary/50 hover:shadow-lg"
              )}
            >
              {/* Full site preview image */}
              <div className="relative w-full aspect-[16/9] overflow-hidden bg-muted">
                <img
                  src={template.image}
                  alt={template.namePt}
                  className="w-full h-full object-cover transition-transform duration-300"
                  style={{ transform: isHovered ? "scale(1.03)" : "scale(1)" }}
                />

                {/* Overlay gradient for text readability */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to bottom, transparent 50%, ${template.colors.primary}cc 100%)`,
                  }}
                />

                {/* USP Badge */}
                {template.feature && (
                  <div
                    className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold shadow-md"
                    style={{
                      backgroundColor: template.colors.accent,
                      color: "#fff",
                    }}
                  >
                    {FEATURE_ICONS[template.feature]}
                    {template.feature}
                  </div>
                )}

                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-3 left-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>

              {/* Template info below image */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground leading-tight">
                      {template.namePt}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                </div>

                {/* Color swatches + tags */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-1.5">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: template.colors.primary }}
                      title={`Primary: ${template.colors.primary}`}
                    />
                    <div
                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm -ml-1.5"
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
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
import { useState } from "react";
import { SearchFilters } from "@/types/property";
import { usePropertyTypes, useCities } from "@/hooks/use-properties";
import { usePropertyNLPSearch } from "@/hooks/use-property-nlp-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, X, Sparkles, Loader2 } from "lucide-react";

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  compact?: boolean;
}

export function SearchBar({ filters, onFiltersChange, compact = false }: SearchBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAISearchActive, setIsAISearchActive] = useState(false);
  const { data: propertyTypes } = usePropertyTypes();
  const { data: cities } = useCities();
  const { parseNaturalLanguage, isAILoading } = usePropertyNLPSearch();

  const updateFilter = (key: keyof SearchFilters, value: string | number) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({
      query: "",
      type: "",
      purpose: "",
      minPrice: 0,
      maxPrice: 0,
      bedrooms: 0,
      bathrooms: 0,
      garages: 0,
      city: "",
      sortBy: "newest",
    });
  };

  const quickTypes = (propertyTypes || [])
    .filter(t => t.active)
    .slice(0, 6);

  const isQuickTypeActive = (typeName: string) => filters.type === typeName;

  const toggleQuickType = (typeName: string) => {
    if (isQuickTypeActive(typeName)) {
      updateFilter("type", "");
    } else {
      updateFilter("type", typeName);
    }
  };

  const handleAISearch = async () => {
    if (!filters.query.trim()) return;
    setIsAISearchActive(true);
    try {
      const parsed = await parseNaturalLanguage(filters.query);
      onFiltersChange({
        ...filters,
        tipo: parsed.tipo as string || filters.tipo,
        type: parsed.type as string || filters.type,
        cidade: parsed.cidade as string || filters.cidade,
        city: parsed.city as string || filters.city,
        minPrice: parsed.minPreco || parsed.minPrice || 0,
        maxPrice: parsed.maxPreco || parsed.maxPrice || 0,
        bedrooms: parsed.dormitorios || parsed.bedrooms || 0,
        bathrooms: parsed.banheiros || parsed.bathrooms || 0,
        garages: parsed.vagas || parsed.garages || 0,
        purpose: parsed.purpose || filters.purpose,
      });
    } finally {
      setIsAISearchActive(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Quick filter chips — popular property types */}
      {!compact && quickTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          {quickTypes.map((type) => {
            const active = isQuickTypeActive(type.name);
            return (
              <Badge
                key={type.id}
                variant={active ? "default" : "outline"}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-all hover:scale-105 ${
                  active ? "bg-primary text-primary-foreground shadow-sm" : "bg-card hover:bg-accent"
                }`}
                onClick={() => toggleQuickType(type.name)}
              >
                {type.name}
              </Badge>
            );
          })}
          {(filters.type || filters.purpose) && (
            <Badge
              variant="secondary"
              className="cursor-pointer px-3 py-1.5 text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all hover:scale-105"
              onClick={resetFilters}
            >
              <X className="h-3 w-3 mr-1" />
              Limpar filtros
            </Badge>
          )}
        </div>
      )}

      {/* Main search row */}
      <div className={`flex flex-col gap-2 ${compact ? "sm:flex-row" : "md:flex-row"}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por localização, bairro ou cidade..."
            value={filters.query}
            onChange={(e) => updateFilter("query", e.target.value)}
            className="pl-10"
          />
        </div>

        {/* AI Search button — uses OmniRoute NLP to parse natural language */}
        {filters.query.trim() && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAISearch}
            disabled={isAILoading}
            className="shrink-0 gap-1.5 text-xs border-purple-500/50 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950"
            aria-label="Buscar com IA"
            title="Buscar com IA — interpretar busca em linguagem natural"
          >
            {isAILoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">IA</span>
          </Button>
        )}

        <Select value={filters.purpose || "all"} onValueChange={(v) => updateFilter("purpose", v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Finalidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="sale">Venda</SelectItem>
            <SelectItem value="rent">Aluguel</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.type || "all"} onValueChange={(v) => updateFilter("type", v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {propertyTypes ? (
              propertyTypes.filter(t => t.active).map((type) => (
                <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
              ))
            ) : (
              <Skeleton className="h-4 w-full" />
            )}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="shrink-0"
          aria-label="Filtros avançados"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 animate-fade-in">
          <div className="min-w-0 flex-1 sm:min-w-[160px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Cidade</label>
            <Select value={filters.city || "all"} onValueChange={(v) => updateFilter("city", v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Cidades</SelectItem>
                {cities?.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Preço Mín</label>
            <Input
              type="number"
              placeholder="R$ 0"
              value={filters.minPrice || ""}
              onChange={(e) => updateFilter("minPrice", Number(e.target.value))}
            />
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Preço Máx</label>
            <Input
              type="number"
              placeholder="Sem limite"
              value={filters.maxPrice || ""}
              onChange={(e) => updateFilter("maxPrice", Number(e.target.value))}
            />
          </div>
          <div className="min-w-0 w-full sm:min-w-[100px] sm:w-auto">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Quartos</label>
            <Select value={String(filters.bedrooms)} onValueChange={(v) => updateFilter("bedrooms", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Qualquer</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 w-full sm:min-w-[100px] sm:w-auto">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Banheiros</label>
            <Select value={String(filters.bathrooms)} onValueChange={(v) => updateFilter("bathrooms", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Qualquer</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 w-full sm:min-w-[100px] sm:w-auto">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Vagas</label>
            <Select value={String(filters.garages)} onValueChange={(v) => updateFilter("garages", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Qualquer</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-muted-foreground">
            <X className="h-3 w-3" />
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
}
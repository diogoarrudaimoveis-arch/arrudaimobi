import { useState } from "react";
import { SearchFilters } from "@/types/property";
import { usePropertyTypes, useCities } from "@/hooks/use-properties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, X } from "lucide-react";

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  compact?: boolean;
}

export function SearchBar({ filters, onFiltersChange, compact = false }: SearchBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { data: propertyTypes } = usePropertyTypes();
  const { data: cities } = useCities();

  const updateFilter = (key: keyof SearchFilters, value: any) => {
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

  return (
    <div className="w-full space-y-3">
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
            {propertyTypes?.filter(t => t.active).map((type) => (
              <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {showAdvanced && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
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

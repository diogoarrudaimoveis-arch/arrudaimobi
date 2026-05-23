import { useState, useMemo, useCallback, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { PropertyCardDb } from "@/components/properties/PropertyCardDb";
import { PropertyListItemDb } from "@/components/properties/PropertyListItemDb";
import { SearchBar } from "@/components/properties/SearchBar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyProperties } from "@/components/ui/empty-state";
import { usePublicProperties } from "@/hooks/use-properties";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchFilters, ViewMode } from "@/types/property";
import { LayoutGrid, List, MapPin } from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";
import { useSearchParams } from "react-router-dom";

const PAGE_SIZE = 12;

function parseFiltersFromParams(sp: URLSearchParams): SearchFilters {
  return {
    query: sp.get("q") || "",
    type: sp.get("type") || "",
    purpose: (sp.get("purpose") as SearchFilters["purpose"]) || "",
    minPrice: Number(sp.get("minPrice") || 0),
    maxPrice: Number(sp.get("maxPrice") || 0),
    bedrooms: Number(sp.get("bedrooms") || 0),
    bathrooms: Number(sp.get("bathrooms") || 0),
    garages: Number(sp.get("garages") || 0),
    city: sp.get("city") || "",
    sortBy: (sp.get("sortBy") as SearchFilters["sortBy"]) || "newest",
  };
}

function filtersToParams(filters: SearchFilters, page: number): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.query) p.q = filters.query;
  if (filters.type) p.type = filters.type;
  if (filters.purpose) p.purpose = filters.purpose;
  if (filters.city) p.city = filters.city;
  if (filters.minPrice) p.minPrice = String(filters.minPrice);
  if (filters.maxPrice) p.maxPrice = String(filters.maxPrice);
  if (filters.bedrooms) p.bedrooms = String(filters.bedrooms);
  if (filters.bathrooms) p.bathrooms = String(filters.bathrooms);
  if (filters.garages) p.garages = String(filters.garages);
  if (filters.sortBy && filters.sortBy !== "newest") p.sortBy = filters.sortBy;
  if (page > 1) p.page = String(page);
  return p;
}

const Properties = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<SearchFilters>(() => parseFiltersFromParams(searchParams));
  const [page, setPage] = useState(() => Number(searchParams.get("page") || 1));

  const debouncedQuery = useDebounce(filters.query, 400);

  // Sync filters to URL
  useEffect(() => {
    const params = filtersToParams({ ...filters, query: debouncedQuery }, page);
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filters.type, filters.purpose, filters.minPrice, filters.maxPrice, filters.bedrooms, filters.bathrooms, filters.garages, filters.city, filters.sortBy, page, setSearchParams]);

  // Reset page on filter change
  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const apiFilters = useMemo(() => {
    const f: Record<string, string> = {};
    if (debouncedQuery) f.q = debouncedQuery;
    if (filters.type) f.type = filters.type;
    if (filters.purpose) f.purpose = filters.purpose;
    if (filters.city) f.city = filters.city;
    if (filters.minPrice) f.minPrice = String(filters.minPrice);
    if (filters.maxPrice) f.maxPrice = String(filters.maxPrice);
    if (filters.bedrooms) f.bedrooms = String(filters.bedrooms);
    if (filters.bathrooms) f.bathrooms = String(filters.bathrooms);
    if (filters.garages) f.garages = String(filters.garages);
    if (filters.sortBy) f.sortBy = filters.sortBy;
    return f;
  }, [debouncedQuery, filters]);

  const { data, isLoading } = usePublicProperties({ ...apiFilters, page: String(page), pageSize: String(PAGE_SIZE) });
  const properties = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 0;

  const resetFilters = useCallback(() => {
    handleFiltersChange({
      query: "", type: "", purpose: "", minPrice: 0, maxPrice: 0,
      bedrooms: 0, bathrooms: 0, garages: 0, city: "", sortBy: "newest",
    });
  }, [handleFiltersChange]);

  return (
    <Layout>
      <section className="bg-secondary/50 py-8">
        <div className="container">
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Imóveis Disponíveis
          </h1>
          <p className="mt-1 text-muted-foreground">
            {isLoading ? "Carregando..." : `${total} imóveis encontrados`}
          </p>
        </div>
      </section>

      <section className="py-6">
        <div className="container space-y-6">
          <SearchBar filters={filters} onFiltersChange={handleFiltersChange} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select
              value={filters.sortBy}
              onValueChange={(v: SearchFilters["sortBy"]) => handleFiltersChange({ ...filters, sortBy: v })}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Mais Recentes</SelectItem>
                <SelectItem value="oldest">Mais Antigos</SelectItem>
                <SelectItem value="price_asc">Menor Preço</SelectItem>
                <SelectItem value="price_desc">Maior Preço</SelectItem>
                <SelectItem value="featured">Destaques</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex rounded-lg border border-border bg-card p-1 self-end sm:self-auto">
              <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("list")}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "map" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("map")}>
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <div key={i} className="animate-fade-in-up">
                  <Skeleton variant="card" className="w-full" />
                  <div className="mt-3 space-y-2 p-4">
                    <Skeleton variant="text" className="w-3/4" />
                    <Skeleton variant="text" className="w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !properties.length ? (
            <EmptyProperties onReset={resetFilters} />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {properties.map((p) => <PropertyCardDb key={p.id} property={p} />)}
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-4 stagger-children">
              {properties.map((p) => <PropertyListItemDb key={p.id} property={p} />)}
            </div>
          ) : (
            <div className="space-y-4">
              {properties.filter(p => p.latitude && p.longitude).length === 0 ? (
                <EmptyProperties onReset={resetFilters} />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {properties.filter(p => p.latitude && p.longitude).map((p) => (
                    <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card min-h-[300px] animate-fade-in-up">
                      <div className="aspect-video w-full min-h-[220px]">
                        <iframe
                          title={`Mapa - ${p.title}`}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3000!2d${p.longitude}!3d${p.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1spt-BR!2sbr!4v1`}
                          allowFullScreen
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-display text-sm font-semibold text-foreground truncate">{p.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[p.address, p.neighborhood, p.city, p.state].filter(Boolean).join(", ")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-primary">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: p.currency || "BRL" }).format(p.price)}
                          {p.purpose === "rent" ? "/mês" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-center text-xs text-muted-foreground">
                {properties.filter(p => p.latitude && p.longitude).length} de {total} imóveis com localização no mapa
              </p>
            </div>
          )}

          {/* Pagination */}
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </section>
    </Layout>
  );
};

export default Properties;
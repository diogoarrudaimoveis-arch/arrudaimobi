import { useState, useMemo, useCallback, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { PropertyCardDb } from "@/components/properties/PropertyCardDb";
import { PropertyListItemDb } from "@/components/properties/PropertyListItemDb";
import { SearchBar } from "@/components/properties/SearchBar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
    purpose: (sp.get("purpose") as any) || "",
    minPrice: Number(sp.get("minPrice") || 0),
    maxPrice: Number(sp.get("maxPrice") || 0),
    bedrooms: Number(sp.get("bedrooms") || 0),
    bathrooms: Number(sp.get("bathrooms") || 0),
    garages: Number(sp.get("garages") || 0),
    city: sp.get("city") || "",
    sortBy: (sp.get("sortBy") as any) || "newest",
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
    f.page = String(page);
    f.pageSize = String(PAGE_SIZE);
    return f;
  }, [debouncedQuery, filters.type, filters.purpose, filters.city, filters.minPrice, filters.maxPrice, filters.bedrooms, filters.bathrooms, filters.garages, filters.sortBy, page]);

  const { data: response, isLoading } = usePublicProperties(apiFilters);
  const properties = response?.data || [];
  const totalPages = response?.totalPages || 0;
  const total = response?.total || 0;

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
              onValueChange={(v: any) => handleFiltersChange({ ...filters, sortBy: v })}
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : !properties.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">Nenhum imóvel encontrado</h3>
              <p className="mt-1 text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => <PropertyCardDb key={p.id} property={p} />)}
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-4">
              {properties.map((p) => <PropertyListItemDb key={p.id} property={p} />)}
            </div>
          ) : (
            <div className="space-y-4">
              {properties.filter(p => p.latitude && p.longitude).length === 0 ? (
                <div className="flex h-[500px] items-center justify-center rounded-xl border border-border bg-card">
                  <div className="text-center">
                    <MapPin className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-3 font-display text-sm font-medium text-muted-foreground">
                      Nenhum imóvel com localização disponível
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {properties.filter(p => p.latitude && p.longitude).map((p) => (
                    <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
                      <div className="aspect-video w-full">
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

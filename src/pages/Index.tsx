import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { PropertyCardDb } from "@/components/properties/PropertyCardDb";
import { SearchBar } from "@/components/properties/SearchBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicProperties, usePublicAgents, usePublicStats, usePropertyTypes } from "@/hooks/use-properties";
import { usePublicBlogPosts } from "@/hooks/use-blog";
import { useTenantSettings } from "@/hooks/use-tenant-settings";
import { SearchFilters } from "@/types/property";
import {
  Building2, Users, UserCheck, MapPin, ArrowRight, CheckCircle2,
  Search, Shield, Zap, FileText, Calendar
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "", type: "", purpose: "", minPrice: 0, maxPrice: 0,
    bedrooms: 0, bathrooms: 0, garages: 0, city: "", sortBy: "newest",
  });

  const { data: featuredRes, isLoading: loadingFeatured } = usePublicProperties({ featured: "true", pageSize: "6" });
  const featuredProperties = featuredRes?.data;
  const { data: agentsRes, isLoading: loadingAgents } = usePublicAgents();
  const agents = agentsRes?.data;
  const { data: stats } = usePublicStats();
  const { data: propertyTypes } = usePropertyTypes();
  const { data: tenant } = useTenantSettings();
  const { data: blogRes, isLoading: loadingBlog } = usePublicBlogPosts(1, 3);
  const settings = tenant?.settings || {};
  const companyName = tenant?.name || "Sua Imobiliária";

  const heroHeadline = settings.hero_headline || "Encontre o imóvel dos seus sonhos";
  const heroSubheadline = settings.hero_subheadline || "Conectamos você às melhores oportunidades imobiliárias.";
  const showHeadline = settings.hero_headline_visible !== false;
  const showSubheadline = settings.hero_subheadline_visible !== false;
  const showHeroSearch = settings.hero_search_visible !== false;

  const gradientFrom = settings.gradient_from || "";
  const gradientTo = settings.gradient_to || "";
  const hasCustomGradient = gradientFrom && gradientTo;
  const heroBgMode = settings.hero_bg_mode || "gradient";
  const heroBgImageUrl = settings.hero_bg_image_url || "";
  const heroBgOverlayOpacity = settings.hero_bg_overlay_opacity ?? 50;
  const heroBgPosition = settings.hero_bg_position || "center";
  const useHeroImage = heroBgMode === "image" && heroBgImageUrl;

  const heroSectionStyle = useHeroImage
    ? { backgroundImage: `url(${heroBgImageUrl})`, backgroundSize: "cover", backgroundPosition: heroBgPosition }
    : hasCustomGradient
      ? { background: `linear-gradient(to bottom right, ${gradientFrom}, ${gradientTo})` }
      : undefined;

  const heroSectionClass = useHeroImage
    ? "relative overflow-hidden py-24 md:py-32"
    : hasCustomGradient
      ? "relative overflow-hidden py-24 md:py-32"
      : "relative overflow-hidden bg-gradient-to-br from-primary via-primary to-info py-24 md:py-32";

  const statItems = [
    { label: "Imóveis Cadastrados", value: stats ? `${stats.properties_count}+` : "—", icon: Building2 },
    { label: "Clientes Atendidos", value: "1.200+", icon: Users },
    { label: "Agentes Ativos", value: stats ? String(stats.agents_count) : "—", icon: UserCheck },
    { label: "Cidades Atendidas", value: stats ? String(stats.cities_count) : "—", icon: MapPin },
  ];

  return (
    <Layout>
      {/* Hero */}
      <section className={heroSectionClass} style={heroSectionStyle}>
        {useHeroImage && <div className="absolute inset-0" style={{ backgroundColor: `rgba(0, 0, 0, ${heroBgOverlayOpacity / 100})` }} />}
        {!useHeroImage && <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzEuMTA1IDAgMi0uODk1IDItMnMtLjg5NS0yLTItMi0yIC44OTUtMiAyIC44OTUgMiAyIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />}
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            {showHeadline && (
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl animate-fade-in">
                {heroHeadline}
              </h1>
            )}
            {showSubheadline && (
              <p className="mt-5 text-lg text-white/70 md:text-xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
                {heroSubheadline}
              </p>
            )}
            {showHeroSearch && (
              <div className="mx-auto mt-10 max-w-2xl rounded-2xl bg-card/95 p-5 shadow-2xl backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <SearchBar filters={filters} onFiltersChange={setFilters} compact />
                <Button className="mt-3 w-full gap-2" size="lg" asChild>
                  <Link to={`/imoveis?purpose=${filters.purpose}&type=${filters.type}&q=${filters.query}`}>
                    <Search className="h-4 w-4" /> Buscar Imóveis
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative -mt-1 border-b border-border bg-card py-10">
        <div className="container">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {statItems.map((stat, i) => (
              <div key={stat.label} className="flex flex-col items-center text-center animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="mt-3 font-display text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Property Types */}
      <section className="py-20">
        <div className="container">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-semibold uppercase tracking-wider">Categorias</Badge>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Explore por Tipo de Imóvel</h2>
            <p className="mt-2 text-muted-foreground">Encontre o tipo ideal para suas necessidades</p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {(propertyTypes || []).map((type) => (
              <Link
                key={type.id}
                to={`/imoveis?type=${type.name}`}
                className="group flex flex-col items-center rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/25">
                  <Building2 className="h-6 w-6" />
                </div>
                <span className="mt-3 text-sm font-medium text-foreground">{type.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="bg-secondary/30 py-20">
        <div className="container">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-semibold uppercase tracking-wider">Destaques</Badge>
              <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Imóveis em Destaque</h2>
              <p className="mt-2 text-muted-foreground">As melhores oportunidades selecionadas para você</p>
            </div>
            <Button variant="outline" className="hidden gap-2 sm:flex" asChild>
              <Link to="/imoveis">Ver Todos <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loadingFeatured ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="aspect-[4/3] w-full rounded-2xl" />)
            ) : featuredProperties?.length ? (
              featuredProperties.map((p) => <PropertyCardDb key={p.id} property={p} />)
            ) : (
              <p className="col-span-full py-12 text-center text-muted-foreground">Nenhum imóvel em destaque</p>
            )}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Button variant="outline" className="gap-2" asChild>
              <Link to="/imoveis">Ver Todos <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20">
        <div className="container">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-semibold uppercase tracking-wider">Vantagens</Badge>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Por que escolher a {companyName}?</h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { icon: Search, title: "Busca Inteligente", desc: "Filtros avançados por localização, preço, tipo e características para encontrar o imóvel perfeito." },
              { icon: Shield, title: "Segurança Total", desc: "Todas as transações e informações são protegidas com os mais altos padrões de segurança." },
              { icon: Zap, title: "Rapidez no Atendimento", desc: "Conecte-se diretamente com nossos agentes e receba respostas em minutos via WhatsApp." },
            ].map((item, i) => (
              <div
                key={item.title}
                className="group flex flex-col items-center rounded-2xl border border-border/60 bg-card p-8 text-center transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-all duration-300 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/25">
                  <item.icon className="h-7 w-7 text-primary transition-colors group-hover:text-primary-foreground" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agents */}
      <section className="bg-secondary/30 py-20">
        <div className="container">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-semibold uppercase tracking-wider">Equipe</Badge>
              <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Nossos Agentes</h2>
              <p className="mt-2 text-muted-foreground">Profissionais qualificados para atender você</p>
            </div>
            <Button variant="outline" className="hidden gap-2 sm:flex" asChild>
              <Link to="/agentes">Ver Todos <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loadingAgents ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-52 w-full rounded-2xl" />)
            ) : agents?.length ? (
              agents.map((agent) => (
                <Link key={agent.id} to={`/agentes/${agent.userId}`}>
                  <Card className="group overflow-hidden p-6 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20">
                    <div className="flex flex-col items-center text-center">
                      <Avatar className="h-20 w-20 ring-4 ring-primary/10 transition-all group-hover:ring-primary/25">
                        <AvatarImage src={agent.avatarUrl || undefined} alt={agent.fullName || ""} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg font-display">
                          {(agent.fullName || "A").split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="mt-4 font-display text-base font-semibold text-foreground">{agent.fullName || "Agente"}</h3>
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{agent.bio}</p>
                      <Badge variant="secondary" className="mt-3 gap-1.5">
                        <Building2 className="h-3 w-3" /> {agent.propertiesCount} imóveis
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))
            ) : (
              <p className="col-span-full py-12 text-center text-muted-foreground">Nenhum agente cadastrado</p>
            )}
          </div>
        </div>
      </section>

      {/* Blog */}
      {(loadingBlog || (blogRes?.data?.length ?? 0) > 0) && (
        <section className="py-20">
          <div className="container">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-semibold uppercase tracking-wider">Blog</Badge>
                <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Últimas Notícias</h2>
                <p className="mt-2 text-muted-foreground">Fique por dentro do mercado imobiliário</p>
              </div>
              <Button variant="outline" className="hidden gap-2 sm:flex" asChild>
                <Link to="/blog">Ver Todos <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {loadingBlog ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)
              ) : (
                blogRes?.data?.map((post) => (
                  <Link key={post.id} to={`/blog/${post.slug}`}>
                    <Card className="group overflow-hidden h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 hover:border-primary/20">
                      {post.cover_image_url ? (
                        <div className="h-40 overflow-hidden">
                          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      ) : (
                        <div className="h-40 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <FileText className="h-10 w-10 text-primary/30" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                          <Calendar className="h-3 w-3" />
                          {post.published_at
                            ? new Date(post.published_at).toLocaleDateString("pt-BR")
                            : new Date(post.created_at).toLocaleDateString("pt-BR")}
                        </div>
                        <h3 className="font-display text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h3>
                        {post.excerpt && <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>}
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Button variant="outline" className="gap-2" asChild>
                <Link to="/blog">Ver Todos <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div
            className={hasCustomGradient ? "overflow-hidden rounded-3xl p-10 text-center md:p-16" : "overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-info p-10 text-center md:p-16"}
            style={hasCustomGradient ? { background: `linear-gradient(to bottom right, ${gradientFrom}, ${gradientTo})` } : undefined}
          >
            <h2 className="font-display text-2xl font-bold text-primary-foreground md:text-4xl">
              Pronto para encontrar seu próximo imóvel?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-primary-foreground/80">
              Entre em contato conosco e deixe nossos especialistas ajudarem você.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="secondary" className="gap-2" asChild>
                <Link to="/imoveis"><Search className="h-4 w-4" /> Buscar Imóveis</Link>
              </Button>
              <Button size="lg" className="gap-2 bg-white !text-slate-900 hover:bg-white/90 shadow-lg" asChild>
                <Link to="/contato"><CheckCircle2 className="h-4 w-4" /> Fale Conosco</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
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
  const statsCounters = settings.stats_counters || {};
  const showStatsSection = statsCounters.show_stats !== false;

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
    {
      label: "Imóveis Cadastrados",
      value: statsCounters.properties_count?.trim() || (stats ? `${stats.properties_count}+` : "—"),
      icon: Building2,
    },
    {
      label: "Clientes Atendidos",
      value: statsCounters.clients_served?.trim() || "1.200+",
      icon: Users,
    },
    {
      label: "Agentes Ativos",
      value: statsCounters.active_agents?.trim() || (stats ? String(stats.agents_count) : "—"),
      icon: UserCheck,
    },
    {
      label: "Cidades Atendidas",
      value: statsCounters.cities_served?.trim() || (stats ? String(stats.cities_count) : "—"),
      icon: MapPin,
    },
  ];

  return (
    <Layout>
      {/* Hero */}
      <section className={heroSectionClass} style={heroSectionStyle}>
        {useHeroImage && <div className="absolute inset-0" style={{ backgroundColor: `rgba(0, 0, 0, ${heroBgOverlayOpacity / 100})` }} />}
        {!useHeroImage && (
          <>
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 40%, #0d9488 100%)" }} />
            <div className="absolute inset-0" style={{ backgroundImage: "url('data:image/svg+xml;utf8,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none%3E%3Cg fill=%23ffffff%3E%3Cpath d=M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')", opacity: 0.03 }} />
          </>
        )}
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
              <div className="mx-auto mt-10 max-w-2xl rounded-2xl bg-white/95 p-5 shadow-2xl backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <SearchBar filters={filters} onFiltersChange={setFilters} compact />
                <Button className="mt-3 w-full gap-2" size="lg" asChild>
                  <Link to={`/imoveis?purpose=${filters.purpose}&type=${filters.type}&q=${filters.query}`}>
                    <Search className="h-4 w-4" /> Buscar Imóveis
                  </Link>
                </Button>
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/60">
                  <a href={`https://wa.me/553197918717?text=${encodeURIComponent('Olá! Vim pelo site e gostaria de saber mais sobre os imóveis disponíveis.')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-white/90">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-green-400"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Fale no WhatsApp agora
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      {showStatsSection && (
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
      )}

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
          <div className="mt-12 flex flex-col gap-8 md:flex-row md:items-stretch">
            {[
              { icon: Search, title: "Busca Inteligente", desc: "Filtros avançados por localização, preço, tipo e características para encontrar o imóvel perfeito." },
              { icon: Shield, title: "Segurança Total", desc: "Todas as transações e informações são protegidas com os mais altos padrões de segurança." },
              { icon: Zap, title: "Rapidez no Atendimento", desc: "Conecte-se diretamente com nossos agentes e receba respostas em minutos via WhatsApp." },
            ].map((item, i) => (
              <div
                key={item.title}
                className="group flex-1 flex flex-col items-center rounded-2xl border border-border/60 bg-card p-8 text-center transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:-translate-y-1"
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
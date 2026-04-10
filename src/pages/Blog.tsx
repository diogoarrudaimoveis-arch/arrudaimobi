import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { usePublicBlogPosts, usePublicBlogTags } from "@/hooks/use-blog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Calendar, ArrowRight, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Blog() {
  const [page, setPage] = useState(1);
  const [activeTag, setActiveTag] = useState<string | undefined>();
  const { data, isLoading } = usePublicBlogPosts(page, 9, activeTag);
  const { data: tags } = usePublicBlogTags();
  const posts = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 9);

  const handleTagClick = (slug: string) => {
    setActiveTag(prev => prev === slug ? undefined : slug);
    setPage(1);
  };

  return (
    <Layout>
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-semibold uppercase tracking-wider">Blog</Badge>
            <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Notícias e Artigos</h1>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Fique por dentro do mercado imobiliário com nossas últimas notícias e dicas</p>
          </div>

          {/* Tag filters */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Badge
                variant={!activeTag ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => { setActiveTag(undefined); setPage(1); }}
              >
                Todos
              </Badge>
              {tags.map(tag => (
                <Badge
                  key={tag.id}
                  variant={activeTag === tag.slug ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => handleTagClick(tag.slug)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
            </div>
          ) : !posts.length ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FileText className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <p className="text-lg text-muted-foreground">Nenhuma publicação encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTag ? "Tente outro filtro ou volte em breve!" : "Volte em breve para novidades!"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <Link key={post.id} to={`/blog/${post.slug}`}>
                    <Card className="group overflow-hidden h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 hover:border-primary/20">
                      {post.cover_image_url ? (
                        <div className="h-48 overflow-hidden">
                          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <FileText className="h-12 w-12 text-primary/30" />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                          <Calendar className="h-3 w-3" />
                          {post.published_at
                            ? format(new Date(post.published_at), "dd 'de' MMM, yyyy", { locale: ptBR })
                            : format(new Date(post.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                          {post.author && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={post.author.avatar_url || undefined} />
                                  <AvatarFallback className="text-[8px] bg-primary/10">{(post.author.full_name || "A")[0]}</AvatarFallback>
                                </Avatar>
                                <span>{post.author.full_name}</span>
                              </div>
                            </>
                          )}
                        </div>
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {post.tags.map(tag => (
                              <Badge key={tag.id} variant="outline" className="text-[10px] px-1.5 py-0">{tag.name}</Badge>
                            ))}
                          </div>
                        )}
                        <h2 className="font-display text-base font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </h2>
                        {post.excerpt && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                        )}
                        <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary">
                          Ler mais <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="gap-1">
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground px-3">Página {page} de {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="gap-1">
                    Próxima <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}

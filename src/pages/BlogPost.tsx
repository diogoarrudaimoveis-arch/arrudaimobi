import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { usePublicBlogPost } from "@/hooks/use-blog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BlogPostDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading } = usePublicBlogPost(slug);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-16 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Post não encontrado</h1>
          <p className="mt-2 text-muted-foreground">Este post pode ter sido removido ou ainda não foi publicado.</p>
          <Button variant="outline" className="mt-6 gap-2" asChild>
            <Link to="/blog"><ArrowLeft className="h-4 w-4" /> Voltar ao Blog</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="py-12">
        <div className="container max-w-3xl">
          <Button variant="ghost" size="sm" className="gap-2 mb-6 text-muted-foreground" asChild>
            <Link to="/blog"><ArrowLeft className="h-4 w-4" /> Voltar ao Blog</Link>
          </Button>

          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl leading-tight">
            {post.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {post.published_at
                ? format(new Date(post.published_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : format(new Date(post.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            {post.author && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={post.author.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10">
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span>{post.author.full_name}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.tags.map(tag => (
                <Link key={tag.id} to={`/blog?tag=${tag.slug}`}>
                  <Badge variant="outline" className="text-xs hover:bg-primary/10 transition-colors cursor-pointer">
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {post.cover_image_url && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-border">
              <img src={post.cover_image_url} alt={post.title} className="w-full object-cover max-h-[500px]" />
            </div>
          )}

          {/* Rich HTML content */}
          <div
            className="mt-8 prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="mt-12 border-t border-border pt-6">
            <Button variant="outline" className="gap-2" asChild>
              <Link to="/blog"><ArrowLeft className="h-4 w-4" /> Ver mais posts</Link>
            </Button>
          </div>
        </div>
      </article>
    </Layout>
  );
}

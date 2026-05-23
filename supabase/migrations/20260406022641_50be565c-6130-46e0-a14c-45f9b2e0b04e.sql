
-- Blog posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can view published posts
CREATE POLICY "Anyone can view published blog posts"
ON public.blog_posts FOR SELECT TO public
USING (published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage blog posts"
ON public.blog_posts FOR ALL TO authenticated
USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
WITH CHECK (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Agents can manage their own posts
CREATE POLICY "Agents can manage own blog posts"
ON public.blog_posts FOR ALL TO authenticated
USING (author_id = auth.uid() AND has_tenant_role(auth.uid(), tenant_id, 'agent'::app_role))
WITH CHECK (author_id = auth.uid() AND has_tenant_role(auth.uid(), tenant_id, 'agent'::app_role));

-- Updated at trigger
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

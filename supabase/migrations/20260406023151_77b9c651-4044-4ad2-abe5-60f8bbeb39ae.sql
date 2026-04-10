
-- Tags table
CREATE TABLE public.blog_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blog tags" ON public.blog_tags
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage blog tags" ON public.blog_tags
  FOR ALL TO authenticated
  USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
  WITH CHECK (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Junction table
CREATE TABLE public.blog_post_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  UNIQUE(post_id, tag_id)
);

ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blog post tags" ON public.blog_post_tags
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage blog post tags" ON public.blog_post_tags
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.blog_posts bp
    WHERE bp.id = blog_post_tags.post_id
    AND has_tenant_role(auth.uid(), bp.tenant_id, 'admin'::app_role)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.blog_posts bp
    WHERE bp.id = blog_post_tags.post_id
    AND has_tenant_role(auth.uid(), bp.tenant_id, 'admin'::app_role)
  ));

CREATE POLICY "Agents can manage own post tags" ON public.blog_post_tags
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.blog_posts bp
    WHERE bp.id = blog_post_tags.post_id
    AND bp.author_id = auth.uid()
    AND has_tenant_role(auth.uid(), bp.tenant_id, 'agent'::app_role)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.blog_posts bp
    WHERE bp.id = blog_post_tags.post_id
    AND bp.author_id = auth.uid()
    AND has_tenant_role(auth.uid(), bp.tenant_id, 'agent'::app_role)
  ));

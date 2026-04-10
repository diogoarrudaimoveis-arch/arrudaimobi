
CREATE TABLE public.media_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  alt TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same tenant can view media" ON public.media_library
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Agents and admins can insert media" ON public.media_library
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (has_tenant_role(auth.uid(), tenant_id, 'agent') OR has_tenant_role(auth.uid(), tenant_id, 'admin'))
  );

CREATE POLICY "Owners or admins can update media" ON public.media_library
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR has_tenant_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "Owners or admins can delete media" ON public.media_library
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR has_tenant_role(auth.uid(), tenant_id, 'admin'));

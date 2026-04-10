
CREATE POLICY "Property owners can update images" ON public.property_images
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = property_images.property_id
    AND (p.agent_id = auth.uid() OR has_tenant_role(auth.uid(), p.tenant_id, 'admin'::app_role))
  ));

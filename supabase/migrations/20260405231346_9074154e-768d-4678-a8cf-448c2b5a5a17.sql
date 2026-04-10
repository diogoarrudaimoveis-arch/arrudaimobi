CREATE POLICY "Admins and agents can delete contacts"
ON public.contacts
FOR DELETE
TO authenticated
USING (
  has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
  OR agent_id = auth.uid()
);
-- 1. Criação da tabela base
CREATE TABLE IF NOT EXISTS public.property_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'contact_click', 'whatsapp_click')),
    visitor_ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices de agregação temporal e relacionamentos
CREATE INDEX IF NOT EXISTS idx_property_analytics_tenant_id ON public.property_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_analytics_property_id ON public.property_analytics(property_id);
CREATE INDEX IF NOT EXISTS idx_property_analytics_created_at ON public.property_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_property_analytics_event_type ON public.property_analytics(event_type);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.property_analytics ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Segurança
-- Visualização apenas por admins do respectivo tenant
DROP POLICY IF EXISTS "Admins can view property analytics for their tenant" ON public.property_analytics;
CREATE POLICY "Admins can view property analytics for their tenant"
    ON public.property_analytics
    FOR SELECT
    USING (public.has_tenant_role(auth.uid(), tenant_id, 'admin'));

-- Inserção pública permitida (pois são eventos vindos das pontas Web - visitantes)
DROP POLICY IF EXISTS "Public can insert analytics" ON public.property_analytics;
CREATE POLICY "Public can insert analytics"
    ON public.property_analytics
    FOR INSERT
    WITH CHECK (true);

-- 5. View Analítica Consolidada (usando security_invoker pra preservar o escopo do RLS)
CREATE OR REPLACE VIEW public.vw_property_analytics_summary WITH (security_invoker = on) AS
SELECT 
    pa.property_id,
    pa.tenant_id,
    p.title,
    COUNT(CASE WHEN pa.event_type = 'view' THEN 1 END) AS total_views,
    COUNT(CASE WHEN pa.event_type IN ('contact_click', 'whatsapp_click') THEN 1 END) AS total_clicks,
    CASE 
        WHEN COUNT(CASE WHEN pa.event_type = 'view' THEN 1 END) = 0 THEN 0
        ELSE ROUND((COUNT(CASE WHEN pa.event_type IN ('contact_click', 'whatsapp_click') THEN 1 END)::NUMERIC / COUNT(CASE WHEN pa.event_type = 'view' THEN 1 END)::NUMERIC) * 100, 2)
    END AS conversion_rate,
    MAX(pa.created_at) AS last_event_at
FROM 
    public.property_analytics pa
JOIN 
    public.properties p ON pa.property_id = p.id
GROUP BY 
    pa.property_id, pa.tenant_id, p.title;

GRANT SELECT ON public.vw_property_analytics_summary TO authenticated;
GRANT SELECT ON public.vw_property_analytics_summary TO anon;
GRANT SELECT ON public.vw_property_analytics_summary TO service_role;

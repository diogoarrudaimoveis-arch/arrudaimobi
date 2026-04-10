-- Migration: XML Feed RPC Function
-- Target: Efficiently retrieve data for portal XML feeds with 100% checklist validation

CREATE OR REPLACE FUNCTION public.get_portal_xml_data(
    p_tenant_id UUID,
    p_portal_id UUID
)
RETURNS TABLE (
    id UUID,
    property_code TEXT,
    title TEXT,
    description TEXT,
    purpose TEXT,
    price NUMERIC,
    area NUMERIC,
    bedrooms INTEGER,
    suites INTEGER,
    bathrooms INTEGER,
    garages INTEGER,
    zip_code TEXT,
    address TEXT,
    number TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    property_type_name TEXT,
    modality public.property_portal_modality,
    images JSONB,
    amenities JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.property_code,
        p.title,
        p.description,
        p.purpose::TEXT,
        p.price,
        p.area,
        p.bedrooms,
        p.suites,
        p.bathrooms,
        p.garages,
        p.zip_code,
        p.address,
        p.number,
        p.neighborhood,
        p.city,
        p.state,
        pt.name as property_type_name,
        ppl.modality,
        (
            SELECT jsonb_agg(jsonb_build_object('url', pi.url, 'alt', pi.alt))
            FROM public.property_images pi 
            WHERE pi.property_id = p.id
        ) as images,
        (
            SELECT jsonb_agg(a.name) 
            FROM public.property_amenities pa 
            JOIN public.amenities a ON pa.amenity_id = a.id 
            WHERE pa.property_id = p.id
        ) as amenities
    FROM public.properties p
    JOIN public.property_portal_listing ppl ON p.id = ppl.property_id
    JOIN public.property_types pt ON p.type_id = pt.id
    WHERE ppl.portal_id = p_portal_id
      AND p.tenant_id = p_tenant_id
      AND ppl.status = 'ativo'
      AND p.status = 'available'
      AND p.deleted_at IS NULL
      -- Checklist 100% logic:
      AND (SELECT count(*) FROM public.property_images pi WHERE pi.property_id = p.id) > 0
      AND p.zip_code IS NOT NULL AND trim(p.zip_code) <> ''
      AND p.address IS NOT NULL AND trim(p.address) <> ''
      AND p.city IS NOT NULL AND trim(p.city) <> ''
      AND p.state IS NOT NULL AND trim(p.state) <> ''
      AND length(COALESCE(p.description, '')) > 20
      AND p.price > 0
      AND p.owner_id IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION public.get_portal_xml_data IS 'Retrieves properties for a specific portal that meet the 100% quality checklist requirement.';

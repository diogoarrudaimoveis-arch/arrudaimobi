-- Add portal template and theme configuration columns to site_settings
-- Enables visual portal configurator with template selection and theme options

ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS portal_template TEXT DEFAULT 'modern-blue',
ADD COLUMN IF NOT EXISTS theme_primary_color TEXT DEFAULT '#003366',
ADD COLUMN IF NOT EXISTS theme_accent_color TEXT DEFAULT '#0066CC',
ADD COLUMN IF NOT EXISTS theme_font_family TEXT DEFAULT 'Plus Jakarta Sans',
ADD COLUMN IF NOT EXISTS theme_header_style TEXT DEFAULT 'transparent',
ADD COLUMN IF NOT EXISTS theme_footer_style TEXT DEFAULT 'dark',
ADD COLUMN IF NOT EXISTS theme_hero_layout TEXT DEFAULT 'search-centered',
ADD COLUMN IF NOT EXISTS theme_card_style TEXT DEFAULT 'rounded-shadow',
ADD COLUMN IF NOT EXISTS theme_show_whatsapp_float BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS theme_show_newsletter BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS theme_hero_title TEXT DEFAULT 'Encontre o imóvel ideal',
ADD COLUMN IF NOT EXISTS theme_hero_subtitle TEXT DEFAULT 'Os melhores imóveis do Brasil estão aqui',
ADD COLUMN IF NOT EXISTS theme_hero_image_url TEXT;

-- RLS for site_settings (already exists, ensure anon can read for public portal)
-- No changes needed to RLS as tenant_id scoping is already in place
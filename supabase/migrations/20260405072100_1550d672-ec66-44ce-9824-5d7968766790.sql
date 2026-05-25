
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'user');
CREATE TYPE public.property_purpose AS ENUM ('sale', 'rent');
CREATE TYPE public.property_status AS ENUM ('available', 'sold', 'rented', 'pending');
CREATE TYPE public.contact_status AS ENUM ('new', 'read', 'replied', 'archived');

-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tenants
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User Roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_tenant ON public.user_roles(tenant_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- Security definer functions (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id UUID, _tenant_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND role = _role
  );
$$;

-- Property Types
CREATE TABLE public.property_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Building2',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_property_types_tenant ON public.property_types(tenant_id);
CREATE TRIGGER update_property_types_updated_at BEFORE UPDATE ON public.property_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Amenities
CREATE TABLE public.amenities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Check',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_amenities_tenant ON public.amenities(tenant_id);
CREATE TRIGGER update_amenities_updated_at BEFORE UPDATE ON public.amenities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Properties
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id),
  type_id UUID REFERENCES public.property_types(id),
  title TEXT NOT NULL,
  description TEXT,
  purpose property_purpose NOT NULL DEFAULT 'sale',
  status property_status NOT NULL DEFAULT 'available',
  price NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  area NUMERIC(10,2) DEFAULT 0,
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  garages INTEGER DEFAULT 0,
  address TEXT,
  city TEXT,
  state TEXT,
  neighborhood TEXT,
  zip_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_properties_tenant ON public.properties(tenant_id);
CREATE INDEX idx_properties_agent ON public.properties(agent_id);
CREATE INDEX idx_properties_type ON public.properties(type_id);
CREATE INDEX idx_properties_purpose ON public.properties(purpose);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_featured ON public.properties(featured);
CREATE INDEX idx_properties_city ON public.properties(city);
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Property Images
CREATE TABLE public.property_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_property_images_property ON public.property_images(property_id);

-- Property Amenities (junction)
CREATE TABLE public.property_amenities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  UNIQUE(property_id, amenity_id)
);
ALTER TABLE public.property_amenities ENABLE ROW LEVEL SECURITY;

-- Contacts / Leads
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT,
  status contact_status DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_contacts_tenant ON public.contacts(tenant_id);
CREATE INDEX idx_contacts_agent ON public.contacts(agent_id);
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================== RLS POLICIES =====================

-- Tenants: members can view their tenant
CREATE POLICY "Members can view their tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can update their tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.has_tenant_role(auth.uid(), id, 'admin'));

-- Profiles: same tenant can view, owner can edit
CREATE POLICY "Same tenant can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- User Roles: same tenant can view, admin can manage
CREATE POLICY "Same tenant can view roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'admin'));

-- Property Types: public read, admin manage
CREATE POLICY "Anyone can view active property types" ON public.property_types
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert property types" ON public.property_types
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "Admins can update property types" ON public.property_types
  FOR UPDATE TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "Admins can delete property types" ON public.property_types
  FOR DELETE TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'admin'));

-- Amenities: public read, admin manage
CREATE POLICY "Anyone can view amenities" ON public.amenities
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert amenities" ON public.amenities
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "Admins can update amenities" ON public.amenities
  FOR UPDATE TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "Admins can delete amenities" ON public.amenities
  FOR DELETE TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'admin'));

-- Properties: public read, agents manage own, admin manage all
CREATE POLICY "Anyone can view available properties" ON public.properties
  FOR SELECT USING (true);

CREATE POLICY "Agents can insert own properties" ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (
    agent_id = auth.uid() AND
    tenant_id = public.get_user_tenant_id(auth.uid()) AND
    (public.has_tenant_role(auth.uid(), tenant_id, 'agent') OR public.has_tenant_role(auth.uid(), tenant_id, 'admin'))
  );

CREATE POLICY "Agents can update own properties" ON public.properties
  FOR UPDATE TO authenticated
  USING (
    (agent_id = auth.uid() OR public.has_tenant_role(auth.uid(), tenant_id, 'admin'))
    AND tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Agents can delete own or admin all" ON public.properties
  FOR DELETE TO authenticated
  USING (
    (agent_id = auth.uid() OR public.has_tenant_role(auth.uid(), tenant_id, 'admin'))
    AND tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- Property Images: public read, property owner can manage
CREATE POLICY "Anyone can view property images" ON public.property_images
  FOR SELECT USING (true);

CREATE POLICY "Property owners can insert images" ON public.property_images
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
      AND (p.agent_id = auth.uid() OR public.has_tenant_role(auth.uid(), p.tenant_id, 'admin'))
    )
  );

CREATE POLICY "Property owners can delete images" ON public.property_images
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
      AND (p.agent_id = auth.uid() OR public.has_tenant_role(auth.uid(), p.tenant_id, 'admin'))
    )
  );

-- Property Amenities: public read, property owner can manage
CREATE POLICY "Anyone can view property amenities" ON public.property_amenities
  FOR SELECT USING (true);

CREATE POLICY "Property owners can manage amenities" ON public.property_amenities
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
      AND (p.agent_id = auth.uid() OR public.has_tenant_role(auth.uid(), p.tenant_id, 'admin'))
    )
  );

CREATE POLICY "Property owners can delete amenities" ON public.property_amenities
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
      AND (p.agent_id = auth.uid() OR public.has_tenant_role(auth.uid(), p.tenant_id, 'admin'))
    )
  );

-- Contacts: anyone can submit, agents/admins can view their own
CREATE POLICY "Anyone can submit a contact" ON public.contacts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Agents can view contacts for their properties" ON public.contacts
  FOR SELECT TO authenticated
  USING (
    agent_id = auth.uid()
    OR public.has_tenant_role(auth.uid(), tenant_id, 'admin')
  );

CREATE POLICY "Agents can update their contacts" ON public.contacts
  FOR UPDATE TO authenticated
  USING (
    agent_id = auth.uid()
    OR public.has_tenant_role(auth.uid(), tenant_id, 'admin')
  );

-- Storage bucket for property images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

CREATE POLICY "Anyone can view property images storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can upload property images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Users can delete own property images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Handle new user registration: auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _tenant_id UUID;
  _role app_role;
BEGIN
  -- Get or create default tenant
  SELECT id INTO _tenant_id FROM public.tenants WHERE slug = 'default' LIMIT 1;
  IF _tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, slug) VALUES ('Imobiliária Pro', 'default') RETURNING id INTO _tenant_id;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (user_id, tenant_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    _tenant_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Assign role (first user becomes admin, rest are users)
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE tenant_id = _tenant_id AND role = 'admin') THEN
    _role := 'admin';
  ELSE
    _role := 'user';
  END IF;

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, _tenant_id, _role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

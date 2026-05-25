-- Migration: Smart Agenda (Appointments)
-- Target: Management of visits, meetings, and tasks for brokers.

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE public.appointment_type AS ENUM (
        'Visita', 'Captação de Imóvel', 'Reunião de Equipe', 
        'Reunião com Proprietário', 'Proposta Urgente', 
        'Pós-Venda', 'Treinamento', 'Outro'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.appointment_priority AS ENUM ('Normal', 'Alta', 'Urgente');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.appointment_status AS ENUM ('Agendado', 'Confirmado', 'Concluído', 'Cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Create Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type public.appointment_type NOT NULL DEFAULT 'Visita',
    priority public.appointment_priority NOT NULL DEFAULT 'Normal',
    status public.appointment_status NOT NULL DEFAULT 'Agendado',
    start_time TIMESTAMPTZ NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60, -- minutes
    assigned_to UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    event_color TEXT DEFAULT '#3B82F6', -- Default blue
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 4. Indices
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON public.appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned ON public.appointments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_property ON public.appointments(property_id);

-- 5. Trigger for updated_at
CREATE TRIGGER update_appointments_updated_at 
BEFORE UPDATE ON public.appointments 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RLS Policies
DROP POLICY IF EXISTS "Agents can view own appointments" ON public.appointments;
CREATE POLICY "Agents can view own appointments" ON public.appointments
    FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id(auth.uid()) AND (
            assigned_to = auth.uid() OR 
            public.has_tenant_role(auth.uid(), tenant_id, 'admin')
        )
    );

DROP POLICY IF EXISTS "Agents can insert own appointments" ON public.appointments;
CREATE POLICY "Agents can insert own appointments" ON public.appointments
    FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_user_tenant_id(auth.uid()) AND
        (public.has_tenant_role(auth.uid(), tenant_id, 'agent') OR public.has_tenant_role(auth.uid(), tenant_id, 'admin'))
    );

DROP POLICY IF EXISTS "Agents can update own or admin all" ON public.appointments;
CREATE POLICY "Agents can update own or admin all" ON public.appointments
    FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_user_tenant_id(auth.uid()) AND (
            assigned_to = auth.uid() OR 
            public.has_tenant_role(auth.uid(), tenant_id, 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins can delete appointments" ON public.appointments;
CREATE POLICY "Admins can delete appointments" ON public.appointments
    FOR DELETE TO authenticated
    USING (public.has_tenant_role(auth.uid(), tenant_id, 'admin'));

-- 7. View for Busy Brokers (Optional helper)
CREATE OR REPLACE VIEW public.vw_busy_brokers AS
SELECT 
    p.user_id,
    p.tenant_id,
    p.full_name,
    p.avatar_url,
    count(a.id) as active_appointments
FROM public.profiles p
LEFT JOIN public.appointments a ON p.user_id = a.assigned_to 
    AND a.status IN ('Agendado', 'Confirmado')
    AND a.start_time >= now()
GROUP BY p.user_id, p.tenant_id, p.full_name, p.avatar_url;

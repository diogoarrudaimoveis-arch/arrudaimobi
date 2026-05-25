/**
 * useAdminDashboardData — Real Supabase data for dashboard
 * Replaces all MOCK_* data with live queries
 * Respects RLS — shows empty states on access denied
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardMetrics {
  propertiesCount: number | null;
  contactsCount: number | null;
  ownersCount: number | null;
  appointmentsCount: number | null;
  appointmentsTodayCount: number | null;
  blogPostsCount: number | null;
}

export interface RecentProperty {
  id: string;
  title: string;
  price: number;
  type: string;
  status: string;
  created_at: string;
}

export interface RecentContact {
  id: string;
  name: string;
  phone: string | null;
  source: string | null;
  temperature: string | null;
  created_at: string;
}

export interface RecentAppointment {
  id: string;
  title: string;
  type: string;
  status: string;
  start_time: string;
}

export interface PropertyTypeCount {
  name: string;
  count: number;
}

export function useAdminDashboardData() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    propertiesCount: null,
    contactsCount: null,
    ownersCount: null,
    appointmentsCount: null,
    appointmentsTodayCount: null,
    blogPostsCount: null,
  });
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([]);
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [propertyTypeStats, setPropertyTypeStats] = useState<PropertyTypeCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      console.log('[DashboardData] no user, skip fetch');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    console.log('[DashboardData] fetching for user:', user.id);

    async function fetchAll() {
      try {
        // Get tenant_id from profile
        const profileRes = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("user_id", user.id)
          .single();

        console.log('[DashboardData] profileRes:', profileRes.data, 'error:', profileRes.error);

        const tenantId = profileRes.data?.tenant_id;
        if (!tenantId) {
          console.log('[DashboardData] NO TENANT ID - aborting fetch');
          if (!cancelled) setLoading(false);
          return;
        }
        console.log('[DashboardData] using tenantId:', tenantId);

        const today = new Date().toISOString().split("T")[0] + "T00:00:00";

        const [
          propertiesResult,
          contactsResult,
          appointmentsResult,
          appointmentsTodayResult,
          ownersResult,
          blogPostsResult,
          recentPropsResult,
          recentContactsResult,
          recentAppointmentsResult,
          propertyTypesResult,
        ] = await Promise.allSettled([
          supabase.from("properties").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
          supabase.from("contacts").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
          supabase.from("appointments").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
          supabase.from("appointments").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("start_time", today),
          supabase.from("owners").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
          supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
          supabase.from("properties").select("id,title,price,status,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
          supabase.from("contacts").select("id,name,phone,source,temperature,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
          supabase.from("appointments").select("id,title,type,status,start_time").eq("tenant_id", tenantId).gte("start_time", today).order("start_time", { ascending: true }).limit(5),
          supabase.from("property_types").select("id,name").eq("tenant_id", tenantId).limit(100),
        ]);

        if (cancelled) return;

        const getCount = (result: PromiseSettledResult<unknown>) =>
          result.status === "fulfilled" ? (result.value as { count?: number }).count ?? null : null;

        setMetrics({
          propertiesCount: getCount(propertiesResult),
          contactsCount: getCount(contactsResult),
          appointmentsCount: getCount(appointmentsResult),
          appointmentsTodayCount: getCount(appointmentsTodayResult),
          ownersCount: getCount(ownersResult),
          blogPostsCount: getCount(blogPostsResult),
        });

        if (recentPropsResult.status === "fulfilled" && recentPropsResult.value.data) {
          const props = (recentPropsResult.value.data as Array<Record<string, unknown>>).map((p) => ({
            id: String(p.id),
            title: String(p.title || "Sem título"),
            price: Number(p.price) || 0,
            type: "Imóvel",
            status: String(p.status || "unknown"),
            created_at: String(p.created_at),
          }));
          setRecentProperties(props);
        }

        if (recentContactsResult.status === "fulfilled" && recentContactsResult.value.data) {
          const contacts = (recentContactsResult.value.data as Array<Record<string, unknown>>).map((c) => ({
            id: String(c.id),
            name: String(c.name || "Sem nome"),
            phone: (c.phone as string | null) || null,
            source: (c.source as string | null) || null,
            temperature: (c.temperature as string | null) || null,
            created_at: String(c.created_at),
          }));
          setRecentContacts(contacts);
        }

        if (recentAppointmentsResult.status === "fulfilled" && recentAppointmentsResult.value.data) {
          const appts = (recentAppointmentsResult.value.data as Array<Record<string, unknown>>).map((a) => ({
            id: String(a.id),
            title: String(a.title || "Sem título"),
            type: String(a.type || "Visita"),
            status: String(a.status || "Agendado"),
            start_time: String(a.start_time),
          }));
          setRecentAppointments(appts);
        }

        if (propertyTypesResult.status === "fulfilled" && propertyTypesResult.value.data) {
          setPropertyTypeStats(
            (propertyTypesResult.value.data as Array<{ id: string; name: string }>).map((pt) => ({
              name: pt.name || "Não definido",
              count: 1,
            }))
          );
        }
      } catch (err) {
        console.error("Dashboard data error:", err);
        if (!cancelled) setError("Erro ao carregar dados");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [user]);

  return {
    metrics,
    recentProperties,
    recentContacts,
    recentAppointments,
    propertyTypeStats,
    loading,
    error,
  };
}
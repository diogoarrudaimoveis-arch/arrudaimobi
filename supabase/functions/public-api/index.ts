import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "https://arrudaimobi.com.br",
  "https://www.arrudaimobi.com.br",
  "https://arrudaimobi.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173"
];

const getCorsHeaders = (origin: string | null) => {
  const headers = {
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };

  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost") || origin.includes("127.0.0.1"))) {
    return { ...headers, "Access-Control-Allow-Origin": origin };
  }

  return { ...headers, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
};

function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

async function enrichWithAgents(supabase: any, properties: any[]) {
  const agentIds = [...new Set(properties.map(p => p.agent_id).filter(Boolean))];
  if (agentIds.length === 0) return properties;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url, phone, bio")
    .in("user_id", agentIds);

  const profileMap: Record<string, any> = {};
  profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

  return properties.map(p => ({
    ...p,
    agent: p.agent_id ? profileMap[p.agent_id] || null : null,
  }));
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = getSupabase();
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!action) {
      return new Response(JSON.stringify({ error: "action required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any;

    switch (action) {
      case "list-properties": {
        const purpose = url.searchParams.get("purpose") || "";
        const type = url.searchParams.get("type") || "";
        const query = url.searchParams.get("q") || "";
        const sortBy = url.searchParams.get("sortBy") || "newest";
        const minPrice = Number(url.searchParams.get("minPrice") || 0);
        const maxPrice = Number(url.searchParams.get("maxPrice") || 0);
        const bedrooms = Number(url.searchParams.get("bedrooms") || 0);
        const bathrooms = Number(url.searchParams.get("bathrooms") || 0);
        const garages = Number(url.searchParams.get("garages") || 0);
        const featured = url.searchParams.get("featured");
        const page = Math.max(1, Number(url.searchParams.get("page") || 1));
        const pageSize = Math.min(Math.max(1, Number(url.searchParams.get("pageSize") || 12)), 50);

        // Count query
        let countQ = supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("status", "available");

        // Data query
        let q = supabase
          .from("properties")
          .select(`
            *,
            property_types(id, name, icon),
            property_images(id, url, alt, display_order),
            property_amenities(amenity_id, amenities(id, name, icon))
          `)
          .eq("status", "available")
          .range((page - 1) * pageSize, page * pageSize - 1);

        const city = url.searchParams.get("city") || "";

        // Apply filters to both queries
        if (purpose) { q = q.eq("purpose", purpose); countQ = countQ.eq("purpose", purpose); }
        if (city) { q = q.eq("city", city); countQ = countQ.eq("city", city); }
        if (minPrice) { q = q.gte("price", minPrice); countQ = countQ.gte("price", minPrice); }
        if (maxPrice) { q = q.lte("price", maxPrice); countQ = countQ.lte("price", maxPrice); }
        if (bedrooms) { q = q.gte("bedrooms", bedrooms); countQ = countQ.gte("bedrooms", bedrooms); }
        if (bathrooms) { q = q.gte("bathrooms", bathrooms); countQ = countQ.gte("bathrooms", bathrooms); }
        if (garages) { q = q.gte("garages", garages); countQ = countQ.gte("garages", garages); }
        if (featured === "true") { q = q.eq("featured", true); countQ = countQ.eq("featured", true); }
        if (query) {
          // Sanitize query to prevent injection via .or() filter
          const safeQuery = query.replace(/[%_\\'"]/g, "");
          if (safeQuery.length > 0 && safeQuery.length <= 100) {
            const filter = `title.ilike.%${safeQuery}%,city.ilike.%${safeQuery}%,neighborhood.ilike.%${safeQuery}%,address.ilike.%${safeQuery}%`;
            q = q.or(filter);
            countQ = countQ.or(filter);
          }
        }

        switch (sortBy) {
          case "price_asc": q = q.order("price", { ascending: true }); break;
          case "price_desc": q = q.order("price", { ascending: false }); break;
          case "oldest": q = q.order("created_at", { ascending: true }); break;
          case "featured": q = q.order("featured", { ascending: false }).order("created_at", { ascending: false }); break;
          default: q = q.order("created_at", { ascending: false });
        }

        const [{ data, error }, { count }] = await Promise.all([q, countQ]);
        if (error) throw error;

        let enriched = await enrichWithAgents(supabase, data || []);

        // Filter by type name post-query
        if (type) {
          enriched = enriched.filter((p: any) => p.property_types?.name === type);
        }

        result = {
          data: enriched,
          total: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
        };
        break;
      }

      case "get-property": {
        const id = url.searchParams.get("id");
        if (!id) throw new Error("id required");

        const { data, error } = await supabase
          .from("properties")
          .select(`
            *,
            property_types(id, name, icon),
            property_images(id, url, alt, display_order),
            property_amenities(amenity_id, amenities(id, name, icon))
          `)
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const enriched = await enrichWithAgents(supabase, [data]);
          result = enriched[0];
        } else {
          result = null;
        }
        break;
      }

      // Block 6b: Auto-reply with property catalog
      // Returns a formatted WhatsApp-friendly catalog of up to 5 properties
      case "get-property-catalog": {
        const query = url.searchParams.get("q") || "";
        const purpose = url.searchParams.get("purpose") || "";
        const typeId = url.searchParams.get("typeId") || "";
        const minPrice = Number(url.searchParams.get("minPrice") || 0);
        const maxPrice = Number(url.searchParams.get("maxPrice") || 0);
        const bedrooms = Number(url.searchParams.get("bedrooms") || 0);
        const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit") || 5)), 10);

        let q = supabase
          .from("properties")
          .select(`
            id, title, price, purpose, area, bedrooms, bathrooms, garages,
            city, neighborhood, property_types(name),
            property_images(id, url, alt, display_order)
          `)
          .eq("status", "available");

        if (purpose) q = q.eq("purpose", purpose);
        if (typeId) q = q.eq("type_id", typeId);
        if (minPrice > 0) q = q.gte("price", minPrice);
        if (maxPrice > 0) q = q.lte("price", maxPrice);
        if (bedrooms > 0) q = q.gte("bedrooms", bedrooms);
        if (query) q = q.or(`title.ilike.%${query}%,neighborhood.ilike.%${query}%,city.ilike.%${query}%`);

        q = q.order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(limit);

        const { data: properties, error: propError } = await q;
        if (propError) throw propError;

        if (!properties || properties.length === 0) {
          result = { catalog: null, message: "Nenhum imóvel encontrado com esses filtros. Tente outros critérios!" };
          break;
        }

        const lines: string[] = [];
        lines.push("🏠 *Catálogo de Imóveis — Arruda Imobi*");
        lines.push("");
        for (const p of properties) {
          const typeName = (p as any).property_types?.name || "Imóvel";
          const images = (p as any).property_images || [];
          const firstImage = images.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))[0];
          const imgLine = firstImage ? `📷 https://www.arrudaimobi.com.br/imovel/${p.id}` : `🔗 https://www.arrudaimobi.com.br/imovel/${p.id}`;
          const priceFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(p.price));
          const purposeLabel = p.purpose === "rent" ? "Aluguel" : "Venda";
          const areaStr = p.area ? ` | 📐 ${p.area}m²` : "";
          const beds = p.bedrooms ? `🛏 ${p.bedrooms}` : "";
          const baths = p.bathrooms ? `🛁 ${p.bathrooms}` : "";
          const garages = p.garages ? `🚗 ${p.garages}` : "";
          const extras = [beds, baths, garages].filter(Boolean).join(" | ");
          lines.push(`${purposeLabel} — ${priceFormatted}`);
          lines.push(`📍 ${p.neighborhood || p.city || "Belo Horizonte"}, ${p.city || "MG"}`);
          lines.push(`${typeName}${areaStr} ${extras ? `| ${extras}` : ""}`);
          lines.push(imgLine);
          lines.push("");
        }
        lines.push("👉 https://www.arrudaimobi.com.br/imoveis");
        lines.push("");
        lines.push("Gostou de algum? Responda o número do imóvel ou fale com um corretor! 👨‍💼");

        result = {
          catalog: properties.map((p: any) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            purpose: p.purpose,
            purposeLabel: p.purpose === "rent" ? "Aluguel" : "Venda",
            city: p.city,
            neighborhood: p.neighborhood,
            typeName: p.property_types?.name || "Imóvel",
            url: `https://www.arrudaimobi.com.br/imovel/${p.id}`,
            imageUrl: (p.property_images || []).sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))[0]?.url || null,
          })),
          message: lines.join("\n"),
        };
        break;
      }

      // Block 6b: Get single property formatted for WhatsApp
      case "get-property-whatsapp": {
        const id = url.searchParams.get("id");
        if (!id) throw new Error("id required");

        const { data, error } = await supabase
          .from("properties")
          .select(`
            id, title, price, purpose, area, bedrooms, bathrooms, garages,
            city, neighborhood, address, description,
            property_types(name),
            property_images(id, url, alt, display_order)
          `)
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          result = { message: "Imóvel não encontrado. 😕" };
          break;
        }

        const lines: string[] = [];
        const typeName = (data as any).property_types?.name || "Imóvel";
        const images = (data as any).property_images || [];
        const sortedImages = images.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
        const priceFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(data.price));
        const purposeLabel = data.purpose === "rent" ? "Aluguel" : "Venda";
        const areaStr = data.area ? `📐 ${data.area}m²` : "";
        const beds = data.bedrooms ? `🛏 ${data.bedrooms} quarto${data.bedrooms > 1 ? "s" : ""}` : "";
        const baths = data.bathrooms ? `🛁 ${data.bathrooms} banheiro${data.bathrooms > 1 ? "s" : ""}` : "";
        const garages = data.garages ? `🚗 ${data.garages} vaga${data.garages > 1 ? "s" : ""}` : "";

        lines.push(`🏠 *${data.title}*`);
        lines.push("");
        lines.push(`${purposeLabel} — ${priceFormatted}`);
        lines.push(`📍 ${data.neighborhood || data.address || data.city || "Belo Horizonte"}, ${data.city || "MG"}`);
        const specs = [areaStr, beds, baths, garages].filter(Boolean);
        if (specs.length > 0) lines.push(specs.join(" | "));
        lines.push("");
        if (sortedImages.length > 0) {
          lines.push(`📷 Veja fotos: https://www.arrudaimobi.com.br/imovel/${data.id}`);
        }
        lines.push(`🔗 Mais detalhes: https://www.arrudaimobi.com.br/imovel/${data.id}`);
        lines.push("");
        lines.push("👉 Fale com um corretor para mais informações!");

        result = { message: lines.join("\n") };
        break;
      }

      case "list-agents": {
        const page = Math.max(1, Number(url.searchParams.get("page") || 1));
        const pageSize = Math.min(Math.max(1, Number(url.searchParams.get("pageSize") || 12)), 50);

        const { data: roles, error: rolesErr } = await supabase
          .from("user_roles")
          .select("user_id, role, tenant_id")
          .in("role", ["agent", "admin"]);
        if (rolesErr) throw rolesErr;

        const userIds = [...new Set(roles?.map(r => r.user_id) || [])];
        if (userIds.length === 0) { result = { data: [], total: 0, page, pageSize, totalPages: 0 }; break; }

        const { data: profiles, error: profErr, count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .in("user_id", userIds)
          .eq("show_on_public_page", true);
        if (profErr) throw profErr;

        const visibleCount = count || 0;

        const { data: visibleProfiles, error: visibleProfErr } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", userIds)
          .eq("show_on_public_page", true)
          .range((page - 1) * pageSize, page * pageSize - 1);
        if (visibleProfErr) throw visibleProfErr;

        const { data: propCounts } = await supabase
          .from("properties")
          .select("agent_id")
          .in("agent_id", userIds);

        const counts: Record<string, number> = {};
        propCounts?.forEach((p: any) => { counts[p.agent_id!] = (counts[p.agent_id!] || 0) + 1; });

        result = {
          data: visibleProfiles?.map(p => ({
            ...p,
            role: roles?.find(r => r.user_id === p.user_id)?.role || "user",
            properties_count: counts[p.user_id] || 0,
          })) || [],
          total: visibleCount,
          page,
          pageSize,
          totalPages: Math.ceil(visibleCount / pageSize),
        };
        break;
      }

      case "get-agent": {
        const userId = url.searchParams.get("userId");
        if (!userId) throw new Error("userId required");

        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (profErr) throw profErr;

        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        // Get email from auth.users
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);

        const { data: agentProps, error: propsErr } = await supabase
          .from("properties")
          .select(`
            *,
            property_types(id, name, icon),
            property_images(id, url, alt, display_order),
            property_amenities(amenity_id, amenities(id, name, icon))
          `)
          .eq("agent_id", userId)
          .eq("status", "available")
          .order("created_at", { ascending: false });
        if (propsErr) throw propsErr;

        result = {
          ...profile,
          email: authUser?.user?.email || null,
          role: role?.role || "user",
          properties: agentProps || [],
          properties_count: agentProps?.length || 0,
        };
        break;
      }

      case "list-property-types": {
        const { data, error } = await supabase
          .from("property_types")
          .select("*")
          .eq("active", true)
          .order("name");
        if (error) throw error;
        result = data;
        break;
      }

      case "stats": {
        const [props, agents, cities] = await Promise.all([
          supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "available"),
          supabase.from("user_roles").select("id", { count: "exact", head: true }).in("role", ["agent", "admin"]),
          supabase.from("properties").select("city").eq("status", "available"),
        ]);

        const uniqueCities = new Set(cities.data?.map((c: any) => c.city).filter(Boolean));

        result = {
          properties_count: props.count || 0,
          agents_count: agents.count || 0,
          cities_count: uniqueCities.size,
        };
        break;
      }

      case "list-cities": {
        const { data, error } = await supabase
          .from("properties")
          .select("city")
          .eq("status", "available")
          .not("city", "is", null);
        if (error) throw error;
        const unique = [...new Set((data || []).map((r: any) => r.city).filter(Boolean))].sort();
        result = unique;
        break;
      }

      case "get-default-tenant": {
        const { data, error } = await supabase
          .from("tenants")
          .select("id, name, slug")
          .eq("slug", "default")
          .maybeSingle();
        if (error) throw error;
        result = data;
        break;
      }

      case "get-tenant-settings": {
        const { data, error } = await supabase
          .from("tenants")
          .select("id, name, slug, settings")
          .eq("slug", "default")
          .maybeSingle();
        if (error) throw error;
        result = data;
        break;
      }
      
      case "get-manifest": {
        const slug = url.searchParams.get("slug") || "default";
        const { data, error } = await supabase
          .from("tenants")
          .select("name, settings")
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;
        
        const tenantName = data?.name || "Arruda Imobi";
        const settings = (data?.settings as any) || {};
        
        const manifest = {
          name: tenantName,
          short_name: settings.short_name || tenantName.split(" ")[0] || tenantName,
          description: settings.footer_description || "Gestão Imobiliária Profissional",
          start_url: "/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: settings.primary_color || "#003366",
          icons: [
            {
              src: settings.pwa_icon_192 || "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: settings.pwa_icon_512 || "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: settings.pwa_icon_512 || "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        };

        return new Response(JSON.stringify(manifest), {
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/manifest+json",
            "Cache-Control": "public, max-age=3600"
          },
        });
      }

      case "crm-admin-leads": {
        // Admin-only CRM leads read — uses service_role internally
        // Requires Authorization header with valid Supabase token
        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get authenticated user from token
        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace("Bearer ", "")
        );
        if (authError || !user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify admin role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!roleData || roleData.role !== "admin") {
          return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }


        // Fetch stages (not sensitive — just pipeline names)
        const { data: stages, error: stagesError } = await supabase
          .from("crm_pipeline_stages")
          .select("id, slug, name, sort_order, emoji, color, is_default, is_active")
          .eq("is_active", true)
          .order("sort_order");
        if (stagesError) throw stagesError;


        // Fetch leads for Arruda Imobi tenant
        const { data: leads, error: leadsError } = await supabase
          .from("crm_leads")
          .select("*")
          .eq("tenant_name", "Arruda Imobi")
          .order("updated_at", { ascending: false });
        if (leadsError) throw leadsError;

        const total = leads?.length ?? 0;
        const countsByStage: Record<string, number> = {};
        const leadsByStage: Record<string, any[]> = {};
        if (leads) {
          for (const lead of leads) {
            const slug = lead.stage_slug || "novos_leads_ia";
            if (!leadsByStage[slug]) { leadsByStage[slug] = []; countsByStage[slug] = 0; }
            leadsByStage[slug].push(lead);
            countsByStage[slug]++;
          }
        }

        result = { success: true, stages: stages || [], leads: leads || [], leadsByStage, countsByStage, total, source: "crm_leads", synced_at: new Date().toISOString() };
        break;
      }

      case "list-blog-posts": {
        const page = Math.max(1, Number(url.searchParams.get("page") || 1));
        const pageSize = Math.min(Math.max(1, Number(url.searchParams.get("pageSize") || 12)), 50);
        const tagFilter = url.searchParams.get("tag") || "";

        // If filtering by tag, get post IDs first
        let filteredPostIds: string[] | null = null;
        if (tagFilter) {
          const { data: tagData } = await supabase
            .from("blog_tags")
            .select("id")
            .eq("slug", tagFilter)
            .maybeSingle();
          if (tagData) {
            const { data: ptData } = await supabase
              .from("blog_post_tags")
              .select("post_id")
              .eq("tag_id", tagData.id);
            filteredPostIds = (ptData || []).map((r: any) => r.post_id);
          } else {
            filteredPostIds = [];
          }
        }

        let q = supabase
          .from("blog_posts")
          .select("id, title, slug, excerpt, cover_image_url, published_at, created_at, author_id", { count: "exact" })
          .eq("published", true)
          .order("published_at", { ascending: false, nullsFirst: false });

        if (filteredPostIds !== null) {
          if (filteredPostIds.length === 0) {
            result = { data: [], total: 0, page, pageSize };
            break;
          }
          q = q.in("id", filteredPostIds);
        }

        const { data, error, count } = await q.range((page - 1) * pageSize, page * pageSize - 1);
        if (error) throw error;

        // Enrich with author names
        const authorIds = [...new Set((data || []).map(p => p.author_id).filter(Boolean))];
        const authorMap: Record<string, any> = {};
        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", authorIds);
          profiles?.forEach((p: any) => { authorMap[p.user_id] = p; });
        }

        // Enrich with tags
        const postIds = (data || []).map(p => p.id);
        const tagMap: Record<string, any[]> = {};
        if (postIds.length > 0) {
          const { data: ptData } = await supabase
            .from("blog_post_tags")
            .select("post_id, blog_tags(id, name, slug)")
            .in("post_id", postIds);
          (ptData || []).forEach((pt: any) => {
            if (!tagMap[pt.post_id]) tagMap[pt.post_id] = [];
            if (pt.blog_tags) tagMap[pt.post_id].push(pt.blog_tags);
          });
        }

        const enriched = (data || []).map(post => ({
          ...post,
          author: post.author_id ? authorMap[post.author_id] || null : null,
          tags: tagMap[post.id] || [],
        }));

        result = { data: enriched, total: count || 0, page, pageSize };
        break;
      }

      case "list-blog-tags": {
        const { data, error } = await supabase
          .from("blog_tags")
          .select("id, name, slug, tenant_id")
          .order("name");
        if (error) throw error;
        result = data;
        break;
      }

      case "get-blog-post": {
        const slug = url.searchParams.get("slug");
        if (!slug) {
          return new Response(JSON.stringify({ error: "slug required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data, error } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("slug", slug)
          .eq("published", true)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          return new Response(JSON.stringify({ error: "Post não encontrado" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get author
        if (data.author_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .eq("user_id", data.author_id)
            .maybeSingle();
          (data as any).author = profile || null;
        }

        // Get tags
        const { data: ptData } = await supabase
          .from("blog_post_tags")
          .select("blog_tags(id, name, slug)")
          .eq("post_id", data.id);
        (data as any).tags = (ptData || []).map((pt: any) => pt.blog_tags).filter(Boolean);

        result = data;
        break;
      }

      case "crm-update-lead-stage": {
        // Admin-only: update lead stage in CRM with full audit trail
        // NO WhatsApp, NO ZPRO write, NO delete — stage move only
        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace("Bearer ", "")
        );
        if (authError || !user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify admin role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!roleData || roleData.role !== "admin") {
          return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Parse body
        let body: any;
        try {
          body = await req.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { leadId, stageSlug, reason, actor } = body;

        // Validate inputs
        if (!leadId) {
          return new Response(JSON.stringify({ error: "leadId is required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!stageSlug) {
          return new Response(JSON.stringify({ error: "stageSlug is required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify stage exists
        const { data: stage, error: stageError } = await supabase
          .from("crm_pipeline_stages")
          .select("id, slug, name")
          .eq("slug", stageSlug)
          .eq("is_active", true)
          .maybeSingle();

        if (stageError || !stage) {
          return new Response(JSON.stringify({ error: `Stage '${stageSlug}' not found or inactive` }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get current lead
        const { data: lead, error: leadError } = await supabase
          .from("crm_leads")
          .select("id, name, stage_slug, stage_name, tenant_name, source")
          .eq("id", leadId)
          .maybeSingle();

        if (leadError || !lead) {
          return new Response(JSON.stringify({ error: "Lead not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify tenant
        if (lead.tenant_name !== "Arruda Imobi") {
          return new Response(JSON.stringify({ error: "Forbidden — Arruda Imobi tenant only" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Block ZPRO leads (no write to ZPRO)
        if (lead.source === "zpro") {
          return new Response(JSON.stringify({ error: "ZPRO leads cannot be modified via this endpoint. Update directly in ZPRO." }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const oldStage = lead.stage_slug;
        const oldStageName = lead.stage_name;

        // No-op if same stage
        if (oldStage === stageSlug) {
          return new Response(JSON.stringify({
            ok: true,
            leadId,
            oldStage,
            newStage: stageSlug,
            eventId: null,
            note: "Lead already in this stage"
          }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update lead stage
        const { data: updatedLead, error: updateError } = await supabase
          .from("crm_leads")
          .update({
            stage_slug: stageSlug,
            kanban_slug: stageSlug,
            stage_name: stage.name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", leadId)
          .select("id, stage_slug, stage_name")
          .maybeSingle();

        if (updateError) {
          console.error("lead stage update error:", updateError);
          return new Response(JSON.stringify({ error: "Failed to update lead stage" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Insert audit event into crm_lead_events
        const eventPayload = {
          old_stage: oldStage,
          old_stage_name: oldStageName,
          new_stage: stageSlug,
          new_stage_name: stage.name,
          reason: reason || null,
          actor: actor || "admin",
          user_id: user.id,
          lead_name: lead.name,
          lead_phone: lead.phone,
        };

        const { data: event, error: eventError } = await supabase
          .from("crm_lead_events")
          .insert({
            lead_id: leadId,
            event_type: "stage_changed",
            payload: eventPayload,
            actor: actor || "admin",
          })
          .select("id")
          .maybeSingle();

        if (eventError) {
          console.error("crm_lead_events insert error:", eventError);
          // Stage was updated, event logging failed — log but still return success
        }

        result = {
          ok: true,
          leadId,
          oldStage,
          newStage: stageSlug,
          eventId: event?.id || null,
        };
        break;
      }


      // Block 6d: Check WhatsApp opt-in/opt-out status for a phone number
      case "check-whatsapp-opt": {
        const phone = url.searchParams.get("phone");
        if (!phone) throw new Error("phone required");

        const tenantSlug = url.searchParams.get("tenant") || "arruda-imobi";

        const { data: tenant } = await supabase
          .from("tenants")
          .select("id")
          .eq("slug", tenantSlug)
          .maybeSingle();

        const tenantId = tenant?.id || "00000000-0000-0000-0000-000000000000";

        const { data: optRecord, error: optError } = await supabase
          .from("whatsapp_opt_status")
          .select("opted_in, opted_in_at, opted_out_at, source")
          .eq("tenant_id", tenantId)
          .eq("phone", phone)
          .maybeSingle();

        if (optError) throw optError;

        if (!optRecord) {
          // No record = defaulted to opted-in
          result = { opted_in: true, status: "default", source: null };
        } else {
          result = {
            opted_in: optRecord.opted_in,
            opted_in_at: optRecord.opted_in_at,
            opted_out_at: optRecord.opted_out_at,
            source: optRecord.source,
            status: optRecord.opted_in ? "active" : "opted_out",
          };
        }
        break;
      }

      // Block 6d: Update WhatsApp opt-in/opt-out status (admin or self-service)
      case "update-whatsapp-opt": {
        const phone = url.searchParams.get("phone");
        const action = url.searchParams.get("action"); // "opt_in" | "opt_out"
        if (!phone) throw new Error("phone required");
        if (!action || !["opt_in", "opt_out"].includes(action)) {
          throw new Error("action must be 'opt_in' or 'opt_out'");
        }

        const tenantSlug = url.searchParams.get("tenant") || "arruda-imobi";

        const { data: tenant } = await supabase
          .from("tenants")
          .select("id")
          .eq("slug", tenantSlug)
          .maybeSingle();

        const tenantId = tenant?.id || "00000000-0000-0000-0000-000000000000";

        const optedIn = action === "opt_in";

        const { data: updated, error: updateError } = await supabase
          .from("whatsapp_opt_status")
          .upsert(
            {
              tenant_id: tenantId,
              phone,
              opted_in: optedIn,
              source: "api",
              opted_out_at: optedIn ? null : new Date().toISOString(),
            },
            { onConflict: "tenant_id,phone" }
          )
          .select("opted_in, opted_in_at, opted_out_at")
          .maybeSingle();

        if (updateError) throw updateError;

        result = {
          ok: true,
          phone,
          action,
          opted_in: updated?.opted_in ?? optedIn,
          opted_in_at: updated?.opted_in_at ?? null,
          opted_out_at: updated?.opted_out_at ?? null,
        };
        break;
      }
      
      case "generate-blog-post": {
        // POST body: { topic, category, tenant_id, author_id }
        let body: any = {};
        try { body = await req.json(); } catch { throw new Error("Invalid JSON body"); }
        const { topic, category, tenant_id, author_id } = body;
        if (!topic?.trim()) throw new Error("topic obrigatorio");
        if (!tenant_id?.trim()) throw new Error("tenant_id obrigatorio");

        const FIRECRAWL_KEY = "fc-992339325e7542fdb2348b03f2c63cb2";
        const OMNIROUTE_BASE = "http://206.183.129.200:20128/v1";
        const OMNIROUTE_KEY = "sk-611d5b3c2cca0507-7a32b3-0e17b59f";

        let context = "";
        try {
          const searchRes = await fetch("https://api.firecrawl.dev/v0/search", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${FIRECRAWL_KEY}` },
            body: JSON.stringify({ query: `${topic} Brasil 2026 mercado inmobiliario`, limit: 2, source: "web" }),
          });
          if (searchRes.ok) {
            const json = await searchRes.json();
            for (const page of (json.data || []).slice(0, 2)) {
              if (page.markdown) context += page.markdown.slice(0, 3000) + "\n\n";
            }
          }
        } catch (e) { console.log("Firecrawl error:", e); }
        context = context.slice(0, 6000);

        const systemPrompt = "Voce e um redator especializado em blog inmobiliario brasileiro. Crie artigos em Portugues do Brasil. Use HTML tags: <h2>, <p>, <ul>, <li>, <strong>. Minimo 600 palavras. Titulo ate 65 caracteres. Excerpt 160-200 caracteres. Tags: Financiamento, Investimento Imobiliario, Mercado Imobiliario 2026, Oportunidades de Mercado, Renda com Aluguel, Valorizacao de Imoveis, Dicas para Compradores, Documentacao Imobiliaria.";
        const userPrompt = `Topico: "${topic}"
Categoria: ${category || "Mercado Imobiliario 2026"}
${context ? `Contexto:
${context}
` : ""}
Retorne APENAS JSON valido (sem texto antes ou depois):
{
  "title": "titulo ate 65 caracteres",
  "slug": "url-amigavel",
  "excerpt": "resumo de 160-200 caracteres",
  "content": "<artigo em HTML>",
  "tags": ["tag1","tag2","tag3"]
}`;

        let text = "";
        try {
          const aiRes = await fetch(`${OMNIROUTE_BASE}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OMNIROUTE_KEY}` },
            body: JSON.stringify({ model: "minimax/MiniMax-M2.7", stream: false, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], max_tokens: 4096, temperature: 0.7 }),
          });
          if (aiRes.ok) {
            const json = await aiRes.json();
            text = json.choices?.[0]?.message?.content || "";
          } else {
            const errText = await aiRes.text();
            console.log("OmniRoute non-ok:", aiRes.status, errText.slice(0, 200));
          }
        } catch (e) { console.log("OmniRoute error:", e); }

        let parsed: any = null;
        try { const match = text.match(/\{[\s\S]*\}/); if (match) parsed = JSON.parse(match[0]); } catch {}
        if (!parsed || !parsed.title) throw new Error("IA nao retornou conteudo valido");

        const slug = parsed.slug || parsed.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
        const { data: newPost, error: insertErr } = await supabase.from("blog_posts").insert({ tenant_id: tenant_id, author_id: author_id || "00000000-0000-0000-0000-000000000000", title: parsed.title, slug, excerpt: parsed.excerpt, content: parsed.content, cover_image_url: parsed.cover_image_url || null, published: false, published_at: null }).select("id").single();
        if (insertErr) throw new Error(`Erro ao salvar post: ${insertErr.message}`);

        if (parsed.tags?.length) {
          for (const tagName of parsed.tags) {
            const tagSlug = tagName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
            const { data: existingTag } = await supabase.from("blog_tags").select("id").eq("tenant_id", tenant_id).eq("slug", tagSlug).maybeSingle();
            let tagId = existingTag?.id;
            if (!tagId) { const { data: newTag } = await supabase.from("blog_tags").insert({ name: tagName, slug: tagSlug, tenant_id }).select("id").single(); tagId = newTag?.id; }
            if (tagId) {
              try { await supabase.from("blog_post_tags").insert({ blog_post_id: newPost.id, blog_tag_id: tagId }); } catch {}
            }
          }
        }

        result = { ok: true, data: { id: newPost.id, title: parsed.title, slug, excerpt: parsed.excerpt, content: parsed.content, cover_image_url: parsed.cover_image_url || null, tags: parsed.tags || [] } };
        break;
      }


      case "generate-blog-cover": {
        // POST body: { topic }
        let body: any = {};
        try { body = await req.json(); } catch { throw new Error("Invalid JSON body"); }
        const { topic } = body;
        if (!topic?.trim()) throw new Error("topic obrigatorio");

        const OMNI_KEY = "sk-611d5b3c2cca0507-7a32b3-0e17b59f";
        const OMNI_BASE = "http://206.183.129.200:20128";

        let coverDataUrl: string | null = null;
        let genError: string | null = null;

        try {
          const genRes = await fetch(`${OMNI_BASE}/v1/images/generations`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OMNI_KEY}` },
            body: JSON.stringify({
              model: "antigravity/gemini-3.1-flash-image",
              prompt: `Professional real estate photo for blog cover: ${topic}. Modern building, clean facade, high quality, Brazil real estate. No text, no people, no watermark.`,
              size: "1:1",
              n: 1,
            }),
          });

          if (!genRes.ok) {
            const errText = await genRes.text();
            genError = `OmniRoute error ${genRes.status}: ${errText.slice(0, 200)}`;
          } else {
            const genJson = await genRes.json();
            const b64 = genJson?.data?.[0]?.b64_json;
            if (b64) {
              coverDataUrl = `data:image/png;base64,${b64}`;
            } else {
              genError = "No image data in OmniRoute response";
            }
          }
        } catch (e: any) {
          genError = e.message;
          console.log("generate-blog-cover error:", e);
        }

        result = { ok: true, data: { cover_data_url: coverDataUrl, gen_error: genError } };
        break;
      }

      case "generate-content": {
        // FAST VERSION: ultra-short prompts (<400 chars) = ~3-5s per generation
        // Pipeline: generate content + Pollinations AI image URL (no vision, no improve step)
        let body: any = {};
        try { body = await req.json(); } catch { throw new Error("Invalid JSON body"); }
        const { prompt, content_types, tenant_id, author_id, property_id, property_images } = body;
        if (!prompt?.trim()) throw new Error("prompt obrigatorio");
        if (!tenant_id?.trim()) throw new Error("tenant_id obrigatorio");

        const OMNI_KEY = "sk-611d5b3c2cca0507-7a32b3-0e17b59f";
        const OMNI_BASE = "http://206.183.129.200:20128/v1";

        const results: any[] = [];

        for (const contentType of (content_types || [])) {
          try {
            let genImage = false;
            let imagePrompt = "";
            let aspectRatio = "1:1";
            let contentSystem = "";
            let contentUser = "";

            if (contentType === "post") {
              // Ultra-short: blog post with plain text (no HTML = 10x faster)
              contentSystem = "Redator imobiliário premium. Crie artigo curto (200-300 palavras) vendendo este imóvel por emoção. Responda JSON:\n{\"title\":\"título 50-60 chars emotivo\",\"excerpt\":\"resumo 150-180 chars\",\"content\":\"texto do artigo em parágrafos simples\",\"tags\":[\"tag1\",\"tag2\",\"tag3\",\"tag4\"]}";
              contentUser = `Imovel: ${prompt}\n${property_images?.length ? "Fotos: " + property_images[0] : ""}`;
              genImage = true;
              imagePrompt = `Luxurious Brazilian farmhouse with pool at sunset, golden hour, tropical garden, professional real estate photography, warm vibrant colors`;
              aspectRatio = "16:9";

            } else if (contentType === "story") {
              contentSystem = "Crie carrossel Instagram de 8 slides para imóvel. Responda JSON:\n{\"title\":\"título\",\"slides\":[{\"heading\":\"h\",\"body\":\"t\"}],\"captions\":[\"legenda\"],\"hashtags\":[\"t1\",\"t2\",\"t3\"]}";
              contentUser = `Imovel: ${prompt}`;
              genImage = true;
              imagePrompt = `Modern luxury Brazilian farmhouse, pool, green garden, golden hour, professional photography, lifestyle aspirational`;
              aspectRatio = "9:16";

            } else if (contentType === "reel") {
              contentSystem = "Crie roteiro Reel 30-60s para imóvel. Responda JSON:\n{\"title\":\"título\",\"script\":\"roteiro timed cues\",\"captions\":[\"c1||c2\"],\"hashtags\":[\"t1\",\"t2\"]}";
              contentUser = `Imovel: ${prompt}`;

            } else if (contentType === "youtube_thumb") {
              contentSystem = "Crie thumbnail YouTube para imóvel. Responda JSON:\n{\"title\":\"título\",\"text\":\"texto CAPS 5-8 palavras\",\"prompt\":\"english prompt for Pollinations AI\",\"hashtags\":[\"t1\",\"t2\"]}";
              contentUser = `Imovel: ${prompt}`;
              genImage = true;
              imagePrompt = `YouTube thumbnail: Brazilian luxury farm at sunset, bold text overlay, cinematic dramatic lighting, high contrast, clickbait style real estate`;
              aspectRatio = "16:9";

            } else if (contentType === "youtube_cover") {
              contentSystem = "Crie banner canal YouTube. Responda JSON:\n{\"title\":\"título\",\"text\":\"texto\",\"prompt\":\"english for Pollinations AI 2560x1440\",\"hashtags\":[\"t1\",\"t2\"]}";
              contentUser = `Imovel: ${prompt}`;
              genImage = true;
              imagePrompt = `Professional YouTube banner: Brazilian real estate brand, modern farmhouse, aerial view, cinematic golden hour lighting`;
              aspectRatio = "16:9";

            } else if (contentType === "property_card") {
              contentSystem = "Crie copy para card imóvel. Responda JSON:\n{\"title\":\"headline\",\"text\":\"body 100 chars\",\"captions\":[\"o1\",\"o2\",\"o3\"],\"hashtags\":[\"t1\",\"t2\",\"t3\",\"t4\"]}";
              contentUser = `Imovel: ${prompt}`;
              genImage = true;
              imagePrompt = `Elegant real estate card, luxury farmhouse pool sunset, clean modern design, warm tones, professional photography`;
              aspectRatio = "1:1";
            }

            // Generate with MiniMax-M2.7
            let text = "";
            try {
              const aiRes = await fetch(`${OMNI_BASE}/chat/completions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OMNI_KEY}` },
                body: JSON.stringify({
                  model: "MiniMax-M2.7",
                  stream: false,
                  messages: [
                    { role: "system", content: contentSystem },
                    { role: "user", content: contentUser }
                  ],
                  max_tokens: 2048,
                  temperature: 0.72,
                }),
              });
              if (aiRes.ok) {
                const json = await aiRes.json();
                text = json.choices?.[0]?.message?.content || "";
              }
            } catch (e) { console.log("MiniMax error:", e.message); }

            let parsed: any = null;
            try { const match = text.match(/\{[\s\S]*\}/); if (match) parsed = JSON.parse(match[0]); } catch {}

            if (!parsed) {
              results.push({ type: contentType, text: text || "Conteúdo gerado", title: prompt.slice(0, 60) });
              continue;
            }

            // Build result
            const result: any = { type: contentType, prompt: parsed.prompt || imagePrompt };
            if (parsed.title) result.title = parsed.title;
            if (parsed.slug) result.slug = parsed.slug;
            if (parsed.excerpt) result.text = parsed.excerpt;
            if (parsed.content) result.content = parsed.content;
            if (parsed.slides) result.slides = parsed.slides;
            if (parsed.text) result.text = Array.isArray(parsed.text) ? parsed.text.join("\n\n") : parsed.text;
            if (parsed.script) result.script = parsed.script;
            if (parsed.captions) result.captions = parsed.captions;
            if (parsed.hashtags) result.hashtags = parsed.hashtags;

            // Pollinations AI image URL (free, fast)
            if (genImage && imagePrompt) {
              const ep = encodeURIComponent(imagePrompt.slice(0, 800));
              const seed = Date.now();
              let w = 1024, h = 1024;
              if (aspectRatio === "9:16") { w = 768; h = 1368; }
              else if (aspectRatio === "16:9") { w = 1280; h = 720; }
              result.imageUrl = `https://image.pollinations.ai/prompt/${ep}?width=${w}&height=${h}&nologo=true&seed=${seed}`;
            }

            results.push(result);

          } catch (e) {
            results.push({ type: contentType, text: `Erro: ${e.message}` });
          }
        }

        result = { ok: true, data: { results } };
        break;
      }


      case "generate-content-image": {
        // Uses Pollininations AI directly — free, no key needed
        // Returns a public URL that the browser can load and the frontend can composite with logo
        let body: any = {};
        try { body = await req.json(); } catch { throw new Error("Invalid JSON body"); }
        const { prompt, type } = body;
        if (!prompt?.trim()) throw new Error("prompt obrigatorio");

        // Size mapping: content type → Pollinations AI dimensions
        let width = 1024, height = 1024;
        if (type === "story" || type === "reel") {
          width = 768; height = 1368; // 9:16 vertical
        } else if (type === "youtube_thumb" || type === "youtube_cover") {
          width = 1280; height = 720; // 16:9 landscape
        }

        // Build Pollinations AI URL (public, no auth needed)
        const encodedPrompt = encodeURIComponent(
          prompt.slice(0, 800) + (prompt.length > 800 ? "..." : "")
        );
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}`;

        // Return URL immediately (browser can load this directly)
        result = {
          ok: true,
          data: {
            image_url: pollinationsUrl,
            image_pollinations_url: pollinationsUrl,
            width,
            height,
            error: null,
          },
        };
        break;
      }

      case "generate-img2img": {
        // img2img: reference image + prompt → modified image
        // Body: { imageUrl, prompt, strength?, width?, height? }
        // Strategy: 1. Fal.ai direct (flux.2 pro)  2. OmniRoute gemini  3. Pollinations txt2img fallback
        let body: any = {};
        try { body = await req.json(); } catch { throw new Error("Invalid JSON body"); }
        const { imageUrl, prompt, strength = 0.75, width, height } = body;
        if (!imageUrl?.trim()) throw new Error("imageUrl obrigatorio para img2img");
        if (!prompt?.trim()) throw new Error("prompt obrigatorio");

        const OMNI_KEY = "sk-611d5b3c2cca0507-7a32b3-0e17b59f";
        const OMNI_BASE = "http://206.183.129.200:20128";
        // Fal.ai key (UUID:secret format)
        const FAL_KEY = "01e526b0-83df-4f5d-b629-c0a49e6fb3e6:e202d1a87e9ea4aef7bf8f31c587ceb9";

        let imageUrlResult: string | null = null;
        let genError: string | null = null;

        const fallbackTxt2Img = (prompt: string) => {
          const enc = encodeURIComponent(prompt.slice(0, 800));
          return `https://image.pollinations.ai/prompt/${enc}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
        };

        const fetchImageAsBlob = async (url: string): Promise<Blob> => {
          if (url.startsWith("data:")) {
            const mimeMatch = url.match(/^data:([^;]+);base64,/);
            const mime = mimeMatch ? mimeMatch[1] : "image/png";
            const b64 = url.includes(",") ? url.split(",")[1] : url;
            const binary = atob(b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return new Blob([bytes], { type: mime });
          } else {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
            return res.blob();
          }
        };

        try {
          const imageBlob = await fetchImageAsBlob(imageUrl);

          // ── 1. Try Fal.ai direct with FLUX.2 ─────────────────────────────────
          try {
            const falForm = new FormData();
            falForm.append("model", "fal-ai/flux-2-pro/image-to-image");
            falForm.append("image", imageBlob, "reference.png");
            falForm.append("prompt", prompt.slice(0, 1000));
            falForm.append("image_size", "1:1");
            falForm.append("num_images", "1");

            const falRes = await fetch("https://image.fal.ai", {
              method: "POST",
              headers: { "Authorization": `Bearer ${FAL_KEY}` },
              body: falForm,
            });

            if (falRes.ok) {
              const falJson = await falRes.json();
              imageUrlResult = falJson?.images?.[0]?.url || falJson?.url || null;
              if (imageUrlResult) {
                genError = null; // success
                console.log("generate-img2img: Fal.ai success");
              }
            } else {
              const errText = await falRes.text();
              console.log("generate-img2img: Fal.ai error", falRes.status, errText.slice(0, 200));
            }
          } catch (falErr: any) {
            console.log("generate-img2img: Fal.ai exception", falErr.message);
          }

          // ── 2. Fallback: OmniRoute gemini img2img ───────────────────────────
          if (!imageUrlResult) {
            const genRes = await fetch(`${OMNI_BASE}/v1/images/generations`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OMNI_KEY}` },
              body: JSON.stringify({
                model: "antigravity/gemini-3.1-flash-image",
                prompt: `Reference image modification: ${prompt.slice(0, 900)}`,
                image_url: imageUrl,
                strength: Math.max(0.1, Math.min(0.95, strength)),
              }),
            });

            if (genRes.ok) {
              const genJson = await genRes.json();
              imageUrlResult =
                genJson?.data?.[0]?.url ||
                genJson?.images?.[0]?.url ||
                genJson?.url ||
                null;
              if (imageUrlResult) {
                genError = null;
              } else {
                const b64 = genJson?.data?.[0]?.b64_json || genJson?.b64_json;
                if (b64) { imageUrlResult = `data:image/png;base64,${b64}`; genError = null; }
              }
            } else {
              console.log("generate-img2img: OmniRoute img2img error", genRes.status);
            }
          }

          // ── 3. Last resort: Pollinations txt2img ───────────────────────────
          if (!imageUrlResult) {
            imageUrlResult = fallbackTxt2Img(prompt);
            genError = "img2img failed — used txt2img Pollinations fallback.";
          }
        } catch (e: any) {
          imageUrlResult = fallbackTxt2Img(prompt);
          genError = `Exception: ${e.message}. Used txt2img Pollinations fallback.`;
        }

        result = { ok: true, data: { image_url: imageUrlResult, error: genError } };
        break;
      }
        break;
      }


      default:
        return new Response(JSON.stringify({ error: "unknown action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("public-api error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

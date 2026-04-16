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
        let authorMap: Record<string, any> = {};
        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", authorIds);
          profiles?.forEach((p: any) => { authorMap[p.user_id] = p; });
        }

        // Enrich with tags
        const postIds = (data || []).map(p => p.id);
        let tagMap: Record<string, any[]> = {};
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "https://arrudaimobi.com.br",
  "https://www.arrudaimobi.com.br",
  "https://arrudaimobi.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
];

const getCorsHeaders = (origin: string | null) => {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };

  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost") || origin.includes("127.0.0.1"))) {
    return { ...headers, "Access-Control-Allow-Origin": origin };
  }

  return { ...headers, "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
};

type ZproAction =
  | "listChannels"
  | "ticketStats"
  | "listTickets"
  | "listKanban"
  | "contactsSearch"
  | "listUsers"
  | "createContact"
  | "probe";

interface ZproProxyBody {
  action?: ZproAction;
  params?: Record<string, unknown>;
}

interface ZproRoute {
  method: "GET" | "POST";
  path: string;
  public: boolean;
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

const getEnv = () => {
  const baseUrl = Deno.env.get("ZPRO_API_BASE_URL") || Deno.env.get("ZPRO_BASE_URL");
  const token = Deno.env.get("ZPRO_API_TOKEN");

  if (!baseUrl || !token) {
    throw new Error("Missing ZPRO server-side configuration");
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    token,
  };
};

const requireAuthForPrivateRoute = async (req: Request, route: ZproRoute) => {
  if (route.public) return null;

  const auth = req.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return "authorization bearer token required";
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return "Missing Supabase auth configuration";
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return "valid authenticated user required";
  }

  return null;
};

const safeString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const safeNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const routeFor = (action: ZproAction, params: Record<string, unknown> = {}): ZproRoute => {
  switch (action) {
    case "listChannels":
      return { method: "GET", path: "/listChannels", public: false };
    case "ticketStats":
      return { method: "GET", path: "/dash/ticketsStatus", public: false };
    case "listKanban":
      return { method: "GET", path: "/listKanban", public: false };
    case "listUsers":
      return { method: "GET", path: "/listUsers", public: false };
    case "listTickets": {
      const query = new URLSearchParams();
      const status = safeString(params.status);
      const pageNumber = safeNumber(params.pageNumber);
      if (["open", "pending", "closed"].includes(status)) query.set("status", status);
      if (pageNumber) query.set("pageNumber", String(pageNumber));
      const suffix = query.toString() ? `?${query}` : "";
      return { method: "GET", path: `/listTickets${suffix}`, public: false };
    }
    case "contactsSearch":
      return { method: "POST", path: "/contacts/search", public: false };
    case "createContact":
      // CRM write is private until a rate-limited public lead endpoint is explicitly approved.
      return { method: "POST", path: "/createContact", public: false };
    case "probe":
      // Public sanitized probe: confirms proxy + upstream auth without exposing CRM data.
      return { method: "GET", path: "/listChannels", public: true };
    default:
      throw new Error("Unsupported ZPRO action");
  }
};

const buildBody = (action: ZproAction, params: Record<string, unknown> = {}) => {
  if (action === "contactsSearch") {
    return JSON.stringify({
      query: safeString(params.query),
      limit: safeNumber(params.limit) ?? 20,
    });
  }

  if (action === "createContact") {
    return JSON.stringify({
      name: safeString(params.name).slice(0, 120),
      number: safeString(params.phone || params.number).replace(/\D/g, ""),
      email: safeString(params.email).slice(0, 180),
      extraInfo: {
        fonte: safeString(params.source, "site_arruda"),
        imovel: safeString(params.propertyTitle).slice(0, 180),
        mensagem: safeString(params.message).slice(0, 1000),
      },
    });
  }

  return undefined;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "POST required" }, 405, corsHeaders);
  }

  try {
    const body = (await req.json()) as ZproProxyBody;
    const action = body.action;
    const params = body.params ?? {};

    if (!action) {
      return json({ error: "action required" }, 400, corsHeaders);
    }

    const route = routeFor(action, params);
    const authError = await requireAuthForPrivateRoute(req, route);
    if (authError) {
      return json({ error: authError }, 401, corsHeaders);
    }

    const { baseUrl, token } = getEnv();
    const upstream = await fetch(`${baseUrl}${route.path}`, {
      method: route.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: route.method === "POST" ? buildBody(action, params) : undefined,
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";

    if (action === "probe") {
      return json({ ok: upstream.ok, upstreamStatus: upstream.status }, upstream.ok ? 200 : 502, {
        ...corsHeaders,
        "Cache-Control": "no-store",
      });
    }

    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected ZPRO proxy error";
    const safeMessage = message.includes("ZPRO") || message.includes("Missing") || message.includes("Unsupported")
      ? message
      : "ZPRO proxy error";
    return json({ error: safeMessage }, 500, corsHeaders);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
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

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case "\"": return "&quot;";
      default: return c;
    }
  });
}

function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id");
    const portalId = url.searchParams.get("portal_id");

    if (!tenantId || !portalId) {
      return new Response("Missing parameters (tenant_id, portal_id)", { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Fetch publishable properties for this portal
    const { data: properties, error } = await supabase.rpc('get_portal_xml_data', {
      p_tenant_id: tenantId,
      p_portal_id: portalId
    });

    if (error) {
      console.error("Query error:", error);
      return new Response("Database error", { status: 500 });
    }

    // 2. Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFull>
  <Header>
    <Provider>Arruda Imobi</Provider>
    <Email>contato@arrudaimobi.com.br</Email>
  </Header>
  <Listings>`;

    for (const p of (properties || [])) {
      const transactionType = p.purpose === "sale" ? "For Sale" : "For Rent";
      const viewUrl = `https://www.arrudaimobi.com.br/imoveis/${p.property_code || p.id}`;
      
      xml += `
    <Listing>
      <ListingID>${escapeXml(p.property_code || p.id)}</ListingID>
      <Title>${escapeXml(p.title)}</Title>
      <TransactionType>${transactionType}</TransactionType>
      <DetailViewUrl>${escapeXml(viewUrl)}</DetailViewUrl>
      <Media>`;
      
      if (p.images && Array.isArray(p.images)) {
        p.images.forEach((img: any) => {
          xml += `
        <Item medium="image" caption="${escapeXml(img.alt || p.title)}">${escapeXml(img.url)}</Item>`;
        });
      }

      xml += `
      </Media>
      <Details>
        <PropertyType>${escapeXml(p.property_type_name)}</PropertyType>
        <Description>${escapeXml(p.description)}</Description>
        <ListPrice currency="BRL">${p.price}</ListPrice>
        <LivingArea unit="square metres">${p.area || 0}</LivingArea>
        <Bedrooms>${p.bedrooms || 0}</Bedrooms>
        <Bathrooms>${p.bathrooms || 0}</Bathrooms>
        <Suites>${p.suites || 0}</Suites>
        <Garage type="Parking Space">${p.garages || 0}</Garage>
        <Features>`;
      
      if (p.amenities && Array.isArray(p.amenities)) {
        p.amenities.forEach((amenity: string) => {
          xml += `
          <Feature>${escapeXml(amenity)}</Feature>`;
        });
      }

      xml += `
        </Features>
      </Details>
      <Location>
        <Country abbreviation="BR">Brasil</Country>
        <State abbreviation="${escapeXml(p.state)}">${escapeXml(p.state)}</State>
        <City>${escapeXml(p.city)}</City>
        <Neighborhood>${escapeXml(p.neighborhood)}</Neighborhood>
        <Address>${escapeXml(p.address)}, ${escapeXml(p.number || "")}</Address>
        <PostalCode>${escapeXml(p.zip_code)}</PostalCode>
      </Location>
    </Listing>`;
    }

    xml += `
  </Listings>
</ListingDataFull>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
        ...corsHeaders,
      },
    });
  } catch (err: any) {
    return new Response(err.message, { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }
});

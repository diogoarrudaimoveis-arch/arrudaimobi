/**
 * N8N Workflow Templates for Arruda Imobi
 * Block 5b: Create N8N workflow templates for import into N8N
 * Each template is a self-contained JSON workflow definition
 */

import type { N8NWorkflow } from "./client";

/** N8N workflow JSON template for Lead → ZPRO → WhatsApp */
export const WORKFLOW_TEMPLATE_LEAD_ZPRO_WHATSAPP = {
  name: "Lead → ZPRO → WhatsApp | Arruda Imobi",
  nodes: [
    {
      id: "webhook-lead",
      type: "n8n-nodes-base.webhook",
      parameters: {
        path: "arruda-lead-capture",
        httpMethod: "POST",
        responseMode: "responseNode",
        respondWith: "json",
        respondOptions: {
          responseData: "allEntries",
        },
      },
      name: "Webhook Lead Capturado",
      typeVersion: 1.2,
    },
    {
      id: "set-lead-data",
      type: "n8n-nodes-base.set",
      parameters: {
        mode: "manual",
        duplicateItem: false,
        assignments: {
          assignments: [
            { name: "name", value: "={{ $json.body.data.name }}" },
            { name: "phone", value: "={{ $json.body.data.phone }}" },
            { name: "email", value: "={{ $json.body.data.email }}" },
            { name: "source", value: "={{ $json.body.data.source }}" },
            { name: "propertyId", value: "={{ $json.body.data.property_id }}" },
            { name: "propertyTitle", value: "={{ $json.body.data.property_title }}" },
            { name: "message", value: "={{ $json.body.data.message }}" },
            { name: "channel", value: "={{ $json.body.data.channel }}" },
            { name: "timestamp", value: "={{ $json.body.timestamp }}" },
          ],
        },
        includeOtherFields: false,
        options: {},
      },
      name: "Extrair Dados do Lead",
    },
    {
      id: "http-zpro-send",
      type: "n8n-nodes-base.httpRequest",
      parameters: {
        method: "POST",
        url: "https://conv.techatende.com.br/v2/api/external/8de34e32-1154-4479-8cc6-678456e1d741",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Authorization", value: "Bearer {{ $env.ZPRO_API_TOKEN }}" },
            { name: "Content-Type", value: "application/json" },
          ],
        },
        sendBody: true,
        bodyParameters: {
          parameters: [
            {
              name: "phone",
              value: "={{ $json.phone }}",
            },
            {
              name: "message",
              value:
                "={{ $json.name }}, obrigado pelo interesse! Seu contato foi recebido. Nossa equipe entrará em contato em breve. 🏠",
            },
            {
              name: "contactName",
              value: "={{ $json.name }}",
            },
          ],
        },
        options: {},
      },
      name: "Enviar WhatsApp via ZPRO",
    },
    {
      id: "slack-alert",
      type: "n8n-nodes-base.slack",
      parameters: {
        channel: "#imobi-leads",
        text: "=Novo lead recebido via site:\n• Nome: {{ $json.name }}\n• Telefone: {{ $json.phone }}\n• Imóvel: {{ $json.propertyTitle || 'Geral' }}",
        options: {},
      },
      name: "Alertar no Slack",
      disabled: true,
    },
  ],
  connections: {
    "Webhook Lead Capturado": {
      main: [
        [{ node: "Extrair Dados do Lead", type: "main", index: 0 }],
      ],
    },
    "Extrair Dados do Lead": {
      main: [
        [{ node: "Enviar WhatsApp via ZPRO", type: "main", index: 0 }],
      ],
    },
    "Enviar WhatsApp via ZPRO": {
      main: [
        [{ node: "Alertar no Slack", type: "main", index: 0 }],
      ],
    },
  },
  settings: {
    executionOrder: "v1",
  },
  staticId: "wf-lead-zpro-whatsapp",
  tags: ["arruda-imobi", "lead", "whatsapp", "zpro"],
};

/** N8N workflow JSON template for Visit Reminder */
export const WORKFLOW_TEMPLATE_VISIT_REMINDER = {
  name: "Agendamento de Visita → Lembrete | Arruda Imobi",
  nodes: [
    {
      id: "schedule-visit-check",
      type: "n8n-nodes-base.schedule",
      parameters: {
        rule: {
          interval: [{ field: "minutes", "interval-value": 15 }],
        },
        timeZone: "America/Sao_Paulo",
      },
      name: "Verificar Visitas a Cada 15min",
      typeVersion: 1.2,
    },
    {
      id: "http-get-visits",
      type: "n8n-nodes-base.httpRequest",
      parameters: {
        method: "GET",
        url: "https://{{ $env.SUPABASE_PROJECT_ID }}.supabase.co/rest/v1/agenda?visita_agendada=eq.true&select=*",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "apikey", value: "={{ $env.SUPABASE_ANON_KEY }}" },
            { name: "Authorization", value: "Bearer {{ $env.SUPABASE_SERVICE_KEY }}" },
          ],
        },
        options: {},
      },
      name: "Buscar Visitas Agendadas",
    },
    {
      id: "filter-upcoming",
      type: "n8n-nodes-base.filter",
      parameters: {
        value: "={{ $json.data_hora_visita }}",
        operation: "CONTAINS",
        confirm: false,
        options: {},
      },
      name: "Filtrar Visitas nas Próximas 2h",
    },
    {
      id: "http-zpro-reminder",
      type: "n8n-nodes-base.httpRequest",
      parameters: {
        method: "POST",
        url: "https://conv.techatende.com.br/v2/api/external/8de34e32-1154-4479-8cc6-678456e1d741",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Authorization", value: "Bearer {{ $env.ZPRO_API_TOKEN }}" },
            { name: "Content-Type", value: "application/json" },
          ],
        },
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: "phone", value: "={{ $json.telefone_lead }}" },
            {
              name: "message",
              value:
                "=Lembrete: Você tem uma visita agendada em breve!\n📍 {{ $json.endereco_imovel }}\n🕐 {{ $json.data_hora_visita }}\n\nAguarde seu corretor em breve.",
            },
            { name: "contactName", value: "={{ $json.nome_lead }}" },
          ],
        },
        options: {},
      },
      name: "Enviar Lembrete via ZPRO",
    },
  ],
  connections: {
    "Verificar Visitas a Cada 15min": {
      main: [[{ node: "Buscar Visitas Agendadas", type: "main", index: 0 }]],
    },
    "Buscar Visitas Agendadas": {
      main: [[{ node: "Filtrar Visitas nas Próximas 2h", type: "main", index: 0 }]],
    },
    "Filtrar Visitas nas Próximas 2h": {
      main: [[{ node: "Enviar Lembrete via ZPRO", type: "main", index: 0 }]],
    },
  },
  settings: {
    executionOrder: "v1",
  },
  staticId: "wf-visit-reminder",
  tags: ["arruda-imobi", "visita", "lembrete", "zpro"],
};

/** N8N workflow JSON template for Follow-up 24h */
export const WORKFLOW_TEMPLATE_FOLLOWUP_24H = {
  name: "Follow-up 24h | Arruda Imobi",
  nodes: [
    {
      id: "schedule-followup",
      type: "n8n-nodes-base.schedule",
      parameters: {
        rule: {
          interval: [{ field: "hours", "interval-value": 6 }],
        },
        timeZone: "America/Sao_Paulo",
      },
      name: "Verificar a Cada 6h",
      typeVersion: 1.2,
    },
    {
      id: "http-get-unanswered-leads",
      type: "n8n-nodes-base.httpRequest",
      parameters: {
        method: "GET",
        url:
          "https://{{ $env.SUPABASE_PROJECT_ID }}.supabase.co/rest/v1/leads?respondido=eq.false&captured_at=lt.{{ $json.now }}&select=*",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "apikey", value: "={{ $env.SUPABASE_ANON_KEY }}" },
            { name: "Authorization", value: "Bearer {{ $env.SUPABASE_SERVICE_KEY }}" },
          ],
        },
        options: {},
      },
      name: "Buscar Leads Sem Resposta",
    },
    {
      id: "if-old-lead",
      type: "n8n-nodes-base.if",
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
          },
          conditions: [
            {
              id: "condition-days",
              leftValue: "={{ $json.dias_sem_resposta }}",
              rightValue: 1,
              operator: {
                type: "number",
                operation: ">=",
              },
            },
          ],
          combinator: "and",
        },
        options: {},
      },
      name: "Se > 1 dia sem resposta",
    },
    {
      id: "http-zpro-followup",
      type: "n8n-nodes-base.httpRequest",
      parameters: {
        method: "POST",
        url: "https://conv.techatende.com.br/v2/api/external/8de34e32-1154-4479-8cc6-678456e1d741",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Authorization", value: "Bearer {{ $env.ZPRO_API_TOKEN }}" },
            { name: "Content-Type", value: "application/json" },
          ],
        },
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: "phone", value: "={{ $json.phone }}" },
            {
              name: "message",
              value:
                "=Olá {{ $json.name }}, tudo bem?\n\nEstamos passando para saber se você tem alguma dúvida sobre o imóvel que chamou sua atenção. Ficamos à disposição! 🏠",
            },
            { name: "contactName", value: "={{ $json.name }}" },
          ],
        },
        options: {},
      },
      name: "Enviar Follow-up via ZPRO",
    },
    {
      id: "update-lead-followed",
      type: "n8n-nodes-base.httpRequest",
      parameters: {
        method: "PATCH",
        url: "https://{{ $env.SUPABASE_PROJECT_ID }}.supabase.co/rest/v1/leads?id=eq.{{ $json.id }}",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "apikey", value: "={{ $env.SUPABASE_ANON_KEY }}" },
            { name: "Authorization", value: "Bearer {{ $env.SUPABASE_SERVICE_KEY }}" },
            { name: "Prefer", value: "return=minimal" },
          ],
        },
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: "follow_up_sent_at", value: "={{ $now }}" },
            { name: "respondido", value: true },
          ],
        },
        options: {},
      },
      name: "Marcar Follow-up Enviado",
    },
  ],
  connections: {
    "Verificar a Cada 6h": {
      main: [[{ node: "Buscar Leads Sem Resposta", type: "main", index: 0 }]],
    },
    "Buscar Leads Sem Resposta": {
      main: [[{ node: "Se > 1 dia sem resposta", type: "main", index: 0 }]],
    },
    "Se > 1 dia sem resposta": {
      main: [
        [{ node: "Enviar Follow-up via ZPRO", type: "main", index: 0 }],
      ],
    },
    "Enviar Follow-up via ZPRO": {
      main: [[{ node: "Marcar Follow-up Enviado", type: "main", index: 0 }]],
    },
  },
  settings: {
    executionOrder: "v1",
  },
  staticId: "wf-followup-24h",
  tags: ["arruda-imobi", "followup", "leads", "zpro"],
};

/** N8N workflow JSON template for Catalog Request via WhatsApp */
export const WORKFLOW_TEMPLATE_CATALOG_WHATSAPP = {
  name: "Catálogo via WhatsApp | Arruda Imobi",
  nodes: [
    {
      id: "webhook-catalog",
      type: "n8n-nodes-base.webhook",
      parameters: {
        path: "arruda-catalog-request",
        httpMethod: "POST",
        responseMode: "responseNode",
        respondWith: "json",
        respondOptions: {
          responseData: "allEntries",
        },
      },
      name: "Webhook Solicitação de Catálogo",
      typeVersion: 1.2,
    },
    {
      id: "set-catalog-data",
      type: "n8n-nodes-base.set",
      parameters: {
        mode: "manual",
        duplicateItem: false,
        assignments: {
          assignments: [
            { name: "name", value: "={{ $json.body.data.name }}" },
            { name: "phone", value: "={{ $json.body.data.phone }}" },
            { name: "preferenceType", value: "={{ $json.body.data.preference_type }}" },
            { name: "budget", value: "={{ $json.body.data.budget }}" },
            { name: "location", value: "={{ $json.body.data.location }}" },
          ],
        },
        includeOtherFields: false,
        options: {},
      },
      name: "Extrair Preferências",
    },
    {
      id: "http-get-properties",
      type: "n8n-nodes-base.httpRequest",
      parameters: {
        method: "GET",
        url:
          "https://{{ $env.SUPABASE_PROJECT_ID }}.supabase.co/rest/v1/imoveis?preco=lt.{{ $json.budget }}&localizacao=ilike.%25{{ $json.location }}%25&select=id,titulo,preco,localizacao,fotos",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "apikey", value: "={{ $env.SUPABASE_ANON_KEY }}" },
            { name: "Authorization", value: "Bearer {{ $env.SUPABASE_SERVICE_KEY }}" },
          ],
        },
        options: {},
      },
      name: "Buscar Imóveis Compatíveis",
    },
    {
      id: "format-catalog",
      type: "n8n-nodes-base.code",
      parameters: {
        code:
          "// Format property catalog message\nconst properties = $input.all();\nconst name = $('Extrair Preferências').item.json.name;\n\nlet message = `🏠 *Catálogo de Imóveis para ${name}*\\n\\n`;\nmessage += `Preferência: ${name.preferenceType || 'Não informada'}\\n`;\nmessage += `Localização: ${name.location || 'Qualquer uma'}\\n\\n`;\n\nif (properties.length === 0) {\n  message += '😔 Nenhum imóvel encontrado com esses critérios. Entre em contato diretamente!';\n} else {\n  properties.slice(0, 5).forEach((p, i) => {\n    const data = p.json;\n    message += `*${i + 1}. ${data.titulo}*\\n`;\n    message += `💰 ${data.preco}\\n`;\n    message += `📍 ${data.localizacao}\\n\\n`;\n  });\n  message += `\\n_Gostou de algum? Entre em contato conosco!_`;\n}\n\nreturn [{ json: { message, phone: name.phone } }];\n",
        options: {},
      },
      name: "Formatar Catálogo",
    },
    {
      id: "http-zpro-catalog",
      type: "n8n-nodes-base.httpRequest",
      parameters: {
        method: "POST",
        url: "https://conv.techatende.com.br/v2/api/external/8de34e32-1154-4479-8cc6-678456e1d741",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Authorization", value: "Bearer {{ $env.ZPRO_API_TOKEN }}" },
            { name: "Content-Type", value: "application/json" },
          ],
        },
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: "phone", value: "={{ $json.phone }}" },
            { name: "message", value: "={{ $json.message }}" },
            { name: "contactName", value: "={{ $('Extrair Preferências').item.json.name }}" },
          ],
        },
        options: {},
      },
      name: "Enviar Catálogo via ZPRO",
    },
  ],
  connections: {
    "Webhook Solicitação de Catálogo": {
      main: [[{ node: "Extrair Preferências", type: "main", index: 0 }]],
    },
    "Extrair Preferências": {
      main: [[{ node: "Buscar Imóveis Compatíveis", type: "main", index: 0 }]],
    },
    "Buscar Imóveis Compatíveis": {
      main: [[{ node: "Formatar Catálogo", type: "main", index: 0 }]],
    },
    "Formatar Catálogo": {
      main: [[{ node: "Enviar Catálogo via ZPRO", type: "main", index: 0 }]],
    },
  },
  settings: {
    executionOrder: "v1",
  },
  staticId: "wf-catalog-whatsapp",
  tags: ["arruda-imobi", "catalogo", "whatsapp", "zpro"],
};

/** N8N workflow JSON template for Instagram/Marketplace Auto-post */
export const WORKFLOW_TEMPLATE_INSTAGRAM_POST = {
  name: "Post Instagram / Marketplace | Arruda Imobi",
  nodes: [
    {
      id: "schedule-instagram",
      type: "n8n-nodes-base.schedule",
      parameters: {
        rule: {
          cron: [{ value: "0 9 * * *", disabled: false }],
        },
        timeZone: "America/Sao_Paulo",
      },
      name: "Diário às 9h",
      typeVersion: 1.2,
    },
    {
      id: "http-get-new-properties",
      type: "n8n-nodes-base.httpRequest",
      parameters: {
        method: "GET",
        url:
          "https://{{ $env.SUPABASE_PROJECT_ID }}.supabase.co/rest/v1/imoveis?publicado_instagram=eq.false&order=created_at.desc&limit=3",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "apikey", value: "={{ $env.SUPABASE_ANON_KEY }}" },
            { name: "Authorization", value: "Bearer {{ $env.SUPABASE_SERVICE_KEY }}" },
          ],
        },
        options: {},
      },
      name: "Buscar Novos Imóveis",
    },
    {
      id: "if-properties-found",
      type: "n8n-nodes-base.if",
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
          },
          conditions: [
            {
              id: "condition-count",
              leftValue: "={{ $input.count() }}",
              rightValue: 0,
              operator: {
                type: "number",
                operation: ">",
              },
            },
          ],
          combinator: "and",
        },
        options: {},
      },
      name: "Se encontrou imóveis",
    },
    {
      id: "format-instagram-post",
      type: "n8n-nodes-base.code",
      parameters: {
        code:
          "// Generate Instagram caption\nconst property = $input.first().json;\n\nconst caption = `🏠 *Novo imóvel disponível!*\n\n📍 ${property.titulo}\n💰 ${property.preco}\n${propertyquartos ? `🛏 ${property.quartos} quartos` : ''}\n${property.area ? `📐 ${property.area}m²` : ''}\n\n🔥 Entre em contato e conheça!\n.\n.\n#imóveis #realestate #brasil #arquitetura #casaparavender #apartamento`,
;\n\nreturn [{ json: { caption, propertyId: property.id } }];\n",
        options: {},
      },
      name: "Gerar Legenda Instagram",
    },
    {
      id: "http-instagram-api",
      type: "n8n-nodes-base.httpRequest",
      parameters: {
        method: "POST",
        url: "https://graph.facebook.com/v18.0/{{ $env.INSTAGRAM_ACCOUNT_ID }}/media",
        authentication: "genericCredentialType",
        genericAuthType: "httpQueryAuth",
        sendQuery: true,
        queryParameters: {
          parameters: [
            { name: "access_token", value: "={{ $env.META_ACCESS_TOKEN }}" },
            { name: "caption", value: "={{ $json.caption }}" },
            { name: "image_url", value: "={{ $json.propertyImageUrl }}" },
          ],
        },
        options: {},
      },
      name: "Postar no Instagram",
    },
    {
      id: "update-property-posted",
      type: "n8n-nodes-base.httpRequest",
      parameters: {
        method: "PATCH",
        url: "https://{{ $env.SUPABASE_PROJECT_ID }}.supabase.co/rest/v1/imoveis?id=eq.{{ $json.propertyId }}",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "apikey", value: "={{ $env.SUPABASE_ANON_KEY }}" },
            { name: "Authorization", value: "Bearer {{ $env.SUPABASE_SERVICE_KEY }}" },
            { name: "Prefer", value: "return=minimal" },
          ],
        },
        sendBody: true,
        bodyParameters: {
          parameters: [{ name: "publicado_instagram", value: true }],
        },
        options: {},
      },
      name: "Marcar como Postado",
    },
  ],
  connections: {
    "Diário às 9h": {
      main: [[{ node: "Buscar Novos Imóveis", type: "main", index: 0 }]],
    },
    "Buscar Novos Imóveis": {
      main: [[{ node: "Se encontrou imóveis", type: "main", index: 0 }]],
    },
    "Se encontrou imóveis": {
      main: [[{ node: "Gerar Legenda Instagram", type: "main", index: 0 }]],
    },
    "Gerar Legenda Instagram": {
      main: [[{ node: "Postar no Instagram", type: "main", index: 0 }]],
    },
    "Postar no Instagram": {
      main: [[{ node: "Marcar como Postado", type: "main", index: 0 }]],
    },
  },
  settings: {
    executionOrder: "v1",
  },
  staticId: "wf-instagram-marketplace",
  tags: ["arruda-imobi", "instagram", "marketing", "auto-post"],
};

export const ALL_N8N_WORKFLOW_TEMPLATES = [
  WORKFLOW_TEMPLATE_LEAD_ZPRO_WHATSAPP,
  WORKFLOW_TEMPLATE_VISIT_REMINDER,
  WORKFLOW_TEMPLATE_FOLLOWUP_24H,
  WORKFLOW_TEMPLATE_CATALOG_WHATSAPP,
  WORKFLOW_TEMPLATE_INSTAGRAM_POST,
] as const;

export type N8NWorkflowTemplate = (typeof ALL_N8N_WORKFLOW_TEMPLATES)[number];
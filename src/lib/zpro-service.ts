/**
 * ZPRO Service — Arruda Imobi
 * Camada de acesso à API do ZPRO CRM (tenant 40)
 * Não mexe no tenant — só conecta via APIs documentadas.
 */

import type { IntegrationId } from './integrations'

const ZPRO_BASE = import.meta.env.VITE_ZPRO_API_BASE_URL ?? 'https://conv.techatende.com.br/v2/api/external/8de34e32-1154-4479-8cc6-678456e1d741'
const ZPRO_TOKEN = import.meta.env.VITE_ZPRO_API_TOKEN ?? ''

// ─── tipos ──────────────────────────────────────────────────────────────────

export interface ZproContact {
  id: number
  name: string
  number: string
  email?: string
  extraInfo?: Record<string, string>
  tags?: string[]
  createdAt?: string
}

export interface ZproTicket {
  id: number
  contactId: number
  contactName: string
  channelId: number
  channelName: string
  status: 'open' | 'pending' | 'closed'
  createdAt: string
  updatedAt: string
  lastMessage?: string
}

export interface ZproChannel {
  id: number
  name: string
  type: string
  status: 'connected' | 'disconnected'
  number?: string
}

export interface ZproKanbanColumn {
  id: number
  name: string
  order: number
}

export interface ZproTicketStats {
  open: number
  pending: number
  closed: number
  total: number
}

export interface ZproUser {
  id: number
  name: string
  role: string
  status: 'online' | 'offline'
}

// ─── helper ───────────────────────────────────────────────────────────────────

async function zproFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const url = `${ZPRO_BASE}${path}`
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ZPRO_TOKEN}`,
      ...opts?.headers,
    },
  } as RequestInit)

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`ZPRO ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ─── canais ───────────────────────────────────────────────────────────────────

export async function getZproChannels(): Promise<ZproChannel[]> {
  const data = await zproFetch<{ success: boolean; data: { id: number; name: string; type: string; status?: string; number?: string }[] }>('/listChannels')
  return (data.data ?? []).map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    status: (c.status as 'connected' | 'disconnected') ?? 'disconnected',
    number: c.number,
  }))
}

// ─── tickets ─────────────────────────────────────────────────────────────────

export async function getZproTickets(params?: {
  status?: 'open' | 'pending' | 'closed'
  pageNumber?: number
}): Promise<{ tickets: ZproTicket[]; total: number }> {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.pageNumber) query.set('pageNumber', String(params.pageNumber))

  const data = await zproFetch<{
    success: boolean
    data: { id: number; contactId: number; contactName?: string; channelId: number; channelName?: string; status: string; createdAt: string; updatedAt?: string }[]
    total?: number
  }>(`/listTickets?${query}`)

  return {
    tickets: (data.data ?? []).map(t => ({
      id: t.id,
      contactId: t.contactId,
      contactName: t.contactName ?? `Contato #${t.contactId}`,
      channelId: t.channelId,
      channelName: t.channelName ?? `Canal #${t.channelId}`,
      status: (t.status as 'open' | 'pending' | 'closed') ?? 'open',
      createdAt: t.createdAt,
      updatedAt: t.updatedAt ?? t.createdAt,
    })),
    total: data.total ?? data.data.length,
  }
}

export async function getZproTicketStats(): Promise<ZproTicketStats> {
  const data = await zproFetch<{ success: boolean; open?: number; pending?: number; closed?: number }>('/dash/ticketsStatus')
  return {
    open: data.open ?? 0,
    pending: data.pending ?? 0,
    closed: data.closed ?? 0,
    total: (data.open ?? 0) + (data.pending ?? 0) + (data.closed ?? 0),
  }
}

// ─── pipeline / kanban ─────────────────────────────────────────────────────────

export async function getZproKanbanColumns(): Promise<ZproKanbanColumn[]> {
  const data = await zproFetch<{ success: boolean; data: { id: number; name: string; pipelineOrder?: number }[] }>('/listKanban')
  return (data.data ?? []).map((col, i) => ({
    id: col.id,
    name: col.name,
    order: col.pipelineOrder ?? i,
  }))
}

// ─── contatos ─────────────────────────────────────────────────────────────────

export async function searchZproContacts(query: string, limit = 20): Promise<ZproContact[]> {
  const data = await zproFetch<{ success: boolean; data: ZproContact[] }>('/contacts/search', {
    method: 'POST',
    body: JSON.stringify({ query, limit }),
  })
  return data.data ?? []
}

// ─── equipe ───────────────────────────────────────────────────────────────────

export async function getZproUsers(): Promise<ZproUser[]> {
  const data = await zproFetch<{ success: boolean; data: { id: number; name: string; role?: string; status?: string }[] }>('/listUsers')
  return (data.data ?? []).map(u => ({
    id: u.id,
    name: u.name,
    role: u.role ?? 'user',
    status: (u.status as 'online' | 'offline') ?? 'offline',
  }))
}

// ─── health probe ──────────────────────────────────────────────────────────────

export async function probeZproApi(): Promise<{ latencyMs: number; ok: boolean; channels: number; status: IntegrationId['status'] }> {
  const start = performance.now()
  try {
    const channels = await getZproChannels()
    const latencyMs = Math.round(performance.now() - start)
    return { latencyMs, ok: true, channels: channels.length, status: 'ok' }
  } catch {
    return { latencyMs: Math.round(performance.now() - start), ok: false, channels: 0, status: 'down' }
  }
}
// ─── criar contato ────────────────────────────────────────────────────────────

export interface ZproContactInput {
  name: string
  phone: string
  email?: string
  propertyTitle?: string
  message?: string
  source?: string
}

export async function createZproContact(input: ZproContactInput): Promise<{ id: number } | null> {
  try {
    // Busca primeiro para evitar duplicado
    const existing = await zproFetch<{ success: boolean; data?: { id: number }[] }>('/contacts/search', {
      method: 'POST',
      body: JSON.stringify({ query: input.phone, limit: 1 }),
    })
    if (existing.data && existing.data.length > 0) {
      return { id: existing.data[0].id }
    }

    const data = await zproFetch<{ success: boolean; data?: { id: number } }>('/createContact', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        number: input.phone.replace(/\D/g, ''),
        email: input.email || '',
        extraInfo: {
          fonte: input.source ?? 'site_arruda',
          imovel: input.propertyTitle ?? '',
          mensagem: input.message ?? '',
        },
      }),
    })
    return data.data ?? null
  } catch (err) {
    console.warn('[ZPRO] createContact failed:', err)
    return null
  }
}

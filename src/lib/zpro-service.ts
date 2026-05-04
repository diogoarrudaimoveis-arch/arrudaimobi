/**
 * ZPRO Service — Arruda Imobi
 * Frontend seguro: nunca chama ZPRO diretamente e nunca lê token VITE_ZPRO_*.
 * Todas as chamadas passam pela Supabase Edge Function `zpro-proxy`, onde o token fica no server.
 */

import { supabase } from '@/integrations/supabase/client'

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

export interface ZproContactInput {
  name: string
  phone: string
  email?: string
  propertyTitle?: string
  message?: string
  source?: string
}

type ZproAction =
  | 'listChannels'
  | 'ticketStats'
  | 'listTickets'
  | 'listKanban'
  | 'contactsSearch'
  | 'listUsers'
  | 'createContact'
  | 'probe'

type IntegrationStatus = 'unknown' | 'ok' | 'degraded' | 'down'

async function zproProxy<T>(action: ZproAction, params?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('zpro-proxy', {
    body: { action, params },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const message = typeof data.error === 'string' ? data.error : 'ZPRO proxy error'
    throw new Error(message)
  }

  if (!data) {
    throw new Error('ZPRO proxy returned empty response')
  }

  return data
}

// ─── canais ───────────────────────────────────────────────────────────────────

export async function getZproChannels(): Promise<ZproChannel[]> {
  const data = await zproProxy<{ success: boolean; data: { id: number; name: string; type: string; status?: string; number?: string }[] }>('listChannels')
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
  const data = await zproProxy<{
    success: boolean
    data: { id: number; contactId: number; contactName?: string; channelId: number; channelName?: string; status: string; createdAt: string; updatedAt?: string }[]
    total?: number
  }>('listTickets', params)

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
  const data = await zproProxy<{ success: boolean; open?: number; pending?: number; closed?: number }>('ticketStats')
  return {
    open: data.open ?? 0,
    pending: data.pending ?? 0,
    closed: data.closed ?? 0,
    total: (data.open ?? 0) + (data.pending ?? 0) + (data.closed ?? 0),
  }
}

// ─── pipeline / kanban ─────────────────────────────────────────────────────────

export async function getZproKanbanColumns(): Promise<ZproKanbanColumn[]> {
  const data = await zproProxy<{ success: boolean; data: { id: number; name: string; pipelineOrder?: number }[] }>('listKanban')
  return (data.data ?? []).map((col, i) => ({
    id: col.id,
    name: col.name,
    order: col.pipelineOrder ?? i,
  }))
}

// ─── contatos ─────────────────────────────────────────────────────────────────

export async function searchZproContacts(query: string, limit = 20): Promise<ZproContact[]> {
  const data = await zproProxy<{ success: boolean; data: ZproContact[] }>('contactsSearch', { query, limit })
  return data.data ?? []
}

export async function createZproContact(input: ZproContactInput): Promise<{ id: number } | null> {
  try {
    const data = await zproProxy<{ success: boolean; data?: { id: number } }>('createContact', input as unknown as Record<string, unknown>)
    return data.data ?? null
  } catch (err) {
    console.warn('[ZPRO] createContact via proxy failed:', err)
    return null
  }
}

// ─── equipe ───────────────────────────────────────────────────────────────────

export async function getZproUsers(): Promise<ZproUser[]> {
  const data = await zproProxy<{ success: boolean; data: { id: number; name: string; role?: string; status?: string }[] }>('listUsers')
  return (data.data ?? []).map(u => ({
    id: u.id,
    name: u.name,
    role: u.role ?? 'user',
    status: (u.status as 'online' | 'offline') ?? 'offline',
  }))
}

// ─── health probe ──────────────────────────────────────────────────────────────

export async function probeZproApi(): Promise<{ latencyMs: number; ok: boolean; channels: number; status: IntegrationStatus }> {
  const start = performance.now()
  try {
    const channels = await getZproChannels()
    const latencyMs = Math.round(performance.now() - start)
    return { latencyMs, ok: true, channels: channels.length, status: 'ok' }
  } catch {
    return { latencyMs: Math.round(performance.now() - start), ok: false, channels: 0, status: 'down' }
  }
}

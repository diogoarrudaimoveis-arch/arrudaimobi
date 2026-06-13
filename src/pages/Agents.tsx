import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Building2, AlertTriangle } from 'lucide-react'
import { TablePagination } from '@/components/ui/table-pagination'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Link } from 'react-router-dom'

const PAGE_SIZE = 12

interface PublicAgent {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string
  bio: string
  avatar_url: string | null
  properties_count: number
  propertiesCount?: number
  properties?: number
}

const Agents = () => {
  const { tenantId } = useAuth()
  const [page, setPage] = useState(1)
  const [agents, setAgents] = useState<PublicAgent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    loadAgents()
  }, [tenantId, page])

  const loadAgents = async () => {
    // Para visitantes anônimos, sem tenantId: pega o tenant default via slug
    let effectiveTenantId = tenantId
    if (!effectiveTenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', 'default')
        .maybeSingle()
      if (tenant) effectiveTenantId = tenant.id
    }
    if (!effectiveTenantId) {
      setAgents([])
      setTotal(0)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      // Use the public-api Edge Function (bypasses RLS for public agents listing)
      // This avoids the RLS policy that blocks anon users from reading profiles
      // The Edge Function returns only profiles with show_on_public_page=true
      const res = await fetch(
        `https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/public-api?action=list-agents${effectiveTenantId ? `&tenant_id=${effectiveTenantId}` : ''}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const profiles = json?.data || []

      const count = profiles.length

      const agentsFromProfiles: PublicAgent[] = profiles.map((p: any) => ({
        id: p.id || p.user_id,
        user_id: p.user_id,
        full_name: p.full_name || 'Agente',
        email: p.email || '',
        phone: p.phone || '',
        bio: p.bio || '',
        avatar_url: p.avatar_url || null,
        properties_count: p.properties_count || 0,
        propertiesCount: p.properties_count || 0,
      }))

      setAgents(agentsFromProfiles)
      setTotal(count)
      setTotalPages(Math.ceil(count / PAGE_SIZE))
    } catch (error) {
      console.error('Erro ao carregar agentes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout>
      <section className="bg-secondary/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="container px-0">
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Nossos Agentes</h1>
          <p className="mt-1 text-muted-foreground">
            {isLoading ? 'Carregando...' : `${total} profissionais qualificados`}
          </p>
        </div>
      </section>

      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="container px-0">
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
            </div>
          ) : !agents.length ? (
            <div className="py-20 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-amber-400 mb-3" />
              <p className="font-medium text-lg">Nenhum agente cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Agentes com <strong>"Exibir no portal público"</strong> aparecerão aqui.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Admin: ative o campo no perfil do agente para exibi-lo.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {agents.map((agent) => (
                  <Link key={agent.id} to={`/agentes/${agent.user_id || agent.id}`}>
                    <Card className="group overflow-hidden p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      <div className="flex flex-col items-center text-center">
                        <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                          <AvatarImage src={agent.avatar_url || undefined} alt={agent.full_name} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-display">
                            {(agent.full_name || 'A').split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                          {agent.full_name || 'Agente'}
                        </h3>
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {agent.bio || 'Profissional qualificado'}
                        </p>
                        <Badge variant="secondary" className="mt-3 gap-1">
                          <Building2 className="h-3 w-3" />
                          {(agent.propertiesCount ?? agent.properties_count ?? 0)} imóveis
                        </Badge>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  )
}

export default Agents
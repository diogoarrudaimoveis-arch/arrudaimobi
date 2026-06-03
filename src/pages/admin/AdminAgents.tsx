import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pencil, Trash, Plus, User, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminPageShell, PageCard } from '@/components/admin/shared/AdminComponents'

interface UserData {
  id?: string
  user_id?: string
  full_name: string
  email: string
  phone: string
  role: 'admin' | 'agent' | 'user' | 'developer'
  bio: string
  is_agent: boolean
  avatar_url?: string | null
  created_at?: string
}

export function AdminAgents() {
  const { tenantId, normalizedRole, isDeveloper } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)

  const [formData, setFormData] = useState<UserData>({
    full_name: '',
    email: '',
    phone: '',
    role: 'user',
    bio: '',
    is_agent: false,
  })

  const [saving, setSaving] = useState(false)

  // Carregar usuários
  useEffect(() => {
    loadUsers()
  }, [tenantId])

  const loadUsers = async () => {
    if (!tenantId) return

    setIsLoading(true)
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          email,
          phone,
          bio,
          avatar_url,
          created_at,
          user_roles!inner (
            id,
            role,
            tenant_id
          )
        `)
        .eq('user_roles.tenant_id', tenantId)
        .order('full_name', { ascending: true })

      if (error) throw error

      const { data: agents } = await supabase
        .from('agents')
        .select('user_id, public')
        .eq('tenant_id', tenantId)

      const agentsSet = new Set(
        agents?.filter((a: any) => a.public).map((a: any) => a.user_id) || []
      )

      const usersData = profiles?.map((profile: any) => ({
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name || 'Sem nome',
        email: profile.email || '-',
        phone: profile.phone || '-',
        role: profile.user_roles[0]?.role || 'user',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        is_agent: agentsSet.has(profile.user_id),
      })) || []

      setUsers(usersData)
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error)
      toast.error('Erro ao carregar usuários')
    } finally {
      setIsLoading(false)
    }
  }

  // Abrir modal de criação
  const handleCreate = () => {
    setEditingUser(null)
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      role: 'user',
      bio: '',
      is_agent: false,
    })
    setIsModalOpen(true)
  }

  // Abrir modal de edição — CARREGAR DADOS DO USUÁRIO
  const handleEdit = (user: UserData) => {
    setEditingUser(user)
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'user',
      bio: user.bio || '',
      is_agent: user.is_agent || false,
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId) {
      toast.error('Tenant não encontrado')
      return
    }
    setSaving(true)
    try {
      if (editingUser && editingUser.user_id) {
        await updateUser(editingUser.user_id)
      } else {
        await createUser()
      }
      setIsModalOpen(false)
      await loadUsers()
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error)
      toast.error(error.message || 'Erro ao salvar usuário')
    } finally {
      setSaving(false)
    }
  }

  const createUser = async () => {
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: tempPassword,
      options: { data: { full_name: formData.full_name } },
    })
    if (authError) throw authError
    if (!authData.user) throw new Error('Usuário não criado')

    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: authData.user.id,
      tenant_id: tenantId,
      full_name: formData.full_name,
      phone: formData.phone,
      bio: formData.bio,
    })
    if (profileError) throw profileError

    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: authData.user.id,
      tenant_id: tenantId,
      role: formData.role,
    })
    if (roleError) throw roleError

    if (formData.is_agent) {
      await supabase.from('agents').insert({
        tenant_id: tenantId,
        user_id: authData.user.id,
        name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        public: true,
      })
    }

    // permissões padrão por módulo
    const defaultPerms = [
      { module_id: 'dashboard', admin_access: true, agent_access: true, user_access: false },
      { module_id: 'imoveis', admin_access: true, agent_access: true, user_access: false },
      { module_id: 'proprietarios', admin_access: true, agent_access: false, user_access: false },
      { module_id: 'agenda', admin_access: true, agent_access: true, user_access: false },
      { module_id: 'contatos', admin_access: true, agent_access: true, user_access: false },
      { module_id: 'mensagens', admin_access: true, agent_access: true, user_access: false },
    ]
    for (const perm of defaultPerms) {
      await supabase.from('menu_permissions').upsert({
        tenant_id: tenantId,
        module_id: perm.module_id,
        admin_access: perm.admin_access,
        agent_access: perm.agent_access,
        user_access: perm.user_access,
      }, { onConflict: 'tenant_id,module_id' })
    }

    toast.success('Usuário criado! Senha temporária: ' + tempPassword)
  }

  const updateUser = async (userId: string) => {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        phone: formData.phone,
        bio: formData.bio,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
    if (profileError) throw profileError

    const { error: roleError } = await supabase
      .from('user_roles')
      .update({ role: formData.role })
      .eq('user_id', userId)
    if (roleError) throw roleError

    if (formData.is_agent) {
      await supabase.from('agents').upsert({
        tenant_id: tenantId,
        user_id: userId,
        name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        public: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } else {
      await supabase.from('agents').delete().eq('user_id', userId)
    }

    toast.success('Usuário atualizado!')
  }

  const handleDelete = async () => {
    if (!userToDelete) return
    try {
      await supabase.from('agents').delete().eq('user_id', userToDelete)
      await supabase.from('user_roles').delete().eq('user_id', userToDelete)
      await supabase.from('profiles').delete().eq('user_id', userToDelete)
      toast.success('Usuário removido!')
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
      await loadUsers()
    } catch (error: any) {
      console.error('Erro ao deletar usuário:', error)
      toast.error('Erro ao remover usuário')
    }
  }

  const confirmDelete = (userId: string) => {
    setUserToDelete(userId)
    setIsDeleteDialogOpen(true)
  }

  const canManageUsers = normalizedRole === 'admin' || normalizedRole === 'developer'

  const roleLabel = (role: string) => {
    if (role === 'developer') return 'Desenvolvedor'
    if (role === 'admin') return 'Admin'
    if (role === 'agent') return 'Agente'
    return 'Usuário'
  }

  return (
    <AdminLayout>
      <AdminPageShell>
        <PageCard title="Agentes & Usuários" icon={User}>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                  Agentes & Usuários
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isLoading ? 'Carregando...' : `${users.length} membros na imobiliária`}
                </p>
              </div>
              {canManageUsers && (
                <Button onClick={handleCreate} className="gap-2 bg-[#003366] hover:bg-[#002244] text-white">
                  <Plus className="h-4 w-4" />
                  Criar Usuário
                </Button>
              )}
            </div>

            {/* Lista de Usuários */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !users.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum membro encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          <User className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{user.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">
                            {roleLabel(user.role)}
                          </span>
                          {user.is_agent && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              Corretor
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação — APENAS Admin/Developer */}
                    {canManageUsers && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(user)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                          onClick={() => confirmDelete(user.user_id!)}
                          title="Excluir"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </PageCard>
      </AdminPageShell>

      {/* Modal de Criar/Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Criar Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nome da pessoa"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                required
                disabled={!!editingUser}
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(31) 99999-9999"
              />
            </div>
            <div>
              <Label htmlFor="role">Tipo de usuário *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="agent">Agente</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {isDeveloper && (
                    <SelectItem value="developer">Desenvolvedor</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bio">Biografia / Observações</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Informações adicionais..."
                rows={3}
              />
            </div>
            {!editingUser && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_agent"
                  checked={formData.is_agent}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_agent: checked as boolean })
                  }
                />
                <Label htmlFor="is_agent" className="text-sm font-medium leading-none cursor-pointer">
                  Este usuário é um <strong>CORRETOR</strong> (exibir no portal público)
                </Label>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
}

export default AdminAgents
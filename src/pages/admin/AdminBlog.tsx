import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBlogPosts, useCreateBlogPost, useUpdateBlogPost, useDeleteBlogPost, generateSlug } from "@/hooks/use-blog";
import type { BlogPost } from "@/hooks/use-blog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BlogRichEditor } from "@/components/admin/BlogRichEditor";
import { BlogTagInput } from "@/components/admin/BlogTagInput";
import {
  Plus, Pencil, Trash2, FileText, Eye, EyeOff, Loader2, ImageIcon, Save, X, Tag
} from "lucide-react";
import { format } from "date-fns";

export default function AdminBlog() {
  const { tenantId, user } = useAuth();
  const { data: posts, isLoading } = useAdminBlogPosts();
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const openNew = () => {
    setEditing(null);
    setTitle(""); setSlug(""); setExcerpt(""); setContent(""); setCoverUrl("");
    setPublished(false); setSelectedTagIds([]);
    setDialogOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setTitle(post.title); setSlug(post.slug); setExcerpt(post.excerpt || "");
    setContent(post.content); setCoverUrl(post.cover_image_url || "");
    setPublished(post.published);
    setSelectedTagIds(post.tags?.map(t => t.id) || []);
    setDialogOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editing) setSlug(generateSlug(val));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const filename = `blog-${tenantId}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("property-images").upload(`blog/${filename}`, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("property-images").getPublicUrl(`blog/${filename}`);
      setCoverUrl(data.publicUrl);
    } catch (err: any) {
      toast({ title: "Erro ao enviar imagem", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      toast({ title: "Título e slug são obrigatórios", variant: "destructive" }); return;
    }
    if (!content.trim() || content === "<p></p>") {
      toast({ title: "Conteúdo é obrigatório", variant: "destructive" }); return;
    }
    if (!tenantId || !user) return;

    setSaving(true);
    try {
      if (editing) {
        await updatePost.mutateAsync({
          id: editing.id, title, slug,
          excerpt: excerpt || null, content,
          cover_image_url: coverUrl || null, published,
          tag_ids: selectedTagIds,
        });
        toast({ title: "Post atualizado!" });
      } else {
        await createPost.mutateAsync({
          title, slug, excerpt: excerpt || undefined,
          content, cover_image_url: coverUrl || undefined,
          published, tenant_id: tenantId, author_id: user.id,
          tag_ids: selectedTagIds,
        });
        toast({ title: "Post criado!" });
      }
      setDialogOpen(false);
    } catch (err: any) {
      const msg = err.message?.includes("duplicate") ? "Já existe um post com este slug" : err.message;
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePost.mutateAsync(id);
      toast({ title: "Post excluído" });
      setDeleteConfirm(null);
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" /> Blog
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie os posts e notícias do seu site</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Post
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : !posts?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Nenhum post cadastrado</p>
              <Button variant="outline" className="mt-4 gap-2" onClick={openNew}>
                <Plus className="h-4 w-4" /> Criar Primeiro Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Card key={post.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                {post.cover_image_url && (
                  <div className="h-36 overflow-hidden">
                    <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-sm font-semibold text-foreground line-clamp-2">{post.title}</h3>
                    <Badge variant={post.published ? "default" : "secondary"} className="shrink-0 text-[10px]">
                      {post.published ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>
                  {post.tags && post.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {post.tags.map(tag => (
                        <Badge key={tag.id} variant="outline" className="text-[10px] px-1.5 py-0">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {post.excerpt && (
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>
                  )}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {format(new Date(post.created_at), "dd/MM/yyyy HH:mm")}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => openEdit(post)}>
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(post.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {editing ? "Editar Post" : "Novo Post"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Título do post" />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="url-do-post" className="font-mono text-sm" />
              <p className="text-[11px] text-muted-foreground">URL amigável. Gerado automaticamente a partir do título.</p>
            </div>
            <div className="space-y-2">
              <Label>Resumo</Label>
              <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Breve descrição do post..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo *</Label>
              <BlogRichEditor content={content} onChange={setContent} />
            </div>

            {/* Tags */}
            {tenantId && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Tag className="h-4 w-4" /> Tags / Categorias</Label>
                <BlogTagInput tenantId={tenantId} selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Imagem de Capa</Label>
              {coverUrl ? (
                <div className="space-y-2">
                  <div className="relative rounded-xl overflow-hidden border border-border h-32">
                    <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild className="gap-1.5">
                        <span><ImageIcon className="h-3.5 w-3.5" /> Trocar</span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                    </label>
                    <Button variant="outline" size="sm" onClick={() => setCoverUrl("")} className="gap-1.5 text-destructive hover:text-destructive">
                      <X className="h-3.5 w-3.5" /> Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary/40 hover:bg-secondary/30">
                  {uploading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                  <span className="text-xs text-muted-foreground">{uploading ? "Enviando..." : "Clique para enviar (máx. 5MB)"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploading} />
                </label>
              )}
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Switch checked={published} onCheckedChange={setPublished} />
              <div>
                <Label className="flex items-center gap-1.5">
                  {published ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  {published ? "Publicado" : "Rascunho"}
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {published ? "Visível para todos os visitantes" : "Apenas visível no painel admin"}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editing ? "Salvar Alterações" : "Criar Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Post</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="gap-2">
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

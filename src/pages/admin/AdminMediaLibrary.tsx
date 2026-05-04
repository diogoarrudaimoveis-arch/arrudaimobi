import { useState, useRef, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Loader2, Image as ImageIcon, Pencil, Youtube, Play } from "lucide-react";
import { compressImages } from "@/lib/image-compression";
import { TablePagination } from "@/components/ui/table-pagination";

const MEDIA_PAGE_SIZE = 20;

export interface MediaImage {
  id: string;
  url: string;
  alt: string | null;
  filename: string | null;
  mime_type?: string | null;
  size?: number | null;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

function isYouTubeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return !!extractYouTubeId(url);
}

function isYouTube(url: unknown): boolean {
  return typeof url === "string" && (url.includes("youtube.com") || url.includes("youtu.be"));
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

const AdminMediaLibrary = () => {
  const { tenantId, user, isReady } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editingImage, setEditingImage] = useState<MediaImage | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [editFilename, setEditFilename] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ id: string; url: string; mime_type?: string | null } | null>(null);
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaPageSize, setMediaPageSize] = useState(MEDIA_PAGE_SIZE);

  const { data: mediaData, isLoading } = useQuery({
    queryKey: ["media-library", tenantId, mediaPage, mediaPageSize],
    queryFn: async () => {
      const from = (mediaPage - 1) * mediaPageSize;
      const to = from + mediaPageSize - 1;
      const { data, error, count } = await supabase
        .from("property_images")
        .select("*, properties!inner(id,title,tenant_id)", { count: "exact" })
        .eq("properties.tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
    enabled: isReady && !!tenantId,
  });

  const media = mediaData?.data || [];
  const totalMedia = mediaData?.total || 0;
  const mediaTotalPages = Math.ceil(totalMedia / mediaPageSize);

  const uploadMutation = useMutation({
    mutationFn: async (rawFiles: File[]) => {
      setUploading(true);
      const files = await compressImages(rawFiles);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const path = `library/${tenantId}/${Date.now()}_${i}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("property-images")
          .upload(path, file, { contentType: file.type });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("property-images")
          .getPublicUrl(path);

        const { error: dbErr } = await supabase.from("media_library").insert({
          tenant_id: tenantId!,
          uploaded_by: user!.id,
          url: urlData.publicUrl,
          filename: file.name,
          alt: file.name.replace(/\.[^/.]+$/, ""),
          mime_type: file.type,
          size_bytes: file.size,
        });
        if (dbErr) throw dbErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
      toast({ title: "Imagens enviadas com sucesso!" });
      setUploading(false);
    },
    onError: (err) => {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
      setUploading(false);
    },
  });

  const youtubeAddMutation = useMutation({
    mutationFn: async ({ url, title }: { url: string; title: string }) => {
      const videoId = extractYouTubeId(url);
      if (!videoId) throw new Error("URL do YouTube inválida");

      const { error } = await supabase.from("media_library").insert({
        tenant_id: tenantId!,
        uploaded_by: user!.id,
        url: url.trim(),
        filename: title || `YouTube ${videoId}`,
        alt: title || `Vídeo YouTube ${videoId}`,
        mime_type: "video/youtube",
        size_bytes: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
      toast({ title: "Vídeo do YouTube adicionado!" });
      setYoutubeDialogOpen(false);
      setYoutubeUrl("");
      setYoutubeTitle("");
    },
    onError: (err) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (image: { id: string; url: string }) => {
      const urlParts = image.url.split("/property-images/");
      if (urlParts[1]) {
        await supabase.storage.from("property-images").remove([decodeURIComponent(urlParts[1])]);
      }
      const { error } = await supabase.from("property_images").delete().eq("id", image.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
      toast({ title: "Mídia removida" });
    },
    onError: (err) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, alt }: { id: string; alt: string }) => {
      const { error } = await supabase
        .from("property_images")
        .update({ alt })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
      toast({ title: "Mídia atualizada!" });
      setEditingImage(null);
    },
    onError: (err) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (img: MediaImage) => {
    setEditingImage(img);
    setEditAlt(img.alt || "");
    setEditFilename(img.filename || "");
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderThumbnail = (img: MediaImage) => {
    if (isYouTube(img.url)) {
      const videoId = extractYouTubeId(img.url);
      return (
        <div className="relative h-full w-full bg-black">
          <img
            src={videoId ? getYouTubeThumbnail(videoId) : ""}
            alt={img.alt || "Vídeo do YouTube"}
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-destructive/90 p-2">
              <Play className="h-5 w-5 fill-destructive-foreground text-destructive-foreground" />
            </div>
          </div>
        </div>
      );
    }

    return <img src={img.url} alt={img.alt || ""} className="h-full w-full object-cover" />;
  };

  const handlePreview = (img: MediaImage) => {
    if (isYouTube(img.url)) {
      const videoId = extractYouTubeId(img.url);
      if (videoId) {
        setPreviewImage(`youtube:${videoId}`);
      }
    } else {
      setPreviewImage(img.url);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Biblioteca de Mídias</h1>
            <p className="text-muted-foreground">{totalMedia} itens</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setYoutubeDialogOpen(true)}
            >
              <Youtube className="h-4 w-4" />
              YouTube
            </Button>
            <Button className="gap-2" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                if (files.length) uploadMutation.mutate(files);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !media.length ? (
          <Card className="flex flex-col items-center py-16 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-3 font-display font-semibold">Nenhuma mídia na biblioteca</p>
            <p className="text-sm text-muted-foreground">Faça upload de imagens ou adicione vídeos do YouTube</p>
          </Card>
        ) : (
          <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {media.map((img) => (
              <div
                key={img.id}
                className="group relative overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
              >
                <div
                  className="aspect-square cursor-pointer"
                  onClick={() => handlePreview(img)}
                >
                  {renderThumbnail(img)}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium">{img.alt || img.url?.split("/").pop()?.split("?")[0] || "Imagem do imóvel"}</p>
                  <p className="text-xs text-muted-foreground">
                    {img.properties?.title ? `Imóvel: ${img.properties.title}` : formatSize(img.size_bytes)}
                  </p>
                </div>
                <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEdit(img)}
                    className="rounded-full bg-card/90 p-1.5 text-foreground shadow-sm backdrop-blur-sm hover:bg-card"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmItem({ id: img.id, url: img.url, mime_type: img.mime_type })}
                    className="rounded-full bg-destructive/90 p-1.5 text-destructive-foreground shadow-sm backdrop-blur-sm hover:bg-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <TablePagination
            page={mediaPage}
            totalPages={mediaTotalPages}
            total={totalMedia}
            pageSize={mediaPageSize}
            onPageChange={setMediaPage}
            onPageSizeChange={(s) => { setMediaPageSize(s); setMediaPage(1); }}
            pageSizeOptions={[20, 40, 60]}
          />
          </>
        )}
      </div>

      {/* YouTube dialog */}
      <Dialog open={youtubeDialogOpen} onOpenChange={setYoutubeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-destructive" />
              Adicionar Vídeo do YouTube
            </DialogTitle>
            <DialogDescription className="sr-only">Insira a URL e o título do vídeo do YouTube para adicionar à sua biblioteca.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">URL do YouTube *</label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              {youtubeUrl && extractYouTubeId(youtubeUrl) && (
                <div className="mt-2 overflow-hidden rounded-md">
                  <img
                    src={getYouTubeThumbnail(extractYouTubeId(youtubeUrl)!)}
                    alt="Preview"
                    className="w-full"
                  />
                </div>
              )}
              {youtubeUrl && !extractYouTubeId(youtubeUrl) && (
                <p className="mt-1 text-xs text-destructive">URL inválida do YouTube</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Título</label>
              <Input
                placeholder="Nome do vídeo"
                value={youtubeTitle}
                onChange={(e) => setYoutubeTitle(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={!extractYouTubeId(youtubeUrl) || youtubeAddMutation.isPending}
              onClick={() => youtubeAddMutation.mutate({ url: youtubeUrl, title: youtubeTitle })}
            >
              {youtubeAddMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar Vídeo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingImage} onOpenChange={(v) => !v && setEditingImage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isYouTube(editingImage?.url) ? "Editar Vídeo" : "Editar Imagem"}</DialogTitle>
            <DialogDescription className="sr-only">Edite o nome e o texto alternativo da mídia selecionada.</DialogDescription>
          </DialogHeader>
          {editingImage && (
            <div className="space-y-4">
                <img src={editingImage.url} alt="" className="mx-auto max-h-48 rounded-lg object-contain" />
              <div>
                <label className="mb-1 block text-sm font-medium">Arquivo</label>
                <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  {editingImage.url?.split("/").pop()?.split("?")[0] || "Imagem do imóvel"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Texto alternativo (alt)</label>
                <Input value={editAlt} onChange={(e) => setEditAlt(e.target.value)} />
              </div>
              <Button
                className="w-full"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: editingImage.id, alt: editAlt })}
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={(v) => !v && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogDescription className="sr-only">Visualização ampliada da mídia selecionada.</DialogDescription>
          {previewImage?.startsWith("youtube:") ? (
            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${previewImage.replace("youtube:", "")}?autoplay=1`}
                className="h-full w-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <img src={previewImage || ""} alt="" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmItem} onOpenChange={() => setDeleteConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Mídia</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta mídia? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteConfirmItem) { deleteMutation.mutate(deleteConfirmItem); setDeleteConfirmItem(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminMediaLibrary;

import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, Image as ImageIcon, GripVertical, Play } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MediaLibraryPicker } from "./MediaLibraryPicker";
import { processImageWithWatermark } from "@/lib/image-compression";
import { isYouTubeMime, extractYouTubeId, getYouTubeThumbnail } from "@/lib/youtube";
import { useTenantSettings } from "@/hooks/use-tenant-settings";

interface Props {
  propertyId: string;
  onProcessingChange?: (processing: boolean) => void;
}

export function PropertyImageUpload({ propertyId, onProcessingChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const setProcessingState = (value: boolean) => {
    setProcessing(value);
    onProcessingChange?.(value);
  };
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { data: images, isLoading } = useQuery({
    queryKey: ["property-images", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_images")
        .select("*")
        .eq("property_id", propertyId)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: tenantSettings } = useTenantSettings();

  const uploadMutation = useMutation({
    mutationFn: async (rawFiles: File[]) => {
      setUploading(true);
      setProcessingState(true);

      const watermarkUrl = tenantSettings?.settings?.logo_mode === "image"
        ? tenantSettings.settings.logo_url
        : undefined;

      const files = await Promise.all(
        rawFiles.map((file) =>
          processImageWithWatermark(file, watermarkUrl, {
            maxWidth: 1920,
            quality: 0.8,
            watermarkOpacity: 0.5,
            watermarkMaxWidthRatio: 0.15,
          })
        )
      );

      setProcessing(false);
      const currentCount = images?.length || 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `${propertyId}/${Date.now()}_${i}.webp`;

        const { error: uploadErr } = await supabase.storage
          .from("property-images")
          .upload(path, file, { contentType: "image/webp" });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("property-images")
          .getPublicUrl(path);

        const { error: dbErr } = await supabase.from("property_images").insert({
          property_id: propertyId,
          url: urlData.publicUrl,
          alt: file.name.replace(/\.[^/.]+$/, ""),
          display_order: currentCount + i,
        });
        if (dbErr) throw dbErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-images", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      toast({ title: "Imagens otimizadas e protegidas com sucesso!" });
      setUploading(false);
      setProcessingState(false);
    },
    onError: (err) => {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
      setUploading(false);
      setProcessingState(false);
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
      queryClient.invalidateQueries({ queryKey: ["property-images", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      toast({ title: "Imagem removida" });
    },
    onError: (err) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reordered: { id: string; display_order: number }[]) => {
      for (const item of reordered) {
        const { error } = await supabase
          .from("property_images")
          .update({ display_order: item.display_order })
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-images", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    },
    onError: (err) => {
      toast({ title: "Erro ao reordenar", description: err.message, variant: "destructive" });
    },
  });

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex || !images) return;

    const reordered = [...images];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    const updates = reordered.map((img, i) => ({ id: img.id, display_order: i }));
    reorderMutation.mutate(updates);

    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, images, reorderMutation]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const addYoutubeVideo = useCallback(async () => {
    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      toast({ title: "URL de YouTube inválida", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("property_images").insert({
      property_id: propertyId,
      url: youtubeUrl,
      alt: youtubeTitle.trim() || `Vídeo YouTube ${videoId}`,
      display_order: (images?.length || 0),
    });

    if (error) {
      toast({ title: "Erro ao adicionar vídeo", description: error.message, variant: "destructive" });
      return;
    }

    setYoutubeUrl("");
    setYoutubeTitle("");
    queryClient.invalidateQueries({ queryKey: ["property-images", propertyId] });
    queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    toast({ title: "Vídeo adicionado à galeria" });
  }, [images?.length, propertyId, queryClient, toast, youtubeTitle, youtubeUrl]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="text-sm font-medium">Imagens</label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <MediaLibraryPicker onSelect={async (imgs) => {
            const currentCount = images?.length || 0;
            for (let i = 0; i < imgs.length; i++) {
              const { error } = await supabase.from("property_images").insert({
                property_id: propertyId,
                url: imgs[i].url,
                alt: imgs[i].alt,
                display_order: currentCount + i,
              });
              if (error) {
                toast({ title: "Erro", description: error.message, variant: "destructive" });
                return;
              }
            }
            queryClient.invalidateQueries({ queryKey: ["property-images", propertyId] });
            queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
            toast({ title: "Imagens importadas!" });
          }} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Upload
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/80 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Adicionar vídeo do YouTube</p>
            <p className="text-xs text-muted-foreground">Cole o link do vídeo para incluir na galeria de mídia do imóvel.</p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={addYoutubeVideo}
            className="gap-2"
          >
            <Play className="h-3 w-3" />
            Adicionar vídeo
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Link do YouTube</label>
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Título do vídeo (opcional)</label>
            <input
              type="text"
              value={youtubeTitle}
              onChange={(e) => setYoutubeTitle(e.target.value)}
              placeholder="Ex: Tour pelo imóvel"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            />
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          if (files.length) {
            await uploadMutation.mutateAsync(files);
          }
          e.target.value = "";
        }}
      />

      {uploading && (
        <p className="mt-2 text-sm text-muted-foreground">
          {processing ? "Processando e carimbando imagens..." : "Enviando imagens..."}
        </p>
      )}

      {isLoading ? (
        <div className="flex gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 w-28 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : !images?.length ? (
        <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground">
          <ImageIcon className="mr-1 h-4 w-4" /> Nenhuma imagem
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Arraste para reordenar • A primeira imagem será a capa</p>
          <div className="flex flex-wrap gap-2">
            {images.map((img, index) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group relative h-20 w-28 overflow-hidden rounded-md border transition-all cursor-grab active:cursor-grabbing ${
                  dragOverIndex === index && draggedIndex !== index
                    ? "border-primary ring-2 ring-primary/30 scale-105"
                    : draggedIndex === index
                    ? "opacity-50 border-border"
                    : "border-border"
                } ${index === 0 ? "ring-2 ring-primary/50" : ""}`}
              >
                {extractYouTubeId(img.url) ? (
                  <div className="relative h-full w-full bg-black">
                    <img
                      src={getYouTubeThumbnail(extractYouTubeId(img.url)!)}
                      alt={img.alt || ""}
                      className="h-full w-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-destructive/90 p-1">
                        <Play className="h-3 w-3 fill-destructive-foreground text-destructive-foreground" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img src={img.url} alt={img.alt || ""} className="h-full w-full object-cover" />
                )}
                <div className="absolute left-0.5 top-0.5 rounded bg-card/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                </div>
                {index === 0 && (
                  <span className="absolute bottom-0.5 left-0.5 rounded bg-primary px-1 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Capa
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate({ id: img.id, url: img.url })}
                  className="absolute right-1 top-1 hidden rounded-full bg-destructive p-0.5 text-destructive-foreground group-hover:block"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Library, Check, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { isYouTubeMime, extractYouTubeId, getYouTubeThumbnail } from "@/lib/youtube";

interface Props {
  onSelect: (images: { url: string; alt: string }[]) => void;
}

export function MediaLibraryPicker({ onSelect }: Props) {
  const { tenantId, isReady } = useAuth();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const { data: media, isLoading } = useQuery({
    queryKey: ["media-library", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_images")
        .select("*, properties!inner(id,tenant_id)")
        .eq("properties.tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!tenantId && open,
  });

  const filtered = media?.filter((m) => {
    if (!search) return true;
    const query = search.toLowerCase();
    const alt = m.alt?.toLowerCase() || "";
    const filename = m.url?.split("/").pop()?.split("?")[0]?.toLowerCase() || "";
    return alt.includes(query) || filename.includes(query);
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (!media) return;
    const imgs = media
      .filter((m) => selected.has(m.id))
      .map((m) => ({
        url: m.url,
        alt: m.alt || m.url?.split("/").pop()?.split("?")[0] || "",
      }));
    onSelect(imgs);
    setSelected(new Set());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1">
          <Library className="h-3 w-3" />
          Biblioteca
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar da Biblioteca</DialogTitle>
          <DialogDescription className="sr-only">Selecione uma imagem da sua biblioteca para este imóvel.</DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
        />
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !filtered?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma imagem encontrada</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {filtered.map((img) => {
              const isSelected = selected.has(img.id);
              return (
                <button
                  type="button"
                  key={img.id}
                  onClick={() => toggleSelect(img.id)}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                    isSelected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                  )}
                >
                  {isYouTubeMime(img.mime_type) ? (
                    <div className="relative h-full w-full bg-black">
                      <img
                        src={getYouTubeThumbnail(extractYouTubeId(img.url) || "")}
                        alt={img.alt || ""}
                        className="h-full w-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-destructive/90 p-1.5">
                          <Play className="h-4 w-4 fill-destructive-foreground text-destructive-foreground" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img src={img.url} alt={img.alt || ""} className="h-full w-full object-cover" />
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                      <div className="rounded-full bg-primary p-1">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {selected.size > 0 && (
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">{selected.size} selecionada(s)</span>
            <Button onClick={handleConfirm} className="gap-1">
              <Check className="h-4 w-4" />
              Importar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

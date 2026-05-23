/**
 * AdminCreativeStudio — Generate carousels, stories, and videos for paid traffic
 * Route: /admin/creative-studio
 *
 * Uses:
 *  - OmniRoute (LLM): layout, copy, hashtags, captions
 *  - MiniMax (video/image/music/TTS): generation
 *  - Vite env vars: VITE_MINIMAX_API_KEY, VITE_OMNIRoute_API_KEY
 */

import { useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useProperties } from "@/hooks/use-properties";
import { useOmniRoute } from "@/hooks/use-omniroute";
import { createMiniMaxClient } from "@/integrations/minimax/client";
import { generateCreativeAll, type CreativeRequest } from "@/lib/creative/pipeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const MINIMAX_KEY = import.meta.env.VITE_MINIMAX_API_KEY as string;
const OMNIRoute_KEY = import.meta.env.VITE_OMNIRoute_API_KEY as string;

export function AdminCreativeStudio() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { data: properties } = useProperties();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(propertyId ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [format, setFormat] = useState<CreativeRequest["format"]>("all");
  const [tone, setTone] = useState<CreativeRequest["tone"]>("premium");
  const [platform, setPlatform] = useState<CreativeRequest["platform"]>("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<Awaited<ReturnType<typeof generateCreativeAll>> | null>(null);

  const selectedProperty = properties?.find((p) => p.id === selectedPropertyId);
  const selectedPhotos = selectedProperty?.photos ?? [];

  const handleGenerate = async () => {
    if (!selectedProperty) {
      toast.error("Selecione um imóvel primeiro.");
      return;
    }
    if (!MINIMAX_KEY || !OMNIRoute_KEY) {
      toast.error("Configure VITE_MINIMAX_API_KEY e VITE_OMNIRoute_API_KEY no .env");
      return;
    }

    setIsGenerating(true);
    try {
      const request: CreativeRequest = {
        property: selectedProperty as unknown as import("@/integrations/omniroute/client").PropertyContext,
        photos: selectedPhotos,
        format,
        tone,
        platform,
        includeVoiceover: true,
        includeMusic: true,
      };

      const miniMaxConfig = { apiKey: MINIMAX_KEY, groupId: "arruda-imobi" };
      const output = await generateCreativeAll(request, miniMaxConfig, OMNIRoute_KEY);
      setResults(output);
      toast.success("Criativos gerados com sucesso!");
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Layout title="Creative Studio — Tráfego Pago">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Creative Studio</h1>
            <p className="text-muted-foreground">
              Gere carrosséis, stories e vídeos para anúncios com IA
            </p>
          </div>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span className="rounded bg-green-100 px-2 py-1 text-green-700">MiniMax: {MINIMAX_KEY ? "ON" : "OFF"}</span>
            <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">OmniRoute: {OMNIRoute_KEY ? "ON" : "OFF"}</span>
          </div>
        </div>

        {/* Step 1: Select Property */}
        <Card>
          <CardHeader><CardTitle>1. Selecione o Imóvel</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger><SelectValue placeholder="Buscar imóvel..." /></SelectTrigger>
              <SelectContent>
                {(properties ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.titulo ?? p.id} — {p.bairro} — {p.preco ? `R$ ${Number(p.preco).toLocaleString("pt-BR")}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedProperty && (
              <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 md:grid-cols-4">
                <InfoBadge label="Tipo" value={selectedProperty.tipo ?? "-"} />
                <InfoBadge label="Bairro" value={selectedProperty.bairro ?? "-"} />
                <InfoBadge label="Preço" value={selectedProperty.preco ? `R$ ${Number(selectedProperty.preco).toLocaleString("pt-BR")}` : "-"} />
                <InfoBadge label="Fotos" value={`${selectedPhotos.length}`} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Choose Format & Tone */}
        <Card>
          <CardHeader><CardTitle>2. Configure o Criativo</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Formato</label>
                <Select value={format} onValueChange={(v) => setFormat(v as CreativeRequest["format"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tudo (Carrossel + Story + Vídeo)</SelectItem>
                    <SelectItem value="carousel">Carrossel (Meta Ads)</SelectItem>
                    <SelectItem value="story">Story (1080x1920)</SelectItem>
                    <SelectItem value="video">Vídeo (MiniMax)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tom</label>
                <Select value={tone} onValueChange={(v) => setTone(v as CreativeRequest["tone"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="luxury">Luxo</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="family">Familiar</SelectItem>
                    <SelectItem value="modern">Moderno</SelectItem>
                    <SelectItem value="urgent">Urgência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Plataforma</label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as CreativeRequest["platform"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Generate */}
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={isGenerating || !selectedProperty || !MINIMAX_KEY || !OMNIRoute_KEY}
              >
                {isGenerating ? (
                  <>Gerando criativos com IA...</>
                ) : (
                  <>Gerar Criativos com MiniMax + OmniRoute</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Usa OmniRoute (LLM) para layout + copy e MiniMax (vídeo/imagem/música) para geração
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Results */}
        {results && (
          <Tabs defaultValue={results.carousel ? "carousel" : results.story ? "story" : "video"}>
            <TabsList>
              {results.carousel && <TabsTrigger value="carousel">Carrossel</TabsTrigger>}
              {results.story && <TabsTrigger value="story">Stories</TabsTrigger>}
              {results.video && <TabsTrigger value="video">Vídeo</TabsTrigger>}
            </TabsList>

            {results.carousel && (
              <TabsContent value="carousel" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Carrossel — {results.carousel.slides.length} slides</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {results.carousel.slides.map((slide, i) => (
                        <div key={i} className="min-w-[300px] rounded-xl border p-4 shadow-sm">
                          <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                            {slide.imageUrl ? (
                              <img src={slide.imageUrl} alt={`Slide ${i + 1}`} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-muted-foreground">Sem imagem</div>
                            )}
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="font-semibold">{slide.headline}</p>
                            {slide.subheadline && <p className="text-sm text-muted-foreground">{slide.subheadline}</p>}
                            {slide.cta && <p className="text-xs font-medium text-primary">{slide.cta}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-2 rounded-lg border p-4">
                      <p className="text-sm font-medium">Legenda:</p>
                      <p className="text-sm">{results.carousel.caption}</p>
                      <p className="text-xs text-muted-foreground">{results.carousel.hashtags.join(" ")}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {results.story && (
              <TabsContent value="story" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Stories — {results.story.slides.length} telas ({results.story.totalDuration}s total)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {results.story.slides.map((slide, i) => (
                        <div key={i} className="min-w-[120px] rounded-lg border p-2 text-center">
                          <div className="aspect-[9/16] w-[120px] overflow-hidden rounded bg-muted">
                            {slide.imageUrl ? (
                              <img src={slide.imageUrl} alt={`Tela ${i + 1}`} className="h-full w-full object-cover" />
                            ) : (
                              <div
                                className="flex h-full items-center justify-center p-1 text-xs"
                                style={{ backgroundColor: slide.backgroundColor }}
                              >
                                <span className="text-white">{slide.text}</span>
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-xs">{slide.text.slice(0, 40)}</p>
                          <p className="text-xs text-muted-foreground">{slide.duration}s · {slide.animation}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {results.video && (
              <TabsContent value="video" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Vídeo — {results.video.duration}s</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {results.video.thumbnailUrl && (
                      <img src={results.video.thumbnailUrl} alt="Thumbnail" className="w-full max-w-sm rounded-lg" />
                    )}
                    {results.video.videoUrl && (
                      <video src={results.video.videoUrl} controls className="w-full max-w-sm rounded-lg" />
                    )}
                    <div className="space-y-2 rounded-lg border p-4">
                      <p className="text-sm font-medium">Legenda:</p>
                      <p className="text-sm">{results.video.caption}</p>
                      <p className="text-xs text-muted-foreground">{results.video.hashtags.join(" ")}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </Layout>
  );
}

function InfoBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
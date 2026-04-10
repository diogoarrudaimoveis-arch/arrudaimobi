import { useState, useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { Plus, Pencil, Trash2, Loader2, Home, ImageIcon, Search, HelpCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PropertyImageUpload } from "@/components/admin/PropertyImageUpload";
import { useIBGEStates, useIBGECities } from "@/hooks/use-ibge-locations";
import { CurrencyInput } from "@/components/ui/currency-input";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOwners, useCreateOwnerMutation } from "@/hooks/use-owners";
import { CheckCircle2, Circle, AlertCircle, Sparkles, Wand2, Share2, Target, BarChart3, FileText, Camera, Globe } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast as sonnerToast } from "sonner";
import { DocumentManager } from "@/components/admin/DocumentManager";
import { Switch } from "@/components/ui/switch";

const DEFAULT_PAGE_SIZE = 10;

const AdminProperties = () => {
  const { tenantId, user, isReady, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const handleCepLookup = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      toast({ title: "CEP inválido", description: "Digite um CEP com 8 dígitos", variant: "destructive" });
      return;
    }
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast({ title: "CEP não encontrado", variant: "destructive" });
        return;
      }
      setForm((prev) => ({
        ...prev,
        address: data.logradouro || prev.address,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
      toast({ title: "Endereço preenchido!" });
    } catch {
      toast({ title: "Erro ao buscar CEP", variant: "destructive" });
    } finally {
      setFetchingCep(false);
    }
  }, [toast]);

  const [form, setForm] = useState({
    title: "", 
    description: "", 
    type_id: "", 
    purpose: "sale" as string,
    status: "available" as string,
    price: "", 
    price_condominium: "",
    price_iptu: "",
    area: "", 
    area_total: "",
    area_useful: "",
    bedrooms: "0", 
    suites: "0",
    living_rooms: "0",
    bathrooms: "0", 
    garages: "0",
    address: "", 
    city: "", 
    state: "", 
    neighborhood: "", 
    zip_code: "",
    number: "",
    latitude: "", 
    longitude: "",
    property_code: "",
    owner_id: "",
    featured: false,
    marketing_pixels: {
      meta: "",
      google: "",
      tiktok: "",
      pinterest: ""
    }
  });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [portalListings, setPortalListings] = useState<Record<string, { active: boolean, modality: string }>>({});
  const { data: owners } = useOwners();
  const createOwnerMutation = useCreateOwnerMutation();
  const [newOwnerName, setNewOwnerName] = useState("");
  const [activeTab, setActiveTab] = useState("basicos");

  const { data: propertiesData, isLoading } = useQuery({
    queryKey: ["admin-properties", tenantId, page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from("properties")
        .select("*, property_types(name), property_images(url)", { count: "exact" })
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!isAdmin) q = q.eq("agent_id", user!.id);

      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
    enabled: isReady && !!tenantId,
  });

  const properties = propertiesData?.data || [];
  const totalProperties = propertiesData?.total || 0;
  const totalPages = Math.ceil(totalProperties / pageSize);

  const { data: propertyTypes } = useQuery({
    queryKey: ["property-types", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("property_types")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("active", true);
      return data || [];
    },
    enabled: isReady && !!tenantId,
  });

  const { data: amenities } = useQuery({
    queryKey: ["amenities", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("amenities")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name");
      return data || [];
    },
    enabled: isReady && !!tenantId,
  });
  
  // Fetch active portal integrations
  const { data: activePortals } = useQuery({
    queryKey: ["portal_integrations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_integrations")
        .select("*")
        .eq("status", "ativo");
      if (error) throw error;
      return data || [];
    },
    enabled: isReady && !!tenantId,
  });

  const { data: ibgeStates } = useIBGEStates();
  const { data: ibgeCities } = useIBGECities(form.state);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        tenant_id: tenantId!,
        agent_id: user!.id,
        title: form.title,
        description: form.description,
        type_id: form.type_id || null,
        purpose: form.purpose as "sale" | "rent",
        price: Number(form.price),
        price_condominium: Number(form.price_condominium),
        price_iptu: Number(form.price_iptu),
        area: Number(form.area),
        area_total: Number(form.area_total || form.area),
        area_useful: Number(form.area_useful || form.area),
        bedrooms: Number(form.bedrooms),
        suites: Number(form.suites),
        living_rooms: Number(form.living_rooms),
        bathrooms: Number(form.bathrooms),
        garages: Number(form.garages),
        address: form.address,
        city: form.city,
        state: form.state,
        neighborhood: form.neighborhood,
        zip_code: form.zip_code,
        property_code: form.property_code || undefined,
        owner_id: form.owner_id || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        featured: form.featured,
        status: form.status,
        marketing_pixels: form.marketing_pixels,
      };

      let propertyId: string;
      if (editingId) {
        const { error } = await supabase.from("properties").update(payload).eq("id", editingId);
        if (error) throw error;
        propertyId = editingId;
      } else {
        const { data, error } = await supabase.from("properties").insert(payload).select("id").single();
        if (error) throw error;
        propertyId = data.id;
      }

      // Save amenities
      await supabase.from("property_amenities").delete().eq("property_id", propertyId);
      if (selectedAmenities.length > 0) {
        const rows = selectedAmenities.map((amenity_id) => ({ property_id: propertyId, amenity_id }));
        const { error: amErr } = await supabase.from("property_amenities").insert(rows);
        if (amErr) throw amErr;
      }

      // Save portal listngs
      await supabase.from("property_portal_listing").delete().eq("property_id", propertyId);
      const listingsToInsert = Object.entries(portalListings)
        .filter(([_, data]) => data.active)
        .map(([portal_id, data]) => ({
          property_id: propertyId,
          portal_id,
          status: "ativo",
          modality: data.modality as any
        }));

      if (listingsToInsert.length > 0) {
        const { error: plErr } = await supabase.from("property_portal_listing").insert(listingsToInsert);
        if (plErr) throw plErr;
      }

      return propertyId;
    },
    onSuccess: (id: string) => {
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      if (editingId) {
        toast({ title: "Imóvel atualizado!" });
        resetForm();
        setDialogOpen(false);
      } else {
        toast({ title: "Imóvel criado! Agora adicione as imagens." });
        setEditingId(id);
      }
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      toast({ title: "Imóvel removido" });
    },
  });

  const resetForm = () => {
    setForm({
      title: "", 
      description: "", 
      type_id: "", 
      purpose: "sale",
      status: "available",
      price: "", 
      price_condominium: "",
      price_iptu: "",
      area: "", 
      area_total: "",
      area_useful: "",
      bedrooms: "0", 
      suites: "0",
      living_rooms: "0",
      bathrooms: "0", 
      garages: "0",
      address: "", 
      city: "", 
      state: "", 
      neighborhood: "", 
      zip_code: "",
      number: "",
      latitude: "", 
      longitude: "",
      property_code: "",
      owner_id: "",
      featured: false,
      marketing_pixels: {
        meta: "",
        google: "",
        tiktok: "",
        pinterest: ""
      }
    });
    setSelectedAmenities([]);
    setPortalListings({});
    setEditingId(null);
    setActiveTab("basicos");
  };

  const openEdit = async (p: any) => {
    setEditingId(p.id);
    setForm({
      title: p.title || "", 
      description: p.description || "", 
      type_id: p.type_id || "",
      purpose: p.purpose || "sale", 
      status: p.status || "available",
      price: String(p.price || ""), 
      price_condominium: String(p.price_condominium || ""),
      price_iptu: String(p.price_iptu || ""),
      area: String(p.area || ""), 
      area_total: String(p.area_total || ""),
      area_useful: String(p.area_useful || ""),
      bedrooms: String(p.bedrooms || 0), 
      suites: String(p.suites || 0),
      living_rooms: String(p.living_rooms || 0),
      bathrooms: String(p.bathrooms || 0),
      garages: String(p.garages || 0), 
      address: p.address || "", 
      city: p.city || "",
      state: p.state || "", 
      neighborhood: p.neighborhood || "", 
      zip_code: p.zip_code || "",
      number: p.number || "",
      latitude: p.latitude ? String(p.latitude) : "", 
      longitude: p.longitude ? String(p.longitude) : "",
      property_code: p.property_code || "",
      owner_id: p.owner_id || "",
      featured: p.featured || false,
      marketing_pixels: p.marketing_pixels || {
        meta: "",
        google: "",
        tiktok: "",
        pinterest: ""
      }
    });
      const { data: amenData } = await supabase.from("property_amenities").select("amenity_id").eq("property_id", p.id);
      if (amenData) setSelectedAmenities(amenData.map(a => a.amenity_id));

      const { data: portalData } = await supabase.from("property_portal_listing").select("portal_id, modality").eq("property_id", p.id);
      if (portalData) {
        const initialListings: Record<string, { active: boolean, modality: string }> = {};
        portalData.forEach(pl => {
          initialListings[pl.portal_id] = { active: true, modality: pl.modality };
        });
        setPortalListings(initialListings);
      }

      setDialogOpen(true);
    };

  const checklistItems = useMemo(() => {
    const currentProperty = properties.find(p => p.id === editingId);
    const hasPhotos = (currentProperty?.property_images?.length || 0) > 0;
    
    return [
      { id: "fotos", label: "Fotos", completed: hasPhotos },
      { id: "endereco", label: "Endereço completo", completed: !!(form.zip_code?.trim() && form.address?.trim() && form.city && form.state) },
      { id: "descricao", label: "Descrição", completed: (form.description?.length || 0) > 20 },
      { id: "valor", label: "Valor", completed: Number(form.price) > 0 },
      { id: "proprietario", label: "Proprietário", completed: !!form.owner_id },
      { id: "docs", label: "Documentação", completed: !!editingId },
    ];
  }, [form, editingId, properties]);

  const isPublishable = checklistItems.every(item => item.completed);


  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Imóveis</h1>
            <p className="text-muted-foreground">{totalProperties} imóveis cadastrados</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Imóvel</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-[#003366]" />
                  {editingId ? `Editar Imóvel: ${form.property_code}` : "Novo Cadastro de Imóvel"}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Formulário para cadastrar ou editar os detalhes completos do imóvel.
                </DialogDescription>
              </DialogHeader>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 border-b border-border">
                  <TabsList className="bg-transparent h-12 gap-6 w-full justify-start rounded-none">
                    <TabsTrigger value="basicos" className="data-[state=active]:border-b-2 data-[state=active]:border-[#003366] rounded-none bg-transparent px-0 pb-2">Básicos</TabsTrigger>
                    <TabsTrigger value="proprietario" className="data-[state=active]:border-b-2 data-[state=active]:border-[#003366] rounded-none bg-transparent px-0 pb-2">Proprietário</TabsTrigger>
                    <TabsTrigger value="caracteristicas" className="data-[state=active]:border-b-2 data-[state=active]:border-[#003366] rounded-none bg-transparent px-0 pb-2">Características</TabsTrigger>
                    <TabsTrigger value="docs" className="data-[state=active]:border-b-2 data-[state=active]:border-[#003366] rounded-none bg-transparent px-0 pb-2">Docs</TabsTrigger>
                    <TabsTrigger value="midia" className="data-[state=active]:border-b-2 data-[state=active]:border-[#003366] rounded-none bg-transparent px-0 pb-2">Mídia</TabsTrigger>
                    <TabsTrigger value="marketing" className="data-[state=active]:border-b-2 data-[state=active]:border-[#003366] rounded-none bg-transparent px-0 pb-2">Marketing</TabsTrigger>
                    <TabsTrigger value="checklist" className="data-[state=active]:border-b-2 data-[state=active]:border-[#003366] rounded-none bg-transparent px-0 pb-2 flex gap-1.5 items-center">
                      Checklist
                      {!isPublishable && <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <form id="property-form" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-6">
                    
                    {/* ABA BÁSICOS */}
                    <TabsContent value="basicos" className="mt-0 space-y-6">
                      <div className="grid gap-6 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <Label>Título do Imóvel</Label>
                          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Apartamento Moderno com Vista para o Mar" />
                        </div>
                        <div>
                          <Label>Código do Imóvel</Label>
                          <Input value={form.property_code} onChange={(e) => setForm({ ...form, property_code: e.target.value })} placeholder="Ex: IMO0047" />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <Target className="h-4 w-4 text-[#003366]" /> Localização
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-4">
                          <div className="sm:col-span-1">
                            <Label>CEP</Label>
                            <div className="flex gap-1">
                              <Input value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value.replace(/\D/g, "").slice(0, 8) })} placeholder="00000000" />
                              <Button type="button" variant="outline" size="icon" disabled={fetchingCep} onClick={() => handleCepLookup(form.zip_code)}>
                                {fetchingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <Label>Logradouro</Label>
                            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                          </div>
                          <div>
                            <Label>Número</Label>
                            <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div>
                            <Label>Bairro</Label>
                            <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                          </div>
                          <div>
                            <Label>Estado</Label>
                            <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v, city: "" })}>
                              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                              <SelectContent>
                                {ibgeStates?.map((s) => (
                                  <SelectItem key={s.sigla} value={s.sigla}>{s.sigla}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Cidade</Label>
                            <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })} disabled={!form.state}>
                              <SelectTrigger><SelectValue placeholder="Cidade" /></SelectTrigger>
                              <SelectContent>
                                {ibgeCities?.map((c) => (
                                  <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-[#003366]" /> Valores e Status
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-4">
                          <div>
                            <Label>Preço de Venda/Aluguel</Label>
                            <CurrencyInput value={form.price} onValueChange={(raw) => setForm({ ...form, price: raw })} />
                          </div>
                          <div>
                            <Label>Condomínio</Label>
                            <CurrencyInput value={form.price_condominium} onValueChange={(raw) => setForm({ ...form, price_condominium: raw })} />
                          </div>
                          <div>
                            <Label>IPTU</Label>
                            <CurrencyInput value={form.price_iptu} onValueChange={(raw) => setForm({ ...form, price_iptu: raw })} />
                          </div>
                          <div>
                            <Label>Status</Label>
                            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="available">Disponível</SelectItem>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="sold">Vendido</SelectItem>
                                <SelectItem value="rented">Alugado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* ABA PROPRIETÁRIO */}
                    <TabsContent value="proprietario" className="mt-0 space-y-6">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm">Vínculo com Proprietário</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <Label>Selecionar Existente</Label>
                            <Select value={form.owner_id} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
                              <SelectTrigger><SelectValue placeholder="Procure por nome ou CPF" /></SelectTrigger>
                              <SelectContent>
                                {owners?.map(o => (
                                  <SelectItem key={o.id} value={o.id}>{o.name} ({o.phone})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <span className="text-sm text-muted-foreground">Ou cadastre um novo abaixo</span>
                          </div>
                        </div>

                        <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                          <h4 className="text-sm font-medium">Novo Proprietário (Rápido)</h4>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Input placeholder="Nome Completo" value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)} />
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="text-[#003366] border-[#003366]"
                              onClick={() => {
                                if (!newOwnerName.trim()) return;
                                createOwnerMutation.mutate({ name: newOwnerName }, {
                                  onSuccess: (o) => {
                                    setForm({ ...form, owner_id: o.id });
                                    setNewOwnerName("");
                                  }
                                });
                              }}
                              disabled={createOwnerMutation.isPending}
                            >
                              {createOwnerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                              Criar e Vincular
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* ABA CARACTERÍSTICAS */}
                    <TabsContent value="caracteristicas" className="mt-0 space-y-6">
                      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                        <div>
                          <Label>Dormitórios</Label>
                          <Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
                        </div>
                        <div>
                          <Label>Suítes</Label>
                          <Input type="number" value={form.suites} onChange={(e) => setForm({ ...form, suites: e.target.value })} />
                        </div>
                        <div>
                          <Label>Banheiros</Label>
                          <Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
                        </div>
                        <div>
                          <Label>Salas</Label>
                          <Input type="number" value={form.living_rooms} onChange={(e) => setForm({ ...form, living_rooms: e.target.value })} />
                        </div>
                        <div>
                          <Label>Vagas Garagem</Label>
                          <Input type="number" value={form.garages} onChange={(e) => setForm({ ...form, garages: e.target.value })} />
                        </div>
                        <div>
                          <Label>Área Útil (m²)</Label>
                          <Input type="number" value={form.area_useful} onChange={(e) => setForm({ ...form, area_useful: e.target.value })} />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Descrição do Imóvel</Label>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="text-[#003366] gap-1.5"
                            onClick={async () => {
                              if (!form.city || !form.neighborhood) {
                                sonnerToast.error("Preencha ao menos Cidade e Bairro para gerar a descrição.");
                                return;
                              }
                              
                              sonnerToast.info("IA Processando...");
                              try {
                                const { data, error } = await supabase.functions.invoke('generate-ai-content', {
                                  body: {
                                    feature: 'property_description',
                                    prompt: `Gere uma descrição atraente e persuasiva para um imóvel. Foque em benefícios e emoção.`,
                                    context: {
                                      city: form.city,
                                      neighborhood: form.neighborhood,
                                      bedrooms: form.bedrooms,
                                      suites: form.suites,
                                      bathrooms: form.bathrooms,
                                      area: form.area_useful,
                                      price: form.price,
                                      type: propertyTypes.find(t => t.id === form.type_id)?.name || 'imóvel'
                                    }
                                  }
                                });

                                if (error) throw error;
                                if (data.error) throw new Error(data.error);

                                setForm({ ...form, description: data.content });
                                sonnerToast.success(`Descrição gerada via ${data.provider}!`);
                              } catch (err: any) {
                                console.error(err);
                                sonnerToast.error(`Erro na IA: ${err.message || 'Tente configurar as chaves de API primeiro.'}`);
                              }
                            }}
                          >
                            <Sparkles className="h-4 w-4" />
                            Gerar com IA
                          </Button>
                        </div>
                        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-32" />
                      </div>

                      {amenities && (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {amenities.map((a) => (
                            <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border p-2 has-[:checked]:border-[#003366] has-[:checked]:bg-[#003366]/5">
                              <input type="checkbox" checked={selectedAmenities.includes(a.id)} onChange={(e) => {
                                setSelectedAmenities((prev) => e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id));
                              }} className="accent-[#003366] h-4 w-4" />
                              {a.name}
                            </label>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* ABA DOCS */}
                    <TabsContent value="docs" className="mt-0 space-y-4">
                      <DocumentManager 
                        targetId={editingId || ""} 
                        targetField="property_id" 
                        bucketName="property-documents" 
                        dbTable="property_documents" 
                      />
                    </TabsContent>

                    {/* ABA MÍDIA */}
                    <TabsContent value="midia" className="mt-0 space-y-6">
                      <div className="flex items-start gap-3 p-4 bg-[#003366]/5 rounded-lg border border-[#003366]/20">
                        <Camera className="h-5 w-5 text-[#003366] shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold text-[#003366]">Otimização Automática</p>
                          <p className="text-muted-foreground">Suas fotos serão redimensionadas e otimizadas para carregamento rápido, além de receberem a marca d'água da imobiliária.</p>
                        </div>
                      </div>
                      {editingId ? (
                        <PropertyImageUpload propertyId={editingId} />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/10 rounded-xl border border-dashed">
                          <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                          <p className="font-medium">Salve o imóvel primeiro para habilitar a galeria</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* ABA MARKETING */}
                    <TabsContent value="marketing" className="mt-0 space-y-6">
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-600" /> Pixel Meta (Facebook/Instagram)
                          </Label>
                          <Input placeholder="ID do Pixel" value={form.marketing_pixels.meta} onChange={(e) => setForm({ ...form, marketing_pixels: { ...form.marketing_pixels, meta: e.target.value } })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-red-500" /> Google Ads ID
                          </Label>
                          <Input placeholder="AW-00000000" value={form.marketing_pixels.google} onChange={(e) => setForm({ ...form, marketing_pixels: { ...form.marketing_pixels, google: e.target.value } })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-black" /> TikTok Pixel
                          </Label>
                          <Input placeholder="Code ID" value={form.marketing_pixels.tiktok} onChange={(e) => setForm({ ...form, marketing_pixels: { ...form.marketing_pixels, tiktok: e.target.value } })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-red-700" /> Pinterest Tag
                          </Label>
                          <Input placeholder="Tag ID" value={form.marketing_pixels.pinterest} onChange={(e) => setForm({ ...form, marketing_pixels: { ...form.marketing_pixels, pinterest: e.target.value } })} />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 p-4 border rounded-lg">
                        <div className="flex-1 space-y-0.5">
                          <Label className="text-base">Anúncio em Destaque</Label>
                          <p className="text-sm text-muted-foreground">Fixar no topo das buscas e carrosséis principais do site.</p>
                        </div>
                        <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-5 w-5 accent-[#003366]" />
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Globe className="h-4 w-4 text-[#003366]" /> Portais de Divulgação
                          </h3>
                        </div>

                        {!isPublishable && (
                          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <p>Este imóvel não será exportado para os portais até que atinja a qualidade mínima exigida no Checklist.</p>
                          </div>
                        )}

                        <div className="space-y-3">
                          {activePortals?.map((portal) => (
                            <div key={portal.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                              <div className="flex items-center gap-3">
                                <Switch 
                                  checked={portalListings[portal.id]?.active || false}
                                  onCheckedChange={(checked) => {
                                    setPortalListings(prev => ({
                                      ...prev,
                                      [portal.id]: { 
                                        active: checked, 
                                        modality: prev[portal.id]?.modality || "Simples" 
                                      }
                                    }));
                                  }}
                                />
                                <span className="font-medium text-sm">{portal.name}</span>
                              </div>
                              
                              {portalListings[portal.id]?.active && (
                                <Select 
                                  value={portalListings[portal.id].modality}
                                  onValueChange={(value) => {
                                    setPortalListings(prev => ({
                                      ...prev,
                                      [portal.id]: { ...prev[portal.id], modality: value }
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="w-[140px] h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Simples">Simples</SelectItem>
                                    <SelectItem value="Destaque">Destaque</SelectItem>
                                    <SelectItem value="Super Destaque">Super Destaque</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          ))}
                          
                          {activePortals?.length === 0 && (
                            <p className="text-xs text-muted-foreground italic text-center py-2">
                              Nenhuma integração de portal configurada para esta imobiliária.
                            </p>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* ABA CHECKLIST */}
                    <TabsContent value="checklist" className="mt-0 space-y-6">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Qualidade do Anúncio</h3>
                        <p className="text-sm text-muted-foreground">Complete todos os requisitos obrigatórios para poder publicar este imóvel no site oficial.</p>
                      </div>

                      <div className="grid gap-3">
                        {checklistItems.map((item) => (
                          <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${item.completed ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-border opacity-70'}`}>
                            <div className="flex items-center gap-3">
                              {item.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                              <span className={`font-medium ${item.completed ? 'text-green-900' : 'text-foreground'}`}>{item.label}</span>
                            </div>
                            {item.completed ? (
                              <Badge className="bg-green-600">Completo</Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-500 text-amber-600">Pendente</Badge>
                            )}
                          </div>
                        ))}
                      </div>

                      {!isPublishable && (
                        <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                          <AlertCircle className="h-5 w-5 shrink-0" />
                          <p>Alguns dados essenciais estão pendentes. O botão de publicação ficará bloqueado até que a qualidade mínima seja atingida.</p>
                        </div>
                      )}
                    </TabsContent>

                  </form>
                </div>

                <DialogFooter className="p-6 border-t border-border flex-row justify-between items-center sm:justify-between">
                  <span className="text-xs text-muted-foreground">
                    Status: <span className="font-semibold uppercase">{form.status}</span>
                  </span>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button 
                      form="property-form" 
                      type="submit" 
                      className={`gap-2 min-w-[140px] ${isPublishable ? 'bg-[#003366]' : 'bg-muted text-muted-foreground opacity-50'}`}
                      disabled={saveMutation.isPending || (!editingId && !isPublishable)}
                    >
                      {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "Salvar Alterações" : "Publicar Imóvel"}
                    </Button>
                  </div>
                </DialogFooter>
              </Tabs>
            </DialogContent>

          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !properties?.length ? (
          <Card className="flex flex-col items-center py-12 text-center">
            <Home className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-display font-semibold">Nenhum imóvel cadastrado</p>
            <p className="text-sm text-muted-foreground">Clique em "Novo Imóvel" para começar</p>
          </Card>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Finalidade</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.property_code || "—"}</TableCell>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>{p.property_types?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.purpose === "sale" ? "Venda" : "Aluguel"}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(Number(p.price))}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "available" ? "default" : "secondary"}>
                          {p.status === "available" ? "Disponível" : p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteConfirmId(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={totalProperties}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          </>
        )}
      </div>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Imóvel</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este imóvel? Todas as imagens e dados associados serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteConfirmId) { deleteMutation.mutate(deleteConfirmId); setDeleteConfirmId(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminProperties;

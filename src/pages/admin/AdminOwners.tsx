import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useOwners, useCreateOwnerMutation, useUpdateOwnerMutation, useDeleteOwnerMutation } from "@/hooks/use-owners";
import { Plus, Pencil, Trash2, Loader2, User, Landmark, Home, FileText, Download, Save, X, Signature } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import SignatureCanvas from "react-signature-canvas";
import { jsPDF } from "jspdf";
import { TablePagination } from "@/components/ui/table-pagination";
import { DocumentManager } from "@/components/admin/DocumentManager";

const DEFAULT_PAGE_SIZE = 10;

const AdminOwners = () => {
  const { tenantId, isReady, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pessoais");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: owners, isLoading } = useOwners();
  const updateMutation = useUpdateOwnerMutation();
  const deleteMutation = useDeleteOwnerMutation();
  const createMutation = useCreateOwnerMutation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cpf_cnpj: "",
    bank_name: "",
    bank_agency: "",
    bank_account: "",
    pix_key: "",
    signature_url: ""
  });

  const resetForm = () => {
    setForm({
      name: "", email: "", phone: "", cpf_cnpj: "",
      bank_name: "", bank_agency: "", bank_account: "", pix_key: "",
      signature_url: ""
    });
    setEditingOwner(null);
    setActiveTab("pessoais");
  };

  const handleOpenEdit = (owner: any) => {
    setEditingOwner(owner);
    setForm({
      name: owner.name || "",
      email: owner.email || "",
      phone: owner.phone || "",
      cpf_cnpj: owner.cpf_cnpj || "",
      bank_name: owner.bank_name || "",
      bank_agency: owner.bank_agency || "",
      bank_account: owner.bank_account || "",
      pix_key: owner.pix_key || "",
      signature_url: owner.signature_url || ""
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOwner) {
      updateMutation.mutate({ id: editingOwner.id, ...form }, {
        onSuccess: () => setDialogOpen(false)
      });
    } else {
      createMutation.mutate(form, {
        onSuccess: () => {
          setDialogOpen(false);
          resetForm();
        }
      });
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const saveSignature = async () => {
    if (sigCanvas.current?.isEmpty()) {
      toast({ title: "Assinatura vazia", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const canvas = sigCanvas.current?.getTrimmedCanvas();
      const blob = await new Promise<Blob>((resolve) => canvas?.toBlob((b) => resolve(b!), "image/png"));
      
      const fileName = `${editingOwner?.id || 'new'}_${Date.now()}.png`;
      const { data, error } = await supabase.storage
        .from("owner-signatures")
        .upload(fileName, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("owner-signatures")
        .getPublicUrl(fileName);

      setForm({ ...form, signature_url: publicUrl });
      toast({ title: "Assinatura capturada com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao salvar assinatura", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    if (!editingOwner) return;
    
    const doc = new jsPDF();
    const primaryColor = "#003366";

    // Header
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor("#FFFFFF");
    doc.setFontSize(22);
    doc.text("AUTORIZAÇÃO DE VENDA IMOBILIÁRIA", 105, 25, { align: "center" });

    // Content
    doc.setTextColor("#333333");
    doc.setFontSize(12);
    let y = 60;

    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO PROPRIETÁRIO:", 20, y);
    doc.setFont("helvetica", "normal");
    y += 10;
    doc.text(`Nome: ${form.name}`, 20, y);
    y += 7;
    doc.text(`CPF/CNPJ: ${form.cpf_cnpj}`, 20, y);
    y += 7;
    doc.text(`E-mail: ${form.email}`, 20, y);
    y += 7;
    doc.text(`Telefone: ${form.phone}`, 20, y);

    y += 20;
    doc.setFont("helvetica", "bold");
    doc.text("TERMO DE AUTORIZAÇÃO:", 20, y);
    doc.setFont("helvetica", "normal");
    y += 10;
    const termText = "Pelo presente instrumento, o proprietário acima qualificado autoriza a Arruda Imobi a promover a venda de seus imóveis cadastrados no sistema, respeitando as condições de exclusividade e taxas de corretagem previamente acordadas.";
    const splitText = doc.splitTextToSize(termText, 170);
    doc.text(splitText, 20, y);

    y += 40;
    if (form.signature_url) {
      doc.text("ASSINATURA DO PROPRIETÁRIO:", 20, y);
      doc.addImage(form.signature_url, "PNG", 20, y + 5, 50, 20);
    }

    doc.save(`Autorizacao_${form.name.replace(/\s+/g, "_")}.pdf`);
    toast({ title: "PDF gerado com sucesso!" });
  };

  const { data: ownerProperties } = useQuery({
    queryKey: ["owner-properties", editingOwner?.id],
    queryFn: async () => {
      if (!editingOwner?.id) return [];
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, property_code, status, price")
        .eq("owner_id", editingOwner.id);
      if (error) throw error;
      return data;
    },
    enabled: !!editingOwner?.id
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Proprietários</h1>
            <p className="text-muted-foreground">Gerenciamento de proprietários e autorizações</p>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2 bg-[#003366] hover:bg-[#002244]">
            <Plus className="h-4 w-4" /> Novo Proprietário
          </Button>
        </div>

        <Card className="overflow-hidden border-border bg-card">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[#003366]" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners?.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span>{o.email}</span>
                        <span className="text-muted-foreground">{o.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>{o.cpf_cnpj || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(o)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteConfirmId(o.id)} title="Arquivar">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 text-foreground">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-[#003366]" />
                {editingOwner ? "Editar Proprietário" : "Novo Cadastro"}
              </DialogTitle>
              <DialogDescription className="sr-only">Gerenciamento de dados do proprietário</DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 border-b border-border">
                <TabsList className="bg-transparent h-12 gap-6 w-full justify-start rounded-none">
                  <TabsTrigger value="pessoais" className="data-[state=active]:border-b-2 data-[state=active]:border-[#003366] rounded-none bg-transparent px-0 pb-2">Dados Pessoais</TabsTrigger>
                  <TabsTrigger value="bancarios" className="data-[state=active]:border-b-2 data-[state=active]:border-[#003366] rounded-none bg-transparent px-0 pb-2">Dados Bancários</TabsTrigger>
                  <TabsTrigger value="imoveis" className="data-[state=active]:border-b-2 data-[state=active]:border-[#003366] rounded-none bg-transparent px-0 pb-2">Imóveis</TabsTrigger>
                  <TabsTrigger value="documentos" className="data-[state=active]:border-b-2 data-[state=active]:border-[#003366] rounded-none bg-transparent px-0 pb-2">Documentos</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form id="owner-form" onSubmit={handleSave} className="space-y-6">
                  <TabsContent value="pessoais" className="mt-0 space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>E-mail</Label>
                        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>CPF/CNPJ</Label>
                        <Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="flex items-center gap-2"><Signature className="h-4 w-4" /> Assinatura Digital</Label>
                      {form.signature_url ? (
                        <div className="relative border rounded-lg p-2 bg-white flex flex-col items-center">
                          <img src={form.signature_url} alt="Assinatura" className="h-32 object-contain" />
                          <Button variant="ghost" size="sm" className="mt-2 text-destructive" onClick={() => setForm({...form, signature_url: ""})}>
                            <Trash2 className="h-4 w-4 mr-1" /> Remover Assinatura
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="border rounded-lg bg-white overflow-hidden shadow-inner">
                            <SignatureCanvas 
                              ref={sigCanvas}
                              penColor="black"
                              canvasProps={{ width: 600, height: 200, className: "w-full cursor-crosshair" }}
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" size="sm" onClick={clearSignature} className="gap-1">
                              <X className="h-3.5 w-3.5" /> Limpar
                            </Button>
                            <Button type="button" variant="secondary" size="sm" onClick={saveSignature} disabled={isSaving} className="gap-1">
                              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              Confirmar Assinatura
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-start">
                      <Button type="button" variant="outline" onClick={generatePDF} disabled={!editingOwner || !form.signature_url} className="gap-2 border-[#003366] text-[#003366]">
                        <FileText className="h-4 w-4" /> Gerar PDF de Autorização
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="bancarios" className="mt-0 space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Banco</Label>
                        <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="Ex: Itaú, Bradesco..." />
                      </div>
                      <div className="space-y-2">
                        <Label>Agência</Label>
                        <Input value={form.bank_agency} onChange={(e) => setForm({ ...form, bank_agency: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Conta Corrente / Poupança</Label>
                        <Input value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Chave PIX</Label>
                        <Input value={form.pix_key} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="imoveis" className="mt-0 space-y-4">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Home className="h-4 w-4" /> Imóveis Vinculados
                      </h4>
                      {ownerProperties?.length ? (
                        <div className="grid gap-3">
                          {ownerProperties.map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                              <div>
                                <p className="text-sm font-medium">{p.title}</p>
                                <p className="text-xs text-muted-foreground">{p.property_code}</p>
                              </div>
                              <Badge variant={p.status === "available" ? "default" : "secondary"}>{p.status}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Home className="h-8 w-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">Nenhum imóvel vinculado a este proprietário.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="documentos" className="mt-0 space-y-4">
                    <DocumentManager 
                      targetId={editingOwner?.id || ""} 
                      targetField="owner_id" 
                      bucketName="owner-documents" 
                      dbTable="owner_documents" 
                    />
                  </TabsContent>
                </form>
              </div>

              <DialogFooter className="p-6 border-t border-border flex gap-3">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button form="owner-form" type="submit" className="bg-[#003366] hover:bg-[#002244]" disabled={updateMutation.isPending || createMutation.isPending}>
                  {updateMutation.isPending || createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </Tabs>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar Proprietário</AlertDialogTitle>
              <AlertDialogDescription>Deseja realmente arquivar este proprietário? Ele não aparecerá nas listagens ativas, mas continuará vinculado aos imóveis históricos.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (deleteConfirmId) { deleteMutation.mutate(deleteConfirmId); setDeleteConfirmId(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminOwners;

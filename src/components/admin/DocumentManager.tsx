import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, Image as ImageIcon, Trash2, Download, 
  Loader2, Plus, File, AlertCircle, CheckCircle2 
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface DocumentManagerProps {
  targetId: string;
  targetField: "property_id" | "owner_id";
  bucketName: "property-documents" | "owner-documents";
  dbTable: "property_documents" | "owner_documents";
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export const DocumentManager = ({ targetId, targetField, bucketName, dbTable }: DocumentManagerProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();

  // 1. Fetch documents
  const { data: documents, isLoading } = useQuery({
    queryKey: [dbTable, targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(dbTable)
        .select("*")
        .eq(targetField, targetId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!targetId,
  });

  // 2. Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_FILE_SIZE) throw new Error("Arquivo muito grande (máx 10MB)");
      if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Formato não suportado (apenas PDF e Imagens)");

      setUploading(true);
      setProgress(10);

      const fileExt = file.name.split(".").pop();
      const fileName = `${targetId}/${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      setProgress(30);

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setProgress(70);

      const { error: dbError } = await supabase.from(dbTable).insert({
        [targetField]: targetId,
        name: file.name,
        url: filePath,
        file_type: file.type,
        file_size: file.size,
      });

      if (dbError) throw dbError;
      setProgress(100);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [dbTable, targetId] });
      toast.success("Documento enviado com sucesso!");
      setUploading(false);
      setProgress(0);
    },
    onError: (error: any) => {
      toast.error(`Erro no upload: ${error.message}`);
      setUploading(false);
      setProgress(0);
    },
  });

  // 3. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (doc: any) => {
      const { error: storageError } = await supabase.storage
        .from(bucketName)
        .remove([doc.url]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from(dbTable)
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [dbTable, targetId] });
      toast.success("Documento removido.");
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  // 4. Download / Signed URL Logic
  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(doc.url, 3600); // 1 hour

      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      toast.error("Erro ao gerar link de acesso.");
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
    if (type.includes("image")) return <ImageIcon className="h-4 w-4 text-blue-500" />;
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!targetId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/10 rounded-xl border border-dashed border-border">
        <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
        <p className="font-medium">Salve as informações básicas primeiro para habilitar documentos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-[#003366]">Documentos e Arquivos</h3>
          <p className="text-sm text-muted-foreground">Gerencie documentos PDF e Imagens (máx 10MB)</p>
        </div>
        <div className="relative">
          <input
            type="file"
            id="doc-upload"
            className="hidden"
            accept=".pdf,image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
            }}
            disabled={uploading}
          />
          <Button 
            asChild
            disabled={uploading}
            className="bg-[#003366] hover:bg-[#002244] gap-2"
          >
            <label htmlFor="doc-upload" className="cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Enviar Documento
            </label>
          </Button>
        </div>
      </div>

      {uploading && (
        <div className="space-y-2 p-4 border rounded-lg bg-blue-50/50">
          <div className="flex items-center justify-between text-xs font-medium text-[#003366]">
            <span>Enviando arquivo...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
        </div>
      ) : documents?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/5 rounded-xl border border-dashed border-border">
          <File className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum documento anexado ainda</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents?.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-muted/30">
                  <TableCell>{getFileIcon(doc.file_type)}</TableCell>
                  <TableCell className="font-medium text-sm truncate max-w-[200px]" title={doc.name}>
                    {doc.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(doc.created_at), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm("Deseja realmente excluir este documento permanentemente?")) {
                          deleteMutation.mutate(doc);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

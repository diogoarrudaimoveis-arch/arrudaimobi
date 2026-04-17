import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Home, User, Calendar as CalendarIcon, Clock, AlertTriangle, 
  MapPin, CheckCircle, XCircle, Info, Hash
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const appointmentSchema = z.object({
  title: z.string().min(3, "Título muito curto"),
  description: z.string().optional(),
  type: z.string(),
  priority: z.string(),
  status: z.string(),
  start_time: z.string().min(1, "Início é obrigatório"),
  duration: z.string(),
  assigned_to: z.string().min(1, "Corretor é obrigatório"),
  client_id: z.string().optional(),
  property_id: z.string().optional(),
  event_color: z.string().default("#3B82F6"),
});

const appointmentTypes = [
  { value: "Visita", label: "Visita", icon: Home, color: "#3B82F6" },
  { value: "Captação de Imóvel", label: "Captação", icon: MapPin, color: "#10B981" },
  { value: "Reunião de Equipe", label: "Reunião", icon: User, color: "#8B5CF6" },
  { value: "Proposta Urgente", label: "Proposta", icon: AlertTriangle, color: "#EF4444" },
  { value: "Pós-Venda", label: "Pós-Venda", icon: CheckCircle, color: "#F59E0B" },
];

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAppointment?: any;
}

export function AppointmentModal({ open, onOpenChange, editingAppointment }: AppointmentModalProps) {
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const form = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "Visita",
      priority: "Normal",
      status: "Agendado",
      start_time: "",
      duration: "60",
      assigned_to: "",
      client_id: "",
      property_id: "",
      event_color: "#3B82F6",
    },
  });

  useEffect(() => {
    if (editingAppointment) {
      form.reset({
        ...editingAppointment,
        start_time: editingAppointment.start_time ? new Date(editingAppointment.start_time).toISOString().slice(0, 16) : "",
        duration: String(editingAppointment.duration),
      });
    } else {
      form.reset({
        title: "",
        description: "",
        type: "Visita",
        priority: "Normal",
        status: "Agendado",
        start_time: "",
        duration: "60",
        assigned_to: "",
        client_id: "",
        property_id: "",
        event_color: "#3B82F6",
      });
    }
  }, [editingAppointment, form]);

  useEffect(() => {
    if (!open) {
      setDeleteConfirmOpen(false);
    }
  }, [open]);

  const { data: brokers } = useQuery({
    queryKey: ["brokers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, title, property_code");
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: z.infer<typeof appointmentSchema>) => {
      const { data: profile } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase.from("profiles").select("tenant_id").eq("user_id", profile.user?.id).single();
      
      const payload = {
        ...values,
        tenant_id: userProfile?.tenant_id,
        duration: parseInt(values.duration),
        start_time: new Date(values.start_time).toISOString(),
        client_id: values.client_id || null,
        property_id: values.property_id || null,
      };

      if (editingAppointment) {
        const { error } = await supabase.from("appointments").update(payload).eq("id", editingAppointment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("appointments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["busy-brokers"] });
      toast.success(editingAppointment ? "Agendamento atualizado!" : "Agendamento criado!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["busy-brokers"] });
      toast.success("Agendamento excluído com sucesso!");
      setDeleteConfirmOpen(false);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 text-white border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#003366]" />
            {editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para criar ou editar compromissos na agenda.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => upsertMutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Visita ao apartamento centro" className="bg-slate-900 border-slate-800" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-900 border-slate-800">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {appointmentTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            <div className="flex items-center gap-2">
                              <t.icon className={cn("h-4 w-4", `text-[${t.color}]`)} />
                              {t.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-900 border-slate-800">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                        <SelectItem value="Urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" className="bg-slate-900 border-slate-800" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (minutos)</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-900 border-slate-800">
                          <SelectValue placeholder="Duração" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                        <SelectItem value="240">4 horas</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Corretor Responsável *</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="bg-slate-900 border-slate-800">
                        <SelectValue placeholder="Selecione um corretor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {brokers?.map((b) => (
                        <SelectItem key={b.user_id} value={b.user_id}>{b.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-900 border-slate-800">
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {clients?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imóvel</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-900 border-slate-800">
                          <SelectValue placeholder="Selecione um imóvel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {properties?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.property_code} - {p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalhes adicionais do agendamento..." 
                      className="bg-slate-900 border-slate-800 min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-900 border-slate-800">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="Agendado">Agendado</SelectItem>
                        <SelectItem value="Confirmado">Confirmado</SelectItem>
                        <SelectItem value="Concluído">Concluído</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="event_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor do Evento</FormLabel>
                    <div className="flex gap-2 items-center">
                      <FormControl>
                        <Input type="color" className="p-1 h-10 w-20 bg-slate-900 border-slate-800" {...field} />
                      </FormControl>
                      <span className="text-xs text-muted-foreground">{field.value}</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-800">
              {editingAppointment && (
                <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" disabled={deleteMutation.isPending} className="mr-auto">
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Agendamento</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => editingAppointment && deleteMutation.mutate(editingAppointment.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsertMutation.isPending || deleteMutation.isPending} className="bg-[#003366] hover:bg-[#002244] text-white">
                {upsertMutation.isPending ? "Salvando..." : editingAppointment ? "Atualizar" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

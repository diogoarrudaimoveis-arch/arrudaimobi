import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, Users, Clock, Loader2, UserCheck, Info } from "lucide-react";
import { AppointmentModal } from "@/components/admin/agenda/AppointmentModal";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function AdminAgenda() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("user_id", user?.id).single();
      
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          profiles!assigned_to(full_name, avatar_url),
          contacts!client_id(name),
          properties!property_id(title, property_code)
        `)
        .eq("tenant_id", profile?.tenant_id);
      if (error) throw error;
      return data;
    },
  });

  const { data: busyBrokers, isLoading: loadingBusy } = useQuery({
    queryKey: ["busy-brokers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vw_busy_brokers").select("*").order("active_appointments", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  const calendarEvents = appointments?.map(appt => ({
    id: appt.id,
    title: appt.title,
    start: appt.start_time,
    end: new Date(new Date(appt.start_time).getTime() + appt.duration * 60000).toISOString(),
    backgroundColor: appt.event_color || "#3B82F6",
    borderColor: appt.event_color || "#3B82F6",
    extendedProps: appt
  })) || [];

  const handleEventClick = (info: any) => {
    setEditingAppointment(info.event.extendedProps);
    setModalOpen(true);
  };

  const handleDateClick = (info: any) => {
    setEditingAppointment(null);
    setModalOpen(true);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Main Calendar Area */}
        <div className="flex-1 order-2 lg:order-1">
          <Card className="shadow-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#003366]/20">
                  <CalendarIcon className="h-5 w-5 text-[#003366]" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Agenda Inteligente</CardTitle>
                  <p className="text-xs text-muted-foreground">Gerencie suas visitas e reuniões</p>
                </div>
              </div>
              <Button 
                onClick={() => { setEditingAppointment(null); setModalOpen(true); }}
                className="bg-[#003366] hover:bg-[#002244] text-white gap-2 shadow-lg shadow-[#003366]/20"
              >
                <Plus className="h-4 w-4" /> Novo Agendamento
              </Button>
            </CardHeader>
            <CardContent className="p-0 calendar-container">
              {isLoading ? (
                <div className="h-[600px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
                </div>
              ) : (
                <div className="p-4 full-calendar-wrapper">
                  <FullCalendar
                    plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin]}
                    initialView="dayGridMonth"
                    locale="pt-br"
                    headerToolbar={{
                      left: "prev,next today",
                      center: "title",
                      right: "dayGridMonth,timeGridWeek,timeGridDay"
                    }}
                    buttonText={{
                      today: "Hoje",
                      month: "Mês",
                      week: "Semana",
                      day: "Dia"
                    }}
                    events={calendarEvents}
                    eventClick={handleEventClick}
                    dateClick={handleDateClick}
                    height="700px"
                    selectable={true}
                    nowIndicator={true}
                    dayMaxEvents={true}
                    eventTimeFormat={{
                      hour: "2-digit",
                      minute: "2-digit",
                      meridiem: false
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Busy Brokers */}
        <div className="w-full lg:w-80 order-1 lg:order-2 flex flex-col gap-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" />
                Corretores Ocupados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingBusy ? (
                [1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full bg-slate-900" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 bg-slate-900" />
                      <Skeleton className="h-3 w-12 bg-slate-900" />
                    </div>
                  </div>
                ))
              ) : busyBrokers?.length ? (
                busyBrokers.map((broker) => (
                  <div key={broker.user_id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 group-hover:border-[#003366] transition-colors">
                        <AvatarImage src={broker.avatar_url} />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">
                          {broker.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{broker.full_name}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {broker.active_appointments} pendentes
                        </span>
                      </div>
                    </div>
                    {broker.active_appointments >= 3 && (
                      <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-center text-muted-foreground py-4">Nenhum corretor com agendamentos ativos.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-sky-500" />
                Resumo Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Visitas</span>
                    <span className="font-bold text-sky-400">12</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reuniões</span>
                    <span className="font-bold text-purple-400">05</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Propostas</span>
                    <span className="font-bold text-rose-400">03</span>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AppointmentModal 
        open={modalOpen} 
        onOpenChange={setModalOpen}
        editingAppointment={editingAppointment}
      />

      <style>{`
        .full-calendar-wrapper .fc {
          --fc-border-color: hsl(var(--border));
          --fc-daygrid-event-dot-width: 8px;
          --fc-today-bg-color: hsla(var(--primary) / 0.1);
          --fc-list-event-hover-bg-color: hsl(var(--accent));
        }
        .full-calendar-wrapper .fc-header-toolbar {
          padding: 1rem;
          margin-bottom: 0 !important;
        }
        .full-calendar-wrapper .fc-toolbar-title {
          font-size: 1.125rem !important;
          font-weight: 700 !important;
          color: hsl(var(--foreground));
        }
        .full-calendar-wrapper .fc-button {
          background-color: hsl(var(--background)) !important;
          border-color: hsl(var(--border)) !important;
          color: hsl(var(--foreground)) !important;
          font-size: 0.875rem !important;
          padding: 0.5rem 1rem !important;
          text-transform: capitalize !important;
          transition: all 0.2s;
        }
        .full-calendar-wrapper .fc-button:hover {
          background-color: hsl(var(--accent)) !important;
          color: hsl(var(--accent-foreground)) !important;
        }
        .full-calendar-wrapper .fc-button-primary:not(:disabled).fc-button-active,
        .full-calendar-wrapper .fc-button-primary:not(:disabled):active {
          background-color: #003366 !important;
          border-color: #003366 !important;
          color: white !important;
        }
        .full-calendar-wrapper .fc-col-header-cell {
          padding: 0.75rem 0 !important;
          background-color: hsl(var(--muted) / 0.5) !important;
          font-weight: 600 !important;
          font-size: 0.75rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: hsl(var(--muted-foreground)) !important;
          border-color: hsl(var(--border)) !important;
        }
        .full-calendar-wrapper .fc-daygrid-day-number {
          padding: 8px !important;
          font-size: 0.875rem !important;
          color: hsl(var(--foreground));
          opacity: 0.8;
        }
        .full-calendar-wrapper .fc-daygrid-day.fc-day-today {
          background-color: hsla(var(--primary) / 0.05) !important;
        }
        .full-calendar-wrapper .fc-event {
          cursor: pointer;
          border-radius: 4px !important;
          padding: 2px 4px !important;
          font-size: 0.75rem !important;
          margin: 1px 2px !important;
        }
        .full-calendar-wrapper .fc-theme-standard td, 
        .full-calendar-wrapper .fc-theme-standard th {
          border-color: hsl(var(--border)) !important;
        }
      `}</style>
    </AdminLayout>
  );
}

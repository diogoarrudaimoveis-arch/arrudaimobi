/**
 * AdminN8NWorkflows — N8N Workflow Monitor & Trigger Panel
 * Shows all Arruda Imobi automations, execution history, and webhook status
 */
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageShell, PageCard } from "@/components/admin/shared/AdminComponents";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ARRADA_IMOBI_WORKFLOWS,
  ARRADA_IMOBI_WEBHOOKS,
  getMockExecutions,
  triggerN8NWebhook,
  checkN8NHealth,
  type N8NWorkflow,
  type N8NExecution,
  type N8NTriggerPayload,
} from "@/integrations/n8n/client";
import {
  Activity, Zap, Webhook, Clock, CheckCircle2,
  XCircle, AlertTriangle, Play, RefreshCw, Link2,
  ArrowRight, MessageSquare, Calendar, UserPlus,
  Instagram, BookOpen, ChevronRight, Loader2,
  ToggleLeft, ToggleRight, Workflow
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ─── Category Icons ──────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<N8NWorkflow['category'], React.ComponentType<{ className?: string }>> = {
  lead: UserPlus,
  visit: Calendar,
  followup: MessageSquare,
  marketing: Instagram,
  whatsapp: BookOpen,
};

const CATEGORY_COLORS: Record<N8NWorkflow['category'], string> = {
  lead: "text-blue-500 bg-blue-500/10",
  visit: "text-purple-500 bg-purple-500/10",
  followup: "text-amber-500 bg-amber-500/10",
  marketing: "text-pink-500 bg-pink-500/10",
  whatsapp: "text-green-500 bg-green-500/10",
};

const STATUS_CONFIG = {
  success: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Sucesso" },
  error: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Erro" },
  running: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-500/10", label: "Executando" },
  waiting: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", label: "Aguardando" },
} as const;

const WORKFLOW_STATUS_CONFIG = {
  true: { label: "Ativo", color: "bg-green-500/10 text-green-500 border-green-500/30", dot: "bg-green-500" },
  false: { label: "Inativo", color: "bg-gray-500/10 text-gray-500 border-gray-500/30", dot: "bg-gray-400" },
} as const;

// ─── Format helpers ───────────────────────────────────────────────────────────
function formatDuration(ms?: number): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);
  if (day > 0) return `${day}d atrás`;
  if (hour > 0) return `${hour}h atrás`;
  if (min > 0) return `${min}min atrás`;
  return "agora";
}

// ─── Workflow Row ─────────────────────────────────────────────────────────────
interface WorkflowRowProps {
  workflow: N8NWorkflow;
  executions: N8NExecution[];
  onTrigger: (workflow: N8NWorkflow) => void;
  isTriggering: string | null;
}

function WorkflowRow({ workflow, executions, onTrigger, isTriggering }: WorkflowRowProps) {
  const CategoryIcon = CATEGORY_ICONS[workflow.category];
  const lastExecution = executions[0];
  const statusCfg = WORKFLOW_STATUS_CONFIG[workflow.active ? "true" : "false"];

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/30 rounded-lg transition-colors border border-transparent hover:border-border">
      {/* Icon */}
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${CATEGORY_COLORS[workflow.category]}`}>
        <CategoryIcon className="h-5 w-5" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{workflow.name}</span>
          <Badge variant="outline" className={`text-[10px] ${statusCfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} mr-1`} />
            {statusCfg.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{workflow.description}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {workflow.executionsCount} execuções
          </span>
          {workflow.lastRun && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(workflow.lastRun)}
            </span>
          )}
        </div>
      </div>

      {/* Last execution status */}
      {lastExecution && (
        <div className="flex items-center gap-1.5">
          {(() => {
            const cfg = STATUS_CONFIG[lastExecution.status];
            return <Badge variant="outline" className={`text-[10px] ${cfg.bg} ${cfg.color}`}>{cfg.label}</Badge>;
          })()}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onTrigger(workflow)}
          disabled={isTriggering === workflow.id}
          className="gap-1.5 text-xs"
        >
          {isTriggering === workflow.id ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          Disparar
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

// ─── Execution Row ────────────────────────────────────────────────────────────
function ExecutionRow({ execution }: { execution: N8NExecution }) {
  const cfg = STATUS_CONFIG[execution.status];
  const Icon = cfg.icon;

  return (
    <TableRow className="hover:bg-muted/20">
      <TableCell className="py-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${cfg.color}`} />
          <span className="font-mono text-xs text-muted-foreground">{execution.id.slice(-8)}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-[10px] ${cfg.bg} ${cfg.color}`}>{cfg.label}</Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{new Date(execution.startedAt).toLocaleString("pt-BR")}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDuration(execution.durationMs)}</TableCell>
      <TableCell>
        {execution.error ? (
          <span className="text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {execution.error.slice(0, 40)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

// ─── Webhook URLs Card ────────────────────────────────────────────────────────
function WebhookUrlsCard() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const webhooks = [
    { key: 'lead', label: 'Lead Capturado', path: ARRADA_IMOBI_WEBHOOKS.LEAD_CAPTURE },
    { key: 'visit', label: 'Visita Agendada', path: ARRADA_IMOBI_WEBHOOKS.VISIT_SCHEDULED },
    { key: 'followup', label: 'Follow-up', path: ARRADA_IMOBI_WEBHOOKS.FOLLOW_UP },
    { key: 'instagram', label: 'Instagram/Marketplace', path: ARRADA_IMOBI_WEBHOOKS.INSTAGRAM_POST },
    { key: 'catalog', label: 'Catálogo WhatsApp', path: ARRADA_IMOBI_WEBHOOKS.CATALOG_REQUEST },
    { key: 'whatsapp', label: 'WhatsApp Webhook', path: ARRADA_IMOBI_WEBHOOKS.WHATSAPP_WEBHOOK },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm">URLs dos Webhooks N8N</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Copie as URLs para configurar no N8N
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {webhooks.map(({ key, label, path }) => (
          <div key={key} className="flex items-center gap-2 group">
            <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded font-mono truncate">
              {path.replace('https://', '')}
            </code>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => copyToClipboard(path, key)}
            >
              {copied === key ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Link2 className="h-3 w-3" />}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AdminN8NWorkflows() {
  const { tenantId, isReady } = useAuth();
  const [workflows, setWorkflows] = useState<N8NWorkflow[]>(ARRADA_IMOBI_WORKFLOWS);
  const [selectedWorkflow, setSelectedWorkflow] = useState<N8NWorkflow | null>(null);
  const [executions, setExecutions] = useState<Record<string, N8NExecution[]>>({});
  const [isTriggering, setIsTriggering] = useState<string | null>(null);
  const [n8nHealth, setN8nHealth] = useState<{ ok: boolean; latencyMs: number } | null>(null);
  const [activeTab, setActiveTab] = useState("workflows");

  // Load executions for each workflow
  useEffect(() => {
    if (!isReady) return;
    const execMap: Record<string, N8NExecution[]> = {};
    workflows.forEach(w => {
      execMap[w.id] = getMockExecutions(w.id);
    });
     
    setExecutions(execMap);
  }, [isReady, workflows]);

  // Check N8N health on mount
  useEffect(() => {
    checkN8NHealth().then(setN8nHealth);
  }, []);

  // Select first workflow by default
  useEffect(() => {
    if (!selectedWorkflow && workflows.length > 0) {
      setSelectedWorkflow(workflows[0]);
    }
  }, [workflows, selectedWorkflow]);

  const handleTrigger = async (workflow: N8NWorkflow) => {
    setIsTriggering(workflow.id);
    try {
      const payload: N8NTriggerPayload = {
        event: workflow.id.includes('lead') ? 'lead_captured'
          : workflow.id.includes('visit') ? 'visit_scheduled'
          : workflow.id.includes('followup') ? 'follow_up'
          : workflow.id.includes('instagram') ? 'instagram_post'
          : 'catalog_request',
        tenantId: tenantId || 'demo-tenant',
        data: { workflowId: workflow.id, triggeredBy: 'admin-panel', timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      };

      const result = await triggerN8NWebhook(workflow.webhookPath, payload);
      if (result.success) {
        toast.success(`${workflow.name} disparado!`, {
          description: result.executionId ? `Execução: ${result.executionId}` : "Webhook enviado com sucesso",
        });
        // Add a mock execution to the list
        setExecutions(prev => ({
          ...prev,
          [workflow.id]: [
            {
              id: `exec-${Date.now()}`,
              workflowId: workflow.id,
              status: 'running',
              startedAt: new Date().toISOString(),
            },
            ...(prev[workflow.id] || []),
          ],
        }));
      } else {
        toast.error(`Falha ao disparar ${workflow.name}`, {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Erro ao Disparar", { description: String(error) });
    } finally {
      setIsTriggering(null);
    }
  };

  const totalExecutions = workflows.reduce((acc, w) => acc + w.executionsCount, 0);
  const activeCount = workflows.filter(w => w.active).length;

  return (
    <AdminLayout title="N8N — Automações" description="Monitorar e disparar workflows de automação">
      <AdminPageShell>
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Card className="py-3 px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Workflow className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Workflows</p>
                <p className="font-display text-xl font-bold">{workflows.length}</p>
              </div>
            </div>
          </Card>
          <Card className="py-3 px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                <Activity className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ativos</p>
                <p className="font-display text-xl font-bold">{activeCount}</p>
              </div>
            </div>
          </Card>
          <Card className="py-3 px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                <Zap className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Execuções</p>
                <p className="font-display text-xl font-bold">{totalExecutions.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="py-3 px-4">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${n8nHealth?.ok ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {n8nHealth?.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">N8N Status</p>
                <p className="font-display text-sm font-bold">
                  {n8nHealth ? (n8nHealth.ok ? `Online (${n8nHealth.latencyMs}ms)` : "Offline") : "Verificando..."}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="executions">Execuções</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows">
            <div className="grid grid-cols-3 gap-4">
              {/* Workflow List */}
              <div className="col-span-2 space-y-1">
                {workflows.map(workflow => (
                  <WorkflowRow
                    key={workflow.id}
                    workflow={workflow}
                    executions={executions[workflow.id] || []}
                    onTrigger={handleTrigger}
                    isTriggering={isTriggering}
                  />
                ))}
              </div>

              {/* Workflow Detail */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    {selectedWorkflow?.name || "Selecione um workflow"}
                  </CardTitle>
                  {selectedWorkflow && (
                    <CardDescription className="text-xs">
                      {selectedWorkflow.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedWorkflow ? (
                    <>
                      {/* Trigger Button */}
                      <Button
                        className="w-full gap-2"
                        onClick={() => handleTrigger(selectedWorkflow)}
                        disabled={isTriggering === selectedWorkflow.id}
                      >
                        {isTriggering === selectedWorkflow.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        Disparar Workflow
                      </Button>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">Execuções</p>
                          <p className="font-display text-lg font-bold">{selectedWorkflow.executionsCount}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">Última Execução</p>
                          <p className="font-display text-sm font-bold">
                            {selectedWorkflow.lastRun ? timeAgo(selectedWorkflow.lastRun) : "Nunca"}
                          </p>
                        </div>
                      </div>

                      {/* Execution History */}
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Histórico</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {(executions[selectedWorkflow.id] || []).slice(0, 10).map(exec => {
                            const cfg = STATUS_CONFIG[exec.status];
                            const Icon = cfg.icon;
                            return (
                              <div key={exec.id} className="flex items-center gap-2 text-xs py-1 border-b border-muted/50 last:border-0">
                                <Icon className={`h-3 w-3 ${cfg.color}`} />
                                <span className="flex-1 text-muted-foreground">{timeAgo(exec.startedAt)}</span>
                                <span className={cfg.color}>{cfg.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Selecione um workflow para ver detalhes
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="executions">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Histórico de Execuções</CardTitle>
                <CardDescription className="text-xs">Todas as execuções dos workflows N8N</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {selectedWorkflow ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(executions[selectedWorkflow.id] || []).map(exec => (
                        <ExecutionRow key={exec.id} execution={exec} />
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    Selecione um workflow para ver execuções
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks">
            <WebhookUrlsCard />
          </TabsContent>
        </Tabs>
      </AdminPageShell>
    </AdminLayout>
  );
}

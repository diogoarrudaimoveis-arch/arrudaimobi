import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SectionHeader } from '@/components/admin/ai/AiOpsCards';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { queryLogs, getLogStats, seedMockLogs, type LogEntry, type LogLevel } from '@/lib/observability';
import { Search, Filter, Clock, AlertTriangle, XCircle, Info, ChevronDown } from 'lucide-react';

const LEVEL_CONFIG: Record<LogLevel, { label: string; class: string; icon: React.ReactNode }> = {
  info: { label: 'INFO', class: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: <Info size={12} /> },
  warn: { label: 'WARN', class: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: <AlertTriangle size={12} /> },
  error: { label: 'ERROR', class: 'text-red-400 bg-red-500/10 border-red-500/20', icon: <XCircle size={12} /> },
  critical: { label: 'CRIT', class: 'text-red-300 bg-red-900/20 border-red-500/30', icon: <AlertTriangle size={12} /> },
};

function LogRow({ log }: { log: LogEntry }) {
  const cfg = LEVEL_CONFIG[log.level] ?? LEVEL_CONFIG.info;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0 hover:bg-white/2.5 transition-colors">
      <div className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${cfg.class}`}>
        {cfg.icon}
        {cfg.label}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">{log.source}</span>
          {log.correlationId && (
            <span className="text-xs font-mono text-muted-foreground/60">#{log.correlationId.slice(0, 12)}</span>
          )}
          {log.resolved && (
            <span className="text-xs text-green-400/60">✓ resolvido</span>
          )}
        </div>
        <p className="text-sm mt-0.5 leading-relaxed">{log.message}</p>
      </div>
      <div className="shrink-0 text-right">
        <span className="text-xs text-muted-foreground font-mono">
          {new Date(log.timestamp).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

export default function AdminAILogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const refresh = () => {
    seedMockLogs(); // ensure we have data
    const results = queryLogs({
      search: search || undefined,
      levels: levelFilter.length > 0 ? levelFilter : undefined,
      sources: sourceFilter.length > 0 ? sourceFilter : undefined,
    });
    setLogs(results);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [search, levelFilter, sourceFilter]);

  const stats = useMemo(() => getLogStats(), []);

  const allSources = useMemo(() => Object.keys(stats.bySource), [stats]);

  const toggleLevel = (level: LogLevel) => {
    setLevelFilter(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const toggleSource = (source: string) => {
    setSourceFilter(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const levelCounts = stats.byLevel;
  const totalFiltered = logs.length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <SectionHeader
          title="Log Center"
          description="Eventos operacionais em tempo real. Dados em memória — sem persistência no servidor. Logs reais mascarados antes de qualquer armazenamento."
        />

        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Card className="border-white/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-mono">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total logs</p>
            </CardContent>
          </Card>
          <Card className="border-white/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-mono text-blue-400">{levelCounts.info}</p>
              <p className="text-xs text-muted-foreground">INFO</p>
            </CardContent>
          </Card>
          <Card className="border-white/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-mono text-yellow-400">{levelCounts.warn}</p>
              <p className="text-xs text-muted-foreground">WARN</p>
            </CardContent>
          </Card>
          <Card className="border-white/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-mono text-red-400">{levelCounts.error + levelCounts.critical}</p>
              <p className="text-xs text-muted-foreground">ERROR+CRIT</p>
            </CardContent>
          </Card>
          <Card className="border-white/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-mono">{stats.last24h}</p>
              <p className="text-xs text-muted-foreground">Últimas 24h</p>
            </CardContent>
          </Card>
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar logs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-md border border-white/10 bg-white/5 text-sm focus:outline-none focus:border-white/20"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm transition-colors ${showFilters ? 'border-white/20 bg-white/5' : 'border-white/10 hover:bg-white/5'}`}
            >
              <Filter size={14} />
              Filtros
              {(levelFilter.length > 0 || sourceFilter.length > 0) && (
                <span className="bg-blue-500 text-white text-xs px-1.5 rounded-full">
                  {levelFilter.length + sourceFilter.length}
                </span>
              )}
            </button>
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-white/10 text-sm hover:bg-white/5"
            >
              <Clock size={14} />
              Atualizar
            </button>
            {totalFiltered !== logs.length && (
              <span className="text-xs text-muted-foreground self-center">
                {totalFiltered} resultado{totalFiltered !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="flex flex-wrap gap-4 p-4 rounded-lg border border-white/10 bg-white/2.5">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Severidade</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(LEVEL_CONFIG) as LogLevel[]).map(level => {
                    const cfg = LEVEL_CONFIG[level];
                    const active = levelFilter.includes(level);
                    return (
                      <button
                        key={level}
                        onClick={() => toggleLevel(level)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${active ? cfg.class : 'border-white/10 text-muted-foreground hover:bg-white/5'}`}
                      >
                        {cfg.icon}{cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Fontes</p>
                <div className="flex flex-wrap gap-2">
                  {allSources.map(source => {
                    const active = sourceFilter.includes(source);
                    return (
                      <button
                        key={source}
                        onClick={() => toggleSource(source)}
                        className={`px-2 py-1 rounded text-xs border transition-colors ${active ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 text-muted-foreground hover:bg-white/5'}`}
                      >
                        {source}
                        <span className="ml-1 text-muted-foreground">({stats.bySource[source]})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {(levelFilter.length > 0 || sourceFilter.length > 0) && (
                <button
                  onClick={() => { setLevelFilter([]); setSourceFilter([]); }}
                  className="text-xs text-red-400 underline self-end"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Log List */}
        <Card className="border-white/5">
          <CardContent className="p-0 divide-y divide-white/5">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum log encontrado</p>
              </div>
            ) : (
              <div className="p-4">
                {logs.map(log => (
                  <LogRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> INFO — evento normal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400" /> WARN — atenção necessária
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" /> ERROR — falha detectada
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-300" /> CRIT — impacto crítico
          </span>
        </div>
      </div>
    </AdminLayout>
  );
}

export type AutomationCriticality = "ESSENTIAL" | "IMPORTANT" | "OPTIONAL" | "REDUNDANT" | "ORPHAN" | "DANGEROUS";
export type AutomationHealthStatus = "HEALTHY" | "DEGRADED" | "FAILING" | "DISABLED" | "UNKNOWN";
export type AutomationRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AutomationRecommendedAction = "KEEP" | "REVIEW" | "FIX" | "PAUSE_WITH_APPROVAL" | "REVIEW_THEN_REMOVE" | "REVIEW_LATER";

export interface AutomationRiskMock {
  operational: number;
  security: number;
  cost: number;
  infiniteLoop: number;
  cpuRam: number;
  deploy: number;
  database: number;
  token: number;
  level: AutomationRiskLevel;
}

export interface AutomationHealthMock {
  score: number;
  state: AutomationHealthStatus;
  reason: string;
}

export interface AutomationRegistryItemMock {
  id: string;
  name: string;
  type: string;
  owner: string;
  agentResponsible: string;
  frequency: string;
  origin: string;
  commandMasked: string | null;
  pid: number | null;
  criticality: AutomationCriticality;
  status: AutomationHealthStatus;
  environment: string;
  logs: string[];
  health: AutomationHealthMock;
  restartPolicy: string;
  estimatedConsumption: string;
  risk: AutomationRiskMock;
  tags: string[];
  lastRun: string | null;
  lastFailure: string | null;
  recommendedAction: AutomationRecommendedAction;
}

export const automationRegistryMeta = {
  "schemaVersion": "1.0.0-draft",
  "generatedAtUtc": "2026-05-06T15:44:00Z",
  "environment": "root2",
  "mode": "governance-only-no-runtime-changes"
} as const;

export const automationRegistryItems: AutomationRegistryItemMock[] = [
  {
    "id": "LC-01",
    "name": "Claw3D builder trigger",
    "type": "LINUX_CRON",
    "owner": "main",
    "agentResponsible": "main",
    "frequency": "*/30 * * * *",
    "origin": "root crontab line 24",
    "commandMasked": "flock -n /tmp/jack-claw3d.lock openclaw cron run 8a9c13d7-13cf-4e39-a630-c074342b11ad >> /root/claw3d-cron.log 2>&1",
    "pid": null,
    "criticality": "DANGEROUS",
    "status": "FAILING",
    "environment": "root2",
    "logs": [
      "/root/claw3d-cron.log",
      "/root/.openclaw/cron/runs/8a9c13d7-13cf-4e39-a630-c074342b11ad.jsonl"
    ],
    "health": {
      "score": 10,
      "state": "FAILING",
      "reason": "OpenClaw job disabled but Linux cron still forces execution; many failures"
    },
    "restartPolicy": "cron schedule",
    "estimatedConsumption": "medium token/task churn every 30min",
    "risk": {
      "operational": 3,
      "security": 1,
      "cost": 2,
      "infiniteLoop": 3,
      "cpuRam": 1,
      "deploy": 0,
      "database": 0,
      "token": 1,
      "level": "CRITICAL"
    },
    "tags": [
      "p0",
      "disabled-bypass",
      "openclaw",
      "orphaned-trigger"
    ],
    "lastRun": "2026-05-06T15:30:00Z",
    "lastFailure": "repeated OpenClaw job failure/model allowlist",
    "recommendedAction": "PAUSE_WITH_APPROVAL"
  },
  {
    "id": "LC-02",
    "name": "Mission Control queue",
    "type": "LINUX_CRON",
    "owner": "main",
    "agentResponsible": "main",
    "frequency": "*/10 * * * *",
    "origin": "root crontab line 25",
    "commandMasked": "cd /root/clawmasters-mission-control/scripts && ./run-queue.sh >> /root/clawmasters-mission-control/logs/queue.log 2>&1",
    "pid": null,
    "criticality": "IMPORTANT",
    "status": "HEALTHY",
    "environment": "root2",
    "logs": [
      "/root/clawmasters-mission-control/logs/queue.log"
    ],
    "health": {
      "score": 80,
      "state": "HEALTHY",
      "reason": "no recent relevant error detected"
    },
    "restartPolicy": "cron schedule",
    "estimatedConsumption": "low",
    "risk": {
      "operational": 1,
      "security": 1,
      "cost": 0,
      "infiniteLoop": 1,
      "cpuRam": 1,
      "deploy": 1,
      "database": 0,
      "token": 1,
      "level": "MEDIUM"
    },
    "tags": [
      "queue",
      "mission-control"
    ],
    "lastRun": "2026-05-06T15:30:00Z",
    "lastFailure": null,
    "recommendedAction": "KEEP"
  },
  {
    "id": "LC-03",
    "name": "Arruda thinking",
    "type": "LINUX_CRON",
    "owner": "main",
    "agentResponsible": "main",
    "frequency": "*/9 * * * *",
    "origin": "root crontab line 27",
    "commandMasked": "/root/.openclaw/scripts/arruda/arruda_thinking_cron.sh >> /root/.openclaw/workspace/artifacts/arruda/thinking-logs/cron.log 2>&1",
    "pid": null,
    "criticality": "IMPORTANT",
    "status": "HEALTHY",
    "environment": "root2",
    "logs": [
      "/root/.openclaw/workspace/artifacts/arruda/thinking-logs/cron.log"
    ],
    "health": {
      "score": 82,
      "state": "HEALTHY",
      "reason": "active logs; no blocking failure"
    },
    "restartPolicy": "cron schedule",
    "estimatedConsumption": "low/medium; frequent file checks",
    "risk": {
      "operational": 1,
      "security": 0,
      "cost": 1,
      "infiniteLoop": 1,
      "cpuRam": 1,
      "deploy": 0,
      "database": 0,
      "token": 1,
      "level": "MEDIUM"
    },
    "tags": [
      "arruda",
      "planning",
      "heartbeat-like"
    ],
    "lastRun": "2026-05-06T15:27:00Z",
    "lastFailure": null,
    "recommendedAction": "KEEP"
  },
  {
    "id": "LC-04",
    "name": "Arruda research",
    "type": "LINUX_CRON",
    "owner": "main",
    "agentResponsible": "growth",
    "frequency": "0 9 * * *",
    "origin": "root crontab line 29",
    "commandMasked": "/root/.openclaw/scripts/arruda/arruda_research_cron.sh >> /root/.openclaw/workspace/artifacts/arruda/research-logs/cron.log 2>&1",
    "pid": null,
    "criticality": "OPTIONAL",
    "status": "HEALTHY",
    "environment": "root2",
    "logs": [
      "/root/.openclaw/workspace/artifacts/arruda/research-logs/cron.log"
    ],
    "health": {
      "score": 80,
      "state": "HEALTHY",
      "reason": "daily log observed"
    },
    "restartPolicy": "cron schedule",
    "estimatedConsumption": "low",
    "risk": {
      "operational": 1,
      "security": 0,
      "cost": 1,
      "infiniteLoop": 0,
      "cpuRam": 0,
      "deploy": 0,
      "database": 0,
      "token": 1,
      "level": "LOW"
    },
    "tags": [
      "research",
      "daily"
    ],
    "lastRun": "2026-05-06T09:00:00Z",
    "lastFailure": null,
    "recommendedAction": "KEEP"
  },
  {
    "id": "LC-05",
    "name": "OpenClaw investigate",
    "type": "LINUX_CRON",
    "owner": "main",
    "agentResponsible": "main",
    "frequency": "*/15 * * * *",
    "origin": "root crontab line 31",
    "commandMasked": "/root/.openclaw/scripts/openclaw-audit/openclaw_investigate_cron.sh >> /root/.openclaw/workspace/artifacts/openclaw-audit/investigation-logs/cron.log 2>&1",
    "pid": null,
    "criticality": "REDUNDANT",
    "status": "DEGRADED",
    "environment": "root2",
    "logs": [
      "/root/.openclaw/workspace/artifacts/openclaw-audit/investigation-logs/cron.log"
    ],
    "health": {
      "score": 55,
      "state": "DEGRADED",
      "reason": "recurring false error HEARTBEAT.md not found"
    },
    "restartPolicy": "cron schedule",
    "estimatedConsumption": "low/medium",
    "risk": {
      "operational": 1,
      "security": 1,
      "cost": 1,
      "infiniteLoop": 2,
      "cpuRam": 1,
      "deploy": 0,
      "database": 0,
      "token": 1,
      "level": "HIGH"
    },
    "tags": [
      "monitoring",
      "false-positive",
      "needs-fix"
    ],
    "lastRun": "2026-05-06T15:30:00Z",
    "lastFailure": "HEARTBEAT.md not found",
    "recommendedAction": "REVIEW"
  },
  {
    "id": "LC-06",
    "name": "Video production cron",
    "type": "LINUX_CRON",
    "owner": "joao",
    "agentResponsible": "growth",
    "frequency": "0 10,18 * * *",
    "origin": "root crontab line 32",
    "commandMasked": "/root/.openclaw/scripts/videoaula/video_production_cron.sh >> /root/.openclaw/workspace/artifacts/video/logs/cron.log 2>&1",
    "pid": null,
    "criticality": "OPTIONAL",
    "status": "UNKNOWN",
    "environment": "root2",
    "logs": [
      "/root/.openclaw/workspace/artifacts/video/logs/cron.log"
    ],
    "health": {
      "score": 60,
      "state": "UNKNOWN",
      "reason": "no recent error but business need unclear"
    },
    "restartPolicy": "cron schedule",
    "estimatedConsumption": "unknown; potential media/token generation",
    "risk": {
      "operational": 1,
      "security": 1,
      "cost": 2,
      "infiniteLoop": 0,
      "cpuRam": 1,
      "deploy": 0,
      "database": 0,
      "token": 2,
      "level": "MEDIUM"
    },
    "tags": [
      "video",
      "content",
      "review"
    ],
    "lastRun": "2026-05-06T10:00:00Z",
    "lastFailure": null,
    "recommendedAction": "KEEP"
  },
  {
    "id": "LC-07",
    "name": "Builderfy gateway cron",
    "type": "EXTERNAL_CRON",
    "owner": "main",
    "agentResponsible": "guardiao_chaves",
    "frequency": "* * * * *",
    "origin": "root crontab line 35",
    "commandMasked": "curl -fsS https://gateway.builderfy.com.br/cron?token=***MASKED*** > /dev/null 2>&1",
    "pid": null,
    "criticality": "DANGEROUS",
    "status": "DEGRADED",
    "environment": "root2",
    "logs": [],
    "health": {
      "score": 20,
      "state": "DEGRADED",
      "reason": "runs every minute, token in crontab, no persistent log/health confirmation"
    },
    "restartPolicy": "cron schedule",
    "estimatedConsumption": "low per run, high volume 1440/day",
    "risk": {
      "operational": 3,
      "security": 2,
      "cost": 1,
      "infiniteLoop": 3,
      "cpuRam": 1,
      "deploy": 0,
      "database": 0,
      "token": 3,
      "level": "CRITICAL"
    },
    "tags": [
      "p0",
      "external",
      "token-risk",
      "no-log",
      "one-minute-loop"
    ],
    "lastRun": "2026-05-06T15:33:00Z",
    "lastFailure": "unknown; no log",
    "recommendedAction": "PAUSE_WITH_APPROVAL"
  },
  {
    "id": "LC-08",
    "name": "Arruda planner",
    "type": "LINUX_CRON",
    "owner": "main",
    "agentResponsible": "arruda_operator",
    "frequency": "*/5 * * * *",
    "origin": "root crontab line 38",
    "commandMasked": "/root/.openclaw/scripts/arruda/arruda_planner_cron.sh >> /root/.openclaw/scripts/arruda/cron-logs/planner.log 2>&1",
    "pid": null,
    "criticality": "IMPORTANT",
    "status": "HEALTHY",
    "environment": "root2",
    "logs": [
      "/root/.openclaw/scripts/arruda/cron-logs/planner.log"
    ],
    "health": {
      "score": 80,
      "state": "HEALTHY",
      "reason": "active; no blocking failure observed"
    },
    "restartPolicy": "cron schedule",
    "estimatedConsumption": "low",
    "risk": {
      "operational": 1,
      "security": 0,
      "cost": 1,
      "infiniteLoop": 1,
      "cpuRam": 1,
      "deploy": 0,
      "database": 0,
      "token": 0,
      "level": "MEDIUM"
    },
    "tags": [
      "arruda",
      "planner",
      "five-minute-loop"
    ],
    "lastRun": "2026-05-06T15:30:00Z",
    "lastFailure": null,
    "recommendedAction": "KEEP"
  },
  {
    "id": "LC-09",
    "name": "Arruda executor",
    "type": "LINUX_CRON",
    "owner": "arruda_operator",
    "agentResponsible": "main",
    "frequency": "*/15 * * * *",
    "origin": "root crontab line 41",
    "commandMasked": "/root/.openclaw/scripts/arruda/arruda_executor_cron.sh >> /root/.openclaw/scripts/arruda/cron-logs/executor.log 2>&1",
    "pid": null,
    "criticality": "IMPORTANT",
    "status": "HEALTHY",
    "environment": "root2",
    "logs": [
      "/root/.openclaw/scripts/arruda/cron-logs/executor.log"
    ],
    "health": {
      "score": 75,
      "state": "HEALTHY",
      "reason": "currently read-only health/ZPRO checks"
    },
    "restartPolicy": "cron schedule",
    "estimatedConsumption": "low API calls",
    "risk": {
      "operational": 2,
      "security": 1,
      "cost": 1,
      "infiniteLoop": 1,
      "cpuRam": 1,
      "deploy": 1,
      "database": 1,
      "token": 2,
      "level": "HIGH"
    },
    "tags": [
      "arruda",
      "executor",
      "zpro",
      "guardrails"
    ],
    "lastRun": "2026-05-06T15:30:00Z",
    "lastFailure": null,
    "recommendedAction": "KEEP"
  },
  {
    "id": "LC-10",
    "name": "Arruda ZPRO sync",
    "type": "LINUX_CRON",
    "owner": "pedrinho",
    "agentResponsible": "arruda_operator",
    "frequency": "*/30 * * * *",
    "origin": "root crontab line 44",
    "commandMasked": "/root/.openclaw/scripts/arruda/arruda_zpro_sync_cron.sh >> /root/.openclaw/scripts/arruda/cron-logs/zpro-sync.log 2>&1",
    "pid": null,
    "criticality": "IMPORTANT",
    "status": "HEALTHY",
    "environment": "root2",
    "logs": [
      "/root/.openclaw/scripts/arruda/cron-logs/zpro-sync.log"
    ],
    "health": {
      "score": 75,
      "state": "HEALTHY",
      "reason": "read-oriented ZPRO sync"
    },
    "restartPolicy": "cron schedule",
    "estimatedConsumption": "low/medium API calls",
    "risk": {
      "operational": 2,
      "security": 1,
      "cost": 1,
      "infiniteLoop": 1,
      "cpuRam": 1,
      "deploy": 0,
      "database": 0,
      "token": 2,
      "level": "HIGH"
    },
    "tags": [
      "zpro",
      "sync",
      "api-token"
    ],
    "lastRun": "2026-05-06T15:30:00Z",
    "lastFailure": null,
    "recommendedAction": "KEEP"
  },
  {
    "id": "LC-11",
    "name": "Arruda daily report",
    "type": "LINUX_CRON",
    "owner": "main",
    "agentResponsible": "main",
    "frequency": "0 11 * * *",
    "origin": "root crontab line 47",
    "commandMasked": "/root/.openclaw/scripts/arruda/arruda_daily_report_cron.sh >> /root/.openclaw/scripts/arruda/cron-logs/daily-report.log 2>&1",
    "pid": null,
    "criticality": "IMPORTANT",
    "status": "HEALTHY",
    "environment": "root2",
    "logs": [
      "/root/.openclaw/scripts/arruda/cron-logs/daily-report.log"
    ],
    "health": {
      "score": 85,
      "state": "HEALTHY",
      "reason": "daily reporting low risk"
    },
    "restartPolicy": "cron schedule",
    "estimatedConsumption": "low",
    "risk": {
      "operational": 1,
      "security": 0,
      "cost": 0,
      "infiniteLoop": 0,
      "cpuRam": 0,
      "deploy": 0,
      "database": 0,
      "token": 1,
      "level": "LOW"
    },
    "tags": [
      "daily-report",
      "visibility"
    ],
    "lastRun": "2026-05-06T11:00:00Z",
    "lastFailure": null,
    "recommendedAction": "KEEP"
  },
  {
    "id": "LC-12",
    "name": "Captação Betim",
    "type": "LINUX_CRON",
    "owner": "hunter",
    "agentResponsible": "growth",
    "frequency": "10 7 * * *",
    "origin": "root crontab line 48",
    "commandMasked": "/root/.openclaw/scripts/arruda/arruda_captacao_betim.sh >> /root/.openclaw/scripts/arruda/cron-logs/captacao.log 2>&1",
    "pid": null,
    "criticality": "ESSENTIAL",
    "status": "DEGRADED",
    "environment": "root2",
    "logs": [
      "/root/.openclaw/scripts/arruda/cron-logs/captacao.log"
    ],
    "health": {
      "score": 65,
      "state": "DEGRADED",
      "reason": "recent failed/empty Firecrawl responses; has lock/dedup"
    },
    "restartPolicy": "cron schedule with script lock",
    "estimatedConsumption": "medium scraping/API once daily",
    "risk": {
      "operational": 2,
      "security": 1,
      "cost": 1,
      "infiniteLoop": 1,
      "cpuRam": 1,
      "deploy": 0,
      "database": 0,
      "token": 2,
      "level": "HIGH"
    },
    "tags": [
      "leads",
      "revenue",
      "firecrawl",
      "daily"
    ],
    "lastRun": "2026-05-06T07:10:00Z",
    "lastFailure": "recent failed/empty response",
    "recommendedAction": "REVIEW"
  },
  {
    "id": "OC-01",
    "name": "openclaw-remote-access-research",
    "type": "OPENCLAW_CRON",
    "owner": "rafael_executor",
    "agentResponsible": "rafael_executor",
    "frequency": "every 5min",
    "origin": "/root/.openclaw/cron/jobs.json",
    "commandMasked": "agentTurn research Windows node remote access",
    "pid": null,
    "criticality": "DANGEROUS",
    "status": "FAILING",
    "environment": "root2",
    "logs": [
      "/root/.openclaw/cron/runs/6366c61d-2784-4fc9-8d7c-73fd9c02f990.jsonl"
    ],
    "health": {
      "score": 15,
      "state": "FAILING",
      "reason": "timeouts recurring; target node disconnected"
    },
    "restartPolicy": "OpenClaw cron everyMs=300000 timeout=180s",
    "estimatedConsumption": "high token/timeouts every 5min",
    "risk": {
      "operational": 2,
      "security": 1,
      "cost": 3,
      "infiniteLoop": 3,
      "cpuRam": 1,
      "deploy": 0,
      "database": 0,
      "token": 0,
      "level": "HIGH"
    },
    "tags": [
      "p1",
      "timeout",
      "remote-access",
      "node-offline"
    ],
    "lastRun": "2026-05-06T15:31:00Z",
    "lastFailure": "timeout",
    "recommendedAction": "PAUSE_WITH_APPROVAL"
  },
  {
    "id": "OC-02",
    "name": "arruda-app-safe-auto-improvement-20min",
    "type": "OPENCLAW_CRON",
    "owner": "main",
    "agentResponsible": "main",
    "frequency": "*/20 * * * * America/Sao_Paulo",
    "origin": "/root/.openclaw/cron/jobs.json",
    "commandMasked": "agentTurn safe improvement routine for arrudaimobi",
    "pid": null,
    "criticality": "IMPORTANT",
    "status": "DEGRADED",
    "environment": "root2",
    "logs": [
      "/root/.openclaw/cron/runs/a632518f-fc88-4e3b-a967-28be80d4ee16.jsonl"
    ],
    "health": {
      "score": 55,
      "state": "DEGRADED",
      "reason": "runs ok but repeatedly blocked by pending dirty branch"
    },
    "restartPolicy": "OpenClaw cron timeout=900s",
    "estimatedConsumption": "medium/high token per 20min if not paused",
    "risk": {
      "operational": 2,
      "security": 1,
      "cost": 3,
      "infiniteLoop": 2,
      "cpuRam": 1,
      "deploy": 1,
      "database": 0,
      "token": 0,
      "level": "HIGH"
    },
    "tags": [
      "p1",
      "auto-improvement",
      "blocked-by-branch",
      "no-deploy"
    ],
    "lastRun": "2026-05-06T15:20:00Z",
    "lastFailure": "logical block: dirty/pending branch",
    "recommendedAction": "REVIEW"
  },
  {
    "id": "PR-01",
    "name": "OpenClaw gateway",
    "type": "PROCESS",
    "owner": "main",
    "agentResponsible": "main",
    "frequency": "persistent",
    "origin": "systemd user/openclaw gateway",
    "commandMasked": "node openclaw gateway --port 18789",
    "pid": 682205,
    "criticality": "ESSENTIAL",
    "status": "HEALTHY",
    "environment": "root2",
    "logs": [
      "journalctl/openclaw status"
    ],
    "health": {
      "score": 85,
      "state": "HEALTHY",
      "reason": "running/listening, but security hardening pending"
    },
    "restartPolicy": "systemd user service",
    "estimatedConsumption": "~5.4% CPU and ~9% RAM observed",
    "risk": {
      "operational": 3,
      "security": 2,
      "cost": 1,
      "infiniteLoop": 0,
      "cpuRam": 2,
      "deploy": 0,
      "database": 0,
      "token": 2,
      "level": "HIGH"
    },
    "tags": [
      "gateway",
      "critical",
      "hardening-needed"
    ],
    "lastRun": "persistent",
    "lastFailure": null,
    "recommendedAction": "KEEP"
  },
  {
    "id": "PR-02",
    "name": "Mission Control server",
    "type": "PROCESS",
    "owner": "main",
    "agentResponsible": "main",
    "frequency": "persistent",
    "origin": "/root/clawmasters-mission-control/server/server.js",
    "commandMasked": "node server.js",
    "pid": 151474,
    "criticality": "IMPORTANT",
    "status": "HEALTHY",
    "environment": "root2",
    "logs": [
      "/root/clawmasters-mission-control/logs/queue.log"
    ],
    "health": {
      "score": 75,
      "state": "HEALTHY",
      "reason": "running on localhost:3020"
    },
    "restartPolicy": "unknown/manual parent",
    "estimatedConsumption": "~0.7% RAM observed",
    "risk": {
      "operational": 2,
      "security": 1,
      "cost": 0,
      "infiniteLoop": 1,
      "cpuRam": 1,
      "deploy": 1,
      "database": 0,
      "token": 1,
      "level": "MEDIUM"
    },
    "tags": [
      "mission-control",
      "queue"
    ],
    "lastRun": "persistent",
    "lastFailure": null,
    "recommendedAction": "KEEP"
  },
  {
    "id": "PR-04",
    "name": "Vite dev server 8080",
    "type": "PROCESS",
    "owner": "main",
    "agentResponsible": "carlos",
    "frequency": "persistent dev leftover",
    "origin": "arrudaimobi npm/vite",
    "commandMasked": "vite --host 127.0.0.1 --port 8080",
    "pid": 760616,
    "criticality": "ORPHAN",
    "status": "UNKNOWN",
    "environment": "root2",
    "logs": [],
    "health": {
      "score": 45,
      "state": "UNKNOWN",
      "reason": "likely QA leftover; still listening"
    },
    "restartPolicy": "manual process",
    "estimatedConsumption": "~2.0% RAM + esbuild",
    "risk": {
      "operational": 1,
      "security": 1,
      "cost": 0,
      "infiniteLoop": 1,
      "cpuRam": 2,
      "deploy": 0,
      "database": 0,
      "token": 0,
      "level": "MEDIUM"
    },
    "tags": [
      "orphan",
      "vite",
      "qa-leftover"
    ],
    "lastRun": "persistent",
    "lastFailure": null,
    "recommendedAction": "REVIEW_THEN_REMOVE"
  },
  {
    "id": "PR-05",
    "name": "Vite dev server 8081",
    "type": "PROCESS",
    "owner": "main",
    "agentResponsible": "carlos",
    "frequency": "persistent dev leftover",
    "origin": "arrudaimobi npm/vite",
    "commandMasked": "vite --host 127.0.0.1 --port 8081",
    "pid": 762941,
    "criticality": "ORPHAN",
    "status": "UNKNOWN",
    "environment": "root2",
    "logs": [],
    "health": {
      "score": 45,
      "state": "UNKNOWN",
      "reason": "likely QA leftover; still listening"
    },
    "restartPolicy": "manual process",
    "estimatedConsumption": "~1.8% RAM + esbuild",
    "risk": {
      "operational": 1,
      "security": 1,
      "cost": 0,
      "infiniteLoop": 1,
      "cpuRam": 2,
      "deploy": 0,
      "database": 0,
      "token": 0,
      "level": "MEDIUM"
    },
    "tags": [
      "orphan",
      "vite",
      "qa-leftover"
    ],
    "lastRun": "persistent",
    "lastFailure": null,
    "recommendedAction": "REVIEW_THEN_REMOVE"
  },
  {
    "id": "PR-06",
    "name": "Vite dev server 8082",
    "type": "PROCESS",
    "owner": "main",
    "agentResponsible": "carlos",
    "frequency": "persistent dev leftover",
    "origin": "arrudaimobi npm/vite",
    "commandMasked": "vite --host 127.0.0.1 --port 8082",
    "pid": 764910,
    "criticality": "ORPHAN",
    "status": "UNKNOWN",
    "environment": "root2",
    "logs": [],
    "health": {
      "score": 45,
      "state": "UNKNOWN",
      "reason": "likely QA leftover; still listening"
    },
    "restartPolicy": "manual process",
    "estimatedConsumption": "~1.8% RAM + esbuild",
    "risk": {
      "operational": 1,
      "security": 1,
      "cost": 0,
      "infiniteLoop": 1,
      "cpuRam": 2,
      "deploy": 0,
      "database": 0,
      "token": 0,
      "level": "MEDIUM"
    },
    "tags": [
      "orphan",
      "vite",
      "qa-leftover"
    ],
    "lastRun": "persistent",
    "lastFailure": null,
    "recommendedAction": "REVIEW_THEN_REMOVE"
  },
  {
    "id": "DK-01",
    "name": "Docker container openclaw created",
    "type": "DOCKER",
    "owner": "main",
    "agentResponsible": "main",
    "frequency": "none",
    "origin": "docker ps -a",
    "commandMasked": "ghcr.io/openclaw/openclaw:latest node openclaw.mjs gateway --allow-unconfigured",
    "pid": null,
    "criticality": "ORPHAN",
    "status": "DISABLED",
    "environment": "root2",
    "logs": [],
    "health": {
      "score": 70,
      "state": "DISABLED",
      "reason": "container created but not running; restart=no"
    },
    "restartPolicy": "no",
    "estimatedConsumption": "none while stopped",
    "risk": {
      "operational": 0,
      "security": 1,
      "cost": 0,
      "infiniteLoop": 0,
      "cpuRam": 0,
      "deploy": 0,
      "database": 0,
      "token": 0,
      "level": "LOW"
    },
    "tags": [
      "docker",
      "residue"
    ],
    "lastRun": null,
    "lastFailure": "exit=128 before start",
    "recommendedAction": "REVIEW_THEN_REMOVE"
  },
  {
    "id": "DK-02",
    "name": "Docker hello-world residue",
    "type": "DOCKER",
    "owner": "main",
    "agentResponsible": "main",
    "frequency": "none",
    "origin": "docker ps -a",
    "commandMasked": "hello-world",
    "pid": null,
    "criticality": "ORPHAN",
    "status": "DISABLED",
    "environment": "root2",
    "logs": [],
    "health": {
      "score": 80,
      "state": "DISABLED",
      "reason": "exited 0; harmless residue"
    },
    "restartPolicy": "no",
    "estimatedConsumption": "none",
    "risk": {
      "operational": 0,
      "security": 0,
      "cost": 0,
      "infiniteLoop": 0,
      "cpuRam": 0,
      "deploy": 0,
      "database": 0,
      "token": 0,
      "level": "LOW"
    },
    "tags": [
      "docker",
      "residue"
    ],
    "lastRun": "2026-04-22T13:11:54Z",
    "lastFailure": null,
    "recommendedAction": "REVIEW_THEN_REMOVE"
  },
  {
    "id": "N8N-REMOTE-01",
    "name": "n8n remote flow.techatende.com.br",
    "type": "N8N_REMOTE",
    "owner": "growth",
    "agentResponsible": "main",
    "frequency": "remote managed",
    "origin": "scripts health probes",
    "commandMasked": "https://flow.techatende.com.br/healthz",
    "pid": null,
    "criticality": "IMPORTANT",
    "status": "UNKNOWN",
    "environment": "remote",
    "logs": [],
    "health": {
      "score": 60,
      "state": "UNKNOWN",
      "reason": "local host has no n8n; workflow inventory blocked without N8N_API_KEY"
    },
    "restartPolicy": "remote unknown",
    "estimatedConsumption": "remote unknown",
    "risk": {
      "operational": 2,
      "security": 1,
      "cost": 1,
      "infiniteLoop": 1,
      "cpuRam": 0,
      "deploy": 0,
      "database": 1,
      "token": 2,
      "level": "MEDIUM"
    },
    "tags": [
      "n8n",
      "remote",
      "needs-api-key"
    ],
    "lastRun": "unknown",
    "lastFailure": "inventory blocked",
    "recommendedAction": "KEEP"
  },
  {
    "id": "SB-01",
    "name": "Supabase hosted Arruda",
    "type": "SUPABASE",
    "owner": "supabase",
    "agentResponsible": "main",
    "frequency": "managed service",
    "origin": "arrudaimobi Supabase project/ref",
    "commandMasked": "supabase hosted; local pg_cron references none",
    "pid": null,
    "criticality": "ESSENTIAL",
    "status": "UNKNOWN",
    "environment": "remote",
    "logs": [],
    "health": {
      "score": 65,
      "state": "UNKNOWN",
      "reason": "no pg_cron in repo; hosted state not confirmed due invalid/missing sbp token"
    },
    "restartPolicy": "managed",
    "estimatedConsumption": "managed service",
    "risk": {
      "operational": 2,
      "security": 2,
      "cost": 1,
      "infiniteLoop": 0,
      "cpuRam": 0,
      "deploy": 0,
      "database": 2,
      "token": 2,
      "level": "HIGH"
    },
    "tags": [
      "supabase",
      "database",
      "rls",
      "needs-hosted-audit"
    ],
    "lastRun": "managed",
    "lastFailure": "functions list blocked by token format",
    "recommendedAction": "KEEP"
  }
];

export const automationRegistryFilters = {
  statuses: ["ALL", "HEALTHY", "DEGRADED", "FAILING", "DISABLED", "UNKNOWN"] as const,
  criticalities: ["ALL", "ESSENTIAL", "IMPORTANT", "OPTIONAL", "REDUNDANT", "ORPHAN", "DANGEROUS"] as const,
  riskLevels: ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const,
  types: ["ALL", ...Array.from(new Set(automationRegistryItems.map((item) => item.type))).sort()] as const,
  owners: ["ALL", ...Array.from(new Set(automationRegistryItems.map((item) => item.owner))).sort()] as const,
};

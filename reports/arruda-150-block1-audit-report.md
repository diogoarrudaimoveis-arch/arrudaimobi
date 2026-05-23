# ARRUDA IMOBI 150% — BLOCK 1: AUDITORIA
**Exec:** 2026-05-23T06:56 UTC  
**Block:** 1/8 | **Status:** DONE

---

## REPO & STACK

| Item | Value |
|------|-------|
| Repo | `diogoarrudaimoveis-arch/arrudaimobi` (public) |
| Clone SHA | `6df228f` — Merge hotfix/admin-agents-tdz-role-saas |
| Package Manager | **bun** (`bun.lock` + `bun.lockb`) |
| Framework | **Vite** + **React 18.3** + **TypeScript 5.8** |
| Styling | **Tailwind CSS 3.4** + **Shadcn/UI** (radix-v1) |
| Routing | **React Router v6.30** |
| Data | **TanStack Query v5.83** + **Supabase** (official SDK) |
| Charts | **Recharts 2.15** |
| Calendar | **FullCalendar 6.1** |
| Rich Text | **TipTap 2.11** |
| PDF | **jsPDF 4.2** |
| Validators | **Zod 3.25** |
| PWA | **vite-plugin-pwa 1.2** |

---

## PAGE INVENTORY (50 pages)

### Public Pages (10)
`AgentDetail` · `Agents` · `Blog` · `BlogPost` · `CaptarImovel` · `Contact` · `Index` · `Login` · `Properties` · `PropertyDetail`

### Admin Pages — Core (14)
`AdminAgenda` · `AdminAgents` · `AdminAmenities` · `AdminBlog` · `AdminContacts` · `AdminDashboard` · `AdminEmailSettings` · `AdminMediaLibrary` · `AdminMenuPermissions` · `AdminMessages` · `AdminMostruario` · `AdminOwners` · `AdminPortalMarketing` · `AdminPortals` · `AdminProfile` · `AdminProperties` · `AdminPropertyTypes` · `AdminSettings` · `PropertyPerformance`

### Admin AI Sub-panel (8)
`AdminAIAgents` · `AdminAIAlerts` · `AdminAIAutomations` · `AdminAIHealth` · `AdminAILogs` · `AdminAIOperational` · `AdminAITelemetry` · `AdminDevOps` · `AdminMetaAds` · `AdminSupabaseMonitor` · *(plus `AdminAIConfig` at root level)*

### Proprietario Pages (2)
`ProprietarioDashboard` · `ProprietarioPropertyNew`

---

## INTEGRATIONS MAP

| Integration | Module |
|------------|--------|
| **Supabase** | `src/integrations/supabase/` |
| **Meta Ads** | `src/lib/metaAds/` (Health, Mapper, Client, Types) |
| **WhatsApp** | `src/lib/messaging/whatsapp.ts` |
| **Observability** | `src/lib/observability/` (telemetryService, healthService, alertRegistry, logService) |
| **AI Config** | `src/pages/admin/AdminAIConfig.tsx` |

---

## BUILD CONFIG

- **Vite chunk splitting**: 7 vendor chunks (agenda, editor, icons, export, charts, ui-core, utils)
- **PWA**: enabled with workbox caching (Google Fonts)
- **Build command**: `npm run build` (sitemap + vite build)
- **Dev server**: port 8080, host `::`
- **TSConfig**: strictNullChecks=false, noImplicitAny=false, skipLibCheck=true

---

## DEPLOY TARGET

- **Platform**: Vercel (`vercel.json` present)
- **Edge network**: Implicit (Vercel default)
- **Public repo**: Yes — no deploy key required for read, SSH push denied (needs HTTPS)

---

## CHUNK SPLITTING & BUNDLE HEALTH

Vite is configured with `manualChunks` splitting 7 vendor groups — good for load performance. `chunkSizeWarningLimit: 1000` (1MB). No CI/CD pipeline visible; deploys are likely triggered by Vercel Git integration.

---

## FINDINGS & NEXT STEPS

### ✅ STRENGTHS
- Clean monorepo structure, good file org
- TypeScript + Zod validation in place
- PWA + offline caching configured
- Meta Ads + WhatsApp integrations stubbed
- AI/observability sub-panel exists

### ⚠️ GAPS (Block 2+ targets)
1. **UI/UX**: Public portal layout — mobile-first, hero section, search UX need competitor benchmarking
2. **Meta Ads Panel**: `AdminMetaAds.tsx` exists but needs live campaign dashboard + chart wiring to `metaAdsMapper`
3. **OmniRoute LLM**: No chatbot/NLP search component visible in codebase — needs greenfield
4. **N8N Workflows**: WhatsApp webhook + n8n automation not visible in src
5. **ZPRO Integration**: WhatsApp webhook not in src
6. **Supabase Schema**: schema_dump.sql is empty; full schema audit needed
7. **Vercel CI/CD**: No `.vercel/` or GitHub Actions; preview deploy flow needs setup

---

**Commit:** `arrudaimobi-audit-block1`  
**Next Block:** 2 — UI/UX Research & Frontend Layout Improvement
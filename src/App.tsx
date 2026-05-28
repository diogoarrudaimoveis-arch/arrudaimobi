import { useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { BrandProvider } from "@/components/BrandProvider";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Loader2 } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";

// Lazy loading components
const Index = lazy(() => import("./pages/Index"));
const Properties = lazy(() => import("./pages/Properties"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const Agents = lazy(() => import("./pages/Agents"));
const AgentDetail = lazy(() => import("./pages/AgentDetail"));
const Contact = lazy(() => import("./pages/Contact"));
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
// AdminDashboard is imported directly (not lazy) to prevent React lifecycle race conditions
// that cause tab state to reset when component remounts after lazy Suspense resolution.
// See: diagnostic-dashboard-tabs.md — Fix 1 (Highest Priority)
import AdminDashboard from "./pages/admin/AdminDashboard";
const CaptarImovel = lazy(() => import("./pages/CaptarImovel"));
const ProprietarioDashboard = lazy(() => import("./pages/proprietario/ProprietarioDashboard"));
const ProprietarioPropertyNew = lazy(() => import("./pages/proprietario/ProprietarioPropertyNew"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminProperties = lazy(() => import("./pages/admin/AdminProperties"));
const AdminAgents = lazy(() => import("./pages/admin/AdminAgents"));
const AdminOwners = lazy(() => import("./pages/admin/AdminOwners"));
const AdminAIConfig = lazy(() => import("@/pages/admin/AdminAIConfig"));
const AdminPropertyTypes = lazy(() => import("./pages/admin/AdminPropertyTypes"));
const AdminAmenities = lazy(() => import("./pages/admin/AdminAmenities"));
const AdminContacts = lazy(() => import("./pages/admin/AdminContacts"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminMenuPermissions = lazy(() => import("./pages/admin/AdminMenuPermissions"));
const AdminMediaLibrary = lazy(() => import("./pages/admin/AdminMediaLibrary"));
const AdminEmailSettings = lazy(() => import("./pages/admin/AdminEmailSettings"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminContentGenerator = lazy(() => import("./pages/admin/AdminContentGenerator"));
const AdminPortals = lazy(() => import("./pages/admin/AdminPortals"));
const AdminPortalMarketing = lazy(() => import("./pages/admin/AdminPortalMarketing"));
const AdminAgenda = lazy(() => import("./pages/admin/AdminAgenda"));
const AdminPropertyPerformance = lazy(() => import("./pages/admin/PropertyPerformance"));
const AdminAIOperational = lazy(() => import("./pages/admin/ai/AdminAIOperational"));
const AdminAIAgents = lazy(() => import("./pages/admin/ai/AdminAIAgents"));
const AdminAIAutomations = lazy(() => import("./pages/admin/ai/AdminAIAutomations"));
const AdminAILogs = lazy(() => import("./pages/admin/ai/AdminAILogs"));
const AdminAIHealth = lazy(() => import("./pages/admin/ai/AdminAIHealth"));
const AdminAIAlerts = lazy(() => import("./pages/admin/ai/AdminAIAlerts"));
const AdminAITelemetry = lazy(() => import("./pages/admin/ai/AdminAITelemetry"));
const AdminDevOps = lazy(() => import("./pages/admin/ai/AdminDevOps"));
const AdminN8NWorkflows = lazy(() => import("./pages/admin/AdminN8NWorkflows"));
const AdminMetaAds = lazy(() => import("./pages/admin/ai/AdminMetaAds"));
const AdminSupabaseMonitor = lazy(() => import("./pages/admin/ai/AdminSupabaseMonitor"));
const AdminMostruario = lazy(() => import("./pages/admin/AdminMostruario"));
const AdminPlanosLimites = lazy(() => import("./pages/admin/AdminPlanosLimites"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
  </div>
);

function App() {
  // NOTE: useAISettings and useAuth removed — they use useQuery which requires QueryClient context
  // causing "No QueryClient set" error in React 19. The omnirouteKey is set to empty for now.
  // AI settings and auth will be loaded by pages that can safely use useQuery inside QueryClientProvider.
  const omnirouteKey = "";

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <AuthProvider>
            <BrandProvider>
              <FavoritesProvider>
                <CookieConsentProvider>
                  <TooltipProvider>
                    <HashRouter>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          {/* Public routes */}
                          <Route path="/" element={<Index />} />
                          <Route path="/imoveis" element={<Properties />} />
                          <Route path="/imovel/:id" element={<PropertyDetail />} />
                          <Route path="/corretores" element={<Agents />} />
                          <Route path="/corretor/:id" element={<AgentDetail />} />
                          <Route path="/contato" element={<Contact />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/reset-password" element={<ResetPassword />} />
                          <Route path="/termos" element={<TermsOfService />} />
                          <Route path="/privacidade" element={<PrivacyPolicy />} />
                          <Route path="/captar-imovel" element={<CaptarImovel />} />
                          <Route path="/captar" element={<CaptarImovel />} />

                          {/* Proprietário portal */}
                          <Route path="/proprietario" element={<ProtectedRoute requireOwner><ProprietarioDashboard /></ProtectedRoute>} />
                          <Route path="/proprietario/novo-imovel" element={<ProtectedRoute requireOwner><ProprietarioPropertyNew /></ProtectedRoute>} />

                          {/* Admin routes */}
                          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
                          <Route path="/admin/imoveis" element={<ProtectedRoute requireAdmin><AdminProperties /></ProtectedRoute>} />
                          <Route path="/admin/imoveis/:id" element={<ProtectedRoute requireAdmin><AdminProperties /></ProtectedRoute>} />
                          <Route path="/admin/corretores" element={<ProtectedRoute requireAdmin><AdminAgents /></ProtectedRoute>} />
                          <Route path="/admin/agentes" element={<ProtectedRoute requireAdmin><AdminAgents /></ProtectedRoute>} />
                          <Route path="/admin/proprietarios" element={<ProtectedRoute requireAdmin><AdminOwners /></ProtectedRoute>} />
                          <Route path="/admin/configuracoes-ia" element={<ProtectedRoute requireAdmin><AdminAIConfig /></ProtectedRoute>} />
                          <Route path="/admin/midias" element={<ProtectedRoute requireAdmin><AdminMediaLibrary /></ProtectedRoute>} />
                          <Route path="/admin/biblioteca-midia" element={<ProtectedRoute requireAdmin><AdminMediaLibrary /></ProtectedRoute>} />
                          <Route path="/admin/blog" element={<ProtectedRoute requireAdmin><AdminBlog /></ProtectedRoute>} />
                          <Route path="/admin/tipos" element={<ProtectedRoute requireAdmin><AdminPropertyTypes /></ProtectedRoute>} />
                          <Route path="/admin/tipos-imovel" element={<ProtectedRoute requireAdmin><AdminPropertyTypes /></ProtectedRoute>} />
                          <Route path="/admin/comodidades" element={<ProtectedRoute requireAdmin><AdminAmenities /></ProtectedRoute>} />
                          <Route path="/admin/mostruario" element={<ProtectedRoute requireDeveloper><AdminMostruario /></ProtectedRoute>} />
                          <Route path="/admin/performance" element={<ProtectedRoute requireAdmin><AdminPropertyPerformance /></ProtectedRoute>} />
                          <Route path="/admin/performance-imoveis" element={<ProtectedRoute requireAdmin><AdminPropertyPerformance /></ProtectedRoute>} />
                          <Route path="/admin/portais" element={<ProtectedRoute requireAdmin><AdminPortals /></ProtectedRoute>} />
                          <Route path="/admin/marketing-portal" element={<ProtectedRoute requireAdmin><AdminPortalMarketing /></ProtectedRoute>} />
                          <Route path="/admin/operacional" element={<ProtectedRoute requireAdmin><AdminAIOperational /></ProtectedRoute>} />
                          <Route path="/admin/agentes" element={<ProtectedRoute requireAdmin><AdminAIAgents /></ProtectedRoute>} />
                          <Route path="/admin/automacoes" element={<ProtectedRoute requireAdmin><AdminAIAutomations /></ProtectedRoute>} />
                          <Route path="/admin/logs" element={<ProtectedRoute requireAdmin><AdminAILogs /></ProtectedRoute>} />
                          <Route path="/admin/saude" element={<ProtectedRoute requireAdmin><AdminAIHealth /></ProtectedRoute>} />
                          <Route path="/admin/alertas" element={<ProtectedRoute requireAdmin><AdminAIAlerts /></ProtectedRoute>} />
                          <Route path="/admin/telemetria" element={<ProtectedRoute requireAdmin><AdminAITelemetry /></ProtectedRoute>} />
                          <Route path="/admin/devops" element={<ProtectedRoute requireAdmin><AdminDevOps /></ProtectedRoute>} />
                          <Route path="/admin/ia-operacional" element={<ProtectedRoute requireAdmin><AdminAIOperational /></ProtectedRoute>} />
                          <Route path="/admin/ia-agentes" element={<ProtectedRoute requireAdmin><AdminAIAgents /></ProtectedRoute>} />
                          <Route path="/admin/ia-automacoes" element={<ProtectedRoute requireAdmin><AdminAIAutomations /></ProtectedRoute>} />
                          <Route path="/admin/ia-logs" element={<ProtectedRoute requireAdmin><AdminAILogs /></ProtectedRoute>} />
                          <Route path="/admin/ia-health" element={<ProtectedRoute requireAdmin><AdminAIHealth /></ProtectedRoute>} />
                          <Route path="/admin/n8n-workflows" element={<ProtectedRoute requireAdmin><AdminN8NWorkflows /></ProtectedRoute>} />
                          <Route path="/admin/meta-ads" element={<ProtectedRoute requireAdmin><AdminMetaAds /></ProtectedRoute>} />
                          <Route path="/admin/supabase-monitor" element={<ProtectedRoute requireAdmin><AdminSupabaseMonitor /></ProtectedRoute>} />
                          <Route path="/admin/agenda" element={<ProtectedRoute><AdminAgenda /></ProtectedRoute>} />
                          <Route path="/admin/contatos" element={<ProtectedRoute><AdminContacts /></ProtectedRoute>} />
                          <Route path="/admin/mensagens" element={<ProtectedRoute><AdminMessages /></ProtectedRoute>} />
                          <Route path="/admin/perfil" element={<ProtectedRoute><AdminProfile /></ProtectedRoute>} />
                          <Route path="/admin/email" element={<ProtectedRoute requireAdmin><AdminEmailSettings /></ProtectedRoute>} />
                          <Route path="/admin/permissoes-menu" element={<ProtectedRoute requireAdmin><AdminMenuPermissions /></ProtectedRoute>} />
                          <Route path="/admin/configuracoes" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
                          <Route path="/admin/planos-limites" element={<ProtectedRoute requireDeveloper><AdminPlanosLimites /></ProtectedRoute>} />
                          <Route path="/admin/content-generator" element={<ProtectedRoute requireAdmin><AdminContentGenerator /></ProtectedRoute>} />
                          <Route path="/blog" element={<Blog />} />
                          <Route path="/blog/:slug" element={<BlogPost />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </HashRouter>
                    <Toaster />
                    <Sonner position="top-right" closeButton richColors />
                  </TooltipProvider>
                </CookieConsentProvider>
              </FavoritesProvider>
            </BrandProvider>
          </AuthProvider>
        </ThemeProvider>
        {/* OmniRoute Chat Widget — available on all public pages */}
        {omnirouteKey && <ChatWidget apiKey={omnirouteKey} tenantName="Arruda Imobi" position="bottom-right" />}
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
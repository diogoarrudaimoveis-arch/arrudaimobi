// MARKER_UNIQUE_12345_DO_NOT_REMOVE
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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { useAISettings } from "@/hooks/use-ai-settings";
import { useAuth } from "@/contexts/AuthContext";

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

// ChatWidgetWrapper — calls useAISettings() inside QueryClientProvider tree to avoid
// "No QueryClient set" error. Previously useAISettings was called in App() function body,
// which caused a runtime error because useQuery was invoked outside the context tree.
const ChatWidgetWrapper = () => {
  const { data: aiSettings } = useAISettings();
  const { user } = useAuth();
  const omnirouteKey = (() => {
    if (!aiSettings) return "";
    const primary = aiSettings.primary_provider;
    if (primary === "openai" && aiSettings.openai_keys?.[0]) return aiSettings.openai_keys[0];
    if (primary === "gemini" && aiSettings.gemini_keys?.[0]) return aiSettings.gemini_keys[0];
    if (primary === "groq" && aiSettings.groq_keys?.[0]) return aiSettings.groq_keys[0];
    if (aiSettings.openai_keys?.[0]) return aiSettings.openai_keys[0];
    if (aiSettings.gemini_keys?.[0]) return aiSettings.gemini_keys[0];
    if (aiSettings.groq_keys?.[0]) return aiSettings.groq_keys[0];
    return "";
  })();
  return omnirouteKey ? <ChatWidget apiKey={omnirouteKey} tenantName="Arruda Imobi" position="bottom-right" /> : null;
};

export function App() {
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
                          <Route path="/captar" element={<CaptarImovel />} />

                          {/* Proprietário portal */}
                          <Route path="/proprietario" element={<ProtectedRoute requireOwner><ProprietarioDashboard /></ProtectedRoute>} />
                          <Route path="/proprietario/novo-imovel" element={<ProtectedRoute requireOwner><ProprietarioPropertyNew /></ProtectedRoute>} />

                          {/* Admin routes */}
                          <Route path="/admin" element={
                            <ErrorBoundary section="AdminDashboard">
                              <ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>
                            </ErrorBoundary>
                          } />
                          <Route path="/admin/imoveis" element={<ErrorBoundary section="AdminProperties"><ProtectedRoute requireAdmin><AdminProperties /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/imoveis/:id" element={<ErrorBoundary section="AdminProperties"><ProtectedRoute requireAdmin><AdminProperties /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/corretores" element={<ErrorBoundary section="AdminAgents"><ProtectedRoute requireAdmin><AdminAgents /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/proprietarios" element={<ErrorBoundary section="AdminOwners"><ProtectedRoute requireAdmin><AdminOwners /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/configuracoes-ia" element={<ErrorBoundary section="AdminAIConfig"><ProtectedRoute requireAdmin><AdminAIConfig /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/tipos" element={<ErrorBoundary section="AdminPropertyTypes"><ProtectedRoute requireAdmin><AdminPropertyTypes /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/comodidades" element={<ErrorBoundary section="AdminAmenities"><ProtectedRoute requireAdmin><AdminAmenities /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/mostruario" element={<ErrorBoundary section="AdminMostruario"><ProtectedRoute requireAdmin><AdminMostruario /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/performance" element={<ErrorBoundary section="AdminPerformance"><ProtectedRoute requireAdmin><AdminPropertyPerformance /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/operacional" element={<ErrorBoundary section="AdminAIOperational"><ProtectedRoute requireAdmin><AdminAIOperational /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/agentes" element={<ErrorBoundary section="AdminAIAgents"><ProtectedRoute requireAdmin><AdminAIAgents /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/automacoes" element={<ErrorBoundary section="AdminAIAutomations"><ProtectedRoute requireAdmin><AdminAIAutomations /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/logs" element={<ErrorBoundary section="AdminAILogs"><ProtectedRoute requireAdmin><AdminAILogs /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/saude" element={<ErrorBoundary section="AdminAIHealth"><ProtectedRoute requireAdmin><AdminAIHealth /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/alertas" element={<ErrorBoundary section="AdminAIAlerts"><ProtectedRoute requireAdmin><AdminAIAlerts /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/telemetria" element={<ErrorBoundary section="AdminAITelemetry"><ProtectedRoute requireAdmin><AdminAITelemetry /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/devops" element={<ErrorBoundary section="AdminDevOps"><ProtectedRoute requireAdmin><AdminDevOps /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/n8n-workflows" element={<ErrorBoundary section="AdminN8NWorkflows"><ProtectedRoute requireAdmin><AdminN8NWorkflows /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/meta-ads" element={<ErrorBoundary section="AdminMetaAds"><ProtectedRoute requireAdmin><AdminMetaAds /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/supabase-monitor" element={<ErrorBoundary section="AdminSupabaseMonitor"><ProtectedRoute requireAdmin><AdminSupabaseMonitor /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/agenda" element={<ErrorBoundary section="AdminAgenda"><ProtectedRoute><AdminAgenda /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/contatos" element={<ErrorBoundary section="AdminContacts"><ProtectedRoute><AdminContacts /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/mensagens" element={<ErrorBoundary section="AdminMessages"><ProtectedRoute><AdminMessages /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/perfil" element={<ErrorBoundary section="AdminProfile"><ProtectedRoute><AdminProfile /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/email" element={<ErrorBoundary section="AdminEmailSettings"><ProtectedRoute requireAdmin><AdminEmailSettings /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/permissoes-menu" element={<ErrorBoundary section="AdminMenuPermissions"><ProtectedRoute requireAdmin><AdminMenuPermissions /></ProtectedRoute></ErrorBoundary>} />
                          <Route path="/admin/configuracoes" element={<ErrorBoundary section="AdminSettings"><ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute></ErrorBoundary>} />
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
        <ChatWidgetWrapper />
      </QueryClientProvider>
    </HelmetProvider>
  );
}


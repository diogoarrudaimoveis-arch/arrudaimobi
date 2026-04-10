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
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminProperties = lazy(() => import("./pages/admin/AdminProperties"));
const AdminAgents = lazy(() => import("./pages/admin/AdminAgents"));
const AdminOwners = lazy(() => import("./pages/admin/AdminOwners"));
const AdminAIConfig = lazy(() => import("@/pages/admin/AdminAIConfig"));
const AdminPropertyTypes = lazy(() => import("./pages/admin/AdminPropertyTypes"));
const AdminAmenities = lazy(() => import("./pages/admin/AdminAmenities"));
const AdminContacts = lazy(() => import("./pages/admin/AdminContacts"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminMediaLibrary = lazy(() => import("./pages/admin/AdminMediaLibrary"));
const AdminEmailSettings = lazy(() => import("./pages/admin/AdminEmailSettings"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminPortals = lazy(() => import("./pages/admin/AdminPortals"));
const AdminPortalMarketing = lazy(() => import("./pages/admin/AdminPortalMarketing"));
const AdminAgenda = lazy(() => import("./pages/admin/AdminAgenda"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh] w-full">
    <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
  </div>
);

const DynamicManifest = () => {
  useEffect(() => {
    const PROJECT_ID = "udutxbyzrdwucabxqvgg";
    const manifestUrl = `https://${PROJECT_ID}.supabase.co/functions/v1/public-api?action=get-manifest&slug=default`;

    // Remove existing manifest links
    const existingLinks = document.querySelectorAll('link[rel="manifest"]');
    existingLinks.forEach(link => link.remove());

    // Create new dynamic manifest link
    const newLink = document.createElement("link");
    newLink.rel = "manifest";
    newLink.href = manifestUrl;
    
    // Set crossOrigin if manifest is on a different domain
    newLink.crossOrigin = "use-credentials";
    
    document.head.appendChild(newLink);
  }, []);

  return null;
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <BrandProvider>
            <FavoritesProvider>
              <CookieConsentProvider>
                <TooltipProvider>
                  <DynamicManifest />
                  <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/imoveis" element={<Properties />} />
                        <Route path="/imoveis/:id" element={<PropertyDetail />} />
                        <Route path="/agentes" element={<Agents />} />
                        <Route path="/agentes/:id" element={<AgentDetail />} />
                        <Route path="/contato" element={<Contact />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/termos" element={<TermsOfService />} />
                        <Route path="/privacidade" element={<PrivacyPolicy />} />
                        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                        <Route path="/admin/proprietarios" element={<ProtectedRoute requireAdmin><AdminOwners /></ProtectedRoute>} />
                        <Route path="/admin/configuracoes-ia" element={<ProtectedRoute requireAdmin><AdminAIConfig /></ProtectedRoute>} />
                        <Route path="/admin/imoveis" element={<ProtectedRoute><AdminProperties /></ProtectedRoute>} />
                        <Route path="/admin/agentes" element={<ProtectedRoute requireAdmin><AdminAgents /></ProtectedRoute>} />
                        <Route path="/admin/tipos" element={<ProtectedRoute requireAdmin><AdminPropertyTypes /></ProtectedRoute>} />
                        <Route path="/admin/comodidades" element={<ProtectedRoute><AdminAmenities /></ProtectedRoute>} />
                        <Route path="/admin/midias" element={<ProtectedRoute><AdminMediaLibrary /></ProtectedRoute>} />
                        <Route path="/admin/blog" element={<ProtectedRoute><AdminBlog /></ProtectedRoute>} />
                        <Route path="/admin/portais" element={<ProtectedRoute requireAdmin><AdminPortals /></ProtectedRoute>} />
                        <Route path="/admin/marketing-portal" element={<ProtectedRoute requireAdmin><AdminPortalMarketing /></ProtectedRoute>} />
                        <Route path="/admin/agenda" element={<ProtectedRoute><AdminAgenda /></ProtectedRoute>} />
                        <Route path="/admin/contatos" element={<ProtectedRoute><AdminContacts /></ProtectedRoute>} />
                        <Route path="/admin/mensagens" element={<ProtectedRoute><AdminMessages /></ProtectedRoute>} />
                        <Route path="/admin/perfil" element={<ProtectedRoute><AdminProfile /></ProtectedRoute>} />
                        <Route path="/admin/email" element={<ProtectedRoute requireAdmin><AdminEmailSettings /></ProtectedRoute>} />
                        <Route path="/admin/configuracoes" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
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
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;

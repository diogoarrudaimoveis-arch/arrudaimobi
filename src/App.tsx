import { useEffect } from "react";
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
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminProperties from "./pages/admin/AdminProperties";
import AdminAgents from "./pages/admin/AdminAgents";
import AdminOwners from "./pages/admin/AdminOwners";
import AdminAIConfig from "@/pages/admin/AdminAIConfig";
import AdminPropertyTypes from "./pages/admin/AdminPropertyTypes";
import AdminAmenities from "./pages/admin/AdminAmenities";
import AdminContacts from "./pages/admin/AdminContacts";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminMediaLibrary from "./pages/admin/AdminMediaLibrary";
import AdminEmailSettings from "./pages/admin/AdminEmailSettings";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminPortals from "./pages/admin/AdminPortals";
import AdminPortalMarketing from "./pages/admin/AdminPortalMarketing";
import AdminAgenda from "./pages/admin/AdminAgenda";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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

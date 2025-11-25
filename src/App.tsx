import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DrPhillipChat } from "@/components/DrPhillipChat";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import PURLLandingPage from "./pages/PURLLandingPage";

import AudienceDetail from "./pages/AudienceDetail";
import RecipientDetail from "./pages/RecipientDetail";
import Templates from "./pages/Templates";
import CampaignPrototype from "./pages/CampaignPrototype";
import GrapesJSTemplateEditor from "./pages/GrapesJSTemplateEditor";
import Analytics from "./pages/Analytics";
import CampaignAnalytics from "./pages/CampaignAnalytics";
import API from "./pages/API";
import APIDocumentation from "./pages/APIDocumentation";
import GiftCards from "./pages/GiftCards";
import PurchaseGiftCards from "./pages/PurchaseGiftCards";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import GenerateFavicon from "./pages/GenerateFavicon";
import UserManagement from "./pages/UserManagement";
import AcceptInvite from "./pages/AcceptInvite";
import LandingPages from "./pages/LandingPages";
import GiftCardReveal from "./pages/GiftCardReveal";
import EmbedGiftCard from "./pages/EmbedGiftCard";
import AgencyManagement from "./pages/AgencyManagement";
import CallCenterDashboard from "./pages/CallCenterDashboard";
import CallCenterRedemption from "./pages/CallCenterRedemption";
import ZapierTemplates from "./pages/ZapierTemplates";
import GrapesJSLandingPageEditor from "./pages/GrapesJSLandingPageEditor";
import AITemplateEditor from "./pages/AITemplateEditor";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import Activities from "./pages/Activities";
import Tasks from "./pages/Tasks";
import AdminGiftCardMarketplace from "./pages/AdminGiftCardMarketplace";
import Webinar from "./pages/Webinar";
import AceForms from "./pages/AceForms";
import AceFormBuilder from "./pages/AceFormBuilder";
import AceFormPublic from "./pages/AceFormPublic";
import AceFormAnalytics from "./pages/AceFormAnalytics";
import AceFormsDocumentation from "./pages/AceFormsDocumentation";
import AdminAuditLog from "./pages/AdminAuditLog";
import PerformanceMonitoring from "./pages/PerformanceMonitoring";
import ErrorTracking from "./pages/ErrorTracking";
import SystemAlerts from "./pages/SystemAlerts";
import Help from "./pages/Help";
import BetaTesting from "./pages/BetaTesting";
import LaunchChecklist from "./pages/LaunchChecklist";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import { CookieConsent } from "./components/CookieConsent";
import Documentation from "./pages/Documentation";
import AdminDocumentation from "./pages/AdminDocumentation";
import Dashboard from "./pages/Dashboard";
import { PlatformDashboard } from "./pages/PlatformDashboard";
import EnrichData from "./pages/EnrichData";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - reduce refetching
      gcTime: 10 * 60 * 1000, // 10 minutes - garbage collection time
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Only retry once on failure
      refetchOnMount: 'always', // Always refetch on component mount
    },
    mutations: {
      retry: 0, // Don't retry mutations
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <AuthProvider>
              <TenantProvider>
                <ImpersonationBanner />
                <Toaster />
                <Sonner />
                <DrPhillipChat />
                <CookieConsent />
                <Routes>
                  <Route path="/accept-invite" element={<AcceptInvite />} />
                  <Route path="/c/:campaignId/:token" element={<PURLLandingPage />} />
                  <Route path="/embed/gift-card" element={<EmbedGiftCard />} />
                  <Route path="/embed/gift-card/:campaignId" element={<EmbedGiftCard />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/f/:formSlug" element={<AceFormPublic />} />
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/platform" element={<ProtectedRoute requiredPermissions={['admin']}><PlatformDashboard /></ProtectedRoute>} />
                  <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
                  <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
                  <Route path="/audiences/:id" element={<ProtectedRoute><AudienceDetail /></ProtectedRoute>} />
                  <Route path="/recipients/:id" element={<ProtectedRoute><RecipientDetail /></ProtectedRoute>} />
                  <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                  <Route path="/analytics/campaigns/:id" element={<ProtectedRoute><CampaignAnalytics /></ProtectedRoute>} />
                  <Route path="/api" element={<ProtectedRoute><API /></ProtectedRoute>} />
                  <Route path="/api-docs" element={<ProtectedRoute><APIDocumentation /></ProtectedRoute>} />
                  <Route path="/gift-cards" element={<ProtectedRoute><GiftCards /></ProtectedRoute>} />
                  <Route path="/gift-cards/purchase" element={<ProtectedRoute><PurchaseGiftCards /></ProtectedRoute>} />
                  <Route path="/gift-cards/marketplace" element={<ProtectedRoute requiredPermissions={['admin']}><AdminGiftCardMarketplace /></ProtectedRoute>} />
                  <Route path="/call-center" element={<ProtectedRoute requiredPermissions={['calls.view', 'calls.manage']}><CallCenterDashboard /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/user-management" element={<ProtectedRoute requiredPermissions={['admin', 'users.manage']}><UserManagement /></ProtectedRoute>} />
                  <Route path="/landing-pages" element={<ProtectedRoute><LandingPages /></ProtectedRoute>} />
                  <Route path="/landing-pages/new/visual-editor" element={<ProtectedRoute><GrapesJSLandingPageEditor /></ProtectedRoute>} />
                  <Route path="/landing-pages/:id/visual-editor" element={<ProtectedRoute><GrapesJSLandingPageEditor /></ProtectedRoute>} />
                  <Route path="/landing-pages/:id/edit-grapesjs" element={<ProtectedRoute><GrapesJSLandingPageEditor /></ProtectedRoute>} />
                  <Route path="/templates/:id/ai-editor" element={<ProtectedRoute><AITemplateEditor /></ProtectedRoute>} />
                  <Route path="/redeem/:campaignId/:redemptionToken" element={<GiftCardReveal />} />
                  <Route path="/call-center/redeem" element={<ProtectedRoute requiredPermissions={['calls.confirm_redemption']}><CallCenterRedemption /></ProtectedRoute>} />
                  <Route path="/generate-favicon" element={<ProtectedRoute><GenerateFavicon /></ProtectedRoute>} />
                  <Route path="/agencies" element={<ProtectedRoute requiredPermissions={['admin']}><AgencyManagement /></ProtectedRoute>} />
                  <Route path="/prototype/:id" element={<ProtectedRoute><CampaignPrototype /></ProtectedRoute>} />
                  <Route path="/template-builder/:id" element={<ProtectedRoute><GrapesJSTemplateEditor /></ProtectedRoute>} />
                  <Route path="/zapier" element={<ProtectedRoute><ZapierTemplates /></ProtectedRoute>} />
                  <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
                  <Route path="/contacts/:id" element={<ProtectedRoute><ContactDetail /></ProtectedRoute>} />
                  <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
                  <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                  <Route path="/webinar" element={<ProtectedRoute><Webinar /></ProtectedRoute>} />
                  <Route path="/ace-forms" element={<ProtectedRoute><AceForms /></ProtectedRoute>} />
                  <Route path="/ace-forms/:id/builder" element={<ProtectedRoute><AceFormBuilder /></ProtectedRoute>} />
                  <Route path="/ace-forms/:id/analytics" element={<ProtectedRoute><AceFormAnalytics /></ProtectedRoute>} />
                  <Route path="/ace-forms/docs" element={<ProtectedRoute><AceFormsDocumentation /></ProtectedRoute>} />
                  <Route path="/admin/audit-log" element={<ProtectedRoute requiredPermissions={['admin']}><AdminAuditLog /></ProtectedRoute>} />
                  <Route path="/monitoring/performance" element={<ProtectedRoute requiredPermissions={['admin']}><PerformanceMonitoring /></ProtectedRoute>} />
                  <Route path="/monitoring/errors" element={<ProtectedRoute requiredPermissions={['admin']}><ErrorTracking /></ProtectedRoute>} />
                  <Route path="/monitoring/alerts" element={<ProtectedRoute requiredPermissions={['admin']}><SystemAlerts /></ProtectedRoute>} />
                  <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
                  <Route path="/beta" element={<ProtectedRoute><BetaTesting /></ProtectedRoute>} />
                  <Route path="/launch" element={<ProtectedRoute><LaunchChecklist /></ProtectedRoute>} />
                  <Route path="/docs" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
                  <Route path="/docs/:category" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
                  <Route path="/docs/:category/:slug" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
                  <Route path="/admin/docs" element={<ProtectedRoute requiredPermissions={['admin']}><AdminDocumentation /></ProtectedRoute>} />
                  <Route path="/admin/docs/manage" element={<ProtectedRoute requiredPermissions={['admin']}><AdminDocumentation /></ProtectedRoute>} />
                  <Route path="/enrich-data" element={<ProtectedRoute requiredPermissions={['admin']}><EnrichData /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TenantProvider>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

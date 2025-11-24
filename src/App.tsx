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
import TemplateBuilderV2 from "./pages/TemplateBuilderV2";
import Analytics from "./pages/Analytics";
import CampaignAnalytics from "./pages/CampaignAnalytics";
import API from "./pages/API";
import APIDocumentation from "./pages/APIDocumentation";
import GiftCards from "./pages/GiftCards";
import PurchaseGiftCards from "./pages/PurchaseGiftCards";
import AgentCallDashboard from "./pages/AgentCallDashboard";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import GenerateFavicon from "./pages/GenerateFavicon";
import UserManagement from "./pages/UserManagement";
import AcceptInvite from "./pages/AcceptInvite";
import LandingPages from "./pages/LandingPages";
import SimpleLandingPageEditor from "./pages/SimpleLandingPageEditor";
import GiftCardReveal from "./pages/GiftCardReveal";
import EmbedGiftCard from "./pages/EmbedGiftCard";
import AgencyManagement from "./pages/AgencyManagement";
import CallCenterDashboard from "./pages/CallCenterDashboard";
import CallCenterRedemption from "./pages/CallCenterRedemption";
import ZapierTemplates from "./pages/ZapierTemplates";
import AIGeneratedLandingPage from "./pages/AIGeneratedLandingPage";

import GrapesJSLandingPageEditor from "./pages/GrapesJSLandingPageEditor";
import AILandingPageEditor from "./pages/AILandingPageEditor";
import AITemplateEditor from "./pages/AITemplateEditor";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
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
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/accept-invite" element={<AcceptInvite />} />
                  <Route path="/c/:campaignId/:token" element={<PURLLandingPage />} />
                  <Route path="/p/:slug" element={<AIGeneratedLandingPage />} />
                  <Route path="/embed/gift-card" element={<EmbedGiftCard />} />
                  <Route path="/embed/gift-card/:campaignId" element={<EmbedGiftCard />} />
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
                  <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
                  <Route path="/audiences" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
                  <Route path="/audiences/:id" element={<ProtectedRoute><AudienceDetail /></ProtectedRoute>} />
                  <Route path="/recipients/:id" element={<ProtectedRoute><RecipientDetail /></ProtectedRoute>} />
                  <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
                  <Route path="/template-builder/:id" element={<ProtectedRoute><TemplateBuilderV2 /></ProtectedRoute>} />
                  <Route path="/webinar" element={<ProtectedRoute><Webinar /></ProtectedRoute>} />
                  <Route path="/ace-forms" element={<ProtectedRoute><AceForms /></ProtectedRoute>} />
                  <Route path="/ace-forms/new" element={<ProtectedRoute><AceFormBuilder /></ProtectedRoute>} />
                  <Route path="/ace-forms/:id/edit" element={<ProtectedRoute><AceFormBuilder /></ProtectedRoute>} />
                  <Route path="/ace-forms/:formId/analytics" element={<ProtectedRoute><AceFormAnalytics /></ProtectedRoute>} />
                  <Route path="/ace-forms/docs" element={<ProtectedRoute><AceFormsDocumentation /></ProtectedRoute>} />
                  <Route path="/forms/:formId" element={<AceFormPublic />} />
                  <Route path="/analytics" element={<ProtectedRoute requiredPermission="analytics.view"><Analytics /></ProtectedRoute>} />
                  <Route path="/analytics/:campaignId" element={<ProtectedRoute requiredPermission="analytics.view"><CampaignAnalytics /></ProtectedRoute>} />
                  <Route path="/performance" element={<ProtectedRoute requiredPermission="analytics.view"><PerformanceMonitoring /></ProtectedRoute>} />
                  <Route path="/errors" element={<ProtectedRoute requiredPermission="analytics.view"><ErrorTracking /></ProtectedRoute>} />
                  <Route path="/alerts" element={<ProtectedRoute requiredPermission="analytics.view"><SystemAlerts /></ProtectedRoute>} />
                  <Route path="/campaign-prototype/:id" element={<ProtectedRoute><CampaignPrototype /></ProtectedRoute>} />
                  <Route path="/api" element={<ProtectedRoute><API /></ProtectedRoute>} />
                  <Route path="/purchase-gift-cards" element={<ProtectedRoute requiredPermission="gift_cards.purchase"><PurchaseGiftCards /></ProtectedRoute>} />
                  <Route path="/gift-cards" element={<ProtectedRoute><GiftCards /></ProtectedRoute>} />
                  <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
                  <Route path="/contacts/:id" element={<ProtectedRoute><ContactDetail /></ProtectedRoute>} />
                  <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
                  <Route path="/companies/:id" element={<ProtectedRoute><CompanyDetail /></ProtectedRoute>} />
                  <Route path="/deals" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
                  <Route path="/deals/:id" element={<ProtectedRoute><DealDetail /></ProtectedRoute>} />
                  <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
                  <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                  <Route path="/api/docs" element={<ProtectedRoute><APIDocumentation /></ProtectedRoute>} />
                  <Route path="/landing-pages" element={<ProtectedRoute><LandingPages /></ProtectedRoute>} />
                  <Route path="/landing-pages/:id/edit" element={<ProtectedRoute><SimpleLandingPageEditor /></ProtectedRoute>} />
                  <Route path="/landing-pages/:id/visual-editor" element={<ProtectedRoute><GrapesJSLandingPageEditor /></ProtectedRoute>} />
                  <Route path="/landing-pages/:id/ai-editor" element={<ProtectedRoute><AILandingPageEditor /></ProtectedRoute>} />
                  <Route path="/landing-pages/:id/edit-grapesjs" element={<ProtectedRoute><GrapesJSLandingPageEditor /></ProtectedRoute>} />
                  <Route path="/templates/:id/ai-editor" element={<ProtectedRoute><AITemplateEditor /></ProtectedRoute>} />
                  <Route path="/redeem/:campaignId/:redemptionToken" element={<GiftCardReveal />} />
                  <Route path="/call-center/redeem" element={<ProtectedRoute requiredPermissions={['calls.confirm_redemption']}><CallCenterRedemption /></ProtectedRoute>} />
                  <Route path="/agent-dashboard" element={<ProtectedRoute requiredPermissions={['calls.agent_dashboard', 'calls.confirm_redemption']}><AgentCallDashboard /></ProtectedRoute>} />
                  <Route path="/call-center" element={<ProtectedRoute requiredPermissions={['calls.view', 'calls.manage']}><CallCenterDashboard /></ProtectedRoute>} />
                  <Route path="/agency-management" element={<ProtectedRoute requiredRole="agency_owner"><AgencyManagement /></ProtectedRoute>} />
                  <Route path="/admin/gift-card-marketplace" element={<ProtectedRoute requiredRole="admin"><AdminGiftCardMarketplace /></ProtectedRoute>} />
                  <Route path="/admin/audit-log" element={<ProtectedRoute requiredRole="admin"><AdminAuditLog /></ProtectedRoute>} />
                  <Route path="/admin/docs" element={<ProtectedRoute requiredRole="admin"><Documentation /></ProtectedRoute>} />
                  <Route path="/admin/docs/:category/:slug" element={<ProtectedRoute requiredRole="admin"><Documentation /></ProtectedRoute>} />
                  <Route path="/admin/docs/manage" element={<ProtectedRoute requiredRole="admin"><AdminDocumentation /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute requiredPermission="settings.view"><Settings /></ProtectedRoute>} />
                  <Route path="/settings/:tab" element={<ProtectedRoute requiredPermission="settings.view"><Settings /></ProtectedRoute>} />
                  <Route path="/zapier-templates" element={<ProtectedRoute><ZapierTemplates /></ProtectedRoute>} />
                  <Route path="/generate-favicon" element={<ProtectedRoute><GenerateFavicon /></ProtectedRoute>} />
                  <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
                  <Route path="/beta-testing" element={<ProtectedRoute><BetaTesting /></ProtectedRoute>} />
                  <Route path="/launch-checklist" element={<ProtectedRoute requiredRole="admin"><LaunchChecklist /></ProtectedRoute>} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/users" element={<ProtectedRoute requiredPermission="users.view"><UserManagement /></ProtectedRoute>} />
                  <Route path="/agent/call/:sessionId" element={<ProtectedRoute><AgentCallDashboard /></ProtectedRoute>} />
                  <Route path="/enrich-data" element={<EnrichData />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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

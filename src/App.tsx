import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DrPhillipChatWrapper } from "@/components/DrPhillipChatWrapper";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Campaigns from "./pages/Campaigns";
import CampaignCreate from "./pages/CampaignCreate";
import CampaignDetail from "./pages/CampaignDetail";
import PURLLandingPage from "./pages/PURLLandingPage";
import AudienceDetail from "./pages/AudienceDetail";
import RecipientDetail from "./pages/RecipientDetail";
  import Mail from "./pages/Mail";
  import CampaignPrototype from "./pages/CampaignPrototype";
  import MailDesigner from "./pages/MailDesigner";
import CampaignAnalytics from "./pages/CampaignAnalytics";
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
import GrapesJSLandingPageEditor from "./pages/GrapesJSLandingPageEditor";

import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import ContactLists from "./pages/ContactLists";
import ListDetail from "./pages/contacts/ListDetail";
import ContactImport from "./pages/ContactImport";
import Activities from "./pages/Activities";
import Tasks from "./pages/Tasks";
import TeamManagement from "./pages/TeamManagement";
import AdminGiftCardMarketplace from "./pages/AdminGiftCardMarketplace";
import AdminSiteDirectory from "./pages/AdminSiteDirectory";
import Webinar from "./pages/Webinar";
import AceForms from "./pages/AceForms";
import AceFormBuilder from "./pages/AceFormBuilder";
import AceFormPublic from "./pages/AceFormPublic";
import AceFormAnalytics from "./pages/AceFormAnalytics";
import AceFormsDocumentation from "./pages/AceFormsDocumentation";
import AdminAuditLog from "./pages/AdminAuditLog";
import BetaTesting from "./pages/BetaTesting";
import LaunchChecklist from "./pages/LaunchChecklist";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import { CookieConsent } from "./components/CookieConsent";
import Documentation from "./pages/Documentation";
import Dashboard from "./pages/Dashboard";
import { PlatformDashboard } from "./pages/PlatformDashboard";
import EnrichData from "./pages/EnrichData";
import SystemHealth from "./pages/SystemHealth";
import Integrations from "./pages/Integrations";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
      refetchOnMount: 'always',
    },
    mutations: {
      retry: 0,
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
                <DrPhillipChatWrapper />
                <CookieConsent />
                <Routes>
                  {/* Public Routes */}
                  <Route path="/accept-invite" element={<AcceptInvite />} />
                  <Route path="/c/:campaignId/:token" element={<PURLLandingPage />} />
                  <Route path="/embed/gift-card" element={<EmbedGiftCard />} />
                  <Route path="/embed/gift-card/:campaignId" element={<EmbedGiftCard />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/f/:formSlug" element={<AceFormPublic />} />
                  <Route path="/forms/:formId" element={<AceFormPublic />} />
                  <Route path="/redeem/:campaignId/:redemptionToken" element={<GiftCardReveal />} />

                  {/* Redirects for consolidated pages */}
                  <Route path="/analytics" element={<Navigate to="/admin/system-health?tab=overview" replace />} />
                  <Route path="/performance" element={<Navigate to="/admin/system-health?tab=performance" replace />} />
                  <Route path="/errors" element={<Navigate to="/admin/system-health?tab=errors" replace />} />
                  <Route path="/alerts" element={<Navigate to="/admin/system-health?tab=alerts" replace />} />
                  <Route path="/monitoring/performance" element={<Navigate to="/admin/system-health?tab=performance" replace />} />
                  <Route path="/monitoring/errors" element={<Navigate to="/admin/system-health?tab=errors" replace />} />
                  <Route path="/monitoring/alerts" element={<Navigate to="/admin/system-health?tab=alerts" replace />} />
                  <Route path="/api" element={<Navigate to="/admin/integrations?tab=api" replace />} />
                  <Route path="/zapier" element={<Navigate to="/admin/integrations?tab=zapier" replace />} />
                  <Route path="/zapier-templates" element={<Navigate to="/admin/integrations?tab=zapier" replace />} />
                  <Route path="/admin/docs/manage" element={<Navigate to="/admin/docs?tab=manage" replace />} />
                  <Route path="/help" element={<Navigate to="/admin/docs?tab=docs" replace />} />

                  {/* Protected Routes */}
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/platform" element={<ProtectedRoute requiredRole="admin"><PlatformDashboard /></ProtectedRoute>} />
                  
                  {/* Campaigns */}
                  <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
                  <Route path="/campaigns/new" element={<ProtectedRoute><CampaignCreate /></ProtectedRoute>} />
                  <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
                  <Route path="/audiences/:id" element={<ProtectedRoute><AudienceDetail /></ProtectedRoute>} />
                  <Route path="/recipients/:id" element={<ProtectedRoute><RecipientDetail /></ProtectedRoute>} />
                  <Route path="/analytics/campaigns/:id" element={<ProtectedRoute><CampaignAnalytics /></ProtectedRoute>} />
                  <Route path="/prototype/:id" element={<ProtectedRoute><CampaignPrototype /></ProtectedRoute>} />
                  
                  {/* Mail & Landing Pages */}
                  <Route path="/mail" element={<ProtectedRoute><Mail /></ProtectedRoute>} />
                  <Route path="/mail-designer/:id" element={<ProtectedRoute><MailDesigner /></ProtectedRoute>} />
                  {/* Redirects from old template routes */}
                  <Route path="/templates" element={<Navigate to="/mail" replace />} />
                  <Route path="/template-builder/:id" element={<Navigate to="/mail-designer/:id" replace />} />
                  <Route path="/landing-pages" element={<ProtectedRoute><LandingPages /></ProtectedRoute>} />
                  <Route path="/landing-pages/new/visual-editor" element={<ProtectedRoute><GrapesJSLandingPageEditor /></ProtectedRoute>} />
                  <Route path="/landing-pages/:id/visual-editor" element={<ProtectedRoute><GrapesJSLandingPageEditor /></ProtectedRoute>} />
                  <Route path="/landing-pages/:id/edit-grapesjs" element={<ProtectedRoute><GrapesJSLandingPageEditor /></ProtectedRoute>} />
                  
                  {/* Gift Cards */}
                  <Route path="/gift-cards" element={<ProtectedRoute><GiftCards /></ProtectedRoute>} />
                  <Route path="/gift-cards/purchase" element={<ProtectedRoute><PurchaseGiftCards /></ProtectedRoute>} />
                  <Route path="/gift-cards/marketplace" element={<ProtectedRoute requiredRole="admin"><AdminGiftCardMarketplace /></ProtectedRoute>} />
                  <Route path="/admin/gift-card-marketplace" element={<ProtectedRoute requiredRole="admin"><AdminGiftCardMarketplace /></ProtectedRoute>} />
                  <Route path="/purchase-gift-cards" element={<ProtectedRoute><PurchaseGiftCards /></ProtectedRoute>} />
                  
                  {/* Contacts System */}
                  <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
                  <Route path="/contacts/:id" element={<ProtectedRoute><ContactDetail /></ProtectedRoute>} />
                  <Route path="/contacts/lists" element={<ProtectedRoute><ContactLists /></ProtectedRoute>} />
                  <Route path="/contacts/lists/:id" element={<ProtectedRoute><ListDetail /></ProtectedRoute>} />
                  <Route path="/contacts/import" element={<ProtectedRoute><ContactImport /></ProtectedRoute>} />
                  <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
                  <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                  <Route path="/team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
                  
                  {/* Call Center - Redemption & Fulfillment */}
                  <Route path="/call-center" element={<ProtectedRoute requiredPermissions={['calls.view', 'calls.manage']}><CallCenterDashboard /></ProtectedRoute>} />
                  <Route path="/call-center/redeem" element={<ProtectedRoute requiredPermissions={['calls.confirm_redemption']}><CallCenterRedemption /></ProtectedRoute>} />
                  
                  {/* ACE Forms */}
                  <Route path="/ace-forms" element={<ProtectedRoute><AceForms /></ProtectedRoute>} />
                  <Route path="/ace-forms/new" element={<ProtectedRoute><AceFormBuilder /></ProtectedRoute>} />
                  <Route path="/ace-forms/:formId/builder" element={<ProtectedRoute><AceFormBuilder /></ProtectedRoute>} />
                  <Route path="/ace-forms/:formId/analytics" element={<ProtectedRoute><AceFormAnalytics /></ProtectedRoute>} />
                  <Route path="/ace-forms/docs" element={<ProtectedRoute><AceFormsDocumentation /></ProtectedRoute>} />
                  
                  {/* Administration - Consolidated */}
                  <Route path="/admin/system-health" element={<ProtectedRoute><SystemHealth /></ProtectedRoute>} />
                  <Route path="/admin/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
                  <Route path="/admin/docs" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
                  <Route path="/admin/docs/:category" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
                  <Route path="/admin/docs/:category/:slug" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute requiredPermissions={['users.view', 'users.manage']}><UserManagement /></ProtectedRoute>} />
                  <Route path="/user-management" element={<ProtectedRoute requiredPermissions={['users.manage']}><UserManagement /></ProtectedRoute>} />
                  
                  {/* Documentation */}
                  <Route path="/docs" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
                  <Route path="/docs/:category" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
                  <Route path="/docs/:category/:slug" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
                  
                  {/* Settings & Utilities */}
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/settings/:tab" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/webinar" element={<ProtectedRoute><Webinar /></ProtectedRoute>} />
                  <Route path="/generate-favicon" element={<ProtectedRoute><GenerateFavicon /></ProtectedRoute>} />
                  <Route path="/api-docs" element={<ProtectedRoute><APIDocumentation /></ProtectedRoute>} />
                  
                  {/* Admin Routes */}
                  <Route path="/agencies" element={<ProtectedRoute requiredRole="admin"><AgencyManagement /></ProtectedRoute>} />
                  <Route path="/agency-management" element={<ProtectedRoute requiredRole="admin"><AgencyManagement /></ProtectedRoute>} />
                  <Route path="/admin/audit-log" element={<ProtectedRoute requiredRole="admin"><AdminAuditLog /></ProtectedRoute>} />
                  <Route path="/admin/site-directory" element={<ProtectedRoute requiredRole="admin"><AdminSiteDirectory /></ProtectedRoute>} />
                  <Route path="/enrich-data" element={<ProtectedRoute requiredRole="admin"><EnrichData /></ProtectedRoute>} />
                  <Route path="/beta" element={<ProtectedRoute><BetaTesting /></ProtectedRoute>} />
                  <Route path="/launch" element={<ProtectedRoute><LaunchChecklist /></ProtectedRoute>} />
                  
                  {/* 404 */}
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

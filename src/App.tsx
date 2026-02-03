import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@core/auth/AuthProvider";
import { TenantProvider } from "@/contexts/TenantContext";
import { ImpersonationBanner } from "@/features/admin/components/ImpersonationBanner";
import { GlobalSearch } from "@/shared/components/GlobalSearch";
import { KeyboardShortcutsHelp } from "@/shared/components/KeyboardShortcutsHelp";
import { ProtectedRoute } from "@core/auth/components/ProtectedRoute";
import { DrPhillipChatWrapper } from "@/features/dashboard/components/DrPhillipChatWrapper";
import { ErrorBoundary, CampaignErrorBoundary, GiftCardErrorBoundary, FormBuilderErrorBoundary } from "@/shared/components/ErrorBoundaries";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";

// Core pages (loaded immediately)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages
const Campaigns = lazy(() => import("./pages/Campaigns"));
const CampaignCreate = lazy(() => import("./pages/CampaignCreate"));
const CampaignDetail = lazy(() => import("./pages/CampaignDetail"));
const PURLLandingPage = lazy(() => import("./pages/PURLLandingPage"));
const AudienceDetail = lazy(() => import("./pages/AudienceDetail"));
const RecipientDetail = lazy(() => import("./pages/RecipientDetail"));
const Mail = lazy(() => import("./pages/Mail"));
const NewMailDesigner = lazy(() => import("./pages/NewMailDesigner"));
const NewLandingPageDesigner = lazy(() => import("./pages/NewLandingPageDesigner"));
const AILandingPageDesigner = lazy(() => import("./pages/AILandingPageDesigner"));
const NewEmailDesigner = lazy(() => import("./pages/NewEmailDesigner"));
const CampaignAnalytics = lazy(() => import("./pages/CampaignAnalytics"));
const APIDocumentation = lazy(() => import("./pages/APIDocumentation"));
const GiftCards = lazy(() => import("./pages/GiftCards"));
const CreditsBilling = lazy(() => import("./pages/CreditsBilling"));
const Settings = lazy(() => import("./pages/Settings"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const LandingPages = lazy(() => import("./pages/LandingPages"));
const GiftCardReveal = lazy(() => import("./pages/GiftCardReveal"));
const EmbedGiftCard = lazy(() => import("./pages/EmbedGiftCard"));
const AgencyManagement = lazy(() => import("./pages/AgencyManagement"));
const CallCenterRedemption = lazy(() => import("./pages/CallCenterRedemption"));
const CallCenterScripts = lazy(() => import("./pages/CallCenterScripts"));
const RedemptionLogs = lazy(() => import("./pages/RedemptionLogs"));
const Contacts = lazy(() => import("./pages/Contacts"));
const ContactDetail = lazy(() => import("./pages/ContactDetail"));
const ContactLists = lazy(() => import("./pages/ContactLists"));
const ListDetail = lazy(() => import("./pages/contacts/ListDetail"));
const ContactImport = lazy(() => import("./pages/ContactImport"));
const AdminGiftCardMarketplace = lazy(() => import("./pages/AdminGiftCardMarketplace"));
const AdminGiftCardBrands = lazy(() => import("./pages/AdminGiftCardBrands"));
const AdminGiftCards = lazy(() => import("./pages/AdminGiftCards"));
const AgencyGiftCards = lazy(() => import("./pages/AgencyGiftCards"));
const Forms = lazy(() => import("./pages/Forms"));
const FormBuilder = lazy(() => import("./pages/FormBuilder"));
const FormPublic = lazy(() => import("./pages/FormPublic"));
const FormAnalytics = lazy(() => import("./pages/FormAnalytics"));
const FormsDocumentation = lazy(() => import("./pages/FormsDocumentation"));
const AdminMessagingTest = lazy(() => import("./pages/AdminMessagingTest"));
const Activity = lazy(() => import("./pages/Activity"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CookieConsent = lazy(() => import("@/shared/components/CookieConsent").then(m => ({ default: m.CookieConsent })));
const Documentation = lazy(() => import("./pages/Documentation"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SystemHealth = lazy(() => import("./pages/SystemHealth"));
const Integrations = lazy(() => import("./pages/Integrations"));
const DocEditorPage = lazy(() => import("./pages/DocEditorPage"));
const PoolDetail = lazy(() => import("./pages/PoolDetail"));
const PurchaseGiftCard = lazy(() => import("./pages/PurchaseGiftCard"));
const RecordPurchase = lazy(() => import("./pages/RecordPurchase"));
const EditPoolPricing = lazy(() => import("./pages/EditPoolPricing"));
const ClientGiftCards = lazy(() => import("./pages/ClientGiftCards"));
const GiftCardManager = lazy(() => import("./pages/GiftCardManager"));
const ClientBillingDashboard = lazy(() => import("./pages/ClientBillingDashboard"));
const AdminOrganizationManagement = lazy(() => import("./pages/AdminOrganizationManagement"));
const PublicRedemption = lazy(() => import("./pages/PublicRedemption"));
const PublicLandingPage = lazy(() => import("./pages/PublicLandingPage"));
const TestRedemption = lazy(() => import("./pages/TestRedemption"));

// Marketing Feature - New Structure
const MarketingHub = lazy(() => import("./pages/marketing/MarketingHub"));
const Broadcasts = lazy(() => import("./pages/marketing/Broadcasts"));
const BroadcastCreate = lazy(() => import("./pages/marketing/BroadcastCreate"));
const BroadcastDetail = lazy(() => import("./pages/marketing/BroadcastDetail"));
const Automations = lazy(() => import("./pages/marketing/Automations"));
const AutomationCreate = lazy(() => import("./pages/marketing/AutomationCreate"));
const AutomationDetail = lazy(() => import("./pages/marketing/AutomationDetail"));
const ContentLibrary = lazy(() => import("./pages/marketing/ContentLibrary"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

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
                <GlobalSearch />
                <KeyboardShortcutsHelp />
                <Toaster />
                <Sonner />
                <DrPhillipChatWrapper />
                <Suspense fallback={null}>
                  <CookieConsent />
                </Suspense>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                  {/* Public Routes */}
                  <Route path="/accept-invite" element={<AcceptInvite />} />
                  <Route path="/c/:campaignId/:token" element={<PURLLandingPage />} />
                  <Route path="/embed/gift-card" element={<EmbedGiftCard />} />
                  <Route path="/embed/gift-card/:campaignId" element={<EmbedGiftCard />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/f/:formSlug" element={<FormPublic />} />
                  <Route path="/forms/:formId" element={<FormPublic />} />
                  <Route path="/redeem/:campaignId/:redemptionToken" element={<GiftCardReveal />} />
                  <Route path="/redeem-gift-card" element={<PublicRedemption />} />
                  <Route path="/test-redemption" element={<TestRedemption />} />
                  
                  {/* Public Landing Pages - mobul.com/:clientSlug/p/:pageSlug */}
                  <Route path="/:clientSlug/p/:pageSlug" element={<PublicLandingPage />} />

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
                  {/* Protected Routes */}
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  
                  {/* Help redirects to docs */}
                  <Route path="/help" element={<Navigate to="/docs" replace />} />
                  <Route path="/help/:category/:slug" element={<Navigate to="/docs/:category/:slug" replace />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/platform" element={<Navigate to="/" replace />} />
                  
                  {/* Campaigns */}
                  <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
                  <Route path="/campaigns/new" element={<ProtectedRoute><CampaignCreate /></ProtectedRoute>} />
                  <Route path="/campaigns/:id/edit" element={<ProtectedRoute><CampaignCreate /></ProtectedRoute>} />
                  <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
                  <Route path="/audiences/:id" element={<ProtectedRoute><AudienceDetail /></ProtectedRoute>} />
                  <Route path="/recipients/:id" element={<ProtectedRoute><RecipientDetail /></ProtectedRoute>} />
                  <Route path="/analytics/campaigns/:id" element={<ProtectedRoute><CampaignAnalytics /></ProtectedRoute>} />
                  
                  {/* Mail & Landing Pages */}
                  <Route path="/mail" element={<ProtectedRoute><Mail /></ProtectedRoute>} />
                  {/* Both routes use the new AI-first designer */}
                  <Route path="/mail-designer/:id" element={<ProtectedRoute><NewMailDesigner /></ProtectedRoute>} />
                  <Route path="/new-mail-designer/:id" element={<ProtectedRoute><NewMailDesigner /></ProtectedRoute>} />
                  <Route path="/new-landing-designer/:id" element={<ProtectedRoute><NewLandingPageDesigner /></ProtectedRoute>} />
                  <Route path="/new-email-designer/:id" element={<ProtectedRoute><NewEmailDesigner /></ProtectedRoute>} />
                  <Route path="/email-designer/:id" element={<ProtectedRoute><NewEmailDesigner /></ProtectedRoute>} />
                  {/* Redirects from old template routes */}
                  <Route path="/templates" element={<Navigate to="/mail" replace />} />
                  <Route path="/template-builder/:id" element={<ProtectedRoute><NewMailDesigner /></ProtectedRoute>} />
                  
                  {/* Landing Pages - Direct to Designer */}
                  <Route path="/landing-pages" element={<ProtectedRoute><LandingPages /></ProtectedRoute>} />
                  <Route path="/landing-pages/new" element={<ProtectedRoute><NewLandingPageDesigner /></ProtectedRoute>} />
                  <Route path="/landing-pages/:id" element={<ProtectedRoute><NewLandingPageDesigner /></ProtectedRoute>} />
                  
                  {/* AI Landing Page Designer (New Code Generation System) */}
                  <Route path="/landing-pages-ai/new" element={<ProtectedRoute><AILandingPageDesigner /></ProtectedRoute>} />
                  <Route path="/landing-pages-ai/:id" element={<ProtectedRoute><AILandingPageDesigner /></ProtectedRoute>} />
                  {/* Redirect old routes */}
                  <Route path="/landing-pages/create" element={<Navigate to="/landing-pages/new" replace />} />
                  <Route path="/landing-pages/:id/editor" element={<Navigate to="/landing-pages/:id" replace />} />
                  <Route path="/landing-pages/:id/canvas" element={<Navigate to="/landing-pages/:id" replace />} />
                  
                  {/* Gift Cards - Role-based access control */}
                  {/* Client/Agency - Simple Gift Card Manager */}
                  <Route path="/gift-cards" element={<ProtectedRoute><GiftCardManager /></ProtectedRoute>} />
                  <Route path="/gift-cards/pools/:poolId" element={<ProtectedRoute requiredRoles={['admin', 'agency_owner']}><PoolDetail /></ProtectedRoute>} />
                  <Route path="/gift-cards/purchase/:poolId" element={<ProtectedRoute requiredRoles={['admin', 'agency_owner']}><PurchaseGiftCard /></ProtectedRoute>} />
                  <Route path="/credits-billing" element={<ProtectedRoute requiredRoles={['admin', 'agency_owner', 'company_owner']}><CreditsBilling /></ProtectedRoute>} />
                  
                  {/* Admin Only - Unified Gift Card Dashboard */}
                  <Route path="/admin/gift-cards-dashboard" element={<ProtectedRoute requiredRole="admin"><AdminGiftCards /></ProtectedRoute>} />
                  
                  {/* Agency Gift Card Management */}
                  <Route path="/agency/gift-cards" element={<ProtectedRoute requiredRole="agency_owner"><AgencyGiftCards /></ProtectedRoute>} />
                  {/* Legacy routes kept for backward compatibility */}
                  <Route path="/gift-cards/marketplace" element={<ProtectedRoute requiredRole="admin"><AdminGiftCardMarketplace /></ProtectedRoute>} />
                  <Route path="/admin/gift-card-marketplace" element={<ProtectedRoute requiredRole="admin"><AdminGiftCardMarketplace /></ProtectedRoute>} />
                  <Route path="/admin/gift-cards" element={<ProtectedRoute requiredRole="admin"><AdminGiftCardBrands /></ProtectedRoute>} />
                  <Route path="/admin/financial-reports" element={<Navigate to="/admin/gift-cards-dashboard" replace />} />
                  <Route path="/admin/gift-cards/record-purchase" element={<ProtectedRoute requiredRole="admin"><RecordPurchase /></ProtectedRoute>} />
                  <Route path="/admin/gift-cards/pools/:poolId/pricing" element={<ProtectedRoute requiredRole="admin"><EditPoolPricing /></ProtectedRoute>} />
                  
                  {/* Client Gift Card Management - NEW simplified UI */}
                  <Route path="/gift-cards/manager" element={<ProtectedRoute><GiftCardManager /></ProtectedRoute>} />
                  <Route path="/client/gift-cards" element={<ProtectedRoute><ClientGiftCards /></ProtectedRoute>} />
                  <Route path="/client/billing" element={<ProtectedRoute><ClientBillingDashboard /></ProtectedRoute>} />
                  
                  {/* Contacts System */}
                  <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
                  <Route path="/contacts/:id" element={<ProtectedRoute><ContactDetail /></ProtectedRoute>} />
                  <Route path="/contacts/lists" element={<ProtectedRoute><ContactLists /></ProtectedRoute>} />
                  <Route path="/contacts/lists/:id" element={<ProtectedRoute><ListDetail /></ProtectedRoute>} />
                  <Route path="/contacts/import" element={<ProtectedRoute><ContactImport /></ProtectedRoute>} />
                  
                  {/* Call Center - Redemption & Fulfillment */}
                  <Route path="/call-center" element={<ProtectedRoute requiredPermissions={["calls.confirm_redemption"]}><CallCenterRedemption /></ProtectedRoute>} />
                  <Route path="/call-center/scripts" element={<ProtectedRoute requiredPermissions={["calls.manage"]}><CallCenterScripts /></ProtectedRoute>} />
                  <Route path="/call-center/logs" element={<ProtectedRoute requiredRole="admin"><RedemptionLogs /></ProtectedRoute>} />
                  
                  {/* Marketing - New Structure */}
                  <Route path="/marketing" element={<ProtectedRoute><MarketingHub /></ProtectedRoute>} />
                  <Route path="/marketing/broadcasts" element={<ProtectedRoute><Broadcasts /></ProtectedRoute>} />
                  <Route path="/marketing/broadcasts/new" element={<ProtectedRoute><BroadcastCreate /></ProtectedRoute>} />
                  <Route path="/marketing/broadcasts/:id" element={<ProtectedRoute><BroadcastDetail /></ProtectedRoute>} />
                  <Route path="/marketing/broadcasts/:id/edit" element={<ProtectedRoute><BroadcastCreate /></ProtectedRoute>} />
                  <Route path="/marketing/automations" element={<ProtectedRoute><Automations /></ProtectedRoute>} />
                  <Route path="/marketing/automations/new" element={<ProtectedRoute><AutomationCreate /></ProtectedRoute>} />
                  <Route path="/marketing/automations/:id" element={<ProtectedRoute><AutomationDetail /></ProtectedRoute>} />
                  <Route path="/marketing/automations/:id/edit" element={<ProtectedRoute><AutomationCreate /></ProtectedRoute>} />
                  <Route path="/marketing/content" element={<ProtectedRoute><ContentLibrary /></ProtectedRoute>} />
                  
                  {/* Redirects for old marketing URLs (backward compatibility) */}
                  <Route path="/marketing/campaigns" element={<Navigate to="/marketing/broadcasts" replace />} />
                  <Route path="/marketing/campaigns/new" element={<Navigate to="/marketing/broadcasts/new" replace />} />
                  <Route path="/marketing/campaigns/:id" element={<Navigate to="/marketing/broadcasts/:id" replace />} />
                  <Route path="/marketing/campaigns/:id/edit" element={<Navigate to="/marketing/broadcasts/:id/edit" replace />} />
                  <Route path="/marketing/analytics" element={<Navigate to="/marketing" replace />} />
                  
                  {/* Forms */}
                  <Route path="/forms" element={<ProtectedRoute><Forms /></ProtectedRoute>} />
                  <Route path="/forms/new" element={<ProtectedRoute><FormBuilder /></ProtectedRoute>} />
                  <Route path="/forms/:formId/builder" element={<ProtectedRoute><FormBuilder /></ProtectedRoute>} />
                  <Route path="/forms/:formId/analytics" element={<ProtectedRoute><FormAnalytics /></ProtectedRoute>} />
                  <Route path="/forms/docs" element={<ProtectedRoute><FormsDocumentation /></ProtectedRoute>} />
                  
                  {/* ACE Forms - Backward compatibility redirects */}
                  <Route path="/ace-forms" element={<Navigate to="/forms" replace />} />
                  <Route path="/ace-forms/new" element={<Navigate to="/forms/new" replace />} />
                  <Route path="/ace-forms/:formId/builder" element={<Navigate to="/forms/:formId/builder" replace />} />
                  <Route path="/ace-forms/:formId/analytics" element={<Navigate to="/forms/:formId/analytics" replace />} />
                  <Route path="/ace-forms/docs" element={<Navigate to="/forms/docs" replace />} />
                  
                  {/* Administration - Consolidated */}
                  <Route path="/admin/system-health" element={<ProtectedRoute><SystemHealth /></ProtectedRoute>} />
                  <Route path="/admin/demo-data-generator" element={<Navigate to="/" replace />} />
                  <Route path="/admin/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
                  
                  {/* Documentation editor */}
                  <Route path="/docs/:category/:slug/edit" element={<ProtectedRoute requiredRole="admin"><DocEditorPage /></ProtectedRoute>} />
                  
                  {/* Redirect old /admin/docs to new /docs */}
                  <Route path="/admin/docs" element={<Navigate to="/docs" replace />} />
                  <Route path="/admin/docs/:category/:slug" element={<Navigate to="/docs/:category/:slug" replace />} />
                  
                  <Route path="/users" element={<ProtectedRoute requiredPermissions={['users.view', 'users.manage']}><UserManagement /></ProtectedRoute>} />
                  <Route path="/user-management" element={<ProtectedRoute requiredPermissions={['users.manage']}><UserManagement /></ProtectedRoute>} />
                  
                  {/* Documentation */}
                  <Route path="/docs" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
                  <Route path="/docs/:category" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
                  <Route path="/docs/:category/:slug" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
                  
                  {/* Activity & Logs - Unified logging page */}
                  <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
                  
                  {/* Settings & Utilities */}
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/settings/:tab" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/api-docs" element={<ProtectedRoute><APIDocumentation /></ProtectedRoute>} />
                  
                  {/* Admin Routes */}
                  <Route path="/agencies" element={<ProtectedRoute requiredRole="admin"><AgencyManagement /></ProtectedRoute>} />
                  <Route path="/agency-management" element={<ProtectedRoute requiredRole="admin"><AgencyManagement /></ProtectedRoute>} />
                  <Route path="/admin/audit-log" element={<Navigate to="/activity" replace />} />
                  <Route path="/admin/error-logs" element={<Navigate to="/admin/system-health?tab=errors" replace />} />
                  <Route path="/admin/site-directory" element={<Navigate to="/" replace />} />
                  <Route path="/admin/demo-data" element={<Navigate to="/" replace />} />
                  <Route path="/admin/organizations" element={<ProtectedRoute requiredRole="admin"><AdminOrganizationManagement /></ProtectedRoute>} />
                  <Route path="/admin/messaging-test" element={<ProtectedRoute requiredRole="admin"><AdminMessagingTest /></ProtectedRoute>} />
                  
                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </TenantProvider>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

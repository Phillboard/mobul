import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { GlobalSearch } from "@/components/shared/GlobalSearch";
import { KeyboardShortcutsHelp } from "@/components/shared/KeyboardShortcutsHelp";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DrPhillipChatWrapper } from "@/components/DrPhillipChatWrapper";
import { ErrorBoundary, CampaignErrorBoundary, GiftCardErrorBoundary, FormBuilderErrorBoundary } from "@/components/ErrorBoundaries";
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
const MailDesigner = lazy(() => import("./pages/MailDesigner"));
const NewMailDesigner = lazy(() => import("./pages/NewMailDesigner"));
const NewLandingPageDesigner = lazy(() => import("./pages/NewLandingPageDesigner"));
const NewEmailDesigner = lazy(() => import("./pages/NewEmailDesigner"));
const CampaignAnalytics = lazy(() => import("./pages/CampaignAnalytics"));
const APIDocumentation = lazy(() => import("./pages/APIDocumentation"));
const GiftCards = lazy(() => import("./pages/GiftCards"));
const CreditsBilling = lazy(() => import("./pages/CreditsBilling"));
const Settings = lazy(() => import("./pages/Settings"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const LandingPages = lazy(() => import("./pages/LandingPages"));
const LandingPageCreate = lazy(() => import("./pages/LandingPageCreate"));
const LandingPageEditor = lazy(() => import("./pages/LandingPageEditor"));
const GiftCardReveal = lazy(() => import("./pages/GiftCardReveal"));
const EmbedGiftCard = lazy(() => import("./pages/EmbedGiftCard"));
const AgencyManagement = lazy(() => import("./pages/AgencyManagement"));
const CallCenterRedemption = lazy(() => import("./pages/CallCenterRedemption"));
const CallCenterScripts = lazy(() => import("./pages/CallCenterScripts"));
const GrapesJSLandingPageEditor = lazy(() => import("./pages/GrapesJSLandingPageEditor"));
const Contacts = lazy(() => import("./pages/Contacts"));
const ContactDetail = lazy(() => import("./pages/ContactDetail"));
const ContactLists = lazy(() => import("./pages/ContactLists"));
const ListDetail = lazy(() => import("./pages/contacts/ListDetail"));
const ContactImport = lazy(() => import("./pages/ContactImport"));
const Activities = lazy(() => import("./pages/Activities"));
const Tasks = lazy(() => import("./pages/Tasks"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const AdminGiftCardMarketplace = lazy(() => import("./pages/AdminGiftCardMarketplace"));
const AdminGiftCardBrands = lazy(() => import("./pages/AdminGiftCardBrands"));
const AdminFinancialReports = lazy(() => import("./pages/AdminFinancialReports"));
const AdminSiteDirectory = lazy(() => import("./pages/AdminSiteDirectory"));
const AceForms = lazy(() => import("./pages/AceForms"));
const AceFormBuilder = lazy(() => import("./pages/AceFormBuilder"));
const AceFormPublic = lazy(() => import("./pages/AceFormPublic"));
const AceFormAnalytics = lazy(() => import("./pages/AceFormAnalytics"));
const AceFormsDocumentation = lazy(() => import("./pages/AceFormsDocumentation"));
const AdminAuditLog = lazy(() => import("./pages/AdminAuditLog"));
const ErrorLogs = lazy(() => import("./pages/ErrorLogs"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CookieConsent = lazy(() => import("./components/CookieConsent").then(m => ({ default: m.CookieConsent })));
const Documentation = lazy(() => import("./pages/Documentation"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PlatformDashboard = lazy(() => import("./pages/PlatformDashboard").then(m => ({ default: m.PlatformDashboard })));
const SystemHealth = lazy(() => import("./pages/SystemHealth"));
const Integrations = lazy(() => import("./pages/Integrations"));
const DocEditorPage = lazy(() => import("./pages/DocEditorPage"));
const PoolDetail = lazy(() => import("./pages/PoolDetail"));
const PurchaseGiftCard = lazy(() => import("./pages/PurchaseGiftCard"));
const RecordPurchase = lazy(() => import("./pages/RecordPurchase"));
const EditPoolPricing = lazy(() => import("./pages/EditPoolPricing"));
const DemoDataGenerator = lazy(() => import("./pages/admin/DemoDataGenerator"));
const ClientGiftCards = lazy(() => import("./pages/ClientGiftCards"));
const GiftCardManager = lazy(() => import("./pages/GiftCardManager"));
const ClientBillingDashboard = lazy(() => import("./pages/ClientBillingDashboard"));
const AdminOrganizationManagement = lazy(() => import("./pages/AdminOrganizationManagement"));
const PublicRedemption = lazy(() => import("./pages/PublicRedemption"));
const PublicLandingPage = lazy(() => import("./pages/PublicLandingPage"));
const TestRedemption = lazy(() => import("./pages/TestRedemption"));

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
                  <Route path="/f/:formSlug" element={<AceFormPublic />} />
                  <Route path="/forms/:formId" element={<AceFormPublic />} />
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
                  <Route path="/platform" element={<ProtectedRoute requiredRole="admin"><PlatformDashboard /></ProtectedRoute>} />
                  
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
                  <Route path="/mail-designer/:id" element={<ProtectedRoute><MailDesigner /></ProtectedRoute>} />
                  <Route path="/new-mail-designer/:id" element={<ProtectedRoute><NewMailDesigner /></ProtectedRoute>} />
                  <Route path="/new-landing-designer/:id" element={<ProtectedRoute><NewLandingPageDesigner /></ProtectedRoute>} />
                  <Route path="/new-email-designer/:id" element={<ProtectedRoute><NewEmailDesigner /></ProtectedRoute>} />
                  {/* Redirects from old template routes */}
                  <Route path="/templates" element={<Navigate to="/mail" replace />} />
                  <Route path="/template-builder/:id" element={<Navigate to="/mail-designer/:id" replace />} />
                  
                  {/* Landing Page Builder - Simple Routes */}
                  <Route path="/landing-pages" element={<ProtectedRoute><LandingPages /></ProtectedRoute>} />
                  <Route path="/landing-pages/create" element={<ProtectedRoute><LandingPageCreate /></ProtectedRoute>} />
                  <Route path="/landing-pages/new" element={<ProtectedRoute><LandingPageEditor /></ProtectedRoute>} />
                  <Route path="/landing-pages/:id/editor" element={<ProtectedRoute><LandingPageEditor /></ProtectedRoute>} />
                  
                  {/* Legacy routes redirect to new simple flow */}
                  <Route path="/landing-pages/new/visual-editor" element={<Navigate to="/landing-pages/create" replace />} />
                  <Route path="/landing-pages/:id/visual-editor" element={<Navigate to="/landing-pages/:id/editor" replace />} />
                  <Route path="/landing-pages/:id/edit-grapesjs" element={<Navigate to="/landing-pages/:id/editor" replace />} />
                  <Route path="/landing-pages/ai-generate/:mode" element={<Navigate to="/landing-pages/create" replace />} />
                  
                  {/* Gift Cards - Role-based access control */}
                  {/* Client/Agency - Simple Gift Card Manager */}
                  <Route path="/gift-cards" element={<ProtectedRoute><GiftCardManager /></ProtectedRoute>} />
                  <Route path="/gift-cards/pools/:poolId" element={<ProtectedRoute requiredRoles={['admin', 'agency_owner']}><PoolDetail /></ProtectedRoute>} />
                  <Route path="/gift-cards/purchase/:poolId" element={<ProtectedRoute requiredRoles={['admin', 'agency_owner']}><PurchaseGiftCard /></ProtectedRoute>} />
                  <Route path="/credits-billing" element={<ProtectedRoute requiredRoles={['admin', 'agency_owner', 'company_owner']}><CreditsBilling /></ProtectedRoute>} />
                  
                  {/* Admin Only - Platform Marketplace & Pricing */}
                  <Route path="/gift-cards/marketplace" element={<ProtectedRoute requiredRole="admin"><AdminGiftCardMarketplace /></ProtectedRoute>} />
                  <Route path="/admin/gift-card-marketplace" element={<ProtectedRoute requiredRole="admin"><AdminGiftCardMarketplace /></ProtectedRoute>} />
                  <Route path="/admin/gift-cards" element={<ProtectedRoute requiredRole="admin"><AdminGiftCardBrands /></ProtectedRoute>} />
                  <Route path="/admin/financial-reports" element={<ProtectedRoute requiredRole="admin"><AdminFinancialReports /></ProtectedRoute>} />
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
                  <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
                  <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                  <Route path="/team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
                  
                  {/* Call Center - Redemption & Fulfillment */}
                  <Route path="/call-center" element={<ProtectedRoute requiredPermissions={["calls.confirm_redemption"]}><CallCenterRedemption /></ProtectedRoute>} />
                  <Route path="/call-center/scripts" element={<ProtectedRoute requiredPermissions={["calls.manage"]}><CallCenterScripts /></ProtectedRoute>} />
                  
                  {/* ACE Forms */}
                  <Route path="/ace-forms" element={<ProtectedRoute><AceForms /></ProtectedRoute>} />
                  <Route path="/ace-forms/new" element={<ProtectedRoute><AceFormBuilder /></ProtectedRoute>} />
                  <Route path="/ace-forms/:formId/builder" element={<ProtectedRoute><AceFormBuilder /></ProtectedRoute>} />
                  <Route path="/ace-forms/:formId/analytics" element={<ProtectedRoute><AceFormAnalytics /></ProtectedRoute>} />
                  <Route path="/ace-forms/docs" element={<ProtectedRoute><AceFormsDocumentation /></ProtectedRoute>} />
                  
                  {/* Administration - Consolidated */}
                  <Route path="/admin/system-health" element={<ProtectedRoute><SystemHealth /></ProtectedRoute>} />
                  <Route path="/admin/demo-data-generator" element={<ProtectedRoute requiredRole="admin"><DemoDataGenerator /></ProtectedRoute>} />
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
                  
                  {/* Settings & Utilities */}
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/settings/:tab" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/api-docs" element={<ProtectedRoute><APIDocumentation /></ProtectedRoute>} />
                  
                  {/* Admin Routes */}
                  <Route path="/agencies" element={<ProtectedRoute requiredRole="admin"><AgencyManagement /></ProtectedRoute>} />
                  <Route path="/agency-management" element={<ProtectedRoute requiredRole="admin"><AgencyManagement /></ProtectedRoute>} />
                  <Route path="/admin/audit-log" element={<ProtectedRoute requiredRole="admin"><AdminAuditLog /></ProtectedRoute>} />
                  <Route path="/admin/error-logs" element={<ProtectedRoute requiredRole="admin"><ErrorLogs /></ProtectedRoute>} />
                  <Route path="/admin/site-directory" element={<ProtectedRoute requiredRole="admin"><AdminSiteDirectory /></ProtectedRoute>} />
                  <Route path="/admin/demo-data" element={<ProtectedRoute requiredRole="admin"><DemoDataGenerator /></ProtectedRoute>} />
                  <Route path="/admin/organizations" element={<ProtectedRoute requiredRole="admin"><AdminOrganizationManagement /></ProtectedRoute>} />
                  
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

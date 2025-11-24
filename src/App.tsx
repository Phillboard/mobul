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
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Deals from "./pages/Deals";
import DealDetail from "./pages/DealDetail";
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
  </ErrorBoundary>
);

export default App;

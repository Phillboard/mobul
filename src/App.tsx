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
import Index from "./pages/Index";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import PURLLandingPage from "./pages/PURLLandingPage";
import Audiences from "./pages/Audiences";
import AudienceDetail from "./pages/AudienceDetail";
import RecipientDetail from "./pages/RecipientDetail";
import LeadMarketplace from "./pages/LeadMarketplace";
import Templates from "./pages/Templates";
import TemplateBuilderV2 from "./pages/TemplateBuilderV2";
import Analytics from "./pages/Analytics";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <AuthProvider>
          <TenantProvider>
            <ImpersonationBanner />
            <Toaster />
            <Sonner />
            <DrPhillipChat />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/c/:campaignId/:token" element={<PURLLandingPage />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
              <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
              <Route path="/audiences" element={<ProtectedRoute><Audiences /></ProtectedRoute>} />
              <Route path="/audiences/:id" element={<ProtectedRoute><AudienceDetail /></ProtectedRoute>} />
              <Route path="/recipients/:id" element={<ProtectedRoute><RecipientDetail /></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
              <Route path="/template-builder/:id" element={<ProtectedRoute><TemplateBuilderV2 /></ProtectedRoute>} />
              <Route path="/analytics/:campaignId" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/marketplace" element={<ProtectedRoute><LeadMarketplace /></ProtectedRoute>} />
              <Route path="/api" element={<ProtectedRoute><API /></ProtectedRoute>} />
              <Route path="/purchase-gift-cards" element={<ProtectedRoute requiredPermission="gift_cards.purchase"><PurchaseGiftCards /></ProtectedRoute>} />
              <Route path="/gift-cards" element={<ProtectedRoute><GiftCards /></ProtectedRoute>} />
              <Route path="/api/docs" element={<ProtectedRoute><APIDocumentation /></ProtectedRoute>} />
              <Route path="/landing-pages" element={<ProtectedRoute><LandingPages /></ProtectedRoute>} />
              <Route path="/landing-pages/:id/edit" element={<ProtectedRoute><SimpleLandingPageEditor /></ProtectedRoute>} />
              <Route path="/redeem/:campaignId/:redemptionToken" element={<GiftCardReveal />} />
              <Route path="/settings" element={<ProtectedRoute requiredPermission="settings.view"><Settings /></ProtectedRoute>} />
              <Route path="/generate-favicon" element={<ProtectedRoute><GenerateFavicon /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute requiredPermission="users.view"><UserManagement /></ProtectedRoute>} />
              <Route path="/agent/call/:sessionId" element={<ProtectedRoute><AgentCallDashboard /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TenantProvider>
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

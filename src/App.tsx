import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import PURLLandingPage from "./pages/PURLLandingPage";
import Audiences from "./pages/Audiences";
import AudienceDetail from "./pages/AudienceDetail";
import RecipientDetail from "./pages/RecipientDetail";
import LeadMarketplace from "./pages/LeadMarketplace";
import Templates from "./pages/Templates";
import TemplateBuilder from "./pages/TemplateBuilder";
import Analytics from "./pages/Analytics";
import API from "./pages/API";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <AuthProvider>
          <TenantProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/c/:campaignId/:token" element={<PURLLandingPage />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
              <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
              <Route path="/audiences" element={<ProtectedRoute><Audiences /></ProtectedRoute>} />
              <Route path="/audiences/:id" element={<ProtectedRoute><AudienceDetail /></ProtectedRoute>} />
              <Route path="/recipients/:id" element={<ProtectedRoute><RecipientDetail /></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
              <Route path="/template-builder/:id" element={<ProtectedRoute><TemplateBuilder /></ProtectedRoute>} />
              <Route path="/analytics/:campaignId" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/marketplace" element={<ProtectedRoute><LeadMarketplace /></ProtectedRoute>} />
              <Route path="/api" element={<ProtectedRoute><API /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
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

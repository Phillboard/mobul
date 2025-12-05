import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, Lock, Users, Shield, BookOpen, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface RouteInfo {
  path: string;
  name: string;
  category: string;
  auth: "public" | "protected";
  requiredRole?: string;
  requiredPermissions?: string[];
  description?: string;
}

const routes: RouteInfo[] = [
  // Public Routes
  { path: "/auth", name: "Login/Signup", category: "Public", auth: "public", description: "Authentication pages" },
  { path: "/privacy", name: "Privacy Policy", category: "Public", auth: "public", description: "Privacy policy" },
  { path: "/terms", name: "Terms of Service", category: "Public", auth: "public", description: "Terms of service" },
  { path: "/accept-invite", name: "Accept Invitation", category: "Public", auth: "public", description: "User invitation acceptance" },
  { path: "/f/:formSlug", name: "Public Form", category: "Public", auth: "public", description: "Public ACE Form submission" },
  { path: "/redeem/:campaignId/:token", name: "Gift Card Reveal", category: "Public", auth: "public", description: "Gift card redemption page" },
  
  // Dashboard
  { path: "/", name: "Main Dashboard", category: "Dashboard", auth: "protected", requiredPermissions: ["dashboard.view"], description: "Main application dashboard" },
  { path: "/dashboard", name: "Dashboard", category: "Dashboard", auth: "protected", requiredPermissions: ["dashboard.view"], description: "Dashboard overview" },
  { path: "/platform", name: "Platform Dashboard", category: "Dashboard", auth: "protected", requiredRole: "admin", description: "Platform-wide analytics (admin only)" },
  
  // Contacts
  { path: "/contacts", name: "All Contacts", category: "Contacts", auth: "protected", requiredPermissions: ["contacts.view"], description: "Customer database" },
  { path: "/contacts/:id", name: "Contact Detail", category: "Contacts", auth: "protected", requiredPermissions: ["contacts.view"], description: "Individual contact page" },
  { path: "/contacts/lists", name: "Lists & Segments", category: "Contacts", auth: "protected", requiredPermissions: ["contacts.view"], description: "Contact lists and segments" },
  { path: "/contacts/lists/:id", name: "List Detail", category: "Contacts", auth: "protected", requiredPermissions: ["contacts.view"], description: "List details and members" },
  { path: "/contacts/import", name: "Import Contacts", category: "Contacts", auth: "protected", requiredPermissions: ["contacts.create"], description: "CSV import wizard" },
  { path: "/activities", name: "Activities", category: "Contacts", auth: "protected", requiredPermissions: ["contacts.view"], description: "Activity tracking timeline" },
  { path: "/tasks", name: "Tasks", category: "Contacts", auth: "protected", requiredPermissions: ["contacts.view"], description: "Task management board" },
  { path: "/team", name: "Team Management", category: "Contacts", auth: "protected", description: "Team member management" },
  
  // Campaigns
  { path: "/campaigns", name: "All Campaigns", category: "Campaigns", auth: "protected", requiredPermissions: ["campaigns.view"], description: "Campaign listing" },
  { path: "/campaigns/new", name: "Create Campaign", category: "Campaigns", auth: "protected", description: "Campaign creation wizard" },
  { path: "/campaigns/:id", name: "Campaign Detail", category: "Campaigns", auth: "protected", requiredPermissions: ["campaigns.view"], description: "Campaign details page" },
  { path: "/analytics/campaigns/:id", name: "Campaign Analytics", category: "Campaigns", auth: "protected", description: "Campaign performance metrics" },
  
  // Mail & Landing Pages
  { path: "/mail", name: "Mail Library", category: "Campaigns", auth: "protected", requiredPermissions: ["templates.view"], description: "Direct mail template library" },
  { path: "/mail-designer/:id", name: "Mail Designer", category: "Campaigns", auth: "protected", description: "GrapesJS mail piece editor" },
  { path: "/landing-pages", name: "Landing Pages", category: "Campaigns", auth: "protected", requiredPermissions: ["landingpages.view"], description: "PURL landing page library" },
  { path: "/landing-pages/:id/visual-editor", name: "Landing Page Editor", category: "Campaigns", auth: "protected", description: "GrapesJS landing page editor" },
  
  // ACE Forms
  { path: "/ace-forms", name: "ACE Forms", category: "Campaigns", auth: "protected", description: "Form library" },
  { path: "/ace-forms/new", name: "Create Form", category: "Campaigns", auth: "protected", description: "Form builder wizard" },
  { path: "/ace-forms/:formId/builder", name: "Form Builder", category: "Campaigns", auth: "protected", description: "Drag-and-drop form builder" },
  { path: "/ace-forms/:formId/analytics", name: "Form Analytics", category: "Campaigns", auth: "protected", description: "Form submission analytics" },
  
  // Gift Cards & Rewards
  { path: "/gift-cards", name: "Gift Card Inventory", category: "Rewards", auth: "protected", requiredPermissions: ["giftcards.view"], description: "Gift card pool management" },
  { path: "/credits-billing", name: "Credits & Billing", category: "Rewards", auth: "protected", requiredPermissions: ["giftcards.purchase", "settings.billing"], description: "Manage credits and auto-billing" },
  { path: "/admin/gift-card-marketplace", name: "Gift Card Marketplace", category: "Rewards", auth: "protected", requiredRole: "admin", description: "Platform gift card marketplace (admin)" },
  
  // Call Center
  { path: "/call-center", name: "Call Tracking Dashboard", category: "Call Center", auth: "protected", requiredPermissions: ["calls.view", "calls.manage"], description: "Call analytics and reports" },
  { path: "/call-center/redeem", name: "Redemption Center", category: "Call Center", auth: "protected", requiredPermissions: ["calls.confirm_redemption"], description: "Agent redemption interface" },
  
  // Administration
  { path: "/users", name: "User Management", category: "Administration", auth: "protected", requiredPermissions: ["users.view", "users.manage"], description: "Manage platform users" },
  { path: "/admin/integrations", name: "Integrations", category: "Administration", auth: "protected", requiredPermissions: ["api.view"], description: "API & webhook management" },
  { path: "/docs", name: "Documentation", category: "Documentation", auth: "protected", description: "Role-based platform documentation" },
  { path: "/docs?tab=manage", name: "Manage Documentation", category: "Documentation", auth: "protected", requiredRole: "admin", description: "Edit and manage documentation (admin only)" },
  { path: "/docs?tab=analytics", name: "Documentation Analytics", category: "Documentation", auth: "protected", requiredRole: "admin", description: "View documentation usage analytics" },
  { path: "/admin/system-health", name: "System Health", category: "Administration", auth: "protected", requiredPermissions: ["analytics.view"], description: "System monitoring dashboard" },
  { path: "/admin/demo-data-generator", name: "Demo Data Generator", category: "Administration", auth: "protected", requiredRole: "admin", description: "Generate realistic test data for clients" },
  
  // Admin Tools
  { path: "/admin/audit-log", name: "Audit Log", category: "Admin Tools", auth: "protected", requiredRole: "admin", description: "User management audit trail (admin only)" },
  { path: "/admin/site-directory", name: "Site Directory", category: "Admin Tools", auth: "protected", requiredRole: "admin", description: "All pages directory (you are here!)" },
  
  // Agency Management
  { path: "/agency-management", name: "Client Management", category: "Agency", auth: "protected", requiredRole: "agency_owner", requiredPermissions: ["clients.view"], description: "Manage agency clients" },
  
  // Settings
  { path: "/settings", name: "Settings", category: "Settings", auth: "protected", description: "Account settings" },
  { path: "/settings/:tab", name: "Settings Tab", category: "Settings", auth: "protected", description: "Specific settings tab" },
];

export default function AdminSiteDirectory() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRoutes = useMemo(() => {
    if (!searchQuery) return routes;
    
    const query = searchQuery.toLowerCase();
    return routes.filter(r => 
      r.path.toLowerCase().includes(query) || 
      r.name.toLowerCase().includes(query) ||
      r.category.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const categories = useMemo(() => {
    const cats = new Map<string, RouteInfo[]>();
    filteredRoutes.forEach(route => {
      const existing = cats.get(route.category) || [];
      cats.set(route.category, [...existing, route]);
    });
    return Array.from(cats.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredRoutes]);

  const stats = useMemo(() => {
    return {
      total: routes.length,
      public: routes.filter(r => r.auth === "public").length,
      protected: routes.filter(r => r.auth === "protected").length,
      adminOnly: routes.filter(r => r.requiredRole === "admin").length,
    };
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Site Directory</h1>
          <p className="text-muted-foreground mt-2">
            Complete directory of all application routes and pages
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Routes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <ExternalLink className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Public</p>
                  <p className="text-2xl font-bold">{stats.public}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Protected</p>
                  <p className="text-2xl font-bold">{stats.protected}</p>
                </div>
                <Lock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admin Only</p>
                  <p className="text-2xl font-bold">{stats.adminOnly}</p>
                </div>
                <Shield className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Technical Documentation - Admin Only */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Technical Documentation
              <Badge variant="secondary">Admin Only</Badge>
            </CardTitle>
            <CardDescription>
              Complete platform documentation and developer guides
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Getting Started</h4>
                <div className="space-y-1 pl-2">
                  <Link to="/docs/getting-started/quickstart" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Quick Start Guide
                  </Link>
                  <Link to="/docs/getting-started/overview" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Platform Overview
                  </Link>
                  <Link to="/docs/getting-started/first-campaign" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    First Campaign Guide
                  </Link>
                  <Link to="/docs/getting-started/terminology" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Terminology
                  </Link>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Architecture</h4>
                <div className="space-y-1 pl-2">
                  <Link to="/docs/architecture/architecture-overview" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    System Architecture
                  </Link>
                  <Link to="/docs/architecture/data-model" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Database Schema
                  </Link>
                  <Link to="/docs/architecture/security" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Security & RLS
                  </Link>
                  <Link to="/docs/architecture/scalability" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Scalability
                  </Link>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Developer Guide</h4>
                <div className="space-y-1 pl-2">
                  <Link to="/docs/developer-guide/setup" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Development Setup
                  </Link>
                  <Link to="/docs/developer-guide/edge-functions" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Edge Functions
                  </Link>
                  <Link to="/docs/developer-guide/database" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Database Guide
                  </Link>
                  <Link to="/docs/developer-guide/testing" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Testing Guide
                  </Link>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">API Reference</h4>
                <div className="space-y-1 pl-2">
                  <Link to="/docs/api-reference/edge-functions-api" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Edge Functions API
                  </Link>
                  <Link to="/docs/api-reference/rest-api" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    REST API Reference
                  </Link>
                  <Link to="/docs/api-reference/authentication" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Authentication
                  </Link>
                  <Link to="/docs/api-reference/webhooks" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Webhooks
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <Button asChild variant="outline" className="w-full">
                <Link to="/docs?tab=manage">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage All Documentation
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Routes</CardTitle>
            <CardDescription>
              Search by path, name, category, or description
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search routes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Routes by Category */}
        <div className="space-y-6">
          {categories.map(([category, categoryRoutes]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
                <CardDescription>
                  {categoryRoutes.length} route{categoryRoutes.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryRoutes.map((route) => (
                    <div 
                      key={route.path} 
                      className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {route.path}
                          </code>
                          {route.auth === "public" ? (
                            <Badge variant="outline" className="text-green-600">
                              <Users className="h-3 w-3 mr-1" />
                              Public
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-blue-600">
                              <Lock className="h-3 w-3 mr-1" />
                              Protected
                            </Badge>
                          )}
                          {route.requiredRole === "admin" && (
                            <Badge variant="destructive">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {route.requiredRole === "agency_owner" && (
                            <Badge variant="secondary">
                              Agency Owner
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium">{route.name}</h4>
                        {route.description && (
                          <p className="text-sm text-muted-foreground">{route.description}</p>
                        )}
                        {route.requiredPermissions && route.requiredPermissions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {route.requiredPermissions.map((perm) => (
                              <Badge key={perm} variant="outline" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {!route.path.includes(":") && (
                        <Link to={route.path}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}

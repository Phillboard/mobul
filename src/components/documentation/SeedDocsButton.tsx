import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const folderToCategory: Record<string, string> = {
  '1-GETTING-STARTED': 'getting-started',
  '2-ARCHITECTURE': 'architecture',
  '3-FEATURES': 'features',
  '4-DEVELOPER-GUIDE': 'developer-guide',
  '5-API-REFERENCE': 'api-reference',
  '6-USER-GUIDES': 'user-guides',
  '7-IMPLEMENTATION': 'implementation',
  '8-OPERATIONS': 'operations',
  '9-TROUBLESHOOTING': 'troubleshooting',
};

const categoryVisibility: Record<string, string[]> = {
  'getting-started': ['admin', 'tech_support', 'agency_owner', 'company_owner', 'developer', 'call_center'],
  'architecture': ['admin', 'tech_support', 'developer'],
  'features': ['admin', 'tech_support', 'agency_owner', 'company_owner', 'developer'],
  'developer-guide': ['admin', 'tech_support', 'developer'],
  'api-reference': ['admin', 'tech_support', 'developer'],
  'user-guides': ['admin', 'tech_support'],
  'implementation': ['admin', 'tech_support'],
  'operations': ['admin', 'tech_support'],
  'troubleshooting': ['admin', 'tech_support'],
};

const userGuideVisibility: Record<string, string[]> = {
  'admin-guide': ['admin'],
  'agency-guide': ['admin', 'tech_support', 'agency_owner'],
  'client-guide': ['admin', 'tech_support', 'agency_owner', 'company_owner'],
  'call-center-guide': ['admin', 'tech_support', 'agency_owner', 'company_owner', 'call_center'],
};

const docsToSeed = [
  { folder: '1-GETTING-STARTED', file: 'QUICKSTART.md', slug: 'quickstart', order: 1 },
  { folder: '1-GETTING-STARTED', file: 'OVERVIEW.md', slug: 'overview', order: 2 },
  { folder: '1-GETTING-STARTED', file: 'FIRST_CAMPAIGN.md', slug: 'first-campaign', order: 3 },
  { folder: '1-GETTING-STARTED', file: 'TERMINOLOGY.md', slug: 'terminology', order: 4 },
  { folder: '1-GETTING-STARTED', file: 'MVP_SETUP.md', slug: 'mvp-setup', order: 5 },
  { folder: '2-ARCHITECTURE', file: 'OVERVIEW.md', slug: 'architecture-overview', order: 1 },
  { folder: '2-ARCHITECTURE', file: 'DATA_MODEL.md', slug: 'data-model', order: 2 },
  { folder: '2-ARCHITECTURE', file: 'SECURITY.md', slug: 'security', order: 3 },
  { folder: '2-ARCHITECTURE', file: 'SCALABILITY.md', slug: 'scalability', order: 4 },
  { folder: '3-FEATURES', file: 'CAMPAIGNS.md', slug: 'campaigns', order: 1 },
  { folder: '3-FEATURES', file: 'CAMPAIGN_LIFECYCLE.md', slug: 'campaign-lifecycle', order: 2 },
  { folder: '3-FEATURES', file: 'AUDIENCES.md', slug: 'audiences', order: 3 },
  { folder: '3-FEATURES', file: 'GIFT_CARDS.md', slug: 'gift-cards', order: 4 },
  { folder: '3-FEATURES', file: 'LANDING_PAGES.md', slug: 'landing-pages', order: 5 },
  { folder: '3-FEATURES', file: 'ANALYTICS.md', slug: 'analytics', order: 6 },
  { folder: '3-FEATURES', file: 'CODE_ENRICHMENT.md', slug: 'code-enrichment', order: 7 },
  { folder: '3-FEATURES', file: 'LEAD_MARKETPLACE.md', slug: 'lead-marketplace', order: 8 },
  { folder: '3-FEATURES', file: 'PURL_QR_CODES.md', slug: 'purl-qr-codes', order: 9 },
  { folder: '4-DEVELOPER-GUIDE', file: 'SETUP.md', slug: 'setup', order: 1 },
  { folder: '4-DEVELOPER-GUIDE', file: 'EDGE_FUNCTIONS.md', slug: 'edge-functions', order: 2 },
  { folder: '4-DEVELOPER-GUIDE', file: 'DATABASE.md', slug: 'database', order: 3 },
  { folder: '4-DEVELOPER-GUIDE', file: 'DEPLOYMENT.md', slug: 'deployment', order: 4 },
  { folder: '4-DEVELOPER-GUIDE', file: 'TESTING.md', slug: 'testing', order: 5 },
  { folder: '4-DEVELOPER-GUIDE', file: 'TESTING_CAMPAIGNS.md', slug: 'testing-campaigns', order: 6 },
  { folder: '4-DEVELOPER-GUIDE', file: 'EMAIL_SETUP.md', slug: 'email-setup', order: 7 },
  { folder: '4-DEVELOPER-GUIDE', file: 'EVENT_TRACKING.md', slug: 'event-tracking', order: 8 },
  { folder: '4-DEVELOPER-GUIDE', file: 'DEMO_DATA.md', slug: 'demo-data', order: 9 },
  { folder: '4-DEVELOPER-GUIDE', file: 'PRODUCTION_CHECKLIST.md', slug: 'production-checklist', order: 10 },
  { folder: '5-API-REFERENCE', file: 'EDGE_FUNCTIONS.md', slug: 'edge-functions-api', order: 1 },
  { folder: '5-API-REFERENCE', file: 'REST_API.md', slug: 'rest-api', order: 2 },
  { folder: '5-API-REFERENCE', file: 'AUTHENTICATION.md', slug: 'authentication', order: 3 },
  { folder: '5-API-REFERENCE', file: 'WEBHOOKS.md', slug: 'webhooks', order: 4 },
  { folder: '5-API-REFERENCE', file: 'EXAMPLES.md', slug: 'examples', order: 5 },
  { folder: '6-USER-GUIDES', file: 'ADMIN_GUIDE.md', slug: 'admin-guide', order: 1 },
  { folder: '6-USER-GUIDES', file: 'AGENCY_GUIDE.md', slug: 'agency-guide', order: 2 },
  { folder: '6-USER-GUIDES', file: 'CLIENT_GUIDE.md', slug: 'client-guide', order: 3 },
  { folder: '6-USER-GUIDES', file: 'CALL_CENTER_GUIDE.md', slug: 'call-center-guide', order: 4 },
  { folder: '7-IMPLEMENTATION', file: 'API_FIRST_IMPLEMENTATION_COMPLETE.md', slug: 'api-implementation', order: 1 },
  { folder: '7-IMPLEMENTATION', file: 'API_FIRST_REFACTOR_SUMMARY.md', slug: 'api-refactor-summary', order: 2 },
  { folder: '7-IMPLEMENTATION', file: 'QUICK_START_DEPLOYMENT.md', slug: 'quick-start-deployment', order: 3 },
  { folder: '7-IMPLEMENTATION', file: 'DEPLOYMENT_TESTING_GUIDE.md', slug: 'deployment-testing', order: 4 },
  { folder: '7-IMPLEMENTATION', file: 'FRONTEND_MIGRATION_GUIDE.md', slug: 'frontend-migration', order: 5 },
  { folder: '7-IMPLEMENTATION', file: 'IMPLEMENTATION_STATUS_FINAL.md', slug: 'implementation-status', order: 6 },
  { folder: '7-IMPLEMENTATION', file: 'BRAND_MANAGEMENT_IMPLEMENTATION_COMPLETE.md', slug: 'brand-management', order: 7 },
  { folder: '7-IMPLEMENTATION', file: 'BRAND_MANAGEMENT_TESTING_GUIDE.md', slug: 'brand-testing', order: 8 },
  { folder: '8-OPERATIONS', file: 'INDEX.md', slug: 'operations-index', order: 1 },
  { folder: '9-TROUBLESHOOTING', file: 'INDEX.md', slug: 'troubleshooting-index', order: 1 },
  { folder: '9-TROUBLESHOOTING', file: 'GIFT_CARDS.md', slug: 'troubleshooting-gift-cards', order: 2 },
  { folder: '9-TROUBLESHOOTING', file: 'SMS_DELIVERY.md', slug: 'troubleshooting-sms', order: 3 },
  { folder: '9-TROUBLESHOOTING', file: 'PERMISSIONS.md', slug: 'troubleshooting-permissions', order: 4 },
  { folder: '9-TROUBLESHOOTING', file: 'COMMON_ERRORS.md', slug: 'troubleshooting-errors', order: 5 },
];

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1] : 'Documentation';
}

function getDocAudience(category: string): string {
  if (category === 'getting-started') return 'public';
  if (['architecture', 'developer-guide', 'api-reference'].includes(category)) return 'technical';
  if (['implementation', 'operations', 'troubleshooting'].includes(category)) return 'admin';
  return 'user';
}

export function SeedDocsButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSeed = async () => {
    setLoading(true);
    try {
      const docs = [];
      
      for (const doc of docsToSeed) {
        try {
          const response = await fetch(`/docs/${doc.folder}/${doc.file}`);
          if (!response.ok) continue;
          
          const content = await response.text();
          const title = extractTitle(content);
          const category = folderToCategory[doc.folder];
          
          let visibility = categoryVisibility[category] || ['admin'];
          if (category === 'user-guides' && userGuideVisibility[doc.slug]) {
            visibility = userGuideVisibility[doc.slug];
          }
          
          docs.push({
            category,
            slug: doc.slug,
            title,
            content,
            file_path: `/docs/${doc.folder}/${doc.file}`,
            visible_to_roles: visibility,
            doc_audience: getDocAudience(category),
            order_index: doc.order,
          });
        } catch (e) {
          console.error(`Failed to load ${doc.slug}:`, e);
        }
      }
      
      console.log(`Seeding ${docs.length} documents...`);
      
      const { error } = await supabase
        .from('documentation_pages')
        .upsert(docs, { onConflict: 'slug' });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${docs.length} documentation pages seeded successfully`,
      });
      
      // Refresh the page to show new docs
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to seed documentation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleSeed} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Database className="h-4 w-4 mr-2" />
      )}
      Seed Documentation
    </Button>
  );
}

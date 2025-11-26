import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentationContent } from "@/components/documentation/DocumentationContent";
import { AdminDocsList } from "@/components/documentation/AdminDocsList";
import { AdminDocsAnalytics } from "@/components/documentation/AdminDocsAnalytics";
import { AdminDocsFeedback } from "@/components/documentation/AdminDocsFeedback";
import { SeedDocsButton } from "@/components/documentation/SeedDocsButton";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams, useParams } from "react-router-dom";
import { BookOpen, Settings, BarChart3, MessageSquare } from "lucide-react";

export default function Documentation() {
  const { hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { category, slug } = useParams<{ category?: string; slug?: string }>();
  const activeTab = searchParams.get("tab") || "docs";
  const isAdmin = hasRole("admin");

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // If we have a category and/or slug, show just the content (sidebar handled by main Layout)
  if (category || slug) {
    return (
      <Layout>
        <DocumentationContent />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Documentation</h1>
            <p className="text-muted-foreground mt-2">
              Knowledge base, help resources, and system documentation
            </p>
          </div>
          {isAdmin && activeTab === "manage" && <SeedDocsButton />}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={isAdmin ? "grid w-full grid-cols-4" : "grid w-full grid-cols-1"}>
            <TabsTrigger value="docs">
              <BookOpen className="h-4 w-4 mr-2" />
              Documentation
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="manage">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="feedback">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Feedback
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="docs" className="mt-0">
            <DocumentationContent />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="manage">
                <AdminDocsList />
              </TabsContent>

              <TabsContent value="analytics">
                <AdminDocsAnalytics />
              </TabsContent>

              <TabsContent value="feedback">
                <AdminDocsFeedback />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}

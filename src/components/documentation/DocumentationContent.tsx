import { useParams, Link } from "react-router-dom";
import { useDocumentationPage } from "@/hooks/useDocumentation";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { DocumentationBreadcrumb } from "./DocumentationBreadcrumb";
import { DocumentationTOC } from "./DocumentationTOC";
import { DocumentationFeedback } from "./DocumentationFeedback";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileQuestion, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function DocumentationContent() {
  const { category, slug } = useParams<{ category?: string; slug?: string }>();
  const { data: page, isLoading, error } = useDocumentationPage(slug || "");

  if (!slug) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Documentation</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Welcome to the Mobul ACE Platform documentation. Select a topic from the sidebar to get started.
          </p>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Link
              to="/admin/docs/getting-started/quickstart"
              className="p-6 border border-border rounded-lg hover:border-primary transition-colors"
            >
              <h3 className="text-xl font-semibold mb-2">Getting Started</h3>
              <p className="text-muted-foreground">
                Quick start guide to get up and running
              </p>
            </Link>
            
            <Link
              to="/admin/docs/features/campaigns"
              className="p-6 border border-border rounded-lg hover:border-primary transition-colors"
            >
              <h3 className="text-xl font-semibold mb-2">Features</h3>
              <p className="text-muted-foreground">
                Learn about all platform features
              </p>
            </Link>
            
            <Link
              to="/admin/docs/api-reference/rest-api"
              className="p-6 border border-border rounded-lg hover:border-primary transition-colors"
            >
              <h3 className="text-xl font-semibold mb-2">API Reference</h3>
              <p className="text-muted-foreground">
                Complete API documentation
              </p>
            </Link>
            
            <Link
              to="/admin/docs/developer-guide/setup"
              className="p-6 border border-border rounded-lg hover:border-primary transition-colors"
            >
              <h3 className="text-xl font-semibold mb-2">Developer Guide</h3>
              <p className="text-muted-foreground">
                Development environment setup
              </p>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <FileQuestion className="h-4 w-4" />
            <AlertDescription>
              Documentation page not found. Please check the URL or return to the{" "}
              <Link to="/admin/docs" className="underline">documentation home</Link>.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex">
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <DocumentationBreadcrumb page={page} />
          
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-4xl font-bold">{page.title}</h1>
            {page.is_admin_only && (
              <Badge variant="secondary">Admin Only</Badge>
            )}
          </div>

          {page.last_updated && (
            <p className="text-sm text-muted-foreground mb-6">
              Last updated: {new Date(page.last_updated).toLocaleDateString()}
            </p>
          )}

          {page.content ? (
            <MarkdownRenderer content={page.content} />
          ) : (
            <Alert>
              <AlertDescription>
                Content for this page is being prepared. Please check back later.
              </AlertDescription>
            </Alert>
          )}

          <DocumentationFeedback pageId={page.id} />

          <div className="flex justify-between mt-8 pt-8 border-t border-border">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/docs">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Documentation
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      <DocumentationTOC content={page.content || ""} />
    </div>
  );
}

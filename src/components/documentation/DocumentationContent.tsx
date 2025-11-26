import { useParams, Link, useNavigate } from "react-router-dom";
import { useMarkdownDoc } from "@/hooks/useMarkdownDocs";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileQuestion, ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function DocumentationContent() {
  const { category, slug } = useParams<{ category?: string; slug?: string }>();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const { data: page, isLoading, error } = category && slug 
    ? useMarkdownDoc(category, slug)
    : { data: null, isLoading: false, error: null };

  const isAdmin = hasRole("admin");

  if (!category || !slug) {
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
    <>
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{page.title}</h1>
              <p className="text-sm text-muted-foreground">
                {category?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} / {page.title}
              </p>
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/docs/${category}/${slug}/edit`)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>

        {page.content ? (
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <MarkdownRenderer content={page.content} />
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              Content for this page is being prepared. Please check back later.
            </AlertDescription>
          </Alert>
        )}

          <div className="mt-8 pt-8 border-t border-border">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/docs">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Documentation
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

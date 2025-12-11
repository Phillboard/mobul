import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@core/services/supabase";
import { Loader2 } from "lucide-react";

export default function PublicLandingPage() {
  const { clientSlug, pageSlug } = useParams();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPage();
  }, [clientSlug, pageSlug]);

  const loadPage = async () => {
    try {
      setLoading(true);
      setError(null);

      // First find the client by slug
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('slug', clientSlug)
        .single();

      if (clientError || !client) {
        setError('Page not found');
        return;
      }

      // Then find the landing page
      const { data: page, error: pageError } = await supabase
        .from('landing_pages')
        .select('html_content, published')
        .eq('client_id', client.id)
        .eq('slug', pageSlug)
        .single();

      if (pageError || !page) {
        setError('Page not found');
        return;
      }

      if (!page.published) {
        setError('This page is not published');
        return;
      }

      setHtml(page.html_content);
    } catch (err) {
      console.error('Error loading page:', err);
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">404</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  // Render the page in a full-screen iframe
  return (
    <iframe
      srcDoc={html || ''}
      className="w-full h-screen border-0"
      title="Landing Page"
      sandbox="allow-same-origin allow-scripts allow-forms"
    />
  );
}


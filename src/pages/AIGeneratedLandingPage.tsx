import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";

export default function AIGeneratedLandingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement | null>(null);

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['landing-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const validateMutation = useMutation({
    mutationFn: async (code: string) => {
      // For now, we need to link this to a campaign
      // This will be enhanced when linking landing pages to campaigns
      const contentJson = page?.content_json as any;
      const { data, error } = await supabase.functions.invoke("validate-gift-card-code", {
        body: { 
          code, 
          campaignId: contentJson?.campaignId || 'temp' // Will be linked properly
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, code) => {
      if (data.valid) {
        navigate(`/redeem/campaign/${data.redemptionToken}`);
      } else {
        toast({
          title: "Invalid Code",
          description: data.message || "Please check your code and try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!page?.html_content) return;

    // Find the form in the rendered HTML and attach event listener
    const form = document.getElementById('giftCardRedemptionForm') as HTMLFormElement;
    const input = document.getElementById('codeInput') as HTMLInputElement;
    const button = document.getElementById('submitButton') as HTMLButtonElement;

    if (form && input && button) {
      const handleSubmit = (e: Event) => {
        e.preventDefault();
        const code = input.value.trim().toUpperCase();
        
        if (code.length < 6) {
          toast({
            title: "Invalid Code",
            description: "Code must be at least 6 characters",
            variant: "destructive",
          });
          return;
        }

        button.disabled = true;
        button.textContent = "Validating...";
        
        validateMutation.mutate(code, {
          onSettled: () => {
            button.disabled = false;
            button.textContent = "Claim Your Gift Card";
          }
        });
      };

      form.addEventListener('submit', handleSubmit);
      formRef.current = form;

      return () => {
        form.removeEventListener('submit', handleSubmit);
      };
    }
  }, [page, toast, validateMutation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error ? "Failed to load page" : "Page not found"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Sanitize HTML to prevent XSS attacks
  const sanitizedHTML = DOMPurify.sanitize(page.html_content || '', {
    ADD_ATTR: ['id', 'class', 'style'],
    ADD_TAGS: ['style'],
  });

  return (
    <>
      {page.meta_title && (
        <title>{page.meta_title}</title>
      )}
      {page.meta_description && (
        <meta name="description" content={page.meta_description} />
      )}
      
      <div 
        className="min-h-screen"
        dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      />
    </>
  );
}

import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAceForm } from "@/hooks/useAceForms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFormSchema } from "@/lib/aceFormValidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { GiftCardReveal } from "@/components/ace-forms/GiftCardReveal";
import { GiftCardRedemption } from "@/types/aceForms";
import { useFormSubmissionRateLimit } from "@/hooks/useFormSubmissionRateLimit";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import DOMPurify from "dompurify";

const MAX_SUBMISSIONS_PER_HOUR = 5;

/**
 * Public form page - No authentication required
 * Used for embedded forms and direct links
 */
export default function AceFormPublic() {
  const { formId } = useParams();
  const [searchParams] = useSearchParams();
  const { data: form, isLoading } = useAceForm(formId || "");
  const [submitting, setSubmitting] = useState(false);
  const [redemption, setRedemption] = useState<GiftCardRedemption | null>(null);
  const { checkRateLimit, recordSubmission } = useFormSubmissionRateLimit();
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const primaryColor = searchParams.get("primaryColor") || form?.form_config.settings?.primaryColor || "#6366f1";

  const schema = form ? createFormSchema(form.form_config.fields) : null;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: schema ? zodResolver(schema) : undefined,
  });

  const onSubmit = async (data: any) => {
    if (!formId) return;

    // Check rate limit
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      const resetTime = rateCheck.resetTime?.toLocaleTimeString() || "soon";
      setRateLimitError(
        `You've reached the submission limit (${MAX_SUBMISSIONS_PER_HOUR} per hour). Please try again after ${resetTime}.`
      );
      return;
    }

    setSubmitting(true);
    setRateLimitError(null);

    try {
      // Sanitize all string inputs to prevent XSS
      const sanitizedData = Object.entries(data).reduce((acc, [key, value]) => {
        if (typeof value === 'string') {
          acc[key] = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      // Check if this is a customer code redemption (has redemption_code field)
      const hasRedemptionCode = form.form_config.fields.some(f => f.type === 'gift-card-code');
      
      if (hasRedemptionCode && sanitizedData.code) {
        // Use new customer code redemption flow
        const { data: result, error } = await supabase.functions.invoke("redeem-customer-code", {
          body: { 
            redemptionCode: sanitizedData.code,
            campaignId: searchParams.get('campaignId') || formId
          },
        });

        if (error) throw error;

        if (result.success && result.giftCard) {
          recordSubmission();
          setRedemption(result.giftCard);
        } else {
          throw new Error(result.error || 'Redemption failed');
        }
      } else {
        // Original submit-ace-form flow for direct gift card codes
        const { data: result, error } = await supabase.functions.invoke("submit-ace-form", {
          body: { formId, data: sanitizedData },
        });

        if (error) throw error;

        if (result.success && result.giftCard) {
          recordSubmission();
          setRedemption(result.giftCard);
        } else {
          throw new Error(result.error || 'Submission failed');
        }
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      
      let errorMessage = "Failed to submit form. Please try again.";
      if (error.message?.includes("already claimed")) {
        errorMessage = "This gift card code has already been claimed.";
      } else if (error.message?.includes("Invalid")) {
        errorMessage = "Invalid gift card code. Please check and try again.";
      }
      
      setRateLimitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Form Not Found</h1>
          <p className="text-muted-foreground">This form does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  if (redemption) {
    return <GiftCardReveal redemption={redemption} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header with Back Link */}
      <header className="border-b bg-card py-4 px-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-foreground">Secure Form</span>
        </div>
      </header>

      {/* Form Content */}
      <div className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-lg shadow-lg p-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                {form.form_config.settings?.title || form.name}
              </h1>
              {form.form_config.settings?.description && (
                <p className="text-muted-foreground mt-2">{form.form_config.settings.description}</p>
              )}
            </div>

          {/* Rate Limit Warning */}
          {rateLimitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{rateLimitError}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {form.form_config.fields.map((field) => {
              // Check conditional logic
              if (field.conditional) {
                const dependentField = form.form_config.fields.find(
                  (f) => f.id === field.conditional?.showIf.fieldId
                );
                // For now, show all fields (conditional logic evaluation would need form state)
              }

              return (
                <div key={field.id}>
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {field.helpText && (
                    <p className="text-sm text-muted-foreground mt-1">{field.helpText}</p>
                  )}

                  {field.type === "textarea" ? (
                    <Textarea
                      id={field.id}
                      {...register(field.id)}
                      placeholder={field.placeholder}
                      className="mt-2"
                      maxLength={1000}
                    />
                  ) : field.type === "select" ? (
                    <select
                      id={field.id}
                      {...register(field.id)}
                      className="w-full mt-2 px-3 py-2 border rounded-md"
                    >
                      <option value="">Select...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={field.id}
                      type={field.type === "gift-card-code" ? "text" : field.type}
                      {...register(field.id)}
                      placeholder={field.placeholder}
                      className="mt-2"
                      maxLength={field.type === "email" ? 255 : 200}
                      autoComplete={
                        field.type === "email" ? "email" :
                        field.type === "phone" ? "tel" :
                        field.type === "text" && field.label.toLowerCase().includes("name") ? "name" :
                        "off"
                      }
                    />
                  )}

                  {errors[field.id] && (
                    <p className="text-sm text-destructive mt-1">
                      {errors[field.id]?.message as string}
                    </p>
                  )}
                </div>
              );
            })}

              <Button
                type="submit"
                className="w-full"
                style={{ backgroundColor: primaryColor }}
                disabled={submitting || !!rateLimitError}
              >
                {submitting ? "Submitting..." : (form.form_config.settings?.submitButtonText || "Submit")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

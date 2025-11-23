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
import { AlertCircle, Shield } from "lucide-react";
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
  const [isFlipped, setIsFlipped] = useState(false);
  const { checkRateLimit, recordSubmission } = useFormSubmissionRateLimit();
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const primaryColor = searchParams.get("primaryColor") || form?.form_config.settings?.primaryColor || "#6366f1";
  const embedMode = searchParams.get("embed") === "true";

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

      // Check if this is customer code redemption (requires campaignId parameter)
      const campaignId = searchParams.get('campaignId');
      const hasGiftCardField = form.form_config.fields.some(f => f.type === 'gift-card-code');
      
      if (campaignId && hasGiftCardField && sanitizedData.code) {
        // NEW FLOW: Customer redemption code (approved by call center)
        const { data: result, error } = await supabase.functions.invoke("redeem-customer-code", {
          body: { 
            redemptionCode: sanitizedData.code,
            campaignId: campaignId
          },
        });

        if (error) throw error;

        if (result.success && result.giftCard) {
          recordSubmission();
          setRedemption(result.giftCard);
          setTimeout(() => setIsFlipped(true), 100);
        } else {
          throw new Error(result.error || 'Redemption failed');
        }
      } else {
        // OLD FLOW: Direct gift card code entry
        const { data: result, error } = await supabase.functions.invoke("submit-ace-form", {
          body: { formId, data: sanitizedData },
        });

        if (error) throw error;

        if (result.success && result.giftCard) {
          recordSubmission();
          setRedemption(result.giftCard);
          setTimeout(() => setIsFlipped(true), 100);
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

  return (
    <div 
      className={`min-h-screen flex items-center justify-center ${
        embedMode ? 'bg-transparent p-4' : 'bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6'
      }`}
      style={{ perspective: '1000px' }}
    >
      <div
        className="w-full max-w-md transition-transform duration-700"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Front: Form */}
        <div 
          className="w-full"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className={`bg-card rounded-lg shadow-lg ${embedMode ? 'p-6' : 'p-8'}`}>
            {!embedMode && (
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                  Secure Form
                </h1>
              </div>
            )}
            {embedMode && (
              <div className="mb-4 text-center">
                <h2 className="text-xl font-bold text-foreground">
                  {form.form_config.settings?.title || "Enter Your Gift Card Code"}
                </h2>
                {form.form_config.settings?.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {form.form_config.settings.description}
                  </p>
                )}
              </div>
            )}
            {!embedMode && (
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">
                  {form.form_config.settings?.title || form.name}
                </h1>
                {form.form_config.settings?.description && (
                  <p className="text-muted-foreground mt-2">{form.form_config.settings.description}</p>
                )}
              </div>
            )}

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

        {/* Back: Gift Card (rendered but hidden when not flipped) */}
        <div
          className="absolute inset-0 w-full"
          style={{ 
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            pointerEvents: isFlipped ? 'auto' : 'none'
          }}
        >
          {redemption && (
            <GiftCardReveal 
              redemption={redemption} 
              embedMode={embedMode}
              skipReveal={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}

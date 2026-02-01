import { useState, useMemo, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useForm as useFormHook } from '@/features/forms/hooks';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFormSchema } from '@/shared/utils/validation/aceFormValidation';
import { shouldShowField } from '@/shared/utils/validation/conditionalLogic';
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { supabase } from "@core/services/supabase";
import { GiftCardReveal } from "@/features/forms/components";
import { GiftCardRedemption } from "@/types/aceForms";
import { useFormSubmissionRateLimit } from '@/features/forms/hooks';
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { AlertCircle, Shield } from "lucide-react";
import DOMPurify from "dompurify";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Common URL parameter name mappings to form field IDs
 * Supports snake_case, camelCase, and kebab-case URL params
 */
const URL_PARAM_MAPPINGS: Record<string, string[]> = {
  // First name variations
  'first_name': ['first_name', 'firstName', 'first-name', 'fname'],
  'firstName': ['first_name', 'firstName', 'first-name', 'fname'],
  'first-name': ['first_name', 'firstName', 'first-name', 'fname'],
  'fname': ['first_name', 'firstName', 'first-name', 'fname'],
  // Last name variations
  'last_name': ['last_name', 'lastName', 'last-name', 'lname'],
  'lastName': ['last_name', 'lastName', 'last-name', 'lname'],
  'last-name': ['last_name', 'lastName', 'last-name', 'lname'],
  'lname': ['last_name', 'lastName', 'last-name', 'lname'],
  // Unique code / redemption code variations
  'unique_code': ['unique_code', 'uniqueCode', 'unique-code', 'code', 'redemption_code', 'redemptionCode'],
  'uniqueCode': ['unique_code', 'uniqueCode', 'unique-code', 'code', 'redemption_code', 'redemptionCode'],
  'unique-code': ['unique_code', 'uniqueCode', 'unique-code', 'code', 'redemption_code', 'redemptionCode'],
  'code': ['unique_code', 'uniqueCode', 'unique-code', 'code', 'redemption_code', 'redemptionCode'],
  'redemption_code': ['unique_code', 'uniqueCode', 'unique-code', 'code', 'redemption_code', 'redemptionCode'],
  'redemptionCode': ['unique_code', 'uniqueCode', 'unique-code', 'code', 'redemption_code', 'redemptionCode'],
  // Email variations
  'email': ['email', 'email_address', 'emailAddress'],
  'email_address': ['email', 'email_address', 'emailAddress'],
  'emailAddress': ['email', 'email_address', 'emailAddress'],
  // Phone variations
  'phone': ['phone', 'phone_number', 'phoneNumber', 'mobile'],
  'phone_number': ['phone', 'phone_number', 'phoneNumber', 'mobile'],
  'phoneNumber': ['phone', 'phone_number', 'phoneNumber', 'mobile'],
  'mobile': ['phone', 'phone_number', 'phoneNumber', 'mobile'],
};

/**
 * Extract pre-fill values from URL parameters
 * Maps URL params to form field IDs using flexible matching
 */
function getPrefilledValues(
  searchParams: URLSearchParams, 
  formFields: Array<{ id: string; label: string }>
): Record<string, string> {
  const prefilled: Record<string, string> = {};
  
  // Reserved params that shouldn't be used for form values
  const reservedParams = ['formid', 'primaryColor', 'embed', 'campaignId'];
  
  searchParams.forEach((value, key) => {
    // Skip reserved parameters
    if (reservedParams.includes(key.toLowerCase()) || reservedParams.includes(key)) {
      return;
    }
    
    // Sanitize the value
    const sanitizedValue = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
    
    // Try direct match first (URL param matches field ID exactly)
    const directMatch = formFields.find(f => f.id === key || f.id.toLowerCase() === key.toLowerCase());
    if (directMatch) {
      prefilled[directMatch.id] = sanitizedValue;
      return;
    }
    
    // Try mapping lookup (URL param maps to potential field IDs)
    const possibleFieldIds = URL_PARAM_MAPPINGS[key];
    if (possibleFieldIds) {
      const matchedField = formFields.find(f => 
        possibleFieldIds.includes(f.id) || 
        possibleFieldIds.some(pid => f.id.toLowerCase() === pid.toLowerCase())
      );
      if (matchedField) {
        prefilled[matchedField.id] = sanitizedValue;
        return;
      }
    }
    
    // Try label-based matching (URL param matches field label, normalized)
    const normalizedKey = key.toLowerCase().replace(/[_-]/g, '');
    const labelMatch = formFields.find(f => 
      f.label.toLowerCase().replace(/\s+/g, '').replace(/[_-]/g, '') === normalizedKey
    );
    if (labelMatch) {
      prefilled[labelMatch.id] = sanitizedValue;
    }
  });
  
  return prefilled;
}

const MAX_SUBMISSIONS_PER_HOUR = 5;

/**
 * Public form page - No authentication required
 * Used for embedded forms and direct links
 */
export default function FormPublic() {
  const { formId, formSlug } = useParams();
  const [searchParams] = useSearchParams();
  // Support both /forms/:formId and /f/:formSlug routes
  const formIdentifier = formId || formSlug || "";
  const { data: form, isLoading } = useFormHook(formIdentifier);
  const [submitting, setSubmitting] = useState(false);
  const [redemption, setRedemption] = useState<GiftCardRedemption | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const { checkRateLimit, recordSubmission } = useFormSubmissionRateLimit();
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [viewTracked, setViewTracked] = useState(false);

  const primaryColor = searchParams.get("primaryColor") || form?.form_config.settings?.primaryColor || "#6366f1";
  const embedMode = searchParams.get("embed") === "true";

  const schema = form ? createFormSchema(form.form_config.fields) : null;
  
  // Get prefilled values from URL parameters
  const prefilledValues = useMemo(() => {
    if (!form?.form_config?.fields) return {};
    return getPrefilledValues(searchParams, form.form_config.fields);
  }, [searchParams, form?.form_config?.fields]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues: prefilledValues,
  });

  // Apply prefilled values when form loads (since defaultValues only works on initial render)
  useEffect(() => {
    if (Object.keys(prefilledValues).length > 0) {
      reset(prefilledValues);
    }
  }, [prefilledValues, reset]);

  // Track form view (once per session)
  useEffect(() => {
    if (form && !viewTracked && !redemption) {
      setViewTracked(true);
      // Fire and forget - don't block UI
      const trackView = async () => {
        try {
          const { error } = await supabase.rpc('increment_form_stat', { 
            form_id: form.id, 
            stat_name: 'views' 
          });
          if (error) console.warn('View tracking failed:', error);
        } catch (err) {
          console.warn('View tracking error:', err);
        }
      };
      trackView();
    }
  }, [form?.id, viewTracked, redemption]);

  // Watch all form values for conditional logic
  const formValues = watch();

  const onSubmit = async (data: any) => {
    if (!formIdentifier) return;

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
          body: { formId: formIdentifier, data: sanitizedData },
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
      className={`flex items-center justify-center ${
        embedMode ? 'bg-transparent p-4 max-h-[800px]' : 'min-h-screen bg-gradient-to-br from-background to-muted/20 p-6'
      }`}
    >
      <div className={`w-full ${embedMode ? 'max-w-sm' : 'max-w-md'} relative overflow-hidden`}>
        <AnimatePresence mode="wait">
          {!isFlipped ? (
            <motion.div
              key="form"
              initial={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <div className={`bg-card rounded-lg shadow-xl ${embedMode ? 'p-6 border-2' : 'p-8 backdrop-blur-sm'}`}>
                <div className={embedMode ? 'mb-4' : 'mb-6'}>
                  <h2 className={`font-bold text-foreground text-center ${embedMode ? 'text-xl' : 'text-2xl'}`}>
                    {form.form_config.settings?.title || "Enter Your Gift Card Code"}
                  </h2>
                  {form.form_config.settings?.description && !embedMode && (
                    <p className="text-muted-foreground mt-2 text-center text-base">
                      {form.form_config.settings.description}
                    </p>
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
                  // Evaluate conditional logic
                  const isVisible = shouldShowField(field, formValues, form.form_config.fields);
                  
                  // Hide field if conditional logic says so
                  if (!isVisible) {
                    return null;
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
            </motion.div>
          ) : (
            <motion.div
              key="gift-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full"
            >
              {redemption && (
                <GiftCardReveal 
                  redemption={redemption}
                  revealSettings={form.form_config.revealSettings}
                  embedMode={embedMode}
                  skipReveal={true}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

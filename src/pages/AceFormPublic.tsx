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

    setSubmitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("submit-ace-form", {
        body: { formId, data },
      });

      if (error) throw error;

      if (result.success && result.giftCard) {
        setRedemption(result.giftCard);
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit form. Please try again.");
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
    <div className="min-h-screen bg-background py-8 px-4">
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

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {form.form_config.fields.map((field) => (
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
                  />
                )}

                {errors[field.id] && (
                  <p className="text-sm text-destructive mt-1">
                    {errors[field.id]?.message as string}
                  </p>
                )}
              </div>
            ))}

            <Button
              type="submit"
              className="w-full"
              style={{ backgroundColor: primaryColor }}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : (form.form_config.settings?.submitButtonText || "Submit")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

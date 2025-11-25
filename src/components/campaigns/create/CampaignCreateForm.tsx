import { useCampaignCreateForm } from "@/hooks/useCampaignCreateForm";
import { CampaignSidebar } from "./CampaignSidebar";
import { RecipientsSection } from "./RecipientsSection";
import { MailPieceSection } from "./MailPieceSection";
import { AdvancedOptionsPanel } from "./AdvancedOptionsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2 } from "lucide-react";

interface CampaignCreateFormProps {
  clientId: string;
}

export function CampaignCreateForm({ clientId }: CampaignCreateFormProps) {
  const { form, handleSubmit, handleSaveDraft, isCreating } = useCampaignCreateForm({ clientId });

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Name */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Campaign Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Spring 2025 Roofing Promo"
                  {...form.register("name", { required: true })}
                  autoFocus
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">Campaign name is required</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Recipients Section */}
          <RecipientsSection form={form} clientId={clientId} />

          <Separator />

          {/* Mail Piece Section */}
          <MailPieceSection form={form} clientId={clientId} />

          <Separator />

          {/* Advanced Options */}
          <AdvancedOptionsPanel form={form} clientId={clientId} />
        </div>

        {/* Sticky Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <CampaignSidebar form={form} clientId={clientId} />
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-between items-center pt-6 mt-6 border-t sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
        >
          <Save className="mr-2 h-4 w-4" />
          Save Draft
        </Button>

        <Button type="submit" size="lg" disabled={isCreating}>
          {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Campaign
        </Button>
      </div>
    </form>
  );
}

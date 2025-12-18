/**
 * Campaign Builder Wizard
 * 
 * Multi-step wizard for creating email/SMS marketing campaigns.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { CampaignTypeSelector } from "./CampaignTypeSelector";
import { AudienceSelector } from "./AudienceSelector";
import { MessageComposer } from "./MessageComposer";
import { ScheduleSelector } from "./ScheduleSelector";
import { ReviewAndSend } from "./ReviewAndSend";
import { useCreateMarketingCampaign, useUpdateMarketingCampaign } from "../../hooks/useMarketingCampaigns";
import type { MarketingCampaignWithMessages, CampaignBuilderFormData } from "../../types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui/alert-dialog";

const STEPS = [
  { id: 'type', title: 'Campaign Type', description: 'Choose email, SMS, or both' },
  { id: 'audience', title: 'Audience', description: 'Select your recipients' },
  { id: 'message', title: 'Message', description: 'Compose your content' },
  { id: 'schedule', title: 'Schedule', description: 'When to send' },
  { id: 'review', title: 'Review', description: 'Review and send' },
];

interface Props {
  campaign?: MarketingCampaignWithMessages | null;
  isEdit?: boolean;
}

const initialFormData: CampaignBuilderFormData = {
  campaign_type: 'email',
  audience_type: 'all_contacts',
  audience_config: {},
  name: '',
  schedule_type: 'immediate',
};

export function CampaignBuilderWizard({ campaign, isEdit }: Props) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<CampaignBuilderFormData>(() => {
    if (campaign) {
      return {
        campaign_type: campaign.campaign_type,
        audience_type: campaign.audience_type,
        audience_config: campaign.audience_config,
        name: campaign.name,
        description: campaign.description || undefined,
        email_subject: campaign.messages?.find(m => m.message_type === 'email')?.subject || undefined,
        email_body_html: campaign.messages?.find(m => m.message_type === 'email')?.body_html || undefined,
        email_template_id: campaign.messages?.find(m => m.message_type === 'email')?.template_id || undefined,
        sms_body: campaign.messages?.find(m => m.message_type === 'sms')?.body_text || undefined,
        sms_template_id: campaign.messages?.find(m => m.message_type === 'sms')?.template_id || undefined,
        schedule_type: campaign.scheduled_at ? 'scheduled' : 'immediate',
        scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at) : undefined,
      };
    }
    return initialFormData;
  });

  const createMutation = useCreateMarketingCampaign();
  const updateMutation = useUpdateMarketingCampaign();

  const updateFormData = useCallback((updates: Partial<CampaignBuilderFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCancel = () => {
    navigate('/marketing');
  };

  const handleSubmit = async (sendNow: boolean) => {
    const messages = [];
    
    if (formData.campaign_type === 'email' || formData.campaign_type === 'both') {
      messages.push({
        message_type: 'email' as const,
        subject: formData.email_subject,
        body_html: formData.email_body_html,
        body_text: formData.email_body_html?.replace(/<[^>]*>/g, '') || '',
        template_id: formData.email_template_id,
        sequence_order: 1,
        delay_minutes: 0,
      });
    }
    
    if (formData.campaign_type === 'sms' || formData.campaign_type === 'both') {
      messages.push({
        message_type: 'sms' as const,
        body_text: formData.sms_body,
        template_id: formData.sms_template_id,
        sequence_order: formData.campaign_type === 'both' ? 2 : 1,
        delay_minutes: 0,
      });
    }

    try {
      if (isEdit && campaign) {
        await updateMutation.mutateAsync({
          id: campaign.id,
          name: formData.name,
          description: formData.description,
          audience_type: formData.audience_type,
          audience_config: formData.audience_config,
          scheduled_at: formData.schedule_type === 'scheduled' && formData.scheduled_at 
            ? formData.scheduled_at.toISOString() 
            : null,
          status: sendNow ? 'sending' : formData.schedule_type === 'scheduled' ? 'scheduled' : 'draft',
        });
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          description: formData.description,
          campaign_type: formData.campaign_type,
          audience_type: formData.audience_type,
          audience_config: formData.audience_config,
          linked_mail_campaign_id: formData.linked_mail_campaign_id,
          scheduled_at: formData.schedule_type === 'scheduled' && formData.scheduled_at 
            ? formData.scheduled_at.toISOString() 
            : undefined,
          messages,
        });
      }
      navigate('/marketing/campaigns');
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Type
        return true;
      case 1: // Audience
        return formData.audience_type && (
          formData.audience_type === 'all_contacts' || 
          (formData.audience_config.listIds?.length || 0) > 0 ||
          (formData.audience_config.contactIds?.length || 0) > 0
        );
      case 2: // Message
        if (formData.campaign_type === 'email' || formData.campaign_type === 'both') {
          if (!formData.email_subject || !formData.email_body_html) return false;
        }
        if (formData.campaign_type === 'sms' || formData.campaign_type === 'both') {
          if (!formData.sms_body) return false;
        }
        return !!formData.name;
      case 3: // Schedule
        if (formData.schedule_type === 'scheduled' && !formData.scheduled_at) return false;
        return true;
      case 4: // Review
        return true;
      default:
        return false;
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? 'Edit Campaign' : 'Create Campaign'}
          </h1>
          <p className="text-muted-foreground">
            {STEPS[currentStep].description}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard changes?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel? All unsaved changes will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continue Editing</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel}>Discard</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          {STEPS.map((step, idx) => (
            <div 
              key={step.id}
              className={`flex items-center gap-2 ${idx <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                idx < currentStep 
                  ? 'bg-primary text-primary-foreground' 
                  : idx === currentStep 
                    ? 'border-2 border-primary' 
                    : 'border-2 border-muted'
              }`}>
                {idx < currentStep ? <Check className="h-3 w-3" /> : idx + 1}
              </div>
              <span className="hidden sm:inline">{step.title}</span>
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && (
            <CampaignTypeSelector 
              value={formData.campaign_type}
              linkedCampaignId={formData.linked_mail_campaign_id}
              onChange={(type, linkedId) => updateFormData({ 
                campaign_type: type, 
                linked_mail_campaign_id: linkedId 
              })}
            />
          )}
          {currentStep === 1 && (
            <AudienceSelector 
              audienceType={formData.audience_type}
              audienceConfig={formData.audience_config}
              onChange={(type, config) => updateFormData({ 
                audience_type: type, 
                audience_config: config 
              })}
            />
          )}
          {currentStep === 2 && (
            <MessageComposer 
              campaignType={formData.campaign_type}
              name={formData.name}
              description={formData.description}
              emailSubject={formData.email_subject}
              emailBody={formData.email_body_html}
              emailTemplateId={formData.email_template_id}
              smsBody={formData.sms_body}
              smsTemplateId={formData.sms_template_id}
              onChange={(updates) => updateFormData(updates)}
            />
          )}
          {currentStep === 3 && (
            <ScheduleSelector 
              scheduleType={formData.schedule_type}
              scheduledAt={formData.scheduled_at}
              followUpDelayDays={formData.follow_up_delay_days}
              followUpTrigger={formData.follow_up_trigger}
              isFollowUp={!!formData.linked_mail_campaign_id}
              onChange={(updates) => updateFormData(updates)}
            />
          )}
          {currentStep === 4 && (
            <ReviewAndSend 
              formData={formData}
              onSubmit={handleSubmit}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={goBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        {currentStep < STEPS.length - 1 ? (
          <Button 
            onClick={goNext}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

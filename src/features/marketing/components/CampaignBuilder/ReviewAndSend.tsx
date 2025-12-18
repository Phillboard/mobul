/**
 * Review and Send Component
 * 
 * Final step - review campaign details and send.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { 
  Mail, MessageSquare, Users, Calendar, Clock, 
  CheckCircle, AlertCircle, Send, Save, Loader2
} from "lucide-react";
import { format } from "date-fns";
import type { CampaignBuilderFormData } from "../../types";
import { useState } from "react";

interface Props {
  formData: CampaignBuilderFormData;
  onSubmit: (sendNow: boolean) => void;
  isSubmitting: boolean;
}

export function ReviewAndSend({ formData, onSubmit, isSubmitting }: Props) {
  const [confirmations, setConfirmations] = useState({
    content: false,
    audience: false,
    timing: false,
  });

  const allConfirmed = Object.values(confirmations).every(Boolean);

  const handleConfirmation = (key: keyof typeof confirmations) => {
    setConfirmations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getAudienceDescription = () => {
    switch (formData.audience_type) {
      case 'all_contacts':
        return 'All contacts in your database';
      case 'contact_list':
        return `${formData.audience_config.listIds?.length || 0} contact list(s) selected`;
      case 'manual':
        return `${formData.audience_config.contactIds?.length || 0} contacts manually selected`;
      case 'segment':
        return 'Custom segment';
      default:
        return 'Unknown';
    }
  };

  const getScheduleDescription = () => {
    if (formData.schedule_type === 'scheduled' && formData.scheduled_at) {
      return format(formData.scheduled_at, "EEEE, MMMM d, yyyy 'at' h:mm a");
    }
    if (formData.linked_mail_campaign_id) {
      return `${formData.follow_up_delay_days || 0} days after mail campaign ${formData.follow_up_trigger || 'sent'}`;
    }
    return 'Send immediately upon creation';
  };

  const validationChecks = [
    {
      id: 'name',
      label: 'Campaign name is set',
      valid: !!formData.name,
    },
    {
      id: 'audience',
      label: 'Recipients selected',
      valid: formData.audience_type === 'all_contacts' || 
             (formData.audience_config.listIds?.length || 0) > 0 ||
             (formData.audience_config.contactIds?.length || 0) > 0,
    },
    {
      id: 'email',
      label: 'Email content ready',
      valid: formData.campaign_type === 'sms' || (!!formData.email_subject && !!formData.email_body_html),
      skip: formData.campaign_type === 'sms',
    },
    {
      id: 'sms',
      label: 'SMS content ready',
      valid: formData.campaign_type === 'email' || !!formData.sms_body,
      skip: formData.campaign_type === 'email',
    },
  ].filter(check => !check.skip);

  const allValid = validationChecks.every(check => check.valid);

  return (
    <div className="space-y-6">
      {/* Campaign Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Summary</CardTitle>
          <CardDescription>Review your campaign before sending</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Campaign Name</span>
            <span className="font-medium">{formData.name || 'Untitled'}</span>
          </div>
          <Separator />

          {/* Type */}
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Type</span>
            <div className="flex items-center gap-2">
              {formData.campaign_type === 'email' && (
                <>
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span>Email</span>
                </>
              )}
              {formData.campaign_type === 'sms' && (
                <>
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <span>SMS</span>
                </>
              )}
              {formData.campaign_type === 'both' && (
                <>
                  <Mail className="h-4 w-4 text-blue-500" />
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <span>Email + SMS</span>
                </>
              )}
            </div>
          </div>
          <Separator />

          {/* Audience */}
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Audience
            </span>
            <span className="font-medium">{getAudienceDescription()}</span>
          </div>
          <Separator />

          {/* Schedule */}
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground flex items-center gap-2">
              {formData.schedule_type === 'immediate' ? (
                <Send className="h-4 w-4" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              Schedule
            </span>
            <span className="font-medium">{getScheduleDescription()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Message Previews */}
      {(formData.campaign_type === 'email' || formData.campaign_type === 'both') && formData.email_body_html && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-base">Email Preview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="font-medium mb-2">{formData.email_subject}</p>
              <p className="text-sm whitespace-pre-wrap line-clamp-4">{formData.email_body_html}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {(formData.campaign_type === 'sms' || formData.campaign_type === 'both') && formData.sms_body && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-500" />
              <CardTitle className="text-base">SMS Preview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 max-w-[280px]">
              <p className="text-sm">{formData.sms_body}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Validation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {validationChecks.map((check) => (
            <div key={check.id} className="flex items-center gap-3">
              {check.valid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <span className={check.valid ? '' : 'text-red-500'}>{check.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Confirmations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confirm Before Sending</CardTitle>
          <CardDescription>Please review and confirm the following</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox 
              id="confirm-content"
              checked={confirmations.content}
              onCheckedChange={() => handleConfirmation('content')}
            />
            <Label htmlFor="confirm-content" className="text-sm leading-relaxed cursor-pointer">
              I have reviewed the message content and it is ready to send
            </Label>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox 
              id="confirm-audience"
              checked={confirmations.audience}
              onCheckedChange={() => handleConfirmation('audience')}
            />
            <Label htmlFor="confirm-audience" className="text-sm leading-relaxed cursor-pointer">
              I have verified the audience selection is correct
            </Label>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox 
              id="confirm-timing"
              checked={confirmations.timing}
              onCheckedChange={() => handleConfirmation('timing')}
            />
            <Label htmlFor="confirm-timing" className="text-sm leading-relaxed cursor-pointer">
              I understand when this campaign will be sent
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button 
          variant="outline"
          onClick={() => onSubmit(false)}
          disabled={isSubmitting || !allValid}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save as Draft
        </Button>
        
        {formData.schedule_type === 'scheduled' ? (
          <Button 
            onClick={() => onSubmit(false)}
            disabled={isSubmitting || !allValid || !allConfirmed}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Schedule Campaign
          </Button>
        ) : (
          <Button 
            onClick={() => onSubmit(true)}
            disabled={isSubmitting || !allValid || !allConfirmed}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Now
          </Button>
        )}
      </div>
    </div>
  );
}

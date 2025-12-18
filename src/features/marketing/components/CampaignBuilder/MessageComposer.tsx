/**
 * Message Composer Component
 * 
 * Compose email and/or SMS content for the campaign.
 * Reuses existing message template hooks.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Mail, MessageSquare, FileText, Tag, Eye } from "lucide-react";
import { useMessageTemplates, extractMergeTags } from "@/features/settings/hooks/useMessageTemplates";
import type { CampaignType, CampaignBuilderFormData } from "../../types";

interface Props {
  campaignType: CampaignType;
  name?: string;
  description?: string;
  emailSubject?: string;
  emailBody?: string;
  emailTemplateId?: string;
  smsBody?: string;
  smsTemplateId?: string;
  onChange: (updates: Partial<CampaignBuilderFormData>) => void;
}

const AVAILABLE_MERGE_TAGS = [
  '{{first_name}}',
  '{{last_name}}',
  '{{email}}',
  '{{phone}}',
  '{{company}}',
];

export function MessageComposer({
  campaignType,
  name,
  description,
  emailSubject,
  emailBody,
  emailTemplateId,
  smsBody,
  smsTemplateId,
  onChange,
}: Props) {
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showSmsPreview, setShowSmsPreview] = useState(false);

  const { templates: emailTemplates } = useMessageTemplates('email');
  const { templates: smsTemplates } = useMessageTemplates('sms');

  const handleEmailTemplateSelect = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      onChange({
        email_template_id: templateId,
        email_subject: template.subject || '',
        email_body_html: template.body_template,
      });
    }
  };

  const handleSmsTemplateSelect = (templateId: string) => {
    const template = smsTemplates.find(t => t.id === templateId);
    if (template) {
      onChange({
        sms_template_id: templateId,
        sms_body: template.body_template,
      });
    }
  };

  const insertMergeTag = (tag: string, field: 'email_subject' | 'email_body_html' | 'sms_body') => {
    const currentValue = field === 'email_subject' ? emailSubject : field === 'email_body_html' ? emailBody : smsBody;
    onChange({ [field]: (currentValue || '') + tag });
  };

  const getSmsCharacterCount = () => {
    const length = smsBody?.length || 0;
    const segments = Math.ceil(length / 160) || 1;
    return { length, segments };
  };

  const smsStats = getSmsCharacterCount();

  return (
    <div className="space-y-6">
      {/* Campaign Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Campaign Name *</Label>
        <Input
          id="name"
          value={name || ''}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g., Holiday Sale Announcement"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          value={description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Internal notes about this campaign"
          rows={2}
        />
      </div>

      {/* Message Content */}
      {(campaignType === 'email' || campaignType === 'both') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Email Message</CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowEmailPreview(!showEmailPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Use Template (optional)</Label>
              <Select
                value={emailTemplateId}
                onValueChange={handleEmailTemplateSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template or write custom..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Write Custom Email</SelectItem>
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject Line *</Label>
              <Input
                id="email-subject"
                value={emailSubject || ''}
                onChange={(e) => onChange({ email_subject: e.target.value })}
                placeholder="Enter email subject..."
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-body">Email Body *</Label>
                <div className="flex gap-1">
                  {AVAILABLE_MERGE_TAGS.slice(0, 3).map((tag) => (
                    <Button
                      key={tag}
                      variant="outline"
                      size="sm"
                      onClick={() => insertMergeTag(tag, 'email_body_html')}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag.replace(/[{}]/g, '')}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                id="email-body"
                value={emailBody || ''}
                onChange={(e) => onChange({ email_body_html: e.target.value })}
                placeholder="Write your email content here..."
                rows={8}
              />
            </div>

            {/* Preview */}
            {showEmailPreview && emailBody && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardDescription>Preview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium mb-2">{emailSubject || '(No subject)'}</div>
                  <div className="whitespace-pre-wrap text-sm">{emailBody}</div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {(campaignType === 'sms' || campaignType === 'both') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                <CardTitle className="text-base">SMS Message</CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowSmsPreview(!showSmsPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Use Template (optional)</Label>
              <Select
                value={smsTemplateId}
                onValueChange={handleSmsTemplateSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template or write custom..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Write Custom SMS</SelectItem>
                  {smsTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sms-body">Message *</Label>
                <div className="flex gap-1">
                  {AVAILABLE_MERGE_TAGS.slice(0, 2).map((tag) => (
                    <Button
                      key={tag}
                      variant="outline"
                      size="sm"
                      onClick={() => insertMergeTag(tag, 'sms_body')}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag.replace(/[{}]/g, '')}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                id="sms-body"
                value={smsBody || ''}
                onChange={(e) => onChange({ sms_body: e.target.value })}
                placeholder="Write your SMS message..."
                rows={4}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{smsStats.length} characters</span>
                <Badge variant={smsStats.segments > 1 ? 'secondary' : 'outline'}>
                  {smsStats.segments} {smsStats.segments === 1 ? 'segment' : 'segments'}
                </Badge>
              </div>
            </div>

            {/* Preview */}
            {showSmsPreview && smsBody && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardDescription>Preview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 max-w-[280px]">
                    <p className="text-sm">{smsBody}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

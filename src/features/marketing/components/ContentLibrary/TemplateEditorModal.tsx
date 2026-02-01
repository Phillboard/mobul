/**
 * Template Editor Modal
 * 
 * Modal for creating and editing email/SMS templates.
 * Accounts for Twilio's automatic URL shortening (~35 chars per URL).
 */

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { ChevronDown, Eye } from "lucide-react";
import { MarketingTemplate, CreateTemplateInput, UpdateTemplateInput, useCreateMarketingTemplate, useUpdateMarketingTemplate } from "@/features/marketing/hooks/useContentLibrary";
import { checkSmsLength } from "@/shared/utils/a2pValidation";
import { toast } from "sonner";
import { EmailPreview } from "./EmailPreview";
import { SMSPreview } from "./SMSPreview";

interface TemplateEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: MarketingTemplate | null;
  type?: 'email' | 'sms';
  onSave?: () => void;
}

const MERGE_TAGS = [
  { value: '{{first_name}}', label: 'First Name' },
  { value: '{{last_name}}', label: 'Last Name' },
  { value: '{{full_name}}', label: 'Full Name' },
  { value: '{{email}}', label: 'Email Address' },
  { value: '{{phone}}', label: 'Phone Number' },
  { value: '{{company}}', label: 'Company Name' },
  { value: '{{unsubscribe_link}}', label: 'Unsubscribe Link (Email only)' },
];

export function TemplateEditorModal({ 
  open, 
  onOpenChange, 
  template, 
  type = 'email',
  onSave 
}: TemplateEditorModalProps) {
  const isEditing = !!template;
  const templateType = template?.type || type;
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  const createMutation = useCreateMarketingTemplate();
  const updateMutation = useUpdateMarketingTemplate();

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCategory(template.category || '');
      setSubject(template.subject || '');
      setBodyHtml(template.body_html || '');
      setBodyText(template.body_text || '');
    } else {
      // Reset form
      setName('');
      setCategory('');
      setSubject('');
      setBodyHtml('');
      setBodyText('');
    }
  }, [template, open]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (templateType === 'email' && !subject.trim()) {
      toast.error('Please enter a subject line');
      return;
    }

    if (!bodyText.trim()) {
      toast.error('Please enter message content');
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: template.id,
          name,
          category: category || undefined,
          subject: templateType === 'email' ? subject : undefined,
          body_html: templateType === 'email' ? bodyHtml : undefined,
          body_text: bodyText,
        });
        toast.success('Template updated successfully');
      } else {
        await createMutation.mutateAsync({
          name,
          type: templateType,
          category: category || undefined,
          subject: templateType === 'email' ? subject : undefined,
          body_html: templateType === 'email' ? bodyHtml : undefined,
          body_text: bodyText,
        });
        toast.success('Template created successfully');
      }
      
      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const insertMergeTag = (tag: string, field: 'subject' | 'bodyText' | 'bodyHtml') => {
    if (field === 'subject') {
      setSubject(prev => prev + tag);
    } else if (field === 'bodyText') {
      setBodyText(prev => prev + tag);
    } else {
      setBodyHtml(prev => prev + tag);
    }
  };

  // Use URL shortening-aware character count for SMS
  const lengthInfo = useMemo(() => checkSmsLength(bodyText || ''), [bodyText]);
  const hasUrlShortening = lengthInfo.urlInfo.urlCount > 0 && lengthInfo.urlInfo.charactersSaved > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit' : 'Create'} {templateType === 'email' ? 'Email' : 'SMS'} Template
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="edit" value={showPreview ? 'preview' : 'edit'} onValueChange={(v) => setShowPreview(v === 'preview')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4 mt-4">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                placeholder="e.g., Welcome Email, Order Confirmation"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Input
                id="category"
                placeholder="e.g., Onboarding, Promotions, Reminders"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            {/* Email-specific fields */}
            {templateType === 'email' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="subject">Subject Line *</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Insert Tag <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {MERGE_TAGS.map((tag) => (
                          <DropdownMenuItem
                            key={tag.value}
                            onClick={() => insertMergeTag(tag.value, 'subject')}
                          >
                            {tag.label} <code className="ml-2 text-xs">{tag.value}</code>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Input
                    id="subject"
                    placeholder="Welcome to {{company}}, {{first_name}}!"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="body-html">Email Body *</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Insert Tag <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {MERGE_TAGS.map((tag) => (
                          <DropdownMenuItem
                            key={tag.value}
                            onClick={() => insertMergeTag(tag.value, 'bodyHtml')}
                          >
                            {tag.label} <code className="ml-2 text-xs">{tag.value}</code>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Textarea
                    id="body-html"
                    placeholder="Hi {{first_name}},&#10;&#10;Welcome to {{company}}! We're excited to have you...&#10;&#10;Best regards,&#10;The {{company}} Team"
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    For now, use plain text. Rich text editor coming soon.
                  </p>
                </div>
              </>
            )}

            {/* SMS-specific fields */}
            {templateType === 'sms' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="body-text">Message *</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Insert Tag <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {MERGE_TAGS.filter(tag => tag.value !== '{{unsubscribe_link}}').map((tag) => (
                        <DropdownMenuItem
                          key={tag.value}
                          onClick={() => insertMergeTag(tag.value, 'bodyText')}
                        >
                          {tag.label} <code className="ml-2 text-xs">{tag.value}</code>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Textarea
                  id="body-text"
                  placeholder="Hi {{first_name}}, this is a reminder about your appointment tomorrow at {{appointment_time}}. Reply CONFIRM to confirm."
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={6}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {hasUrlShortening ? (
                      <>
                        <span className="line-through opacity-50">{lengthInfo.length}</span>
                        {' ~'}{lengthInfo.estimatedLength}/160 characters
                        <span className="text-blue-500 ml-1">(link shortened)</span>
                      </>
                    ) : (
                      <>{lengthInfo.length}/160 characters</>
                    )}
                    {' • '}{lengthInfo.segments} segment{lengthInfo.segments !== 1 ? 's' : ''}
                  </span>
                  {lengthInfo.segments > 1 && (
                    <Badge variant="destructive" className="text-xs">
                      Multiple SMS segments
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Plain text version for email */}
            {templateType === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="body-text">Plain Text Version (Optional)</Label>
                <Textarea
                  id="body-text"
                  placeholder="Plain text version for email clients that don't support HTML"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={6}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <Card className="p-6">
              {templateType === 'email' ? (
                <EmailPreview
                  subject={subject}
                  bodyHtml={bodyHtml || bodyText}
                />
              ) : (
                <SMSPreview
                  message={bodyText}
                />
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

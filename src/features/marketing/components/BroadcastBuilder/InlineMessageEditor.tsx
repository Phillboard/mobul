/**
 * Inline Message Editor
 * 
 * Allows editing message content inline - either custom content OR template selection.
 */

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { ChevronDown, Save, X } from "lucide-react";
import { MarketingMessage } from "@/features/marketing/types";
import { useMarketingTemplates } from "@/features/marketing/hooks/useContentLibrary";

interface InlineMessageEditorProps {
  message: Partial<MarketingMessage>;
  onChange: (updates: Partial<MarketingMessage>) => void;
  onClose: () => void;
  isFirst: boolean;
}

const MERGE_TAGS = [
  { value: '{{first_name}}', label: 'First Name' },
  { value: '{{last_name}}', label: 'Last Name' },
  { value: '{{email}}', label: 'Email' },
  { value: '{{phone}}', label: 'Phone' },
  { value: '{{company}}', label: 'Company' },
  { value: '{{unsubscribe_link}}', label: 'Unsubscribe Link' },
];

export function InlineMessageEditor({ 
  message, 
  onChange, 
  onClose,
  isFirst 
}: InlineMessageEditorProps) {
  const [contentSource, setContentSource] = useState<'custom' | 'template'>(
    message.use_template ? 'template' : 'custom'
  );
  
  const { data: templates = [] } = useMarketingTemplates(message.message_type);
  
  const handleSave = () => {
    onChange({ use_template: contentSource === 'template' });
    onClose();
  };

  const insertMergeTag = (tag: string, field: 'subject' | 'body') => {
    if (field === 'subject' && message.message_type === 'email') {
      onChange({ custom_subject: (message.custom_subject || '') + tag });
    } else {
      onChange({ custom_body_text: (message.custom_body_text || '') + tag });
    }
  };

  const characterCount = message.custom_body_text?.length || 0;
  const smsSegments = Math.ceil(characterCount / 160);

  return (
    <div className="space-y-4">
      {/* Content Source Selection */}
      <RadioGroup 
        value={contentSource} 
        onValueChange={(v) => setContentSource(v as typeof contentSource)}
      >
        <div className="flex gap-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <RadioGroupItem value="custom" id="source-custom" />
            <span>Write Custom Message</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <RadioGroupItem value="template" id="source-template" />
            <span>Use Existing Template</span>
          </label>
        </div>
      </RadioGroup>

      {/* Custom Content Editor */}
      {contentSource === 'custom' && (
        <div className="space-y-4">
          {/* Email Subject */}
          {message.message_type === 'email' && (
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
                value={message.custom_subject || ''}
                onChange={(e) => onChange({ custom_subject: e.target.value })}
              />
            </div>
          )}

          {/* Message Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">
                {message.message_type === 'email' ? 'Email Body' : 'Message'} *
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    Insert Tag <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {MERGE_TAGS.filter(tag => 
                    message.message_type === 'email' || tag.value !== '{{unsubscribe_link}}'
                  ).map((tag) => (
                    <DropdownMenuItem
                      key={tag.value}
                      onClick={() => insertMergeTag(tag.value, 'body')}
                    >
                      {tag.label} <code className="ml-2 text-xs">{tag.value}</code>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Textarea
              id="body"
              placeholder={
                message.message_type === 'email'
                  ? "Hi {{first_name}},\n\nWelcome to {{company}}! We're excited to have you..."
                  : "Hi {{first_name}}, your appointment is confirmed for tomorrow at {{time}}."
              }
              value={message.custom_body_text || ''}
              onChange={(e) => onChange({ custom_body_text: e.target.value })}
              rows={message.message_type === 'email' ? 10 : 4}
              className={message.message_type === 'email' ? 'font-mono text-sm' : ''}
            />
            
            {/* SMS character count */}
            {message.message_type === 'sms' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {characterCount}/160 characters • {smsSegments} segment{smsSegments !== 1 ? 's' : ''}
                </span>
                {smsSegments > 1 && (
                  <Badge variant="destructive" className="text-xs">
                    Multiple SMS segments
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template Selector */}
      {contentSource === 'template' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select
              value={message.template_id || ''}
              onValueChange={(value) => onChange({ template_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No templates found. Create one in the Content Library.
                  </div>
                ) : (
                  templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.category && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({template.category})
                        </span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {message.template_id && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Template selected. Content will be loaded from the template when sending.
              </p>
            </div>
          )}

          {templates.length === 0 && (
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                No templates available yet. You can either write a custom message above, or create templates in the <strong>Content Library</strong>.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
}

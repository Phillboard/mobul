import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { renderTemplate } from '@/features/settings/hooks';
import { Wand2 } from "lucide-react";

interface MessageTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  type: 'sms' | 'email';
  previewData?: Record<string, any>;
  subject?: string;
  onSubjectChange?: (subject: string) => void;
}

const AVAILABLE_MERGE_TAGS = [
  { tag: 'first_name', label: 'First Name', example: 'John' },
  { tag: 'last_name', label: 'Last Name', example: 'Doe' },
  { tag: 'card_code', label: 'Gift Card Code', example: 'DEMO-1234-5678-9ABC' },
  { tag: 'card_value', label: 'Card Value', example: '25' },
  { tag: 'brand_name', label: 'Brand Name', example: 'Amazon' },
  { tag: 'expiration_date', label: 'Expiration Date', example: '12/31/2025' },
  { tag: 'company_name', label: 'Company Name', example: 'Acme Corp' },
  { tag: 'redemption_url', label: 'Redemption URL', example: 'https://...' },
];

export function MessageTemplateEditor({
  value,
  onChange,
  type,
  previewData,
  subject,
  onSubjectChange,
}: MessageTemplateEditorProps) {
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (previewData) {
      setPreview(renderTemplate(value, previewData));
    }
  }, [value, previewData]);

  const insertMergeTag = (tag: string) => {
    const newValue = value + `{{${tag}}}`;
    onChange(newValue);
  };

  const characterCount = value.length;
  const smsLimit = 160;
  const isOverLimit = type === 'sms' && characterCount > smsLimit;

  return (
    <div className="space-y-4">
      {type === 'email' && onSubjectChange && (
        <div className="space-y-2">
          <Label>Email Subject</Label>
          <Input
            value={subject || ''}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Enter email subject..."
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Message Template</Label>
          <div className="flex items-center gap-2">
            {type === 'sms' && (
              <Badge variant={isOverLimit ? "destructive" : "secondary"}>
                {characterCount}/{smsLimit} characters
              </Badge>
            )}
          </div>
        </div>
        
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={type === 'sms' 
            ? "Enter SMS message template..."
            : "Enter email body template..."}
          rows={type === 'sms' ? 4 : 8}
          className={isOverLimit ? 'border-destructive' : ''}
        />

        {isOverLimit && (
          <p className="text-sm text-destructive">
            SMS message exceeds 160 characters. It will be sent as multiple messages.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Available Merge Tags</Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_MERGE_TAGS.map((item) => (
            <Button
              key={item.tag}
              variant="outline"
              size="sm"
              onClick={() => insertMergeTag(item.tag)}
              className="text-xs"
            >
              <Wand2 className="h-3 w-3 mr-1" />
              {item.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Click a tag to insert it into your message. Tags will be replaced with actual values when sent.
        </p>
      </div>

      {previewData && preview && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              {type === 'email' && subject && (
                <div className="mb-2">
                  <strong className="text-sm text-muted-foreground">Subject:</strong>
                  <p className="font-medium">{renderTemplate(subject, previewData)}</p>
                  <hr className="my-2" />
                </div>
              )}
              <div className={type === 'sms' ? 'font-mono text-sm' : ''}>
                {type === 'email' ? (
                  <div dangerouslySetInnerHTML={{ __html: preview }} />
                ) : (
                  <p className="whitespace-pre-wrap">{preview}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


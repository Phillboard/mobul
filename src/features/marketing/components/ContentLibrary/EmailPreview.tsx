/**
 * Email Preview Component
 * 
 * Renders email template preview with sample data.
 */

import { useState } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface EmailPreviewProps {
  subject: string;
  bodyHtml: string;
  from?: string;
}

// Sample data for merge tags
const SAMPLE_DATA: Record<string, string> = {
  '{{first_name}}': 'John',
  '{{last_name}}': 'Doe',
  '{{full_name}}': 'John Doe',
  '{{email}}': 'john.doe@example.com',
  '{{phone}}': '(555) 123-4567',
  '{{company}}': 'Acme Corp',
  '{{unsubscribe_link}}': '#unsubscribe',
};

function replaceMergeTags(text: string): string {
  let result = text;
  Object.entries(SAMPLE_DATA).forEach(([tag, value]) => {
    result = result.replace(new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  });
  return result;
}

export function EmailPreview({ subject, bodyHtml, from = 'Company <noreply@company.com>' }: EmailPreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  const previewSubject = replaceMergeTags(subject || 'No subject');
  const previewBody = replaceMergeTags(bodyHtml || 'No content');

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex justify-center gap-2">
        <Button
          variant={viewMode === 'desktop' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('desktop')}
        >
          <Monitor className="h-4 w-4 mr-2" />
          Desktop
        </Button>
        <Button
          variant={viewMode === 'mobile' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('mobile')}
        >
          <Smartphone className="h-4 w-4 mr-2" />
          Mobile
        </Button>
      </div>

      {/* Email preview frame */}
      <div className="flex justify-center">
        <Card className={cn(
          "transition-all",
          viewMode === 'desktop' ? 'w-full max-w-3xl' : 'w-full max-w-sm'
        )}>
          <CardContent className="p-0">
            {/* Email header */}
            <div className="border-b bg-muted/50 p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">From: {from}</p>
                  <p className="text-sm text-muted-foreground">
                    To: {SAMPLE_DATA['{{email}}']}
                  </p>
                </div>
              </div>
              <p className="text-base font-semibold">{previewSubject}</p>
            </div>

            {/* Email body */}
            <div className="p-6 space-y-4">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: previewBody.replace(/\n/g, '<br/>') 
                }}
              />
            </div>

            {/* Email footer */}
            <div className="border-t bg-muted/30 p-4 text-xs text-muted-foreground text-center">
              <p>This is a preview with sample data</p>
              <p className="mt-1">Merge tags like {'{'}{'{'} first_name {'}'}{'}'}  will be replaced with actual contact data</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

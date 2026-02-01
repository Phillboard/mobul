/**
 * SMS Preview Component
 * 
 * Renders SMS template preview in phone mockup with sample data.
 * Accounts for Twilio's automatic URL shortening (~35 chars per URL).
 */

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { checkSmsLength } from "@/shared/utils/a2pValidation";

interface SMSPreviewProps {
  message: string;
}

// Sample data for merge tags
const SAMPLE_DATA: Record<string, string> = {
  '{{first_name}}': 'John',
  '{{last_name}}': 'Doe',
  '{{full_name}}': 'John Doe',
  '{{email}}': 'john.doe@example.com',
  '{{phone}}': '(555) 123-4567',
  '{{company}}': 'Acme Corp',
};

function replaceMergeTags(text: string): string {
  let result = text;
  Object.entries(SAMPLE_DATA).forEach(([tag, value]) => {
    result = result.replace(new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  });
  return result;
}

export function SMSPreview({ message }: SMSPreviewProps) {
  const previewMessage = replaceMergeTags(message || 'No message content');
  const lengthInfo = checkSmsLength(message || '');
  const hasUrlShortening = lengthInfo.urlInfo.urlCount > 0 && lengthInfo.urlInfo.charactersSaved > 0;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Phone mockup */}
      <div className="relative">
        {/* Phone frame */}
        <div className="w-80 h-[600px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-[3rem] p-3 shadow-2xl">
          {/* Phone screen */}
          <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
            {/* Status bar */}
            <div className="bg-gray-100 px-6 py-2 flex items-center justify-between">
              <span className="text-xs font-medium">9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-3 border border-gray-400 rounded-sm relative">
                  <div className="absolute inset-0.5 bg-gray-400 rounded-sm" />
                </div>
              </div>
            </div>

            {/* Messages header */}
            <div className="bg-gray-100 border-b px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  AC
                </div>
                <div>
                  <p className="text-sm font-semibold">Acme Corp</p>
                  <p className="text-xs text-muted-foreground">Business</p>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 bg-white p-4 overflow-auto">
              <div className="flex flex-col items-start gap-2">
                {/* Message bubble */}
                <div className="max-w-[85%]">
                  <div className="bg-gray-200 rounded-2xl rounded-tl-sm px-4 py-2.5">
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {previewMessage}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-2">
                    Just now
                  </p>
                </div>
              </div>
            </div>

            {/* Input area */}
            <div className="bg-gray-100 border-t px-4 py-3 flex items-center gap-2">
              <div className="flex-1 bg-white rounded-full px-4 py-2">
                <p className="text-sm text-muted-foreground">iMessage</p>
              </div>
            </div>
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full" />
        </div>
      </div>

      {/* Message stats */}
      <Card className="w-80">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {hasUrlShortening ? (
                <>
                  <span className="line-through opacity-50">{lengthInfo.length}</span>
                  {' ~'}{lengthInfo.estimatedLength} character{lengthInfo.estimatedLength !== 1 ? 's' : ''}
                </>
              ) : (
                <>{lengthInfo.length} character{lengthInfo.length !== 1 ? 's' : ''}</>
              )}
            </span>
            <Badge variant={lengthInfo.segments > 1 ? 'destructive' : 'secondary'}>
              {lengthInfo.segments} SMS segment{lengthInfo.segments !== 1 ? 's' : ''}
            </Badge>
          </div>
          {hasUrlShortening && (
            <p className="text-xs text-blue-500 mt-2">
              URLs will be shortened by Twilio (~35 chars each)
            </p>
          )}
          {lengthInfo.segments > 1 && (
            <p className="text-xs text-muted-foreground mt-2">
              Messages over 160 characters will be sent as multiple SMS segments
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
            Preview shows sample data. Merge tags will be replaced with actual contact information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { CallCenterScript } from "@/hooks/useCallCenterScripts";

interface ScriptEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script?: CallCenterScript;
  onSave: (script: Partial<CallCenterScript>) => void;
  clientId: string;
}

const SCRIPT_TYPES = [
  { value: 'greeting', label: 'Greeting' },
  { value: 'verification', label: 'Verification' },
  { value: 'explanation', label: 'Gift Card Explanation' },
  { value: 'objection_handling', label: 'Objection Handling' },
  { value: 'closing', label: 'Closing' },
  { value: 'escalation', label: 'Escalation' },
];

const MERGE_FIELD_CATEGORIES = {
  recipient: {
    label: 'Recipient Info',
    fields: [
      { placeholder: '{{first_name}}', description: 'First name', example: 'John' },
      { placeholder: '{{last_name}}', description: 'Last name', example: 'Smith' },
      { placeholder: '{{full_name}}', description: 'Full name', example: 'John Smith' },
      { placeholder: '{{phone}}', description: 'Phone number', example: '(555) 123-4567' },
      { placeholder: '{{email}}', description: 'Email address', example: 'john@example.com' },
      { placeholder: '{{city}}', description: 'City', example: 'Orlando' },
      { placeholder: '{{state}}', description: 'State', example: 'FL' },
    ],
  },
  campaign: {
    label: 'Campaign Info',
    fields: [
      { placeholder: '{{campaign_name}}', description: 'Campaign name', example: 'Summer Roofing Promo' },
      { placeholder: '{{company_name}}', description: 'Company/Client name', example: 'ABC Roofing' },
      { placeholder: '{{mail_date}}', description: 'Mail date', example: 'November 15, 2025' },
    ],
  },
  reward: {
    label: 'Gift Card Info',
    fields: [
      { placeholder: '{{gift_card_brand}}', description: 'Gift card brand', example: 'Starbucks' },
      { placeholder: '{{gift_card_value}}', description: 'Gift card value', example: '$25' },
      { placeholder: '{{condition_name}}', description: 'Reward condition', example: 'Free Estimate Scheduled' },
      { placeholder: '{{redemption_code}}', description: 'Redemption code', example: 'ABC-123-XYZ' },
    ],
  },
  agent: {
    label: 'Agent Info',
    fields: [
      { placeholder: '{{agent_name}}', description: 'Your name', example: 'Sarah' },
      { placeholder: '{{current_date}}', description: 'Current date', example: 'December 1, 2025' },
      { placeholder: '{{current_time}}', description: 'Current time', example: '2:30 PM' },
    ],
  },
};

// Legacy support - flat array of all placeholders
const VARIABLE_PLACEHOLDERS = Object.values(MERGE_FIELD_CATEGORIES)
  .flatMap(cat => cat.fields)
  .slice(0, 3); // Keep first 3 for backward compatibility

// Sample data for preview
const SAMPLE_DATA: Record<string, string> = {
  '{{first_name}}': 'John',
  '{{last_name}}': 'Smith',
  '{{full_name}}': 'John Smith',
  '{{phone}}': '(555) 123-4567',
  '{{email}}': 'john@example.com',
  '{{city}}': 'Orlando',
  '{{state}}': 'FL',
  '{{campaign_name}}': 'Summer Roofing Promo',
  '{{company_name}}': 'ABC Roofing',
  '{{mail_date}}': 'November 15, 2025',
  '{{gift_card_brand}}': 'Starbucks',
  '{{gift_card_value}}': '$25',
  '{{condition_name}}': 'Free Estimate Scheduled',
  '{{redemption_code}}': 'ABC-123-XYZ',
  '{{agent_name}}': 'Sarah',
  '{{current_date}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  '{{current_time}}': new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  // Legacy support
  '{{customer_name}}': 'John Smith',
};

function renderScriptPreview(content: string): string {
  let preview = content;
  Object.entries(SAMPLE_DATA).forEach(([placeholder, value]) => {
    preview = preview.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  });
  return preview;
}

export function ScriptEditor({ open, onOpenChange, script, onSave, clientId }: ScriptEditorProps) {
  const [formData, setFormData] = useState({
    script_name: script?.script_name || '',
    script_type: script?.script_type || 'greeting',
    script_content: script?.script_content || '',
    is_active: script?.is_active ?? true,
  });

  const handleSave = () => {
    onSave({
      ...formData,
      client_id: clientId,
      display_order: script?.display_order || 0,
    });
    onOpenChange(false);
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.querySelector('textarea[name="script_content"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.script_content;
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      setFormData({ ...formData, script_content: newText });
      
      // Set cursor position after inserted placeholder
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
        textarea.focus();
      }, 0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{script ? 'Edit Script' : 'Create New Script'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="script_name">Script Name</Label>
            <Input
              id="script_name"
              value={formData.script_name}
              onChange={(e) => setFormData({ ...formData, script_name: e.target.value })}
              placeholder="e.g., Welcome Script, Code Verification"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="script_type">Script Type</Label>
            <Select
              value={formData.script_type}
              onValueChange={(value: any) => setFormData({ ...formData, script_type: value })}
            >
              <SelectTrigger id="script_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCRIPT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="script_content">Script Content</Label>
            <Textarea
              id="script_content"
              name="script_content"
              value={formData.script_content}
              onChange={(e) => setFormData({ ...formData, script_content: e.target.value })}
              placeholder="Enter your script content here..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Merge Fields</Label>
            <p className="text-xs text-muted-foreground flex items-start gap-1 mb-2">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              Click on a merge field to insert it at cursor position. These will be replaced with actual data during calls.
            </p>
            
            <div className="space-y-3 max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/30">
              {Object.entries(MERGE_FIELD_CATEGORIES).map(([key, category]) => (
                <div key={key}>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">
                    {category.label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {category.fields.map(({ placeholder, description, example }) => (
                      <Badge
                        key={placeholder}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent text-xs px-2 py-0.5 font-mono"
                        onClick={() => insertPlaceholder(placeholder)}
                        title={`${description} (e.g., ${example})`}
                      >
                        {placeholder.replace(/\{\{|\}\}/g, '')}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Script Preview */}
          {formData.script_content && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preview (with sample data)</Label>
              <div className="p-3 border rounded-lg bg-card text-sm whitespace-pre-wrap">
                {renderScriptPreview(formData.script_content)}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Active Script
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {script ? 'Update Script' : 'Create Script'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

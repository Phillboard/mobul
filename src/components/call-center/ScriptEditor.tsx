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

const VARIABLE_PLACEHOLDERS = [
  { placeholder: '{{customer_name}}', description: 'Customer\'s name' },
  { placeholder: '{{campaign_name}}', description: 'Campaign name' },
  { placeholder: '{{gift_card_value}}', description: 'Gift card value' },
];

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

          <div className="space-y-2">
            <Label className="text-sm font-medium">Variable Placeholders</Label>
            <div className="flex flex-wrap gap-2">
              {VARIABLE_PLACEHOLDERS.map(({ placeholder, description }) => (
                <Badge
                  key={placeholder}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => insertPlaceholder(placeholder)}
                >
                  {placeholder}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              Click on a placeholder to insert it at cursor position. These will be replaced with actual data during calls.
            </p>
          </div>

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

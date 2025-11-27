import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";
import { useMessageTemplates, type MessageTemplate } from "@/hooks/useMessageTemplates";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageTemplateEditor } from "./MessageTemplateEditor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TemplateSelectorProps {
  type: 'sms' | 'email';
  value?: string;
  onChange: (template: MessageTemplate | null) => void;
  previewData?: Record<string, any>;
}

export function TemplateSelector({
  type,
  value,
  onChange,
  previewData,
}: TemplateSelectorProps) {
  const { templates, createTemplate, isCreating } = useMessageTemplates(type);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');
  const [newTemplateSubject, setNewTemplateSubject] = useState('');

  const selectedTemplate = templates.find(t => t.id === value);

  const handleCreate = () => {
    if (!newTemplateName || !newTemplateBody) return;

    createTemplate({
      template_type: type,
      name: newTemplateName,
      body_template: newTemplateBody,
      subject: type === 'email' ? newTemplateSubject : undefined,
      is_default: false,
    });

    setIsCreateDialogOpen(false);
    setNewTemplateName('');
    setNewTemplateBody('');
    setNewTemplateSubject('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select value={value} onValueChange={(v) => {
            const template = templates.find(t => t.id === v);
            onChange(template || null);
          }}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${type.toUpperCase()} template...`} />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                  {template.is_default && (
                    <span className="ml-2 text-xs text-muted-foreground">(Default)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create {type.toUpperCase()} Template</DialogTitle>
              <DialogDescription>
                Create a reusable message template with merge tags
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Premium Gift Card Message"
                />
              </div>

              <MessageTemplateEditor
                value={newTemplateBody}
                onChange={setNewTemplateBody}
                type={type}
                subject={newTemplateSubject}
                onSubjectChange={type === 'email' ? setNewTemplateSubject : undefined}
                previewData={previewData}
              />

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate}
                  disabled={!newTemplateName || !newTemplateBody || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Template'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedTemplate && (
        <div className="text-sm text-muted-foreground">
          <p className="line-clamp-2">{selectedTemplate.body_template}</p>
        </div>
      )}
    </div>
  );
}


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { getContextualTemplates } from "@/features/mail-designer/templates/aceFormTemplates";
import { FormTemplate } from "@/types/aceForms";
import { useFormContext } from '@/features/ace-forms/hooks';

interface FormTemplateSelectorProps {
  onSelect: (template: FormTemplate) => void;
  onCancel: () => void;
}

export function FormTemplateSelector({ onSelect, onCancel }: FormTemplateSelectorProps) {
  const { context } = useFormContext();
  const templates = getContextualTemplates(context);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className="hover:shadow-md transition-all cursor-pointer hover:border-primary" 
            onClick={() => onSelect(template)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription className="text-sm">{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" className="w-full">Use Template</Button>
            </CardContent>
          </Card>
        ))}

        <Card 
          className="hover:shadow-md transition-all cursor-pointer border-dashed hover:border-primary" 
          onClick={() => onSelect(templates[0])}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Start Blank</CardTitle>
            <CardDescription className="text-sm">Build from scratch with full control</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" className="w-full" variant="outline">Start Blank</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

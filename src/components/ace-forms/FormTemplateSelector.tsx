import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { aceFormTemplates } from "@/lib/aceFormTemplates";
import { FormTemplate } from "@/types/aceForms";

interface FormTemplateSelectorProps {
  onSelect: (template: FormTemplate) => void;
  onCancel: () => void;
}

export function FormTemplateSelector({ onSelect, onCancel }: FormTemplateSelectorProps) {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Choose a Template</h1>
          <p className="text-muted-foreground mt-1">Start with a pre-built form or create from scratch</p>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aceFormTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onSelect(template)}>
            <CardHeader>
              <CardTitle>{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Use This Template</Button>
            </CardContent>
          </Card>
        ))}

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-dashed" onClick={() => onSelect(aceFormTemplates[0])}>
          <CardHeader>
            <CardTitle>Blank Form</CardTitle>
            <CardDescription>Start from scratch and build your own</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Start Blank</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

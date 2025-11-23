/**
 * Industry Template Selector Component
 * Phase 2: Professional template library with previews
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { industryTemplates, templateCategories } from "@/lib/industryLandingTemplates";
import { Sparkles, Eye } from "lucide-react";

interface IndustryTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (templateId: string) => void;
  clientData?: {
    companyName: string;
    industry?: string;
    logoUrl?: string;
  };
}

export function IndustryTemplateSelector({
  open,
  onOpenChange,
  onSelectTemplate,
  clientData,
}: IndustryTemplateSelectorProps) {
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  const handleUseTemplate = (templateId: string) => {
    onSelectTemplate(templateId);
    onOpenChange(false);
  };

  const handlePreview = (templateId: string) => {
    const template = industryTemplates[templateId];
    if (template) {
      // Generate preview HTML with client data
      const vars = {
        companyName: clientData?.companyName || 'Your Company',
        industry: template.industry,
        ...template.defaultValues,
        logoUrl: clientData?.logoUrl,
        primaryColor: template.defaultValues.primaryColor || '#6366f1',
        accentColor: template.defaultValues.accentColor || '#8b5cf6',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        giftCardBrand: 'Amazon',
        giftCardValue: '50',
      };

      const html = template.generateHTML(vars as any);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Choose Your Landing Page Template
          </DialogTitle>
          <p className="text-muted-foreground">
            Professional templates optimized for your industry
          </p>
        </DialogHeader>

        <div className="space-y-8 mt-6">
          {templateCategories.map((category) => (
            <div key={category.category}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">{category.icon}</span>
                {category.category}
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.templates.map((templateKey) => {
                  const template = industryTemplates[templateKey];
                  return (
                    <Card key={template.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 overflow-hidden">
                          <img
                            src={template.thumbnailUrl}
                            alt={template.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handlePreview(templateKey)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                          </div>
                        </div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm mb-4">
                          {template.description}
                        </CardDescription>
                        <div className="flex gap-2 mb-4">
                          <Badge variant="secondary" className="text-xs">
                            {template.industry}
                          </Badge>
                        </div>
                        <Button
                          onClick={() => handleUseTemplate(templateKey)}
                          className="w-full"
                          variant="default"
                        >
                          Use This Template
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            💡 All templates are fully customizable with your brand colors, logo, and messaging
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

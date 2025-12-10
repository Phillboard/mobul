/**
 * TemplateLibrary Component
 * 
 * Browse and use pre-made design templates.
 * Supports mail, landing page, and email templates.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Search, Eye, Download, Copy } from 'lucide-react';
import type { CanvasState, DesignerType } from '../types/designer';

export interface TemplateLibraryProps {
  /** Designer type to filter templates */
  designerType: DesignerType;
  /** Callback when template is selected */
  onSelectTemplate: (template: CanvasState) => void;
  /** Show custom templates (user-saved) */
  showCustomTemplates?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Built-in template presets
 */
const BUILT_IN_TEMPLATES: Record<DesignerType, Array<{
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  state: CanvasState;
}>> = {
  mail: [
    {
      id: 'blank-4x6',
      name: 'Blank 4x6 Postcard',
      description: 'Start from scratch with a standard postcard size',
      category: 'Basic',
      state: {
        width: 1200,
        height: 1800,
        backgroundColor: '#ffffff',
        backgroundImage: null,
        elements: [],
        selectedElementIds: [],
      },
    },
    {
      id: 'promo-postcard',
      name: 'Promotional Postcard',
      description: 'Pre-designed layout for promotions with headline and CTA',
      category: 'Promotional',
      state: {
        width: 1200,
        height: 1800,
        backgroundColor: '#ffffff',
        backgroundImage: null,
        elements: [
          {
            id: 'headline',
            type: 'text',
            content: 'Special Offer Inside!',
            x: 100,
            y: 100,
            width: 1000,
            height: 100,
            rotation: 0,
            zIndex: 0,
            locked: false,
            visible: true,
            styles: {
              fontSize: 48,
              fontWeight: 'bold',
              color: '#1F2937',
              textAlign: 'center',
            },
          },
        ],
        selectedElementIds: [],
      },
    },
  ],
  'landing-page': [
    {
      id: 'blank-landing',
      name: 'Blank Landing Page',
      description: 'Empty canvas for landing pages',
      category: 'Basic',
      state: {
        width: 1920,
        height: 1080,
        backgroundColor: '#ffffff',
        backgroundImage: null,
        elements: [],
        selectedElementIds: [],
      },
    },
  ],
  email: [
    {
      id: 'blank-email',
      name: 'Blank Email',
      description: 'Empty email template (600px width)',
      category: 'Basic',
      state: {
        width: 600,
        height: 800,
        backgroundColor: '#ffffff',
        backgroundImage: null,
        elements: [],
        selectedElementIds: [],
      },
    },
  ],
};

/**
 * TemplateLibrary component
 */
export function TemplateLibrary({
  designerType,
  onSelectTemplate,
  showCustomTemplates = true,
  className = '',
}: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get built-in templates for this designer type
  const builtInTemplates = BUILT_IN_TEMPLATES[designerType] || [];

  // Filter templates
  const filteredTemplates = builtInTemplates.filter(template => {
    // Category filter
    if (selectedCategory !== 'all' && template.category !== selectedCategory) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(builtInTemplates.map(t => t.category)))];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Template Library</CardTitle>
        <CardDescription className="text-xs">
          Choose a template to get started quickly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <Button
                key={category}
                size="sm"
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className="h-7 text-xs"
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {filteredTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No templates found
            </p>
          ) : (
            filteredTemplates.map(template => (
              <div
                key={template.id}
                className="border rounded-lg overflow-hidden hover:border-primary transition-colors"
              >
                {/* Thumbnail placeholder */}
                <div className="bg-muted aspect-video flex items-center justify-center">
                  {template.thumbnail ? (
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {template.state.elements.length} element(s)
                    </p>
                  )}
                </div>

                {/* Template info */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium mb-1">{template.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => onSelectTemplate(template.state)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Use Template
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        // TODO: Show preview modal - opens template preview
                        onSelectTemplate(template);
                      }}
                      title="Preview template"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Help text */}
        {showCustomTemplates && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              💡 Save your own designs as templates from the designer menu
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


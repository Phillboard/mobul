/**
 * TemplateGallery Component
 * 
 * Browse and select from prebuilt mail templates.
 * Templates are organized by category and format.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  LayoutGrid,
  Search,
  Check,
  Loader2,
} from 'lucide-react';
import type { CanvasState, DesignElement } from '../types/designer';

export interface MailTemplate {
  id: string;
  name: string;
  description: string;
  category: 'promotional' | 'event' | 'announcement' | 'seasonal' | 'blank';
  format: 'postcard-4x6' | 'postcard-6x9' | 'postcard-6x11' | 'letter-8.5x11' | 'bifold';
  thumbnail: string;
  canvasState: Partial<CanvasState>;
}

/**
 * Prebuilt templates
 */
const TEMPLATES: MailTemplate[] = [
  {
    id: 'blank-4x6',
    name: 'Blank Postcard',
    description: 'Start with a clean 4x6 postcard',
    category: 'blank',
    format: 'postcard-4x6',
    thumbnail: '/placeholder.svg',
    canvasState: {
      width: 1200,
      height: 1800,
      backgroundColor: '#ffffff',
      elements: [],
    },
  },
  {
    id: 'promo-sale',
    name: 'Sale Announcement',
    description: 'Eye-catching sale promotion design',
    category: 'promotional',
    format: 'postcard-4x6',
    thumbnail: '/placeholder.svg',
    canvasState: {
      width: 1200,
      height: 1800,
      backgroundColor: '#ffffff',
      elements: [
        {
          id: 'headline-1',
          type: 'text',
          x: 50,
          y: 50,
          width: 500,
          height: 80,
          content: 'BIG SALE!',
          styles: {
            fontSize: 48,
            fontWeight: 'bold',
            color: '#EF4444',
          },
          rotation: 0,
          locked: false,
          visible: true,
          zIndex: 1,
        } as DesignElement,
        {
          id: 'subhead-1',
          type: 'text',
          x: 50,
          y: 150,
          width: 400,
          height: 50,
          content: 'Up to 50% off everything',
          styles: {
            fontSize: 24,
            color: '#374151',
          },
          rotation: 0,
          locked: false,
          visible: true,
          zIndex: 2,
        } as DesignElement,
      ],
    },
  },
  {
    id: 'event-invite',
    name: 'Event Invitation',
    description: 'Professional event invitation',
    category: 'event',
    format: 'postcard-6x9',
    thumbnail: '/placeholder.svg',
    canvasState: {
      width: 1800,
      height: 2700,
      backgroundColor: '#1E293B',
      elements: [
        {
          id: 'title-1',
          type: 'text',
          x: 100,
          y: 100,
          width: 600,
          height: 80,
          content: "You're Invited",
          styles: {
            fontSize: 42,
            fontWeight: 'bold',
            color: '#F8FAFC',
          },
          rotation: 0,
          locked: false,
          visible: true,
          zIndex: 1,
        } as DesignElement,
      ],
    },
  },
  {
    id: 'announcement',
    name: 'Grand Opening',
    description: 'Business announcement template',
    category: 'announcement',
    format: 'postcard-4x6',
    thumbnail: '/placeholder.svg',
    canvasState: {
      width: 1200,
      height: 1800,
      backgroundColor: '#7C3AED',
      elements: [
        {
          id: 'headline-2',
          type: 'text',
          x: 50,
          y: 80,
          width: 500,
          height: 100,
          content: 'NOW OPEN',
          styles: {
            fontSize: 56,
            fontWeight: 'bold',
            color: '#FFFFFF',
          },
          rotation: 0,
          locked: false,
          visible: true,
          zIndex: 1,
        } as DesignElement,
      ],
    },
  },
  {
    id: 'holiday-card',
    name: 'Holiday Greeting',
    description: 'Festive holiday mailer',
    category: 'seasonal',
    format: 'postcard-4x6',
    thumbnail: '/placeholder.svg',
    canvasState: {
      width: 1200,
      height: 1800,
      backgroundColor: '#DC2626',
      elements: [
        {
          id: 'greeting-1',
          type: 'text',
          x: 50,
          y: 100,
          width: 500,
          height: 100,
          content: 'Happy Holidays!',
          styles: {
            fontSize: 48,
            fontWeight: 'bold',
            color: '#FFFFFF',
          },
          rotation: 0,
          locked: false,
          visible: true,
          zIndex: 1,
        } as DesignElement,
      ],
    },
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'blank', label: 'Blank' },
  { id: 'promotional', label: 'Promotional' },
  { id: 'event', label: 'Events' },
  { id: 'announcement', label: 'Announcements' },
  { id: 'seasonal', label: 'Seasonal' },
];

export interface TemplateGalleryProps {
  /** Callback when template is selected */
  onSelectTemplate: (template: MailTemplate) => void;
  /** Current format filter */
  currentFormat?: string;
  /** Optional className */
  className?: string;
}

export function TemplateGallery({
  onSelectTemplate,
  currentFormat,
  className = '',
}: TemplateGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesFormat = !currentFormat || template.format === currentFormat;
    return matchesSearch && matchesCategory && matchesFormat;
  });

  const handleSelectTemplate = useCallback((template: MailTemplate) => {
    setIsLoading(true);
    setSelectedTemplateId(template.id);

    // Simulate loading
    setTimeout(() => {
      onSelectTemplate(template);
      setIsLoading(false);
      setIsOpen(false);
      setSelectedTemplateId(null);
    }, 500);
  }, [onSelectTemplate]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <LayoutGrid className="h-4 w-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>
            Start with a prebuilt template or begin with a blank canvas
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {CATEGORIES.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label}
            </Button>
          ))}
        </div>

        {/* Template Grid */}
        <ScrollArea className="h-[400px]">
          <div className="grid grid-cols-3 gap-4 p-1">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`group relative border rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-purple-500 ${
                  selectedTemplateId === template.id ? 'ring-2 ring-purple-500' : ''
                }`}
                onClick={() => handleSelectTemplate(template)}
              >
                {/* Thumbnail */}
                <div
                  className="aspect-[3/4] flex items-center justify-center"
                  style={{ backgroundColor: template.canvasState.backgroundColor }}
                >
                  {template.canvasState.elements?.length === 0 ? (
                    <span className="text-muted-foreground text-sm">Blank</span>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-white font-bold text-sm">
                        {template.canvasState.elements?.[0]?.content || 'Preview'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 bg-background">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {template.format.split('-')[1]}
                    </Badge>
                  </div>
                </div>

                {/* Loading/Selected Overlay */}
                {selectedTemplateId === template.id && isLoading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Use Template
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No templates found matching your criteria
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


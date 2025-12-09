/**
 * ElementLibrary Component
 * 
 * Library of draggable design elements that can be added to the canvas.
 * Organized by categories: Text, Images, Shapes, Special.
 */

import { Type, Image, Square, Circle, QrCode, Sparkles, RectangleHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ElementType, DesignElement } from '../types/designer';

export interface ElementLibraryProps {
  /** Callback when element is selected to add */
  onAddElement: (elementType: ElementType, template?: Partial<DesignElement>) => void;
  /** Which element types are allowed */
  allowedElements?: ElementType[];
  /** Custom className */
  className?: string;
}

/**
 * Element template definitions
 */
const ELEMENT_TEMPLATES = {
  text: [
    {
      name: 'Headline',
      icon: Type,
      template: {
        type: 'text' as const,
        content: 'Your Headline',
        width: 400,
        height: 60,
        styles: {
          fontSize: 32,
          fontWeight: 'bold' as const,
          color: '#000000',
        },
      },
    },
    {
      name: 'Subheading',
      icon: Type,
      template: {
        type: 'text' as const,
        content: 'Your subheading text',
        width: 350,
        height: 40,
        styles: {
          fontSize: 18,
          fontWeight: 'normal' as const,
          color: '#666666',
        },
      },
    },
    {
      name: 'Body Text',
      icon: Type,
      template: {
        type: 'text' as const,
        content: 'Your body text goes here...',
        width: 300,
        height: 100,
        styles: {
          fontSize: 14,
          fontWeight: 'normal' as const,
          color: '#000000',
        },
      },
    },
  ],
  
  shapes: [
    {
      name: 'Rectangle',
      icon: Square,
      template: {
        type: 'shape' as const,
        shapeType: 'rectangle' as const,
        width: 200,
        height: 100,
        styles: {
          backgroundColor: '#E5E7EB',
          borderColor: '#000000',
          borderWidth: 2,
        },
      },
    },
    {
      name: 'Circle',
      icon: Circle,
      template: {
        type: 'shape' as const,
        shapeType: 'circle' as const,
        width: 150,
        height: 150,
        styles: {
          backgroundColor: '#E5E7EB',
          borderColor: '#000000',
          borderWidth: 2,
        },
      },
    },
    {
      name: 'Rounded Box',
      icon: RectangleHorizontal,
      template: {
        type: 'shape' as const,
        shapeType: 'rectangle' as const,
        width: 200,
        height: 100,
        styles: {
          backgroundColor: '#E5E7EB',
          borderColor: '#000000',
          borderWidth: 2,
          borderRadius: 12,
        },
      },
    },
  ],
  
  special: [
    {
      name: 'QR Code',
      icon: QrCode,
      template: {
        type: 'qr-code' as const,
        data: 'https://example.com',
        width: 150,
        height: 150,
        foregroundColor: '#000000',
        backgroundColor: '#ffffff',
      },
    },
    {
      name: 'Token Field',
      icon: Sparkles,
      template: {
        type: 'template-token' as const,
        tokenContent: {
          token: '{{first_name}}',
          fallback: 'Valued Customer',
          transform: 'none' as const,
        },
        width: 200,
        height: 40,
        styles: {
          fontSize: 16,
          color: '#4F46E5',
        },
      },
    },
  ],
  
  media: [
    {
      name: 'Image',
      icon: Image,
      template: {
        type: 'image' as const,
        src: 'https://via.placeholder.com/300x200',
        width: 300,
        height: 200,
        alt: 'Placeholder image',
      },
    },
  ],
};

/**
 * ElementLibrary component
 */
export function ElementLibrary({
  onAddElement,
  allowedElements,
  className = '',
}: ElementLibraryProps) {
  const isElementAllowed = useCallback((elementType: ElementType) => {
    if (!allowedElements) return true;
    return allowedElements.includes(elementType);
  }, [allowedElements]);

  const renderElementButton = useCallback((item: any) => {
    const Icon = item.icon;
    const isAllowed = isElementAllowed(item.template.type);

    return (
      <Button
        key={item.name}
        variant="outline"
        className="h-auto flex-col gap-2 p-4"
        onClick={() => onAddElement(item.template.type, item.template)}
        disabled={!isAllowed}
      >
        <Icon className="h-6 w-6" />
        <span className="text-xs">{item.name}</span>
      </Button>
    );
  }, [isElementAllowed, onAddElement]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Elements</CardTitle>
        <CardDescription className="text-xs">
          Click to add to canvas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="text" className="text-xs">Text</TabsTrigger>
            <TabsTrigger value="shapes" className="text-xs">Shapes</TabsTrigger>
            <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
            <TabsTrigger value="special" className="text-xs">Special</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-2 mt-4">
            <div className="grid grid-cols-2 gap-2">
              {ELEMENT_TEMPLATES.text.map(renderElementButton)}
            </div>
          </TabsContent>

          <TabsContent value="shapes" className="space-y-2 mt-4">
            <div className="grid grid-cols-2 gap-2">
              {ELEMENT_TEMPLATES.shapes.map(renderElementButton)}
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-2 mt-4">
            <div className="grid grid-cols-2 gap-2">
              {ELEMENT_TEMPLATES.media.map(renderElementButton)}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Click image element, then upload your own image in the properties panel
            </p>
          </TabsContent>

          <TabsContent value="special" className="space-y-2 mt-4">
            <div className="grid grid-cols-2 gap-2">
              {ELEMENT_TEMPLATES.special.map(renderElementButton)}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              QR codes link to recipient's personal URL. Token fields display dynamic content.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}


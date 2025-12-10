/**
 * ElementLibrary Component
 * 
 * Library of draggable design elements organized into sections:
 * - BUILD: Text, Shapes, Lines, Images
 * - TRACK: pURL, QR Code
 * - PERSONALIZE: Template tokens (filled by mail house during print)
 * 
 * CRITICAL: Template tokens are for personalization (names, codes, etc.)
 * AI generates ONLY backgrounds and static imagery - never personalized text.
 * 
 * Based on Postalytics editor structure.
 */

import { useCallback } from 'react';
import { 
  Type, 
  Image, 
  Square, 
  Circle, 
  Minus, 
  List,
  QrCode, 
  Link2,
  Sparkles,
  Variable,
  ImageIcon,
  RectangleHorizontal,
  Info,
  User,
  Users,
  Hash,
  Building,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ElementType, DesignElement } from '../types/designer';

export interface ElementLibraryProps {
  /** Callback when element is selected to add */
  onAddElement: (elementType: ElementType, template?: Partial<DesignElement>) => void;
  /** Which element types are allowed */
  allowedElements?: ElementType[];
  /** Custom className */
  className?: string;
}

interface ElementItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  template: Partial<DesignElement> & { type: ElementType };
  description?: string;
}

/**
 * BUILD section elements
 */
const BUILD_ELEMENTS: ElementItem[] = [
  {
    id: 'text',
    name: 'Text',
    icon: Type,
    template: {
      type: 'text',
      content: 'New Text',
      width: 200,
      height: 40,
      styles: {
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        color: '#000000',
      },
    },
  },
  {
    id: 'bullet-list',
    name: 'Bullet List',
    icon: List,
    template: {
      type: 'text',
      content: '• Item one\n• Item two\n• Item three',
      width: 250,
      height: 100,
      styles: {
        fontSize: 14,
        fontFamily: 'Arial',
        color: '#000000',
        lineHeight: 1.6,
      },
    },
  },
  {
    id: 'image',
    name: 'Image',
    icon: Image,
    template: {
      type: 'image',
      src: '',
      width: 200,
      height: 150,
      alt: 'Image placeholder',
    },
  },
  {
    id: 'line',
    name: 'Line',
    icon: Minus,
    template: {
      type: 'shape',
      shapeType: 'line',
      width: 200,
      height: 4,
      styles: {
        backgroundColor: '#000000',
      },
    },
  },
  {
    id: 'rectangle',
    name: 'Rectangle',
    icon: Square,
    template: {
      type: 'shape',
      shapeType: 'rectangle',
      width: 150,
      height: 100,
      styles: {
        backgroundColor: '#E5E7EB',
        borderColor: '#9CA3AF',
        borderWidth: 1,
      },
    },
  },
  {
    id: 'circle',
    name: 'Circle',
    icon: Circle,
    template: {
      type: 'shape',
      shapeType: 'circle',
      width: 100,
      height: 100,
      styles: {
        backgroundColor: '#E5E7EB',
        borderColor: '#9CA3AF',
        borderWidth: 1,
      },
    },
  },
  {
    id: 'rounded-rect',
    name: 'Rounded Box',
    icon: RectangleHorizontal,
    template: {
      type: 'shape',
      shapeType: 'rectangle',
      width: 150,
      height: 100,
      styles: {
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
      },
    },
  },
];

/**
 * TRACK section elements
 */
const TRACK_ELEMENTS: ElementItem[] = [
  {
    id: 'purl',
    name: 'pURL',
    icon: Link2,
    template: {
      type: 'text',
      content: '{{purl}}',
      width: 250,
      height: 30,
      styles: {
        fontSize: 12,
        fontFamily: 'monospace',
        color: '#2563EB',
        textDecoration: 'underline',
      },
    },
    description: 'Personalized URL for tracking',
  },
  {
    id: 'qr-code',
    name: 'QR Code',
    icon: QrCode,
    template: {
      type: 'qr-code',
      data: '{{purl}}',
      width: 120,
      height: 120,
      foregroundColor: '#000000',
      backgroundColor: '#ffffff',
    },
    description: 'Links to recipient landing page',
  },
];

/**
 * PERSONALIZE section elements
 * 
 * These are TEMPLATE TOKENS - placeholders that get filled
 * by the mail house during printing with actual recipient data.
 * 
 * AI NEVER generates personalized content - use these tokens instead!
 */
const PERSONALIZE_ELEMENTS: ElementItem[] = [
  {
    id: 'token-first-name',
    name: 'First Name',
    icon: User,
    template: {
      type: 'template-token',
      tokenContent: {
        token: '{{first_name}}',
        fallback: 'Friend',
        transform: 'none',
      },
      width: 120,
      height: 30,
      styles: {
        fontSize: 16,
        color: '#7C3AED',
      },
    },
    description: '{{first_name}}',
  },
  {
    id: 'token-full-name',
    name: 'Full Name',
    icon: Users,
    template: {
      type: 'template-token',
      tokenContent: {
        token: '{{full_name}}',
        fallback: 'Valued Customer',
        transform: 'none',
      },
      width: 180,
      height: 30,
      styles: {
        fontSize: 16,
        color: '#7C3AED',
      },
    },
    description: '{{full_name}}',
  },
  {
    id: 'token-unique-code',
    name: 'Unique Code',
    icon: Hash,
    template: {
      type: 'template-token',
      tokenContent: {
        token: '{{unique_code}}',
        fallback: 'CODE123',
        transform: 'uppercase',
      },
      width: 100,
      height: 30,
      styles: {
        fontSize: 14,
        fontFamily: 'monospace',
        color: '#059669',
      },
    },
    description: '{{unique_code}}',
  },
  {
    id: 'token-company',
    name: 'Company Name',
    icon: Building,
    template: {
      type: 'template-token',
      tokenContent: {
        token: '{{company_name}}',
        fallback: 'Our Company',
        transform: 'none',
      },
      width: 200,
      height: 30,
      styles: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
      },
    },
    description: '{{company_name}}',
  },
  {
    id: 'token-gift-amount',
    name: 'Gift Card Amount',
    icon: Gift,
    template: {
      type: 'template-token',
      tokenContent: {
        token: '{{gift_card_amount}}',
        fallback: '$25',
        transform: 'none',
      },
      width: 60,
      height: 30,
      styles: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#DC2626',
      },
    },
    description: '{{gift_card_amount}}',
  },
  {
    id: 'variable-logic',
    name: 'Conditional Logic',
    icon: Variable,
    template: {
      type: 'text',
      content: '{{#if has_offer}}Special offer inside!{{/if}}',
      width: 250,
      height: 40,
      styles: {
        fontSize: 14,
        color: '#059669',
        fontStyle: 'italic',
      },
    },
    description: 'Show content conditionally',
  },
  {
    id: 'variable-image',
    name: 'Variable Image',
    icon: ImageIcon,
    template: {
      type: 'image',
      src: '{{profile_image}}',
      width: 150,
      height: 150,
      alt: 'Variable image',
    },
    description: 'Personalized images via URL',
  },
];

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

  const handleDragStart = useCallback((e: React.DragEvent, template: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'copy';
    console.log('[ElementLibrary] Drag started:', template.type);
  }, []);

  const handleClick = useCallback((item: ElementItem) => {
    console.log('[ElementLibrary] Click to add:', item.id);
    onAddElement(item.template.type, item.template);
  }, [onAddElement]);

  const renderElementButton = useCallback((item: ElementItem) => {
    const Icon = item.icon;
    const isAllowed = isElementAllowed(item.template.type);

    return (
      <button
        key={item.id}
        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-grab active:cursor-grabbing"
        onClick={() => handleClick(item)}
        draggable={isAllowed}
        onDragStart={(e) => handleDragStart(e, item.template)}
        disabled={!isAllowed}
      >
        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{item.name}</p>
          {item.description && (
            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
          )}
        </div>
      </button>
    );
  }, [isElementAllowed, handleClick, handleDragStart]);

  const renderSection = (title: string, items: ElementItem[]) => (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-2">
        {title}
      </h4>
      <div className="space-y-1">
        {items.map(renderElementButton)}
      </div>
    </div>
  );

  return (
    <div className={className}>
      {/* AI vs Tokens Guidance Alert */}
      <Alert className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-800 dark:text-blue-200 text-sm">
          AI vs Personalization
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300 text-xs mt-1">
          <p className="mb-1">
            <strong>AI generates:</strong> Backgrounds & images only
          </p>
          <p>
            <strong>For names/data:</strong> Use tokens below (filled during print)
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        {/* BUILD Section */}
        {renderSection('Build', BUILD_ELEMENTS)}

        {/* TRACK Section */}
        {renderSection('Track', TRACK_ELEMENTS)}

        {/* PERSONALIZE Section - Template Tokens */}
        {renderSection('Personalize', PERSONALIZE_ELEMENTS)}
      </div>

      <p className="text-xs text-muted-foreground mt-4 px-2">
        Drag elements to canvas or click to add at center
      </p>
    </div>
  );
}

/**
 * AddElementActions Component
 * 
 * Quick actions for adding common elements to the canvas.
 * Provides presets for text, tokens, QR codes, phone boxes, and code boxes.
 */

import React from 'react';
import { Type, Braces, QrCode, Phone, Ticket, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  createTextLayer,
  createQRPlaceholderLayer,
  createCodeBoxLayer,
  createPhoneBoxLayer,
  type CanvasLayer,
} from '../../types/layers';
import {  CODE_BOX_PRESETS, PHONE_BOX_PRESETS } from '../../utils/presets';

export interface AddElementActionsProps {
  onAddLayer: (layer: Omit<CanvasLayer, 'id' | 'zIndex'>) => void;
  className?: string;
}

export function AddElementActions({
  onAddLayer,
  className,
}: AddElementActionsProps) {
  // Add plain text layer
  const addTextLayer = () => {
    onAddLayer(createTextLayer({
      name: 'Text',
      content: 'New Text',
      containsTokens: false,
      position: { x: 40, y: 50 },
      style: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 24,
        fontWeight: 'bold',
        fontStyle: 'normal',
        color: '#FFFFFF',
        textAlign: 'center',
        lineHeight: 1.2,
        letterSpacing: 0,
        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
      },
    }));
  };
  
  // Add text with token
  const addTokenText = () => {
    onAddLayer(createTextLayer({
      name: 'Greeting',
      content: 'Hey {{first_name}}!',
      containsTokens: true,
      position: { x: 40, y: 15 },
      style: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 32,
        fontWeight: 'bold',
        fontStyle: 'normal',
        color: '#FFFFFF',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
      },
    }));
  };
  
  // Add QR placeholder
  const addQRPlaceholder = () => {
    onAddLayer(createQRPlaceholderLayer({
      position: { x: 10, y: 80 },
      size: { width: 100, height: 100 },
    }));
  };
  
  // Add phone box
  const addPhoneBox = () => {
    const preset = PHONE_BOX_PRESETS['primary-banner'];
    onAddLayer(createPhoneBoxLayer({
      phoneNumber: '1-800-XXX-XXXX',
      position: { x: 35, y: 82 },
      size: { width: 300, height: 60 },
      style: preset,
    }));
  };
  
  // Add code box
  const addCodeBox = () => {
    const preset = CODE_BOX_PRESETS['classic'];
    onAddLayer(createCodeBoxLayer({
      labelText: 'YOUR CODE:',
      valueToken: '{{unique_code}}',
      position: { x: 55, y: 88 },
      size: { width: 250, height: 50 },
      style: preset,
    }));
  };
  
  return (
    <div className={cn("space-y-3", className)}>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Add Elements
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {/* Plain Text */}
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-3"
          onClick={addTextLayer}
        >
          <Type className="w-5 h-5" />
          <span className="text-xs">Text</span>
        </Button>
        
        {/* Token Text */}
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-3"
          onClick={addTokenText}
        >
          <Braces className="w-5 h-5" />
          <span className="text-xs">Token</span>
        </Button>
        
        {/* QR Code */}
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-3"
          onClick={addQRPlaceholder}
        >
          <QrCode className="w-5 h-5" />
          <span className="text-xs">QR Code</span>
        </Button>
        
        {/* Phone */}
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-3"
          onClick={addPhoneBox}
        >
          <Phone className="w-5 h-5" />
          <span className="text-xs">Phone</span>
        </Button>
        
        {/* Code Box */}
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-3"
          onClick={addCodeBox}
        >
          <Ticket className="w-5 h-5" />
          <span className="text-xs">Code Box</span>
        </Button>
      </div>
      
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        💡 Click to add elements to your design. Drag to reposition on canvas.
      </div>
    </div>
  );
}


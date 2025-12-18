/**
 * TextLayerRenderer Component
 * 
 * Renders text layers with support for template tokens.
 * In edit mode, tokens are highlighted. In preview mode, tokens show sample values.
 */

import React from 'react';
import { cn } from '@shared/utils/cn';
import type { TextLayer } from '../../types/layers';
import { replaceTokensWithPreview, containsTokens } from '../../utils/tokens';

export interface TextLayerRendererProps {
  layer: TextLayer;
  isSelected: boolean;
  isPreviewMode: boolean;
  onClick: () => void;
  onDragEnd: (position: { x: number; y: number }) => void;
}

/**
 * Component to highlight {{tokens}} in text
 */
function TokenHighlightedText({ content }: { content: string }) {
  const parts = content.split(/({{[^}]+}})/g);
  
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
          return (
            <span key={i} className="bg-purple-100 text-purple-700 px-1 rounded font-mono">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/**
 * Convert TextStyle to CSS properties
 */
function textStyleToCSS(style: TextLayer['style']): React.CSSProperties {
  return {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    color: style.color,
    textAlign: style.textAlign,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    textShadow: style.textShadow,
    backgroundColor: style.backgroundColor,
    padding: style.padding,
    borderRadius: style.borderRadius,
  };
}

export function TextLayerRenderer({
  layer,
  isSelected,
  isPreviewMode,
  onClick,
  onDragEnd,
}: TextLayerRendererProps) {
  // Replace tokens with preview values if in preview mode
  const displayContent = isPreviewMode 
    ? replaceTokensWithPreview(layer.content)
    : layer.content;
  
  const hasTokens = containsTokens(layer.content);
  
  return (
    <div
      className={cn(
        "absolute cursor-move select-none",
        isSelected && "ring-2 ring-blue-500 ring-offset-2"
      )}
      style={{
        left: `${layer.position.x}%`,
        top: `${layer.position.y}%`,
        width: layer.size.width,
        height: layer.size.height,
        transform: `rotate(${layer.rotation}deg)`,
        opacity: layer.opacity / 100,
        ...textStyleToCSS(layer.style),
        zIndex: layer.zIndex,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Show highlighted tokens in edit mode, plain text in preview mode */}
      {!isPreviewMode && hasTokens ? (
        <TokenHighlightedText content={layer.content} />
      ) : (
        displayContent
      )}
    </div>
  );
}

